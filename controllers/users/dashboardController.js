const QuizAttempt = require("../../models/test/attemptQuestion");
const Quiz = require("../../models/quiz/quiz/index");
const User = require("../../models/auth/users");

/**
 * Get User Dashboard Stats
 * GET /v1/user/dashboard
 */
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all attempts by this user
        const attempts = await QuizAttempt.find({ userId })
            .populate("quizId", "title")
            .sort({ startedAt: -1 });

        // Calculate stats
        const totalAttempts = attempts.length;
        const completedAttempts = attempts.filter(a => a.status === "COMPLETED");
        const inProgressAttempts = attempts.filter(a => a.status === "IN_PROGRESS");

        // Score calculations
        const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const totalQuestions = completedAttempts.reduce((sum, a) => sum + (a.questions?.length || 0), 0);
        const averageScore = completedAttempts.length > 0
            ? Math.round((totalScore / totalQuestions) * 100)
            : 0;

        // Pass/Fail rate (assuming 50% is passing)
        const passedQuizzes = completedAttempts.filter(a => {
            const percentage = (a.score / (a.questions?.length || 1)) * 100;
            return percentage >= 50;
        }).length;
        const failedQuizzes = completedAttempts.length - passedQuizzes;

        // Recent attempts (last 5)
        const recentAttempts = attempts.slice(0, 5).map(a => ({
            attemptId: a._id,
            quizId: a.quizId?._id,
            quizTitle: a.quizId?.title || "Unknown Quiz",
            status: a.status,
            score: a.score,
            totalQuestions: a.questions?.length || 0,
            percentage: a.questions?.length > 0
                ? Math.round((a.score / a.questions.length) * 100)
                : 0,
            startedAt: a.startedAt,
            completedAt: a.completedAt
        }));

        // Get user's purchased quizzes count
        const user = await User.findById(userId);
        const purchasedQuizzes = user.purchasedQuiz?.length || 0;

        // Get available quizzes count (active quizzes)
        const availableQuizzes = await Quiz.countDocuments({ isActive: true });

        const dashboardData = {
            user: {
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                lastLogin: req.user.lastLogin
            },
            stats: {
                totalAttempts,
                completedQuizzes: completedAttempts.length,
                inProgressQuizzes: inProgressAttempts.length,
                purchasedQuizzes,
                availableQuizzes,
                averageScore,
                passedQuizzes,
                failedQuizzes,
                passRate: completedAttempts.length > 0
                    ? Math.round((passedQuizzes / completedAttempts.length) * 100)
                    : 0
            },
            recentAttempts
        };

        return res.status(200).json({
            msg: "Dashboard data fetched successfully",
            data: dashboardData
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        return res.status(500).json({ msg: "Server error" });
    }
};
