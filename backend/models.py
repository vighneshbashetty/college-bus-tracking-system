from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'admin', 'driver', 'student'
    name = Column(String, nullable=False)

    driver_profile = relationship("Driver", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Bus(Base):
    __tablename__ = "buses"

    id = Column(String, primary_key=True, index=True)  # e.g., "BUS-101"
    route_id = Column(String, nullable=False)  # e.g., "R1"
    plate = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False, default=48)
    occupancy = Column(Integer, nullable=False, default=0)
    speed = Column(Float, nullable=False, default=1.0)
    status = Column(String, nullable=False, default="offline")  # 'on-time', 'delayed', 'boarding', 'offline'
    progress = Column(Float, nullable=False, default=0.0)
    direction = Column(Integer, nullable=False, default=1)
    delay_minutes = Column(Integer, nullable=False, default=0)

    driver = relationship("Driver", back_populates="bus", uselist=False)
    locations = relationship("Location", back_populates="bus", cascade="all, delete-orphan")

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    bus_id = Column(String, ForeignKey("buses.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="driver_profile")
    bus = relationship("Bus", back_populates="driver")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(String, ForeignKey("buses.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    bus = relationship("Bus", back_populates="locations")

class BusPass(Base):
    __tablename__ = "bus_passes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pass_code = Column(String, unique=True, index=True, nullable=False)
    route_id = Column(String, nullable=False, default="ALL")
    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")  # 'active', 'boarded', 'expired'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    scanned_at = Column(DateTime(timezone=True), nullable=True)
    scanned_by_bus_id = Column(String, nullable=True)

    user = relationship("User")

