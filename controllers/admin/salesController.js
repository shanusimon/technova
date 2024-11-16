const Order = require("../../models/orderSchema");

const showSaleReport = async (req,res) =>{
    try {
        const salesData = await Order.find().populate('user').populate({
            path:"orderedItems.product",
            model: "Product"
        });
        const sumOfSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    sum: { $sum: "$finalAmount" } 
                }
            }
        ]);
        const totalOrders = await Order.aggregate([{
            $group:{
                _id:null,
                count:{$sum:1}
            }
        }])
        const totalCustomers = await Order.aggregate([
            {
                $group: {
                    _id: "$user" 
                }
            },
            {
                $count: "totalCustomers"
            }
        ]);      
        const discount = await Order.aggregate([{
            $group:{
                _id:null,
                sum:{$sum:"$discount"}
            }
        }])  

        let overallDiscount = discount.pop()
        let totalsales = sumOfSales.pop();
        let counts = totalOrders.pop();
        let numberOfCustomers = totalCustomers.pop();
        console.log(salesData)
        res.render("salesreport",{
            salesData,
            sumOfSales:totalsales,
            counts,
            numberOfCustomers,
            overallDiscount
    })
    } catch (error) {
        
    }
}

module.exports={
    showSaleReport
}