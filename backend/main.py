import os
import sys
from pathlib import Path

# Ensure backend directory is prioritized in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import engine, get_db, SessionLocal, Base
import models, schemas, auth

# Create database tables automatically (excellent fallback for SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CampusTrack API", description="FastAPI Backend for College Bus Tracking MVP")

# Configure CORS so the React frontend (and mobile phones on local network) can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Endpoints ---

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # ------ Validation ------
    import re
    # Enforce email format name@vitbhopal.ac.in
    email_pattern = r"^[A-Za-z0-9._%+-]+@vitbhopal\.ac\.in$"
    if not re.fullmatch(email_pattern, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be of the form name@vitbhopal.ac.in"
        )
    # Enforce password to be numbers only
    if not user_in.password.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain numbers only"
        )
    # Duplicate email check
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
        
    hashed_pwd = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        password_hash=hashed_pwd,
        role=user_in.role,
        name=user_in.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # If the registered user is a driver, create an empty driver profile
    if new_user.role == "driver":
        new_driver = models.Driver(
            user_id=new_user.id,
            name=new_user.name,
            bus_id=None
        )
        db.add(new_driver)
        db.commit()
        
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(
    email: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db)
):
    # Retrieve user by email
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth.verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }

# Swagger/OAuth2 standard password form fallback login
@app.post("/api/auth/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- Bus Management Endpoints ---

@app.get("/api/buses", response_model=List[schemas.BusResponse])
def get_buses(db: Session = Depends(get_db)):
    buses = db.query(models.Bus).all()
    response = []
    for bus in buses:
        # Fetch the driver's name if assigned to this bus
        driver = db.query(models.Driver).filter(models.Driver.bus_id == bus.id).first()
        bus_data = schemas.BusResponse(
            id=bus.id,
            route_id=bus.route_id,
            plate=bus.plate,
            capacity=bus.capacity,
            occupancy=bus.occupancy,
            speed=bus.speed,
            status=bus.status,
            progress=bus.progress,
            direction=bus.direction,
            delay_minutes=bus.delay_minutes,
            driver_name=driver.name if driver else "None"
        )
        response.append(bus_data)
    return response

@app.post("/api/buses", response_model=schemas.BusResponse, status_code=status.HTTP_201_CREATED)
def create_bus(
    bus_in: schemas.BusCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_current_active_admin)
):
    db_bus = db.query(models.Bus).filter(models.Bus.id == bus_in.id).first()
    if db_bus:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bus with ID {bus_in.id} already exists."
        )
    
    new_bus = models.Bus(**bus_in.model_dump())
    db.add(new_bus)
    db.commit()
    db.refresh(new_bus)
    
    return schemas.BusResponse(
        id=new_bus.id,
        route_id=new_bus.route_id,
        plate=new_bus.plate,
        capacity=new_bus.capacity,
        occupancy=new_bus.occupancy,
        speed=new_bus.speed,
        status=new_bus.status,
        progress=new_bus.progress,
        direction=new_bus.direction,
        delay_minutes=new_bus.delay_minutes,
        driver_name="None"
    )

@app.put("/api/buses/{bus_id}", response_model=schemas.BusResponse)
def update_bus(
    bus_id: str,
    bus_in: schemas.BusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    bus = db.query(models.Bus).filter(models.Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found"
        )
    
    # Drivers can only update their own assigned bus's progress, direction, occupancy, delay and status.
    # Admins can update anything.
    if current_user.role == "driver":
        driver_profile = db.query(models.Driver).filter(models.Driver.user_id == current_user.id).first()
        if not driver_profile or driver_profile.bus_id != bus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your assigned bus"
            )
        
        # Restrict fields updated by driver
        update_data = bus_in.model_dump(exclude_unset=True)
        allowed_fields = {"progress", "direction", "occupancy", "status", "delay_minutes", "speed"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        # Admin can update anything
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update bus details"
            )
        update_data = bus_in.model_dump(exclude_unset=True)
        
    for key, value in update_data.items():
        setattr(bus, key, value)
        
    db.commit()
    db.refresh(bus)
    
    driver = db.query(models.Driver).filter(models.Driver.bus_id == bus.id).first()
    return schemas.BusResponse(
        id=bus.id,
        route_id=bus.route_id,
        plate=bus.plate,
        capacity=bus.capacity,
        occupancy=bus.occupancy,
        speed=bus.speed,
        status=bus.status,
        progress=bus.progress,
        direction=bus.direction,
        delay_minutes=bus.delay_minutes,
        driver_name=driver.name if driver else "None"
    )

