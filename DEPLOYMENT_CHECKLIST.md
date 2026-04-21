# CDBMS Deployment Checklist

## Recommended Hosting

- Frontend: Vercel, root directory `react-frontend`
- Backend: Render Web Service, root directory `backend`
- Database: MongoDB Atlas
- Current display simulator: keep using `/display-simulator.html`

## Backend on Render

1. Push the project to GitHub.
2. In Render, create a new Blueprint from this repo, or create a Web Service manually.
3. If manual:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/`
4. Add production environment variables from `backend/.env.production.example`.
5. After Render gives the backend URL, set:
   - `PUBLIC_API_URL=https://your-cdbms-backend.onrender.com`
   - `PUBLIC_APP_URL=https://your-cdbms-frontend.vercel.app`
   - `FRONTEND_URL=https://your-cdbms-frontend.vercel.app`

## Frontend on Vercel

1. Import the same GitHub repo in Vercel.
2. Set root directory to `react-frontend`.
3. Framework preset: Vite.
4. Add:
   - `VITE_API_URL=https://your-cdbms-backend.onrender.com/api`
5. Deploy.
6. Copy the Vercel production URL back into Render as `PUBLIC_APP_URL`, `FRONTEND_URL`, and `WEBAUTHN_ORIGIN`.
7. Set `WEBAUTHN_RP_ID` to the Vercel hostname only, without `https://`.

## Email Verification Test

1. Set `ALLOW_EMAIL_PREVIEW=false` on Render.
2. Use a Gmail App Password, not the normal Gmail password.
3. Open the Vercel site on another phone or laptop.
4. Sign up with a new email.
5. Open the newest verification email on that other device.
6. Confirm the link starts with the deployed backend or frontend domain, not `localhost`.
7. Repeat with Forgot Password.

## Display Simulator Test

1. Open the deployed frontend.
2. Login as admin.
3. Go to billboards and open/copy the display URL.
4. Confirm the display URL uses the deployed backend API base.
5. For now, the display simulator is enough for committee demo.

## Easypaisa-Only Payment Reality

With only a personal Easypaisa number, the app cannot automatically prove money arrived. A QR code helps the advertiser pay the correct number/reference, but it does not authenticate the transaction.

The safer flow is:

1. Admin approves booking.
2. System issues a unique payment reference.
3. Advertiser pays the Easypaisa number and enters the real Easypaisa transaction ID.
4. Advertiser uploads screenshot.
5. Admin checks the Easypaisa app transaction history for amount, sender, time, and transaction ID.
6. Admin confirms payment in CDBMS only after matching the real transaction.

For true automatic verification later, use an official payment gateway or merchant API.
