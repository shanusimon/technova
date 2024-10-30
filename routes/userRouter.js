const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const cartController = require("../controllers/user/cartController");
const productController = require("../controllers/user/productController");
const passport = require("passport");


router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.userData = req.session.userData || null;
    next();
  });
  
  
  

router.get('/pagenotFound',userController.pageNotfound);
router.get("/",userController.loadHomepage);
router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});

router.get('/userprofile',userController.getuserprofile);
router.post('/userprofile',userController.saveUserData);
router.get('/order-details',userController.orderProductDetails);
router.get('/sort',userController.sortProduct);
router.get("/forgot-password",userController.getForgotPassPage);
router.post("/forget-email-valid",userController.forgetEmailValid)



router.get('/add-address',userController.getAddAddress);
router.post('/add-address',userController.saveAddress)

router.get('/delete-address',userController.deleteAddress)

router.get('/login',userController.loadlogin);
router.post('/login',userController.login);

router.get("/logout",userController.logout)

router.get("/productDeatils",userController.viewProduct);

router.get('/cart',cartController.getCart)
router.post('/add-to-cart',cartController.saveToCart);

router.post('/update-cart-quantity',cartController.updateQuantity);
router.post('/remove-cart-item',cartController.removeFromCart);

router.get('/checkout',productController.getCheckOutPage);
router.post('/place-order',productController.placeOrder);



module.exports = router;