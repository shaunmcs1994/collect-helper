

## Plan: Multi-Day Print & Post-Print Order Warning System

### Feature 1: Multi-Day Print from Calendar

**Current behavior:** Clicking a day opens a modal for that single day, with a print button inside.

**New behavior:** Add a "select mode" to the calendar where users can tick multiple days, then print all selected days' orders in one batch.

**Changes:**
- **`src/components/OrderCalendar.tsx`**
  - Add `selectionMode` state (boolean) and `selectedDates` state (Set of date strings)
  - Add a "Select Days to Print" toggle button in the calendar header
  - When selection mode is active, clicking a day toggles its checkbox instead of opening the modal
  - Show checkboxes on each DayCell when in selection mode
  - Add a floating action bar at the bottom showing "X days selected" with location filter and "Print All" button
  - Clicking "Print All" opens the existing print preview but with orders from all selected dates combined
  - The print header shows the date range rather than a single date

### Feature 2: Post-Print Order Warning System

**Current behavior:** No tracking of whether a day has been printed. No warnings for new orders arriving after printing.

**New behavior:** Track when a day was last printed. If a new order arrives (via Shopify sync or realtime) for a date that has already been printed, show a warning banner similar to the existing "missing date tag" sync warnings.

**Database changes (migration):**
- Create a new `print_logs` table:
  - `id` (uuid, PK)
  - `collection_date` (date, not null)
  - `printed_at` (timestamptz, default now())
  - `printed_by` (uuid, references auth.users)
  - `location_filter` (text, default 'all')
  - `order_count` (integer)
- RLS: authenticated users can select/insert

**Code changes:**
- **`src/context/OrderContext.tsx`**
  - Add `printLogs` state and `loadPrintLogs` function
  - Add `logPrint(dates: string[], location: string, count: number)` function to insert into `print_logs`
  - Add `printWarnings` state: orders where `order.created_at > print_logs.printed_at` for that `collection_date`
  - On realtime order changes, check if the new/updated order's collection date has been printed — if so, add to `printWarnings`
  - Expose `printWarnings` and `clearPrintWarnings` in context

- **`src/components/OrderCalendar.tsx`**
  - When print is triggered, call `logPrint()` to record it
  - In DayCell, show a small printer icon if the date has been printed
  - Show a warning icon if the date has new orders since last print

- **`src/components/ShopifySyncButton.tsx`** (or a new warning banner component)
  - After sync completes, display print warnings alongside existing sync warnings using the same alert pattern: "X orders arrived after printing for [dates]. Please reprint these days."

### Summary
- ~3 files modified, 1 new database table
- Uses existing warning UI patterns (same style as sync warnings)
- Print logs persist so warnings survive page refreshes

