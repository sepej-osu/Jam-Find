# Jam-Find

Find, chat, and jam with musicians near you.

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

### Frontend Setup
```bash
cd frontend
npm install
```

### Frontend Firebase Setup
Use the .env.example file and rename it to .env and fill that in with the Firebase Jam Find Web App config.

You can find the Firebase config variables here: https://console.firebase.google.com/u/0/project/jam-find/settings/general/

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
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

API docs available at `http://localhost:8000/docs`
