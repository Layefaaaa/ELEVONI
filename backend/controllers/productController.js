import mongoose from "mongoose";
import Product from "../models/Product.js";
import vendorProfileModel from "../models/vendorProfileModel.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const currentUserId = (req) => req.auth?.userId || req.auth?.id;
const PRODUCT_CATEGORIES = ["Catfish & Aquaculture", "Poultry & Eggs", "Grains & Cereals", "Vegetables & Fruits", "Tubers & Starch", "Livestock & Meat", "Processed Agro-Goods"];
const PRODUCT_UNITS = ["kg", "gram", "piece", "crate", "ton", "bag", "carton", "litre"];
const categoriesForVendor = (profile) => {
  const focus = new Set(profile?.productFocus || []);
  const categories = [];
  if (focus.has("poultry")) categories.push("Poultry & Eggs");
  if (["cattle", "sheep", "goats"].some((item) => focus.has(item))) categories.push("Livestock & Meat");
  return categories;
};
const profileForUser = (userId) => vendorProfileModel.findOne({ userId });
const productOwnerId = (product) => product?.vendorId?._id ? String(product.vendorId._id) : product?.vendorId ? String(product.vendorId) : null;

export const getPublicProducts = async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, vendorId, limit = 20, page = 1 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({ success: false, message: "Invalid pagination parameters" });
    }
    if ((minPrice !== undefined && (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)) ||
        (maxPrice !== undefined && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0)) ||
        (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice))) {
      return res.status(400).json({ success: false, message: "Invalid price range" });
    }
    const approvedProfiles = await vendorProfileModel.find({ status: "approved" }, "_id");
    const approvedIds = approvedProfiles.map((profile) => profile._id);
    const filter = { status: "approved", isAvailable: true, vendorId: { $in: approvedIds } };
    if (category) filter.category = category;
    if (vendorId) {
      if (!validObjectId(vendorId) || !approvedIds.some((id) => String(id) === String(vendorId))) {
        return res.status(200).json({ success: true, count: 0, total: 0, page: pageNumber, pages: 0, data: [] });
      }
      filter.vendorId = vendorId;
    }
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: expression }, { description: expression }];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    const [products, total] = await Promise.all([
      Product.find(filter).populate("vendorId", "businessName contactName location productFocus").sort({ isFeatured: -1, createdAt: -1 }).limit(limitNumber).skip((pageNumber - 1) * limitNumber),
      Product.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, count: products.length, total, page: pageNumber, pages: Math.ceil(total / limitNumber), data: products });
  } catch (error) { return next(error); }
};

export const getProductById = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid product ID" });
    const product = await Product.findById(req.params.id).populate("vendorId", "businessName contactName location productFocus status");
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const isAdmin = req.auth?.role === "admin";
    const isOwner = req.auth && productOwnerId(product) && req.vendor?.profileId && productOwnerId(product) === String(req.vendor.profileId);
    const isPublic = product.status === "approved" && product.isAvailable === true && product.vendorId?.status === "approved";
    if (!isPublic && !isAdmin && !isOwner) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(200).json({ success: true, data: product });
  } catch (error) { return next(error); }
};

export const createVendorProduct = async (req, res, next) => {
  try {
    const { name, description = "", price, category, unitOfMeasure = "kg", stockQuantity = 0, images = [], originLocation = {} } = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 160 || price === undefined || !Number.isFinite(Number(price)) || Number(price) <= 0 || !PRODUCT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Provide a product name, positive price, and valid category" });
    }
    if (!PRODUCT_UNITS.includes(unitOfMeasure) || !Array.isArray(images) || images.some((image) => typeof image !== "string" || !/^https?:\/\//i.test(image)) || !Number.isFinite(Number(stockQuantity)) || Number(stockQuantity) < 0) {
      return res.status(400).json({ success: false, message: "Images, unit of measure or stock quantity are invalid" });
    }
    if (req.auth.role === "admin") return res.status(403).json({ success: false, message: "Marketplace listings must be submitted by an approved vendor. Manage Elevoni-owned catfish in the existing catalogue." });
    const profile = await profileForUser(currentUserId(req));
    if (!profile || profile.status !== "approved") return res.status(403).json({ success: false, message: "An approved vendor profile is required" });
    const allowedCategories = categoriesForVendor(profile);
    if (!allowedCategories.includes(category)) return res.status(400).json({ success: false, message: "This category is outside the product focus selected in your vendor application" });
    const profileId = profile._id;
    const product = await Product.create({
      name: name.trim(), description: typeof description === "string" ? description.trim() : "",
      price: Number(price), category, unitOfMeasure, stockQuantity: Number(stockQuantity), images,
      vendorId: profileId, status: "pending", isAvailable: true, originLocation
    });
    return res.status(201).json({ success: true, message: "Product submitted for administrative review", data: product });
  } catch (error) { return next(error); }
};

