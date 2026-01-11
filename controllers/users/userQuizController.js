const Quiz = require("../../models/quiz/quiz/index");
const questions = require("../../models/quiz/questions/index");
const QuizAttempt = require("../../models/test/attemptQuestion");
const UserQuestionHistory = require("../../models/test/history");

exports.startQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user.id;

        // ✅ Check if ongoing attempt exists
        let attempt = await QuizAttempt.findOne({
            userId,
            quizId,
            status: "IN_PROGRESS",
            expiresAt: { $gt: new Date() },
        }).populate({
            path: "questions.questionId",
            model: "questions",
            select: "title options type category answer"
        });

        if (attempt) {
            return res.json({ attempt, msg: "Resuming quiz" });
        }

        // ✅ Check quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: "Quiz not found" });
        }

        // ✅ Get all active questions
        const allQuestions = await questions.find({ quizId, isActive: true });

        // ✅ Exclude previously attempted questions
        const history = await UserQuestionHistory.find({ userId, quizId });
        const blockedIds = history.map(h => h.questionId.toString());
        const available = allQuestions.filter(
            q => !blockedIds.includes(q._id.toString())
        );

        if (available.length < 10) {
            return res.status(400).json({ msg: "Not enough questions available" });
        }

        // ✅ Randomly select 10
        const shuffled = available.sort(() => 0.5 - Math.random());
        const reserved = shuffled.slice(0, 10).map(q => ({
            questionId: q._id,
        }));

        // ✅ Create new attempt
        attempt = await QuizAttempt.create({
            userId,
            quizId,
            questions: reserved,
            status: "IN_PROGRESS",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        });

        // ✅ Populate attempt with question data
        const populatedAttempt = await QuizAttempt.findById(attempt._id)
            .populate({
                path: "questions.questionId",
                model: "questions",
                select: "title options type category answer"
            });

        return res.json({ attempt: populatedAttempt, msg: "Quiz started" });

    } catch (err) {
        console.error("❌ startQuiz error:", err);
        res.status(500).json({ msg: "Server error" });
    }
};



exports.submitAnswer = async (req, res) => {
    try {
        const { questionId, answer, attemptId, remainingTime } = req.body;
        const userId = req.user.id;

        // ✅ Load attempt
        let attempt = await QuizAttempt.findById(attemptId).populate({
            path: "questions.questionId",
            model: "questions",
            select: "title options type category answer"
        });
        if (!attempt) return res.status(404).json({ msg: "Attempt not found" });
        if (attempt.status !== "IN_PROGRESS") return res.status(400).json({ msg: "Attempt not active" });
        if (attempt.userId.toString() !== userId) return res.status(403).json({ msg: "Not your attempt" });

        // Check if quiz has expired
        if (new Date() > attempt.expiresAt) {
            attempt.status = "EXPIRED";
            await attempt.save();
            return res.status(400).json({ msg: "Quiz time expired" });
        }

        // ✅ Find question in attempt
        const q = attempt.questions.find(q => q.questionId._id.toString() === questionId);
        if (!q) return res.status(400).json({ msg: "Question not part of attempt" });

        // ✅ Mark visited & answered
        q.visited = true;
        q.answer = Array.isArray(answer) ? answer : [answer]; // normalize to array

        // ✅ Compare with correct answers
        const correctAnswers = Array.isArray(q.questionId?.answer)
            ? q.questionId.answer.map(a => a.toString())
            : [];

        const userAnswers = Array.isArray(q.answer)
            ? q.answer.map(a => a.toString())
            : [];

        q.correct =
            correctAnswers.length > 0 &&
            correctAnswers.length === userAnswers.length &&
            correctAnswers.every(ans => userAnswers.includes(ans));
        attempt.remainingTime = remainingTime;
        await attempt.save();

        // ✅ Update UserHistory
        await UserQuestionHistory.findOneAndUpdate(
            { userId, quizId: attempt.quizId, questionId },
            {
                visited: true,
                answered: true,
                correct: q.correct,
                submittedAnswer: q.answer
            },
            { upsert: true, new: true }
        );

        return res.json({
            msg: "Answer saved",
            questionId,
            correct: q.correct,
            attemptId: attempt._id
        });

    } catch (err) {
        console.error("❌ submitAnswer error:", err);
        res.status(500).json({ msg: "Server error" });
    }
};


