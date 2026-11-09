import Phaser from 'phaser';
import { COLORS } from '../config';

/** Genera texturas simples por código para no depender de assets externos. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.add.graphics();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // Luchadores: cuerpo de color + "ojo" a la derecha (se voltea con flipX al mirar a la izquierda).
    for (const id of ['p1', 'p2'] as const) {
      make(id, 32, 44, (g) => {
        g.fillStyle(COLORS[id], 1).fillRect(0, 0, 32, 44);
        g.fillStyle(0xffffff, 1).fillRect(19, 8, 9, 9);
        g.fillStyle(0x0f172a, 1).fillRect(24, 11, 4, 4);
      });
    }

    make('stage', 520, 36, (g) => {
      g.fillStyle(0x6b4f3a, 1).fillRect(0, 0, 520, 36);
      g.fillStyle(0x4ade80, 1).fillRect(0, 0, 520, 8);
    });
    make('soft', 140, 12, (g) => {
      g.fillStyle(0x94a3b8, 1).fillRect(0, 0, 140, 12);
      g.fillStyle(0xe2e8f0, 1).fillRect(0, 0, 140, 3);
    });

    this.scene.start('Menu');
  }
}
