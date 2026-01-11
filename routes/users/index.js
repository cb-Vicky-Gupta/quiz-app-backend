const express = require("express");
const { userSignupController, userLoginController } = require("../../controllers/users/userController");
const { getProfile, updateProfile } = require("../../controllers/users/profileController");
const { schemaValidation } = require("../../utils/validation");
const { registrationSchema, loginValidationSchema } = require("../../utils/constants");
const { userMiddlware } = require("../../middleware/user/middleware");
const { getAllQuizController, getAllQuizPrivate, getMyQuiz, getQuizById } = require("../../controllers/quiz/getAllQuizes/getAllQuizController");
const quizController = require("../../controllers/users/userQuizController")
const router = express.Router()

router.post('/signup', schemaValidation(registrationSchema), userSignupController)
router.post('/login', schemaValidation(loginValidationSchema), userLoginController)

// Profile routes
router.get('/profile', userMiddlware, getProfile)
router.put('/update-profile', userMiddlware, updateProfile)

// Dashboard route
const { getDashboard } = require("../../controllers/users/dashboardController");
router.get('/dashboard', userMiddlware, getDashboard)

//get all quizes
router.get('/get-all-quizes', getAllQuizController)
router.post('/get-all-quiz', userMiddlware, getAllQuizPrivate)
router.post('/get-my-quiz', userMiddlware, getMyQuiz)
router.post('/get-quiz/:id', userMiddlware, getQuizById)

//attempt quiz route 
router.post("/start/:quizId", userMiddlware, quizController.startQuiz);
router.post("/attempt/submit-answer", userMiddlware, quizController.submitAnswer);
router.post("/quiz/final-submit", userMiddlware, quizController.completeQuiz);
router.post("/quiz/leaderboard", userMiddlware, quizController.getLeaderboard);
router.post("/quiz/reports", userMiddlware, quizController.getAllAttemptsQuizesList);
router.post("/quiz/result", userMiddlware, quizController.userReportController);

module.exports = router;