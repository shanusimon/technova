const { query, json } = require("express");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);


        res.render("category", {
            cat: categoryData,           
            currentPage: page,           
            totalPages: totalPages,       
            totalCategories: totalCategories 
        });

    } catch (error) {
        console.log(error);
        res.redirect("/pageerror");
    }
}

const addCategory = async (req,res) => {
    const {name,description} = req.body;
    try{
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:"Category Already Exists"})
        }
        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({message:"Category added successfully"})

    }catch(error){
        return res.status(500).json({error:"Internal Server Error"});
    }
    
}

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        const hasHigherProductOffer = products.some((product) => product.productOffer >= percentage);
        if (hasHigherProductOffer) {
            return res.json({ status: false, message: "One or more products in this category already have a higher product offer" });
        }

        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100));
            await product.save();
        }

        res.json({ status: true });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const percentage = category.categoryOffer;

        const products = await Product.find({ category: category._id });
        if (products.length > 0) {
            for (const product of products) {
             
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0; 
                await product.save();  
            }
        }

        category.categoryOffer = 0;
        await category.save();

        res.json({ status: true });
    } catch (error) {
        console.error("Error in removeCategoryOffer:", error);  
        res.status(500).json({ status: false, message: "Internal Server error" });
    }
};


const getListCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const getUnlistCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageerror");
    }
    
}

const getEditCategory =async (req,res) => {
    try {
        let categoryId = req.query.id;
        const category = await Category.findOne({_id:categoryId});
        res.render("edit-category",{
            category : category
        })  
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const updateCategory = async (req,res) => {
    try {
        const categoryId = req.params.id;
        let {name:categoryName,description}=req.body;
        const existingCategory = await Category.findOne({name:categoryName});
        if(existingCategory){
            return res.status(400).json({error:"Category exists,please choose another name"})
        }
        const updateCategory = await Category.findByIdAndUpdate({_id:categoryId},{
            name:categoryName,
            description:description
        },{new:true});
        if(updateCategory){
            res.redirect("/admin/category");
        }else{
            res.status(404).json({error:"Category not found"})
        }
    } catch (error) {
        res.status(500).json({error:"internal Server error"})
        
    }    
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    updateCategory
}