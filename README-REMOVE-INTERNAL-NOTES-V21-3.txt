NEON PEPPERS REMOVE INTERNAL NOTES V21.3

FIX
- Removes Internal Notes from the product editor.
- Removes internal_notes from product saving.
- Removes internal_notes from new-product defaults.
- The website no longer expects products.internal_notes.
- Existing internal_notes columns may remain safely and are ignored.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep config.js.
5. Commit and push.
6. Hard refresh Admin with Ctrl + F5.

SUPABASE
No new SQL is required just to remove this error.

If you have not run the V21 migration yet, use the updated:
supabase-core-upgrade-v21.sql