@app.delete("/api/buses/{bus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bus(
    bus_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_current_active_admin)
):
    bus = db.query(models.Bus).filter(models.Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found"
        )
    db.delete(bus)
    db.commit()
    return None


# --- Driver Management Endpoints ---

@app.get("/api/drivers", response_model=List[schemas.DriverResponse])
def get_drivers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    drivers = db.query(models.Driver).all()
    result = []
    for d in drivers:
        user = db.query(models.User).filter(models.User.id == d.user_id).first()
        result.append(schemas.DriverResponse(
            id=d.id,
            user_id=d.user_id,
            name=d.name,
            bus_id=d.bus_id,
            email=user.email if user else ""
        ))
    return result

@app.post("/api/drivers", response_model=schemas.DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    driver_in: schemas.DriverCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_current_active_admin)
):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == driver_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
        
    # Create the User account
    hashed_pwd = auth.get_password_hash(driver_in.password)
    new_user = models.User(
        email=driver_in.email,
        password_hash=hashed_pwd,
        role="driver",
        name=driver_in.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create the Driver profile
    new_driver = models.Driver(
        user_id=new_user.id,
        name=driver_in.name,
        bus_id=driver_in.bus_id
    )
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)
    
    return schemas.DriverResponse(
        id=new_driver.id,
        user_id=new_driver.user_id,
        name=new_driver.name,
        bus_id=new_driver.bus_id,
        email=new_user.email
    )

@app.put("/api/drivers/{driver_id}", response_model=schemas.DriverResponse)
def update_driver(
    driver_id: int,
    driver_in: schemas.DriverUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_current_active_admin)
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
        
    user = db.query(models.User).filter(models.User.id == driver.user_id).first()
    
    # Check email conflict if updated
    if driver_in.email and user and driver_in.email != user.email:
        conflict = db.query(models.User).filter(models.User.email == driver_in.email).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )
            
    # Update Driver details
    if driver_in.name is not None:
        driver.name = driver_in.name
        if user:
            user.name = driver_in.name
            
    if driver_in.bus_id is not None:
        # If bus_id is set, ensure no other driver is assigned to it, or clear their assignment
        if driver_in.bus_id != "":
            existing_driver = db.query(models.Driver).filter(models.Driver.bus_id == driver_in.bus_id).first()
            if existing_driver and existing_driver.id != driver.id:
                # Unassign the other driver from that bus
                existing_driver.bus_id = None
            driver.bus_id = driver_in.bus_id
        else:
            driver.bus_id = None
            
    # Update User credentials if provided
    if user:
        if driver_in.email:
            user.email = driver_in.email
        if driver_in.password:
            user.password_hash = auth.get_password_hash(driver_in.password)
            
    db.commit()
    db.refresh(driver)
    if user:
        db.refresh(user)
        
    return schemas.DriverResponse(
        id=driver.id,
        user_id=driver.user_id,
        name=driver.name,
        bus_id=driver.bus_id,
        email=user.email if user else ""
    )

