const express = require('express')
const { adminSignupController, adminLoginController} = require('../../controllers/admin/adminController')
const { categoryController, categoryListController, categoryUpdateController, deactivateCategory, getCategoryWithQuestions } = require('../../controllers/quiz/category')
const { adminmiddleware } = require('../../middleware/admin')
const { typeController, deleteTypeContoller, getAdminQuestionType } = require('../../controllers/quiz/queTypes')
const { getTypeController } = require('../../models/quiz/questionTypes/getTypes')
const { addNewQuestion, getAllAdminquestions, getAdminQuestionById, updateAdminQuestionById, deleteQuestionbyAdmin, transformData } = require('../../controllers/quiz/questions')
const { soldQuizController } = require('../../controllers/admin/soldQuizes')
const { schemaValidation } = require('../../utils/validation')
const { registrationSchema, loginValidationSchema, questionsSchema, quizSchema } = require('../../utils/constants')
const { freeQueAddController, getAdminFreeQue, updateFreeQuestion, deleteFreeQuestion, enableFreeQuestion } = require('../../controllers/quiz/freeQuestions/freeController')
const { createQuiz, updateQuiz, deleteQuiz, getAllQuiz, getQuizById, retriveQuiz } = require('../../controllers/admin/quiz')

const router = express.Router()


// auth
router.post('/signup',schemaValidation(registrationSchema), adminSignupController)
router.post('/login',schemaValidation(loginValidationSchema), adminLoginController)


// category 
router.post('/create-category',adminmiddleware, categoryController)
router.get('/get-category',adminmiddleware, categoryListController)
router.put('/update-category/:categoryId',adminmiddleware, categoryUpdateController)
router.post('/delete-category/:categoryId', adminmiddleware, deactivateCategory)

// type
router.post('/create-type',adminmiddleware, typeController)
router.get('/get-type',adminmiddleware, getTypeController)
router.get('/get-que-type', adminmiddleware, getAdminQuestionType)
router.post('/delete-type/:typeId',adminmiddleware, deleteTypeContoller)

// quiz questions routes

router.post('/add-question', adminmiddleware, addNewQuestion)
router.get('/get-questions', adminmiddleware, getAllAdminquestions)
router.get('/get-question/:questionId', adminmiddleware, getAdminQuestionById)
router.put('/update-question/:questionId', adminmiddleware, updateAdminQuestionById)
router.delete('/delete-question/:questionId', adminmiddleware, deleteQuestionbyAdmin)

//clean data 
router.put('/transform-data',adminmiddleware,transformData)

// quiz routes
router.get('/sold-quiz', adminmiddleware, soldQuizController)

// free quiz route
router.post('/free-add-question',schemaValidation(questionsSchema), adminmiddleware,freeQueAddController)
router.get('/free-get-question', adminmiddleware,getAdminFreeQue)
router.put('/free-update-question',schemaValidation(questionsSchema), adminmiddleware,updateFreeQuestion)
router.put('/free-delete-question/:questionId', adminmiddleware,deleteFreeQuestion)
router.put('/free-enable-question/:questionId', adminmiddleware,enableFreeQuestion)

//quiz-crud routes
router.post('/quiz-create',schemaValidation(quizSchema), adminmiddleware, createQuiz)
router.put('/quiz-update/:quizId', adminmiddleware, updateQuiz)
router.put('/delete-quiz/:quizId', adminmiddleware, deleteQuiz)
router.put('/retrive-quiz/:quizId', adminmiddleware, retriveQuiz)
router.get('/get-all-quiz', adminmiddleware, getAllQuiz)
router.get('/get-quiz/:quizId', adminmiddleware, getQuizById)


module.exports = router;