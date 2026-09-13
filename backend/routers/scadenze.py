from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from auth import utente_corrente
from db import execute, rows_to_dicts
from models import CostoAnno, ScadenzaIn, ScadenzaOut, ScadenzaProssima

router = APIRouter(tags=["scadenze"], dependencies=[Depends(utente_corrente)])


def _to_out(r: dict) -> dict:
    return {**r, "reminder_inviato": bool(r["reminder_inviato"])}


@router.get("/auto/{auto_id}/scadenze", response_model=list[ScadenzaOut])
async def lista_scadenze(auto_id: int):
    rs = await execute(
        "SELECT * FROM scadenza WHERE auto_id = ? ORDER BY data_prossima_scadenza DESC",
        [auto_id],
    )
    return [_to_out(r) for r in rows_to_dicts(rs)]


@router.post("/auto/{auto_id}/scadenze", response_model=ScadenzaOut, status_code=201)
async def crea_scadenza(auto_id: int, payload: ScadenzaIn):
    rs = await execute("SELECT id FROM auto WHERE id = ?", [auto_id])
    if not rs.rows:
        raise HTTPException(404, "Auto non trovata")

    rs = await execute(
        "INSERT INTO scadenza (auto_id, tipo, data_esecuzione, km_esecuzione, "
        "data_prossima_scadenza, costo, note, reminder_inviato) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
        [
            auto_id,
            payload.tipo.value,
            payload.data_esecuzione.isoformat() if payload.data_esecuzione else None,
            payload.km_esecuzione,
            payload.data_prossima_scadenza.isoformat(),
            payload.costo,
            payload.note,
            int(payload.reminder_inviato),
        ],
    )
    return _to_out(rows_to_dicts(rs)[0])


@router.put("/scadenze/{scadenza_id}", response_model=ScadenzaOut)
async def aggiorna_scadenza(scadenza_id: int, payload: ScadenzaIn):
    rs = await execute(
        "UPDATE scadenza SET tipo = ?, data_esecuzione = ?, km_esecuzione = ?, "
        "data_prossima_scadenza = ?, costo = ?, note = ?, reminder_inviato = ? "
        "WHERE id = ? RETURNING *",
        [
            payload.tipo.value,
            payload.data_esecuzione.isoformat() if payload.data_esecuzione else None,
            payload.km_esecuzione,
            payload.data_prossima_scadenza.isoformat(),
            payload.costo,
            payload.note,
            int(payload.reminder_inviato),
            scadenza_id,
        ],
    )
    righe = rows_to_dicts(rs)
    if not righe:
        raise HTTPException(404, "Scadenza non trovata")
    return _to_out(righe[0])


@router.delete("/scadenze/{scadenza_id}", status_code=204)
async def elimina_scadenza(scadenza_id: int):
    rs = await execute("DELETE FROM scadenza WHERE id = ? RETURNING id", [scadenza_id])
    if not rs.rows:
        raise HTTPException(404, "Scadenza non trovata")


@router.get("/scadenze/prossime", response_model=list[ScadenzaProssima])
async def prossime_scadenze(giorni: int = 90):
    """Vista aggregata su tutte le auto attive, ordinata per data."""
    rs = await execute(
        "SELECT s.*, a.nome AS auto_nome, a.targa FROM scadenza s "
        "JOIN auto a ON a.id = s.auto_id "
        "WHERE a.attiva = 1 AND date(s.data_prossima_scadenza) <= date('now', ? || ' days') "
        "ORDER BY s.data_prossima_scadenza",
        [f"+{giorni}"],
    )
    oggi = date.today()
    return [
        {
            **_to_out(r),
            "giorni_mancanti": (date.fromisoformat(r["data_prossima_scadenza"]) - oggi).days,
        }
        for r in rows_to_dicts(rs)
    ]


@router.get("/costi", response_model=list[CostoAnno])
async def costi_per_anno():
    """Totale speso per auto e anno (anche auto archiviate, per non perdere lo storico).

    L'anno è quello di data_esecuzione, o della prossima scadenza se la prima manca
    (es. bollo/assicurazione spesso non hanno una "data di esecuzione" propria).
    """
    anno_espressione = "strftime('%Y', COALESCE(s.data_esecuzione, s.data_prossima_scadenza))"
    rs = await execute(
        f"SELECT s.auto_id, a.nome AS auto_nome, "
        f"CAST({anno_espressione} AS INTEGER) AS anno, "
        f"SUM(s.costo) AS totale "
        f"FROM scadenza s JOIN auto a ON a.id = s.auto_id "
        f"WHERE s.costo IS NOT NULL "
        # raggruppa sull'espressione, non sull'alias 'anno': con l'alias + CAST
        # alcuni motori SQL (incluso libSQL) accorpano righe in modo scorretto
        f"GROUP BY s.auto_id, {anno_espressione} "
        f"ORDER BY anno, a.nome"
    )
    return rows_to_dicts(rs)
