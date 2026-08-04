NEON PEPPERS BLACK LABEL IMAGE FIX V20.4

EXACT ISSUE FIXED
The previous image builder drew a cream/white rectangle over the approved
black vial label. That caused the generated image to look different from
the uploaded template.

NEW BEHAVIOR
- Keeps the exact approved black-label vial image.
- Keeps the bottle, cap, Neon Peppers logo, icons, warnings, EXP strip,
  lighting, reflection, and black background.
- Replaces only the large product-name area.
- Keeps LYOPHILIZED POWDER and ≥ 99% PURITY beneath the product name.
- Does not create a white or cream box.
- Product strength is not printed on the front because the approved template
  style does not display strength there.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep config.js.
5. Commit and push.
6. Wait for Netlify to deploy.
7. Hard refresh Admin with Ctrl + F5.
8. Generate a new product image.

No Supabase changes are required.
Existing images are not changed automatically. Regenerate them from Admin.
