# api/main.py
from fastapi import FastAPI
from api.routers import noticias, kpis, admin

app = FastAPI(title="OIA-EE API", version="0.3.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok"}
