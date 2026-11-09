using Microsoft.EntityFrameworkCore;

namespace Server;

public class MatchResult
{
    public int Id { get; set; }
    public string Winner { get; set; } = "";
    public string Loser { get; set; } = "";
    /// <summary>Vidas que le quedaban al ganador.</summary>
    public int WinnerStocksLeft { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
}

public record NewMatch(string Winner, string Loser, int WinnerStocksLeft, int DurationSeconds);

public record LeaderboardEntry(string Name, int Wins, int Losses);

public class GameDb(DbContextOptions<GameDb> options) : DbContext(options)
{
    public DbSet<MatchResult> Matches => Set<MatchResult>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<MatchResult>(e =>
        {
            e.Property(x => x.Winner).HasMaxLength(20);
            e.Property(x => x.Loser).HasMaxLength(20);
            e.HasIndex(x => x.Winner);
            e.HasIndex(x => x.Loser);
        });
    }
}
