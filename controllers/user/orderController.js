const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const { client: redis } = require("../../helpers/redisClient");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const Return = require("../../models/returnSchema");
const Wallet = require("../../models/walletSchema");

const LOCK_EXPIRY = 30;

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orderId = req.body.orderId;

    const orderData = await Order.findById(orderId);
    if (!orderData) return res.status(404).send("Order not found");

    if (orderData.user.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized access");
    }

    if (orderData.status === "Cancelled") {
      return res.redirect("/userprofile");
    }

    if (orderData.status === "Delivered") {
      return res.status(400).send("Order already delivered, cannot cancel.");
    }

    for (const item of orderData.orderedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });
    }

    if (
      orderData.paymentMethod === "Online" &&
      orderData.paymentStatus === "Completed"
    ) {
      const amount = orderData.finalAmount;

      const walletData = {
        $inc: { balance: amount },
        $push: {
          transactions: {
            type: "refund",
            amount,
            orderId,
          },
        },
      };

      const walletUpdate = await Wallet.findOneAndUpdate(
        { userId },
        walletData,
        { upsert: true, new: true }
      );

      if (!walletUpdate) throw new Error("Failed to update Wallet");

      await Order.findByIdAndUpdate(orderId, {
        status: "Cancelled",
        paymentStatus: "Refunded",
      });

      return res.redirect("/userprofile");
    }

    await Order.findByIdAndUpdate(orderId, {
      status: "Cancelled",
    });

    return res.redirect("/userprofile");
  } catch (error) {
    console.error("Error in canceling order", error);
    res.redirect("/pagenotFound");
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.session.user._id;

    const orderData = await Order.findById(orderId);
    console.log(orderData);
    if (!orderData) {
      return res.status(404).json({ message: "Order not found" });
    }

    const Existingreturn = await Return.findOne({ orderId });
    if (Existingreturn) {
      return res
        .status(404)
        .json({ message: "Return request already submited for this order" });
    }

    const reasonData = new Return({
      userId,
      orderId,
      reason,
      refundAmount: orderData.finalAmount,
    });

    await reasonData.save();

    orderData.status = "Return Request";
    await orderData.save();

    return res
      .status(200)
      .json({ message: "Return Request Submitted Successfully" });
  } catch (error) {
    console.error("Error processing return request:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong, please try again later." });
  }
};

