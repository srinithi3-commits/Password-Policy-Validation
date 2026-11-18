
require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");

const User = require("./models/User");
const LoginHistory = require("./models/LoginHistory");

const app = express();

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "development-only-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 1000
    }
}));

const MAX_ATTEMPTS = 3;
const LOCK_TIME = 60 * 1000;

async function saveLoginHistory(email, status) {
    await LoginHistory.create({
        email: email,
        status: status
    });
}

app.use((req, res, next) => {
    if (req.path === "/dashboard.html" && !req.session.userId) {
        return res.redirect("/login.html");
    }
    next();
});

app.use(express.static(path.join(__dirname, "../frontend")));

// Registration
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Please enter all details."
        });
    }

    const uppercase = /[A-Z]/.test(password);
    const lowercase = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);
    const special = /[!@#$%^&*]/.test(password);
    const length = password.length >= 8;

    if (!(uppercase && lowercase && number && special && length)) {
        return res.status(400).json({
            message: "Invalid Password!"
        });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered!"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            password: hashedPassword,
            accountStatus: "Registration"
        });

        res.json({
            message: "Registration successful!"
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Registration failed!"
        });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Please enter email and password."
        });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            await saveLoginHistory(email, "Failed");

            return res.status(401).json({
                message: "Invalid email or password!"
            });
        }

        if (user.accountStatus === "Account Locked") {
            if (user.lockUntil && Date.now() < user.lockUntil.getTime()) {
                return res.status(403).json({
                    message: "Account Locked! Please try again after 1 minute."
                });
            }

            user.accountStatus = "Unlocked";
            user.failedAttempts = 0;
            user.lockUntil = null;

            await user.save();
            await saveLoginHistory(email, "Unlocked");
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            user.failedAttempts++;
            user.accountStatus = "Failed Attempt";

            if (user.failedAttempts >= MAX_ATTEMPTS) {
                user.accountStatus = "Account Locked";
                user.lockUntil = new Date(Date.now() + LOCK_TIME);

                await user.save();
                await saveLoginHistory(email, "Account Locked");

                return res.status(403).json({
                    message: "Account Locked! Please try again after 1 minute."
                });
            }

            await user.save();
            await saveLoginHistory(email, "Failed");

            return res.status(401).json({
                message: "Invalid email or password!"
            });
        }

        user.failedAttempts = 0;
        user.accountStatus = "Authenticated";
        user.lockUntil = null;

        await user.save();
        await saveLoginHistory(email, "Success");

        req.session.userId = user.email;

        res.json({
            message: "Login successful!"
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Login failed!"
        });
    }
});

// Login History
app.get("/history", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please login first."
        });
    }

    try {
        const history = await LoginHistory.find({
            email: req.session.userId
        }).sort({ time: -1 });

        res.json(history);

    } catch (error) {
        res.status(500).json({
            message: "Could not load history."
        });
    }
});

// Account Status
app.get("/account-status", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please login first."
        });
    }

    try {
        const user = await User.findOne({
            email: req.session.userId
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json({
            status: user.accountStatus
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not get account status."
        });
    }
});

// Logout
app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");

        res.json({
            message: "Logged out successfully!"
        });
    });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed!");
        console.log(error.message);
    });
