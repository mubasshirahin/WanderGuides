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
SELECT FullName, Rating, TotalReviews FROM dbo.Guides WHERE UserID = 22;
```
UI te review Submit → query abar chalao → Rating/TotalReviews auto change.
Killer proof — app bypass koreo trigger fire hoy (id bodle nao; ROLLBACK tai safe):
```sql
BEGIN TRAN;
INSERT INTO dbo.Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
VALUES (NULL, 13, 4, 5, 'trigger test');
SELECT FullName, Rating, TotalReviews FROM dbo.Guides WHERE UserID = 22;
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
- `db/views.sql:11` — `vw_BookingDetails` | `server/controllers/bookingController.js:67`
- `db/procedures.sql:76` — `sp_AcceptBid` | `server/controllers/customTourController.js:242`
- `db/triggers.sql:14` — `trg_Reviews_AfterInsert` | `server/controllers/reviewController.js:6`
- `server/scripts/migrate-db-objects.js`


<!-- use TouristGuide;

-- View :
-- Guide ekta tour create korbe.
-- Tourist seta book korbe
-- Book shesh hoile booking table e pending akare dekhabe
-- Guide accept korle Confirmed lekha ashbe.
-- View use korar fole controller er moddhe
-- boro complex join lekha lage nai

use TouristGuide;
SELECT Id, TouristName, GuideName, TourTitle, Status
FROM dbo.vw_BookingDetails ORDER BY Id DESC;

--Procedure + Transaction :

-- Tourist nijer moto custom tour request korte parbe
-- kono guide tate response korte parbe
-- Tourist accept korlo
SELECT RequestID, Status FROM dbo.CustomTourRequests WHERE RequestID = 3;
SELECT BidID, RequestID, Status FROM dbo.TourBids WHERE RequestID = 3;
SELECT COUNT(*) AS TotalBookings FROM dbo.Bookings;

--Trigger:
-- Tourist explore guides page theke guide er
-- view te gye review dile auto update hoi jay
-- trigger use kore. pore rating and review kokhono
-- miss hoy na
SELECT r.Id, r.Rating, r.Comment, r.CreatedAt,
       t.FullName AS TouristName, t.Email AS TouristEmail
FROM dbo.Reviews r
LEFT JOIN dbo.Users t
  ON t.Id = COALESCE(r.TouristUserId, r.ReviewerId)
WHERE r.GuideId = 22 OR r.RevieweeId = 22
ORDER BY r.CreatedAt DESC; -->
