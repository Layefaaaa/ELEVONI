import mongoose from "mongoose";
import Product from "../models/Product.js";
import vendorProfileModel from "../models/vendorProfileModel.js";
import { v2 as cloudinary } from "cloudinary";

import {
    PUBLIC_CATEGORY_FILTER_KINDS,
    categoriesForVendor,
    isProductCategory,
    resolveProductCategoryFilter
} from "../utils/categoryNormalization.js";

// Get public products
const getPublicProducts = async(req, res) => {
    try {
        const categoryFilter = resolveProductCategoryFilter(req.query.category);

        const filter = {
            status: "approved",
            isActive: true
        };

        if (categoryFilter) {
            filter.category = categoryFilter;
        }

        const products = await Product.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error("Get public products error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products."
        });
    }
};

// Get one public product
const getProductById = async(req, res) => {
    try {
        const productId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const product = await Product.findOne({
            _id: productId,
            status: "approved",
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.status(200).json({
            success: true,
            product: product
        });
    } catch (error) {
        console.error("Get product by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch product."
        });
    }
};

// Create vendor product
const createVendorProduct = async(req, res) => {
    try {
        const userId = req.user && req.user._id;
        const profile = await vendorProfileModel.findOne({ userId: userId });

        if (!profile || profile.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: "An approved vendor profile is required."
            });
        }

        const name = req.body.name;
        const description = req.body.description;
        const price = Number(req.body.price);
        const category = req.body.category;
        const subcategory = req.body.subcategory;
        const media = Array.isArray(req.body.media) ? req.body.media : [];

        if (!name || !description || !Number.isFinite(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Provide a name, description, and valid price."
            });
        }

        if (!isProductCategory(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product category."
            });
        }

        const allowedCategories = categoriesForVendor(profile);

        if (
            Array.isArray(allowedCategories) &&
            allowedCategories.length > 0 &&
            allowedCategories.indexOf(category) === -1
        ) {
            return res.status(403).json({
                success: false,
                message: "This category is not enabled for your vendor profile."
            });
        }

        if (subcategory && !allowedCategories.includes(subcategory)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product subcategory."
            });
        }

        const product = await Product.create({
            name: name,
            description: description,
            price: price,
            category: category,
            subcategory: subcategory || "",
            media: media,
            vendorId: profile._id,
            status: "pending",
            isActive: false
        });

        res.status(201).json({
            success: true,
            message: "Product submitted for approval.",
            product: product
        });
    } catch (error) {
        console.error("Create vendor product error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create product."
        });
    }
};

// Get products belonging to the authenticated vendor
const getMyVendorProducts = async(req, res) => {
    try {
        const userId = req.user && req.user._id;
        const profile = await vendorProfileModel.findOne({ userId: userId });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found."
            });
        }

        const products = await Product.find({
            vendorId: profile._id
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error("Get vendor products error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vendor products."
        });
    }
};

// Update a vendor product
const updateVendorProduct = async(req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user && req.user._id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const profile = await vendorProfileModel.findOne({ userId: userId });

        if (!profile || profile.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: "An approved vendor profile is required."
            });
        }

        const product = await Product.findOne({
            _id: productId,
            vendorId: profile._id
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or you do not own it."
            });
        }

        const name = req.body.name;
        const description = req.body.description;
        const price = req.body.price;
        const category = req.body.category;
        const subcategory = req.body.subcategory;
        const media = req.body.media;

        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;

        if (price !== undefined) {
            const parsedPrice = Number(price);

            if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be greater than zero."
                });
            }

            product.price = parsedPrice;
        }

        if (category !== undefined) {
            if (!isProductCategory(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product category."
                });
            }

            product.category = category;
        }

        if (subcategory !== undefined) {
            product.subcategory = subcategory;
        }

        if (media !== undefined) {
            if (!Array.isArray(media)) {
                return res.status(400).json({
                    success: false,
                    message: "Media must be an array."
                });
            }

            product.media = media;
        }

        product.status = "pending";
        product.isActive = false;

        await product.save();

        res.status(200).json({
            success: true,
            message: "Product updated and submitted for approval.",
            product: product
        });
    } catch (error) {
        console.error("Update vendor product error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update product."
        });
    }
};

// Delete a vendor product
const deleteVendorProduct = async(req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user && req.user._id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const profile = await vendorProfileModel.findOne({ userId: userId });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found."
            });
        }

        const product = await Product.findOne({
            _id: productId,
            vendorId: profile._id
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or you do not own it."
            });
        }

        await Product.deleteOne({ _id: product._id });

        res.status(200).json({
            success: true,
            message: "Product deleted successfully."
        });
    } catch (error) {
        console.error("Delete vendor product error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete product."
        });
    }
};

// Admin: get all products
const adminGetAllProducts = async(req, res) => {
    try {
        const products = await Product.find({})
            .populate("vendorId")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error("Admin get products error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products."
        });
    }
};

// Admin: approve or reject a product
const adminModerateProduct = async(req, res) => {
    try {
        const productId = req.params.id;
        const status = req.body.status;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        if (status !== "approved" && status !== "rejected") {
            return res.status(400).json({
                success: false,
                message: "Status must be approved or rejected."
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        product.status = status;
        product.isActive = status === "approved";

        await product.save();

        res.status(200).json({
            success: true,
            message: "Product " + status + " successfully.",
            product: product
        });
    } catch (error) {
        console.error("Admin moderation error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to moderate product."
        });
    }
};

// Generate a signed Cloudinary upload request for an approved vendor
const getVendorMediaUploadSignature = async(req, res) => {
    try {
        const userId = req.user && req.user._id;
        const profile = await vendorProfileModel.findOne({ userId: userId });

        if (!profile || profile.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: "An approved vendor profile is required."
            });
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(500).json({
                success: false,
                message: "Cloudinary configuration is incomplete."
            });
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const folder = "elevoni/vendor-products";

        const signature = cloudinary.utils.api_sign_request({
                folder: folder,
                timestamp: timestamp
            },
            apiSecret
        );

        res.status(200).json({
            success: true,
            cloudName: cloudName,
            apiKey: apiKey,
            timestamp: timestamp,
            folder: folder,
            signature: signature
        });
    } catch (error) {
        console.error("Cloudinary signature error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate upload signature."
        });
    }
};

export {
    getPublicProducts,
    getProductById,
    createVendorProduct,
    getMyVendorProducts,
    updateVendorProduct,
    deleteVendorProduct,
    adminGetAllProducts,
    adminModerateProduct,
    getVendorMediaUploadSignature
};