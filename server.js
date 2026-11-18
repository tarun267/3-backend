
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const productRoutes = require("./routes/productRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

app.use(express.json());

// Database connection
connectDB();

// Home route
app.get("/", (req, res) => {
    res.send("Inventory Management System API is Running");
});

// Product routes
app.use("/api/products", productRoutes);

// 404 - Route not found
app.use((req, res, next) => {
    res.status(404);
    next(new Error("Route Not Found"));
});

// Centralized error handling
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});