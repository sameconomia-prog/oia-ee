# Variables de entorno — Railway

Configurar en Railway > Project > Variables:

| Variable | Descripción | Valor ejemplo |
|----------|-------------|---------------|
| `DATABASE_URL` | Auto-inyectada por Railway PostgreSQL add-on | (automático) |
| `JWT_SECRET_KEY` | Clave secreta JWT — generar con `openssl rand -hex 32` | abc123... |
| `ANTHROPIC_API_KEY` | API key de Anthropic | sk-ant-... |
| `GROQ_API_KEY` | API key Groq Free Tier (clasificador primario P8) | gsk_... (obtener en console.groq.com) |
| `ENVIRONMENT` | Entorno | `production` |
| `ENABLE_SCHEDULER` | Activar job de alertas nocturno | `true` |
| `ADMIN_API_KEY` | Clave para endpoints /admin | (generar) |
| `CORS_ORIGIN` | URL del frontend Vercel | `https://tu-app.vercel.app` |

## Pasos de deploy

1. Crear proyecto en railway.app
2. Agregar PostgreSQL add-on (`DATABASE_URL` se inyecta automáticamente)
3. Conectar repositorio GitHub — seleccionar directorio raíz
4. Agregar las variables de entorno de la tabla
5. Primer deploy — en Railway Shell ejecutar:
   ```bash
   python -m pipeline.seeds.init_db
   python -m pipeline.seeds.seed_ies
   ```
6. Los deploys posteriores son automáticos en cada push a main
