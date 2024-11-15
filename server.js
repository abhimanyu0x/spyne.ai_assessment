import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import {DB_NAME} from "./src/utils/constants.js";
import connectDB from "./src/db_connection/connection.js";
import {app} from './app.js'

// Configure paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv with path
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug logs
console.log("Environment Check:");
console.log("PORT:", process.env.PORT);
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET exists:", !!process.env.CLOUDINARY_API_SECRET);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

connectDB()
.then(() => {
    const server = app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
        console.log('UNHANDLED REJECTION! 💥 Shutting down...');
        console.log(err.name, err.message);
        server.close(() => {
            process.exit(1);
        });
    });
})
.catch((err) => {
    console.log("MONGO db connection failed!!! ", err);
});