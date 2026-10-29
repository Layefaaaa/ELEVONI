import mongoose from "mongoose";
import Product from "../models/Product.js";
import {
    VENDOR_SALE_CHANNELS,
    VENDOR_SALE_FULFILMENT_STATUSES,
    VENDOR_SALE_PAYMENT_STATUSES,
    VENDOR_SALE_UNITS
} from "../models/vendorSaleModel.js";

const SUBMISSION_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const MAX_PRODUCT_NAME_LENGTH = 160;
const MAX_BUYER_NAME_LENGTH = 120;
const MAX_BUYER_CONTACT_LENGTH = 120;
const MAX_NOTES_LENGTH = 1000;

const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const trimmedText = (value) =>
    typeof value === "string" ? value.trim() : "";

const toFiniteNumber = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
        return Number(value);
    }
    return NaN;
};

const roundMoney = (value) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const optionalText = (value, maxLength, label) => {
    if (value === undefined || value === null) return { value: "" };
    if (typeof value !== "string") {
        return { error: `${label} must be text` };
    }

    const trimmed = value.trim();

    if (trimmed.length > maxLength) {
        return { error: `${label} must not exceed ${maxLength} characters` };
    }

    return { value: trimmed };
};

const parseSaleDate = (value, now = new Date()) => {
    if (typeof value !== "string" && !(value instanceof Date)) {
        return { error: "Enter a valid sale date" };
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return { error: "Enter a valid sale date" };
    }

    const saleDay = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    );
    const today = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    );

    if (saleDay > today) {
        return { error: "Sale date cannot be in the future" };
    }

    return { value: date };
};

