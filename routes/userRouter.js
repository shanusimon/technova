const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const cartController = require("../controllers/user/cartController");
const productController = require("../controllers/user/productController");
const profileController = require("../controllers/user/profileController");
const wishlistController = require("../controllers/user/wishListController");
const couponController = require("../controllers/user/couponController");
const paymentController = require("../controllers/user/paymentController");
const walletController = require("../controllers/user/walletController");
const searchController = require("../controllers/user/searchController");
const passport = require("passport");
const User = require("../models/userSchema");
const Category = require("../models/categorySchema");
const sessionUserAlias = require("../middlewares/sessionUserAlias")
const addressController = require("../controllers/user/addressController");
const orderController = require("../controllers/user/orderController")
const authController = require("../controllers/user/authController");

router.use(sessionUserAlias);
router.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.userData = req.session.userData || null;
  next();
});

router.use(async (req, res, next) => {
  if (req.path === "/login") {
    return next();
  }

  if (req.session.user) {
    const user = await User.findById(req.session.user);
    if (user && user.isBlocked) {
      return res.redirect("/login");
    } else if (user) {
      return next();
    }
  }
  next();
});

router.use(async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.log("Error Fetching Categories:", error.message);
    next();
  }
});


router.get("/about", (req, res) => {
  return res.render("aboutUs");
});

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
     console.log("✅ Google Login Success: ", req.user);
    res.redirect("/");
  }
);

router.get("/", userController.loadHomepage);
router.get("/pagenotFound", userController.pageNotfound);
router.get("/shop", userController.loadShop);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);

router.get("/userprofile", userController.getuserprofile);
router.post("/userprofile", userController.saveUserData);
router.get("/order-details", orderController.orderProductDetails);
router.post("/order-cancel", orderController.cancelOrder);
router.get("/sort", orderController.sortProduct);
router.post("/return-request", orderController.returnOrder);

//profile managment
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forget-email-valid", profileController.forgetEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgetPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);

//address routes
router.get("/add-address", addressController.getAddAddress);
router.post("/add-address", addressController.saveAddress);
router.get("/edit-address", addressController.getEditAddress);
router.post("/save-address", addressController.saveEditAddress);
router.get("/delete-address", addressController.deleteAddress);

router.get("/login", authController.loadlogin);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.get("/productDeatils", userController.viewProduct);
router.get("/cart", cartController.getCart);
router.post("/add-to-cart", cartController.saveToCart);
router.post("/update-cart-quantity", cartController.updateQuantity);
router.post("/remove-cart-item", cartController.removeFromCart);

router.get("/checkout", productController.getCheckOutPage);
router.post("/place-order", orderController.placeOrder);
router.get("/payment-successful", productController.getSuccesspage);
router.get("/payment-failed", productController.paymentFailedPage);
router.get("/download-invoice", productController.invoiceDownload);

//wishlist
router.get("/get-wishlist", wishlistController.getWishlist);
router.post("/add-to-wishlist", wishlistController.addProductToWishlist);
router.post("/remove-wishlist-item", wishlistController.removeFromWishlist);
router.post("/wishlist-addToCart", wishlistController.saveToCartFromWishlist);

//coupon
router.post("/applyCoupon", couponController.applyCoupon);
router.post("/removeCoupon", couponController.removeCoupon);
router.get("/available-coupons", couponController.getAvailableCoupons);

//payment
router.post("/create-order", paymentController.createRazorpay);
router.post("/update-order", paymentController.updateOrder);
router.get("/retry-payment", paymentController.retryPayment);

//wallet
router.get("/wallet", walletController.getWalletInfo);

//search
router.get("/search", searchController.searchControl);
router.get("/filter-by-category", searchController.filterCategory);

router.patch(`/mark-notification-read`, userController.updateNotification);

module.exports = router;
