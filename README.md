# Jam-Find

Find, chat, and jam with musicians near you.

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Docker and Docker Compose (only required for the Docker setup)

## Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Backend Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (jam-find)
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as `serviceAccountKey.json` in the `backend/` directory

### Backend Environment Setup
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set the following:

```
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CORS_ORIGINS=["http://localhost:5173"]
DEV_MODE=False
```

Set `DEV_MODE=True` to bypass Firebase authentication during local development. Never enable this in production.

### Frontend Setup
```bash
cd frontend
npm install
```

### Frontend Environment Setup
Copy `frontend/.env.example` to `frontend/.env` and fill in the Firebase config values.

You can find the Firebase config variables here: https://console.firebase.google.com/u/0/project/jam-find/settings/general/

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

## Running

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm run dev
```

### Scripts to run both
There are two Claude AI generated .sh scripts you can run to run the development. start.sh runs both the frontend and backend run scripts listed above and stop.sh stops their processes and shuts down the servers.
Use at your own risk.

```bash
./start.sh
```

```bash
./stop.sh
```

API docs available at `http://localhost:8000/docs`

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest
```

## Docker

The Docker setup runs the frontend and backend behind an nginx reverse proxy.

### Setup

1. Copy the root `.env.example` to `.env` and fill in all values (both backend and frontend variables):

```bash
cp .env.example .env
```

2. Place `serviceAccountKey.json` in the root directory.

3. Build and start the containers:

```bash
docker compose up --build
```

The frontend will be available at `http://localhost` and the API at `http://localhost:8000`.
