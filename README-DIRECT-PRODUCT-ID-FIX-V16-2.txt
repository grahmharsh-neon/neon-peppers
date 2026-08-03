NEON PEPPERS DIRECT PRODUCT ID FIX V16.2

WHAT CHANGED
- Product cards no longer use /products/product-name.
- Product cards now open:
  /product.html?id=SUPABASE-PRODUCT-ID
- This bypasses Netlify slug redirects and product-name matching.
- The product page loads the exact Supabase record by UUID.
- Related-product cards use the same direct ID method.
- Legacy /products/product-name links still attempt a fallback lookup.
- Hidden page states are enforced so the Not Found section cannot appear with a valid product.

INSTALL
1. Unzip the package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your existing config.js.
5. Commit and push in GitHub Desktop.
6. Wait for Netlify to publish.
7. Open the homepage and hard refresh with Ctrl + F5.
8. Click a product from the homepage.

IMPORTANT
Test by clicking a product from the refreshed homepage. An old bookmarked URL such as
/products/nr-rt3 may still be cached. New clicks will use product.html?id=...
No Supabase changes are required.
