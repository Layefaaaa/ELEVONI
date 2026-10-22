import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from "../src/utils/apiBase.js";

test("the storefront falls back to the production API when no base URL is configured", () => {
  assert.equal(resolveApiBaseUrl({}), DEFAULT_API_BASE_URL);
  assert.equal(resolveApiBaseUrl({ VITE_API_BASE_URL: "" }), DEFAULT_API_BASE_URL);
});

test("the storefront uses the configured API base URL for other environments", () => {
  assert.equal(resolveApiBaseUrl({ VITE_API_BASE_URL: "http://localhost:4000" }), "http://localhost:4000");
});

test("the storefront strips trailing slashes so route paths can be appended", () => {
  assert.equal(resolveApiBaseUrl({ VITE_API_BASE_URL: "http://localhost:4000/" }), "http://localhost:4000");
  assert.equal(resolveApiBaseUrl({ VITE_API_BASE_URL: "http://localhost:4000///" }), "http://localhost:4000");
});
