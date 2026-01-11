const mongoose = require("mongoose");
const { status } = require("../../../utils/statuscodes");
const quiz = require("../../../models/quiz/quiz");
const Purchase = require('../../../models/payment/index');
const User = require('../../../models/auth/users/index');

exports.studentListController = async (req, res) => {
    try {
        const adminId = req.admin._id;
        if (!adminId) {
            return res.status(status.unauthorized).json({
                msg: "You are not authorized to access this route",
            });
        }

        // Pagination Inputs
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Step 1: Find all quizzes of this admin
        const adminQuizzes = await quiz.find({admin : adminId }).select("_id");
        const quizIds = adminQuizzes.map((q) => q._id);
        const resP = await Purchase.find({ quizId: { $in: quizIds } });
        console.log(resP)
        // Step 2: Aggregation with pagination
        const result = await Purchase.aggregate([
            { $match: { quizId: { $in: quizIds } } },

            {
                $lookup: {
                    from: "quiz",
                    localField: "quizId",
                    foreignField: "_id",
                    as: "quizData",
                },
            },
            { $unwind: "$quizData" },

            {
                $lookup: {
                    from: "User",
                    localField: "userId",
                    foreignField: "_id",
                    as: "studentData",
                },
            },
            { $unwind: "$studentData" },

            // Sorting
            { $sort: { createdAt: -1 } },

            // Pagination stages
            { $skip: skip },
            { $limit: limit },

            {
                $project: {
                    _id: 0,
                    quizId: "$quizData._id",
                    quizName: "$quizData.quizName",
                    studentId: "$studentData._id",
                    studentName: "$studentData.name",
                    studentEmail: "$studentData.email",
                    amount: 1,
                    paymentStatus: 1,
                    transactionId: 1,
                    createdAt: 1,
                },
            },
        ]);

        // Count total documents for pagination
        const totalDocuments = await Purchase.countDocuments({ quizId: { $in: quizIds } });

        return res.status(200).json({
            success: true,
            page,
            limit,
            totalDocuments,
            totalPages: Math.ceil(totalDocuments / limit),
            students: result,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: "Internal server error",
        });
    }
};
