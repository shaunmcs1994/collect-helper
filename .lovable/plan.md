

## Plan: Enhanced Calendar Export with More Details

Re-run the future-dates comparison script, extracting additional fields from the `.ics` events to help manual matching:

### Additional fields to extract from ICS
- **DESCRIPTION** — often contains customer email, phone, order details, or notes staff added
- **LOCATION** — may have pickup location info
- **Full SUMMARY text** — the complete event title unprocessed
- **Event time** (DTSTART with time component) — pickup time if specified

### Output
- Updated CSV at `/mnt/documents/calendar_vs_db_detailed_comparison.csv` with columns:
  - Order Number, Customer Name (Calendar), Calendar Date, Calendar Time, Description/Notes, Location (from event), DB Date, DB Customer Name, DB Location, Status
- Calendar-only and DB-only entries will include all available detail so you can visually scan and match names that are slightly different (e.g. "Sara" vs "Sarah")
- Sorted with calendar-only and DB-only entries grouped together for easy side-by-side comparison

### Technical details
- Python script parsing both `.ics` files, extracting `SUMMARY`, `DESCRIPTION`, `LOCATION`, `DTSTART` fields
- Filter to future dates only (≥ 2026-03-24)
- Same name-normalization matching logic as before, with unmatched entries preserved with full detail

