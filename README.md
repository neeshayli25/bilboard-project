# Centralized Digital Billboard Management System (CDBMS)

Production-style MERN stack project for billboard booking, advertiser management, admin approval, Stripe payment flow, and Arduino-assisted display simulation.

## Project structure

- [backend](C:/Users/Nisha%20Ali/Desktop/project%20practice/backend)
- [react-frontend](C:/Users/Nisha%20Ali/Desktop/project%20practice/react-frontend)
- [arduino](C:/Users/Nisha%20Ali/Desktop/project%20practice/arduino)

## Main features

- JWT + bcrypt authentication
- Advertiser signup and admin bootstrap
- Billboard management by city and slot
- Double-booking protection
- Booking flow: `pending -> paid -> approved -> active`
- Stripe-hosted checkout flow
- Admin approval dashboard
- Display simulator page for real screen playback
- Arduino Uno USB bridge for hardware status/demo

## Requirements

- Node.js 18+
- npm
- MongoDB Atlas connection string
- Stripe account for live/test keys
- Chrome or Edge for Arduino Web Serial connection

## First-time setup

### 1. Install dependencies

From the project root:

```powershell
cd "C:\Users\Nisha Ali\Desktop\project practice"
npm run install:all
```

### 2. Configure backend environment

Review and update:

- [backend/.env](C:/Users/Nisha%20Ali/Desktop/project%20practice/backend/.env:1)

Important values:

- `MONGO_URI`
- `JWT_SECRET`
- `DEMO_PAYMENT_MODE`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_CONNECTED_ACCOUNT_ID` (optional, for Stripe Connect payout on approval)
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### 3. Configure frontend environment

Review:

- [react-frontend/.env](C:/Users/Nisha%20Ali/Desktop/project%20practice/react-frontend/.env:1)

Default:

```env
VITE_API_URL=http://localhost:5000/api
```

## Run the full project

### Easiest Windows option

Double-click:

- [start-cdbms.cmd](C:/Users/Nisha%20Ali/Desktop/project%20practice/start-cdbms.cmd)

Or from terminal:

```powershell
cd "C:\Users\Nisha Ali\Desktop\project practice"
npm run dev
```

That opens two windows:

- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

## Main app URLs

- Frontend app: `http://localhost:5173`
- Backend API root: `http://localhost:5000`
- Display simulator: `http://localhost:5173/display-simulator.html`

## Stripe

### How it works here

1. Advertiser picks a billboard and time slot.
2. Frontend requests a Stripe Checkout session.
3. Stripe handles secure card entry.
4. After success, the app verifies the session.
5. Booking is stored as `paid`.
6. Admin approves booking.
7. If `STRIPE_CONNECTED_ACCOUNT_ID` is configured, the backend tries to create a Stripe transfer to that connected account on approval.
8. If the booking is rejected before approval and was paid by Stripe, the backend tries to create a Stripe refund automatically.
9. Display page fetches and shows the active ad.

### Demo payment fallback

If `DEMO_PAYMENT_MODE=true` and Stripe is unavailable, the app automatically enables a demo card flow.

In demo payment mode:

- advertiser can still complete a card-style payment step
- booking is marked as `paid`
- admin approval simulates payout transfer
- admin rejection simulates refund
- no real money moves

### Debit card question

Yes, in a real live Stripe setup, customers can pay with supported debit cards.

But for development and testing:

- Do **not** put your real debit card number into code.
- Do **not** use your real card in Stripe test mode.
- Use Stripe test cards instead.

Useful test examples:

- Visa: `4242 4242 4242 4242`
- Visa debit: `4000 0566 5566 5556`

Use any future expiry and any 3-digit CVC in test mode.

## Arduino Uno setup

Your Arduino Uno cannot fetch internet data or render billboard ads by itself.

So the working setup in this project is:

1. Backend serves billboard data.
2. Browser page acts as the real screen.
3. Arduino Uno connects by USB and acts as the hardware bridge/status device.

Files:

- Arduino sketch: [CDBMS_UNO_DisplayBridge.ino](C:/Users/Nisha%20Ali/Desktop/project%20practice/arduino/CDBMS_UNO_DisplayBridge/CDBMS_UNO_DisplayBridge.ino:1)
- Arduino setup guide: [arduino/README.md](C:/Users/Nisha%20Ali/Desktop/project%20practice/arduino/README.md:1)

## Display workflow

### Admin side

In the billboard management screen, every billboard now has:

- `Open Screen`
- `Copy URL`

That URL opens the simulator already linked to that billboard ID.

### Display side

Open:

```text
http://localhost:5173/display-simulator.html
```

Then:

- paste billboard ID if needed
- click `Connect Arduino (USB)` in Chrome or Edge
- optionally use fullscreen on a monitor or TV

## Teacher demo flow

1. Log in as advertiser.
2. Create/upload an ad.
3. Pick billboard, date, and slot.
4. Show slot availability.
5. Pay in Stripe test mode with a Stripe test card.
   If Stripe is unavailable, use the built-in Demo Card mode.
6. Log in as admin and open bookings.
7. Approve the paid booking.
8. Open the billboard screen from the billboard card.
9. When the current time reaches the booked slot, the display page fetches the active ad from the backend and shows it.

## IDE usage

You can run this project from any IDE by opening the root folder:

- [C:\Users\Nisha Ali\Desktop\project practice](C:/Users/Nisha%20Ali/Desktop/project%20practice)

Recommended approach:

1. Open the root folder.
2. Use the integrated terminal.
3. Run `npm run dev` from the root.

## Notes

- Keep `.env` credentials private.
- Real Stripe payments require your own valid live keys.
- The current hardware workflow is the best possible setup with only an Arduino Uno and jumper wires.
