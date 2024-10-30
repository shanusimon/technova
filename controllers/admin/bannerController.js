const Banner = require("../../models/bannerSchema");


const getBrannerPage = async (req,res) => {
    try {
        const banner = await Banner.find({});
        res.render("banner",{
            data:banner
        })
    } catch (error) {
        
    }
    
}

const getAddBanner = async (req,res) => {
    try {
        res.render('add-banner');
    } catch (error) {
        
    }
    
}

const addBanner = async (req, res) => {
    try {
        console.log("banner")
        const data = req.body;
        const image = req.file;

        if (!image) {
            console.log("Image file is missing");
            return res.redirect("/admin/pageerror");
        }

        const newBanner = new Banner({
            image: image.filename,  // Ensure this field matches your schema
            title: data.title,
            description: data.description,
            startDate: new Date(data.startDate + "T00:00:00"),
            endDate: new Date(data.endDate + "T00:00:00"),
            link: data.link,
        });

        await newBanner.save()
            .then((savedData) => console.log("Banner saved:", savedData))
            .catch((err) => console.error("Error saving banner:", err));

        res.redirect("/admin/banner");
    } catch (error) {
        console.error("An error occurred:", error); 
        res.redirect("/admin/pageerror");
    }
};

const deleteBanner = async (req,res) => {
    try {
        const bannerId = req.query.id;
        await Banner.findByIdAndDelete(bannerId);
        res.redirect("/admin/banner");
    } catch (error) {
        console.error("An error occurred:", error); 
        res.redirect("/admin/pageerror");
    }
    
}

module.exports={
    getBrannerPage,
    getAddBanner,
    addBanner,
    addBanner,
    deleteBanner
}