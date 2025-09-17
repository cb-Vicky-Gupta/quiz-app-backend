
const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/payment/payment");
const { userMiddlware } = require("../../middleware/user/middleware");

// Middleware to capture raw body for webhook verification
router.use(
    "/webhook",
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf; // store raw request body
        },
    })
);

router.post("/create-order", userMiddlware, paymentController.createOrder);
router.post("/verify", userMiddlware, paymentController.verifyPayment);
router.post("/webhook", paymentController.handleWebhook);

module.exports = router;
