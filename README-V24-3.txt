NEON PEPPERS V24.3 — DELETE PRODUCTS

ADDED
Supplier Pricing:
- Delete button in each supplier-pricing row
- Delete button inside the Edit Supplier Price modal

Products Admin:
- Existing permanent Delete Product action remains available
- Confirmation message is clearer about what will be removed
- Product can be deleted regardless of lifecycle state

DELETE BEHAVIOR
Deleting a Product removes that product record from Admin/public catalog.
Historical order/invoice line-item text remains in existing records.

Deleting a Supplier Pricing row removes only that private supplier-cost record.

NO SUPABASE CHANGES REQUIRED.

INSTALL
1. Replace project files with this package.
2. Keep config.js.
3. Commit and push.
4. Hard refresh Admin and Supplier Pricing with Ctrl + F5.
