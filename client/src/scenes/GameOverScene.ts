import Phaser from 'phaser';
import { fetchLeaderboard, postMatch } from '../api';
import { COLOR_CSS, GAME_H, GAME_W, type PlayerId } from '../config';

interface Data {
  winner: string;
  winnerId: PlayerId;
  loser: string;
  winnerStocks: number;
  duration: number;
  p1Name: string;
  p2Name: string;
}

export class GameOverScene extends Phaser.Scene {
  private result!: Data;

  constructor() {
    super('GameOver');
  }

  init(data: Data) {
    this.result = data;
  }

  create() {
    const cx = GAME_W / 2;
    const r = this.result;
    const mono = (size: number, color: string) => ({ fontFamily: 'monospace', fontSize: `${size}px`, color, align: 'center' });

    this.add.text(cx, 70, `¡${r.winner} gana!`, mono(46, COLOR_CSS[r.winnerId])).setOrigin(0.5);
    this.add
      .text(cx, 125, `${r.winnerStocks} vida${r.winnerStocks === 1 ? '' : 's'} restante${r.winnerStocks === 1 ? '' : 's'} · ${r.duration}s`, mono(18, '#94a3b8'))
      .setOrigin(0.5);

    const board = this.add.text(cx, 190, 'Guardando resultado...', mono(18, '#cbd5e1')).setOrigin(0.5, 0);
    this.add.text(cx, GAME_H - 40, 'ENTER  revancha        M  cambiar nombres', mono(16, '#64748b')).setOrigin(0.5);

    void this.saveAndShowBoard(board);

    const kb = this.input.keyboard!;
    kb.once('keydown-ENTER', () => this.scene.start('Game', { p1Name: r.p1Name, p2Name: r.p2Name }));
    kb.once('keydown-M', () => this.scene.start('Menu'));
  }

  private async saveAndShowBoard(board: Phaser.GameObjects.Text) {
    const r = this.result;
    try {
      await postMatch({
        winner: r.winner,
        loser: r.loser,
        winnerStocksLeft: r.winnerStocks,
        durationSeconds: r.duration,
      });
      const top = await fetchLeaderboard(8);
      const rows = top.map(
        (e, i) => `${String(i + 1).padStart(2)}. ${e.name.padEnd(14)} ${String(e.wins).padStart(3)}V ${String(e.losses).padStart(3)}D`,
      );
      board.setText(['— RANKING —', ...rows].join('\n'));
    } catch {
      board.setText('No se pudo conectar con el servidor.\nRevisa que la API esté corriendo.');
    }
  }
}
