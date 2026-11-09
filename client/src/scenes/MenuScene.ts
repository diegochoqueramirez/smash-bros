import Phaser from 'phaser';
import { COLOR_CSS, CONTROLS_LABEL, GAME_H, GAME_W, type PlayerId } from '../config';
import { captureText } from '../ui/captureText';

const MAX_NAME = 14;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = GAME_W / 2;
    const style = (size: number, color = '#e2e8f0') => ({
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color,
      align: 'center',
    });

    this.add.text(cx, 90, 'SMASH ARENA', style(56, '#facc15')).setOrigin(0.5);
    this.add.text(cx, 145, 'pelea local para 2 jugadores', style(18, '#94a3b8')).setOrigin(0.5);

    const prompt = this.add.text(cx, 235, '', style(22)).setOrigin(0.5);
    const input = this.add.text(cx, 280, '', style(34)).setOrigin(0.5);

    (['p1', 'p2'] as PlayerId[]).forEach((id, i) => {
      const y = 360 + i * 70;
      this.add.text(cx, y, `J${i + 1}`, style(18, COLOR_CSS[id])).setOrigin(0.5);
      this.add.text(cx, y + 22, CONTROLS_LABEL[id].join('\n'), style(14, COLOR_CSS[id])).setOrigin(0.5, 0);
    });
    this.add.text(cx, GAME_H - 36, 'Dirección + golpe:  ↑ arriba · ← → lateral · ↓ bajo · ↓ en el aire = spike', style(13, '#94a3b8')).setOrigin(0.5);
    this.add.text(cx, GAME_H - 14, 'Gana quien deje al rival sin vidas: cuanto más daño %, más lejos vuela', style(13, '#64748b')).setOrigin(0.5);

    const names: string[] = [];
    const ask = (idx: 0 | 1) => {
      const id: PlayerId = idx === 0 ? 'p1' : 'p2';
      prompt.setText(`Nombre del jugador ${idx + 1}  (ENTER para continuar)`).setColor(COLOR_CSS[id]);
      input.setColor(COLOR_CSS[id]);
      const previous = (this.registry.get(`${id}Name`) as string | undefined) ?? '';
      captureText(
        this,
        MAX_NAME,
        previous,
        (t) => input.setText(`${t}_`),
        (t) => {
          names[idx] = t || `Jugador ${idx + 1}`;
          this.registry.set(`${id}Name`, names[idx]);
          if (idx === 0) ask(1);
          else this.scene.start('Game', { p1Name: names[0], p2Name: names[1] });
        },
      );
    };
    ask(0);
  }
}
