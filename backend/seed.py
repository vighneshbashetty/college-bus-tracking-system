import sys
import os
# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, Base, engine
from backend import models, auth

def seed():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("Seeding database...")
        
        # 1. Create default users if they don't exist
        user_data = [
            {"email": "admin@college.edu", "password": "adminpassword", "role": "admin", "name": "Admin Staff"},
            {"email": "driver.sharma@college.edu", "password": "password123", "role": "driver", "name": "R. Sharma"},
            {"email": "driver.iyer@college.edu", "password": "password123", "role": "driver", "name": "M. Iyer"},
            {"email": "driver.nair@college.edu", "password": "password123", "role": "driver", "name": "S. Nair"},
            {"email": "driver.khan@college.edu", "password": "password123", "role": "driver", "name": "A. Khan"},
            {"email": "student.aarav@college.edu", "password": "password123", "role": "student", "name": "Aarav"},
            {"email": "student.diya@college.edu", "password": "password123", "role": "student", "name": "Diya"}
        ]
        
        users_by_email = {}
        for ud in user_data:
            existing = db.query(models.User).filter(models.User.email == ud["email"]).first()
            if not existing:
                print(f"Creating user: {ud['email']} ({ud['role']})")
                hashed_pw = auth.get_password_hash(ud["password"])
                new_user = models.User(
                    email=ud["email"],
                    password_hash=hashed_pw,
                    role=ud["role"],
                    name=ud["name"]
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                users_by_email[ud["email"]] = new_user
            else:
                users_by_email[ud["email"]] = existing
                
        # 2. Create initial buses
        buses_data = [
            {"id": "BUS-101", "route_id": "R1", "plate": "MP-04-VB-1011", "capacity": 48, "occupancy": 24, "speed": 1.3, "status": "offline", "progress": 0.15, "direction": 1, "delay_minutes": 0},
            {"id": "BUS-102", "route_id": "R1", "plate": "MP-04-VB-1012", "capacity": 48, "occupancy": 38, "speed": 1.1, "status": "offline", "progress": 0.58, "direction": 1, "delay_minutes": 5},
            {"id": "BUS-201", "route_id": "R1", "plate": "MP-04-VB-2021", "capacity": 52, "occupancy": 16, "speed": 1.5, "status": "offline", "progress": 0.85, "direction": -1, "delay_minutes": 0},
            {"id": "BUS-301", "route_id": "R1", "plate": "MP-04-VB-3031", "capacity": 36, "occupancy": 8, "speed": 1.2, "status": "offline", "progress": 0.0, "direction": 1, "delay_minutes": 2},
            {"id": "BUS-404", "route_id": "R1", "plate": "MP-04-VB-4044", "capacity": 52, "occupancy": 0, "speed": 0.0, "status": "offline", "progress": 0.4, "direction": 1, "delay_minutes": 0}
        ]
        
        for bd in buses_data:
            existing = db.query(models.Bus).filter(models.Bus.id == bd["id"]).first()
            if not existing:
                print(f"Creating bus: {bd['id']}")
                new_bus = models.Bus(**bd)
                db.add(new_bus)
                db.commit()
            else:
                existing.route_id = bd["route_id"]
                existing.plate = bd["plate"]
                db.commit()
                
        # 3. Create driver profiles and assign them to buses
        driver_assignments = [
            {"email": "driver.sharma@college.edu", "bus_id": "BUS-101", "name": "R. Sharma"},
            {"email": "driver.iyer@college.edu", "bus_id": "BUS-102", "name": "M. Iyer"},
            {"email": "driver.nair@college.edu", "bus_id": "BUS-201", "name": "S. Nair"},
            {"email": "driver.khan@college.edu", "bus_id": "BUS-301", "name": "A. Khan"}
        ]
        
        for da in driver_assignments:
            user = users_by_email.get(da["email"])
            if user:
                existing = db.query(models.Driver).filter(models.Driver.user_id == user.id).first()
                if not existing:
                    print(f"Creating driver profile for user {user.name} and assigning to {da['bus_id']}")
                    new_driver = models.Driver(
                        user_id=user.id,
                        name=da["name"],
                        bus_id=da["bus_id"]
                    )
                    db.add(new_driver)
                    db.commit()
                else:
                    if existing.bus_id != da["bus_id"]:
                        print(f"Updating driver profile assignment for {user.name} to {da['bus_id']}")
                        existing.bus_id = da["bus_id"]
                        db.commit()
                        
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
