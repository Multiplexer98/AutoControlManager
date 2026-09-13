"""Modelli Pydantic (payload API)."""
from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class TipoScadenza(str, Enum):
    TAGLIANDO = "TAGLIANDO"
    REVISIONE = "REVISIONE"
    BOLLO = "BOLLO"
    ASSICURAZIONE = "ASSICURAZIONE"
    ALTRO = "ALTRO"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AutoIn(BaseModel):
    nome: str = Field(min_length=1)
    targa: str = Field(min_length=1)
    modello: str | None = None
    anno: int | None = None
    attiva: bool = True


class AutoOut(AutoIn):
    id: int


class ScadenzaIn(BaseModel):
    tipo: TipoScadenza
    data_esecuzione: date | None = None
    km_esecuzione: int | None = None
    data_prossima_scadenza: date
    costo: float | None = None
    note: str | None = None
    reminder_inviato: bool = False


class ScadenzaOut(ScadenzaIn):
    id: int
    auto_id: int


class ScadenzaProssima(ScadenzaOut):
    auto_nome: str
    targa: str
    giorni_mancanti: int


class CostoAnno(BaseModel):
    auto_id: int
    auto_nome: str
    anno: int
    totale: float
