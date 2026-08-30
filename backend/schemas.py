from pydantic import BaseModel
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
    
    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

class BusResponse(BusBase):
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True

class LocationBase(BaseModel):
    bus_id: str
    x: float
    y: float

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
