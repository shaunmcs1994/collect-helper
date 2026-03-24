

## Plan: Compare Google Calendar vs Database Orders

Now that you've uploaded the correct files, I'll parse both `.ics` calendars and compare them against your database orders to find date discrepancies.

### What happens

1. **Parse the Wilmslow `.ics`** (~325K lines) and **Manchester `.ics`** (~27K lines) — extract order numbers, customer names, and dates from each event
2. **Query the database** — export all orders with their `order_number`, `collection_date`, `customer_name`, `collection_location`
3. **Match by order number** — compare dates between calendar and database
4. **Generate a report** at `/mnt/documents/calendar_vs_db_comparison.csv` with columns: Order Number, Customer, Calendar Date, DB Date, Location, Status (`MATCH` / `DATE_MISMATCH` / `CALENDAR_ONLY` / `DB_ONLY`)

### Technical details
- Python script to parse `.ics` files, extracting order numbers from `SUMMARY` fields (e.g. `#14194 Maham Yaqui`)
- Wilmslow calendar has older entries without order numbers (just names) — these will be matched by customer name where possible
- Mismatches sorted to the top of the CSV for easy review
- Summary stats printed in chat

### Output
- **CSV report** with all discrepancies highlighted
- **Chat summary** showing total orders checked, matches, and mismatches

