import { ELEVONI_WHATSAPP_PHONE } from "../config/contact.js";
import axios from "axios";

export const MARKETPLACE_PAGE_SIZE = 12;

const LOAD_ERROR = "We couldn’t load marketplace listings. Please try again.";

export const logMarketplaceEnquiry = async ({ url, productId }) => {
    if (!url || !productId) return;
    try {
        await axios.post(`${url}/api/products/enquiry`, { productId }, { timeout: 2500 });
    } catch {
        // Enquiry logging is best-effort; it must never block the user's WhatsApp enquiry.
    }
};

export const formatNaira = (value) =>
    `₦${Number(value || 0).toLocaleString("en-NG")}`;

export const marketplaceEnquiryUrl = (product) => {
    const vendor = product.vendorId?.businessName || "the listed business";
    const message = `Hello Elevoni Farms, I would like to enquire about ${product.name} from ${vendor}. Is it available, and what are the delivery arrangements?`;
    return `https://wa.me/${ELEVONI_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
};

export const fetchPublicProducts = async ({
    url,
    category,
    subcategory,
    search,
    vendorId,
    page = 1,
    limit = MARKETPLACE_PAGE_SIZE,
    signal,
} = {}) => {
    const params = { limit, page };

    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    if (search) params.search = search;
    if (vendorId) params.vendorId = vendorId;

    const response = await axios.get(`${url}/api/products`, { params, signal });

    if (response.data?.success !== true || !Array.isArray(response.data.data)) {
        throw new Error(response.data?.message || LOAD_ERROR);
    }

    const products = response.data.data;
    const total = Number(response.data.total);
    const pages = Number(response.data.pages);

    return {
        products,
        total: Number.isFinite(total) ? total : products.length,
        pages: Number.isFinite(pages) ? pages : 0,
    };
};

export const fetchPublicProductCount = async (options = {}) => {
    const result = await fetchPublicProducts({
        ...options,
        page: 1,
        limit: 1,
    });

    return result.total;
};

export const fetchLivestockParentCount = async ({ url, signal } = {}) => {
    const [poultry, livestock] = await Promise.all([
        fetchPublicProductCount({ url, category: "Poultry & Eggs", signal }),
        fetchPublicProductCount({ url, category: "Livestock & Meat", signal }),
    ]);

    return poultry + livestock;
};

export const fetchLivestockSubcategoryCounts = async ({
    url,
    children = [],
    signal,
} = {}) => {
    const entries = await Promise.all(
        children.map(async (child) => {
            if (!child.marketplace?.category || !child.marketplace?.subcategory) {
                throw new Error(`Missing marketplace filter for ${child.name || child.slug}`);
            }

            const count = await fetchPublicProductCount({
                url,
                category: child.marketplace.category,
                subcategory: child.marketplace.subcategory,
                signal,
            });

            return [child.slug, count];
        })
    );

    return Object.fromEntries(entries);
};
