const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");


const loadHomepage = async (req,res) => {
    try {
        const user = req.session.user;
        if(user){
            const userData = await User.findOne({_id:user._id});
            res.render("home",{user:userData})
        }else{
            return res.render("home");
        }
    } catch (error) {
        console.log("Home Page Not found",error.message);
        res.status(500).send("server error");
    }
}

const pageNotfound = async (req,res) => {
    try {
        return res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
    
}

const loadSignup = async (req,res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("Home page not Loading",error);
        res.status(500).send("Server Error");
    }
    
}

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service :"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your Account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP: ${otp}</b>`,
        })
        return info.accepted.length > 0

    } catch (error) {
        console.log("Error sending email",error);
        return false;
    }
}

const signup = async (req, res) => {
  try {
    const { username, phone, email, password, cpassword } = req.body;

    if (password != cpassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    console.log(findUser)
    if(findUser){
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();
    console.log(email)
    const emailSent = await sendVerificationEmail(email, otp);
    console.log("otp generated")

    if(!emailSent) {
      return res.json("email-error");
    }
    console.log("User Data to store in session:", { username, phone, email, password })

    req.session.userOtp = otp;
    req.session.userData = { username, phone, email, password };


    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("Signup eror", error);
    res.redirect("/pageNotFound");
  }
};


const securePassword = async(password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash
    } catch (error) {
        
    }
    
}

const verifyOtp = async (req,res) => {
    try {
        const {otp} = req.body;
        // console.log(otp)
        if(otp===req.session.userOtp){
            const user = req.session.userData; 
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                username:user.username,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })
            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
        }
    } catch (error) {
        console.error("Error Verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
    }
}

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp; 

        const emailSent = await sendVerificationEmail(email, otp);
        console.log("Email sent response:", emailSent);

        if (emailSent) {
            console.log("Resend OTP:", otp);
            return res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error: Please try again." });
    }
};

const loadlogin = async (req,res) => {
    try {
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
    
}
const login = async (req,res) => {
    try {
        const {email,password} = req.body;
        const findUser = await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is Blocked by Admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user = findUser;
        res.redirect("/")
    } catch (error) {
        console.log("Login error",error.message);
        res.render("login",{message:"login Failed Please try again later"});
    }
}

const logout = async (req,res) => {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destroy Error",err)
                return res.redirect("/pageNotFound")
            }else{
                res.redirect("/login")
            }
        })
    } catch (error) {
        console.log("Log out Error",error);
        res.redirect('/pageNotFound');
    }
}

module.exports ={
    loadHomepage,
    pageNotfound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout
}
    