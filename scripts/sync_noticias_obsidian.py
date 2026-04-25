"""
Sincroniza noticias de OIA-EE → Obsidian Vault.

Uso:
    python scripts/sync_noticias_obsidian.py
    python scripts/sync_noticias_obsidian.py --api http://localhost:8000
    python scripts/sync_noticias_obsidian.py --desde 2026-04-01

Genera una nota .md por noticia en:
    Obsidian Vault/01 - Proyectos/OIA-EE/Noticias/YYYY/MM/
"""
import argparse
import re
import sys
from datetime import date, datetime
from pathlib import Path

import httpx

API_URL = "https://oia-api-production.up.railway.app"
OBSIDIAN_VAULT = Path.home() / "Documents" / "Obsidian Vault"
NOTICIAS_DIR = OBSIDIAN_VAULT / "01 - Proyectos" / "OIA-EE" / "Noticias"

IMPACTO_EMOJI = {
    "despido_masivo":  "🔴",
    "adopcion_ia":     "🟡",
    "nueva_carrera":   "🟢",
    "regulacion":      "🔵",
    "otro":            "⚪",
}

SECTOR_TAG = {
    "tecnologia":        "tecnología",
    "manufactura":       "manufactura",
    "finanzas":          "finanzas",
    "salud":             "salud",
    "educacion":         "educación",
    "comercio":          "comercio",
    "otro":              "otro",
}


def _slug(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[áàä]", "a", text)
    text = re.sub(r"[éèë]", "e", text)
    text = re.sub(r"[íìï]", "i", text)
    text = re.sub(r"[óòö]", "o", text)
    text = re.sub(r"[úùü]", "u", text)
    text = re.sub(r"[ñ]", "n", text)
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    return text[:60]


def _fetch_all_noticias(api_url: str, desde: str | None) -> list[dict]:
    noticias = []
    skip = 0
    limit = 100
    with httpx.Client(timeout=30) as client:
        while True:
            params = {"skip": skip, "limit": limit}
            r = client.get(f"{api_url}/noticias/", params=params)
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            noticias.extend(batch)
            if len(batch) < limit:
                break
            skip += limit
    if desde:
        noticias = [n for n in noticias if (n.get("fecha_pub") or "") >= desde]
    return noticias


def _render_nota(n: dict) -> str:
    fecha = n.get("fecha_pub") or "sin-fecha"
    sector = (n.get("sector") or "otro").lower()
    impacto = n.get("tipo_impacto") or "otro"
    emoji = IMPACTO_EMOJI.get(impacto, "⚪")
    empresa = n.get("empresa") or ""
    n_emp = n.get("n_empleados")
    causa = n.get("causa_ia") or ""
    resumen = n.get("resumen_claude") or n.get("titulo") or ""
    url = n.get("url") or ""
    fuente = n.get("fuente") or ""
    pais = n.get("pais") or ""
    titulo = n.get("titulo") or "Sin título"

    tags = ["OIA-EE", "noticia", SECTOR_TAG.get(sector, sector), impacto.replace("_", "-")]

    frontmatter_lines = [
        "---",
        f'titulo: "{titulo.replace(chr(34), chr(39))}"',
        f"fecha_pub: {fecha}",
        f"fuente: {fuente}",
        f"sector: {sector}",
        f"tipo_impacto: {impacto}",
    ]
    if empresa:
        frontmatter_lines.append(f"empresa: {empresa}")
    if n_emp:
        frontmatter_lines.append(f"n_empleados: {n_emp}")
    if causa:
        frontmatter_lines.append(f"causa_ia: {causa}")
    if pais:
        frontmatter_lines.append(f"pais: {pais}")
    frontmatter_lines.append(f"url: {url}")
    frontmatter_lines.append(f"tags: [{', '.join(tags)}]")
    frontmatter_lines.append("---")

    body_lines = [
        f"# {emoji} {titulo}",
        "",
        f"> **Fuente:** {fuente}  |  **Sector:** {sector.title()}  |  **País:** {pais}",
        f"> **Impacto:** {emoji} {impacto.replace('_', ' ').title()}",
        "",
    ]
    if empresa or n_emp or causa:
        body_lines.append("## Detalles")
        if empresa:
            body_lines.append(f"- **Empresa:** {empresa}")
        if n_emp:
            body_lines.append(f"- **Empleados afectados:** {n_emp:,}")
        if causa:
            body_lines.append(f"- **Tecnología IA:** {causa}")
        body_lines.append("")

    body_lines += [
        "## Resumen",
        resumen,
        "",
        "## Fuente original",
        f"[Ver noticia completa]({url})",
        "",
        f"*Capturado por OIA-EE · {datetime.now().strftime('%Y-%m-%d')}*",
    ]

    return "\n".join(frontmatter_lines) + "\n" + "\n".join(body_lines)


def sync(api_url: str, desde: str | None, dry_run: bool) -> None:
    print(f"Descargando noticias desde {api_url}...")
    noticias = _fetch_all_noticias(api_url, desde)
    print(f"  → {len(noticias)} noticias encontradas")

    creadas = actualizadas = omitidas = 0

    for n in noticias:
        fecha_str = n.get("fecha_pub") or datetime.now().strftime("%Y-%m-%d")
        try:
            fecha = datetime.fromisoformat(fecha_str[:10])
        except ValueError:
            fecha = datetime.now()

        carpeta = NOTICIAS_DIR / str(fecha.year) / f"{fecha.month:02d}"
        nombre = f"{fecha.strftime('%Y-%m-%d')} — {_slug(n.get('titulo', 'sin-titulo'))}.md"
        ruta = carpeta / nombre

        contenido = _render_nota(n)

        if dry_run:
            print(f"  [dry-run] {ruta.relative_to(OBSIDIAN_VAULT)}")
            creadas += 1
            continue

        carpeta.mkdir(parents=True, exist_ok=True)
        if ruta.exists():
            if ruta.read_text(encoding="utf-8") == contenido:
                omitidas += 1
                continue
            actualizadas += 1
        else:
            creadas += 1

        ruta.write_text(contenido, encoding="utf-8")

    print(f"\nResultado:")
    print(f"  ✅ Creadas:     {creadas}")
    print(f"  🔄 Actualizadas: {actualizadas}")
    print(f"  ⏭  Sin cambios:  {omitidas}")
    print(f"\nUbicación: {NOTICIAS_DIR}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync OIA-EE noticias → Obsidian")
    parser.add_argument("--api", default=API_URL, help="URL base de la API")
    parser.add_argument("--desde", default=None, help="Filtrar desde fecha YYYY-MM-DD")
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar sin escribir")
    args = parser.parse_args()

    sync(args.api, args.desde, args.dry_run)


if __name__ == "__main__":
    main()
