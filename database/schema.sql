-- PostgreSQL Schema for College Bus Tracking MVP

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'driver', 'student'
    name VARCHAR(255) NOT NULL
);

-- Create Buses table
CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'BUS-101'
    route_id VARCHAR(50) NOT NULL, -- e.g., 'R1'
    plate VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 48,
    occupancy INTEGER NOT NULL DEFAULT 0,
    speed DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    status VARCHAR(50) NOT NULL DEFAULT 'offline', -- 'on-time', 'delayed', 'boarding', 'offline'
    progress DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    direction INTEGER NOT NULL DEFAULT 1, -- 1 or -1
    delay_minutes INTEGER NOT NULL DEFAULT 0
);

-- Create Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bus_id VARCHAR(50) REFERENCES buses(id) ON DELETE SET NULL
);

-- Create Locations history table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    bus_id VARCHAR(50) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
