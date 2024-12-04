// routes/payment.js
const express = require('express');
const { createPayment, verifyPayment } = require('../../controllers/payment/payment');
const router = express.Router();

// Route for creating a new payment
router.post('/payment', createPayment);

// Route for verifying a payment
router.post('/verify', verifyPayment);

module.exports = router;
