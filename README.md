# FastAPI, React, SQLite CRUD Template
This repository is designed as a template for anyone who wishes to build full-stack applications using FastAPI for the backend, React for the frontend, SQLite for the database, and Docker for containerization. It's a versatile, lightweight, and powerful stack that I've used for both personal projects and internal company applications.

## Why I Chose This Stack
- FastAPI: Fast, modern, and asynchronous framework for building APIs with Python.
- React: One of the most popular JavaScript libraries for building user interfaces.
- SQLite: A simple, lightweight database engine perfect for small to medium-sized applications.
- Tabler: A free and open-source web application UI kit based on Bootstrap 5, with hundreds of responsive components and multiple layouts.
- Docker: Easy setup and deployment across different environments, ensuring that "it works on my machine" for everyone.

## Overview
This diagram illustrates the project architecture:
![Project Architecture](https://github.com/Ballal65/FastAPI-SQLlite-React-Tabler--CRUD-Template-Without-authentication/blob/main/Docker%20Overview.png)

# Backend
## Folder Structure
```
|- backend
|--- app
|------ __init__.py
|------ database.py   # Creating SQLite engine, Base, SessionLocal
|------ main.py       # FastAPI application entry point
|------ models.py     # SQLAlchemy models
|--- routers
|------ __init__.py
|------ vendors.py    # CRUD router for managing vendors
|--- data
|------ sql_app.db    # SQLite database file
|--- dockerfile       # Dockerfile for containerizing the FastAPI app
|--- requirements.txt # Python dependencies for the project
```
## Backend Important files
- database.py: Contains the configuration for the SQLite database and SQLAlchemy engine. It also defines SessionLocal for database session management and Base for model definitions.

- main.py: The main entry point for the FastAPI app, where the API routes are defined and FastAPI is initialized.

- models.py: Defines the database models using SQLAlchemy, which are the structure of the tables in the SQLite database.

- vendors.py: Contains CRUD operations (Create, Read, Update, Delete) for the Vendor resource using FastAPI and SQLAlchemy. Pydantic models are used for input validation.

- sql_app.db: The SQLite database file where all data for the project is stored.

- dockerfile: Defines how to containerize the FastAPI application using Docker.

![Backend Docs](https://github.com/Ballal65/FastAPI-SQLlite-React-Tabler--CRUD-Template-Without-authentication/blob/main/Backend%20Docs.png)

# Frontend
## Folder Structure
```
|- Frontend
|--- package.json
|--- package-lock.json
|--- dockerfile
!--- src
|------ app.js             # App Routes
|------ index.js           # The entry point of a React application
|------ pages
|--------- Dashboard.js    # Vendors Page
|--------- Example.js      # Sample empty Page
|------ components
|--------- ConfirmModal.js # Modal to confirm vendor delete
|--------- VendorModal.js  # Modal to create or edit vendor
|--------- VendorTable.js  # Simple vendors table with CRUD buttons
|--- public
|------ index.html         # Created to include Tabler css
|------ dist               # Tabler assets
|------ static             # Table assets
|------ favicon            # Different favicon files
```

## Description 
The screenshot shows Dashboard.js, which uses VendorTable.js to display the table. When you click Add Vendor, the VendorModal.js modal shows up, which is used to create a vendor. The same modal is used to edit the selected vendor. ConfirmModal.js modal opens when you click the delete button for a vendor. I haven't added pagination yet. 
Ignore the header. It is a sample header that we can use for other projects. The header shows the favicon from the public/favicon folder. The HTML code written in the front end is based on the Tabler theme. To learn more about tabler visit `https://tabler.io/admin-template` 

![Frontend Screenshot](https://github.com/Ballal65/FastAPI-SQLlite-React-Tabler--CRUD-Template-Without-authentication/blob/main/Frontend%20Screenshot.png)

# How to use this template
## With Docker
If you are running the docker in localhost, `docker compose up --build -d` will work just fine. If you want to try this out some place else, edit the `.env` file in `frontend/.env`. It looks like 
```
REACT_APP_BACKEND_API_URL=http://backend:8000
```
Replace the work backend with your IP. 
In your backend folder you will need to edit the main.py file to add the IP to origins.
```
ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add other origins as needed
]
```
Once, frontend/.env file and backend/main.py is edited, running the app with Docker is straightforward.You must start your Docker engine and execute this command in the root folder. The command will create containers using the docker-compose.yml file and Docker files from the frontend and backend folders. 
```
docker compose up --build -d
```

## Without Docker
### Backend
1. Navigate to the backend folder, you will need to create a virtual environment with 
```
python -m venv venv
```
2. Install all dependencies
```
pip install -r requirements.txt
```
3. Go to the `backend/app` folder and start your application. You can add one argument, 'True' or 'False', to specify the reload state. By default, it is false.
```
python main.py (True/False)
```

### Frontend
1. Navigate to the frontend folder. Install dependencies.
 ```
npm install
 ```
2. Start the app.
```
npm start
```
# Database mount
I love working with SQLite db for smaller or personal applications. The database is safe even if you destroy the docker container as we are using docker volume. A Docker volume is a storage mechanism in Docker that allows containers to persist data, share data between containers, or access data on the host filesystem. You can find the SQLite db `sql_app.db` file in the `backend/data`. 
