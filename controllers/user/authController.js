const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const bcrypt = require("bcrypt");

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
        referalCode: referal,
      });
      await newUser.save();
      req.session.userData = null;
      req.session.user = newUser;

      if (UserWithReferal) {
        let referUserWallet = await Wallet.findOne({
          userId: UserWithReferal._id,
        });
        if (!referUserWallet) {
          referUserWallet = new Wallet({
            userId: UserWithReferal._id,
            balance: 0,
          });
        }
        referUserWallet.balance += referCredit;
        referUserWallet.transactions.push({
          type: "credit",
          amount: referCredit,
          description: "Referral bonus for inviting a new user",
          orderId: null,
        });
        await referUserWallet.save();

        let newUserWallet = await Wallet.findOne({ userId: newUser._id });
        if (!newUserWallet) {
          newUserWallet = new Wallet({ userId: newUser._id, balance: 0 });
        }
        newUserWallet.balance += newUserCredit;
        newUserWallet.transactions.push({
          type: "credit",
          amount: newUserCredit,
          description: "Referral bonus for signing up with a referral code",
          orderId: null,
        });
        await newUserWallet.save();
      }

      res.json({ success: true, redirectUrl: "/" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again" });
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
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    console.log("Email sent response:", emailSent);

    if (emailSent) {
      console.log("Resend OTP:", otp);
      return res
        .status(200)
        .json({ success: true, message: "OTP Resent Successfully" });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error: Please try again.",
    });
  }
};

const loadlogin = async (req, res) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      if (user && user.isBlocked) {
        req.session.user = null;
        return res.render("login", { message: "User is blocked" });
      }
      return res.redirect("/");
    } else {
      return res.render("login", { message: "" });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });
    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }
    if (findUser.isBlocked == true) {
      return res.render("login", { message: "User is Blocked by Admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect Password" });
    }
    req.session.user = findUser;
    res.redirect("/");
  } catch (error) {
    console.log("Login error", error.message);
    res.render("login", { message: "login Failed Please try again later" });
  }
};

const logout = async (req, res) => {
  try {
    delete req.session.user;
    req.logout((err) => {
      if (err) {
        console.log("Passport logout error:", err);
        return res.redirect("/pageNotFound");
      }

      res.redirect("/login");
    });
  } catch (error) {
    console.log("Log out Error", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  verifyOtp,
  resendOtp,
  loadlogin,
  login,
  logout,
};
