
const Product = require("../models/Products");

// 1. CREATE PRODUCT
const createProduct = async (req, res) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// 2. GET ALL PRODUCTS (FILTER, SORT, PAGINATION)
const getProducts = async (req, res) => {
    try {
        const {
            category,
            brand,
            minPrice,
            maxPrice,
            search,
            sort = "createdAt",
            page = 1,
            limit = 10
        } = req.query;

        const filter = {};

        if (category) filter.category = category;
        if (brand) filter.brand = brand;

        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (search) {
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            filter.$or = [
                { name: { $regex: safeSearch, $options: "i" } },
                { sku: { $regex: safeSearch, $options: "i" } }
            ];
        }

        const allowedSortFields = [
            "name", "price", "quantity", "createdAt"
        ];

        const sortField = sort.startsWith("-")
            ? sort.substring(1)
            : sort;

        if (!allowedSortFields.includes(sortField)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort field"
            });
        }

        const sortOrder = sort.startsWith("-") ? -1 : 1;

        const currentPage = Math.max(1, Number(page));
        const pageLimit = Math.min(100, Math.max(1, Number(limit)));

        const products = await Product.find(filter)
            .sort({ [sortField]: sortOrder })
            .skip((currentPage - 1) * pageLimit)
            .limit(pageLimit);

        const totalProducts = await Product.countDocuments(filter);

        res.status(200).json({
            success: true,
            totalProducts,
            currentPage,
            totalPages: Math.ceil(totalProducts / pageLimit),
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// 3. GET SINGLE PRODUCT
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }
};


// 4. UPDATE PRODUCT
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// 5. DELETE PRODUCT
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }
};


// 6. RESTOCK / SELL PRODUCT
const adjustStock = async (req, res) => {
    try {
        const { type, quantity } = req.body;

        if (!["restock", "sale"].includes(type) ||
            !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Provide type (restock/sale) and a positive integer quantity"
            });
        }

        const update = type === "restock"
            ? { $inc: { quantity: quantity } }
            : { $inc: { quantity: -quantity } };

        const filter = { _id: req.params.id };

        if (type === "sale") {
            filter.quantity = { $gte: quantity };
        }

        const product = await Product.findOneAndUpdate(
            filter,
            update,
            { new: true, runValidators: true }
        );

        if (!product) {
            const exists = await Product.exists({ _id: req.params.id });

            return res.status(exists ? 400 : 404).json({
                success: false,
                message: exists
                    ? "Insufficient stock"
                    : "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// 7. LOW STOCK REPORT
const getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: ["$quantity", "$lowStockThreshold"]
            }
        });

        res.status(200).json({
            success: true,
            totalLowStockProducts: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// 8. CATEGORY-WISE INVENTORY SUMMARY
const getCategorySummary = async (req, res) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalProducts: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalValue: {
                        $sum: {
                            $multiply: ["$price", "$quantity"]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: summary
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    adjustStock,
    getLowStockProducts,
    getCategorySummary
};