const crypto = require("crypto");
const { Cashfree } = require("cashfree-pg");
const Payment = require("../../models/payment/index.js"); // Use the updated model
const { CASHFREE_APP_ID, CASHFREE_SECRET_KEY } = process.env;

Cashfree.XClientId = CASHFREE_APP_ID;
Cashfree.XClientSecret = CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

exports.createPayment = async (req) => {
  try {
    const { fullName, email, amount } = req.body;
    // const userId = req.user.id;

    // Create a new order in the database
    const newOrder = await Payment.create({
      fullName,
      email,
      amount,
      orderId: await generateOrderId(), 
      // createdBy: userId,
      // updatedBy: userId,
    });

     
      // If online payment, create Cashfree order
      const request = {
        order_amount: amount,
        order_currency: "INR",
        order_id: newOrder.orderId,
        customer_details: {
          customer_id: await generateCustomerId(),
          customer_phone: req.body.customerPhone,
          customer_name: fullName,
          customer_email: email,
        },
      };

      const response = await Cashfree.PGCreateOrder("2023-08-01", request);

      // Update the payment entry with Cashfree's transaction details
      await Payment.findByIdAndUpdate(newOrder._id, {
        transactionId: response.data.transaction_id,
        status: response.data.payment_status === "SUCCESS" ? "Paid" : "pending",
        // updatedBy: userId,
      });

      return response.data;
    
  } catch (error) {
    console.log(error);
  }
};


exports.verifyPayment = async (req) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);

    if (response.status === OK) {
      
      const filter = { orderId: orderId };
      const update = {
        status: "Paid",
        updatedBy: userId,
        updatedAt: new Date(),
      };
      await Payment.findOneAndUpdate(filter, update);
      return { message: "Payment Verified" };
    } else {
      console.log(error)
    }
  } catch (error) {
    console.error(error);
  }
};


const generateOrderId=()=> {
  try {
    const uniqueId = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHash("sha256");
    hash.update(uniqueId);
    const orderId = hash.digest("hex");
    return orderId.substr(0, 12); 
  } catch (error) {
    console.log(error);
  }
}

