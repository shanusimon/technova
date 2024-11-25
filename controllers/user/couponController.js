const { CURSOR_FLAGS } = require("mongodb");
const Coupons = require("../../models/couponSchema");
const User = require("../../models/userSchema");



const getAvailableCoupons = async (req,res) => {
    try {
        const userData = req.session.user;
        const coupons = await Coupons.find();

        const redeemedCoupons = userData.redeemedcoupon; 
        const Notusedcoupon = coupons.filter(coupon => !redeemedCoupons.includes(coupon.code)); 

        return res.render('available-coupons',{coupons:Notusedcoupon})
    } catch (error) {
        console.log("Error in loading available coupon page")   
    }
}

const applyCoupon = async (req,res) => {
    try {
        const {couponCode,totalPrice} = req.body;
        console.log(couponCode,totalPrice)
        console.log("Apply coupon")
        const currentDate = new Date();
        const userId = req.session.user._id;
        const userData = await User.findOne({_id:userId});
        if (userData.redeemedcoupon.includes(couponCode)){
            return res.status(400).json({
                message: 'Coupon used by User',
                success: false,
            });
        }        
        const coupon = await Coupons.findOne({
            code:couponCode,
            isActive:true,
            createdOn:{$lte:currentDate},
            endOn:{$gte:currentDate}
        });
        let discount = 0;
        if(coupon){
            if(totalPrice >= coupon.minimumAmount && totalPrice <= coupon.maximumAmount){
                discount =coupon.price;
            }else{
                return res.status(400).json({message:`Minimum purchase amount is ${coupon.minimumAmount} and maximum purchase amount is ${coupon.maximumAmount}`})
            }
        }else{
            return res.status(400).json({message:"Invalid coupon code or coupon is not valid"})
        }

        const discountAmount = (discount/100) * totalPrice;
        const newSubtotal = totalPrice - discountAmount; 



        return res.json({
            newSubtotal:newSubtotal.toFixed(2),
            discountAmount
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred while applying the coupon.' });
    }
}

const removeCoupon = async (req,res) => {
    try {
        const {originalPrice}= req.body;
        const subtotal = parseFloat(originalPrice);
        console.log(`s total is ${subtotal}`)

        return res.status(200).json({
            success:true,
            subtotal:subtotal,
            message: 'Coupon removed successfully'
        })
    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to remove coupon'
        });
    }   
}

module.exports = {
    applyCoupon,
    removeCoupon,
    getAvailableCoupons
}