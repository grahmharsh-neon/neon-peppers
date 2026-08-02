MERCH BUTTON FIX V10.1

1. Copy these files over your existing Neon Peppers project.
2. Keep your existing config.js.
3. In Supabase SQL Editor, run:
   supabase-merch-repair-v10-1.sql
4. Commit and push in GitHub Desktop.
5. Refresh admin.html with Ctrl + F5.
6. Open Admin → Merch → + Add Merch Item.

The Add Merch Item button now calls the function directly and shows a useful error if the Supabase merch tables are missing.
