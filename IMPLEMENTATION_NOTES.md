# Elevoni consolidated implementation notes

## Included

- Customer-facing top-level category cards are limited to Aquaculture & Fishery and Livestock. Other Farm Products remains reserved rather than appearing as an active shop category.
- Smoked catfish remains connected to the existing catalogue and cart/checkout flow.
- Livestock subcategories (poultry, cattle, sheep, goats) are filterable in the marketplace. Empty inventory is represented honestly; no sample listings were added.
- Vendor product records support ordered image/video media entries while retaining the legacy `images` array for compatibility.
- Approved vendors can upload multiple product images/videos through the vendor portal, preview them, choose a primary image, reorder and remove media, and see upload progress/errors.
- Marketplace product details can display media galleries, swipe on touch screens, vendor business name/location/description, and the approved vendor application status. Public vendor responses omit contact names and contact channels.
- Marketplace product detail pages remain enquiry-based. The existing checkout/Paystack flow remains for Elevoni's smoked-catfish catalogue; livestock listings are not represented as paid orders until a separate fulfilment/payment process is approved and implemented.
- Password visibility toggles were added to the customer login, vendor application, vendor login/application, and admin login password fields.
- Vendor application form validation includes field-level errors and a linked error summary to help users find and correct invalid fields.

## Required deployment configuration

### Vendor image/video uploads

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend hosting environment. Uploads will return a configuration error until these are set. Images are limited to 10 MB each; videos are limited to 50 MB each; a listing supports up to 10 media items.

### Password recovery email

Set `RESEND_API_KEY`, `PASSWORD_RESET_FROM` (verified sender), and `FRONTEND_URL` in the backend hosting environment. Without these values, the recovery endpoint returns a service-unavailable response rather than pretending an email was sent. See `PASSWORD_RECOVERY_SETUP.md`.

## Verification performed in this environment

- Shared taxonomy/adapter tests: passed (26 tests).
- Storefront category configuration/view-model tests: passed (13 tests).
- JavaScript/ES module syntax checks for backend/shared files: passed.
- TypeScript parser syntax check for 57 JSX/TSX files: passed.
- Full frontend rendering tests and production builds could not be run because npm dependencies could not be installed in the environment (the offline npm cache lacks at least one required package). These must be run after installing dependencies locally or in CI.
- Cloudinary uploads, Resend delivery, MongoDB integration, Paystack payments, and deployed mobile-browser behaviour require live environment configuration and have not been claimed as tested here.

## Operational follow-up

1. Configure the Cloudinary and Resend environment variables on the backend host.
2. Install dependencies in each app and run its build/lint/test scripts.
3. Test uploads with representative image/video files, including invalid formats and oversize files.
4. Test password recovery for unknown email, expired/reused token, and successful password reset.
5. Test approved/unapproved vendor permissions against the deployed API.
6. Define and validate livestock order acceptance, payment timing, delivery responsibility, cancellations, and dispute handling before enabling a livestock cart/checkout.
