from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import profiles, location
from config import settings
from firebase_config import initialize_firebase

app = FastAPI(
    title="Jam Find Profile API",
    description="API for managing user profiles",
    version="1.0.0"
)

# Initialize Firebase on startup
@app.on_event("startup")
async def startup_event():
    initialize_firebase()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(profiles.router, prefix="/api/v1", tags=["profiles"])
app.include_router(location.router, prefix="/api/v1", tags=["location"])

@app.get("/")
async def root():
    return {"message": "Welcome to Jam Find Profile API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
