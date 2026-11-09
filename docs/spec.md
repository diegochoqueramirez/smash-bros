# Especificación — Smash Arena

**Estado general: IMPLEMENTADO** — todos los requisitos y criterios de aceptación están cumplidos.

Platform fighter 2D para 2 jugadores en el mismo teclado, estilo Smash Bros: cada golpe sube el daño % del rival y,
a mayor %, más lejos sale volando. Se pierde una vida al salir de la pantalla. Un backend guarda los resultados y
un ranking de victorias.

## Stack

| Capa | Tecnología |
|---|---|
| Cliente | TypeScript + Phaser 3 + Vite |
| API | ASP.NET Core 9 (minimal API) + EF Core + Npgsql |
| Base de datos | PostgreSQL 17 |
| Infraestructura | Docker Compose (desarrollo y producción con Nginx) |

## Decisiones de diseño

| Decisión | Motivo |
|---|---|
| Solo multijugador **local** (sin red ni SignalR) | Un juego con enemigos/jugadores en red exige servidor autoritativo y predicción de latencia; se descartó por complejidad. |
| Solo **golpes**, sin proyectiles | Pedido explícito del usuario. El juego pasó de duelo de tanques → Metal Slug → Smash Bros. |
| Golpes por **dirección + botón** (jab, lateral, arriba, bajo, spike) | Mecánica propia de Smash; el salto va en un botón aparte para liberar las direcciones. |
| Sprites de **pixel art generado por código** | Sin dependencias de assets externos ni licencias; se pueden reemplazar por spritesheets manteniendo los nombres. |
| `EnsureCreated` en lugar de migraciones | Suficiente para el esquema actual; al cambiar el modelo hay que recrear el volumen (`docker compose down -v`). |
| Puertos del host 5050 (API) y 5433 (Postgres) | El 5000 lo ocupa AirPlay en macOS y el 5432 puede estar en uso por un Postgres local. |

---

## RF-01 — Infraestructura Docker · `IMPLEMENTADO`

- [x] `docker compose up --build` levanta los servicios `db`, `api` y `client`.
- [x] El cliente corre con Vite (recarga automática, con polling para volúmenes de macOS) y la API con `dotnet watch`.
- [x] PostgreSQL usa un volumen persistente `pgdata` y un `healthcheck`; la API espera a que la base esté `healthy`.
- [x] Puertos publicados: cliente `5173`, API `5050`, Postgres `127.0.0.1:5433`.
- [x] Vite redirige `/api` a la API (proxy), por lo que el cliente no necesita CORS.
- [x] La configuración usa variables con valores por defecto y existe `.env.example`; `.env` está en `.gitignore`.
- [x] `docker-compose.prod.yml` construye el cliente servido por Nginx (con proxy `/api`) y la API en Release; ambas imágenes compilan.

## RF-02 — Menú y nombres · `IMPLEMENTADO`

- [x] Se pide el nombre del jugador 1 y luego el del jugador 2, confirmando cada uno con ENTER.
- [x] Solo se aceptan letras, números y espacios, con borrado con Backspace y un máximo de 14 caracteres.
- [x] Un nombre vacío se reemplaza por `Jugador 1` / `Jugador 2`.
- [x] Los nombres anteriores aparecen precargados al volver al menú.
- [x] El menú muestra los controles de ambos jugadores y la tabla de golpes por dirección.

## RF-03 — Escenario y plataformas · `IMPLEMENTADO`

- [x] Hay un escenario principal sólido y tres plataformas atravesables (dos laterales y una central).
- [x] Las plataformas atravesables solo colisionan al caer desde arriba (se pueden cruzar subiendo).
- [x] Mantener ↓ / S durante 140 ms hace atravesar la plataforma hacia abajo.
- [x] Atacar con ↓ no hace caer: durante 250 ms tras un golpe no se atraviesan plataformas.
- [x] Ambos jugadores aparecen y reaparecen en los huecos entre plataformas, cayendo siempre al escenario principal.

## RF-04 — Movimiento · `IMPLEMENTADO`

