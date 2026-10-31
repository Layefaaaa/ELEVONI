# Elevoni PWA validation checklist

Use this checklist after installing dependencies and building the customer frontend. These checks are not a substitute for testing real ordering and payment flows.

## Build and preview

From the `frontend` directory:

```bash
npm ci
npm run build
npm run preview
```

Open the local preview URL shown by Vite. Service workers and install prompts should be tested over HTTPS or localhost, not a plain LAN HTTP address.

## Browser checks

1. Open DevTools → Application (Chrome/Edge) → Manifest. Confirm the app name, standalone display mode, and all three icon files load without errors.
2. In DevTools → Application → Service Workers, confirm `/sw.js` installs and activates successfully.
3. Reload once after the service worker activates. Confirm there are no missing JavaScript or CSS files in the Network panel.
4. Use the browser's install option or the page's install guidance. Confirm the installed app opens in a standalone window.
5. With the app loaded once online, switch DevTools Network to Offline and navigate to a page. The cached app shell should load; live catalogue/account/order/payment actions are expected to require a connection.
6. Restore the network and verify browsing, login, product detail, cart, order placement, Paystack verification, and marketplace enquiry behavior.

## Device checks

- Android: test current Chrome and the installed app on a physical device if available.
- iPhone/iPad: open the site in Safari and use Share → Add to Home Screen; iOS does not expose the same install prompt event as Chromium browsers.
- Confirm the icon looks correct in the launcher and that safe-area content is not clipped.

## Do not deploy until

- `npm run build` succeeds.
- The service worker has no install/activation errors.
- Existing checkout and authentication flows still work online.
- You have confirmed that offline behavior is limited to the app shell/static assets and does not imply that orders or payments work offline.
