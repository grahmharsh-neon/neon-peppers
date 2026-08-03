NEON PEPPERS PRODUCT + ORDER FIX V14.2

FIXES
- Clicking a product opens the product detail popup again.
- Product cards no longer send visitors directly to the Order Request page.
- The Order Request page now automatically loads visible products from the products table.
- Product strengths load from product_variants.
- If no variants exist, the product's existing strength field is used.
- Hidden products do not appear on the order form.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your existing config.js.
5. Commit and push in GitHub Desktop.
6. Refresh the website with Ctrl + F5.

SUPABASE
No new SQL is required.
The order form uses your existing products and product_variants tables.
