const User = require("../../models/userSchema");
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const bcrypt = require("bcrypt");

const pageError = async (req,res) => {
    res.render('admin-error')   
}


const loadlogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null})
}

const login =  async(req,res)=>{
    try {
        const {email,password} = req.body;
        const admin = await User.findOne({email,isAdmin:true});
        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin = true;
                return res.redirect("/admin");
            }else{
                return res.redirect("/admin/login");
            }
        }else{
            return res.redirect("/admin/login");
        }
        
    } catch (error) {
     console.log("login error",error);
     return res.redirect("/pageerror")   
    }
}

const loadDashboard = async (req, res) => {
    try {

        if (req.session.admin) {
            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();
            const brands = await getMostSellingBrands();

            console.log(salesData)
            res.render('dashboard', { salesData, products, categories, brands });
        }

    } catch (error) {
        res.redirect('/pageerror')
    }
}

async function getTotalSales() {
    try {
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) 
                    }
                }
            },
            {
                $group: {
                    _id: { $isoWeek: "$createdAt" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

 
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) 
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);


        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            },
            {
                $limit: 5 
            }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
  
        const weeklyData = {
            labels: weeklySales.map(item => `Week ${item._id}`),
            data: weeklySales.map(item => item.sales)
        };


        const monthlyData = {
            labels: [],
            data: []
        };


        for (let i = 1; i <= 12; i++) {
            const monthData = monthlySales.find(item => item._id === i);
            monthlyData.labels.push(monthNames[i-1]);
            monthlyData.data.push(monthData ? monthData.sales : 0);
        }


        const yearlyData = {
            labels: yearlySales.map(item => item._id.toString()),
            data: yearlySales.map(item => item.sales)
        };

        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: weeklyData,
            monthly: monthlyData,
            yearly: yearlyData
        };
    } catch (error) {
        console.error("Error calculating sales data:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    }
}

async function getMostSellingProducts() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$orderedItems.product",
                    productName: { $first: "$productDetails.productName" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling product:", error);
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            { $unwind: "$categoryDetails" },

            {
                $group: {
                    _id: "$productDetails.category",
                    categoryName: { $first: "$categoryDetails.name" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category:", error);
    }
}

async function getMostSellingBrands() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$productDetails.brand",
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 },
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category and brand:", error);
    }
}

const logout = async (req,res) => {
    try {
        req.session.admin = null;
        res.redirect('/admin/login')
    } catch (error) {
        console.log("unexpected error During Logout",error);
        res.send("HELLO WORLD")
    }
    
}


module.exports ={
    loadlogin,
    login,
    loadDashboard,
    pageError,
    logout
}


