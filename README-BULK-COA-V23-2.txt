NEON PEPPERS V23.2 — BULK COA UPLOAD

ADDED
- Bulk Upload button on COA Admin.
- Select multiple PDF, PNG, JPG, or JPEG files at once.
- Maximum 10 MB per file.
- Attempts to match the product automatically from each filename.
- Attempts to match Size from the filename when a configured product size appears.
- Product can be corrected with a dropdown.
- Size is selected from that product's configured sizes.
- Lot number is entered per file.
- Shared Testing Lab, Test Date, and Visibility defaults.
- Upload All processes the entire batch.
- Per-file Ready, Uploaded, or Error status.
- Failed files can be corrected and retried.
- Individual Add COA workflow remains available.

HOW TO GET THE BEST AUTOMATIC MATCH
Name files with the product name and optionally its size.

Examples:
BPC-157 10mL Lot123.pdf
KPV 5mL KP0811.pdf
GHK-CU 20mL Lot44.pdf

INSTALL
1. Copy all files into your Neon Peppers project.
2. Keep config.js.
3. Commit and push.
4. Hard refresh /coa-admin.html with Ctrl + F5.

NO SUPABASE CHANGES ARE REQUIRED.
This uses the existing product_coas table and product-files storage bucket.
