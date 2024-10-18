const User = require("../../models/userSchema");



const loadHomepage = async (req,res) => {
    try {
        return res.render("home")
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

const signup = async (req,res) => {
    const {name,email,phone,password} = req.body;
    try {
        const newUser = new User({name,email,phone,password});
        await newUser.save();
        return res.redirect('/signup')
    } catch (error) {
        console.log("Signup registeration failed",error);
        res.status(500).send("Server Error");
    }
     
}

module.exports ={
    loadHomepage,
    pageNotfound,
    loadSignup,
    signup
}
    