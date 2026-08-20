# Supps247 Roster, Payroll & Store Hours

Cloud-based admin roster and payroll estimator connected to Supabase.

## Features
- 11 Supps247 Victorian outlets
- Online-sourced store addresses, phone numbers, emails and weekly opening hours
- Store hours tab with official source links
- Full-day shifts can automatically use the selected outlet's opening hours
- Warning and confirmation when a roster shift is outside published trading hours
- Weekly roster, employee pay settings and payroll estimate
- Saturday and Sunday hours paid at the normal base rate
- Weekly allowance estimates
- Roster and payroll CSV exports
- Supabase authentication, cloud persistence and real-time updates

Store details were verified online on 3 August 2026. Public-holiday and special-event hours should be confirmed directly with each outlet.

## Weekly roster builder
Open **Roster → Build weekly roster**, select an outlet, set every employee's Monday–Sunday shifts, and save the full outlet week in one action. Existing shifts for that outlet and week are replaced. Split shifts can still be added afterwards with **Add shift**.


## Supplier accounts & receiving

The Accounts tab imports receiving files, organises records by outlet and supplier, and lets admins correct invoice numbers, received/due dates, quantities, amounts, payment status, paid date, payment reference, and notes. Data is saved in the existing Supabase roster_state JSON, so no SQL migration is required.


## Prepaid suppliers

The app automatically marks these suppliers as **Prepaid** on existing records and future receiving-file imports: iHerbs, PHD, Tiger Nutrition, EHP, Amazon, Innovative Nutrition, Switch Nutrition, Legit Supps, Muscle & Strength, INB4, and LVL Up Health. Prepaid records are excluded from outstanding and overdue totals. Admins can still manually change the status when an exception occurs.


## Accounts workbook import
The app now includes records imported from `data.xlsx` (894 invoice/account rows), including supplier, outlet, invoice number, received date, due date, amount, paid status and receipt number where supplied. Existing cloud edits are merged and preserved.


## Supplier PDF invoice import
Accounts now includes **Upload supplier PDF**. The browser extracts text from text-based PDFs, pre-fills supplier, invoice number, invoice date, due date, outlet and total amount, and opens an editable review form before saving. Scanned/image-only PDFs require manual entry because this version does not use OCR. Always verify extracted values before saving.


## Accounts data update
Imported 975 rows from the latest accounts file. 892 matched existing records and were updated; 83 were added. Paid status and receipt numbers are preserved.


## Bulk payment editing
Select multiple filtered invoices and update status, paid date, and receipt/reference together. Payment status and paid date can also be changed directly in each table row.

- Due payment status is available for individual and bulk invoice updates.


## Save troubleshooting
This build refreshes expired Supabase sessions automatically, sanitises state before JSONB saving, retries token failures once, and shows the actual Supabase error message instead of a generic save failure. If saving still fails, sign out and sign back in, then run `setup.sql` again in Supabase SQL Editor to ensure the save function exists.


## Supplier statement reconciliation

In **Accounts**, use **Upload supplier statement** to import PDF, CSV, XLSX or XLS files. Choose the supplier and outlet, then review matched, missing and mismatched invoices. The app adds only selected missing invoices, prevents duplicate invoice numbers for the same supplier/outlet, and records the source statement filename. PDF detection works best with text-based supplier statements; scanned statements may require Excel/CSV or manual entry.


## Accounts date ordering
Accounts are ordered by created date. Use the Accounts **Order by created date** control to switch between newest-first and oldest-first. The selected filters and totals continue to apply.


## Operations Portal v2

This build adds a colourful sidebar interface, refreshed dashboard, supplier and outlet reports, outstanding invoice attention list, report CSV exports, and improved mobile navigation while preserving the existing roster, payroll, accounts, receiving and Supabase workflows.

## Seven-day roster and payroll fix

This build fixes local-date handling so Monday through Sunday are all included in roster and payroll calculations. It also recognises older weekly-builder shifts that were saved one calendar day early by the previous UTC date conversion and displays/calculates them on their intended day. Newly created or edited shifts use the corrected local date format.


## Weekend rates and breaks

Saturday and Sunday hours now use the employee's normal base hourly rate with no weekend multiplier. Roster and payroll hours no longer deduct an automatic 30-minute unpaid break; full shift duration is counted. Public-holiday multipliers remain available.


## Payroll simplification

Superannuation and public-holiday loading have been removed from payroll calculations and exports. All rostered hours use the employee base hourly rate, with saved weekly allowances added separately.