@app.delete("/api/drivers/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_current_active_admin)
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    # Deleting the user automatically cascade-deletes the driver profile due to ForeignKey cascade.
    user = db.query(models.User).filter(models.User.id == driver.user_id).first()
    if user:
        db.delete(user)
    else:
        db.delete(driver)
        
    db.commit()
    return None

# --- Location Endpoints ---

@app.post("/api/locations", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
def record_location(
    loc_in: schemas.LocationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Ensure bus exists
    bus = db.query(models.Bus).filter(models.Bus.id == loc_in.bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found"
        )
        
    # Check driver permissions (drivers can only update their assigned bus location)
    if current_user.role == "driver":
        driver_profile = db.query(models.Driver).filter(models.Driver.user_id == current_user.id).first()
        if not driver_profile or driver_profile.bus_id != loc_in.bus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You are only authorized to update locations for your assigned bus ({driver_profile.bus_id if driver_profile else 'None'})"
            )
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to post bus locations"
        )
            
    new_loc = models.Location(
        bus_id=loc_in.bus_id,
        latitude=loc_in.latitude,
        longitude=loc_in.longitude,
        speed=loc_in.speed
    )
    db.add(new_loc)
    
    # If bus is marked offline, automatically activate it when live GPS starts
    if bus.status == "offline":
        bus.status = "on-time"
    if loc_in.speed is not None and loc_in.speed > 0:
        bus.speed = float(loc_in.speed)
        
    db.commit()
    db.refresh(new_loc)
    return new_loc

@app.get("/api/locations/{bus_id}/latest", response_model=schemas.LocationLatestResponse)
def get_latest_location(bus_id: str, db: Session = Depends(get_db)):
    # Retrieve the single latest GPS location recorded for this bus
    latest_loc = db.query(models.Location)\
                   .filter(models.Location.bus_id == bus_id)\
                   .order_by(models.Location.timestamp.desc(), models.Location.id.desc())\
                   .first()
    if not latest_loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No location records found for bus {bus_id}"
        )
    return schemas.LocationLatestResponse(
        bus_id=latest_loc.bus_id,
        latitude=latest_loc.latitude,
        longitude=latest_loc.longitude,
        speed=latest_loc.speed,
        timestamp=latest_loc.timestamp
    )

@app.get("/api/locations/{bus_id}", response_model=List[schemas.LocationResponse])
def get_locations(bus_id: str, db: Session = Depends(get_db)):
    # Return last 50 coordinates for the bus route history
    locations = db.query(models.Location)\
                  .filter(models.Location.bus_id == bus_id)\
                  .order_by(models.Location.timestamp.desc(), models.Location.id.desc())\
                  .limit(50)\
                  .all()
    return locations[::-1] # Reverse to get chronological order

# --- AI Chatbot Endpoints ---

@app.post("/api/chat")
def chat_endpoint(req: schemas.ChatRequest, db: Session = Depends(get_db)):
    import chat
    response_text = chat.generate_chat_response(req.message, db, req.history)
    return {"reply": response_text}

# --- AI ML Delay & ETA Prediction Endpoints ---

@app.post("/api/ai/predict-eta", response_model=schemas.AIPredictETAResponse)
def predict_eta_post(
    req: schemas.AIPredictETARequest,
    db: Session = Depends(get_db)
):
    from ml_predictor import predictor
    bus = db.query(models.Bus).filter(models.Bus.id == req.bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {req.bus_id} not found"
        )
    return predictor.predict_for_bus(
        bus=bus,
        stop_id=req.stop_id,
        weather=req.weather or "clear",
        traffic_level=req.traffic_level
    )

