export interface LeaderboardEntry {
  name: string;
  wins: number;
  losses: number;
}

export interface NewMatch {
  winner: string;
  loser: string;
  winnerStocksLeft: number;
  durationSeconds: number;
}

export async function fetchLeaderboard(take = 8): Promise<LeaderboardEntry[]> {
  const res = await fetch(`/api/leaderboard?take=${take}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postMatch(match: NewMatch): Promise<void> {
  const res = await fetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(match),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
