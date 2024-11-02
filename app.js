const express = require('express');
const app = express();
const env = require('dotenv').config();
const passport = require("./config/passport");
const db = require("./config/db");
const path = require("path");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const session = require('express-session');

// Connect to the database
db();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Disable caching
app.use((req, res, next) => {
    res.set('cache-control', 'no-store');
    next();
});

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set("view engine", "ejs");
app.set("views", [
    path.join(__dirname, 'views/user'),
    path.join(__dirname, 'views/admin')
]);



// Route definitions
app.use("/", userRouter);
app.use('/admin', adminRouter);



// Start the server
app.listen(process.env.PORT, () => {
    console.log("Server is Running on port " + process.env.PORT);
});

module.exports = app;
