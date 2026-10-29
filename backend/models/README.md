# Canonical data models

Active API code uses `userModel.js` (Mongoose model name `user`) for authentication and `vendorProfileModel.js` (model name `vendorProfile`) for vendor applications, approval state, and farmer location. `Product.js` references `vendorProfile`.

`User.js` and `Vendor.js` are legacy schema files and are not imported by active backend routes/controllers/services. They are intentionally retained for now: removing or redirecting them without checking deployed collections and external scripts could break existing data or consumers. Do not use them for new features. A safe cleanup requires checking the live database and any deployment/migration scripts first.

The active vendor profile keeps the older `location`, `state`, and `lga` fields for compatibility and also exposes a structured `farmAddress` snapshot. `backend/migrations/backfillVendorFarmAddress.js` defaults to a dry run; use `--apply` only after reviewing its output and taking a database backup.
