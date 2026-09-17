# CampusTrack AI — Live College Bus Tracking & ML ETA Predictor

CampusTrack AI is a real-time college bus tracking and ML-driven ETA platform built for the **Fundamentals in AI and ML** course. This project features a React frontend, a FastAPI backend, a PostgreSQL database, and a custom **Machine Learning Engine (Random Forest)** that predicts transit delays based on weather, traffic, and bus occupancy.

## Project Structure

```text
├── backend/            # FastAPI REST API, auth system, ML prediction model, and seeds
│   └── ml_predictor.py # Scikit-Learn Random Forest ETA prediction engine
├── database/           # Raw PostgreSQL schema definition and seed SQL
├── frontend/           # React + TypeScript + Tailwind CSS client application
├── docs/               # System documentation
├── statement.md        # Problem statement and project scope
├── README.md           # Setup and running instructions (this file)
└── .gitignore          # Version control ignore lists
```

---

## 🧠 Machine Learning Features (AI & ML Course Requirement)
This project integrates a **Machine Learning Engine** (`backend/ml_predictor.py`) to provide dynamic, intelligent ETAs rather than static calculations.

- **Algorithm**: Random Forest Regressor (Scikit-Learn).
- **Features Used**: Distance remaining, current speed, stops remaining, hour of the day, day of the week, bus occupancy ratio, weather code, and traffic density.
- **Training Data**: The model generates and trains on a synthetic, physically grounded dataset of 3,500+ campus transit trips.
- **Evaluation**: The model calculates $R^2$ score and Mean Absolute Error (MAE) during training.
- **Inference output**: Provides predicted ETA, confidence score, and decomposes the delay into specific factors (e.g., weather penalty vs. dwell time).

---

## ⚡ Quickstart

To quickly explore the project, you can run the client application in **Demo Mode** without installing or running a database/backend. It runs a fully local browser-side simulation.

1. **Start the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open `http://localhost:5173` in your browser.
3. Switch the toggle on the Login page to **Demo Mode** and sign in using the quick-fill credential helpers.

---

## 🛠️ Connected Mode Setup (React + FastAPI + DB)

Follow these steps to spin up the backend APIs, configure the database, and connect the React client.

### Step 1: Database Setup (PostgreSQL or SQLite Fallback)

By default, the backend connects to a local PostgreSQL instance. If no PostgreSQL connection is configured, it **automatically falls back to SQLite** (generating a local `campustrack.db` file) so that you can run it immediately without external databases.

#### Option A: SQLite (Zero Configuration)
Skip this step. The backend will automatically create and seed the SQLite database file on startup.

#### Option B: PostgreSQL (Recommended for Database validation)
1. Ensure PostgreSQL is installed and running.
2. Create a database named `campustrack`:
   ```sql
   CREATE DATABASE campustrack;
   ```
3. Execute the schema to build the tables:
   ```bash
   psql -U postgres -d campustrack -f database/schema.sql
   ```

---

### Step 2: FastAPI Backend Setup

1. Open a new terminal window and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables template and configure it (optional for SQLite):
   ```bash
   cp .env.example .env
   ```
   *If using PostgreSQL, update `DATABASE_URL` in `.env` to point to your PostgreSQL credentials.*
5. **Seed the database** with default buses, drivers, and admin credentials:
   ```bash
   python seed.py
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will run at `http://localhost:8000`. You can inspect the interactive OpenAPI documentation at `http://localhost:8000/docs`.

---

### Step 3: Connected Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Add a local `.env` configuration pointing to the backend:
   ```bash
   echo "VITE_API_URL=http://localhost:8000" > .env
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser.
5. On the Login page, ensure **FastAPI Live** is selected, and enter any of the quick-fill credentials to test the integrated dashboards!

---

## 👥 Roles & Accounts (Seeded Data)

All seeded accounts have the password **`password123`** except the Admin account which is **`adminpassword`**.

* **Admin Staff**: `admin@college.edu` (password: `adminpassword`)
* **Driver R. Sharma**: `driver.sharma@college.edu` (password: `password123`)
* **Driver M. Iyer**: `driver.iyer@college.edu` (password: `password123`)
* **Student Aarav**: `student.aarav@college.edu` (password: `password123`)

---

## 🧪 Instructions for Testing

The project includes an automated test suite verifying auth, live bus tracking, digital pass verification, and AI/ML ETA predictions.

To execute the unit and validation tests:

```bash
# Ensure dependencies including pytest and scikit-learn are installed
pytest backend/test_api.py -v
```

All 15 test suites validate:
- User authentication and role-based access control (Admin, Driver, Student)
- Real-time GPS location ingestion and telemetry updates
- Student digital pass generation and QR validation
- **AI Model Diagnostics**: Verification of $R^2$ score ($> 0.90$), feature vector count, and training parameters
- **Dynamic ETA Prediction**: Inference across clear and simulated adverse weather/traffic conditions
