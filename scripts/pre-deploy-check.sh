#!/usr/bin/env bash
# pre-deploy-check.sh — verificar que el proyecto está listo para deploy
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }

FAILED=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "OIA-EE Pre-Deploy Check"
echo "========================"

# 1. Venv
if [ -f "$ROOT/pipeline/.venv/bin/activate" ]; then
  source "$ROOT/pipeline/.venv/bin/activate"
  ok "Venv activado"
else
  fail "Venv no encontrado en pipeline/.venv/"
fi

# 2. Tests backend
echo ""
echo "→ Corriendo tests backend..."
if python -m pytest "$ROOT/tests/" -q --tb=no 2>&1 | grep -q "passed"; then
  PASSED=$(python -m pytest "$ROOT/tests/" -q --tb=no 2>&1 | grep "passed" | head -1)
  ok "Tests: $PASSED"
else
  fail "Tests backend fallando"
fi

# 3. TypeScript check
echo ""
echo "→ Verificando TypeScript..."
if cd "$ROOT/frontend" && npx tsc --noEmit 2>&1 | grep -q "error"; then
  fail "Errores TypeScript encontrados"
else
  ok "TypeScript sin errores"
fi

# 4. Archivos de deploy
echo ""
echo "→ Archivos de configuración..."
for f in "nixpacks.toml" "Procfile" ".python-version" "frontend/vercel.json" ".github/workflows/ci.yml"; do
  if [ -f "$ROOT/$f" ]; then
    ok "$f"
  else
    warn "$f no encontrado"
  fi
done

# 5. .env.example
if [ -f "$ROOT/.env.example" ]; then
  ok ".env.example presente"
else
  warn ".env.example no encontrado (opcional)"
fi

# 6. Resumen
echo ""
echo "========================"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ Listo para deploy${NC}"
  echo ""
  echo "Railway: railway login && railway link && railway up"
  echo "Vercel:  Importar sameconomia-prog/oia-ee, root=frontend"
  exit 0
else
  echo -e "${RED}✗ Hay problemas que corregir antes del deploy${NC}"
  exit 1
fi
