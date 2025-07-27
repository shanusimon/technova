const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Banner = require("../../models/bannerSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { get } = require("../../routes/userRouter");
const Order = require("../../models/orderSchema");
const Notification = require("../../models/notificationSchema");

const loadHomepage = async (req, res) => {
  try {
    const today = new Date().toISOString();
    const user = req.session.user;
    const banner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
    });
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
    });
    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    let notifications = [];

    if (user) {
      const userData = await User.findOne({ _id: user._id });

      notifications = await Notification.find({
        userId: user._id,
        status: "unread",
      });
      console.log("This is session", req.session.user);

      res.render("home", {
        user: userData,
        products: productData,
        banner: banner || [],
        notifications: notifications || [],
      });
    } else {
      res.render("home", {
        products: productData,
        banner: banner || [],
        notifications: notifications,
      });
    }
  } catch (error) {
    console.log("Home Page Not found", error.message);
    res.status(500).send("server error");
  }
};
const loadShop = async (req, res) => {
  try {
    const user = req.session.user;

    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
    });
    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    let notifications = [];

    if (user) {
      const userData = await User.findOne({ _id: user._id });

      notifications = await Notification.find({
        userId: user._id,
        status: "unread",
      });

      res.render("shop", {
        user: userData,
        products: productData,
        notifications: notifications || [],
      });
    } else {
      res.render("shop", {
        products: productData,
        notifications: notifications,
      });
    }
  } catch (error) {
    console.log("Home Page Not found", error.message);
    res.status(500).send("server error");
  }
};

const pageNotfound = async (req, res) => {
  try {
    return res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("Home page not Loading", error);
    res.status(500).send("Server Error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your Account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { username, phone, email, password, cpassword, referral_code } =
      req.body;

    if (password != cpassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    console.log(findUser);
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();
    console.log(email);
    const emailSent = await sendVerificationEmail(email, otp);
    console.log("otp generated");

    if (!emailSent) {
      return res.json("email-error");
    }
    console.log("User Data to store in session:", {
      username,
      phone,
      email,
      password,
    });

    req.session.userOtp = otp;
    req.session.userData = { username, phone, email, password, referral_code };

    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("Signup eror", error);
    res.redirect("/pageNotFound");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const generateCoupon = (length) => {
  let result = "";
  const charcters = "abcdef0123456789";

  for (let i = 0; i < length; i++) {
    result += charcters[Math.floor(Math.random() * charcters.length)];
  }

  return result;
};

const viewProduct = async (req, res) => {
  try {
    const productID = req.query.id;
    const productData = await Product.findOne({ _id: productID });
    const category = await Category.findOne({ _id: productData.category });
    res.render("productview-page", {
      product: productData,
      cat: category,
    });
  } catch (error) {}
};

const getuserprofile = async (req, res) => {
  try {
    if (req.session.user) {
      const userId = req.session.user._id;
      const user = await User.findById(userId);
      const addressDoc = await Address.findOne({ userId });

      const page = parseInt(req.query.page) || 1;
      const activeTab = req.query.tab || "dashboard";
      const limit = 7;
      const skip = (page - 1) * limit;
      const [orders, totalOrders] = await Promise.all([
        Order.find({ user: userId })
          .populate("orderedItems.product")
          .sort({ createdOn: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments({ user: userId }),
      ]);
      const totalPages = Math.ceil(totalOrders / limit);
      if (!user) {
        return res.redirect("/");
      }

      const successmessage =
        req.query.success === "true" ? "Profile updated SuccessFully" : null;
      const addresses = addressDoc ? addressDoc.addresses : [];

      res.render("userprofile", {
        user: user,
        successmessage: successmessage,
        addresses: addresses,
        orders,
        currentPage: page,
        totalPages,
        activeTab,
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Server error");
  }
};

const saveUserData = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.query.id;
    await User.findOneAndUpdate(
      { _id: userId },
      { username: name, phone: phone },
      { new: true }
    );
    res.redirect(`/userprofile?id=${userId}&success=true`);
  } catch (error) {
    console.error("Error saving user data:", error);
    res.status(500).send("Server error");
  }
};

const updateNotification = async (req, res) => {
  try {
    const notificationId = req.query.id;
    console.log(notificationId);
    await Notification.findByIdAndUpdate(notificationId, { status: "read" });
    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error updating notification status:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  updateNotification,
  loadHomepage,
  pageNotfound,
  loadSignup,
  signup,
  viewProduct,
  getuserprofile,
  saveUserData,
  loadShop,
};
