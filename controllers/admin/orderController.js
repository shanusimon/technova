const Orders = require("../../models/orderSchema");

const getOrderList = async (req,res) => {
    try {
        const orders = await Orders.find()
        .populate('user')
        .populate('orderedItems.product')
        
        res.render('order-list',{
            orders
        });
    } catch (error) {
        
    }
}
const updateStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        await Orders.findByIdAndUpdate(orderId, { status });
        res.json({ message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send("An error occurred while updating the order status");
    }
};

module.exports = {
    getOrderList,
    updateStatus
}