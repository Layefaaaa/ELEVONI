const fs = require('fs');
const fixes = [
  ['C:/Users/User/Desktop/ELEVONI/vendor-portal/src/components/Layout/VendorLayout.jsx', /Elevoni Vendor Portal.*?dashboard\./s, 'Elevoni Vendor Portal — separate from the public storefront and admin dashboard.'],
  ['C:/Users/User/Desktop/ELEVONI/vendor-portal/src/pages/Dashboard/Dashboard.jsx', /Go to Apply to Sell.*???/s, '            Go to Apply to Sell ?'],
  ['C:/Users/User/Desktop/ELEVONI/vendor-portal/src/pages/Dashboard/Dashboard.jsx', /Go to Sign in.*???/s, '            Go to Sign in ?'],
  ['C:/Users/User/Desktop/ELEVONI/vendor-portal/src/pages/NotFound/NotFound.jsx', /The page.*?Portal\./s, '        <p className="vendor-page-summary">The page you’re looking for doesn’t exist in the Vendor Portal.</p>'],
  ['C:/Users/User/Desktop/ELEVONI/vendor-portal/src/pages/NotFound/NotFound.jsx', /Return to Dashboard.*???/s, '          Return to Dashboard ?'],
];
for (const [p,re,rep] of fixes) {
  try {
    let s = fs.readFileSync(p,'utf8');
    let ns = s.replace(re, rep);
    if (ns !== s) { fs.writeFileSync(p, ns); console.log('fixed', p); }
  } catch(e) { console.log('err', p, e.message); }
}
