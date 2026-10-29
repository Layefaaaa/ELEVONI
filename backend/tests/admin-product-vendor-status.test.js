import test from "node:test";
import assert from "node:assert/strict";
import Product from "../models/Product.js";
import { adminGetAllProducts } from "../controllers/productController.js";

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
    }
});

test("admin product listing includes vendor status in the vendor projection", async () => {
    const originalFind = Product.find;
    let projection = null;

    try {
        Product.find = () => ({
            populate(field, fields) {
                assert.equal(field, "vendorId");
                projection = fields;
                return this;
            },
            async sort() {
                return [];
            }
        });

        const res = response();
        await adminGetAllProducts({ query: {} }, res, (error) => {
            throw error;
        });

        assert.equal(res.statusCode, 200);
        const fields = String(projection).split(/\s+/);
        for (const field of ["businessName", "contactName", "email", "phone", "location", "state", "lga", "status"]) {
            assert.ok(fields.includes(field), `expected vendor projection to include ${field}`);
        }
    } finally {
        Product.find = originalFind;
    }
});
