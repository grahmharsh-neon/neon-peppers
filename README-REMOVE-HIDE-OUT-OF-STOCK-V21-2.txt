NEON PEPPERS REMOVE HIDE-WHEN-OUT-OF-STOCK V21.2

FIX
- Removes Hide When Out of Stock from the product editor.
- Removes it from product saving.
- Removes it from catalog filtering.
- Removes it from the Order Request product loader.
- The website no longer expects products.hide_when_out_of_stock.
- Existing columns can remain safely; they are ignored.

OUT-OF-STOCK BEHAVIOR
Products can still show an Out of Stock status using:
- stock_count
- status

They will remain visible in the catalog unless you manually hide the product
using the existing Visible setting.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep config.js.
5. Commit and push.
6. Hard refresh Admin, catalog, and Order Request with Ctrl + F5.

No Supabase update is required just to remove this error.

If you have not run the V21 migration, use the updated:
supabase-core-upgrade-v21.sql
