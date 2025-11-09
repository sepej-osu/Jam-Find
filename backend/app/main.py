import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import vendors
from app.database import Base, engine
#If we don't import this FastAPI will not create a table
from app.models import Vendor 

app = FastAPI()

#Binding the database with main.py
Base.metadata.create_all(bind=engine)

app.include_router(vendors.router)
# CORS origins
ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add other origins as needed
]

#Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def get_message():
    return {"Message": "Hello from FastAPI."}

if __name__ == "__main__":
    print(f"By default reload state is False.")
    print("Available CLI argument: Reload state (True/False)")

    args = sys.argv[1:]
    reload = False

    if len(args) == 1:
        if args[0].lower() == 'true':
            reload = True
    print(f"Reload State: {reload}")

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=reload)