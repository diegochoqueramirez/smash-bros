# Especificación — Modo de desarrollo local

**Estado general: IMPLEMENTADO** — todos los requisitos y criterios de aceptación están cumplidos.

Alternativa al stack completo de Docker: solo PostgreSQL corre en Docker; la API (.NET) y el cliente (Vite)
corren directamente en la máquina del desarrollador. Complementa a [`spec.md`](spec.md) (RF-01).

## Decisiones de diseño

| Decisión | Motivo |
|---|---|
| Solo `db` en Docker | Evita instalar Postgres en el host y reutiliza el volumen `pgdata` y el puerto `5433` existentes. |
| API en `localhost:5050` y cliente en `5173` | Mismos puertos que el stack Docker, así que el proxy de Vite y los enlaces no cambian. |
| `global.json` fija el SDK 9 | Con el SDK 10 instalado en paralelo, `dotnet` usaría el más reciente y no compilaría `net9.0`. |
| `dotnet watch run --no-hot-reload` | Reinicia la API al cambiar código sin depender del hot reload de .NET. |

---

## RF-01 — Script de arranque local · `IMPLEMENTADO`

- [x] `./scripts/dev-local.sh` levanta `db` con `docker compose up -d --wait db` y espera a que esté `healthy`.
- [x] Lee `.env` si existe; si no, usa los mismos valores por defecto que `docker-compose.yml`.
- [x] Ejecuta `npm install` en `client/` solo si falta `node_modules`.
- [x] Arranca la API con `dotnet watch` en `http://localhost:5050`, conectada a Postgres en `localhost:5433`.
- [x] Arranca Vite en `http://localhost:5173` con `API_URL=http://localhost:5050`.
- [x] Ctrl+C detiene la API y el cliente; la base de datos queda corriendo en Docker.
- [x] Si falta el SDK de .NET 9, el script termina con un mensaje que indica `brew install --cask dotnet-sdk@9`.

## RF-02 — Versión del SDK · `IMPLEMENTADO`

- [x] `global.json` exige el SDK `9.0.100` con `rollForward: latestFeature`.
- [x] `dotnet --version` dentro del repo devuelve `9.0.x` aunque haya un SDK 10 instalado.

## RF-03 — Documentación · `IMPLEMENTADO`

- [x] `README.md` incluye la sección "Modo local (solo Postgres en Docker)" con el comando, los requisitos y los puertos.

## Verificación realizada

- [x] `GET localhost:5050/health` devuelve `{"status":"ok"}`.
- [x] `GET localhost:5173/api/leaderboard` devuelve `[]` a través del proxy de Vite.
- [x] `GET localhost:5173/` devuelve 200.

## Limitación conocida

- Los contenedores `api` y `client` de Docker usan los mismos puertos: hay que detenerlos (`docker compose stop api client`) antes de usar el modo local.
