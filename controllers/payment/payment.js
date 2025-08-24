
const { Cashfree } = require("cashfree-pg");
const Purchase = require("../../models/payment/index");

// 🔹 Initialize Cashfree with your credentials
Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
Cashfree.XEnvironment = Cashfree.SANDBOX;
// console.log(Cashfree.Environment);
exports.createOrder = async (req, res) => {
  try {
    const { quizId, amount, redirectUrl } = req.body;
    console.log("body")
    const userId = req.user.id;

    const response = await Cashfree.PGCreateOrder("2023-08-01", {
      order_amount: amount || 0,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_name: req.user.firstName + " " + req.user.lastName,
        customer_email: req.user.email,
        customer_phone: req.user.phone || "1234567890",
      },
      order_id: "order_" + Date.now(),
      order_meta: {
        return_url: redirectUrl + "?order_id={order_id}",
        notify_url: "http://localhost:8000/v1/payments/webhook",
      },
    });

    // Save purchase in DB with status PENDING
    await Purchase.create({
      userId,
      quizId,
      orderId: response.data.order_id,
      amount,
      currency: "INR",
      status: "PENDING",
    });

    res.json(response.data);
  } catch (err) {
    console.error("Cashfree create order error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    // 🔹 Fetch all payment attempts for this order
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ error: "No payment records found" });
    }

    // Usually latest attempt is the last one
    const payment = response.data[response.data.length - 1];

    // Update DB if payment exists
    const updatedPayment = await Purchase.findOneAndUpdate(
      { orderId },
      {
        status: payment.payment_status,
        referenceId: payment.cf_payment_id,
        paymentMethod: payment.payment_group,

        updatedAt: new Date(),
      },
      { new: true }
    );
    console.log(updatedPayment)
    res.json({
      status: payment.payment_status,
      orderId,
      referenceId: payment.cf_payment_id,
      paymentMethod: payment.payment_group,
      updated: !!updatedPayment,
      amount: updatedPayment?.amount,
    });
  } catch (err) {
    console.error("Verify Payment error:", err.response?.data || err.message);
    res.status(500).json({ error: "Verification failed" });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const event = req.body; // Cashfree sends JSON webhook
    console.log("Webhook Event:", JSON.stringify(event, null, 2));

    const { order_id, order_status, payment } = event.data || {};
    console.log(order_id, order_status, payment)
    if (!order_id) {
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    // If multiple payments, pick latest
    const latestPayment = Array.isArray(payment)
      ? payment[payment.length - 1]
      : payment;

    await Purchase.findOneAndUpdate(
      { orderId: order_id },
      {
        status: order_status,
        referenceId: latestPayment?.cf_payment_id,
        paymentMethod: latestPayment?.payment_group,
        updatedAt: new Date(),
      },
      { new: true, upsert: false }
    );

    // Always respond 200 quickly
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Still send 200 to avoid retries (optional: log separately)
    res.status(200).json({ success: false });
  }
};
