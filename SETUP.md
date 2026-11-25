# Kaarzora Business Services — Setup & Deployment Guide

> **Tagline:** Your Business, Online and Growing.  
> **Currency:** PKR (Pakistani Rupee)  
> **Languages:** English (Default) & Urdu (RTL Ready)

## 1. Prerequisites
- **Node.js** `v20+` (tested on `v22.23+`)
- **Firebase Project** with **Authentication (Google Sign-In)** and **Cloud Firestore** enabled

## 2. Environment Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Provide your Firebase web configuration in `firebase-applet-config.json` at the workspace root:
   ```json
   {
     "projectId": "your-firebase-project-id",
     "appId": "your-firebase-app-id",
     "apiKey": "your-firebase-web-api-key",
     "authDomain": "your-project.firebaseapp.com",
     "firestoreDatabaseId": "(default)",
     "storageBucket": "your-project.appspot.com",
     "messagingSenderId": "000000000000"
   }
   ```
3. Update the bootstrapped Admin email in `firestore.rules` and `server.ts` (`ADMIN_EMAIL`) if deploying to your own domain.

## 3. Install Dependencies
```bash
npm install
```

## 4. Deploy Firestore Security Rules
Deploy `firestore.rules` to your Firebase project using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
You can also validate the security rules with ESLint:
```bash
npx eslint firestore.rules
```

## 5. Run Development Server
Starts the Express backend API (port `3000`) with Vite HMR middleware:
```bash
npm run dev
```
Open `http://localhost:3000`.

## 6. Production Build & Start
```bash
npm run build
NODE_ENV=production npm start
```

## 7. Architecture Overview
- **Customer Portal**: Google Sign-In + business profile registration, PKR service catalogue, order placement with project briefs and deadlines, private brief file uploads, manual Pakistani bank / JazzCash transfer instructions, payment receipt submission, order tracking, order messaging, work approval, and reviews.
- **Freelancer Portal**: Freelancer registration & admin approval workflow, skills & portfolio editor, assigned projects, task checklists, private deliverable file uploads, and live PKR commission/payout ledger.
- **Admin Portal**: Live database-backed dashboard KPIs, manual payment verification (approve/reject receipts), freelancer application review, project-to-freelancer assignment with customizable commission rates, PKR service pricing management, bank instruction settings, and revenue/profit reports.
- **Private File Storage**: Uploaded briefs, payment receipts, and deliverables are stored outside public static roots in `private_uploads/` and streamed only after server-side Firebase ID token verification and ownership/admin checks.
