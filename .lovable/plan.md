

## Plan: Fix Shopify Sync Schedule to 8:00 AM UK Time

### Problem
The daily Shopify sync currently runs at `0 8 * * *` (8:00 AM UTC). During British Summer Time (late March–late October), that's actually 9:00 AM UK time — an hour late.

### Solution
Update the cron job to run at 7:00 AM UTC (`0 7 * * *`). This gives:
- **Summer (BST)**: 8:00 AM UK time ✓
- **Winter (GMT)**: 7:00 AM UK time — one hour early, but orders are ready before staff arrive

Alternatively, pg_cron does not reliably support timezone-aware scheduling across all Supabase instances, so a fixed UTC offset is the safest approach. 7 AM UTC is the better choice since having orders ready early is preferable to having them arrive late.

### Changes
One database operation (no code file changes):
1. **Unschedule** the existing `daily-shopify-sync` cron job
2. **Reschedule** it with `0 7 * * *`

This will be done via two SQL statements:
```sql
SELECT cron.unschedule('daily-shopify-sync');
```
Then re-create with the new schedule pointing to the same sync endpoint.

