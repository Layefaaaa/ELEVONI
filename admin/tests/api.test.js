import test from "node:test";
import assert from "node:assert/strict";

const createStorage = (token) => {
  const store = new Map();
  if (token) store.set("token", token);
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

globalThis.localStorage = createStorage("admin-token");

const { default: api } = await import("../src/api.js");

const applyRequestInterceptor = (config) =>
  api.interceptors.request.handlers[0].fulfilled(config);

test("the admin API client attaches the stored admin token to every request", async () => {
  const config = await applyRequestInterceptor({ headers: {} });
  assert.equal(config.headers.token, "admin-token");
});

test("the admin API client sends no token when the browser has none stored", async () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = createStorage(null);
  try {
    const config = await applyRequestInterceptor({ headers: {} });
    assert.equal(config.headers.token, undefined);
  } finally {
    globalThis.localStorage = original;
  }
});
