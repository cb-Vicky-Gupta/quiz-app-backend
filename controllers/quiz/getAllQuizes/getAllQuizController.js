const quiz = require("../../../models/quiz/quiz")
const { status } = require("../../../utils/statuscodes")
const Purchase = require("../../../models/payment/index");
const questions = require("../../../models/quiz/questions");
exports.getAllQuizController = async (req, res) => {
    try {
        // Get 5 random quizzes
        const randomQuizzes = await quiz.aggregate([{ $sample: { size: 5 } }]);

        if (!randomQuizzes || randomQuizzes.length === 0) {
            return res.status(status.notFound).json({ msg: "No quizzes found" });
        }

        return res
            .status(status.success)
            .json({ msg: "Random quizzes fetched successfully", data: randomQuizzes });
    } catch (error) {
        console.error("Error in getAllQuizController:", error);
        return res
            .status(status.serverError)
            .json({ msg: "Server Error", error: error.message });
    }
};


exports.getAllQuizPrivate = async (req, res) => {
    try {
        const userId = req.user.id;

        const { page = 1, limit = 10, search = "" } = req.body;

        // Step 1: Get purchased quizIds
        const purchases = await Purchase.find({
            userId: userId,
            status: "SUCCESS",
        }).select("quizId");

        const purchasedQuizIds = purchases.map((p) => p.quizId);

        // Step 2: Build filter for search (excluding purchased)
        let filter = {
            _id: { $nin: purchasedQuizIds }, // exclude purchased
        };

        if (search) {
            filter = {
                ...filter,
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            };
        }

        // Step 3: Pagination
        const skip = (page - 1) * limit;

        const allQuizzes = await quiz
            .find(filter)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await quiz.countDocuments(filter);

        res.json({
            success: true,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            data: allQuizzes,
        });
    } catch (error) {
        console.error("Error in getAllQuizPrivate:", error);
        res.status(500).json({ error: "Failed to fetch quizzes" });
    }
};


exports.getMyQuiz = async (req, res) => {
    try {
        const userId = req.user.id;

        // Query params for pagination + search
        const { page = 1, limit = 10, search = "" } = req.body;

        // Step 1: Get all successful purchases for this user
        const purchases = await Purchase.find({
            userId: userId,
            status: "SUCCESS",
        }).select("quizId");

        const quizIds = purchases.map(p => p.quizId);

        // Step 2: Build filter for quiz search
        let filter = { _id: { $in: quizIds } };

        if (search) {
            filter = {
                ...filter,
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            };
        }

        // Step 3: Pagination
        const skip = (page - 1) * limit;

        const myQuizzes = await quiz
            .find(filter)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await quiz.countDocuments(filter);

        res.json({
            success: true,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            data: myQuizzes,
        });
    } catch (error) {
        console.error("Error in getMyQuiz:", error);
        res.status(500).json({ error: "Failed to fetch quizzes" });
    }
};
exports.getQuizById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Step 1: Check if user purchased this quiz
        const purchase = await Purchase.findOne({
            userId,
            quizId: id,
            status: "SUCCESS", // only successful purchases allowed
        });

        if (!purchase) {
            return res
                .status(status.unauthorized)
                .json({ msg: "You have not purchased this quiz" });
        }

        // Step 2: Fetch quiz details
        const findQuiz = await quiz.findById(id);
        if (!findQuiz) {
            return res
                .status(status.notFound)
                .json({ msg: "Quiz not found" });
        }
        // const totalRemaining = await questions.countDocuments({ quizId: id });
        // findQuiz.totalRemaining = totalRemaining;
        const totalRemaining = await questions.countDocuments({ quizId: id, isActive: true });


        return res
            .status(status.success)
            .json({ msg: "Quiz found successfully", data: findQuiz });

    } catch (error) {
        console.error("Error in getQuizById:", error);
        return res
            .status(status.serverError)
            .json({ msg: "Server Error" });
    }
};