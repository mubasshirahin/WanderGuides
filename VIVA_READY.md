# Viva Ready Sheet — WanderGuides (2 View + 2 Procedure + Transaction + 1 Trigger)

> Eita porlei viva hoye jabe. Prottek topic e order: **1) UI → 2) Keno + Labh → 3) Code → 4) Database (SSMS)**.
> Demo order: View 2 ta → Procedure 2 ta → Trigger 1 ta.

---

## 0. Age ready koro (5 min, sir asar age)

1. Backend chalao: `npm --prefix server run dev` (port 5050, `.env` e `PORT=5050` thakte hobe)
2. Frontend chalao: `npm --prefix client run dev` (Vite URL ta browser e kholo)
3. SSMS kholo, `TouristGuide` DB select koro — browser + SSMS pasapasi rakho
4. DB objects apply koro (ekbar):
   ```powershell
   npm --prefix server run migrate:db-objects
   ```
   Eita `db/views.sql`, `db/procedures.sql`, `db/triggers.sql` apply kore.
5. 2 ta login ready rakho: ekta **tourist**, ekta **admin** (guide dashboard na, earning dekতে admin lagbe). 2 ta alada browser/incognito best.

---

## 1. VIEW-1 — `vw_BookingDetails` (Bookings page)

### 1) Sir ke bolo (UI kothay use korsi)
> "Sir, ami frontend e `/bookings` page e (tourist + guide dujoner booking list) view use korsi. Tourist login kore `/bookings` khulle booking list ase — tourist name, guide name, tour title, Status, CanCancel soho."

Live dekhao: Tourist login → `/bookings` → list asche.

### 2) Keno use korsi + labh ki hoise
> "Sir, ei page e 4 ta table er data ek sathe lage — Bookings + tourist (Users) + guide (Guides/Users) + GuideTours. Age controller e 18-column er boro JOIN likhte hoito. Ekhon oi vari JOIN ta `vw_BookingDetails` view te save kora, controller sudhu 1 line `SELECT ... FROM view` kore."
- Labh 1: Controller choto + readable, same JOIN bar bar likhte hoy na.
- Labh 2: View te data copy thake na, protibar base table theke fresh hisab kore — tai UI te notun booking sathe sathe ase.

### 3) Code e giye dekhao
1. `db/views.sql:11` → `CREATE OR ALTER VIEW dbo.vw_BookingDetails AS` kholo. Dekhao vitore Bookings + tourist + guide + GuideTours JOIN.
2. `server/controllers/bookingController.js:53-67` kholo. Dekhao comment `// Course topic VIEW` + line 67 `FROM dbo.vw_BookingDetails v` — ager boro JOIN ar nai (sudhu `HasReview` er jonno ekta `LEFT JOIN Reviews` ase).

### 4) Database e giye dekhao (SSMS)
```sql
SELECT Id, TouristName, GuideName, TourTitle, Status
FROM dbo.vw_BookingDetails ORDER BY Id DESC;
```
Ekhon browser theke notun ekta booking create koro (`/browse-tours` → jekono tour → Book). SSMS e uporer query abar chalao → **notun row auto chole asche**.
> "Sir, view te data copy thake na, protibar fresh hisab kore — tai UI click er sathe sathe update."

---

## 2. VIEW-2 — `vw_GuideEarnings` (Admin dashboard analytics)

### 1) Sir ke bolo (UI kothay use korsi)
> "Sir, ami admin dashboard er earning/analytics ongshe view use korsi. Admin login kore `/dashboard` (ba API `/api/analytics/guide-booking-summary`) khulle kon guide er koyta booking, koto revenue — eita ase."

Note: Tourist/guide dashboard e earning UI nai, admin login diye dekhaba. Jodi sir tourist dashboard khule bole "koi?", bolba "Sir, earning view ta admin analytics API te wired, tourist dashboard `/api/tourist/dashboard` alada."

### 2) Keno use korsi + labh ki hoise
> "Sir, earning ber korte Bookings + Tours + Guides er upor GROUP BY + SUM lage. Eita protibar controller e likhle vul howar chance + slow. View te aggregation save kora, controller sudhu `SELECT ... FROM vw_GuideEarnings` kore."
- Labh 1: Heavy GROUP BY/SUM ek jaygay, sob API same result pay.
- Labh 2: Base booking change hole earning auto update.

