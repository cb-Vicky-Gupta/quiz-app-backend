const mongoose = require('mongoose')

const QuestionSchema = new mongoose.Schema({
    title : {type: String, required : true},
    type : {type: String},
    category : {type: String},
    options : [{type: String}],
    answer : [{type: String}],
    admin : {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    isActive : {type: Boolean, default: true},
    quizId : {type : mongoose.Schema.Types.ObjectId, ref: 'Quiz'},
    QuestionFor: {type: String,enum: ['free', 'paid'],required: true},
    createdDate : {type: Date, default: Date.now},
    createdBy : {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    updatedBy : {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'}
})

module.exports = mongoose.model('questions', QuestionSchema, 'questions')