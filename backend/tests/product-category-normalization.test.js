import test from "node:test";
import assert from "node:assert/strict";
import Product from "../models/Product.js";
import vendorProfileModel from "../models/vendorProfileModel.js";
import { createVendorProduct, getPublicProducts } from "../controllers/productController.js";
import {
    PRODUCT_CATEGORIES,
    PUBLIC_CATEGORY_FILTER_KINDS,
    categoriesForVendor,
    interpretCategory,
    isProductCategory,
    productCategoryForVendorFocus,
    resolveProductCategoryFilter,
} from "../services/categoryNormalization.js";
import {
    CATEGORY_ADAPTER_KINDS,
    NON_LISTING_TYPES,
} from "../../shared/categoryAdapter.mjs";
import {
    CATEGORY_LAUNCH_STATUSES,
    CATEGORY_TYPES,
} from "../../shared/categories.mjs";

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

const failOnNext = (error) => {
    if (error) throw error;
};

const withPublicProductStubs = async ({ products, profiles = [{ _id: "vendor-1" }] }, run) => {
    const originalFind = Product.find;
    const originalCount = Product.countDocuments;
    const originalVendorFind = vendorProfileModel.find;
    const calls = {
        productFind: 0,
        productCount: 0,
        vendorFind: 0,
        filters: [],
        countFilters: [],
        vendorFilter: null,
        vendorProjection: null,
    };

    Product.find = (filter) => {
        calls.productFind += 1;
        calls.filters.push(filter);
        return {
            populate() { return this; },
            sort() { return this; },
            limit() { return this; },
            skip() { return this; },
            then(resolve, reject) {
                return Promise.resolve(products).then(resolve, reject);
            },
        };
    };
    Product.countDocuments = async (filter) => {
        calls.productCount += 1;
        calls.countFilters.push(filter);
        return products.length;
    };
    vendorProfileModel.find = async (filter, projection) => {
        calls.vendorFind += 1;
        calls.vendorFilter = filter;
        calls.vendorProjection = projection;
        return profiles;
    };

    try {
        return await run(calls);
    } finally {
        Product.find = originalFind;
        Product.countDocuments = originalCount;
        vendorProfileModel.find = originalVendorFind;
    }
};

const withVendorProductStubs = async (profile, run) => {
    const originalFindOne = vendorProfileModel.findOne;
    const originalCreate = Product.create;
    let created = null;

    vendorProfileModel.findOne = async () => profile;
    Product.create = async (doc) => {
        created = doc;
        return { ...doc, _id: "product-1" };
    };

    try {
        return await run(() => created);
    } finally {
        vendorProfileModel.findOne = originalFindOne;
        Product.create = originalCreate;
    }
};

const vendorBody = (overrides = {}) => ({
    name: "Farm product",
    price: 1000,
    category: "Poultry & Eggs",
    unitOfMeasure: "kg",
    stockQuantity: 1,
    images: [],
    ...overrides,
});

// ---------------------------------------------------------------------------
// Interpretation
// ---------------------------------------------------------------------------

test("known legacy display-name categories keep their stored values", () => {
    const interpretation = interpretCategory("Poultry & Eggs");

    assert.equal(interpretation.kind, CATEGORY_ADAPTER_KINDS.MAPPED);
    assert.equal(interpretation.categoryId, "poultry-eggs");
    assert.equal(interpretation.isListing, true);
    assert.equal(isProductCategory("Poultry & Eggs"), true);
    assert.equal(isProductCategory("poultry-eggs"), false);

    const filter = resolveProductCategoryFilter("Poultry & Eggs");
    assert.equal(filter.kind, PUBLIC_CATEGORY_FILTER_KINDS.FILTER);
    assert.equal(filter.category, "Poultry & Eggs");
});

test("canonical IDs are not accepted as public filters", () => {
    const canonicalIds = [
        "poultry-eggs",
        "grains-cereals",
        "vegetables-fruits",
        "tubers-starch",
        "processed-agro-goods",
        "other-fish-aquaculture",
        "cattle",
        "sheep",
        "goats",
        "livestock",
        "aquaculture-fishery",
        "crops-produce",
        "processed-other-farm-products",
        "other-farm-products",
        "smoked-catfish",
    ];

    for (const canonicalId of canonicalIds) {
        const filter = resolveProductCategoryFilter(canonicalId);
        assert.equal(filter.kind, PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, canonicalId);
        assert.equal(filter.category, null, canonicalId);
    }
});

