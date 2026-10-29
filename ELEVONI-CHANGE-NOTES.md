# Elevoni data-foundation changes

## Scope

This update keeps the external farmer marketplace enquiry-based. It does not add marketplace checkout, platform payment, commissions, settlement, or the Farmer Sales Intelligence dashboard/AI (Winnifred's work).

## What changed

- **House-business offline Sales Log:** Added an admin-only `Elevoni Sales Log` page and `/api/admin/house-sales` endpoints. This records Elevoni's own offline sales separately from vendor sales and online catfish orders. Historical records can retain their actual sale date and are tagged `historical_import`; normal entries use `business_reported`. Entries are `unverified` by default.
- **Vendor Sales Log buyer details:** Added buyer identity status (`identified`, `anonymous`, `unknown`), buyer state, buyer town/area, and optional sale time. For identified buyers, the UI/API require a name or contact. Anonymous entries cannot contain a buyer name/contact. Missing information should remain unknown rather than be invented.
- **Online order buyer snapshots:** New house-business orders snapshot buyer name/contact and delivery state/area from the address submitted with the order. Existing address and checkout behavior remain in place.
- **Seller attribution:** New smoked-catfish checkout order items are explicitly attributed to `sellerType: "house"` and `sellerBusinessName: "Elevoni Farms"`; they do not receive an external `vendorId`. The marketplace does not create orders because it remains enquiry-based.
- **Marketplace enquiry records:** Clicking an approved external vendor's WhatsApp enquiry link triggers best-effort logging. Each event snapshots the product ID/name and authoritative approved vendor ID/business name. Vendors can read their own enquiry events from authenticated `GET /api/vendor/enquiries`. These records represent enquiry-link clicks only—not completed orders, confirmed conversations, sales, or revenue.
- **Canonical vendor location:** `vendorProfileModel.js` remains the active vendor profile model. It now supports structured `farmAddress` (street, area, LGA, State, country) while preserving the existing `location`, `state`, and `lga` fields for compatibility. Product and vendor responses include the structured location where applicable.
- **Legacy model audit:** Active backend route/controller/service imports use `userModel.js` and `vendorProfileModel.js`. `User.js` and `Vendor.js` have no active backend imports in this repo and are marked legacy; they were not deleted or redirected because live database/external usage cannot be verified from this ZIP alone.
- **Migration:** Added `backend/migrations/backfillVendorFarmAddress.js`. It defaults to a dry run. Review output and back up the database before using `--apply`. No live database migration was run.
- **Tests added:** `backend/tests/house-sales.test.js` and `backend/tests/order-buyer-snapshot.test.js`; seller-attribution coverage was extended in `backend/tests/order-attribution.test.js`.

## Data-source distinctions for Winnifred

1. `order` records: platform-recorded house-business catfish checkout orders; payment and fulfilment states remain distinct.
2. `houseSale` records: Elevoni's offline business sales, business-reported or historical-import, unverified by default.
3. `vendorSale` records: approved vendor-reported offline sales, tied to the authenticated vendor profile, unverified by default.
4. `marketplaceEnquiry` records: platform-recorded enquiry-link clicks tied to a marketplace product and its approved vendor. Not a sale.

Do not sum enquiry clicks as sales. Do not treat an unpaid order as received revenue. Do not assume anonymous/unknown buyers are unique or repeat customers. Do not retroactively attribute old orders to a farmer without evidence.

## Validation and limitations

- Syntax checks passed for the changed backend JavaScript files.
- Pure service tests passed: house-sales validation and order-buyer snapshot tests (8/8).
- A full backend test run and production builds were **not completed**. Installing dependencies with `npm ci` timed out in this environment, and dependencies were not available for the full suite/build.
- JSX files were reviewed but not build-validated in this environment.
- No browser test, live API test, database connection, deployment, or production change was performed.
- Existing online smoked-catfish checkout and Paystack payment verification were not intentionally redesigned. Review and test those flows in staging before deployment.

## Before production deployment

1. Install dependencies in a network-enabled environment.
2. Run backend tests and production builds for `frontend`, `admin`, and `vendor-portal`.
3. Test the admin house Sales Log and vendor Sales Log against a staging database.
4. Test that clicking a marketplace enquiry creates one `marketplaceEnquiry` record and opens WhatsApp even if logging fails.
5. Review the vendor farm-address migration in dry-run mode, back up the database, and only then decide whether to apply it.
6. Share the actual schema/data contract with Winnifred. External vendor marketplace enquiries remain distinct from vendor-reported sales and Elevoni's own catfish orders.
