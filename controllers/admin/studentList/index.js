const mongoose = require("mongoose");
const { status } = require("../../../utils/statuscodes");
const Quiz = require("../../../models/quiz/quiz");
const Purchase = require('../../../models/payment/index');
const User = require('../../../models/auth/users/index');

/**
 * Get list of students who purchased admin's quizzes
 * POST /v1/admin/get-student-list
 */
exports.studentListController = async (req, res) => {
    try {
        const adminId = req.admin._id;
        if (!adminId) {
            return res.status(status.unauthorized).json({
                msg: "You are not authorized to access this route",
            });
        }

        // Pagination & Filter Inputs
        const { page = 1, limit = 10, search = "", quizId = null } = req.body;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Step 1: Find all quizzes of this admin
        const adminQuizzes = await Quiz.find({ admin: adminId }).select("_id title");
        const quizIds = adminQuizzes.map((q) => q._id);

        // Build match query
        let matchQuery = {
            quizId: { $in: quizIds },
            status: "SUCCESS" // Only successful purchases
        };

        // Filter by specific quiz if provided
        if (quizId) {
            matchQuery.quizId = new mongoose.Types.ObjectId(quizId);
        }

        // Step 2: Aggregation with pagination
        const result = await Purchase.aggregate([
            { $match: matchQuery },

            {
                $lookup: {
                    from: "Quiz",
                    localField: "quizId",
                    foreignField: "_id",
                    as: "quizData",
                },
            },
            { $unwind: { path: "$quizData", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "User",
                    localField: "userId",
                    foreignField: "_id",
                    as: "studentData",
                },
            },
            { $unwind: { path: "$studentData", preserveNullAndEmptyArrays: true } },

            // Search by student name or email
            ...(search ? [{
                $match: {
                    $or: [
                        { "studentData.firstName": { $regex: search, $options: "i" } },
                        { "studentData.lastName": { $regex: search, $options: "i" } },
                        { "studentData.email": { $regex: search, $options: "i" } }
                    ]
                }
            }] : []),

            // Sorting by purchase date
            { $sort: { createdAt: -1 } },

            // Pagination stages
            { $skip: skip },
            { $limit: parseInt(limit) },

            {
                $project: {
                    purchaseId: "$_id",
                    quizId: "$quizData._id",
                    quizTitle: "$quizData.title",
                    quizPrice: "$quizData.price",
                    student: {
                        id: "$studentData._id",
                        firstName: "$studentData.firstName",
                        lastName: "$studentData.lastName",
                        fullName: { $concat: ["$studentData.firstName", " ", "$studentData.lastName"] },
                        email: "$studentData.email"
                    },
                    amount: 1,
                    currency: 1,
                    orderId: 1,
                    referenceId: 1,
                    status: 1,
                    paymentMethod: 1,
                    purchasedAt: "$createdAt"
                },
            },
        ]);

        // Count total documents for pagination
        const totalCount = await Purchase.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "User",
                    localField: "userId",
                    foreignField: "_id",
                    as: "studentData",
                },
            },
            { $unwind: { path: "$studentData", preserveNullAndEmptyArrays: true } },
            ...(search ? [{
                $match: {
                    $or: [
                        { "studentData.firstName": { $regex: search, $options: "i" } },
                        { "studentData.lastName": { $regex: search, $options: "i" } },
                        { "studentData.email": { $regex: search, $options: "i" } }
                    ]
                }
            }] : []),
            { $count: "total" }
        ]);

        const totalDocuments = totalCount[0]?.total || 0;

        return res.status(200).json({
            msg: "Success",
            data: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalDocuments,
                totalPages: Math.ceil(totalDocuments / parseInt(limit))
            },
            // Summary
            summary: {
                totalStudents: totalDocuments,
                quizzesAvailable: adminQuizzes.length
            }
        });

    } catch (error) {
        console.error("Student list error:", error);
        return res.status(500).json({
            msg: "Internal server error",
        });
    }
};
