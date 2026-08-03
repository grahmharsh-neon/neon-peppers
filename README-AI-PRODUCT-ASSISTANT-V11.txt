NEON PEPPERS AI PRODUCT ASSISTANT V11

WHAT IT ADDS
- Generate Description button on every product in Admin.
- Regenerate button when a description already exists.
- Draft is placed directly into the editable description box.
- The product is not automatically saved. Review the text and click Save Product.
- OpenAI API key stays in Netlify and is never exposed in browser code.
- Neutral research-only prompting.
- No dosing, administration, treatment, or personal-use instructions.
- Structured description:
  - Short card summary
  - Research Focus
  - Research Context
  - Product Information
  - Research Use Only

INSTALL WEBSITE FILES
1. Unzip this package.
2. Copy all files into:
   Documents\GitHub\neon-peppers
3. Choose Replace files.
4. Keep your existing config.js.
5. Commit and push in GitHub Desktop:
   Summary: Add AI product descriptions
6. Wait for Netlify to deploy.
7. Refresh admin.html with Ctrl + F5.

NETLIFY ENVIRONMENT VARIABLES
Open Netlify:
Site configuration → Environment variables

Add:

OPENAI_API_KEY
Paste your OpenAI Platform API key.

Optional:

OPENAI_MODEL
gpt-5-mini

After adding the variables:
1. Open Deploys.
2. Trigger a new deploy.
3. Open Admin → Products.
4. Enter the product name, category, and strength.
5. Click Generate Description.
6. Review or edit the draft.
7. Click Save Product.

SECURITY
- Never put OPENAI_API_KEY in config.js.
- Never commit the key to GitHub.
- API usage is billed through your OpenAI Platform account, separate from a ChatGPT subscription.

SUPABASE
No Supabase SQL changes are required for V11.
