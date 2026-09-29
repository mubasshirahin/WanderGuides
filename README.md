# WanderGuides
A Tourist Guide Hiring Webapp.

## Local demo setup

Install the server and client dependencies once:

```powershell
npm install --prefix server
npm install --prefix client
```

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then enter your local SQL Server credentials and Google OAuth client ID. Start SQL Server and make sure the `TouristGuide` database exists. Apply the base schema in `db/schema.sql` to that database, then run these from the project folder:

```powershell
npm --prefix server run migrate:ui
npm --prefix server run migrate:db-objects
npm --prefix server run seed
```

The migrations add fields, itinerary and group-size booking data, saved guides, tourist and guide notifications, guide review responses, tour view counters, identity verification requests, OAuth provider columns, admin account support, and SQL views/procedures/triggers. Run them after updating the project so the full schema matches the API. Guide verification requests are manually reviewed by an admin; do not enter identity numbers or upload private identity documents into the request note. The seed command adds fictional Bangladesh guide listings and tour packages so the guide and tour pages have demo content. It is safe to run the seed command again; it updates/reuses those listings instead of duplicating them.

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
npm run migrate:db-objects
```

To load example guides and tour packages (including sample tour photos), run:

```powershell
npm run seed
```

Tour availability checks block guide calendar dates and dates with pending or confirmed bookings. Tourist cancellations close 48 hours before the booked date. Payments are tracked as unpaid/paid/refunded; the guide dashboard also shows expected value from future bookings.

Payment status is recorded manually: a guide can mark a confirmed or completed booking as paid, and an admin can mark a paid booking as refunded. This only records an offline/manual payment and does not collect money online.

For production, configure a strong `JWT_SECRET` (at least 32 characters), a strong admin password, `CLIENT_ORIGIN`, and secure SQL Server credentials through the deployment environment. Do not deploy with the local `.env` values.