### 3) Code e giye dekhao
1. `db/views.sql:100` → `CREATE OR ALTER VIEW dbo.vw_GuideEarnings AS` kholo.
2. `server/controllers/analyticsController.js:6-13` kholo. Dekhao comment + line 13 `FROM dbo.vw_GuideEarnings`. Same file e `vw_MonthlyRevenue` o ase (line 83) — chaile oita bonus hisebe dekhaba.

### 4) Database e giye dekhao (SSMS)
```sql
SELECT * FROM dbo.vw_GuideEarnings ORDER BY TotalBookings DESC;
```
Ekhon notun booking create/confirm koro → query abar chalao → TotalBookings/Revenue bere gese.
> "Sir, base table change hole view auto notun hisab dey."

---

## 3. PROCEDURE-1 + TRANSACTION — `sp_AcceptBid` (Bid Accept)

### 1) Sir ke bolo (UI kothay use korsi)
> "Sir, ami `/custom-tour` page e (tourist) procedure use korsi. Tourist login → `/custom-tour` → nijer request kholo → ekta bid te **Accept** click koro."

Result dekhao: request `fulfilled` holo, oi bid `accepted`, baki bid `rejected`, ar **notun confirmed booking** toiri holo (`/bookings` e dekha jay).

### 2) Keno use korsi + labh ki hoise
> "Sir, Accept click e 4 ta table e ek sathe change lage — CustomTourRequests + TourBids (accepted) + TourBids (rejected) + Bookings (notun row). Eita Node.js e korle majhpothe server morle half-save hoye jeto. Ekhon same logic DB procedure er vitore ek transaction e — 4 ta change hoy all-or-nothing."
- Labh: Half-save impossible. Error hole sob rollback.

### 3) Code e giye dekhao
1. `db/procedures.sql:76` → `CREATE OR ALTER PROCEDURE dbo.sp_AcceptBid` kholo. Dekhao vitore `BEGIN TRANSACTION` (line 83) ... 4 ta step ... `COMMIT` (line 123), ar `BEGIN CATCH` e `ROLLBACK + THROW` (line 128-129).
2. `server/controllers/customTourController.js:242-244` kholo. Dekhao comment `PROCEDURE + TRANSACTION: db/procedures.sql -> sp_AcceptBid` + `Node theke chaile: query('EXEC dbo.sp_AcceptBid ...')` line. Bolo: "Sir, age Node transaction chilo, ekhon same logic DB procedure e — chaile EXEC kore chalano jay."

### 4) Database e giye dekhao (SSMS)
```sql
-- Accept er age-pore compare koro (id bodle nao):
SELECT RequestID, Status FROM dbo.CustomTourRequests WHERE RequestID = 5;
SELECT BidID, Status FROM dbo.TourBids WHERE RequestID = 5;
SELECT Id, Status, TotalAmount FROM dbo.Bookings ORDER BY Id DESC;
```
UI te **Accept** click → 3 ta query abar chalao → 3 jaygay ek sathe change.
> "Sir, 3 jaygay ek sathe change — etai transaction er guarantee."

---

## 4. PROCEDURE-2 + TRANSACTION — `sp_SubmitReview` (Review Submit + Rollback proof)

### 1) Sir ke bolo (UI kothay use korsi)
> "Sir, ami `/reviews` page e (tourist) procedure use korsi. Completed booking e **Review Submit** korle review insert + guide rating update — 2 ta kaj ek sathe hoy."

Live dekhao: Tourist login → `/reviews` → completed booking e rating + comment diye Submit.

### 2) Keno use korsi + labh ki hoise
> "Sir, review dile 2 ta table change lage — Reviews (INSERT) + Guides (Rating recalc). Vul rating (jemon 99) dile kono table ei kichu dhuka uchit na. Procedure er vitore transaction + validation ase, tai error hole zero change."
- Labh: Validation + 2 ta write ek transaction e, data kokhono corrupt hoy na.

### 3) Code e giye dekhao
1. `db/procedures.sql:15` → `CREATE OR ALTER PROCEDURE dbo.sp_SubmitReview` kholo. Dekhao line 23-26 `IF (@rating < 1 OR @rating > 5) THROW 'Rating must be between 1 and 5'`, + `BEGIN TRANSACTION` (line 29) ... `COMMIT` (line 61), `CATCH` e `ROLLBACK` (line 66-68).
2. `server/controllers/reviewController.js:6-7` kholo. Dekhao comment `PROCEDURE + TRANSACTION: db/procedures.sql -> sp_SubmitReview` + `EXEC dbo.sp_SubmitReview` line.

