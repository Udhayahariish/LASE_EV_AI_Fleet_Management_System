import os
import pandas as pd
from database import get_connection

def sync_excel():
    print("Connecting to MySQL database...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(f"Error connecting to MySQL database: {e}")
        return

    # 1. Create tables if they do not exist
    print("Ensuring tables exist in MySQL...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role ENUM('admin', 'driver') NOT NULL,
        driver_id VARCHAR(50) DEFAULT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fleet_trips (
        trip_id VARCHAR(50) PRIMARY KEY,
        vehicle_id VARCHAR(50),
        driver_id VARCHAR(50),
        driver_name VARCHAR(100),
        mail VARCHAR(150),
        password VARCHAR(100),
        registration_number VARCHAR(50),
        manufacturer VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_type VARCHAR(50),
        battery_capacity_kwh FLOAT,
        motor_power_kw FLOAT,
        trip_date VARCHAR(50),
        trip_distance_km FLOAT,
        trip_status VARCHAR(50),
        speed_kmph FLOAT,
        avg_speed_kmph FLOAT,
        max_speed_kmph FLOAT,
        battery_percentage FLOAT,
        estimated_range_km FLOAT,
        energy_consumption_kwh FLOAT,
        driving_behavior VARCHAR(50),
        driver_rating FLOAT,
        driver_score FLOAT,
        gross_revenue_inr FLOAT,
        net_revenue_inr FLOAT,
        trip_profit_inr FLOAT,
        vehicle_in_garage VARCHAR(10),
        maintenance_type VARCHAR(100),
        maintenance_status VARCHAR(100)
    );
    """)

    # 2. Insert Default Admin account
    print("Creating default Admin account...")
    cursor.execute("""
    INSERT IGNORE INTO users (full_name, email, password, role, driver_id)
    VALUES ('System Admin', 'admin@gmail.com', 'Admin@12345', 'admin', 'ADM001')
    """)

    # 3. Read CSV dataset
    csv_path = 'LASE EV DATA SET.csv'
    if not os.path.exists(csv_path):
        if os.path.exists('LASE EV DATASET.csv'):
            csv_path = 'LASE EV DATASET.csv'
        else:
            print(f"Error: {csv_path} not found!")
            return

    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Total records found in CSV: {len(df)}")

    # 4. Insert rows into MySQL
    print("Uploading records to MySQL database (please wait)...")
    for _, row in df.iterrows():
        try:
            m_name = str(row.get('Manufacturer', row.get('manufacturer', ''))).strip()
            v_model = str(row.get('vehicle_model', row.get('model', ''))).strip()
            
            # Insert trip record
            cursor.execute("""
            INSERT IGNORE INTO fleet_trips 
            (trip_id, vehicle_id, driver_id, driver_name, mail, password, registration_number, 
             manufacturer, vehicle_model, vehicle_type, battery_capacity_kwh, motor_power_kw, 
             trip_date, trip_distance_km, trip_status, speed_kmph, avg_speed_kmph, max_speed_kmph, 
             battery_percentage, estimated_range_km, energy_consumption_kwh, driving_behavior, 
             driver_rating, driver_score, gross_revenue_inr, net_revenue_inr, trip_profit_inr, 
             vehicle_in_garage, maintenance_type, maintenance_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(row.get('trip_id', '')), str(row.get('vehicle_id', '')), str(row.get('driver_id', '')),
                str(row.get('driver_name', '')), str(row.get('mail', '')).strip().lower(), str(row.get('password', '')).strip(),
                str(row.get('registration_number', '')), m_name, v_model, str(row.get('vehicle_type', '')),
                float(row.get('battery_capacity_kwh', 0) or 0), float(row.get('motor_power_kw', 0) or 0),
                str(row.get('trip_date', '')), float(row.get('trip_distance_km', 0) or 0), str(row.get('trip_status', '')),
                float(row.get('speed_kmph', 0) or 0), float(row.get('avg_speed_kmph', 0) or 0), float(row.get('max_speed_kmph', 0) or 0),
                float(row.get('battery_percentage', 0) or 0), float(row.get('estimated_range_km', 0) or 0),
                float(row.get('energy_consumption_kwh', 0) or 0), str(row.get('driving_behavior', '')),
                float(row.get('driver_rating', 0) or 0), float(row.get('driver_score', 0) or 0),
                float(row.get('gross_revenue_inr', 0) or 0), float(row.get('net_revenue_inr', 0) or 0),
                float(row.get('trip_profit_inr', 0) or 0), str(row.get('vehicle_in_garage', 'No')),
                str(row.get('maintenance_type', '')), str(row.get('maintenance_status', ''))
            ))

            # Insert user login account
            cursor.execute("""
            INSERT IGNORE INTO users (full_name, email, password, role, driver_id)
            VALUES (%s, %s, %s, 'driver', %s)
            """, (str(row.get('driver_name', '')), str(row.get('mail', '')).strip().lower(), str(row.get('password', '')).strip(), str(row.get('driver_id', ''))))
        except Exception as err:
            continue

    conn.commit()
    cursor.close()
    conn.close()
    print("All CSV records and driver credentials successfully uploaded to MySQL!")

if __name__ == '__main__':
    sync_excel()