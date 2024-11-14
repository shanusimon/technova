const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Banner = require("../../models/bannerSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const { get } = require("../../routes/userRouter");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");


const loadHomepage = async (req,res) => {
    try {
        const today = new Date().toISOString();
        const user = req.session.user;
        const banner = await Banner.find({
            startDate:{$lt:new Date(today)},
            endDate:{$gt:new Date(today)}
        })
        const categories = await Category.find({isListed:true});
        let productData = await Product.find({isBlocked:false,
            category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
        });
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
        productData = productData.slice(0);

        if(user){
            const userData = await User.findOne({_id:user._id});
            res.render("home",{
                user:userData,
                products:productData,
                banner:banner || []
            })
        }else{
            return res.render("home",{
                products:productData,
                banner:banner || [],
            });
        }
    } catch (error) {
        console.log("Home Page Not found",error.message);
        res.status(500).send("server error");
    }
}


const cancelOrder = async (req,res) => {
    try {
        const userId = req.session.user._id
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId);
        if(orderData.paymentMethod==="COD"){
            await Order.findByIdAndUpdate(orderId,{status:"Cancelled"});
            return res.redirect("/userprofile");
        }else if(orderData.paymentMethod==="Online"){
            console.log(`the wallet data is ${orderData}`)
            const amount = orderData.finalAmount;

            const walletData = {
                    $inc:{balance:amount},
                    $push:{
                        transactions:{
                            type:'refund',
                            amount,
                            orderId
                        }
                    }
                }
            console.log(`the wallet data is ${walletData}`)
            const walletUpdate = await Wallet.findOneAndUpdate(
                {userId:userId},
                walletData,
                {upsert:true,new:true}
            )

            if(!walletUpdate){
                throw new Error("Failed to update Wallet");
            }else{
                await Order.findByIdAndUpdate(orderId,{status:"Cancelled"});
            }
        }
        return res.redirect('/userprofile');

    } catch (error) {
        console.log("Error in canceling order");
        res.redirect('pagenotFound')
    }
    
}

const returnOrder = async (req, res) => {
    try {
        const orderId = req.query.id;
        const userId = req.session.user._id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const amount = order.finalAmount;

        const walletData = {
            $inc: { balance: amount },
            $push: {
                transactions: {
                    type: 'Refund',
                    amount,
                    orderId,
                    description: "Refund for your returned product"
                }
            }
        };

        const walletUpdate = await Wallet.findOneAndUpdate(
            { userId: userId },
            walletData,
            { upsert: true, new: true }
        );

        if(!walletUpdate){
            throw new Error("Failed to update Wallet");
        }else{
            await Order.findByIdAndUpdate(orderId,{status:"Cancelled"});
        }

        res.status(200).json({success:true, message: "Order returned successfully, amount refunded to wallet" });

    } catch (error) {
        console.error("Error in returnOrder:", error);
        res.status(500).json({success:false, message: "An error occurred while processing the return" });
    }
};


const sortProduct = async (req,res) => {
    try {
        const sortOption = req.query.sort || 'default';

        let sortCriteria;

        switch(sortOption){
            case 'popularity':
            sortCriteria = {popularity:-1};
            break;
            case 'price-low-high':
            sortCriteria = {salePrice:1};
            break;
            case 'price-high-low':
            sortCriteria = {salePrice:-1};
            break;
            case 'rating':
            sortCriteria = {rating:-1};
            break;
            case 'new-arrivals':
            sortCriteria = {createdAt:-1};
            break;
            case 'alphabetical-a-z':
            sortCriteria = {productName:1};
            break;
            case 'alphabetical-z-a':
            sortCriteria = {productName:-1};
            break;
            default:
                sortCriteria ={createdAt:-1};
        }

        const products = await Product.find().sort(sortCriteria)
        res.json({products})
    } catch (error) {
        
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
    const { username, phone, email, password, cpassword,referral_code} = req.body;

    if (password != cpassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    console.log(findUser)
    if(findUser){
      return res.render("signup", {
        message: "User with this email already exists",
      })
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
    req.session.userData = { username, phone, email, password,referral_code };


    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("Signup eror", error);
    res.redirect("/pageNotFound");
  }
}


const securePassword = async(password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash
    } catch (error) {
        
    }
    
}


const generateCoupon = (length)=>{
    let result = "";
    const charcters = "abcdef0123456789";

    for(let i = 0; i< length;i++){
        result += charcters[Math.floor(Math.random()*charcters.length)]
    }

    return result;
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            const referal = generateCoupon(5);
            const referCredit = 200;
            const newUserCredit = 100;

            const referCode = user.referral_code;
            const UserWithReferal = await User.findOne({ referalCode: referCode });
            
            const newUser = new User({
                username: user.username,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                referalCode: referal
            });
            await newUser.save();
            req.session.userData = null;
            req.session.user = newUser;

            if (UserWithReferal) {
                let referUserWallet = await Wallet.findOne({ userId: UserWithReferal._id });
                if (!referUserWallet) {
                    referUserWallet = new Wallet({ userId: UserWithReferal._id, balance: 0 });
                }
                referUserWallet.balance += referCredit;
                referUserWallet.transactions.push({
                    type: 'credit',
                    amount: referCredit,
                    description: 'Referral bonus for inviting a new user',
                    orderId: null 
                });
                await referUserWallet.save();

                let newUserWallet = await Wallet.findOne({ userId: newUser._id });
                if (!newUserWallet) {
                    newUserWallet = new Wallet({ userId: newUser._id, balance: 0 });
                }
                newUserWallet.balance += newUserCredit;
                newUserWallet.transactions.push({
                    type: 'credit',
                    amount: newUserCredit,
                    description: 'Referral bonus for signing up with a referral code',
                    orderId: null
                });
                await newUserWallet.save();
            }

            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


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
}


const loadlogin = async (req,res) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            if (user && user.isBlocked) {
              req.session.user = null;
              return res.render("login", { message: "User is blocked" });
            }
            return res.redirect("/");
          } else {
            return res.render("login", { message: '' });
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
        if(findUser.isBlocked==true){
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
        req.session.user = null;
        res.redirect('/login');
    } catch (error) {
        console.log("Log out Error",error);
        res.redirect('/pageNotFound');
    }
}


