# WanderGuides
A Tourist Guide Hiring Webapp.

## Local demo setup

Start SQL Server and make sure `server/.env` points to the `TouristGuide` database. After the base schema in `db/schema.sql` has been created, run these once from the project folder:

```powershell
npm --prefix server run migrate:ui
npm --prefix server run seed
```

The migration adds fields and a review table used by the current app. The seed command adds fictional Bangladesh guide listings and tour packages so the guide and tour pages have demo content. It is safe to run the seed command again; it updates/reuses those listings instead of duplicating them.

Run the API and frontend in separate terminals:

```powershell
npm run dev
```

```powershell
npm --prefix client run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).
# Tourist experience additions

After updating to this version, run the server migration once so existing SQL Server databases gain the tour image, payment status, and saved-tour tables:

```powershell
cd server
npm run migrate:ui
```

To load example guides and tour packages (including sample tour photos), run:

```powershell
npm run seed
```

Tour availability checks block guide calendar dates and dates with pending or confirmed bookings. Payments are tracked as unpaid/paid/refunded; a payment gateway is not configured in this app yet.
