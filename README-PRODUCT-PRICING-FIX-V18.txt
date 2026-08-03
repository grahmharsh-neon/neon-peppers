NEON PEPPERS PRODUCT PRICING + PAGE FIX V18

ADDS
- Editable product price in Admin
- Optional compare-at price
- Optional price note such as "per vial"
- Prices shown on product cards
- Prices shown on individual product pages
- Prices shown on the Order Request page
- Order cart shows estimated line totals

FIXES
- Product pages load by exact Supabase product ID
- Slug lookup remains as a fallback
- Hidden product-page states are enforced
- Related products still open individual product pages

INSTALL
1. Copy all files into Documents\GitHub\neon-peppers.
2. Keep config.js.
3. Run supabase-product-pricing-v18.sql in Supabase SQL Editor.
4. Commit and push.
5. Refresh the homepage, Admin, Order Request, and product pages with Ctrl + F5.

ADMIN
Open Admin → Products and enter:
- Price
- Compare-at Price
- Price Note

No existing products are deleted.