@app.get("/api/ai/predict-eta/{bus_id}/{stop_id}", response_model=schemas.AIPredictETAResponse)
def predict_eta_get(
    bus_id: str,
    stop_id: str,
    weather: Optional[str] = "clear",
    traffic_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from ml_predictor import predictor
    bus = db.query(models.Bus).filter(models.Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {bus_id} not found"
        )
    return predictor.predict_for_bus(
        bus=bus,
        stop_id=stop_id,
        weather=weather or "clear",
        traffic_level=traffic_level
    )

@app.get("/api/ai/model-info", response_model=schemas.AIModelInfoResponse)
def get_model_info():
    from ml_predictor import predictor
    m = predictor.metrics
    return schemas.AIModelInfoResponse(
        model_name=m.get("model_name", "CampusTrack Transit Random Forest"),
        algorithm=m.get("algorithm", "RandomForestRegressor"),
        features=m.get("features", []),
        training_samples=m.get("training_samples", 3500),
        r2_score=m.get("r2_score", 0.94),
        mae_minutes=m.get("mae_minutes", 0.4),
        last_trained_at=m.get("last_trained_at", ""),
        status=m.get("status", "ready")
    )

@app.post("/api/ai/retrain", response_model=schemas.AIModelInfoResponse)
def retrain_model(
    admin: models.User = Depends(auth.get_current_active_admin)
):
    from ml_predictor import predictor
    metrics = predictor.train()
    return schemas.AIModelInfoResponse(
        model_name=metrics.get("model_name", "CampusTrack Transit Random Forest"),
        algorithm=metrics.get("algorithm", "RandomForestRegressor"),
        features=metrics.get("features", []),
        training_samples=metrics.get("training_samples", 3500),
        r2_score=metrics.get("r2_score", 0.94),
        mae_minutes=metrics.get("mae_minutes", 0.4),
        last_trained_at=metrics.get("last_trained_at", ""),
        status=metrics.get("status", "ready")
    )


# --- Digital Pass Endpoints ---

@app.post("/api/pass/generate", response_model=schemas.BusPassResponse)
def generate_pass(
    req: schemas.PassGenerateRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    import secrets
    existing_pass = db.query(models.BusPass).filter(
        models.BusPass.user_id == current_user.id,
        models.BusPass.status == "active"
    ).first()

    if existing_pass:
        return existing_pass

    random_code = f"PASS-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
    new_pass = models.BusPass(
        user_id=current_user.id,
        pass_code=random_code,
        route_id=req.route_id or "ALL",
        student_name=current_user.name,
        student_email=current_user.email,
        status="active"
    )
    db.add(new_pass)
    db.commit()
    db.refresh(new_pass)
    return new_pass

@app.get("/api/pass/my-pass", response_model=schemas.BusPassResponse)
def get_my_pass(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    import secrets
    pass_item = db.query(models.BusPass).filter(
        models.BusPass.user_id == current_user.id,
        models.BusPass.status == "active"
    ).order_by(models.BusPass.created_at.desc()).first()

    if not pass_item:
        random_code = f"PASS-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
        pass_item = models.BusPass(
            user_id=current_user.id,
            pass_code=random_code,
            route_id="ALL",
            student_name=current_user.name,
            student_email=current_user.email,
            status="active"
        )
        db.add(pass_item)
        db.commit()
        db.refresh(pass_item)
    return pass_item

@app.post("/api/pass/verify", response_model=schemas.PassVerifyResponse)
def verify_pass(
    req: schemas.PassVerifyRequest,
    db: Session = Depends(get_db)
):
    pass_item = db.query(models.BusPass).filter(
        models.BusPass.pass_code == req.pass_code
    ).first()

    if not pass_item:
        return schemas.PassVerifyResponse(
            success=False,
            message=f"Invalid Pass Code '{req.pass_code}'. Not found in system records."
        )

    if pass_item.status == "boarded":
        scanned_time = pass_item.scanned_at.strftime('%H:%M') if pass_item.scanned_at else 'earlier'
        return schemas.PassVerifyResponse(
            success=False,
            message=f"Pass already scanned for {pass_item.student_name} at {scanned_time}.",
            student_name=pass_item.student_name,
            route_id=pass_item.route_id,
            bus_id=pass_item.scanned_by_bus_id
        )

    pass_item.status = "boarded"
    pass_item.scanned_at = datetime.now(timezone.utc)
    pass_item.scanned_by_bus_id = req.bus_id

    bus = db.query(models.Bus).filter(models.Bus.id == req.bus_id).first()
    new_occupancy = None
    if bus:
        if bus.occupancy < bus.capacity:
            bus.occupancy += 1
        new_occupancy = bus.occupancy

    db.commit()

    return schemas.PassVerifyResponse(
        success=True,
        message=f"Pass verified! Welcome aboard, {pass_item.student_name}.",
        student_name=pass_item.student_name,
        route_id=pass_item.route_id,
        bus_id=req.bus_id,
        occupancy=new_occupancy
    )

@app.get("/api/pass/logs", response_model=List[schemas.BusPassResponse])
def get_pass_logs(db: Session = Depends(get_db)):
    return db.query(models.BusPass).order_by(models.BusPass.created_at.desc()).limit(100).all()

