const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            if (user && !user.isBlocked) {
                return next(); 
            } else {
                return res.redirect("/login"); 
            }
        } else {
            return res.redirect("/login");
        }
    } catch (error) {
        console.log("Error in user auth middleware", error);
        res.status(500).send("Internal Server Error"); 
}
};


const adminAuth = async (req, res, next) => {
    try {
        const admin = await User.findOne({ isAdmin: true });
        if (admin) {
            return next();
        } else {
            return res.redirect('/admin/login'); 
        }
    } catch (error) {
        console.log("Error in adminAuth Middleware", error);
        res.status(500).send("Internal Server Error"); 
    }
};

module.exports = {
    userAuth,
    adminAuth
};
