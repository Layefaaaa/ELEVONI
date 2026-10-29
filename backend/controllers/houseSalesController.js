import houseSaleModel from "../models/houseSaleModel.js";
import { buildPaginationMeta, countMatching, parsePagination } from "../services/pagination.js";
import { prepareHouseSale } from "../services/houseSales.js";

export const createHouseSale = async (req, res, next) => {
    try {
        const prepared = prepareHouseSale(req.body);
        if (prepared.error) return res.status(400).json({ success: false, message: prepared.error });
        try {
            const sale = await houseSaleModel.create(prepared.sale);
            return res.status(201).json({ success: true, message: "Elevoni business sale recorded", data: sale });
        } catch (error) {
            if (error?.code === 11000) return res.status(409).json({ success: false, message: "This sale has already been submitted", duplicate: true });
            throw error;
        }
    } catch (error) { return next(error); }
};

export const listHouseSales = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const sales = await houseSaleModel.find({}).sort({ saleDate: -1, createdAt: -1 }).skip(skip).limit(limit);
        const returned = Array.isArray(sales) ? sales.length : 0;
        const total = await countMatching(houseSaleModel, {});
        return res.status(200).json({ success: true, count: returned, data: sales, pagination: buildPaginationMeta({ page, limit, total: total ?? returned }) });
    } catch (error) { return next(error); }
};
