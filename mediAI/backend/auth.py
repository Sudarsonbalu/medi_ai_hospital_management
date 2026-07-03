import os
import base64
import hmac
import hashlib
import json
import time
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import HTTPException, Header, Query

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is required. "
        "Set it in backend/.env (see backend/.env.example)."
    )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    if hashed.startswith("$2"):
        return bcrypt.checkpw(password.encode(), hashed.encode())
    legacy = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy, hashed)


def needs_rehash(hashed: str) -> bool:
    return not hashed.startswith("$2")


def encode_jwt(payload: dict) -> str:
    if "exp" not in payload:
        payload["exp"] = int(time.time()) + 7200
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().replace("=", "")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().replace("=", "")
    msg = f"{header_b64}.{payload_b64}"
    sig = hmac.new(SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode().replace("=", "")
    return f"{msg}.{sig_b64}"


def decode_jwt(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        msg = f"{header_b64}.{payload_b64}"
        sig = hmac.new(SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest()
        sig_b64_check = base64.urlsafe_b64encode(sig).decode().replace("=", "")

        if not hmac.compare_digest(sig_b64, sig_b64_check):
            return None

        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())

        if "exp" in payload and payload["exp"] < time.time():
            return None

        return payload
    except Exception:
        return None


def _decode_auth_header(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    token = authorization.split(" ", 1)[1]
    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def verify_token(
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="authorization")
) -> dict:
    auth = authorization or token_query
    return _decode_auth_header(auth)


def verify_write_token(
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="authorization")
) -> dict:
    auth = authorization or token_query
    user = _decode_auth_header(auth)
    if user.get("role", "").lower() == "patient":
        raise HTTPException(status_code=403, detail="Patients do not have permission to modify or delete resources")
    return user


def verify_admin_token(
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="authorization")
) -> dict:
    auth = authorization or token_query
    user = _decode_auth_header(auth)
    if user.get("role", "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this administrative resource")
    return user
