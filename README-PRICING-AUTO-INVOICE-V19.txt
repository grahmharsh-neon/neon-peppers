NEON PEPPERS PRICING + AUTOMATIC INVOICE V19

PRICING
- Price entered in Admin now saves to Supabase.
- Price displays on the public product catalog.
- Price displays on the individual product page.
- Price displays on the Order Request list.
- Optional compare-at price and price note remain supported.

AUTOMATIC INVOICES
- Every submitted Order Request automatically creates a Draft Invoice.
- Customer information is copied into the invoice.
- Selected items, strengths, quantities, product prices, and totals are copied.
- Product prices are loaded from Supabase on the server.
- The Order Request record stores the invoice number and total.
- Admin Order Requests display the linked draft invoice number and total.
- The email notification includes the invoice number, prices, and total.
- The customer is not automatically charged.
- The invoice is not automatically emailed to the customer.

INSTALL
1. Unzip this package.
2. Copy all files into Documents\GitHub\neon-peppers.
3. Choose Replace files.
4. Keep your existing config.js.
5. Run supabase-pricing-auto-invoice-v19.sql in Supabase SQL Editor.
6. Commit and push in GitHub Desktop.
7. Wait for Netlify to deploy.
8. Hard refresh Admin, homepage, product pages, and Order Request with Ctrl + F5.

TEST
1. Enter and save a product price in Admin.
2. Confirm it appears on the catalog and product page.
3. Submit a test Order Request.
4. Open Admin → Order Requests.
5. The request should show its Draft Invoice number and Invoice Total.
