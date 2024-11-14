const Razorpay = require('razorpay');
const crypto = require('crypto');


const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY_ID,
    key_secret: process.env.RAZOR_PAY_KEY_SECRET
});

const createRazorpay = async (req,res) => {
    let { amount, currency } = req.body;
    console.log(`backend razor amount is ${amount}`)

    try {
      const options = {
        amount: Math.round(amount * 100), 
        currency: currency || 'INR',
        receipt: 'order_rcptid_11',
      };
      console.log(`backend razor after options  is ${options.amount}`)
      const order = await razorpay.orders.create(options);
      console.log(`order obj is ${order}`)
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Unable to create order', error });
    }
  };

  const updateOrderStatus = async (req,res) => {
    try {
      const { orderId } = req.params;
      const { status, paymentStatus, razorpayPaymentId } = req.body;

      await Order.findByIdAndUpdate(orderId, {
          status,
          paymentStatus,
          razorpayPaymentId
      });

      res.json({ success: true });
  } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ success: false, error: "Failed to update order status" });
  }
  }

  module.exports={
    createRazorpay,
    updateOrderStatus
  }
  

