# Jam-Find Frontend

React + Vite frontend for Jam-Find.

## Prerequisites

- Node.js 18 or higher

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` and fill in the Firebase config values and API URL:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_API_URL=http://localhost:8000
```

You can find the Firebase config values here: https://console.firebase.google.com/u/0/project/jam-find/settings/general/

## Running

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Building

```bash
npm run build
```

Output is placed in `dist/`.
