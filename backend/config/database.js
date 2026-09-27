// ==========================================
// LINKLESS - DATABASE CONNECTION
// ==========================================



const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

dotenv.config({
    path: path.join(__dirname, "../../.env")
});

// ==========================================
// CONNECT TO MONGODB
// ==========================================

async function connectDatabase() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is missing from .env file."
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected successfully!"
        );

    } catch (error) {
        console.error(
            "MongoDB connection failed:"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
}

module.exports = connectDatabase;