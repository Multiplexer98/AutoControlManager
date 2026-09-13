import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from auth import crea_token, verifica_credenziali
from db import init_db
from models import LoginRequest, TokenResponse
from routers import auto, scadenze

load_dotenv()

# Es. "https://utente.github.io,http://localhost:4200"
ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="AutoControlManager API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/auth/login", response_model=TokenResponse, tags=["auth"])
async def login(payload: LoginRequest):
    if not verifica_credenziali(payload.username, payload.password):
        raise HTTPException(401, "Credenziali non valide")
    return TokenResponse(access_token=crea_token(payload.username))


app.include_router(auto.router)
app.include_router(scadenze.router)