const sortProduct = async (req, res) => {
  try {
    const sortOption = req.query.sort || "default";

    let sortCriteria;

    switch (sortOption) {
      case "popularity":
        sortCriteria = { popularity: -1 };
        break;
      case "price-low-high":
        sortCriteria = { salePrice: 1 };
        break;
      case "price-high-low":
        sortCriteria = { salePrice: -1 };
        break;
      case "rating":
        sortCriteria = { rating: -1 };
        break;
      case "new-arrivals":
        sortCriteria = { createdAt: -1 };
        break;
      case "alphabetical-a-z":
        sortCriteria = { productName: 1 };
        break;
      case "alphabetical-z-a":
        sortCriteria = { productName: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    const products = await Product.find().sort(sortCriteria);
    res.json({ products });
  } catch (error) {}
};

const orderProductDetails = async (req, res) => {
  try {
    const orderId = req.query.id;
    const order = await Order.findById(orderId)
      .populate({
        path: "orderedItems.product",
        model: "Product",
        select: "productName productImage salePrice",
      })
      .populate("address");

    if (!order) {
      return res.status(404).render("error", { message: "Order not found" });
    }

    res.render("order-details", {
      order: order,
    });
  } catch (error) {
    console.log("Order Product Details Error:", error.message);
    res
      .status(500)
      .render("error", { message: "Error fetching order details" });
  }
};

const placeOrder = async (req, res) => {
  const userId = req.session.user;
  const lockKey = `lock:order:${userId._id}`;
  try {
    let {
      cart,
      totalPrice,
      couponCode,
      payment_option,
      discount,
      addressId,
      singleProduct,
    } = req.body;

    const lock = await redis.set(lockKey, "locked", {
      NX: true,
      PX: 60000,
    });

    if (!lock) {
      return res.status(429).json({
        success: false,
        message:
          "An order is already being processed. Please wait before placing another.",
      });
    }

    let orderedItems = [];
    if (singleProduct) {
      const product = JSON.parse(singleProduct);
      const dbProduct = await Product.findById(product._id);

      if (!dbProduct || dbProduct.isBlocked) {
        await redis.del(lockKey);
        return res.status(400).json({
          success: false,
          message: `"${
            dbProduct?.productName || "Product"
          }" is currently blocked and cannot be ordered.`,
        });
      }

      if (!dbProduct || product.quantity > dbProduct.quantity) {
        await redis.del(lockKey);
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${
            dbProduct?.productName || "product"
          }". Available: ${dbProduct?.quantity || 0}`,
        });
      }
      orderedItems.push({
        product: product._id,
        quantity: 1,
        price: product.salePrice,
      });
      await Product.findByIdAndUpdate(product._id, {
        $inc: { quantity: -1 },
      });
    } else {
      const cartItems = JSON.parse(cart);

      for (const item of cartItems) {
        const dbProduct = await Product.findById(item.productId);
        if (!dbProduct || dbProduct.isBlocked) {
          await redis.del(lockKey);
          return res.status(400).json({
            success: false,
            message: `"${
              dbProduct?.productName || "A product"
            }" is currently blocked and cannot be ordered.`,
          });
        }

        if (!dbProduct || dbProduct.quantity < item.quantity) {
          await redis.del(lockKey);
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${
              dbProduct?.productName || "a product"
            }". Available: ${dbProduct?.quantity || 0}, Requested: ${
              item.quantity
            }`,
          });
        }
      }
      orderedItems = cartItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.totalPrice / item.quantity,
      }));
      for (const item of cartItems) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity },
        });
      }
    }

    let deliveryCharge = 40;

    const couponApplied = Boolean(couponCode && couponCode.trim() !== "");

    const parsedTotalPrice = Number(totalPrice) || 0;

    const parsedDiscount = Number(discount?.toString().replace(/,/g, "")) || 0;

    let fullAmount = parsedTotalPrice + parsedDiscount;
    let convTotal = Number(fullAmount);
    let finAmount = parsedTotalPrice - parsedDiscount;
    finAmount = finAmount + deliveryCharge;
    let convfin = Number(finAmount);

    if (discount == 0) {
      couponCode = undefined;
    }

    const addressDoc = await Address.findOne({ userId: userId });
    const selectedAddress = addressDoc.addresses.id(addressId);

    if (!selectedAddress) {
      await redis.del(lockKey);
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const orderData = {
      orderedItems,
      totalPrice: convTotal.toFixed(2),
      finalAmount: convfin.toFixed(2),
      deliveryCharge,
      couponCode,
      discount: parsedDiscount,
      couponApplied,
      user: userId,
      address: selectedAddress.toObject(),
      paymentMethod: payment_option,
    };

    if (payment_option === "COD") {
      orderData.status = "Pending";
      orderData.paymentStatus = "Not Applicable";
    } else if (payment_option === "Online") {
      orderData.status = "Pending";
      orderData.paymentStatus = "Pending";
    }

    if (discount !== 0) {
      await User.findByIdAndUpdate(userId, {
        $push: { redeemedcoupon: couponCode },
      });
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    if (payment_option === "COD") {
      await redis.del(lockKey);
      res.redirect(`/payment-successful?id=${newOrder._id}`);
    } else {
      res.json({ orderId: newOrder._id, finalAmount: finAmount });
    }
  } catch (error) {
    console.error("Error in placing order:", error);
    redis.del(lockKey);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  sortProduct,
  cancelOrder,
  returnOrder,
  orderProductDetails,
  placeOrder,
};
