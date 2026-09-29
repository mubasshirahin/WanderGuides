# Sir Demo Guide — View, Procedure, Transaction, Trigger (WanderGuides)

Prottek topic e demo order: **1) UI → 2) Code → 3) Live DB change (SSMS)**.

## Age ready koro (5 min)

1. Backend: `npm --prefix server run dev` (port 5050) • Frontend: `npm --prefix client run dev` (Vite URL)
2. SSMS kholo, `TouristGuide` DB select koro — browser + SSMS pasapasi rakho
3. DB objects apply ache kina check koro (na thakle ekbar chalao):
   ```powershell
   npm --prefix server run migrate:db-objects
   ```
4. 2ta login ready rakho: ekta **tourist**, ekta **guide** (2ta alada browser/incognito window best)

---

## 1. VIEW — "Vari JOIN ekhon 1 line query"

### Website er kothay
- `/bookings` page (tourist + guide dujoner booking list)
- `/guides` + `/explore` (guide directory)
- Dashboard er earning/revenue ongsho (`/dashboard`)

### Step 1 — UI dekhao
Tourist login → `/bookings` → booking list asche (tourist name, guide name, tour title, CanCancel soho).
Bolo: *"Sir, ei page e 4ta table er data ek sathe lage."*

### Step 2 — Code dekhao
- `db/views.sql` → `vw_BookingDetails` (Bookings + tourist + guide + GuideTours JOIN ta view te save kora)
- `server/controllers/bookingController.js` → `getAllBookings` ekhon sudhu
  `SELECT ... FROM dbo.vw_BookingDetails WHERE ...` kore — ager 18-column JOIN ar nai
- Same vabe `server/controllers/analyticsController.js` → `vw_GuideEarnings`, `vw_MonthlyRevenue` use kore
- Baki view: `vw_GuideDirectory` (guide list), `vw_OpenCustomRequests` (custom tour request + bid count)

### Step 3 — Live DB change dekhao (SSMS)
```sql
SELECT Id, TouristName, GuideName, TourTitle, Status
FROM dbo.vw_BookingDetails ORDER BY Id DESC;
```
Ekhon browser theke **notun ekta booking create** koro (`/browse-tours` → jekono tour → Book).
SSMS e uporer query abar chalao → **notun row view te auto chole asche**.
Bolo: *"View te data copy thake na, protibar fresh hisab kore — tai UI click er sathe sathe update."*

---

## 2. PROCEDURE + TRANSACTION — "4ta table e ek sathe change, half-save impossible"

### Website er kothay
- (a) `/custom-requests` (tourist) → kono bid er **Accept** button = `sp_AcceptBid`
- (b) `/reviews` (tourist) → completed booking e **Review Submit** = `sp_SubmitReview`
- (c) Tour book kora = `sp_CreateBooking`
- (d) Request cancel = `sp_CancelTourRequest`

### Step 1 — UI dekhao (best demo = bid accept)
Tourist login → `/custom-requests` → nijer request kholo → ekta bid te **Accept** click koro.
Result dekhao: request `fulfilled` holo, bid `accepted` holo, baki bid `rejected` holo,
ar **notun confirmed booking** toiri holo (`/bookings` e dekha jay).

### Step 2 — Code dekhao
- `db/procedures.sql` → `sp_AcceptBid` kholo. Dekhao vitore `BEGIN TRANSACTION` ... 4ta step ... `COMMIT`,
  ar `BEGIN CATCH` e `ROLLBACK + THROW`.
- `server/controllers/customTourController.js` → `acceptBid` er uporer comment e `EXEC dbo.sp_AcceptBid` line dekhao.
- Same pattern `reviewController.js` (`sp_SubmitReview`) ar `bookingController.js` (`sp_CreateBooking`) e.
- Bolo: *"Age Node.js e transaction chilo, ekhon same logic DB procedure er vitore — 4ta change hoy all-or-nothing."*

