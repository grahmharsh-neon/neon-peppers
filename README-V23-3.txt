NEON PEPPERS V23.3

BULK COA FLOW
The bulk COA workflow is simplified.

1. Click Bulk Upload.
2. Select all COA files.
3. For each file:
   - Select an existing product, OR
   - Choose + Add New Product.
4. Optionally select Size.
5. Click Upload All.

You no longer need to enter a lot number for every bulk file.
A lot identifier is automatically generated from the filename.

ADD NEW PRODUCT FROM BULK COA
Choosing + Add New Product prompts for the product name.
The product is created immediately with:
- Category: Research Compound
- Option Label: Size
- Sizes: 5mg, 10mg, 20mg, 30mg
- Visible: Yes

PRODUCT ADMIN SIZES
Default selectable sizes are now:
- 5mg
- 10mg
- 20mg
- 30mg

No typing is needed for these defaults.

You can also enter any new custom size in:
Add New Size

Example:
15mg

Custom sizes are saved directly to that product and become available on:
- Product page
- Order Request
- COA Admin

SUPABASE
Run:
supabase-v23-3-size-update.sql

This:
- Ensures option_label and option_values exist.
- Converts the old default 5 mL / 10 mL / 20 mL / 30 mL values to mg.

INSTALL
1. Copy all files into your Neon Peppers project.
2. Keep config.js.
3. Run supabase-v23-3-size-update.sql.
4. Commit and push.
5. Hard refresh with Ctrl + F5.
