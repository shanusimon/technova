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

module.exports ={
    loadHomepage,
    pageNotfound
}
    