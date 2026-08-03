NEON PEPPERS COA BUTTON FIX V16.3

FIXES
- Add COA button now calls the editor directly.
- COA editor loads products from Supabase if Admin has not loaded them yet.
- Clear error message if the COA table is missing.
- Clear error message if Supabase schema cache has not refreshed.
- Includes a safe COA repair SQL file.
- Keeps the direct product-ID page fix.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your existing config.js.
5. In Supabase SQL Editor, run:
   supabase-coa-repair-v16-3.sql
6. Commit and push in GitHub Desktop.
7. Wait for Netlify to deploy.
8. Refresh Admin with Ctrl + F5.
9. Open Admin → COAs → + Add COA.

No existing COAs are deleted by the repair script.
