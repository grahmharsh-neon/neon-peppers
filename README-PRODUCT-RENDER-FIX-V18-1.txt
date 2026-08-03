NEON PEPPERS PRODUCT RENDER FIX V18.1

EXACT ISSUE FIXED
product.js referenced #productLoading, but that element no longer existed.
That JavaScript error stopped the product details from rendering, so only
the Order Request section remained visible.

CHANGES
- Removed broken productLoading references.
- Product details now display after a successful Supabase lookup.
- Order Request section stays hidden until the product loads.
- Not Found page hides the product and Order Request sections.
- Removed duplicate hidden attributes.
- Added product.js cache version 18.1.

INSTALL
1. Unzip the package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep config.js.
5. Commit and push.
6. Wait for Netlify to deploy.
7. Hard refresh the homepage and product page with Ctrl + F5.
8. Click a product from the refreshed homepage.

No Supabase changes are required.
