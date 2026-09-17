from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserBase(BaseModel):
    email: str
    role: str
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class BusBase(BaseModel):
    id: str
    route_id: str
    plate: str
    capacity: int
    occupancy: int
    speed: float
    status: str
    progress: float
    direction: int
    delay_minutes: int

class BusCreate(BusBase):
    pass

class BusUpdate(BaseModel):
    route_id: Optional[str] = None
    plate: Optional[str] = None
    capacity: Optional[int] = None
    occupancy: Optional[int] = None
    speed: Optional[float] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    direction: Optional[int] = None
    delay_minutes: Optional[int] = None

class DriverCreate(BaseModel):
    email: str
    password: str
    name: str
    bus_id: Optional[str] = None

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    bus_id: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class DriverResponse(BaseModel):
    id: int
    user_id: int
    name: str
    bus_id: Optional[str] = None
    email: Optional[str] = None  # Flattened user email for UI convenience
    model_config = ConfigDict(from_attributes=True)

class BusResponse(BusBase):
    driver_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class LocationBase(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    speed: Optional[float] = None

class LocationCreate(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    speed: Optional[float] = None
    timestamp: Optional[str] = None

class LocationResponse(LocationBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class LocationLatestResponse(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    speed: Optional[float] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

class PassGenerateRequest(BaseModel):
    route_id: Optional[str] = "ALL"

class PassVerifyRequest(BaseModel):
    pass_code: str
    bus_id: str

class BusPassResponse(BaseModel):
    id: int
    user_id: int
    pass_code: str
    route_id: str
    student_name: str
    student_email: str
    status: str
    created_at: datetime
    scanned_at: Optional[datetime] = None
    scanned_by_bus_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PassVerifyResponse(BaseModel):
    success: bool
    message: str
    student_name: Optional[str] = None
    route_id: Optional[str] = None
    bus_id: Optional[str] = None
    occupancy: Optional[int] = None

# --- AI Prediction Schemas ---

class AIPredictETARequest(BaseModel):
    bus_id: str
    stop_id: str
    weather: Optional[str] = "clear"  # 'clear', 'light_rain', 'heavy_rain', 'fog'
    traffic_level: Optional[str] = None  # 'light', 'moderate', 'heavy', 'campus_event' (None = auto-infer from hour)

class AIFactorImpact(BaseModel):
    factor: str
    category: str  # 'weather', 'traffic', 'crowd', 'route', 'speed'
    impact_minutes: float
    description: str

class AIPredictETAResponse(BaseModel):
    bus_id: str
    stop_id: str
    stop_name: str
    route_id: str
    predicted_eta_minutes: float
    baseline_eta_minutes: float
    predicted_delay_minutes: float
    delay_risk: str  # 'low', 'moderate', 'high', 'severe'
    confidence: float
    distance_meters: float
    stops_remaining: int
    current_speed: float
    weather: str
    traffic_level: str
    factors: List[AIFactorImpact]
    timestamp: datetime

class AIModelInfoResponse(BaseModel):
    model_name: str
    algorithm: str
    features: List[str]
    training_samples: int
    r2_score: float
    mae_minutes: float
    last_trained_at: str
    status: str

