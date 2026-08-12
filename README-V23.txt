NEON PEPPERS V23

PURPOSE
V23 stabilizes the site after many incremental patches and fixes the
"renderProducts is not defined" Admin error.

CORE CHANGES
- Adds /js/neon-core.js for shared browser utilities.
- Moves the Admin product renderer into /js/admin-products.js.
- Restores renderProducts, addProduct, escapeHtml,
  setDescriptionGenerationStatus, and toggleDescriptionPreview.
- Keeps the existing Admin, Invoice Center, Customer CRM, Growth Tools,
  Customer Portal, COAs, Merch, Order Requests, pricing, and descriptions.
- All JavaScript files pass node --check before packaging.

PRODUCT OPTIONS
V23 uses your existing product_variants table instead of adding another
option-values table.

Each product now has:
- Product Option Label (default: Size)
- Options stored in product_variants

Example:
Size
- 5 mL
- 10 mL
- 20 mL
- 30 mL

The Admin includes an "Add 5/10/20/30 mL" preset button.

The database still stores each selected option in the existing "strength"
field on order/invoice records for backward compatibility, but customers
see the configured Product Option Label.

SUPABASE
Run:
supabase-v23-product-options.sql

This adds only:
products.option_label

No other new product columns are required.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your current config.js.
5. Run supabase-v23-product-options.sql in Supabase SQL Editor.
6. Commit and push.
7. Wait for Netlify.
8. Hard refresh Admin with Ctrl + F5.

TEST
1. Open /admin.html#productsPanel
2. Confirm Products render without a renderProducts error.
3. Add or edit a product.
4. Save it.
5. Click "Add 5/10/20/30 mL".
6. Open the public product page.
7. Open Order Request and confirm the selector says Size.

DIAGNOSTICS
/diagnostics.html

V23 does not delete existing products, order requests, invoices, customers,
COAs, merch, coupons, referrals, or stored images.
