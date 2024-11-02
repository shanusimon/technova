const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminControllers");
const {userAuth,adminAuth} = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerControllers");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const bannerController = require("../controllers/admin/bannerController");
const orderController = require("../controllers/admin/orderController");
const stockController = require("../controllers/admin/stockController");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});
router.use(express.static("public"));

//login managment
router.get("/pageerror",adminController.pageError);
router.get("/login",adminController.loadlogin);
router.post("/login",adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);


//Customer Managment
router.get("/customers",customerController.customerInfo);
router.get("/block-user",adminAuth,customerController.customerBlocked);
router.get("/unblock-user",adminAuth,customerController.customerUnblocked)

//category Managment
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get("/listcategory",adminAuth,categoryController.getListCategory);
router.get("/unlistcategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editcategory",adminAuth,categoryController.getEditCategory);
router.post("/updateCategory/:id",adminAuth,categoryController.updateCategory)

//Brand Managment
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single('image'),brandController.addBrands);
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unblockBrand",adminAuth,brandController.unBlockbrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);
//add Products
router.get("/addProduct",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductsOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.geteditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array('images',4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);
//banner management
router.get("/banner",adminAuth,bannerController.getBrannerPage);
router.get('/add-banner',adminAuth,bannerController.getAddBanner);
router.post('/add-banner',adminAuth,uploads.single('images'),bannerController.addBanner);
router.get('/deleteBanner',adminAuth,bannerController.deleteBanner);
//order managment 
router.get("/orders",adminAuth,orderController.getOrderList);
router.post('/update-status/:id',adminAuth,orderController.updateStatus);
//stock managment
router.get('/stock',adminAuth,stockController.getStockPage);
router.post('/update-stock',adminAuth,stockController.updateStock);

module.exports = router;
