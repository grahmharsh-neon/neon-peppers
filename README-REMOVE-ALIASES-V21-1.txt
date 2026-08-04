NEON PEPPERS REMOVE ALIASES V21.1

FIX
- Removes Aliases / Search Terms from the product editor.
- Removes aliases from product saving.
- Removes aliases from Admin and public search.
- The website no longer expects the products.aliases column.
- Existing aliases columns can remain; they are ignored.
- Other optional V21 fields remain optional.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep config.js.
5. Commit and push.
6. Hard refresh Admin and the public site with Ctrl + F5.

SUPABASE
No new SQL is required just to remove the error.

If you have not run the V21 migration yet, use the updated:
supabase-core-upgrade-v21.sql

The aliases column is not created or required.
