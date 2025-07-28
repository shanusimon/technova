const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

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

module.exports = {
  verifyOtp,
  resendOtp,
  loadlogin,
  login,
  logout,
  signup
};
