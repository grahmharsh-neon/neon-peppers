NEON PEPPERS GROWTH PLATFORM V22

BUILT FEATURES
1. Dashboard 2.0
6. Customer Portal
13. Coupon Codes
14. Referral Program

DASHBOARD 2.0
- Requests today
- Draft invoices
- Paid this month
- Low inventory
- Customer count
- Missing COAs
- Active coupons
- Referral credits
- Recent activity
- Quick links to Invoice Center, CRM, Growth Tools, and COA Admin

CUSTOMER PORTAL
Public page:
https://neonpeppers.com/customer-portal.html

Customers enter their email and receive a secure link that expires in 30 minutes.
The portal includes:
- Request history
- Invoice history
- Print/view invoices
- Matching public COAs
- Referral code
- Referral link
- Referral credit balance

COUPON CODES
Admin page:
https://neonpeppers.com/growth-admin.html

- Percent or fixed discounts
- Minimum subtotal
- Usage limit
- Start and end dates
- Active/inactive status
- Usage tracking
- Coupon applied automatically to draft invoice

REFERRAL PROGRAM
- Every customer receives a referral code
- Referral links prefill the Order Request form
- Referrals are tracked in Admin
- Default reward is $20
- Credit is awarded automatically when the referred invoice is marked Paid
- A customer can only qualify as a referred customer once
- Self-referrals are ignored

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your current config.js.
5. In Supabase SQL Editor, run:
   supabase-growth-platform-v22.sql
6. Commit and push in GitHub Desktop.
7. Wait for Netlify to deploy.
8. Hard refresh Admin and the public site with Ctrl + F5.

REQUIRED EXISTING FEATURES
- Invoice Workflow V21.4
- Customer CRM V21.5

NETLIFY ENVIRONMENT VARIABLES
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
INQUIRY_EMAIL
PUBLIC_SITE_URL=https://neonpeppers.com

IMPORTANT
The customer portal uses secure emailed tokens and does not give customers
direct authenticated access to your Supabase Admin tables.
