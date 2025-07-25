const Products = require("../../models/productSchema");
const Orders = require("../../models/orderSchema");
const mongoose = require("mongoose");

const getOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";

    const query = {};
    if (status) {
      query.status = status;
    }

    if (search && mongoose.Types.ObjectId.isValid(search)) {
      query._id = new mongoose.Types.ObjectId(search);
    }

    let orders = await Orders.find(query)
      .populate("user")
      .populate("orderedItems.product");

    if (search && !mongoose.Types.ObjectId.isValid(search)) {
      const searchLower = search.toLowerCase();
      orders = orders.filter((order) =>
        order.orderedItems.some((item) =>
          item.product?.productName?.toLowerCase().includes(searchLower)
        )
      );
    }

    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limit);

    const paginatedOrders = orders.slice(skip, skip + limit);

    res.render("order-list", {
      orders: paginatedOrders,
      currentPage: page,
      totalPages,
      limit,
      search,
      status,
    });
  } catch (error) {
    console.error("Error in getOrderList:", error.message);
    res.redirect("/pageerror");
  }
};

const updateStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const order = await Orders.findById(orderId).populate(
      "orderedItems.product"
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status === "Cancelled" && order.status !== "Cancelled") {
      for (const item of order.orderedItems) {
        const product = await Products.findById(item.product._id);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }
    order.status = status;
    await order.save();

    res.json({ message: "Order status updated successfully" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("An error occurred while updating the order status");
  }
};

module.exports = {
  getOrderList,
  updateStatus,
};
