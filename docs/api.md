# CampusTrack API Documentation

The FastAPI backend exposes the following REST APIs for authentication, fleet management, and location updates.

## Base URL
Default: `http://localhost:8000`

---

## Authentication

### 1. Register User
* **Endpoint**: `/api/auth/register`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "email": "student.name@college.edu",
    "password": "password123",
    "role": "student",
    "name": "Student Name"
  }
  ```
* **Response**: Returns the registered user details (excluding password).

### 2. Login User
* **Endpoint**: `/api/auth/login`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "email": "admin@college.edu",
    "password": "adminpassword"
  }
  ```
* **Response**:
  ```json
  {
    "access_token": "eyJhbG...",
    "token_type": "bearer",
    "role": "admin",
    "name": "Admin Staff",
    "email": "admin@college.edu"
  }
  ```

### 3. Get Authenticated User Profile
* **Endpoint**: `/api/auth/me`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: Returns current user's profile details.

---

## Bus Management

### 1. Get All Buses
* **Endpoint**: `/api/buses`
* **Method**: `GET`
* **Response**: A list of all buses in the database, populated with their assigned driver's name.

### 2. Create Bus (Admin Only)
* **Endpoint**: `/api/buses`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "id": "BUS-105",
    "route_id": "R1",
    "plate": "KA-01-AA-9999",
    "capacity": 48,
    "occupancy": 0,
    "speed": 0.0,
    "status": "offline",
    "progress": 0.0,
    "direction": 1,
    "delay_minutes": 0
  }
  ```

### 3. Update Bus Details (Admin / Assigned Driver Only)
* **Endpoint**: `/api/buses/{bus_id}`
* **Method**: `PUT`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body** (All fields optional):
  ```json
  {
    "route_id": "R2",
    "plate": "KA-01-AA-9999",
    "capacity": 48,
    "occupancy": 15,
    "status": "on-time",
    "progress": 0.42,
    "direction": 1,
    "delay_minutes": 5
  }
  ```

### 4. Delete Bus (Admin Only)
* **Endpoint**: `/api/buses/{bus_id}`
* **Method**: `DELETE`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## Driver Management

### 1. Get All Drivers
* **Endpoint**: `/api/drivers`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: A list of all drivers and their assigned buses.

### 2. Create Driver (Admin Only)
* **Endpoint**: `/api/drivers`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "email": "driver.singh@college.edu",
    "password": "password123",
    "name": "Vikram Singh",
    "bus_id": "BUS-101"
  }
  ```

### 3. Update Driver Profile / Assign Bus (Admin Only)
* **Endpoint**: `/api/drivers/{driver_id}`
* **Method**: `PUT`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "name": "Vikram Singh Updated",
    "bus_id": "BUS-102",
    "email": "driver.singh.new@college.edu"
  }
  ```

### 4. Delete Driver Account (Admin Only)
* **Endpoint**: `/api/drivers/{driver_id}`
* **Method**: `DELETE`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## Location Updates

### 1. Record Bus Coordinate History
* **Endpoint**: `/api/locations`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "bus_id": "BUS-101",
    "x": 42.5,
    "y": 68.2
  }
  ```

### 2. Get Location Coordinates History
* **Endpoint**: `/api/locations/{bus_id}`
* **Method**: `GET`
* **Response**: An ordered array of the last 50 coordinates recorded for the specified bus.
