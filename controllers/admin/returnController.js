const Return = require("../../models/returnSchema");
const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const Notification = require("../../models/notificationSchema");
const { Transaction } = require("mongodb");

const getReturnApprovals = async (req, res) => {
  try {
    const returnData = await Return.find().populate("orderId userId");
    res.render("returnapprovals", {
      returns: returnData,
    });
  } catch (error) {
    console.error("Error fetching return approvals:", error);
    res.status(500).send("Server error");
  }
};

const returnUpdate = async (req, res) => {
  try {
    const returnId = req.query.id;
    const { status } = req.body;

    const returnData = await Return.findById(returnId);
    if (!returnData) {
      return res.status(404).json({ message: "Return request not found" });
    }

    const userId = returnData.userId;
    const orderId = returnData.orderId;
    const amount = returnData.refundAmount;

    if (status === "approved") {
      try {
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
          wallet = new Wallet({
            userId,
            balance: 0,
            transactions: [],
          });
          await wallet.save();
        }

        await Wallet.findOneAndUpdate(
          { userId },
          {
            $inc: { balance: amount },
            $push: {
              transactions: {
                type: "credit",
                amount: amount,
                description: "Refund for your returned product",
                orderId,
                date: new Date(),
              },
            },
          }
        );

        returnData.returnStatus = status;
        await returnData.save();

        const order = await Order.findById(orderId);
        if (order && order.orderedItems) {
          for (let item of order.orderedItems) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { quantity: item.quantity },
            });
          }
        }

        let notification = await Notification.findOne({ userId });

        if (!notification) {
          notification = new Notification({
            userId,
            message:
              "Your Return Request Has Been Approved, Amount Is Added To Your Wallet",
            status: "unread",
          });
          await notification.save();
        } else {
          await Notification.findOneAndUpdate(
            { userId },
            {
              message:
                "Your Return Request Has Been Approved, Amount Is Added To Your Wallet",
              status: "unread",
              createdAt: Date.now(),
            }
          );
        }
        await Order.findOneAndUpdate(
          { _id: orderId },
          { $set: { status: "Return Request Approved" } }
        );
      } catch (error) {
        console.error("Error in updating wallet and return status:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    } else if (status === "rejected") {
      try {
        returnData.returnStatus = status;
        await returnData.save();

        let notification = await Notification.findOne({ userId });

        if (!notification) {
          notification = new Notification({
            userId,
            message: "Your Return Order Is Rejected",
            status: "unread",
          });
          await notification.save();
        } else {
          await Notification.findOneAndUpdate(
            { userId },
            {
              message: "Your Return Request Is Rejected",
              status: "unread",
              createdAt: Date.now(),
            }
          );
        }
        await Order.findOneAndUpdate(
          { _id: orderId },
          { $set: { status: "Return Request Rejected" } }
        );
      } catch (error) {
        console.error("Error in rejecting return status:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    } else {
      return res.status(400).json({ message: "Invalid status value" });
    }

    return res.redirect(`/admin/return-approvals`);
  } catch (error) {
    console.error("Error in Updating Return Status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getReturnApprovals,
  returnUpdate,
};
