NEON PEPPERS V25.0 — PRODUCT CATALOG CLEANUP

SORTING RULE
Products that are actually in stock ALWAYS appear above unavailable products.

An in-stock product is:
- stock_count > 0
- status is not Out of Stock
- status is not Coming Soon

DEFAULT ORDER
1. Featured + In Stock
2. Other In Stock
3. Featured unavailable products
4. Other unavailable products

When customers choose Name or Newest sorting, the in-stock-first rule still wins.

CATALOG CARD CLEANUP
Removed from catalog card:
- Description paragraph
- Product tags
- Extra category icon

The full description remains on the individual product page.

Catalog card now emphasizes:
- Image
- Product name
- Category
- Available sizes
- Price
- In Stock / Out of Stock / Coming Soon
- View Product

STATUS FIX
Corrected the previous reversed Out of Stock / Coming Soon display logic.

OUT OF STOCK
Out-of-stock products stay visible but automatically move to the bottom and are slightly muted.
When inventory returns, the product automatically moves back into the in-stock group.

NO SUPABASE CHANGES REQUIRED.

INSTALL
1. Replace project files with this package.
2. Keep config.js.
3. Commit and push.
4. Hard refresh the public site with Ctrl + F5.
