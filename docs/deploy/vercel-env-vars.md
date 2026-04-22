# Variables de entorno — Vercel

Configurar en Vercel > Project > Settings > Environment Variables:

| Variable | Descripción | Valor |
|----------|-------------|-------|
| `NEXT_PUBLIC_API_URL` | URL del backend Railway (sin trailing slash) | `https://oia-ee-backend.railway.app` |

## Pasos de deploy

1. Crear proyecto en vercel.com
2. Conectar repositorio GitHub
3. En "Root Directory" especificar: `frontend`
4. Agregar variable `NEXT_PUBLIC_API_URL` apuntando a la URL de Railway
5. Deploy automático en cada push a main

## Configuración CORS en Railway

Agregar en Railway variables:
- `CORS_ORIGIN=https://tu-app.vercel.app` (URL exacta de Vercel)