// ✅ Complete Quiz Attempt and Show Detailed Results
exports.completeQuiz = async (req, res) => {
    try {
        const { attemptId } = req.body;
        const attempt = await QuizAttempt.findById(attemptId).populate("questions.questionId");
        if (!attempt) return res.status(404).json({ msg: "Attempt not found" });

        if (attempt.status === "COMPLETED") {
            return res.status(400).json({ msg: "Quiz already submitted" });
        }

        // ✅ Mark as completed
        attempt.status = "COMPLETED";
        attempt.completedAt = new Date();

        // ✅ Calculate score
        const score = attempt.questions.filter(q => q.correct).length;
        attempt.score = score;

        await attempt.save();

        // ✅ Prepare response with full question + answer details
        // Filter out null questions (in case of deleted questions)
        const validQuestions = attempt.questions.filter(q => q.questionId != null);

        const results = validQuestions.map(q => ({
            questionId: q.questionId._id,
            question: q.questionId.title,
            options: q.questionId.options,
            correctAnswers: q.questionId.answer,
            userAnswers: q.answer,
            isCorrect: q.correct
        }));

        return res.json({
            msg: "Quiz completed",
            quizId: attempt.quizId,
            attemptId: attempt._id,
            score,
            totalQuestions: attempt.questions.length,
            results
        });

    } catch (err) {
        console.error("❌ completeQuiz error:", err);
        res.status(500).json({ msg: "Server error" });
    }
};


// ✅ Get paginated leaderboard for a quiz
exports.getLeaderboard = async (req, res) => {
    try {
        const { page = 1, limit = 10, quizId } = req.body;
        const skip = (page - 1) * limit;

        // total count of completed attempts
        const total = await QuizAttempt.countDocuments({
            quizId,
            status: "COMPLETED"
        });

        // leaderboard query
        const attempts = await QuizAttempt.find({
            quizId,
            status: "COMPLETED"
        })
            .populate("userId", "firstName lastName email")
            .sort({ score: -1, completedAt: 1 }) // highest score first
            .skip(skip)
            .limit(Number(limit));

        const leaderboard = attempts.map((attempt, index) => ({
            rank: skip + index + 1, // continuous ranking across pages
            user: {
                id: attempt.userId._id,
                firstName: attempt.userId.firstName,
                lastName: attempt.userId.lastName,
                email: attempt.userId.email
            },
            score: attempt.score,
            completedAt: attempt.completedAt
        }));

        return res.json({
            quizId,
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
            leaderboard
        });
    } catch (err) {
        console.error("❌ getLeaderboard error:", err);
        res.status(500).json({ msg: "Server error" });
    }
};