test("all seven legacy marketplace categories remain accepted filters", () => {
    for (const category of PRODUCT_CATEGORIES) {
        const filter = resolveProductCategoryFilter(category);
        assert.equal(filter.kind, PUBLIC_CATEGORY_FILTER_KINDS.FILTER, category);
        assert.equal(filter.category, category, category);
    }
});

test("Livestock & Meat remains filterable but canonically unresolved", () => {
    const interpretation = interpretCategory("Livestock & Meat");

    assert.equal(interpretation.kind, CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW);
    assert.equal(interpretation.categoryId, null);
    assert.equal(interpretation.candidateCategoryId, null);
    assert.equal(interpretation.isSellable, false);

    for (const categoryId of ["cattle", "sheep", "goats", "poultry-eggs"]) {
        assert.notEqual(interpretation.categoryId, categoryId);
        assert.notEqual(interpretation.candidateCategoryId, categoryId);
    }

    const filter = resolveProductCategoryFilter("Livestock & Meat");
    assert.equal(filter.kind, PUBLIC_CATEGORY_FILTER_KINDS.FILTER);
    assert.equal(filter.category, "Livestock & Meat");
    assert.equal(filter.interpretation.kind, CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW);

    assert.equal(
        resolveProductCategoryFilter("Poultry").kind,
        PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
    );
});

test("Catfish & Aquaculture remains distinct from smoked catfish", () => {
    const interpretation = interpretCategory("Catfish & Aquaculture");

    assert.equal(interpretation.categoryId, "other-fish-aquaculture");
    assert.notEqual(interpretation.categoryId, "smoked-catfish");

    const legacyFilter = resolveProductCategoryFilter("Catfish & Aquaculture");
    assert.equal(legacyFilter.kind, PUBLIC_CATEGORY_FILTER_KINDS.FILTER);
    assert.equal(legacyFilter.category, "Catfish & Aquaculture");

    const canonicalFilter = resolveProductCategoryFilter("other-fish-aquaculture");
    assert.equal(canonicalFilter.kind, PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED);
    assert.equal(canonicalFilter.category, null);

    assert.equal(
        resolveProductCategoryFilter("smoked-catfish").kind,
        PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
    );
});

test("groups and reserved categories are never sellable product filters", () => {
    for (const value of ["Aquaculture & Fishery", "Livestock"]) {
        const interpretation = interpretCategory(value);
        assert.equal(interpretation.category.type, CATEGORY_TYPES.GROUP, value);
        assert.equal(interpretation.isListing, false, value);
        assert.equal(interpretation.isSellable, false, value);
        assert.equal(
            resolveProductCategoryFilter(value).kind,
            PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
            value,
        );
    }

    for (const canonicalId of [
        "aquaculture-fishery",
        "livestock",
        "crops-produce",
        "processed-other-farm-products",
    ]) {
        assert.equal(
            resolveProductCategoryFilter(canonicalId).kind,
            PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
            canonicalId,
        );
    }

    const reserved = interpretCategory("Other Farm Products");
    assert.equal(reserved.category.type, CATEGORY_TYPES.LISTING);
    assert.equal(reserved.category.launchStatus, CATEGORY_LAUNCH_STATUSES.RESERVED);
    assert.equal(reserved.isSellable, false);
    assert.equal(
        resolveProductCategoryFilter("Other Farm Products").kind,
        PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
    );
    assert.equal(
        resolveProductCategoryFilter("other-farm-products").kind,
        PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
    );
});

