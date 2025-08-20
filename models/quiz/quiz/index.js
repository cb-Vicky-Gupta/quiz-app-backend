const mongoose = require('mongoose')
const quiz = new mongoose.Schema({
    instructorName: { type: String, required: true },
    instructorBio: { type: String, required: true },
    quizShortDesc: [{
        title: { type: String, required: true },
        content: { type: String, required: true }
    }],
    quizFullDesc: [{
        title: { type: String, required: true },
        content: { type: String, required: true }
    }],
    price: { type: Number, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
})

module.exports = mongoose.model('Quiz', quiz, 'Quiz')