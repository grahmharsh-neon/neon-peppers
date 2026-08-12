NEON PEPPERS V24 — PRODUCT LIFECYCLE

PRODUCT LIFECYCLE
Each product has a separate lifecycle status:
- Draft
- Inventory
- Published
- Archived

This is separate from the existing availability status
(Available / Low Stock / Out of Stock / Coming Soon).

IMPORTANT DEFAULTS
Existing products are migrated to Published so your current catalog stays live.
New products created in Admin default to Draft.
New products created from Bulk COA default to Draft and Hidden.

PUBLIC WEBSITE
Only products with:
- lifecycle_status = published
- visible = true
appear on:
- Product Catalog
- Product Search
- Product Pages
- Order Request

DRAFT
Use while building the listing.
Not public or orderable.

INVENTORY
Use when you have stock/COAs but do not want the product listed publicly.
Not public or orderable.

PUBLISHED
Public and orderable.

ARCHIVED
Removed from public site while keeping historical records.

PRODUCT ADMIN
Adds lifecycle tabs with counts:
- All
- Draft
- Inventory
- Published
- Archived

Each product has:
- Save Product
- Publish Product
- Inventory
- Draft
- Archive

PUBLISH CHECKLIST
Publish Product requires:
- Product image
- Description
- Price greater than $0
- At least one Size
- COA
- Category

If anything is missing, Admin tells you exactly what is missing.

DASHBOARD — NEEDS ATTENTION
Shows:
- Missing Image
- Missing COA
- Missing Price
- Missing Description
- No Sizes
- Low Inventory

Clicking one opens Products filtered to items needing that work.

BULK COA
When + Add New Product is used from Bulk COA:
- Product is created as Draft
- visible = false
- COA can be attached immediately
- It will NOT appear on the public site until Publish Product is clicked

SUPABASE
Run:
supabase-v24-product-lifecycle.sql

INSTALL
1. Copy all files into your Neon Peppers project.
2. Keep config.js.
3. Run supabase-v24-product-lifecycle.sql in Supabase SQL Editor.
4. Commit and push.
5. Wait for Netlify.
6. Hard refresh with Ctrl + F5.

V24 does not delete existing products, COAs, order requests, invoices,
customers, referrals, coupons, merch, or uploaded files.
