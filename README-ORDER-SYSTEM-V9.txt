NEON PEPPERS ORDER SYSTEM V9

WHAT CHANGED
- Rebuilt the order page as a Quick Order list.
- Order items are completely independent from public Products.
- Admin has a dedicated Order Form section.
- Add, edit, hide, delete, and sort order items.
- Add unlimited strengths to each order item.
- Set each strength to Available, Low Stock, Out of Stock, or Coming Soon.
- White text is forced on Enter Research and Send Order Request buttons.
- The research confirmation checkbox is aligned correctly.
- Order requests save to Supabase.
- Order requests can still send email through the existing Netlify function setup.

INSTALL
1. Unzip this package.
2. Copy every file into:
   Documents\GitHub\neon-peppers
3. Choose Replace files.
4. Keep your existing config.js.
5. In Supabase SQL Editor, run:
   supabase-order-system-v9.sql
6. In GitHub Desktop:
   Summary: Rebuild order system V9
   Commit to main
   Push origin
7. Wait for Netlify to publish.
8. Refresh:
   https://neonpeppers.com/admin.html
   https://neonpeppers.com/order.html
   Use Ctrl + F5.

ADMIN USE
1. Open Admin.
2. Click Order Form.
3. Click + Add Order Item.
4. Edit the item.
5. Add or edit strengths.
6. Set stock status.
7. Save the item and strengths.
8. Change Sort Order to control the order shown on the public form.

IMPORTANT
This is an order request system. It does not process payments or automatically approve fulfillment.
