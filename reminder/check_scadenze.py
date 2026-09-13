"""Job giornaliero: cerca le scadenze entro N giorni non ancora notificate,
manda una mail riepilogativa via Brevo e marca il flag reminder_inviato.

Girato da GitHub Actions, parla direttamente con Turso (non passa dal backend).
"""
import asyncio
import os
import sys
from datetime import date

import libsql_client
import urllib.request
import json

GIORNI_PREAVVISO = int(os.getenv("GIORNI_PREAVVISO", "30"))
DATABASE_URL = os.environ["TURSO_DATABASE_URL"]
AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")
BREVO_API_KEY = os.environ["BREVO_API_KEY"]
EMAIL_TO = os.environ["EMAIL_TO"]
EMAIL_FROM = os.environ["EMAIL_FROM"]

BREVO_URL = "https://api.brevo.com/v3/smtp/email"

QUERY = """
SELECT s.id, s.tipo, s.data_prossima_scadenza, s.note, a.nome, a.targa
FROM scadenza s
JOIN auto a ON a.id = s.auto_id
WHERE a.attiva = 1
  AND s.reminder_inviato = 0
  AND date(s.data_prossima_scadenza) <= date('now', ? || ' days')
ORDER BY s.data_prossima_scadenza
"""


def componi_html(scadenze: list[dict]) -> str:
    righe = "".join(
        f"<tr>"
        f"<td>{s['nome']} ({s['targa']})</td>"
        f"<td>{s['tipo']}</td>"
        f"<td><b>{s['data_prossima_scadenza']}</b> "
        f"(tra {s['giorni']} giorni)</td>"
        f"<td>{s['note'] or ''}</td>"
        f"</tr>"
        for s in scadenze
    )
    return (
        "<h2>Scadenze in arrivo</h2>"
        "<table border='1' cellpadding='6' cellspacing='0'>"
        "<tr><th>Auto</th><th>Tipo</th><th>Scadenza</th><th>Note</th></tr>"
        f"{righe}</table>"
    )


def invia_email(html: str, n: int) -> None:
    body = json.dumps(
        {
            "sender": {"email": EMAIL_FROM, "name": "AutoControlManager"},
            "to": [{"email": e.strip()} for e in EMAIL_TO.split(",")],
            "subject": f"AutoControlManager — {n} scadenz{'a' if n == 1 else 'e'} in arrivo",
            "htmlContent": html,
        }
    ).encode()
    req = urllib.request.Request(
        BREVO_URL,
        data=body,
        headers={"api-key": BREVO_API_KEY, "content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"Brevo HTTP {resp.status}")


async def main() -> int:
    async with libsql_client.create_client(url=DATABASE_URL, auth_token=AUTH_TOKEN) as c:
        rs = await c.execute(QUERY, [f"+{GIORNI_PREAVVISO}"])
        scadenze = [dict(zip(rs.columns, row)) for row in rs.rows]

        if not scadenze:
            print("Nessuna scadenza da notificare.")
            return 0

        oggi = date.today()
        for s in scadenze:
            s["giorni"] = (date.fromisoformat(s["data_prossima_scadenza"]) - oggi).days

        invia_email(componi_html(scadenze), len(scadenze))

        ids = [s["id"] for s in scadenze]
        placeholder = ",".join("?" * len(ids))
        await c.execute(
            f"UPDATE scadenza SET reminder_inviato = 1 WHERE id IN ({placeholder})", ids
        )
        print(f"Notificate {len(ids)} scadenze.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