### Step 3 — Live DB change dekhao (SSMS)
```sql
-- Accept er age-pore compare koro (id bodle nao):
SELECT RequestID, Status FROM dbo.CustomTourRequests WHERE RequestID = 5;
SELECT BidID, Status FROM dbo.TourBids WHERE RequestID = 5;
SELECT Id, Status, TotalAmount FROM dbo.Bookings ORDER BY Id DESC;
```
UI te **Accept** click → 3ta query abar chalao → 3 jaygay ek sathe change. Tarpor ROLLBACK proof:
```sql
EXEC dbo.sp_SubmitReview @bookingId = 1, @touristId = 1, @rating = 99;  -- vul rating
-- Error: "Rating must be between 1 and 5" + kono table e kichu dhuke nai
```
Bolo: *"Vul input e error + zero change — etai transaction er guarantee."*
Raw transaction demo chaile: `db/transaction_demo.sql` (DEMO 1 + DEMO 2) SSMS e line-by-line chalao.

---

## 3. TRIGGER — "App code charai DB nije kaj kore"

### Website er kothay (4ta trigger → 4ta UI action)

| UI action | Auto DB kaj (trigger) | SSMS proof query |
|---|---|---|
| `/reviews` → Review Submit | `trg_Reviews_AfterInsert`: `Guides.Rating` + `TotalReviews` auto recalc | `SELECT FullName, Rating, TotalReviews FROM dbo.Guides WHERE UserID = <guideId>` — age/pore |
| `/bookings` (guide) → Booking **Confirm/Cancel** | `trg_Bookings_AfterUpdate_Notify`: `TouristNotifications` e auto row | `SELECT * FROM dbo.TouristNotifications WHERE TouristUserId = <id> ORDER BY Id DESC` — click er age 0, pore 1 |
| `/messages` → Message pathano | `trg_Messages_AfterInsert`: `Conversations.LastMessage` auto update | `SELECT ConversationID, LastMessage FROM dbo.Conversations` — message pathalei bodle jay |
| Notun booking create | `trg_Bookings_AfterInsert_NotifyGuide`: `GuideNotifications` e auto row | `SELECT * FROM dbo.GuideNotifications WHERE GuideUserId = <id> ORDER BY Id DESC` |

### Step 1 — UI dekhao (best demo = guide confirm)
Guide login → `/bookings` ba `/dashboard` → pending booking **Confirm** koro.

### Step 2 — Code dekhao
- `db/triggers.sql` → `trg_Bookings_AfterUpdate_Notify` kholo.
  Dekhao `AFTER UPDATE ... INSERT INTO TouristNotifications` — kono Node code nai.
- `bookingController.js` er notify ongsho ekhon backup hisebe ache.

### Step 3 — Live DB change dekhao
Confirm click er **age** SSMS e notification query chalao (row nai), click er **pore** abar chalao (auto row).
Tarpor killer proof — app bypass koreo trigger fire hoy:
```sql
BEGIN TRAN;
UPDATE dbo.Bookings SET Status = 'completed' WHERE Id = 1;
SELECT * FROM dbo.TouristNotifications
WHERE TouristUserId = (SELECT TouristUserId FROM dbo.Bookings WHERE Id = 1)
ORDER BY Id DESC;
ROLLBACK;  -- test row muche dilam
```
Bolo: *"Sir, app bypass kore direct SQL dileo notification toiri hoy — mane logic ta sotti DB level e."*

---

## Sir er somvabbo question + 1-line answer
- **View te data store thake?** — "Na sir, virtual — protibar base table theke fresh hisab kore."
- **Procedure keno, Node code to chilo?** — "4ta table er change ek transaction e DB er vitore guarantee hoy, majhpothe server morleo half-save hoy na."
- **Trigger vs Node code?** — "Trigger app bypass holeo chole + rating/notification kokhono miss hoy na."
- **Rollback proman?** — `rating = 99` EXEC error + `BEGIN TRAN...ROLLBACK` demo tai.

## File map (code khule dekhanor somoy)
- `db/views.sql` — 5ta View
- `db/procedures.sql` — 4ta Procedure (prottekta te TRANSACTION vitore)
- `db/triggers.sql` — 4ta Trigger
- `db/transaction_demo.sql` — SSMS step-by-step demo
- `db/schema.sql` — base table design (unchanged)
- `server/scripts/migrate-db-objects.js` — views/procedures/triggers apply script (`npm run migrate:db-objects`)
