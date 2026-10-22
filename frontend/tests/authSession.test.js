import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_TOKEN_STORAGE_KEY,
  clearStoredToken,
  isUnauthorizedResponse,
  persistStoredToken,
  readStoredToken,
} from "../src/utils/authSession.js";

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
};

test("a stored session token is read back for authenticated requests", () => {
  const storage = createStorage({
    [AUTH_TOKEN_STORAGE_KEY]: "header.payload.signature",
  });
  assert.equal(readStoredToken(storage), "header.payload.signature");
});

test("no usable stored token means no session is available", () => {
  assert.equal(readStoredToken(createStorage()), "");
  assert.equal(
    readStoredToken(createStorage({ [AUTH_TOKEN_STORAGE_KEY]: "" })),
    "",
  );
  assert.equal(readStoredToken(createStorage({ [AUTH_TOKEN_STORAGE_KEY]: "  " })), "");
  assert.equal(readStoredToken(undefined), "");
});

test("a rejected or missing credential is never stored", () => {
  const storage = createStorage();
  assert.equal(persistStoredToken(storage, undefined), false);
  assert.equal(persistStoredToken(storage, null), false);
  assert.equal(persistStoredToken(storage, ""), false);
  assert.equal(persistStoredToken(storage, "   "), false);
  assert.equal(storage.has(AUTH_TOKEN_STORAGE_KEY), false);
});

test("a valid credential is stored under the session key", () => {
  const storage = createStorage();
  assert.equal(persistStoredToken(storage, "header.payload.signature"), true);
  assert.equal(
    storage.getItem(AUTH_TOKEN_STORAGE_KEY),
    "header.payload.signature",
  );
});

test("only a 401 response is treated as an invalid session", () => {
  assert.equal(isUnauthorizedResponse({ response: { status: 401 } }), true);
  assert.equal(isUnauthorizedResponse({ response: { status: 403 } }), false);
  assert.equal(isUnauthorizedResponse({ response: { status: 500 } }), false);
  assert.equal(isUnauthorizedResponse(new Error("Network Error")), false);
  assert.equal(isUnauthorizedResponse(undefined), false);
});

test("an expired session is cleared so protected requests stop firing", () => {
  const storage = createStorage({
    [AUTH_TOKEN_STORAGE_KEY]: "expired.token.value",
  });
  const error = { response: { status: 401 } };

  if (isUnauthorizedResponse(error)) clearStoredToken(storage);

  assert.equal(storage.has(AUTH_TOKEN_STORAGE_KEY), false);
  assert.equal(readStoredToken(storage), "");
});

test("clearing a session leaves unrelated stored values untouched", () => {
  const storage = createStorage({
    [AUTH_TOKEN_STORAGE_KEY]: "header.payload.signature",
    cart: "kept",
  });

  clearStoredToken(storage);

  assert.equal(storage.getItem("cart"), "kept");
  assert.equal(storage.has(AUTH_TOKEN_STORAGE_KEY), false);
});
