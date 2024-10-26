const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");


router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.userData = req.session.userData || null;
    next();
  });
  
router.use(express.static("public"));

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

router.get('/login',userController.loadlogin);
router.post('/login',userController.login);

router.get("/logout",userController.logout)
router.get("/productDeatils",userController.viewProduct);


module.exports = router;