NEON PEPPERS INVOICE WORKFLOW V21.4

ADDED
- Standalone Invoice Center at /invoice-admin.html
- Draft, Sent, Paid, and Void statuses
- Edit customer information and invoice items
- Discount, shipping, tax, due date, customer notes, and private notes
- Save and send invoices by email
- Print or save invoices as PDF
- Duplicate invoices
- Create manual invoices
- Open the matching invoice from each Order Request
- Create invoices for older Order Requests
- New Order Requests automatically create a Draft Invoice
- Customer confirmation email and Admin notification email

INSTALL
1. Copy all files into Documents\GitHub\neon-peppers.
2. Keep config.js.
3. Run supabase-invoice-workflow-v21-4.sql in Supabase SQL Editor.
4. Commit and push.
5. Hard refresh Admin and Invoice Center with Ctrl + F5.

INVOICE CENTER
https://neonpeppers.com/invoice-admin.html

ENVIRONMENT VARIABLES
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
INQUIRY_EMAIL
