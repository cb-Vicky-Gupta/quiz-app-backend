const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    questions: [
        {
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: "questions" },
            answer: [{ type: String }],
            visited: { type: Boolean, default: false },
            correct: { type: Boolean, default: false },
        },
    ],
    status: {
        type: String,
        enum: ["IN_PROGRESS", "COMPLETED", "EXPIRED"],
        default: "IN_PROGRESS",
    },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date },
    score: { type: Number, default: 0 },
});

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema, "QuizAttempt");