- [x] J1 se mueve con W A S D y salta con **H**; J2 se mueve con las flechas y salta con **/**.
- [x] Cada jugador tiene doble salto; la cuenta se restablece al tocar el suelo.
- [x] El personaje mira hacia la última dirección horizontal pulsada.
- [x] La velocidad de caída está limitada (700 px/s) y el control se pierde durante el hitstun.
- [x] Los controles se definen en un único lugar (`client/src/config.ts`).

## RF-05 — Combate · `IMPLEMENTADO`

El golpe se elige con la dirección mantenida al presionar el botón de ataque (**G** para J1, **.** para J2). Prioridad: ↑ > ↓ > lateral > ninguna.

| Entrada | Golpe | Daño | Empuje (base + crecimiento × daño) | Ángulo | Enfriamiento |
|---|---|---|---|---|---|
| golpe | Jab | 5 | 240 + 3.5 | 40° | 300 ms |
| ← / → + golpe | Lateral | 10 | 300 + 5.5 | 35° | 520 ms |
| ↑ + golpe | Arriba | 8 | 280 + 5.0 | 85° | 450 ms |
| ↓ + golpe (suelo) | Bajo | 7 | 220 + 4.0 | 25° | 450 ms |
| ↓ + golpe (aire) | Spike | 9 | 260 + 4.5 | −70° (hacia abajo) | 600 ms |

- [x] Existen los cinco golpes con los valores de la tabla, definidos en la tabla `MOVES` de `GameScene.ts`.
- [x] El golpe bajo golpea a ambos lados del luchador; el golpe arriba cubre la cabeza y la parte alta del cuerpo.
- [x] Un mismo golpe solo impacta una vez a cada rival y nadie puede golpearse a sí mismo.
- [x] El daño se acumula y el empuje crece con el daño acumulado del rival.
- [x] Un golpe recibido provoca hitstun (sin control) proporcional al empuje y un destello blanco.
- [x] No hay proyectiles ni ataques a distancia.
- [x] Tras reaparecer hay 2 s de invulnerabilidad con parpadeo.
- [x] Las cajas de golpe pueden hacerse visibles con `SHOW_HITBOXES` para ajustar el balance.

## RF-06 — KO, vidas y fin de partida · `IMPLEMENTADO`

- [x] Cada jugador empieza con 3 vidas.
- [x] Salir de la zona de KO (fuera de la pantalla) resta una vida y sacude la cámara.
- [x] Tras un KO el jugador reaparece a los 1.2 s con el daño reiniciado a 0%.
- [x] El HUD muestra el daño % de cada jugador (del blanco al rojo al subir), su nombre y sus vidas.
- [x] Al quedarse un jugador sin vidas termina la partida: se muestra «¡KO!» y gana el rival.

## RF-07 — Sprites y animaciones · `IMPLEMENTADO`

- [x] Los luchadores son pixel art (cuadrícula 16×22 escalada ×2 = 32×44 px) generado por código, sin archivos de imagen.
- [x] Cada jugador usa su color de equipo (azul / rojo) con tonos claro y oscuro derivados.
- [x] Hay 13 poses: reposo (2), correr (4), salto, jab, lateral, arriba, bajo, spike y golpeado.
- [x] La animación se elige por estado con esta prioridad: golpeado > golpe > aire > correr > reposo.
- [x] Cada golpe muestra su propia pose durante el golpe más 110 ms de recuperación.
- [x] El sprite se voltea (`flipX`) al mirar a la izquierda.
- [x] El arte es reemplazable por spritesheets manteniendo los nombres `${id}-${pose}` y las animaciones `${id}-${estado}`.

## RF-08 — API · `IMPLEMENTADO`

- [x] `POST /api/matches` registra una partida: `{ winner, loser, winnerStocksLeft, durationSeconds }` y responde `201`.
- [x] Validación con `400`: nombres de 1 a 20 caracteres, `winnerStocksLeft` entre 1 y 10, `durationSeconds` entre 0 y 36000.
- [x] `GET /api/matches?take=N` devuelve las partidas más recientes (N entre 1 y 100, por defecto 10).
- [x] `GET /api/leaderboard?take=N` devuelve el ranking por victorias (nombre, victorias, derrotas), ordenado por victorias y luego por menos derrotas.
- [x] `GET /health` responde `{ "status": "ok" }`.
- [x] Las tablas se crean al iniciar con reintentos si la base aún no está lista.

## RF-09 — Pantalla final y ranking · `IMPLEMENTADO`

- [x] Se muestra el ganador, las vidas que le quedaban y la duración de la partida.
- [x] El resultado se guarda automáticamente en la API al terminar.
- [x] Se muestra el ranking de los 8 mejores (victorias / derrotas).
- [x] Si la API no responde se muestra un mensaje de error en lugar del ranking.
- [x] **ENTER** inicia una revancha con los mismos nombres; **M** vuelve al menú para cambiarlos.

---

## Verificación realizada

| Qué | Cómo |
|---|---|
| Tipos del cliente | `tsc --noEmit` sin errores |
| Builds de producción | `docker compose -f docker-compose.yml -f docker-compose.prod.yml build` (cliente y API) |
| API | `curl` a `/health`, `POST`/`GET` de partidas, casos inválidos (400), ranking, y a través del proxy de Vite |
| Menú y nombres | Navegador: escritura, ENTER y nombres por defecto |
| Golpes | Navegador: jab (5%), lateral (10%), arriba (8%) y spike (9%) con el daño en el HUD |
| Sprites | Navegador: reposo, correr, salto, jab, arriba, bajo, spike y golpeado |
| KO y fin de partida | Navegador: un jugador cae del escenario 3 veces → «¡KO!» → pantalla final con resultado guardado y ranking |

**No verificado de forma automatizada:** el stack de producción en ejecución (solo se comprobó que compila), la recarga automática de la API (`dotnet watch`), el mensaje de error con la API caída, y la sensación de juego al jugar dos personas con teclado real (por ejemplo, el *ghosting* de ciertas combinaciones de teclas).

## Fuera de alcance

Multijugador en red, proyectiles, escudo y esquive, golpes aéreos laterales, golpes cargados («smash attacks»), más personajes,
más escenarios, música y efectos de sonido, migraciones de EF Core y usuarios/autenticación.
