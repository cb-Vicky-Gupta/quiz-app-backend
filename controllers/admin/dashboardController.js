const QuizAttempt = require("../../models/test/attemptQuestion");
const Quiz = require("../../models/quiz/quiz/index");
const Question = require("../../models/quiz/questions/index");
const User = require("../../models/auth/users");
const Purchase = require("../../models/payment/index");

/**
 * Get Admin Dashboard Stats
 * GET /v1/admin/dashboard
 */
exports.getDashboard = async (req, res) => {
    try {
        const adminId = req.admin._id;

        // Get admin's quizzes
        const adminQuizzes = await Quiz.find({ admin: adminId });
        const quizIds = adminQuizzes.map(q => q._id);

        // Get questions created by this admin
        const totalQuestions = await Question.countDocuments({ admin: adminId });
        const activeQuestions = await Question.countDocuments({ admin: adminId, isActive: true });

        // Get all attempts on admin's quizzes
        const attempts = await QuizAttempt.find({ quizId: { $in: quizIds } })
            .populate("userId", "firstName lastName email")
            .populate("quizId", "title price")
            .sort({ startedAt: -1 });

        const completedAttempts = attempts.filter(a => a.status === "COMPLETED");

        // Unique students who attempted admin's quizzes
        const uniqueStudents = [...new Set(attempts.map(a => a.userId?._id?.toString()))].filter(Boolean);

        // Calculate average score across all attempts
        const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const totalQuestionsAttempted = completedAttempts.reduce((sum, a) => sum + (a.questions?.length || 0), 0);
        const averageScore = totalQuestionsAttempted > 0
            ? Math.round((totalScore / totalQuestionsAttempted) * 100)
            : 0;

        // ====== REVENUE CALCULATION ======
        const successfulPurchases = await Purchase.find({
            quizId: { $in: quizIds },
            status: "SUCCESS"
        }).populate("quizId", "title price");

        const totalRevenue = successfulPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalSales = successfulPurchases.length;

        // Revenue per quiz breakdown
        const revenueByQuiz = adminQuizzes.map(quiz => {
            const quizPurchases = successfulPurchases.filter(
                p => p.quizId?._id?.toString() === quiz._id.toString()
            );
            const quizRevenue = quizPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
            return {
                quizId: quiz._id,
                title: quiz.title,
                price: quiz.price,
                totalSales: quizPurchases.length,
                revenue: quizRevenue
            };
        });

        // Recent purchases (last 5)
        const recentPurchases = successfulPurchases.slice(0, 5).map(p => ({
            purchaseId: p._id,
            quizTitle: p.quizId?.title,
            amount: p.amount,
            currency: p.currency,
            createdAt: p.createdAt
        }));

        // Quiz performance breakdown
        const quizPerformance = adminQuizzes.map(quiz => {
            const quizAttempts = attempts.filter(a => a.quizId?._id?.toString() === quiz._id.toString());
            const quizCompleted = quizAttempts.filter(a => a.status === "COMPLETED");
            const quizTotalScore = quizCompleted.reduce((sum, a) => sum + (a.score || 0), 0);
            const quizTotalQuestions = quizCompleted.reduce((sum, a) => sum + (a.questions?.length || 0), 0);

            // Get revenue for this quiz
            const quizRevenueData = revenueByQuiz.find(r => r.quizId.toString() === quiz._id.toString());

            return {
                quizId: quiz._id,
                title: quiz.title,
                price: quiz.price,
                totalAttempts: quizAttempts.length,
                completedAttempts: quizCompleted.length,
                averageScore: quizTotalQuestions > 0
                    ? Math.round((quizTotalScore / quizTotalQuestions) * 100)
                    : 0,
                isActive: quiz.isActive,
                totalSales: quizRevenueData?.totalSales || 0,
                revenue: quizRevenueData?.revenue || 0
            };
        });

        // Recent attempts (last 10)
        const recentAttempts = attempts.slice(0, 10).map(a => ({
            attemptId: a._id,
            student: {
                id: a.userId?._id,
                name: a.userId ? `${a.userId.firstName} ${a.userId.lastName}` : "Unknown",
                email: a.userId?.email
            },
            quiz: {
                id: a.quizId?._id,
                title: a.quizId?.title || "Unknown"
            },
            status: a.status,
            score: a.score,
            totalQuestions: a.questions?.length || 0,
            percentage: a.questions?.length > 0
                ? Math.round((a.score / a.questions.length) * 100)
                : 0,
            completedAt: a.completedAt
        }));

        const dashboardData = {
            admin: {
                firstName: req.admin.firstName,
                lastName: req.admin.lastName,
                email: req.admin.email,
                lastLogin: req.admin.lastLogin
            },
            stats: {
                totalQuizzes: adminQuizzes.length,
                activeQuizzes: adminQuizzes.filter(q => q.isActive).length,
                totalQuestions,
                activeQuestions,
                totalStudents: uniqueStudents.length,
                totalAttempts: attempts.length,
                completedAttempts: completedAttempts.length,
                averageScore,
                // Revenue stats
                totalRevenue,
                totalSales,
                currency: "INR"
            },
            quizPerformance,
            recentAttempts,
            recentPurchases
        };

        return res.status(200).json({
            msg: "Dashboard data fetched successfully",
            data: dashboardData
        });

    } catch (error) {
        console.error("Admin Dashboard error:", error);
        return res.status(500).json({ msg: "Server error" });
    }
};
