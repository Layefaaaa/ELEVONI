# Elevoni COUCH repair notes — 25 October 2026

This document describes the integration repair pass made against the uploaded source archive. It does not imply that the changes have been deployed or pushed to GitHub.

## Architecture decisions

- `backend/models/vendorProfileModel.js` is the canonical vendor application/profile model.
- Vendor approval is separate from the customer account role. An approved vendor continues to authenticate as a customer and receives vendor permissions only after the API checks the persisted vendor profile status.
- Vendor product records in `backend/models/Product.js` reference the `vendorProfile` model. Public listings require both an approved product status and an approved vendor profile.
- Elevoni's existing catfish catalogue and checkout remain on the existing `fish`/order flow. Marketplace listings use a separate enquiry flow for now; do not represent an enquiry as a completed order.
- Vendor application approval and product listing approval are two different admin decisions.
- The unused `backend/models/Vendor.js` and `backend/models/User.js` files have not been deleted to avoid destructive cleanup of files from the uploaded working tree. Active routes/controllers in this pass do not use them as the source of truth.

## Main changes

- Restored existing `/api/fish`, `/api/user`, `/api/cart`, `/api/review`, `/api/order`, and `/api/payment` route mounts while retaining marketplace routes.
- Restored the order-bound Paystack controller and route contract expected by the current storefront.
- Updated JWT middleware to accept the existing `token` header and standard Bearer authorization, pin verification to HS256, reject missing JWT secrets, and expose both `req.auth.userId` and `req.auth.id` for compatible controllers.
- Implemented vendor registration, application submission/status, admin list/detail/review transitions, and approved vendor directory endpoints using `vendorProfileModel`.
- Rewired product ownership, listing visibility, vendor CRUD and admin moderation to `vendorProfileModel`.
- Added customer Marketplace UI, vendor listing management UI, and admin product moderation UI.
- Updated CORS allowed methods to include PATCH and made additional production app origins configurable with `FRONTEND_URL`, `ADMIN_URL`, and `VENDOR_PORTAL_URL` (comma-separated origin lists are supported).

## Key API paths

- Existing storefront: `/api/fish`, `/api/user`, `/api/cart`, `/api/order`, `/api/payment`
- Vendor application: `/api/vendor/register`, `/api/vendor/apply`, `/api/vendor/me`
- Vendor application administration: `/api/vendor/admin-list`, `/api/vendor/admin/:id`, `/api/vendor/:id/review`
- Approved vendor directory: `/api/vendors`
- Marketplace products: `/api/products`, `/api/products/vendor`, `/api/products/vendor/me`
- Product moderation: `/api/products/admin/all`, `/api/products/admin/:id/status`

## Verification status

- Backend JavaScript files passed `node --check` syntax checks.
- Vendor application service smoke checks passed for valid fields, valid/invalid transitions, and decision-note validation.
- Relative-import existence checks passed for the key changed backend/frontend/admin/vendor-portal files.
- The full backend test suite has **not** been verified. `npm ci --ignore-scripts --no-audit --no-fund` timed out in the extracted environment, leaving required dependencies unavailable; `npm test` therefore stopped at missing-package import errors. Those errors are not a valid pass/fail result for application logic.
- Frontend/admin/vendor-portal production builds and browser-based flows have not been verified in this environment.

## Before merging or deploying

1. In each app directory, install from its lockfile (`npm ci`).
2. Run the backend test suite and each app's available tests/build scripts.
3. Test vendor registration, application review, approved-vendor product submission, product review, public listing visibility, and suspension hiding vendor listings.
4. Test the existing catfish browse/cart/WhatsApp request/Paystack checkout flow end-to-end.
5. Confirm production CORS origin values and all required environment variables in the hosting dashboards. Never put real secrets in this archive or commit them.
6. Check existing MongoDB collections before any migration. If marketplace products already point to the separate `Vendor` collection, they will need a deliberate data migration to `vendorProfile` IDs before this refactor is deployed.
7. Do not deploy until the above checks pass.
