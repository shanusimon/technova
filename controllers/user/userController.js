const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Banner = require("../../models/bannerSchema");
const { get } = require("../../routes/userRouter");
const Order = require("../../models/orderSchema");
const Notification = require("../../models/notificationSchema");
const StatusCodes = require("../../constants/statuscode");

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
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("server error");
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
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("server error");
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
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server Error");
  }
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
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server error");
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
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const updateNotification = async (req, res) => {
  try {
    const notificationId = req.query.id;
    console.log(notificationId);
    await Notification.findByIdAndUpdate(notificationId, { status: "read" });
    res.status(StatusCodes.OK).send({ success: true });
  } catch (error) {
    console.error("Error updating notification status:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ success: false, error: error.message });
  }
};

module.exports = {
  updateNotification,
  loadHomepage,
  pageNotfound,
  loadSignup,
  viewProduct,
  getuserprofile,
  saveUserData,
  loadShop,
};