# WanderGuides
A Tourist Guide Hiring Webapp.

## Local demo setup

Start SQL Server and make sure `server/.env` points to the `TouristGuide` database. After the base schema in `db/schema.sql` has been created, run these once from the project folder:

```powershell
npm --prefix server run migrate:ui
npm --prefix server run seed
```

The migration adds fields, itinerary and group-size booking data, saved guides, tourist and guide notifications, guide review responses, tour view counters, and identity verification requests. Run it after updating the project so these guide dashboard features work with an existing database. Guide verification requests are manually reviewed by an admin; do not enter identity numbers or upload private identity documents into the request note. The seed command adds fictional Bangladesh guide listings and tour packages so the guide and tour pages have demo content. It is safe to run the seed command again; it updates/reuses those listings instead of duplicating them.

Run the API and frontend in separate terminals:

```powershell
npm run dev
```

```powershell
npm --prefix client run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).
# Tourist experience additions

After updating to this version, run the server migration once so existing SQL Server databases gain tour itineraries, group-size/cancellation fields, saved tour/guide tables, and tourist notifications:

```powershell
cd server
npm run migrate:ui
```

To load example guides and tour packages (including sample tour photos), run:

```powershell
npm run seed
```

Tour availability checks block guide calendar dates and dates with pending or confirmed bookings. Tourist cancellations close 48 hours before the booked date. Payments are tracked as unpaid/paid/refunded; the guide dashboard also shows expected value from future bookings. A payment gateway is not configured in this app yet.
