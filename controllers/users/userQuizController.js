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
            select: "title options type category"
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
                select: "title options type category"
            });

        return res.json({ attempt: populatedAttempt, msg: "Quiz started" });

    } catch (err) {
        console.error("❌ startQuiz error:", err);
        res.status(500).json({ msg: "Server error" });
    }
};



exports.submitAnswer = async (req, res) => {
    try {
        const { questionId, answer, attemptId } = req.body;
        const userId = req.user.id;

        // ✅ Load attempt
        let attempt = await QuizAttempt.findById(attemptId).populate("questions.questionId");
        if (!attempt) return res.status(404).json({ msg: "Attempt not found" });
        if (attempt.status !== "IN_PROGRESS") return res.status(400).json({ msg: "Attempt not active" });
        if (attempt.userId.toString() !== userId) return res.status(403).json({ msg: "Not your attempt" });

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
        const results = attempt.questions.map(q => ({
            questionId: q.questionId._id,
            question: q.questionId.questionText,
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
    const { page = 1, limit = 10, search = "" } = req.body;

    try {

        const attempts = await QuizAttempt.find({ userId }).populate("quizId");

        const _data = attempts.map(attempt => {
            return {
                id: attempt._id,
                quizId: attempt.quizId._id,
                title: attempt.quizId.title,
                userId: userId,
                status: attempt.status,
                expiresAt: attempt.expiresAt,
                startedAt: attempt.startedAt,
                completedAt: attempt.completedAt,
                score: attempt.score,
                quizTitle: attempt.quizId.title
            };
        });
        return res.json({
            msg: "Success",
            data: _data
        });
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
}