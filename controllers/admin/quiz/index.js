const questions = require("../../../models/quiz/questions");
const quiz = require("../../../models/quiz/quiz");
const { status } = require("../../../utils/statuscodes");

exports.createQuiz = async (req, res) => {
    const { title, instructorName, instructorBio, quizFullDesc, quizShortDesc } = req.body;
    try {
        const newQuiz = new quiz({ title, instructorName, instructorBio, quizFullDesc, quizShortDesc, price: req.body.price, admin: req.admin.id, createdBy: req.admin.id, updatedBy: req.admin.id })
        await newQuiz.save()
        return res.status(status.created).json({ msg: "Quiz created successfully", data: newQuiz, status: true })
    } catch (error) {
        console.error(error)
        return res.status(status.serverError).json({ msg: "Server Error" })
    }
}
exports.updateQuiz = async (req, res) => {
    const { title, instructorName, instructorBio, quizFullDesc, price, quizShortDesc } = req.body;
    const { quizId } = req.params;
    try {
        const findQuiz = await quiz.findById(quizId)
        if (!findQuiz) {
            return res.status(status.notFound).json({ msg: "Quiz not found" })
        }
        const updateQuiz = { title, instructorName, instructorBio, quizFullDesc, quizShortDesc, price, }
        const updateQuizData = await quiz.findByIdAndUpdate(quizId, updateQuiz, { new: true })
        return res.status(status.success).json({ msg: "Quiz updated successfully", data: updateQuizData, status: true })
    } catch (error) {
        console.error(error)
        return res.status(status.serverError).json({ msg: "Server Error" })
    }
}

exports.getAllQuiz = async (req, res) => {

    try {
        const findQuiz = await quiz.find(
            { createdBy: req.admin.id, isActive: true }
        )
        if (!findQuiz) {
            return res.status(status.notFound).json({ msg: "Quiz not found" })
        }
        const quizzesWithCounts = await Promise.all(
            findQuiz.map(async (q) => {
                const totalQuestions = await questions.countDocuments({ quizId: q._id });
                return { ...q.toObject(), totalQuestions };
            })
        );

        return res
            .status(status.success)
            .json({ msg: "Quiz found successfully", data: quizzesWithCounts, status: true });

    } catch (error) {
        console.error(error)
        return res.status(status.serverError).json({ msg: "Server Error" })
    }
}

exports.getQuizById = async (req, res) => {
    const { quizId } = req.params;
    try {
        const findQuiz = await quiz.findById(quizId)
        if (!findQuiz) {
            return res.status(status.notFound).json({ msg: "Quiz not found" })
        }
        return res.status(status.success).json({ msg: "Quiz found successfully", data: findQuiz, status: true })
    } catch (error) {
        console.error(error)
        return res.status(status.serverError).json({ msg: "Server Error" })
    }
}

exports.deleteQuiz = async (req, res) => {
    const { quizId } = req.params;
    try {
        const findQuiz = await quiz.find(
            { _id: quizId, isActive: true }
        )
        console.log(findQuiz)
        if (findQuiz.length === 0) {
            return res.status(status.notFound).json({ msg: "Quiz not found" })
        }
        if (findQuiz.isActive === false) {
            return res.status(status.badRequest).json({ msg: "Quiz is already deleted" })
        }
        const updatedQuiz = {
            isActive: false,
            updatedBy: req.admin.id
        }
        await quiz.findByIdAndUpdate(quizId, updatedQuiz, { new: true })
        return res.status(status.success).json({ msg: "Quiz deleted successfully", data: updatedQuiz, status: true })
    } catch (error) {
        console.error(error)
        return res.status(status.serverError).json({ msg: "Server Error" })
    }
}
exports.retriveQuiz = async (req, res) => {
    const { quizId } = req.params;
    try {
        const findQuiz = await quiz.find(
            { _id: quizId, isActive: false }
        )
        console.log(findQuiz)
        if (findQuiz.length === 0) {
            return res.status(status.notFound).json({ msg: "Quiz not found" })
        }
        const updatedQuiz = {
            isActive: true,
            updatedBy: req.admin.id
        }
        await quiz.findByIdAndUpdate(quizId, updatedQuiz, { new: true })
        return res.status(status.success).json({ msg: "Quiz retrived successfully", data: updatedQuiz, status: true })
    } catch (error) {
        console.error(error)
        return res.status(status.serverError).json({ msg: "Server Error" })
    }
}