const viewProduct = async (req,res) => {
    try {
        const productID = req.query.id;
        const productData = await Product.findOne({_id:productID});
        const category = await Category.findOne({_id:productData.category}) 
        res.render("productview-page",{
            product:productData,
            cat:category
        })
    } catch (error) {
        
    }    
}


const getuserprofile = async (req,res) => {
    try {
        if(req.session.user){
            const userId = req.session.user._id;
            const user = await User.findById(userId);
            const addressDoc = await Address.findOne({userId});
            const orders = await Order.find({ user: userId })
            .populate('orderedItems.product')
            .sort({ creaetedOn: -1 });
   
            if (!user) {
                return res.redirect('/');
            }
    
            const successmessage = req.query.success === 'true' ?"Profile updated SuccessFully":null;
            const addresses = addressDoc ? addressDoc.addresses : []; 
    
            res.render('userprofile',{
                user:user,
                successmessage:successmessage,
                addresses:addresses,
                orders:orders
            });
        }else{
            res.redirect('/')
        }

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Server error');
    }
    
}


const saveUserData = async (req,res) => {
    try {
        const {name,phone} = req.body;
        const userId = req.query.id;
        await User.findOneAndUpdate({_id:userId},{username:name,phone:phone},{new:true});
        res.redirect(`/userprofile?id=${userId}&success=true`);
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).send('Server error');
    }
    
}


const getAddAddress = async (req,res) => {
    try {
        const user = req.session.user;
        if(!user){
            res.render('login')
        }else{
            res.render("add-address",{user})
        }
    
    } catch (error) {
        
    }
}


const saveEditAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId } = req.body;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        const updatedAddress = {
            addressType,
            name,
            state,
            city,
            landMark,
            pincode,
            phone,
            altPhone,
        };

        let addressDoc = await Address.findOne({ userId: userId });

        if (addressDoc) {
            if (addressId) {
                const addressIndex = addressDoc.addresses.findIndex(addr => addr._id.toString() === addressId);
                if (addressIndex !== -1) {
                    addressDoc.addresses[addressIndex] = { ...addressDoc.addresses[addressIndex], ...updatedAddress };
                } else {
                    return res.status(404).json({ message: "Address not found" });
                }
            } else {
                addressDoc.addresses.push(updatedAddress);
            }
            await addressDoc.save();
            res.status(200).json({ message: "Address saved successfully", address: addressDoc });
        } else {
            addressDoc = new Address({
                userId: userId,
                addresses: [updatedAddress],
            });
            await addressDoc.save();
            res.status(201).json({ message: "Address saved successfully", address: addressDoc });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving address" });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const addressId = req.query.id; 

        if (!addressId) {
            console.error("No address ID provided in request");
            return res.status(400).send("Address ID is required");
        }


        const updatedAddress = await Address.findOneAndUpdate(
            { userId: userId },
            { $pull: { addresses: { _id: addressId } } },
            { new: true }
        );

        if (!updatedAddress) {
            console.error("Address not found or already deleted");
            return res.status(404).send("Address not found");
        }
        res.redirect('/userprofile');
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).send("Error deleting address");
    }
}


const orderProductDetails = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findById(orderId)
            .populate({
                path: 'orderedItems.product',  
                model: 'Product',              
                select: 'productName productImage salePrice' 
            })
            .populate('address'); 
            
        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        res.render('order-details', {
            order: order
        });

    } catch (error) {
        console.log("Order Product Details Error:", error.message);
        res.status(500).render('error', { message: 'Error fetching order details' });
    }
}



const getEditAddress = async (req,res) => {
    try {
        const addressId = req.query.id;
        const userId = req.session.user._id;
        if(!userId){
            res.redirect('/login');
        }
        const addressDoc = await Address.findOne({userId:userId});
        if(addressDoc){
        const  address = addressDoc.addresses.find(addr=>addr._id.toString()===addressId);
            if(address){
                res.render('edit-address',{
                    address
                })
            }else{
                res.status(404).send("Address Not Found");
            }
        }else{
            res.status(404).send("Address Not Found");
        }
    } catch (error) {
        console.log("Error rendering on Edit address page",error);
        res.redirect("/pagenotFound");
    }
    
}


const saveAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        const newAddress = {
            addressType,
            name,
            state,
            city,
            landMark,
            pincode,
            phone,
            altPhone,
        };
        let addressDoc = await Address.findOne({ userId: userId });

        if (addressDoc) {
            addressDoc.addresses.push(newAddress);
            await addressDoc.save();
        } else {
            addressDoc = new Address({
                userId: userId,
                addresses: [newAddress],
            });
            await addressDoc.save();
        }
        res.redirect('/userprofile');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving address" });
    }
};


module.exports ={
    loadHomepage,
    pageNotfound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout,
    viewProduct,
    getuserprofile,
    saveUserData,
    getAddAddress,
    saveAddress,
    deleteAddress,
    orderProductDetails,
    sortProduct,
    cancelOrder,
    getEditAddress,
    saveEditAddress,
    returnOrder
}
    