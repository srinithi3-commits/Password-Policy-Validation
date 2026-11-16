
require("dotenv").config();

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");
        mongoose.disconnect();
    })
    .catch((error) => {
        console.log("MongoDB connection failed!");
        console.log(error.message);
    });
