NEON PEPPERS PRODUCT LINK FIX V16.1

FIX
- Product links now include the Supabase product ID.
- URLs remain readable:
  /products/nr-rt3?id=<product-id>
- The product page loads by ID first.
- Product name/slug lookup remains as a fallback.
- Related product links also include their product IDs.
- This prevents “Research Material Not Found” when a product name or slug varies.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your current config.js.
5. Commit and push in GitHub Desktop.
6. Wait for Netlify to deploy.
7. Refresh the homepage and product page with Ctrl + F5.

No Supabase changes are required.