test("All categories and fish attributes are not product categories", () => {
    const allCategories = interpretCategory("All categories");
    assert.equal(allCategories.kind, CATEGORY_ADAPTER_KINDS.NON_LISTING);
    assert.equal(allCategories.nonListingType, NON_LISTING_TYPES.FILTER);
    assert.equal(isProductCategory("All categories"), false);
    assert.equal(
        resolveProductCategoryFilter("All categories").kind,
        PUBLIC_CATEGORY_FILTER_KINDS.ALL,
    );

    for (const value of ["Smoked", "Fresh"]) {
        const interpretation = interpretCategory(value);
        assert.equal(interpretation.kind, CATEGORY_ADAPTER_KINDS.NON_LISTING, value);
        assert.equal(
            interpretation.nonListingType,
            NON_LISTING_TYPES.FISH_ATTRIBUTE,
            value,
        );
        assert.equal(isProductCategory(value), false, value);
        assert.equal(
            resolveProductCategoryFilter(value).kind,
            PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED,
            value,
        );
    }
});

test("the product write allow-list remains the legacy display names", () => {
    assert.deepEqual(PRODUCT_CATEGORIES, [
        "Catfish & Aquaculture",
        "Poultry & Eggs",
        "Grains & Cereals",
        "Vegetables & Fruits",
        "Tubers & Starch",
        "Livestock & Meat",
        "Processed Agro-Goods",
    ]);

    for (const category of PRODUCT_CATEGORIES) {
        assert.equal(isProductCategory(category), true, category);
    }
    assert.equal(isProductCategory("Smoked"), false);
    assert.equal(isProductCategory("Other Farm Products"), false);
});

// ---------------------------------------------------------------------------
// Public marketplace filters
// ---------------------------------------------------------------------------

test("a legacy category filter keeps approval and availability constraints", async () => {
    const products = [
        { _id: "product-1", name: "Eggs", category: "Poultry & Eggs" },
    ];

    await withPublicProductStubs({ products }, async (calls) => {
        const res = response();
        await getPublicProducts(
            { query: { category: "Poultry & Eggs" } },
            res,
            failOnNext,
        );

        assert.equal(res.statusCode, 200);
        assert.equal(calls.vendorFind, 1);
        assert.deepEqual(calls.vendorFilter, { status: "approved" });
        assert.equal(calls.vendorProjection, "_id");
        assert.deepEqual(calls.filters[0], {
            status: "approved",
            isAvailable: true,
            vendorId: { $in: ["vendor-1"] },
            category: "Poultry & Eggs",
        });
        assert.equal(calls.countFilters[0].category, "Poultry & Eggs");
        assert.equal(res.body.data[0].category, "Poultry & Eggs");
    });
});

test("canonical planned filters return an empty result without querying products", async () => {
    const products = [
        { _id: "product-1", name: "Eggs", category: "Poultry & Eggs" },
    ];

    await withPublicProductStubs({ products }, async (calls) => {
        for (const category of [
            "poultry-eggs",
            "other-fish-aquaculture",
            "grains-cereals",
            "cattle",
            "other-farm-products",
            "smoked-catfish",
        ]) {
            const res = response();
            await getPublicProducts({ query: { category } }, res, failOnNext);

            assert.equal(res.statusCode, 200, category);
            assert.equal(res.body.success, true, category);
            assert.equal(res.body.count, 0, category);
            assert.equal(res.body.total, 0, category);
            assert.deepEqual(res.body.data, [], category);
        }

        assert.equal(calls.productFind, 0);
        assert.equal(calls.productCount, 0);
        assert.equal(calls.vendorFind, 0);
    });
});

test("all legacy filters keep approval and availability constraints", async () => {
    const products = [];

    await withPublicProductStubs({ products }, async (calls) => {
        for (const category of PRODUCT_CATEGORIES) {
            const res = response();
            await getPublicProducts({ query: { category } }, res, failOnNext);

            assert.equal(res.statusCode, 200, category);
            assert.deepEqual(
                calls.filters.at(-1),
                {
                    status: "approved",
                    isAvailable: true,
                    vendorId: { $in: ["vendor-1"] },
                    category,
                },
                category,
            );
            assert.equal(calls.countFilters.at(-1).category, category);
        }

        assert.equal(calls.vendorFind, PRODUCT_CATEGORIES.length);
    });
});

test("Livestock & Meat remains an exact legacy filter", async () => {
    const products = [
        { _id: "product-1", name: "Goat", category: "Livestock & Meat" },
    ];

    await withPublicProductStubs({ products }, async (calls) => {
        const res = response();
        await getPublicProducts(
            { query: { category: "Livestock & Meat" } },
            res,
            failOnNext,
        );

        assert.equal(res.statusCode, 200);
        assert.equal(calls.filters[0].category, "Livestock & Meat");
        assert.equal(res.body.data[0].category, "Livestock & Meat");
    });
});

