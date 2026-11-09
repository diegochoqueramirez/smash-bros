using Microsoft.EntityFrameworkCore;
using Server;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<GameDb>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// Crea las tablas si no existen. Para producción real conviene pasar a migraciones de EF Core.
await EnsureDatabaseAsync(app);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Partidas recientes
app.MapGet("/api/matches", async (GameDb db, int? take) =>
{
    var n = Math.Clamp(take ?? 10, 1, 100);
    var recent = await db.Matches.OrderByDescending(m => m.PlayedAt).Take(n).ToListAsync();
    return Results.Ok(recent);
});

// Registrar el resultado de una partida
app.MapPost("/api/matches", async (NewMatch dto, GameDb db) =>
{
    var winner = dto.Winner?.Trim() ?? "";
    var loser = dto.Loser?.Trim() ?? "";
    if (winner.Length is < 1 or > 20 || loser.Length is < 1 or > 20)
        return Results.BadRequest(new { error = "Los nombres deben tener entre 1 y 20 caracteres." });
    if (dto.WinnerStocksLeft is < 1 or > 10)
        return Results.BadRequest(new { error = "WinnerStocksLeft fuera de rango." });
    if (dto.DurationSeconds is < 0 or > 36_000)
        return Results.BadRequest(new { error = "DurationSeconds fuera de rango." });

    var match = new MatchResult
    {
        Winner = winner,
        Loser = loser,
        WinnerStocksLeft = dto.WinnerStocksLeft,
        DurationSeconds = dto.DurationSeconds,
    };
    db.Matches.Add(match);
    await db.SaveChangesAsync();
    return Results.Created($"/api/matches/{match.Id}", match);
});

// Ranking por victorias
app.MapGet("/api/leaderboard", async (GameDb db, int? take) =>
{
    var n = Math.Clamp(take ?? 10, 1, 100);
    var wins = await db.Matches
        .GroupBy(m => m.Winner)
        .Select(g => new { Name = g.Key, Count = g.Count() })
        .ToListAsync();
    var losses = (await db.Matches
        .GroupBy(m => m.Loser)
        .Select(g => new { Name = g.Key, Count = g.Count() })
        .ToListAsync())
        .ToDictionary(x => x.Name, x => x.Count);

    var board = wins
        .Select(w => new LeaderboardEntry(w.Name, w.Count, losses.GetValueOrDefault(w.Name)))
        .OrderByDescending(e => e.Wins)
        .ThenBy(e => e.Losses)
        .Take(n);
    return Results.Ok(board);
});

app.Run();

static async Task EnsureDatabaseAsync(WebApplication app)
{
    // La DB ya pasó el healthcheck, pero reintentamos por si acaba de arrancar.
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<GameDb>().Database.EnsureCreatedAsync();
            return;
        }
        catch (Exception ex) when (attempt < 10)
        {
            app.Logger.LogWarning("DB no lista (intento {Attempt}): {Message}", attempt, ex.Message);
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
    }
}
