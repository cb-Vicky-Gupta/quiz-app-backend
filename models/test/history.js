const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    visited: { type: Boolean, default: true },
    answered: { type: Boolean, default: false },
    correct: { type: Boolean },
});

module.exports = mongoose.model("UserQuestionHistory", historySchema, "UserQuestionHistory");
