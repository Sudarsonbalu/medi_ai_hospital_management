import os
import sys
import mysql.connector

# Set up paths to import the backend database configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(os.path.dirname(current_dir), "backend")
sys.path.append(backend_dir)

from database import get_db_connection

def escape_string(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # Escape single quotes and backslashes
    escaped = str(val).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"

def backup_database():
    dump_path = os.path.join(current_dir, "mediai_dump.sql")
    print(f"Starting database backup... Target: {dump_path}")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get list of all tables
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        
        sql_lines = []
        sql_lines.append("-- MediAI Database Dump --\n")
        sql_lines.append("SET FOREIGN_KEY_CHECKS=0;\n\n")
        
        for table in tables:
            print(f"Backing up table: {table}")
            sql_lines.append(f"-- Drop and Create Table: {table} --\n")
            sql_lines.append(f"DROP TABLE IF EXISTS `{table}`;\n")
            
            # Get create table DDL
            cursor.execute(f"SHOW CREATE TABLE `{table}`")
            create_ddl = cursor.fetchall()[0][1]
            sql_lines.append(f"{create_ddl};\n\n")
            
            # Get table data
            cursor.execute(f"SELECT * FROM `{table}`")
            rows = cursor.fetchall()
            
            if rows:
                sql_lines.append(f"-- Data for Table: {table} --\n")
                # Get column names
                cursor.execute(f"DESCRIBE `{table}`")
                columns = [c[0] for c in cursor.fetchall()]
                columns_str = ", ".join([f"`{col}`" for col in columns])
                
                for row in rows:
                    values_str = ", ".join([escape_string(val) for val in row])
                    sql_lines.append(f"INSERT INTO `{table}` ({columns_str}) VALUES ({values_str});\n")
                sql_lines.append("\n")
                
        sql_lines.append("SET FOREIGN_KEY_CHECKS=1;\n")
        
        # Write to dump file
        with open(dump_path, "w", encoding="utf-8") as f:
            f.writelines(sql_lines)
            
        print("Database backup completed successfully!")
        print(f"Dump file saved at: {dump_path}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error occurred during database backup: {e}", file=sys.stderr)

if __name__ == "__main__":
    backup_database()
