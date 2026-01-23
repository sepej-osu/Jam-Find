# Jam Find Profile API

FastAPI backend for managing user profiles with Firebase Firestore.

## Setup

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (jam-find)
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as `serviceAccountKey.json` in the `backend/` directory

### 4. Environment Configuration
```bash
cp .env.example .env
# Edit .env if needed
```

### 5. Run the Server
```bash
# Make sure virtual environment is activated
uvicorn main:app --reload

# Or using Python
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Profiles
- `POST /api/v1/profiles` - Create a new profile
- `GET /api/v1/profiles/{user_id}` - Get a profile by user_id
- `PUT /api/v1/profiles/{user_id}` - Update a profile
- `DELETE /api/v1/profiles/{user_id}` - Delete a profile
- `GET /api/v1/profiles` - List all profiles (paginated)

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check

## API Documentation
Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Example Usage

### Create Profile
```bash
curl -X POST "http://localhost:8000/api/v1/profiles" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "firebase_user_id_here",
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "bio": "Music enthusiast",
    "location": "Portland, OR"
  }'
```

### Get Profile
```bash
curl "http://localhost:8000/api/v1/profiles/firebase_user_id_here"
```
