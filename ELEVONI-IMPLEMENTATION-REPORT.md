# Elevoni implementation report

## Project audit

The supplied archive contained 433 entries and was extracted without replacing the existing architecture.

- `frontend/`: customer-facing React 19 + Vite application, React Router, StoreContext, PWA and Capacitor Android project.
- `admin/`: separate React/Vite admin application with authenticated admin routes.
- `vendor-portal/`: separate React/Vite vendor portal with dashboard, sales, login and application routes.
- `backend/`: Express API, MongoDB/Mongoose models, JWT authentication, ordering, Paystack payment, marketplace and vendor routes.
- `shared/`: shared category definitions and adapters.

Important customer routes verified in `frontend/src/App.jsx`:
- `/` home
- `/marketplace` marketplace discovery
- `/sell-with-elevoni` vendor onboarding/application
- `/cart`, `/order`, `/myorders`, `/success`
- `/product/:id`, category routes, and informational pages

The checkout in `frontend/src/pages/PlaceOrder/PlaceOrder.jsx` is authenticated, uses the existing cart and quote APIs, and has Paystack and WhatsApp/manual-order branches. The backend `/api/user/me` endpoint already uses authentication middleware. The existing MongoDB user schema did not have a saved delivery profile.

The Android application ID and namespace are `com.elevoni.farms`. The Capacitor-generated `android/app/src/main/assets/public` web bundle was excluded from delivery because it would otherwise be a stale pre-change build; `npx cap sync android` regenerates it from the updated frontend source. Existing PWA icons were present, but the manifest referenced a missing `/icons/elevoni-512.png`. Existing Android launcher PNGs were the default Capacitor artwork. The existing splash artwork was available at `frontend/assets/splash.png`.

## Implemented

### Mobile experience
- Added a fixed four-item mobile navigation: Home, Explore, Sell and Account.
- Explore uses `/marketplace`; Sell uses `/sell-with-elevoni`; authenticated Account opens `/myorders`; unauthenticated Account opens the existing login popup.
- Preserved the existing desktop navbar.
- Hid the large footer at mobile widths while preserving the desktop footer.
- Added mobile bottom clearance and safe-area-aware bottom navigation padding.
- Added `min-width: 0` safeguards to root/application wrappers.

### Branding and system UI
- Changed the document and PWA theme colour to white.
- Set the PWA launch background colour to Elevoni sage.
- Configured Android themes for a white status bar and dark status-bar icons without changing the Android navigation bar colour.
- Reused the existing Elevoni splash artwork for native Android splash density resources.
- Updated Android launcher resources using the existing Elevoni PWA icon artwork.
- Added the missing 512px PWA icon.
- Kept the existing application ID and Capacitor app name unchanged.
- Set the Capacitor splash minimum display duration to zero to avoid an artificial delay.

### Saved checkout information
- Added a private `checkoutProfile` subdocument to the existing user model.
- Added `PUT /api/user/checkout-profile`, protected by JWT authentication and the customer role.
- The endpoint only accepts an allowlist of checkout fields and derives the user identity from the verified JWT; it does not accept a client-supplied user ID.
- Extended the authenticated `/api/user/me` response to include the current user's saved checkout profile.
- Checkout now pre-fills saved fields and offers an opt-in checkbox to save/update the information.
- If profile saving fails, the order flow can continue. Existing Paystack initialization, payment verification and manual WhatsApp order submission were left in place.
- Guest checkout remains as it was: the existing checkout requires login, so no insecure guest persistence was added.

### Marketplace and contact
- Centralised the enquiry number in `frontend/src/config/contact.js`.
- Customer-facing WhatsApp links now use `2348163303950`; the footer displays `08163303950` and uses a `tel:` link.
- Updated product video thumbnails to seek to the opening frame after metadata loads and display a fallback if the preview fails.

## Files changed

### Frontend
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/index.html`
- `frontend/capacitor.config.json`
- `frontend/public/manifest.webmanifest`
- `frontend/public/icons/elevoni-512.png` (new)
- `frontend/src/config/contact.js` (new)
- `frontend/src/components/MobileBottomNav.jsx` (new)
- `frontend/src/components/MobileBottomNav.css` (new)
- `frontend/src/components/Footer/Footer.jsx`
- `frontend/src/components/Footer/Footer.css`
- `frontend/src/components/VendorStatusCard/VendorStatusCard.jsx`
- `frontend/src/pages/PlaceOrder/PlaceOrder.jsx`
- `frontend/src/pages/PlaceOrder/PlaceOrder.css`
- `frontend/src/pages/ItemDetails/ItemDetails.jsx`
- `frontend/src/pages/ItemDetails/ItemDetails.css`
- `frontend/src/pages/Category/CategoryPage.jsx`
- `frontend/src/pages/MyOrders/MyOrders.jsx`
- `frontend/src/utils/marketplace.js`
- `frontend/tests/contact.test.js` (new)
- Android resources under `frontend/android/app/src/main/res/`
- `frontend/android/app/src/main/assets/capacitor.config.json`

### Backend
- `backend/models/userModel.js`
- `backend/controllers/userController.js`
- `backend/routes/userRoute.js`
- `backend/services/checkoutProfile.js` (new)
- `backend/tests/checkout-profile.test.js` (new)

No dependency versions or package manifests were changed. Admin and vendor portal source were not redesigned or rewritten.

## Validation

Passed:
- JavaScript syntax checks for the changed backend and frontend utility files.
- JSX/TSX syntax parsing of all frontend, admin and vendor portal `.jsx` source files using the installed TypeScript parser.
- 38 focused existing and new backend/shared tests.
- 75 focused frontend/shared tests, including the new contact-number test.
- Manifest JSON parsing and verification that all three referenced PWA icon files exist.
- Search of customer-facing source for the old enquiry phone number: no old-number matches remain.

Not completed:
- Full Vite production builds, ESLint runs and the full dependency-backed test suites. Dependencies were not present in the supplied archive; `npm ci` could not complete in this environment because package registry downloads timed out / were unavailable.
- Android Gradle build and physical-device verification. Java 21 is present, but Android SDK/ADB tooling is not available in this environment.
- Live browser/device responsive testing and horizontal-overflow measurements. Static inspection found no `100vw` use in the frontend source CSS; the existing global `overflow-x: hidden` rule was not treated as the fix. Actual device testing is still required.
- iOS Home Screen splash artwork cannot be guaranteed by the web manifest alone. iOS controls its Home Screen launch screen behaviour differently from Android; the white status-bar appearance is configured through the existing Apple PWA metadata, while the OS may use its generated launch screen unless device-specific startup images are supplied.

## Local build and Android sync

From the project root, install dependencies separately in each app:

```bash
cd frontend && npm ci && npm run build && npx cap sync android
cd ../backend && npm ci
cd ../admin && npm ci
cd ../vendor-portal && npm ci
```

Then open `frontend/android` in Android Studio and build/run the existing app. Run the frontend build and Capacitor sync first; the generated Android web bundle is intentionally not included in the ZIP. Do not change the `com.elevoni.farms` application ID.

Before deployment, test saved-profile retrieval and updates with two separate customer accounts, and verify that one account cannot read or overwrite another account's profile.
