const User = require("../../models/userSchema");
const mongoose = require("mongoose");
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

const loadDashboard = async (req,res) => {
    if(req.session.admin){
        try {
            res.render("dashboard");
        } catch (error) {
            res.redirect("/pageerror");
        }
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


