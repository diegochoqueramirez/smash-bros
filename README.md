# Smash Arena — platform fighter 2D local

Pelea para 2 jugadores en el mismo teclado, estilo Smash Bros: cada golpe sube el **daño %** del rival
y a mayor %, más lejos sale volando. Pierdes una vida al salir de la pantalla (3 vidas). El backend guarda
los resultados y un ranking de victorias.

> Especificación completa con criterios de aceptación: [`docs/spec.md`](docs/spec.md)

## Stack

| Servicio | Tecnología | Puerto |
|---|---|---|
| `client` | TypeScript + Phaser 3 + Vite | http://localhost:5173 |
| `api` | ASP.NET Core 9 (minimal API) + EF Core + Npgsql | http://localhost:5050 |
| `db` | PostgreSQL 17 | `localhost:5433` |

## Uso

```bash
docker compose up --build        # desarrollo, con hot reload en cliente y API
docker compose down              # parar (los datos quedan en el volumen pgdata)
docker compose down -v           # parar y borrar la base de datos
```

Producción (Nginx + API en Release): `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build` → http://localhost:8080

> Si cambias el modelo de datos (`server/Models.cs`) con la base ya creada, usa `docker compose down -v`:
> `EnsureCreated` no modifica tablas existentes. Para conservar datos hay que pasar a migraciones de EF Core.

## Controles

| | Mover / apuntar | Saltar (doble salto) | Golpe |
|---|---|---|---|
| J1 (azul) | W A S D | H | G |
| J2 (rojo) | ← ↑ ↓ → | / | . |

Las direcciones mueven y además **apuntan el golpe** (dirección + golpe), como en Smash:

| Entrada | Golpe | Daño | Efecto |
|---|---|---|---|
| golpe | Jab | 5 | Rápido, empuje corto |
| ← / → + golpe | Lateral | 10 | Más fuerte y más lento |
| ↑ + golpe | Arriba | 8 | Lanza al rival casi en vertical |
| ↓ + golpe (suelo) | Bajo | 7 | Golpea a ambos lados, a ras de suelo |
| ↓ + golpe (aire) | Spike | 9 | Manda al rival hacia abajo |

Para atravesar una plataforma hacia abajo, mantén ↓ / S un instante (no cae si acabas de atacar).
Los controles se cambian en `client/src/config.ts` y los golpes en la tabla `MOVES` de `client/src/scenes/GameScene.ts`.
Al iniciar, cada jugador escribe su nombre. Al terminar: **ENTER** revancha, **M** cambiar nombres.

## API

- `POST /api/matches` — `{ "winner": "Ana", "loser": "Luis", "winnerStocksLeft": 2, "durationSeconds": 95 }`
- `GET  /api/matches?take=10` — partidas recientes
- `GET  /api/leaderboard?take=10` — ranking por victorias
- `GET  /health`

## Estructura

```
client/   Phaser + Vite (escenas en src/scenes, sprites en src/sprites, controles en src/config.ts)
server/   ASP.NET Core (Program.cs, Models.cs)
```

Los valores de "sensación de juego" (velocidad, salto, daño, empuje, cooldowns, zonas de KO) están como
constantes al inicio de `client/src/scenes/GameScene.ts`.

## Siguientes pasos sugeridos

- Arte propio: los luchadores son pixel art generado por código (`client/src/sprites/fighterSprites.ts`, una pose por estado). Para usar spritesheets, reemplaza esas texturas/animaciones manteniendo los nombres `${id}-${pose}`.
- Escudo/esquive, golpes aéreos laterales y "smash attacks" cargados, y más personajes con golpes distintos.
- Más escenarios y música/efectos de sonido.
- Migraciones de EF Core.
