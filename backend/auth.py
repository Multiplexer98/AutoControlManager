"""Login a credenziali fisse (1-2 utenti) + JWT."""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

APP_USER = os.getenv("APP_USER", "admin")
APP_PASSWORD_HASH = os.getenv("APP_PASSWORD_HASH", "")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-non-usare-in-produzione")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24 * 7

bearer = HTTPBearer(auto_error=True)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verifica_credenziali(username: str, password: str) -> bool:
    if username != APP_USER or not APP_PASSWORD_HASH:
        return False
    try:
        return bcrypt.checkpw(password.encode(), APP_PASSWORD_HASH.encode())
    except ValueError:
        return False


def crea_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def utente_corrente(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token non valido o scaduto"
        )


if __name__ == "__main__":
    # Utility: python auth.py <password>  -> stampa l'hash da mettere in APP_PASSWORD_HASH
    import sys

    print(hash_password(sys.argv[1]))