exports.getAllAttemptsQuizesList = async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, search = "", quizId = null } = req.body;
    const skip = (page - 1) * limit;

    try {
        // Base query
        let query = { userId };

        // Filter by quizId if provided
        if (quizId) {
            query.quizId = quizId;
        }

        // Fetch paginated attempts with optional search filter
        const attempts = await QuizAttempt.find(query)
            .populate({
                path: "quizId",
                match: search ? { title: { $regex: search, $options: "i" } } : {},
            })
            .sort({ startedAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out attempts where quizId got excluded due to match
        const filteredAttempts = attempts.filter(a => a.quizId);

        // Count total matching attempts (for pagination)
        const totalAttempts = await QuizAttempt.countDocuments(query);

        const now = new Date();

        const _data = filteredAttempts.map(attempt => {
            const totalQuestions = attempt.questions?.length || 0;
            const percentage = totalQuestions > 0
                ? Math.round((attempt.score / totalQuestions) * 100)
                : 0;

            // Check if expired (for IN_PROGRESS attempts)
            const isExpired = attempt.expiresAt && new Date(attempt.expiresAt) < now;

            // Update status if expired but still marked as IN_PROGRESS
            let currentStatus = attempt.status;
            if (currentStatus === "IN_PROGRESS" && isExpired) {
                currentStatus = "EXPIRED";
            }

            // Determine available actions based on status
            const actions = {
                canViewReport: currentStatus === "COMPLETED",
                canViewAnswers: currentStatus === "COMPLETED",
                canContinue: currentStatus === "IN_PROGRESS" && !isExpired,
                isExpired: currentStatus === "EXPIRED" || isExpired
            };

            // Calculate remaining time for in-progress tests
            let remainingTime = null;
            if (currentStatus === "IN_PROGRESS" && !isExpired && attempt.expiresAt) {
                remainingTime = Math.max(0, Math.floor((new Date(attempt.expiresAt) - now) / 1000));
            }

            return {
                id: attempt._id,
                quizId: attempt.quizId?._id,
                quizTitle: attempt.quizId?.title,
                status: currentStatus,
                score: attempt.score,
                totalQuestions,
                percentage,
                startedAt: attempt.startedAt,
                completedAt: attempt.completedAt,
                expiresAt: attempt.expiresAt,
                remainingTime,
                actions
            };
        });

        return res.json({
            msg: "Success",
            data: _data,
            pagination: {
                total: totalAttempts,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalAttempts / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Server error" });
    }
};


exports.userReportController = async (req, res) => {
    const userId = req.user.id;
    const { attemptId } = req.body;

    if (!attemptId) {
        return res.status(400).json({ msg: "Please provide attemptId" });
    }

    try {
        const attempt = await QuizAttempt.findById(attemptId)
            .populate("quizId")
            .populate("userId", "firstName lastName email")
            .populate({
                path: "questions.questionId",
                model: "questions",
                select: "title options answer type category"
            });

        if (!attempt) {
            return res.status(400).json({ msg: "Invalid attemptId" });
        }

        // Ensure the logged-in user is the owner of this attempt
        if (attempt.userId._id.toString() !== userId) {
            return res.status(403).json({ msg: "Unauthorized access" });
        }

        // Determine actions based on status
        const now = new Date();
        const isExpired = attempt.expiresAt && new Date(attempt.expiresAt) < now;
        let currentStatus = attempt.status;
        if (currentStatus === "IN_PROGRESS" && isExpired) {
            currentStatus = "EXPIRED";
        }

        const actions = {
            canViewReport: currentStatus === "COMPLETED",
            canViewAnswers: currentStatus === "COMPLETED",
            canContinue: currentStatus === "IN_PROGRESS" && !isExpired,
            isExpired: currentStatus === "EXPIRED" || isExpired
        };

        // If not completed, return limited data with actions
        if (currentStatus !== "COMPLETED") {
            return res.status(200).json({
                msg: "Success",
                data: {
                    attemptId: attempt._id,
                    quizId: attempt.quizId._id,
                    quizTitle: attempt.quizId.title,
                    status: currentStatus,
                    actions,
                    remainingTime: !isExpired && attempt.expiresAt
                        ? Math.max(0, Math.floor((new Date(attempt.expiresAt) - now) / 1000))
                        : 0
                },
                status: true
            });
        }

        // Filter out null questions (deleted)
        const validQuestions = attempt.questions.filter(q => q.questionId != null);

        // ---- Calculations ----
        const totalQuestions = validQuestions.length;
        const attempted = validQuestions.filter(q => q.visited).length;
        const correct = validQuestions.filter(q => q.correct).length;
        const wrong = attempted - correct;
        const skipped = totalQuestions - attempted;
        const percentage = totalQuestions > 0 ? ((correct / totalQuestions) * 100).toFixed(2) : 0;

        // Grade calculation
        let grade = "F";
        let resultStatus = "FAILED";
        const percentNum = Number(percentage);
        if (percentNum >= 90) { grade = "A+"; resultStatus = "PASSED"; }
        else if (percentNum >= 80) { grade = "A"; resultStatus = "PASSED"; }
        else if (percentNum >= 70) { grade = "B"; resultStatus = "PASSED"; }
        else if (percentNum >= 60) { grade = "C"; resultStatus = "PASSED"; }
        else if (percentNum >= 50) { grade = "D"; resultStatus = "PASSED"; }

        // Calculate gain percentage (improvement from previous attempts on same quiz)
        const previousAttempts = await QuizAttempt.find({
            userId,
            quizId: attempt.quizId._id,
            status: "COMPLETED",
            _id: { $ne: attemptId } // Exclude current attempt
        }).sort({ completedAt: -1 });

        let gainPercentage = null;
        let previousAverageScore = null;
        if (previousAttempts.length > 0) {
            // Calculate average of previous attempts
            const totalPreviousScore = previousAttempts.reduce((sum, a) => {
                const questionsCount = a.questions?.length || 1;
                return sum + ((a.score / questionsCount) * 100);
            }, 0);
            previousAverageScore = Math.round(totalPreviousScore / previousAttempts.length);
            gainPercentage = Math.round(percentNum - previousAverageScore);
        }

        // Question-wise breakdown for printable report
        const questionsBreakdown = validQuestions.map((q, index) => ({
            questionNumber: index + 1,
            question: q.questionId.title,
            type: q.questionId.type,
            category: q.questionId.category,
            options: q.questionId.options,
            userAnswer: q.answer || [],
            correctAnswer: q.questionId.answer,
            isCorrect: q.correct,
            isAttempted: q.visited
        }));

        // Build printable report data
        const reportData = {
            attemptId: attempt._id,
            user: {
                id: attempt.userId._id,
                firstName: attempt.userId.firstName,
                lastName: attempt.userId.lastName,
                email: attempt.userId.email,
                fullName: `${attempt.userId.firstName} ${attempt.userId.lastName}`
            },
            quiz: {
                id: attempt.quizId._id,
                title: attempt.quizId.title,
                instructorName: attempt.quizId.instructorName
            },
            timing: {
                startedAt: attempt.startedAt,
                completedAt: attempt.completedAt,
                duration: attempt.completedAt && attempt.startedAt
                    ? Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000 / 60)
                    : null // duration in minutes
            },
            summary: {
                totalQuestions,
                attempted,
                correct,
                wrong,
                skipped,
                percentage: Number(percentage),
                grade,
                status: resultStatus,
                // Gain comparison with previous attempts
                previousAttempts: previousAttempts.length,
                previousAverageScore,
                gainPercentage,
                isImprovement: gainPercentage !== null ? gainPercentage > 0 : null
            },
            actions,
            questions: questionsBreakdown
        };

        return res.status(200).json({ msg: "Success", data: reportData, status: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Server error" });
    }
};