export const getMyVendorProducts = async (req, res, next) => {
  try {
    const profile = req.auth.role === "admin" ? null : await profileForUser(currentUserId(req));
    if (req.auth.role !== "admin" && (!profile || profile.status !== "approved")) return res.status(403).json({ success: false, message: "An approved vendor profile is required" });
    const filter = req.auth.role === "admin" ? {} : { vendorId: profile._id };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) { return next(error); }
};

export const updateVendorProduct = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid product ID" });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    let profile = null;
    if (req.auth.role !== "admin") {
      profile = await profileForUser(currentUserId(req));
      if (!profile || profile.status !== "approved" || String(product.vendorId) !== String(profile._id)) return res.status(403).json({ success: false, message: "Access denied. You do not own this product listing." });
      if (req.body.category !== undefined && !categoriesForVendor(profile).includes(req.body.category)) return res.status(400).json({ success: false, message: "This category is outside the product focus selected in your vendor application" });
    }
    if (req.body.name !== undefined && (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 160)) return res.status(400).json({ success: false, message: "Product name must be between 2 and 160 characters" });
    if (req.body.price !== undefined && (!Number.isFinite(Number(req.body.price)) || Number(req.body.price) <= 0)) return res.status(400).json({ success: false, message: "Product price must be greater than zero" });
    if (req.body.category !== undefined && !PRODUCT_CATEGORIES.includes(req.body.category)) return res.status(400).json({ success: false, message: "Invalid product category" });
    if (req.body.unitOfMeasure !== undefined && !PRODUCT_UNITS.includes(req.body.unitOfMeasure)) return res.status(400).json({ success: false, message: "Invalid unit of measure" });
    if (req.body.stockQuantity !== undefined && (!Number.isFinite(Number(req.body.stockQuantity)) || Number(req.body.stockQuantity) < 0)) return res.status(400).json({ success: false, message: "Stock quantity cannot be negative" });
    if (req.body.images !== undefined && (!Array.isArray(req.body.images) || req.body.images.some((image) => typeof image !== "string" || !/^https?:\/\//i.test(image)))) return res.status(400).json({ success: false, message: "Images must be valid HTTP or HTTPS URLs" });
    const fields = ["name", "description", "price", "category", "unitOfMeasure", "stockQuantity", "images", "isAvailable", "originLocation"];
    for (const field of fields) if (req.body[field] !== undefined) product[field] = field === "name" ? req.body[field].trim() : req.body[field];
    if (req.auth.role !== "admin" && ["name", "price", "category", "images"].some((field) => req.body[field] !== undefined)) product.status = "pending";
    await product.save();
    return res.status(200).json({ success: true, message: "Product updated successfully", data: product });
  } catch (error) { return next(error); }
};

export const deleteVendorProduct = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid product ID" });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    if (req.auth.role !== "admin") {
      const profile = await profileForUser(currentUserId(req));
      if (!profile || profile.status !== "approved" || String(product.vendorId) !== String(profile._id)) return res.status(403).json({ success: false, message: "Access denied. You do not own this product listing." });
    }
    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Product listing deleted successfully" });
  } catch (error) { return next(error); }
};

export const adminGetAllProducts = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!["pending", "approved", "rejected"].includes(req.query.status)) return res.status(400).json({ success: false, message: "Invalid product status" });
      filter.status = req.query.status;
    }
    const products = await Product.find(filter).populate("vendorId", "businessName contactName email phone location").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) { return next(error); }
};

export const adminModerateProduct = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid product ID" });
    const { status, rejectionReason, isFeatured } = req.body || {};
    if (!["approved", "rejected", "pending"].includes(status)) return res.status(400).json({ success: false, message: "Status must be approved, rejected, or pending" });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    if (status === "approved") {
      if (!product.vendorId) return res.status(409).json({ success: false, message: "This listing is not linked to a vendor profile and cannot be published in the marketplace" });
      const vendor = await vendorProfileModel.findById(product.vendorId);
      if (!vendor || vendor.status !== "approved") return res.status(409).json({ success: false, message: "Approve the vendor application before approving its products" });
    }
    product.status = status;
    if (rejectionReason !== undefined) product.rejectionReason = String(rejectionReason).slice(0, 500);
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    await product.save();
    return res.status(200).json({ success: true, message: `Product status updated to '${status}'`, data: product });
  } catch (error) { return next(error); }
};
