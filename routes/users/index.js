const express = require("express");
const { userSignupController, userLoginController } = require("../../controllers/users/userController");
const { schemaValidation } = require("../../utils/validation");
const { registrationSchema, loginValidationSchema } = require("../../utils/constants");
const { userMiddlware } = require("../../middleware/user/middleware");
const { getAllQuizController, getAllQuizPrivate, getMyQuiz, getQuizById } = require("../../controllers/quiz/getAllQuizes/getAllQuizController");
const quizController = require("../../controllers/users/userQuizController")
const router = express.Router()

router.post('/signup', schemaValidation(registrationSchema), userSignupController)
router.post('/login', schemaValidation(loginValidationSchema), userLoginController)
//get all quizes
router.get('/get-all-quizes', getAllQuizController)
router.post('/get-all-quiz', userMiddlware, getAllQuizPrivate)
router.post('/get-my-quiz', userMiddlware, getMyQuiz)
router.post('/get-quiz/:id', userMiddlware, getQuizById)

//attempt quiz route 
router.post("/:quizId/start", userMiddlware, quizController.startQuiz);
// router.get("/attempt/:attemptId", userMiddlware, quizController.getAttempt);
// router.post("/attempt/:attemptId/answer", userMiddlware, quizController.submitAnswer);
// router.post("/attempt/:attemptId/complete", userMiddlware, quizController.completeQuiz);
// router.get("/:quizId/leaderboard", userMiddlware, quizController.getLeaderboard);

module.exports = router;