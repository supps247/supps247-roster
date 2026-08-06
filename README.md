# Supps247 Roster, Payroll & Store Hours

Cloud-based admin roster and payroll estimator connected to Supabase.

## Features
- 11 Supps247 Victorian outlets
- Online-sourced store addresses, phone numbers, emails and weekly opening hours
- Store hours tab with official source links
- Full-day shifts can automatically use the selected outlet's opening hours
- Warning and confirmation when a roster shift is outside published trading hours
- Weekly roster, employee pay settings and payroll estimate
- Saturday, Sunday and public-holiday multipliers
- Super and weekly allowance estimates
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
