const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminControllers");
const {userAuth,adminAuth} = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerControllers")
const categoryController = require("../controllers/admin/categoryController");
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


module.exports = router;
