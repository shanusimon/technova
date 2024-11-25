const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/orderSchema')

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY_ID,
    key_secret: process.env.RAZOR_PAY_KEY_SECRET
});

const retryPayment = async (req, res) => {
    try {
        const { id: orderId } = req.query;

        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        const order = await Order.findById(orderId).populate('orderedItems.product').populate('address');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const options = {
            amount: Math.round(order.finalAmount * 100), 
            currency: 'INR',
            receipt: `retry_order_rcptid_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        return res.status(200).json({
            razorpay: {
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                razorpayOrderId: razorpayOrder.id
            },
            orderDetails: {
                orderId: order._id,
                user: order.user,
                orderedItems: order.orderedItems,
                totalPrice: order.totalPrice,
                discount: order.discount,
                finalAmount: order.finalAmount,
                address: order.address,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                createdOn: order.createdOn
            }
        });
    } catch (error) {
        console.error("Error during retry payment:", error);
        return res.status(500).json({ message: "Failed to initiate retry payment", error: error.message });
    }
};


const createRazorpay = async (req, res) => {
    const { amount, currency } = req.body;

    try {
        const options = {
            amount: Math.round(amount * 100), 
            currency: currency || 'INR',
            receipt: `order_rcptid_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: 'Unable to create order', error });
    }
};


const updateOrder = async (req, res) => {
  try {
      const { orderId, paymentId, razorpayOrderId, signature, status } = req.body;

      if (status === 'Payment Failed') {
        console.log("Updating order to Payment Failed...");
          const updatedOrderData = await Order.findOneAndUpdate(
              { _id: orderId }, 
              { paymentStatus: "Failed", status: "Payment Pending" }, 
              { new: true } 
          );
          console.log(`updated data is ${updatedOrderData}`)

          if (updatedOrderData) {
              return res.status(200).json({ message: 'Order marked as failed', updatedOrderData });
          } else {
              return res.status(404).json({ message: 'Order not found' });
          }
      }

      const body = `${razorpayOrderId}|${paymentId}`;
      const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
          .update(body.toString())
          .digest('hex');

      if (expectedSignature === signature) {
          const updatedOrderData = await Order.findOneAndUpdate(
              { _id: orderId }, 
              { paymentStatus: "Completed", status: "Paid" },
              { new: true }
          );

          if (updatedOrderData) {
              return res.status(200).json({ message: 'Payment verified and order updated', updatedOrderData });
          } else {
              return res.status(404).json({ message: 'Order not found' });
          }
      } else {
          console.log(`Order ${orderId} payment verification failed due to signature mismatch.`);
          return res.status(400).json({ message: 'Invalid payment signature' });
      }
  } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: 'Order update failed', error });
  }
};

module.exports = {
    createRazorpay,
    updateOrder,
    retryPayment
};
