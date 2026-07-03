import os
import sys
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv
import sqlite3
import re

# Load env variables from .env
load_dotenv()

# Helper to clean up accidental copy-paste errors (newlines, spaces)
def clean_env(val):
    if not val: return val
    # Take only the first word/line to prevent copy-paste errors
    return str(val).replace('\r', '\n').split('\n')[0].strip()

db_config = {
    "host": clean_env(os.getenv("DB_HOST", "localhost")),
    "port": int(clean_env(os.getenv("DB_PORT", "3306"))),
    "user": clean_env(os.getenv("DB_USER", "root")),
    "password": clean_env(os.getenv("DB_PASSWORD", "")),
    "database": clean_env(os.getenv("DB_NAME", "mediai"))
}

# SSL/TLS Configuration (required for Aiven and other managed MySQL databases)
is_aiven = "aivencloud.com" in db_config["host"].lower() or "aiven" in db_config["host"].lower()
db_ssl_ca_val = os.getenv("DB_SSL_CA")

if db_ssl_ca_val:
    import tempfile
    try:
        temp_ca = tempfile.NamedTemporaryFile(delete=False, suffix=".pem", mode="w")
        temp_ca.write(db_ssl_ca_val.strip())
        temp_ca.close()
        db_config["ssl_ca"] = temp_ca.name
        db_config["ssl_verify_cert"] = True
        print("Configured SSL connection using DB_SSL_CA.")
    except Exception as ssl_err:
        print(f"Warning: Failed to write DB_SSL_CA to temp file: {ssl_err}")
        db_config["ssl_verify_cert"] = False
elif is_aiven:
    # Connect with SSL but skip hostname/CA certificate verification by default for Aiven
    db_config["ssl_verify_cert"] = False
    print("Detected Aiven host. Enabled SSL without certificate verification.")
else:
    db_ssl_mode = os.getenv("DB_SSL_MODE", "").lower()
    if db_ssl_mode in ("required", "true", "1"):
        db_config["ssl_verify_cert"] = False


# SQLite compatibility classes
class SQLiteCursorWrapper:
    def __init__(self, sqlite_cursor, dictionary=False):
        self.cursor = sqlite_cursor
        self.dictionary = dictionary

    def translate_sql(self, sql):
        # 1. Replace %s with ?
        sql = sql.replace("%s", "?")

        # 2. Replace AUTO_INCREMENT with AUTOINCREMENT
        sql = re.sub(r'\bINT\s+PRIMARY\s+KEY\s+AUTO_INCREMENT\b', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\bINT\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\bINT\s+AUTO_INCREMENT\b', 'INTEGER AUTOINCREMENT', sql, flags=re.IGNORECASE)

        # 3. Replace ON DUPLICATE KEY UPDATE with ON CONFLICT DO UPDATE
        if "ON DUPLICATE KEY UPDATE" in sql:
            sql = sql.replace("ON DUPLICATE KEY UPDATE", "ON CONFLICT(setting_key) DO UPDATE SET")

        # 4. SET FOREIGN_KEY_CHECKS
        if "SET FOREIGN_KEY_CHECKS" in sql:
            if "0" in sql:
                sql = "PRAGMA foreign_keys = OFF"
            else:
                sql = "PRAGMA foreign_keys = ON"

        # 5. TRUNCATE TABLE table
        if "TRUNCATE TABLE" in sql:
            sql = re.sub(r'TRUNCATE\s+TABLE\s+(\w+)', r'DELETE FROM \1', sql, flags=re.IGNORECASE)

        # 6. SQLite ALTER TABLE ADD COLUMN does not support UNIQUE constraint
        if "ALTER TABLE" in sql and "ADD" in sql:
            sql = re.sub(r'\bUNIQUE\b', '', sql, flags=re.IGNORECASE)

        return sql

    def execute(self, sql, params=None):
        sql = self.translate_sql(sql)
        try:
            if params is None:
                self.cursor.execute(sql)
            else:
                self.cursor.execute(sql, params)
        except sqlite3.Error as e:
            raise mysql.connector.Error(msg=str(e), errno=2000)
        return self

    def executemany(self, sql, params_list):
        sql = self.translate_sql(sql)
        try:
            self.cursor.executemany(sql, params_list)
        except sqlite3.Error as e:
            raise mysql.connector.Error(msg=str(e), errno=2000)
        return self

    def fetchone(self):
        try:
            row = self.cursor.fetchone()
        except sqlite3.Error as e:
            raise mysql.connector.Error(msg=str(e), errno=2000)
        if row is None:
            return None
        if self.dictionary:
            return {col[0]: row[idx] for idx, col in enumerate(self.cursor.description)}
        return row

    def fetchall(self):
        try:
            rows = self.cursor.fetchall()
        except sqlite3.Error as e:
            raise mysql.connector.Error(msg=str(e), errno=2000)
        if self.dictionary:
            return [{col[0]: r[idx] for idx, col in enumerate(self.cursor.description)} for r in rows]
        return rows

    @property
    def lastrowid(self):
        return self.cursor.lastrowid

    @property
    def description(self):
        return self.cursor.description

    def close(self):
        self.cursor.close()

class SQLiteConnectionWrapper:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("PRAGMA foreign_keys = ON")

    def cursor(self, dictionary=False, buffered=False):
        return SQLiteCursorWrapper(self.conn.cursor(), dictionary)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

# Try to connect to MySQL
use_sqlite = False
connection_pool = None

try:
    # Try connecting to the specified database first
    try:
        test_conn = mysql.connector.connect(
            host=db_config["host"],
            port=db_config.get("port", 3306),
            user=db_config["user"],
            password=db_config["password"],
            database=db_config["database"],
            connect_timeout=10
        )
        test_conn.close()
        print(f"Database '{db_config['database']}' exists. Skipping creation check.")
    except mysql.connector.Error as err:
        if err.errno == 1049:  # 1049 is MySQL error code for Unknown Database
            print(f"Database '{db_config['database']}' does not exist. Attempting to create it...")
            try:
                # Connect without specifying a database to create it
                test_conn = mysql.connector.connect(
                    host=db_config["host"],
                    port=db_config.get("port", 3306),
                    user=db_config["user"],
                    password=db_config["password"],
                    connect_timeout=10
                )
                cursor = test_conn.cursor()
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_config['database']}")
                test_conn.commit()
                cursor.close()
                test_conn.close()
                print(f"Database '{db_config['database']}' created successfully.")
            except Exception as db_create_err:
                print(f"Could not create database '{db_config['database']}': {db_create_err}")
                raise db_create_err
        else:
            # Raise other connection errors (e.g. access denied, connection timeout)
            raise err
    
    # Set up a connection pool (disable in serverless to prevent database connection exhaustion)
    if os.getenv("VERCEL") == "1":
        print("Vercel/serverless environment detected. Disabling connection pooling to prevent database connection exhaustion.")
        connection_pool = None
    else:
        connection_pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="mediai_pool",
            pool_size=5,
            pool_reset_session=True,
            **db_config
        )
        print("Database Connection Pool Created Successfully (MySQL)")
except Exception as err:
    print(f"MySQL connection failed: {err}")
    # Force raise the error in Vercel to prevent silent SQLite fallback
    raise RuntimeError(f"FATAL: MySQL Connection Failed: {err}")

def get_db_connection():
    if connection_pool:
        return connection_pool.get_connection()
    return mysql.connector.connect(**db_config)