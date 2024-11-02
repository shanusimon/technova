const Product = require("../../models/productSchema");




const getStockPage =async (req,res) => {
    try {
        const products = await Product.find().populate("category","name");
        res.render("stock-managment",{
            data:products
        })
    } catch (error) {
        console.log("error in loading stock managment page",error);
    }
    
}

const updateStock = async (req,res) => {
    try {
        const {productId,newStock} = req.body;
        await Product.findByIdAndUpdate(productId,{quantity:newStock});
        res.json({success:true})

    } catch (error) {
        console.log("Error updating Stock");
        res.json({success:false});
    }
}

module.exports ={
    getStockPage,
    updateStock
}