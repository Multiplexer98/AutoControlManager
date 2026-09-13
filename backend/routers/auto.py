from fastapi import APIRouter, Depends, HTTPException

from auth import utente_corrente
from db import execute, rows_to_dicts
from models import AutoIn, AutoOut

router = APIRouter(prefix="/auto", tags=["auto"], dependencies=[Depends(utente_corrente)])


def _to_out(r: dict) -> AutoOut:
    return AutoOut(**{**r, "attiva": bool(r["attiva"])})


@router.get("", response_model=list[AutoOut])
async def lista_auto(includi_inattive: bool = False):
    sql = "SELECT * FROM auto"
    if not includi_inattive:
        sql += " WHERE attiva = 1"
    rs = await execute(sql + " ORDER BY nome")
    return [_to_out(r) for r in rows_to_dicts(rs)]


@router.post("", response_model=AutoOut, status_code=201)
async def crea_auto(payload: AutoIn):
    rs = await execute(
        "INSERT INTO auto (nome, targa, modello, anno, attiva) VALUES (?, ?, ?, ?, ?) RETURNING *",
        [payload.nome, payload.targa, payload.modello, payload.anno, int(payload.attiva)],
    )
    return _to_out(rows_to_dicts(rs)[0])


@router.put("/{auto_id}", response_model=AutoOut)
async def aggiorna_auto(auto_id: int, payload: AutoIn):
    rs = await execute(
        "UPDATE auto SET nome = ?, targa = ?, modello = ?, anno = ?, attiva = ? "
        "WHERE id = ? RETURNING *",
        [
            payload.nome,
            payload.targa,
            payload.modello,
            payload.anno,
            int(payload.attiva),
            auto_id,
        ],
    )
    righe = rows_to_dicts(rs)
    if not righe:
        raise HTTPException(404, "Auto non trovata")
    return _to_out(righe[0])


@router.delete("/{auto_id}", status_code=204)
async def disattiva_auto(auto_id: int):
    """Soft delete: l'auto resta in archivio con lo storico."""
    rs = await execute("UPDATE auto SET attiva = 0 WHERE id = ? RETURNING id", [auto_id])
    if not rs.rows:
        raise HTTPException(404, "Auto non trovata")