const prepareVendorSale = async (body = {}, {
    vendorId,
    ProductModel = Product,
    now = new Date()
} = {}) => {
    if (!vendorId) {
        return {
            error: "An approved vendor profile is required",
            status: 403
        };
    }

    if (!isPlainObject(body)) {
        return { error: "Invalid sale payload", status: 400 };
    }

    const submissionReference = trimmedText(body.submissionReference);

    if (!SUBMISSION_REFERENCE_PATTERN.test(submissionReference)) {
        return {
            error: "Submission reference must be 8-128 characters using letters, numbers, dots, underscores, colons or hyphens",
            status: 400
        };
    }

    const quantity = toFiniteNumber(body.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
        return { error: "Quantity must be a positive finite number", status: 400 };
    }

    const unitPrice = toFiniteNumber(body.unitPrice);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { error: "Unit price must be a positive finite number", status: 400 };
    }

    const totalAmount = roundMoney(quantity * unitPrice);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return { error: "Sale total must be a positive finite number", status: 400 };
    }

    const salesChannel = trimmedText(body.salesChannel);

    if (!VENDOR_SALE_CHANNELS.includes(salesChannel)) {
        return { error: "Choose a valid sales channel", status: 400 };
    }

    const paymentStatus = trimmedText(body.paymentStatus);

    if (!VENDOR_SALE_PAYMENT_STATUSES.includes(paymentStatus)) {
        return { error: "Choose a valid payment status", status: 400 };
    }

    let amountReceived;

    if (
        body.amountReceived === undefined ||
        body.amountReceived === null ||
        body.amountReceived === ""
    ) {
        if (paymentStatus !== "unpaid") {
            return {
                error: "Amount received is required for paid or partially paid sales",
                status: 400
            };
        }

        amountReceived = 0;
    } else {
        amountReceived = roundMoney(toFiniteNumber(body.amountReceived));

        if (!Number.isFinite(amountReceived) || amountReceived < 0) {
            return {
                error: "Amount received must be a non-negative finite number",
                status: 400
            };
        }
    }

    if (amountReceived > totalAmount) {
        return { error: "Amount received cannot exceed the sale total", status: 400 };
    }

    if (paymentStatus === "paid" && amountReceived !== totalAmount) {
        return {
            error: "A paid sale requires amount received to equal the sale total",
            status: 400
        };
    }

    if (
        paymentStatus === "partial" &&
        !(amountReceived > 0 && amountReceived < totalAmount)
    ) {
        return {
            error: "A partial sale requires an amount greater than zero and less than the sale total",
            status: 400
        };
    }

    if (paymentStatus === "unpaid" && amountReceived !== 0) {
        return { error: "An unpaid sale requires amount received to be zero", status: 400 };
    }

    const saleDateResult = parseSaleDate(body.saleDate, now);

    if (saleDateResult.error) {
        return { error: saleDateResult.error, status: 400 };
    }

    const fulfilmentStatus = trimmedText(body.fulfilmentStatus || "pending");

    if (!VENDOR_SALE_FULFILMENT_STATUSES.includes(fulfilmentStatus)) {
        return { error: "Choose a valid fulfilment status", status: 400 };
    }

    const buyerNameResult = optionalText(
        body.buyerName,
        MAX_BUYER_NAME_LENGTH,
        "Buyer name"
    );

    if (buyerNameResult.error) {
        return { error: buyerNameResult.error, status: 400 };
    }

    const buyerContactResult = optionalText(
        body.buyerContact,
        MAX_BUYER_CONTACT_LENGTH,
        "Buyer contact"
    );

    if (buyerContactResult.error) {
        return { error: buyerContactResult.error, status: 400 };
    }

    const buyerStateResult = optionalText(body.buyerState, 100, "Buyer state");
    if (buyerStateResult.error) return { error: buyerStateResult.error, status: 400 };

    const buyerAreaResult = optionalText(body.buyerArea, 120, "Buyer area or town");
    if (buyerAreaResult.error) return { error: buyerAreaResult.error, status: 400 };

    const buyerIdentityStatus = trimmedText(body.buyerIdentityStatus || (buyerNameResult.value || buyerContactResult.value ? "identified" : "unknown"));
    if (!["identified", "anonymous", "unknown"].includes(buyerIdentityStatus)) {
        return { error: "Choose a valid buyer identification option", status: 400 };
    }
    if (buyerIdentityStatus === "identified" && !buyerNameResult.value && !buyerContactResult.value) {
        return { error: "For an identified buyer, enter a name or contact detail", status: 400 };
    }
    if (buyerIdentityStatus === "anonymous" && (buyerNameResult.value || buyerContactResult.value)) {
        return { error: "Anonymous buyer records must not include a name or contact detail", status: 400 };
    }

    const saleTime = trimmedText(body.saleTime);
    if (saleTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(saleTime)) {
        return { error: "Enter sale time in HH:MM format", status: 400 };
    }

    const notesResult = optionalText(body.notes, MAX_NOTES_LENGTH, "Notes");

    if (notesResult.error) {
        return { error: notesResult.error, status: 400 };
    }

    let productId = null;
    let productName = "";
    let unit = "";

    const hasProductId =
        body.productId !== undefined &&
        body.productId !== null &&
        body.productId !== "";

    if (hasProductId) {
        if (!mongoose.Types.ObjectId.isValid(body.productId)) {
            return { error: "Invalid product ID", status: 400 };
        }

        const product = await ProductModel.findOne({
            _id: body.productId,
            vendorId
        });

        if (!product) {
            return {
                error: "Product not found for this vendor",
                status: 400
            };
        }

        productId = product._id;
        productName = trimmedText(product.name);
        unit = trimmedText(product.unitOfMeasure);

        if (!productName) {
            return { error: "The selected product has no valid name", status: 400 };
        }

        if (productName.length > MAX_PRODUCT_NAME_LENGTH) {
            return {
                error: `Product name must not exceed ${MAX_PRODUCT_NAME_LENGTH} characters`,
                status: 400
            };
        }

        if (!VENDOR_SALE_UNITS.includes(unit)) {
            return { error: "The selected product has an unsupported unit", status: 400 };
        }
    } else {
        productName = trimmedText(body.productName);

        if (
            productName.length < 2 ||
            productName.length > MAX_PRODUCT_NAME_LENGTH
        ) {
            return {
                error: `Product name must be between 2 and ${MAX_PRODUCT_NAME_LENGTH} characters`,
                status: 400
            };
        }

        unit = trimmedText(body.unit);

        if (!VENDOR_SALE_UNITS.includes(unit)) {
            return { error: "Choose a valid unit", status: 400 };
        }
    }

    return {
        sale: {
            vendorId,
            submissionReference,
            productId,
            productName,
            unit,
            quantity,
            unitPrice,
            totalAmount,
            currency: "NGN",
            saleDate: saleDateResult.value,
            salesChannel,
            paymentStatus,
            amountReceived,
            fulfilmentStatus,
            buyerIdentityStatus,
            buyerName: buyerNameResult.value,
            buyerContact: buyerContactResult.value,
            buyerState: buyerStateResult.value,
            buyerArea: buyerAreaResult.value,
            saleTime,
            notes: notesResult.value,
            recordSource: "farmer_reported",
            verificationStatus: "unverified"
        }
    };
};

export {
    MAX_BUYER_CONTACT_LENGTH,
    MAX_BUYER_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MAX_PRODUCT_NAME_LENGTH,
    SUBMISSION_REFERENCE_PATTERN,
    prepareVendorSale
};
