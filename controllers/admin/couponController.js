const Coupons = require('../../models/couponSchema');
const User = require('../../models/userSchema');


const getCouponPage = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;


    const limit = 5;
    const skip = (page - 1) * limit;


    const totalCoupons = await Coupons.countDocuments();

    const allCoupons = await Coupons.find()
      .sort({ createdOn: -1 }) 
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCoupons / limit);

    res.render("coupons", {
      data: allCoupons,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.log("Error in loading Coupon page", error);
    res.status(500).send("Error loading coupons");
  }
};


const getaddCouponPage = async (req,res) => {
    try {
        res.render("add-coupon-page")
    } catch (error) {
        console.log("Error in loading Coupon page")
    }
    
}

const addCoupon = async (req,res) => {
    try {
        const {code,price,minimumAmount,maximumAmount,createdOn,endOn} = req.body;
        const CouponExisting = await Coupons.findOne({code :code.toUpperCase()});
        if (CouponExisting) {
            return res.status(400).json({ message: "This coupon already exists" }); 
          }
        
        const createdOnDate = new Date(createdOn);
        const endOnDate = new Date(endOn);
        const currentDate = new Date();

        const isActive = currentDate >= createdOnDate && currentDate <= endOnDate;

        const newCoupon = new Coupons({
            code:code.toUpperCase(),
            price,
            minimumAmount,  
            maximumAmount,
            createdOn,
            endOn,
            isActive
        })

        await newCoupon.save();
        return res.status(201).json({message:"Coupon Added Succesfully",isActive})

    } 
    catch (error) {
            console.error("Error adding coupon:", error);
            return res.status(500).json({ message: "An error occurred while adding the coupon. Please try again later." });
    }
}

const deleteCoupon = async (req, res) => {
    try {
      const couponId = req.query.id;
      if (!couponId) {
        return res.status(400).json({ message: 'Coupon ID is required' });
      }
      const coupon = await Coupons.findById(couponId);
      if(!coupon){
        return res.status(404).json({success:false,message:"Coupon not found"})
      }
      await User.updateMany(
        {redeemedcoupon:coupon.code},
        {$pull:{redeemedcoupon:coupon.code}}
      )

      const deletedCoupon = await Coupons.findByIdAndDelete(couponId);

      if (!deletedCoupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
  
      res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  };
  

module.exports = {
    getCouponPage,
    getaddCouponPage,
    addCoupon,
    deleteCoupon
}