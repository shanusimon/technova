const Products = require("../../models/productSchema")
const Orders = require("../../models/orderSchema");

const getOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Orders.find()
      .populate("user")
      .populate("orderedItems.product")
      .skip(skip)
      .limit(limit);

    const totalOrders = await Orders.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("order-list", {
      orders,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const updateStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const order = await Orders.findById(orderId).populate('orderedItems.product');

     if (!order) return res.status(404).json({ message: "Order not found" });

     if(status === "Cancelled" && order.status !== "Cancelled"){
      for(const item of order.orderedItems){
        const product = await Products.findById(item.product._id);
        if(product){
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