### 4) Database e giye dekhao (SSMS) — killer rollback proof
```sql
EXEC dbo.sp_SubmitReview @bookingId = 1, @touristId = 1, @rating = 99;  -- vul rating
-- Error: "Rating must be between 1 and 5" + kono table e kichu dhuke nai
```
> "Sir, vul input e error + zero change — etai transaction er guarantee."
Raw transaction demo chaile: `db/transaction_demo.sql` (DEMO 1 + DEMO 2) SSMS e line-by-line chalao.

---

## 5. TRIGGER-1 — `trg_Reviews_AfterInsert` (App code charai DB nije kaj kore)

### 1) Sir ke bolo (UI kothay use korsi)
> "Sir, ami `/reviews` page er Submit action e trigger use korsi. Tourist review submit korle app code charai DB nije guide er rating recalc kore dey."

Live dekhao: Review Submit koro → guide er Rating + TotalReviews auto bere jay.

### 2) Keno use korsi + labh ki hoise
> "Sir, rating recalc Node code e korle app bypass hole (direct SQL) miss hoye jeto, ba kokhono update na hole rating vul dekhaito. Trigger `AFTER INSERT ON Reviews` — DB level e guarantee, app bypass kore direct SQL dileo fire hoy."
- Labh: Rating/notification kokhono miss hoy na.

### 3) Code e giye dekhao
- `db/triggers.sql:14` → `CREATE OR ALTER TRIGGER dbo.trg_Reviews_AfterInsert` kholo. Dekhao `AFTER INSERT ... UPDATE Guides SET Rating = AVG, TotalReviews = COUNT` — kono Node code nai.

### 4) Database e giye dekhao (SSMS)
```sql
-- Review er age-pore (guide UserID bodle nao, example: 4 = Shakil Khan):
SELECT FullName, Rating, TotalReviews FROM dbo.Guides WHERE UserID = 4;
```
UI te review Submit → query abar chalao → Rating/TotalReviews auto change.
Killer proof — app bypass koreo trigger fire hoy (id bodle nao; ROLLBACK tai safe):
```sql
BEGIN TRAN;
INSERT INTO dbo.Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
VALUES (NULL, 13, 4, 5, 'trigger test');
SELECT FullName, Rating, TotalReviews FROM dbo.Guides WHERE UserID = 4;
ROLLBACK;  -- test row muche dilam
```
> "Sir, app bypass kore direct SQL dileo rating bodle jay — mane logic ta sotti DB level e."

---

## Sir er somvabbo question + 1-line answer

- **View te data store thake?** — "Na sir, virtual — protibar base table theke fresh hisab kore."
- **Procedure keno, Node code to chilo?** — "4 ta table er change ek transaction e DB er vitore guarantee hoy, majhpothe server morleo half-save hoy na."
- **Trigger vs Node code?** — "Trigger app bypass holeo chole + rating kokhono miss hoy na."
- **Rollback proman?** — "`rating = 99` EXEC error + zero change, etai proof."
- **Tourist dashboard e earning koi?** — "Sir, earning view ta admin analytics API te wired, tourist dashboard alada API use kore."
- **`/custom-requests` e tourist Accept koi?** — "Sir, tourist Accept ta `/custom-tour` route e, guide er ta `/custom-requests` e."

## File map (code khule dekhanor somoy)
- `db/views.sql:11` — `vw_BookingDetails` | `db/views.sql:100` — `vw_GuideEarnings`
- `db/procedures.sql:76` — `sp_AcceptBid` | `db/procedures.sql:15` — `sp_SubmitReview`
- `db/triggers.sql:14` — `trg_Reviews_AfterInsert`
- `db/transaction_demo.sql` — DEMO 1 + DEMO 2 (SSMS step-by-step)
- `server/scripts/migrate-db-objects.js` — views/procedures/triggers apply script (`npm run migrate:db-objects`)
- UI: `client/src/App.jsx:121` bookings, `:133` custom-tour, `:134` reviews, `:122` dashboard
- Controller: `server/controllers/bookingController.js:67`, `server/controllers/analyticsController.js:13`, `server/controllers/customTourController.js:242`, `server/controllers/reviewController.js:6`
