const Quiz = require("../../models/quiz/quiz/index");
const Question = require("../../models/quiz/questions");
const QuizAttempt = require("../../models/test/attemptQuestion");
const UserQuestionHistory = require("../../models/test/history");

exports.startQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user.id;

        // Check if ongoing attempt exists
        let attempt = await QuizAttempt.findOne({
            userId,
            quizId,
            status: "IN_PROGRESS",
            expiresAt: { $gt: new Date() },
        });

        if (attempt) return res.json({ attempt, msg: "Resuming quiz" });

        // If not, create new attempt
        const quiz = await Quiz.findById(quizId).populate("questions");
        if (!quiz) return res.status(404).json({ msg: "Quiz not found" });

        // Filter questions (exclude already attempted/visited ones)
        const history = await UserQuestionHistory.find({ userId, quizId });
        const blockedIds = history.map(h => h.questionId.toString());
        const available = quiz.questions.filter(
            q => !blockedIds.includes(q._id.toString())
        );

        // Take first 10 (or whatever count later)
        const reserved = available.slice(0, 10).map(q => ({
            questionId: q._id,
        }));

        attempt = await QuizAttempt.create({
            userId,
            quizId,
            questions: reserved,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        return res.json({ attempt, msg: "Quiz started" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
};


// exports.submitAnswer = async (req, res) => {
//     try {
//         const { attemptId } = req.params;
//         const { questionId, answer } = req.body;
//         const userId = req.user.id;

//         let attempt = await QuizAttempt.findById(attemptId).populate("questions.questionId");
//         if (!attempt) return res.status(404).json({ msg: "Attempt not found" });
//         if (attempt.status !== "IN_PROGRESS") return res.status(400).json({ msg: "Attempt not active" });

//         // Find question in attempt
//         const q = attempt.questions.find(q => q.questionId._id.toString() === questionId);
//         if (!q) return res.status(400).json({ msg: "Question not part of attempt" });

//         q.visited = true;
//         q.answer = answer;
//         q.correct = q.questionId.correctAnswer === answer;
//         await attempt.save();

//         // Update UserHistory
//         await UserQuestionHistory.findOneAndUpdate(
//             { userId, quizId: attempt.quizId, questionId },
//             { visited: true, answered: true, correct: q.correct },
//             { upsert: true }
//         );

//         return res.json({ msg: "Answer saved", attempt });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ msg: "Server error" });
//     }
// };


// exports.completeQuiz = async (req, res) => {
//     try {
//         const { attemptId } = req.params;
//         const attempt = await QuizAttempt.findById(attemptId).populate("questions.questionId");
//         if (!attempt) return res.status(404).json({ msg: "Attempt not found" });

//         attempt.status = "COMPLETED";
//         attempt.completedAt = new Date();
//         attempt.score = attempt.questions.filter(q => q.correct).length;
//         await attempt.save();

//         // TODO: generate PDF/Email report here

//         return res.json({ msg: "Quiz completed", attempt });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ msg: "Server error" });
//     }
// };

// exports.getAttempt = async (req, res) => {
//     try {
//         const { attemptId } = req.params;
//         const attempt = await QuizAttempt.findById(attemptId).populate("questions.questionId");

//         if (!attempt) return res.status(404).json({ msg: "Attempt not found" });
//         if (attempt.expiresAt < new Date()) {
//             attempt.status = "EXPIRED";
//             await attempt.save();
//             return res.status(400).json({ msg: "Attempt expired" });
//         }

//         return res.json(attempt);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ msg: "Server error" });
//     }
// };
