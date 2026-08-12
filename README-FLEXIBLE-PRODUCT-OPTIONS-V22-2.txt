NEON PEPPERS FLEXIBLE PRODUCT OPTIONS V22.2

The fixed Strength field is replaced with a flexible Product Option system.

Example:
Product Option Label: Size
Available Options: 5 mL, 10 mL, 20 mL, 30 mL

Other examples:
Apparel -> Size: S, M, L, XL, XXL
Accessory -> Color: Black, White, Pink
No options -> leave Available Options empty.

Run supabase-flexible-product-options-v22-2.sql in Supabase.
Existing strength values are migrated into Size automatically.

INSTALL
1. Copy files into your project.
2. Keep config.js.
3. Run the SQL migration.
4. Commit and push.
5. Hard refresh with Ctrl + F5.
