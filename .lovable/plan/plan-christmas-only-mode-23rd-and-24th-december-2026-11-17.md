## Plan: Christmas-only mode (23rd and 24th December)

### How it works today
- The Shopify sync pulls **every open order** with a collection date, for any day of the year.
- The app then loads all of those orders, so the counts, lists and calendar cover the whole year.
- The Stock page already has "23rd" and "24th" columns, but they always show **0**. They look for the date "23", while orders are now saved as full dates like 2026-12-23.
- The app only loads up to 1,000 orders at a time, so totals can get cut off when there are lots of orders.

### What will change
1. **Sync only brings in Christmas orders.** Shopify orders are imported only if their collection date is 23 or 24 December of the current year. All other orders are skipped and listed as "not Christmas".
2. **The app only shows Christmas orders.** Pending, Collected, Lookup, Calendar and Stock pages only show 23/24 December orders, even if older orders are still saved.
3. **Product counts work for both days.** The Stock page shows, for each product, how many were ordered, collected and remaining, split by 23rd, 24th, Wilmslow and Manchester. The 23rd/24th totals at the top will be correct.
4. **Date filter limited to the two days.** The "Collection Date" buttons become: Both days / 23rd Dec / 24th Dec.
5. **Optional clear-out:** remove orders for other dates already saved, so the totals match Shopify. I'll only do this if you confirm.

### Technical details
- `shopify-sync`: after reading the collection date from the tags, skip it unless it is `YYYY-12-23` or `YYYY-12-24` for the target year.
- `OrderContext.loadOrders`: filter with `.in('collection_date', [dec23, dec24])` and load in pages to get past the 1,000-row limit.
- `StockDashboard`: compare `collectionDate.endsWith('-12-23')` / `'-12-24'` instead of `'23'` / `'24'`.
- `OrderFilters`: replace the date picker with buttons for the two dates.
- Add a small test for the "is a Christmas date" rule.
