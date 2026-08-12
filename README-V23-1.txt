NEON PEPPERS V23.1

FIXED
- Completely removes the public.products_variants / product_variants dependency.
- No product_variants table is required.
- Fixes the schema-cache error caused by that missing table.

PRODUCT SIZE WORKFLOW
Admin now has four selectable size boxes:
- 5 mL
- 10 mL
- 20 mL
- 30 mL

You do NOT type the sizes.
Click the sizes that apply to each product.
Use Select All to choose all four at once.

STORAGE
Products use two fields:
- option_label = Size
- option_values = text array containing selected sizes

PRODUCT PAGE
Shows Size and all selected values.

ORDER REQUEST
Shows a Size dropdown populated from the selected Admin sizes.

INVOICES
The selected size continues to use the existing order item option/strength field
for backward compatibility with existing invoices.

SUPABASE
Run:
supabase-v23-1-product-options.sql

It adds only:
- products.option_label
- products.option_values

INSTALL
1. Copy all files into your Neon Peppers project.
2. Keep config.js.
3. Run supabase-v23-1-product-options.sql.
4. Commit and push.
5. Hard refresh with Ctrl + F5.
