import test from "node:test";
import assert from "node:assert/strict";
import {
  ELEVONI_ENQUIRY_PHONE_DISPLAY,
  ELEVONI_WHATSAPP_PHONE,
} from "../src/config/contact.js";

test("customer-facing enquiry details use the approved phone formats", () => {
  assert.equal(ELEVONI_ENQUIRY_PHONE_DISPLAY, "08163303950");
  assert.equal(ELEVONI_WHATSAPP_PHONE, "2348163303950");
});
