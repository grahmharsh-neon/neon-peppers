NEON PEPPERS MARKDOWN DESCRIPTIONS V12

WHAT CHANGED
- AI descriptions are now generated as Markdown.
- Headings render as separate sections.
- Bullet points render as real lists.
- Paragraph spacing is preserved.
- Bold text renders correctly.
- Product cards show only the short opening summary.
- Full descriptions render in product details and popups.
- Admin now includes a Preview button.
- AI-generated descriptions automatically open in Preview.

SUPPORTED FORMATTING
## Section Heading

Regular paragraph text.

- Bullet point
- Bullet point
- Bullet point

**Bold text**

INSTALL
1. Unzip this package.
2. Copy all files into:
   Documents\GitHub\neon-peppers
3. Choose Replace files.
4. Keep your existing config.js.
5. Commit and push in GitHub Desktop:
   Summary: Add formatted product descriptions
6. Wait for Netlify to deploy.
7. Refresh admin.html and the public site using Ctrl + F5.

OPENAI
Your existing OPENAI_API_KEY remains unchanged.
The generator function prompt has been updated to return clean Markdown.

SUPABASE
No Supabase changes are required.
Existing descriptions remain compatible.
