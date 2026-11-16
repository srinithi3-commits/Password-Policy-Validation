
    const express = require("express");
    const bcrypt = require("bcrypt");
    const session = require("express-session");
    const fs = require("fs");
    const path = require("path");

    const app = express();

    app.use(express.json());

    app.use(session({
        secret: "my-project-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 30 * 60 * 1000
        }
    }));

    const usersFile = path.join(__dirname, "../data/users.json");
    const historyFile = path.join(__dirname, "../data/loginHistory.json");

    let loginAttempts = {};
    let accountStates = {};
    let lockUntil = {};

    const MAX_ATTEMPTS = 3;
    const LOCK_TIME = 60 * 1000; // 1 minute

    function saveLoginHistory(email, status) {
        const history = JSON.parse(fs.readFileSync(historyFile, "utf8"));

        history.push({
            email: email,
            status: status,
            time: new Date().toLocaleString()
        });

        fs.writeFileSync(historyFile, JSON.stringify(history, null, 4));
    }

    // Protect dashboard page
    app.use((req, res, next) => {
        if (req.path === "/dashboard.html" && !req.session.userId) {
            return res.redirect("/login.html");
        }
        next();
    });

    app.use(express.static("frontend"));

    // Registration
    app.post("/register", async (req, res) => {
        const { username, email, password } = req.body;

        const uppercase = /[A-Z]/.test(password || "");
        const lowercase = /[a-z]/.test(password || "");
        const number = /[0-9]/.test(password || "");
        const special = /[!@#$%^&*]/.test(password || "");
        const length = (password || "").length >= 8;

        if (!username || !email) {
            return res.status(400).json({
                message: "Please enter username and email."
            });
        }

        if (!(uppercase && lowercase && number && special && length)) {
            return res.status(400).json({
                message: "Invalid Password!"
            });
        }

        try {
            const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));

            if (users.find(user => user.email === email)) {
                return res.status(400).json({
                    message: "Email already registered!"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            users.push({
                username,
                email,
                password: hashedPassword
            });

            fs.writeFileSync(usersFile, JSON.stringify(users, null, 4));

            res.json({
                message: "Registration successful!"
            });

        } catch (error) {
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
            const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
            const user = users.find(user => user.email === email);

            if (!loginAttempts[email]) {
                loginAttempts[email] = 0;
            }

            // Check whether the account is locked
            if (accountStates[email] === "Account Locked") {

                // Still within the lock period
                if (Date.now() < lockUntil[email]) {
                    return res.status(403).json({
                        message: "Account Locked! Please try again after 1 minute."
                    });
                }

                // Lock period is over: unlock the account
                accountStates[email] = "Unlocked";
                loginAttempts[email] = 0;
                delete lockUntil[email];

                saveLoginHistory(email, "Unlocked");
            }

            // Lock account after maximum failed attempts
            if (loginAttempts[email] >= MAX_ATTEMPTS) {
                accountStates[email] = "Account Locked";
                lockUntil[email] = Date.now() + LOCK_TIME;

                saveLoginHistory(email, "Account Locked");

                return res.status(403).json({
                    message: "Account Locked! Please try again after 1 minute."
                });
            }

            if (!user) {
                loginAttempts[email]++;
                accountStates[email] = "Failed Attempt";
                saveLoginHistory(email, "Failed");

                return res.status(401).json({
                    message: "Invalid email or password!"
                });
            }

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                loginAttempts[email]++;
                accountStates[email] = "Failed Attempt";
                saveLoginHistory(email, "Failed");

                return res.status(401).json({
                    message: "Invalid email or password!"
                });
            }

            // Successful login
            loginAttempts[email] = 0;
            req.session.userId = user.email;
            accountStates[email] = "Authenticated";

            saveLoginHistory(email, "Success");

            res.json({
                message: "Login successful!"
            });

        } catch (error) {
            res.status(500).json({
                message: "Login failed!"
            });
        }
    });

    // Login History
    app.get("/history", (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const history = JSON.parse(fs.readFileSync(historyFile, "utf8"));

        res.json(history.filter(item => item.email === req.session.userId));
    });

    // Account Status
    app.get("/account-status", (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const email = req.session.userId;

        res.json({
            status: accountStates[email] || "Authenticated"
        });
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

    const PORT = 5000;

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
