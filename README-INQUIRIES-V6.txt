NEON PEPPERS INQUIRY SYSTEM V6

WHAT IT DOES
- Replaces mailto-only contact with a real inquiry form
- Saves every inquiry to Supabase
- Sends an email notification to neonpeppers@gmail.com
- Adds an Inquiries section to the admin dashboard
- Lets you search, filter, reply, mark replied, close, and delete inquiries
- Auto-fills the product on dedicated product pages
- Includes a research-use acknowledgment and simple spam honeypot
- Keeps the Resend API key and Supabase service-role key server-side

INSTALL WEBSITE FILES
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your existing config.js.
5. In Supabase SQL Editor, run supabase-inquiries-v6.sql.
6. Commit and push with GitHub Desktop:
   Summary: Install inquiry system
7. Wait for Netlify to publish.

SET NETLIFY ENVIRONMENT VARIABLES
In Netlify, open:
Site configuration → Environment variables

Add these variables:

INQUIRY_EMAIL
neonpeppers@gmail.com

SUPABASE_URL
Your Supabase project URL

SUPABASE_SERVICE_ROLE_KEY
Your Supabase service-role/secret key
NEVER put this value in config.js or GitHub.

RESEND_API_KEY
Your Resend API key

RESEND_FROM
Neon Peppers <inquiries@your-verified-domain.com>

RESEND SETUP
1. Create a Resend account.
2. Verify a sending domain.
3. Create an API key.
4. Add the API key and verified sender to Netlify.
5. Trigger a new Netlify deploy after adding the environment variables.

TEST
1. Open the public Contact section.
2. Submit a test inquiry.
3. Confirm it appears in /admin.html → Inquiries.
4. Confirm the notification reaches neonpeppers@gmail.com.

IMPORTANT
If Resend is not configured, the inquiry will still be saved in Supabase, but no email notification will be sent.
