import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from main import app
import models
from database import SessionLocal

client = TestClient(app)

def test_login_admin():
    res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "adminpassword"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "admin"

def test_login_driver():
    res = client.post("/api/auth/login", json={"email": "driver.sharma@college.edu", "password": "password123"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "driver"

def test_login_student():
    res = client.post("/api/auth/login", json={"email": "student.aarav@college.edu", "password": "password123"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "student"

def test_login_invalid():
    res = client.post("/api/auth/login", json={"email": "fake@college.edu", "password": "wrong"})
    assert res.status_code == 401

def test_get_buses():
    res = client.get("/api/buses")
    assert res.status_code == 200
    buses = res.json()
    assert len(buses) > 0
    bus_ids = [b["id"] for b in buses]
    assert "BUS-101" in bus_ids

def test_get_drivers():
    # Needs auth
    login_res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "adminpassword"})
    token = login_res.json()["access_token"]
    res = client.get("/api/drivers", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    drivers = res.json()
    assert len(drivers) > 0

def test_auth_me():
    login_res = client.post("/api/auth/login", json={"email": "student.aarav@college.edu", "password": "password123"})
    token = login_res.json()["access_token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    user = res.json()
    assert user["email"] == "student.aarav@college.edu"
    assert user["role"] == "student"

def test_driver_location_update():
    login_res = client.post("/api/auth/login", json={"email": "driver.sharma@college.edu", "password": "password123"})
    token = login_res.json()["access_token"]
    # Driver Sharma is assigned to BUS-101
    loc_data = {
        "bus_id": "BUS-101",
        "latitude": 23.078,
        "longitude": 76.852,
        "speed": 42.5
    }
    res = client.post("/api/locations", json=loc_data, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201, res.text

    # Test latest location
    latest_res = client.get("/api/locations/BUS-101/latest")
    assert latest_res.status_code == 200
    assert latest_res.json()["latitude"] == 23.078

def test_student_digital_pass():
    login_res = client.post("/api/auth/login", json={"email": "student.aarav@college.edu", "password": "password123"})
    token = login_res.json()["access_token"]
    
    # Get or generate pass
    res = client.get("/api/pass/my-pass", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    pass_data = res.json()
    assert "pass_code" in pass_data
    assert pass_data["student_name"] == "Aarav"

    # Verify pass
    verify_res = client.post("/api/pass/verify", json={
        "pass_code": pass_data["pass_code"],
        "bus_id": "BUS-101"
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["success"] is True

def test_pass_logs():
    res = client.get("/api/pass/logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)

# --- AI Prediction & ML Tests ---

def test_ai_model_info():
    res = client.get("/api/ai/model-info")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "model_name" in data
    assert "algorithm" in data
    assert len(data["features"]) >= 5
    assert data["r2_score"] > 0.7
    assert data["training_samples"] > 1000

def test_ai_predict_eta_post():
    res = client.post("/api/ai/predict-eta", json={
        "bus_id": "BUS-101",
        "stop_id": "s5",
        "weather": "clear",
        "traffic_level": "light"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["bus_id"] == "BUS-101"
    assert data["stop_id"] == "s5"
    assert data["stop_name"] == "AB2"
    assert data["predicted_eta_minutes"] >= 1.0
    assert data["baseline_eta_minutes"] >= 1.0
    assert data["delay_risk"] in ["low", "moderate", "high", "severe"]
    assert data["confidence"] > 0.8
    assert isinstance(data["factors"], list)

def test_ai_predict_eta_weather_simulation():
    # Simulation with adverse weather and heavy traffic
    res = client.post("/api/ai/predict-eta", json={
        "bus_id": "BUS-102",
        "stop_id": "s6",
        "weather": "heavy_rain",
        "traffic_level": "heavy"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["weather"] == "heavy_rain"
    assert data["traffic_level"] == "heavy"
    # Delay should be detected
    assert data["predicted_delay_minutes"] > 0.0
    categories = [f["category"] for f in data["factors"]]
    assert "weather" in categories
    assert "traffic" in categories

def test_ai_predict_eta_get():
    res = client.get("/api/ai/predict-eta/BUS-101/s2?weather=clear")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["bus_id"] == "BUS-101"
    assert data["stop_id"] == "s2"
    assert data["predicted_eta_minutes"] >= 1.0

def test_ai_predict_eta_invalid_bus():
    res = client.post("/api/ai/predict-eta", json={
        "bus_id": "NON_EXISTENT_BUS",
        "stop_id": "s1"
    })
    assert res.status_code == 404
