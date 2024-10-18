const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController")



router.get('/pagenotFound',userController.pageNotfound);
router.get("/",userController.loadHomepage);
router.get('/signup',userController.loadSignup);
router.post("/signup",userController.signup)

module.exports = router;