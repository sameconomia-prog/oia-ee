# api/main.py
from fastapi import FastAPI
from api.routers import noticias, kpis, admin, rector

app = FastAPI(title="OIA-EE API", version="0.4.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])


@app.get("/health")
def health():
    return {"status": "ok"}
