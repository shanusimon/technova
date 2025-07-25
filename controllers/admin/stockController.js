const Product = require("../../models/productSchema");




const getStockPage = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";

    let products = await Product.find().populate("category", "name");


    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(
        (product) =>
          product.productName.toLowerCase().includes(searchLower) ||
          product.category?.name?.toLowerCase().includes(searchLower)
      );
    }

    res.render("stock-managment", {
      data: products,
      search, 
    });
  } catch (error) {
    console.log("Error in loading stock management page:", error);
    res.redirect("/admin/error");
  }
};


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