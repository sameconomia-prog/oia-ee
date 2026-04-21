# api/main.py
from fastapi import FastAPI
from api.routers import noticias, kpis

app = FastAPI(title="OIA-EE API", version="0.2.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])


@app.get("/health")
def health():
    return {"status": "ok"}
