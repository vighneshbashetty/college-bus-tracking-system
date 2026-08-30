-- Seed data for College Bus Tracking MVP (VIT Bhopal University Campus)
-- Default password for all seeded users is: password123 (hashed using bcrypt)
-- Password hash: $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg

-- Seed Users
INSERT INTO users (id, email, password_hash, role, name) VALUES
(1, 'admin@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'admin', 'Admin Staff'),
(2, 'driver.sharma@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'driver', 'R. Sharma'),
(3, 'driver.iyer@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'driver', 'M. Iyer'),
(4, 'driver.nair@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'driver', 'S. Nair'),
(5, 'driver.khan@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'driver', 'A. Khan'),
(6, 'student.aarav@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'student', 'Aarav'),
(7, 'student.diya@college.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31Sg', 'student', 'Diya')
ON CONFLICT (email) DO NOTHING;

-- Seed Buses (VIT Bhopal Campus Shuttle Fleet)
INSERT INTO buses (id, route_id, plate, capacity, occupancy, speed, status, progress, direction, delay_minutes) VALUES
('BUS-101', 'R1', 'MP-04-VB-1011', 48, 24, 1.3, 'offline', 0.15, 1, 0),
('BUS-102', 'R1', 'MP-04-VB-1012', 48, 38, 1.1, 'offline', 0.58, 1, 5),
('BUS-201', 'R1', 'MP-04-VB-2021', 52, 16, 1.5, 'offline', 0.85, -1, 0),
('BUS-301', 'R1', 'MP-04-VB-3031', 36, 8, 1.2, 'offline', 0.00, 1, 2),
('BUS-404', 'R1', 'MP-04-VB-4044', 52, 0, 0.0, 'offline', 0.40, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Seed Drivers (linked to users and buses)
INSERT INTO drivers (id, user_id, name, bus_id) VALUES
(1, 2, 'R. Sharma', 'BUS-101'),
(2, 3, 'M. Iyer', 'BUS-102'),
(3, 4, 'S. Nair', 'BUS-201'),
(4, 5, 'A. Khan', 'BUS-301')
ON CONFLICT (user_id) DO NOTHING;