## Weekly roster authoritative date fix

Weekly roster dates are now stored and read exactly as selected (Monday through Sunday), without any legacy one-day date shifting. Weekly saves include dateVersion 2, Off days stay Off, Half PM stays Half PM, and Full day uses zero break minutes. This also corrects previously displayed Tuesday-shifted weekly entries because the app now uses the saved calendar date directly.


## Supplier PDF parsing fix

Supplier PDF import now uses strict labelled fields for invoice number, invoice date, due date and total including GST. Unknown fields are left blank instead of guessed from the filename. The review screen warns about fields that were not confidently detected and flags possible duplicate invoice numbers before saving.


## Lightspeed accounts update — 11 August 2026

Added 39 received purchase orders supplied from Lightspeed to Accounts. Matching records are merged by invoice number, supplier and outlet; due dates and received quantities are filled from the new Lightspeed data when older saved rows are missing them. Prepaid supplier rules remain active.


## Lightspeed completeness update — 11 August 2026

Added/corrected the remaining Lightspeed received purchase orders supplied through 24 July 2026, including due dates and quantities where shown. Existing account payment edits are preserved when records match by invoice/order number, supplier and outlet. Prepaid and internal-transfer rules continue to apply.

## Accounts date range filter

Accounts now supports filtering by created date, paid date, or due date with From/To controls. Use **Paid last month** to automatically select Paid invoices and the previous calendar month; the filtered total at the bottom then shows how much was paid in that period.


## Supplier payment terms and previous-week store payroll

Outstanding invoices with status **Due**, **Unpaid** or **Unconfirmed** now calculate due dates from the received date using these terms: Global Nutrition and Primabolics 45 days; Glanbia, Iovate, International Protein and ATP 30 days; Dynamic Distribution 7 days; Rapid Supplements 15 days. If the calculated date would already be in the past, the app uses today's date instead.

Payroll now opens on the previous completed week and calculates one employee per outlet across the outlet's full saved opening hours at a flat **$28/hour**, with no break deduction. The payroll CSV export includes outlet and assigned employee.


## Lightspeed workbook update — 18 August 2026

Imported 74 received-order rows from `versel.xlsx`. Existing and incoming account rows are de-duplicated using a canonical invoice/order number + supplier + outlet key, so variants such as `INV-249820`, `INV 249820`, and `249820` do not appear twice for the same supplier/outlet. Existing paid/prepaid/payment-reference edits are preserved while newer quantity, received-date, due-date, and non-zero amount data is merged in.

## Permanent Accounts deletion fix

Deleting an Accounts invoice now stores a persistent deletion marker in Supabase state. This prevents built-in/imported seed records from being recreated by the normal data merge after refresh or login. Re-adding the same invoice manually clears the marker.

## Accounts invoice edit/delete identity fix — 18 August 2026

Editing an invoice number, supplier, outlet, or date now updates the same account record instead of allowing the original imported seed row to reappear as a second line. When the identity key changes, the original seed record is suppressed while the corrected row keeps its record ID. Existing duplicate rows caused by prior edits are also collapsed when a manually corrected row has the same supplier, outlet, received date, quantity, and amount as an imported row. Deleting an invoice now removes only the selected record ID rather than every row that shares the same canonical invoice key.

## Point Cook sales & stock — 19 August 2026

Added a dedicated **Point Cook Stock** workspace for product-level sales, purchasing and inventory analysis. Upload Lightspeed CSV/XLSX exports for products/current stock, sales and purchases. The module de-duplicates transaction imports, groups products into practical supplement categories, shows purchased units, sold units, on-hand stock, sales value, low/out-of-stock status, category performance and top sellers, and can export the filtered stock view to CSV. Product and movement data is saved inside the existing Supabase `roster_state` JSON, so no SQL migration is required.


## Point Cook April 2026 purchase data

Loaded 17 Lightspeed Point Cook purchase-order CSV exports (POI-481 through POI-511 supplied in this chat). The app now starts with 148 unique Point Cook products, 715 received purchase units and $24,018.32 of recorded supply cost from those files. The CSV exports do not contain the exact April purchase date, so movements are tagged to April 2026 and retain the original PO number/source filename. The exported `stock` field is also retained as the product on-hand figure from the source files.


## Accounts invoice-number ordering — 20 August 2026

Accounts now defaults to invoice-number order so invoice/order numbers appear in a clean numeric/alphanumeric sequence. The Order by control also allows invoice descending and created-date newest/oldest views.
