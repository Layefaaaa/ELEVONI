import fishModel from "../models/fishModel.js";
import { v2 as cloudinary } from "cloudinary";
import { CATALOGUE_QUERY, parseVisibilityFlag } from "../services/catalogue.js";
import { parsePricingTiers, validateProductPricing } from "../services/productPricing.js";
import { buildPaginationMeta, countMatching, parsePagination } from "../services/pagination.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const pricingModeOf = (explicit, tiers) => {
    if (explicit === "single" || explicit === "tiered") return explicit;
    return tiers.length > 0 ? "tiered" : "single";
};

const isClientInputError = (error) => error?.name === "ValidationError" || error?.name === "CastError";

const addFish = async(req, res) => {
    try {
        const pricingTiers = parsePricingTiers(req.body.pricingTiers || "[]");
        const price = Number(req.body.price);
        const pricingMode = pricingModeOf(req.body.pricingMode, pricingTiers);
        const validationError = validateProductPricing({ pricingMode, price, pricingTiers });
        if (validationError) return res.status(400).json({ success: false, message: validationError });
        if (!req.file) return res.status(400).json({ success: false, message: "A product image is required" });
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "fish_store",
            resource_type: "auto"
        });
        const imageUrl = uploadResult.secure_url;
        const fish = new fishModel({
            name: req.body.name,
            description: req.body.description,
            price,
            category: req.body.category,
            image: imageUrl,
            media: [],
            pricingMode,
            pricingTiers
        });
        await fish.save();
        return res.status(201).json({ success: true, message: "Product created", id: fish._id });
    } catch (error) {
        console.log("addFish error:", error);
        if (isClientInputError(error)) {
            return res.status(400).json({ success: false, message: error.message || "Invalid product details" });
        }
        return res.status(500).json({ success: false, message: "Error creating product" });
    }
};

const updateFish = async(req, res) => {
    try {
        const fish = await fishModel.findById(req.params.id);
        if (!fish) return res.status(404).json({ success: false, message: "Product not found" });
        const pricingTiers = req.body.pricingTiers === undefined
            ? fish.pricingTiers.map(({ minQuantity, maxQuantity, unitPrice }) => ({ minQuantity, maxQuantity, unitPrice }))
            : parsePricingTiers(req.body.pricingTiers);
        const pricingMode = pricingModeOf(req.body.pricingMode, pricingTiers);
        const nextProduct = {
            name: req.body.name ?? fish.name,
            description: req.body.description ?? fish.description,
            price: req.body.price === undefined ? fish.price : Number(req.body.price),
            category: req.body.category ?? fish.category,
            pricingMode,
            pricingTiers
        };
        const visibility = parseVisibilityFlag(req.body.visible);
        if (visibility !== null) nextProduct.visible = visibility;
        const validationError = validateProductPricing(nextProduct);
        if (validationError) return res.status(400).json({ success: false, message: validationError });
        Object.assign(fish, nextProduct);
        await fish.save();
        return res.json({ success: true, message: "Product updated", data: fish });
    } catch (error) {
        console.log("updateFish error:", error);
        if (isClientInputError(error)) {
            return res.status(400).json({ success: false, message: error.message || "Invalid product details" });
        }
        return res.status(500).json({ success: false, message: "Error updating product" });
    }
};

const createListFish = ({ Model = fishModel } = {}) => {
    const listFish = async(req, res) => {
        try {
            const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 0 });
            const fish = limit > 0
                ? await Model.find(CATALOGUE_QUERY, undefined, { skip, limit, sort: { _id: 1 } })
                : await Model.find(CATALOGUE_QUERY);
            const returned = Array.isArray(fish) ? fish.length : 0;
            const total = limit > 0 ? await countMatching(Model, CATALOGUE_QUERY) : returned;
            return res.json({
                success: true,
                data: fish,
                pagination: buildPaginationMeta({ page, limit, total: total ?? returned })
            });
        } catch (error) {
            console.log("listFish error:", error);
            return res.status(500).json({ success: false, message: "Error fetching products" });
        }
    };
    return listFish;
};

const listFish = createListFish();

const listAllFish = async(req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const fish = await fishModel.find({}, undefined, { skip, limit, sort: { _id: 1 } });
        const returned = Array.isArray(fish) ? fish.length : 0;
        const total = await countMatching(fishModel, {});
        return res.json({
            success: true,
            data: fish,
            pagination: buildPaginationMeta({ page, limit, total: total ?? returned })
        });
    } catch (error) {
        console.log("listAllFish error:", error);
        return res.status(500).json({ success: false, message: "Error fetching products" });
    }
};

const getFishById = async(req, res) => {
    try {
        const product = await fishModel.findOne({ _id: req.params.id, ...CATALOGUE_QUERY });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        return res.json({ success: true, data: product });
    } catch (error) {
        if (isClientInputError(error)) return res.status(400).json({ success: false, message: "Invalid product id" });
        return res.status(500).json({ success: false, message: "Error fetching product" });
    }
};

const getFishForAdmin = async(req, res) => {
    try {
        const product = await fishModel.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        return res.json({ success: true, data: product });
    } catch (error) {
        if (isClientInputError(error)) return res.status(400).json({ success: false, message: "Invalid product id" });
        return res.status(500).json({ success: false, message: "Error fetching product" });
    }
};

const removeFish = async(req, res) => {
    try {
        const fish = await fishModel.findById(req.body.id);
        if (!fish) return res.status(404).json({ success: false, message: "Product not found" });
        if (fish.image) {
            const imagePublicId = fish.image.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy("fish_store/" + imagePublicId).catch(err => console.log("Cloudinary image delete error:", err));
        }
        if (fish.media && fish.media.length > 0) {
            const deletePromises = fish.media.map(url => {
                const mediaPublicId = url.split("/").pop().split(".")[0];
                const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                return cloudinary.uploader.destroy("fish_store/" + mediaPublicId, isVideo ? { resource_type: "video" } : {});
            });
            await Promise.all(deletePromises).catch(err => console.log("Cloudinary media delete error:", err));
        }
        await fishModel.findByIdAndDelete(req.body.id);
        return res.json({ success: true, message: "Product deleted" });
    } catch (error) {
        console.log("removeFish error:", error);
        return res.status(500).json({ success: false, message: "Error deleting product" });
    }
};

const addFishMedia = async(req, res) => {
    try {
        const { id } = req.body;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ success: false, message: "A product id is required" });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No media uploaded" });
        }
        const product = await fishModel.findById(id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        const uploadPromises = req.files.map(file =>
            cloudinary.uploader.upload(file.path, { folder: "fish_store", resource_type: "auto" })
        );
        const uploadResults = await Promise.all(uploadPromises);
        const mediaUrls = uploadResults.map(result => result.secure_url);
        await fishModel.findByIdAndUpdate(id, { $push: { media: { $each: mediaUrls } } });
        return res.json({ success: true, message: "Media uploaded successfully" });
    } catch (error) {
        console.log("addFishMedia error:", error);
        if (isClientInputError(error)) return res.status(400).json({ success: false, message: "Invalid product id" });
        return res.status(500).json({ success: false, message: "Error uploading media" });
    }
};

export {
    addFish,
    updateFish,
    listFish,
    listAllFish,
    getFishById,
    getFishForAdmin,
    removeFish,
    addFishMedia,
    createListFish
};
