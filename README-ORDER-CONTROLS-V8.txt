NEON PEPPERS ORDER FORM CONTROLS V8

FIXES
- Verification button text is white.
- Submit Order Request button text is white.
- Research confirmation checkbox is aligned correctly.
- Admin now has an Order Form Items section.
- Form-only items do not have to appear in the public product catalog.
- Form-only items support categories, descriptions, image URLs, strengths,
  stock status, visibility, and sort order.

INSTALL
1. Copy all files into Documents\GitHub\neon-peppers.
2. Keep your current config.js.
3. In Supabase SQL Editor, run:
   supabase-order-form-controls-v8.sql
4. Commit and push in GitHub Desktop.
5. Refresh /admin.html and /order.html with Ctrl + F5.

ADMIN USE
1. Open Admin.
2. Click Order Form Items.
3. Click + Add Form Item.
4. Enter the item name, category, description, and optional image URL.
5. Save the item.
6. Add one or more strengths.
7. Set stock status and visibility.
