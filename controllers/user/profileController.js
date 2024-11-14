const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require('dotenv').config;
const session = require("express-session");
const passport = require("passport");

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash
    } catch (error) {
        
    }
    
}

const verifyForgetPassOtp = async (req,res) => {
    try {
      const enteredOtp = req.body.otp;
      if(enteredOtp === req.session.userOtp){
        res.json({success:true,redirectUrl:"/reset-password"});
      }else{
        res.json({success:false,message:"OTP not working"})
      }
    } catch (error) {
      res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
    
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
            subject:"Your otp for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP: ${otp}</b>`,
        })
        return info.accepted.length > 0

    } catch (error) {
        console.log("Error sending email",error);
        return false;
    }
}



const getForgotPassPage = async (req,res) => {
    try {
        res.render("forgot-password");
        
    } catch (error) {
        res.render("page-404")
    }
}

const forgetEmailValid = async (req,res) => {
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log(`otp :${otp}`)
            }else{
                res.json({success:false,message:"Failed to send OTP.please try again"});
            }
        }else{
            res.render('forget-password',{
                message:`User with this email does not exists`
            });
        }
    } catch (error) {
        res.redirect("/pagenotFound");
        
    }
    
}

const getResetPassPage = async (req,res) => {
    try {
        res.render("reset-password");
    } catch (error) {
        rees.redirect("/pageNotFound")
        
    }
}


const resendOtp= async (req,res) => {
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        const emailSent = await sendVerificationEmail(email,otp);
        console.log(emailSent)
        if(emailSent){
            console.log(`Resent OTP: ${otp}`);
            res.status(200).json({success:true,message:"Resend OTP Succesfully"}) 
        }
        
    } catch (error) {
        console.log("Error  in resenting OTP");
        res.status(500).json({success:false,message:"Internal Server Error"});     
    }
}

const postNewPassword = async (req,res) => {
    try {
        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login");
        }else{
            res.render('reset-password',{messgae:"Password do not match"});
        }

    } catch (error) {
        res.redirect("/pageNotFound");
        
    }
    
}

module.exports ={
    getForgotPassPage,
    forgetEmailValid,
    getResetPassPage,
    verifyForgetPassOtp,
    resendOtp,
    postNewPassword
}