
const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },

    status: {
        type: String,
        required: true
    },

    time: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
