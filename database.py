import mysql.connector

def get_connection():
    # Attempt common local passwords for MySQL Workbench
    passwords = ["Mysql123", "Puli2474", "root", "123456", "admin", ""]
    for pwd in passwords:
        try:
            conn = mysql.connector.connect(
                host="localhost",
                user="root",
                password=pwd,
                database="ev_monitor_db",
                port=3306
            )
            if conn.is_connected():
                return conn
        except Exception:
            continue
    return None