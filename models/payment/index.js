const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String }, 
  orderId: { type: String, required: true }, 
  customerId: { type: String }, 
  status: { type: String, default: 'pending' }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }); 

module.exports = mongoose.model('Payment', PaymentSchema, 'Payment');