test("All categories removes the category filter instead of querying that label", async () => {
    const products = [
        { _id: "product-1", name: "Eggs", category: "Poultry & Eggs" },
    ];

    await withPublicProductStubs({ products }, async (calls) => {
        const res = response();
        await getPublicProducts(
            { query: { category: "All categories" } },
            res,
            failOnNext,
        );

        assert.equal(res.statusCode, 200);
        assert.equal(calls.productFind, 1);
        assert.equal(Object.hasOwn(calls.filters[0], "category"), false);
        assert.equal(calls.filters[0].status, "approved");
        assert.equal(calls.filters[0].isAvailable, true);
        assert.equal(res.body.data[0].category, "Poultry & Eggs");
    });
});

test("unknown and non-listing filters return an explicit empty result without broadening", async () => {
    const products = [
        { _id: "product-1", name: "Eggs", category: "Poultry & Eggs" },
    ];

    await withPublicProductStubs({ products }, async (calls) => {
        for (const category of ["Seafood", "Smoked", "Fresh", "Poultry", "Other Farm Products"]) {
            const res = response();
            await getPublicProducts({ query: { category } }, res, failOnNext);

            assert.equal(res.statusCode, 200, category);
            assert.equal(res.body.success, true, category);
            assert.equal(res.body.count, 0, category);
            assert.equal(res.body.total, 0, category);
            assert.deepEqual(res.body.data, [], category);
        }

        assert.equal(calls.productFind, 0);
        assert.equal(calls.productCount, 0);
        assert.equal(calls.vendorFind, 0);
    });
});

// ---------------------------------------------------------------------------
// Vendor permissions
// ---------------------------------------------------------------------------

test("vendor focus still maps to the existing aggregate permission buckets", () => {
    assert.deepEqual(categoriesForVendor({ productFocus: ["poultry"] }), ["Poultry & Eggs"]);
    assert.deepEqual(categoriesForVendor({ productFocus: ["cattle"] }), ["Livestock & Meat"]);
    assert.deepEqual(
        categoriesForVendor({ productFocus: ["cattle", "sheep", "goats"] }),
        ["Livestock & Meat"],
    );
    assert.deepEqual(
        categoriesForVendor({ productFocus: ["poultry", "goats"] }),
        ["Poultry & Eggs", "Livestock & Meat"],
    );
    assert.deepEqual(categoriesForVendor({ productFocus: ["grains"] }), []);
    assert.deepEqual(categoriesForVendor({ productFocus: ["processed"] }), []);

    assert.equal(productCategoryForVendorFocus("poultry"), "Poultry & Eggs");
    assert.equal(productCategoryForVendorFocus("cattle"), "Livestock & Meat");
    assert.equal(productCategoryForVendorFocus("goats"), "Livestock & Meat");
    assert.equal(productCategoryForVendorFocus("grains"), null);
});

test("a vendor still cannot create a product outside its focus", async () => {
    const profile = {
        _id: "vendor-1",
        status: "approved",
        productFocus: ["poultry"],
    };

    await withVendorProductStubs(profile, async (created) => {
        const res = response();
        await createVendorProduct(
            {
                auth: { userId: "user-1", role: "customer" },
                body: vendorBody({ category: "Grains & Cereals" }),
            },
            res,
            failOnNext,
        );

        assert.equal(res.statusCode, 400);
        assert.equal(created(), null);
    });
});

test("a vendor product response retains the submitted legacy category", async () => {
    const profile = {
        _id: "vendor-1",
        status: "approved",
        productFocus: ["poultry"],
    };

    await withVendorProductStubs(profile, async (created) => {
        const res = response();
        await createVendorProduct(
            {
                auth: { userId: "user-1", role: "customer" },
                body: vendorBody({ category: "Poultry & Eggs" }),
            },
            res,
            failOnNext,
        );

        assert.equal(res.statusCode, 201);
        assert.equal(created().category, "Poultry & Eggs");
        assert.equal(res.body.data.category, "Poultry & Eggs");
    });
});
