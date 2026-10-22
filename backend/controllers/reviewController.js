import reviewModel from "../models/reviewModel.js";
import userModel from "../models/userModel.js";
import { buildPaginationMeta, countMatching, parsePagination } from "../services/pagination.js";

// add review

const addReview = async(req, res) => {
    try {
        const user = await userModel.findById(req.auth.userId);

        if (!user) {
            return res.status(401).json({ success: false, message: "User account not found. Please log in again." });
        }

        const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";
        const rating = Number(req.body.rating);
        if (!comment) {
            return res.status(400).json({ success: false, message: "A review comment is required" });
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "A rating between 1 and 5 is required" });
        }

        const newReview = new reviewModel({
            userId: req.auth.userId,
            name: user.name,
            comment,
            rating
        });

        await newReview.save();
        return res.json({ success: true, message: "Review submitted for approval!" });

    } catch (error) {
        console.error("Error in addReview backend:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// approved reviews only

const listReviews = async(req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 0 });
        const reviews = await reviewModel.find(
            { approved: true },
            undefined,
            limit > 0 ? { skip, limit, sort: { date: -1 } } : { sort: { date: -1 } }
        );
        const returned = Array.isArray(reviews) ? reviews.length : 0;
        const total = limit > 0 ? await countMatching(reviewModel, { approved: true }) : returned;
        return res.json({
            success: true,
            data: reviews,
            pagination: buildPaginationMeta({ page, limit, total: total ?? returned }),
        });
    } catch (error) {
        console.log("listReviews error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving reviews",
        });
    }
};

// admin page

const listAllReviews = async(req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const reviews = await reviewModel.find({}, undefined, { skip, limit, sort: { date: -1 } });
        const returned = Array.isArray(reviews) ? reviews.length : 0;
        const total = await countMatching(reviewModel, {});
        return res.json({
            success: true,
            data: reviews,
            pagination: buildPaginationMeta({ page, limit, total: total ?? returned }),
        });
    } catch (error) {
        console.log("listAllReviews error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving reviews",
        });
    }
};

// approve review

const approveReview = async(req, res) => {
    try {
        const review = await reviewModel.findByIdAndUpdate(
            req.body.id, {
                approved: true,
            },
            { new: true }
        );
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        return res.json({
            success: true,
            message: "Review Approved",
        });
    } catch (error) {
        console.log("approveReview error:", error);
        if (error?.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid review id" });
        }

        return res.status(500).json({
            success: false,
            message: "Error approving review",
        });
    }
};

// delete review

const deleteReview = async(req, res) => {
    try {
        const review = await reviewModel.findByIdAndDelete(
            req.body.id
        );
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        return res.json({
            success: true,
            message: "Review Deleted",
        });
    } catch (error) {
        console.log("deleteReview error:", error);
        if (error?.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid review id" });
        }

        return res.status(500).json({
            success: false,
            message: "Error deleting review",
        });
    }
};

export {
    addReview,
    listReviews,
    listAllReviews,
    approveReview,
    deleteReview,
};
