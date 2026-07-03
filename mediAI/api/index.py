import sys
import os
import traceback

from fastapi import FastAPI

# Add the root project directory and backend to the Python path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, 'backend'))

# Vercel's static analyzer requires exactly this at the top level
app = FastAPI()

try:
    from backend.app import app as original_app
    
    @original_app.get("/migrate")
    def trigger_migration():
        from backend.migrate import run_migrations
        try:
            run_migrations()
            return {"status": "success", "message": "Migrations completed successfully!"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # Mount the original app at both /api and / to ensure it catches requests
    # regardless of whether Vercel's ASGI wrapper strips the /api prefix or not.
    app.mount("/api", original_app)
    app.mount("/", original_app)

except Exception as e:
    error_msg = traceback.format_exc()
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all(path: str):
        return {"error": "Failed to boot backend", "traceback": error_msg}
