NEON PEPPERS V25.2.2 — FULL WIDTH RESEARCH PRODUCTS FIX

FIXED FROM SCREENSHOT
The product grid was technically four columns, but the parent catalog container
was constrained to a narrow width. That squeezed every product card into a
skinny vertical strip.

V25.2.2 fixes the parent layout, not just the grid columns.

DESKTOP
- Catalog uses the full available page width
- Maximum content width: 1600px
- 4 normal-width cards on large screens
- 3 cards on smaller desktop
- Larger product image area
- No skinny card columns

TABLET / MOBILE
- 2 cards on tablet
- 1 card on mobile
- No horizontal overflow

FILTERS
- Search + sort have their own row
- Category filters sit above the product grid
- Controls no longer take width away from product cards

KEPT
- Homepage has no product catalog
- Research Products has its own /products.html page
- In-stock products always sort first
- Featured priority remains
- Out-of-stock products remain at the bottom
- Product detail pages remain unchanged

NO SUPABASE CHANGES REQUIRED.

INSTALL
1. Replace project files.
2. Keep config.js.
3. Commit and push.
4. Hard refresh /products.html using Ctrl + F5.
