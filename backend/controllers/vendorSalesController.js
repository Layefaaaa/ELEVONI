import vendorSaleModel from "../models/vendorSaleModel.js";
import {
    buildPaginationMeta,
    countMatching,
    parsePagination
} from "../services/pagination.js";
import { prepareVendorSale } from "../services/vendorSales.js";

const vendorIdFor = (req) => req.vendor?.profileId || null;

export const createVendorSale = async (req, res, next) => {
    try {
        const vendorId = vendorIdFor(req);

        if (!vendorId) {
            return res.status(403).json({
                success: false,
                message: "An approved vendor profile is required"
            });
        }

        const prepared = await prepareVendorSale(req.body, { vendorId });

        if (prepared.error) {
            return res.status(prepared.status || 400).json({
                success: false,
                message: prepared.error
            });
        }

        let sale;

        try {
            sale = await vendorSaleModel.create(prepared.sale);
        } catch (error) {
            if (error?.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: "This sale has already been submitted",
                    duplicate: true
                });
            }

            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Sale recorded",
            data: sale
        });
    } catch (error) {
        return next(error);
    }
};

export const listVendorSales = async (req, res, next) => {
    try {
        const vendorId = vendorIdFor(req);

        if (!vendorId) {
            return res.status(403).json({
                success: false,
                message: "An approved vendor profile is required"
            });
        }

        const { page, limit, skip } = parsePagination(req.query);
        const filter = { vendorId };
        const sales = await vendorSaleModel
            .find(filter)
            .sort({ saleDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const returned = Array.isArray(sales) ? sales.length : 0;
        const total = await countMatching(vendorSaleModel, filter);

        return res.status(200).json({
            success: true,
            count: returned,
            data: sales,
            pagination: buildPaginationMeta({
                page,
                limit,
                total: total ?? returned
            })
        });
    } catch (error) {
        return next(error);
    }
};
