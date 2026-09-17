# Project Statement: CampusTrack AI

## Problem Statement
College campuses often span large areas with dedicated transit systems (buses, shuttles) to transport students between hostels, academic blocks, and cafeterias. However, the lack of real-time tracking and unpredictable delays caused by campus events, weather, or crowd boarding times leads to students waiting for extended periods, missing classes, or overcrowding at stops. 

## Scope of the Project
This project, CampusTrack AI, provides a real-time transit tracking and ETA prediction system designed specifically for a college campus environment. 
The core of the system is a **Machine Learning Engine (Random Forest Regressor)** that calculates dynamic, highly accurate ETAs based on real-time telemetry, weather conditions, traffic/campus event data, and bus occupancy ratios. 

The scope includes:
- A Python backend that handles synthetic telemetry generation and ML model training.
- An ML inference pipeline that decomposes ETA into physical factors (weather penalty, dwell time, traffic congestion).
- A web-based frontend to visualize live bus locations and AI-predicted arrival times.

## Target Users
- **Students & Faculty:** To track buses in real-time and view accurate, AI-adjusted ETAs before heading to the bus stop.
- **Bus Drivers:** To monitor their routes, update bus occupancy levels, and receive notifications.
- **Campus Administration:** To monitor overall transit efficiency and view delay risk factors across the campus.

## High-level Features
1. **AI ETA Prediction Engine:** Uses Scikit-Learn (Random Forest) to predict ETAs by considering distance, speed, weather, traffic, and occupancy.
2. **Real-time Map Visualization:** Displays live locations of buses on a campus map.
3. **Driver & Student Portals:** Role-based dashboards for different users.
4. **Delay Risk Analysis:** The ML model outputs not just an ETA, but a confidence score and a breakdown of delay factors (e.g., weather impact vs. crowd boarding time).
