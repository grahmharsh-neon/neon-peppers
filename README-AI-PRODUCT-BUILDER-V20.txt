NEON PEPPERS AI PRODUCT BUILDER V20

WHAT IT DOES
- Adds an AI Build Product button to each product in Admin.
- Generates the product description in the established Neon Peppers format.
- Creates a matching vial image from one approved vial image template.
- Reuses the exact approved bottle, lighting, camera angle, background, and shadow.
- Replaces only the label area with:
  Neon Peppers
  Research Peptides
  Product name
  Strength
  Research-use disclaimer
- Uploads the completed vial image to Supabase Storage.
- Saves the description and image to the product automatically.

WHY IT USES A TEMPLATE
A locked approved image gives more consistent results than generating a new bottle
from scratch each time. It also keeps product names and strengths spelled correctly.

SETUP
1. Copy all files into Documents\GitHub\neon-peppers.
2. Keep config.js.
3. Run supabase-ai-product-builder-v20.sql in Supabase SQL Editor.
4. Commit and push.
5. Refresh Admin with Ctrl + F5.
6. Open Admin → Contact & Settings.
7. Upload one approved vial image from your Vial Images set.
8. Click Save Settings.

USE
1. Open Admin → Products.
2. Add the product name, strength, and category.
3. Click AI Build Product.
4. The description and matching vial image are created and saved automatically.

OPENAI
Uses the existing OPENAI_API_KEY and OPENAI_MODEL Netlify variables.
Only the description uses the OpenAI API.
The vial photo is built from your approved template for exact visual consistency.

IMPORTANT
Use a straight-on approved vial image with the label centered.
The builder places the new label over the center of the existing label.
