import Phaser from 'phaser';

/**
 * Sprites de los luchadores dibujados como pixel art por código (sin archivos de imagen).
 * Cada pose se define sobre una cuadrícula de 16×22 "píxeles" y se escala ×2 → texturas de 32×44.
 * Para usar arte propio, basta con reemplazar estas texturas/animaciones por un spritesheet
 * manteniendo los mismos nombres: `${id}-${pose}` y animaciones `${id}-${nombre}`.
 */

const SCALE = 2;
const GRID_W = 16;
const GRID_H = 22;

/** s = traje, d = traje oscuro, a = traje claro, k = piel, i = tinta, w = blanco */
type C = 's' | 'd' | 'a' | 'k' | 'i' | 'w';
type Part = [color: C, x: number, y: number, w: number, h: number];

interface Pose {
  /** Desplazamiento vertical del torso y la cabeza. */
  dy?: number;
  headDx?: number;
  hurt?: boolean;
  /** Se dibujan en este orden: brazo trasero, piernas, torso, cabeza, brazo delantero. */
  back: Part[];
  legs: Part[];
  front: Part[];
}

const leg = (x: number, y: number, h: number): Part[] => [
  ['d', x, y, 3, h],
  ['i', x, y + h, 4, 2], // zapato
];

const arm = (
  c: C, x: number, y: number, w: number, h: number,
  hx: number, hy: number, hw: number, hh: number,
): Part[] => [
  [c, x, y, w, h],
  ['k', hx, hy, hw, hh], // mano
];

/** Todas las poses miran a la derecha; el sprite se voltea con flipX al mirar a la izquierda. */
const POSES: Record<string, Pose> = {
  idle0: {
    back: arm('d', 4, 8, 2, 5, 4, 13, 2, 1),
    legs: [...leg(5, 15, 5), ...leg(8, 15, 5)],
    front: arm('a', 10, 8, 2, 5, 10, 13, 2, 1),
  },
  idle1: {
    dy: 1,
    back: arm('d', 4, 9, 2, 5, 4, 14, 2, 1),
    legs: [...leg(5, 16, 4), ...leg(8, 16, 4)],
    front: arm('a', 10, 9, 2, 5, 10, 14, 2, 1),
  },
  run0: {
    back: arm('d', 11, 8, 2, 5, 11, 13, 2, 1),
    legs: [...leg(3, 15, 5), ...leg(9, 15, 5)],
    front: arm('a', 8, 8, 2, 5, 8, 13, 2, 1),
  },
  run1: {
    back: arm('d', 5, 8, 2, 5, 5, 13, 2, 1),
    legs: [...leg(5, 15, 5), ...leg(8, 14, 4)],
    front: arm('a', 9, 8, 2, 5, 9, 13, 2, 1),
  },
  run2: {
    back: arm('d', 4, 8, 2, 5, 4, 13, 2, 1),
    legs: [...leg(4, 15, 5), ...leg(8, 15, 5)],
    front: arm('a', 11, 8, 2, 5, 11, 13, 2, 1),
  },
  run3: {
    back: arm('d', 5, 8, 2, 5, 5, 13, 2, 1),
    legs: [...leg(4, 14, 4), ...leg(8, 15, 5)],
    front: arm('a', 9, 8, 2, 5, 9, 13, 2, 1),
  },
  jump: {
    back: arm('d', 3, 5, 2, 5, 3, 4, 2, 1),
    legs: [...leg(4, 15, 3), ...leg(8, 14, 3)],
    front: arm('a', 11, 5, 2, 5, 11, 4, 2, 1),
  },
  // --- golpes: el nombre coincide con MoveName en GameScene ---
  jab: {
    back: arm('d', 4, 8, 2, 5, 4, 13, 2, 1),
    legs: [...leg(4, 15, 5), ...leg(8, 15, 5)],
    front: arm('a', 10, 8, 4, 2, 14, 7, 2, 3),
  },
  side: {
    dy: 1,
    back: arm('d', 3, 9, 2, 4, 3, 12, 2, 1),
    legs: [...leg(3, 16, 4), ...leg(9, 16, 4)],
    front: arm('a', 10, 9, 4, 3, 13, 8, 3, 5),
  },
  up: {
    back: arm('d', 4, 8, 2, 5, 4, 13, 2, 1),
    legs: [...leg(5, 15, 5), ...leg(8, 15, 5)],
    front: arm('a', 11, 2, 2, 7, 11, 0, 2, 2),
  },
  down: {
    dy: 4,
    back: arm('d', 4, 12, 2, 4, 4, 15, 2, 1),
    legs: [...leg(4, 19, 2), ['d', 9, 18, 6, 2], ['i', 14, 17, 2, 4]],
    front: arm('a', 10, 12, 2, 4, 10, 15, 2, 1),
  },
  spike: {
    dy: -1,
    back: arm('d', 3, 3, 2, 6, 3, 2, 2, 1),
    legs: [...leg(5, 14, 7), ...leg(8, 14, 7)],
    front: arm('a', 11, 3, 2, 6, 11, 2, 2, 1),
  },
  hurt: {
    headDx: -1,
    hurt: true,
    back: arm('d', 2, 7, 3, 2, 2, 7, 2, 2),
    legs: [...leg(4, 15, 5), ...leg(9, 15, 5)],
    front: arm('a', 11, 7, 3, 2, 13, 7, 2, 2),
  },
};

function palette(color: number): Record<C, number> {
  return {
    s: color,
    d: Phaser.Display.Color.ValueToColor(color).darken(35).color,
    a: Phaser.Display.Color.ValueToColor(color).lighten(18).color,
    k: 0xf2c9a0,
    i: 0x0f172a,
    w: 0xf8fafc,
  };
}

function drawPose(g: Phaser.GameObjects.Graphics, pose: Pose, pal: Record<C, number>) {
  const px = (c: C, x: number, y: number, w: number, h: number) => {
    g.fillStyle(pal[c], 1);
    g.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
  };
  const dy = pose.dy ?? 0;
  const hx = pose.headDx ?? 0;

  pose.back.forEach((p) => px(...p));
  pose.legs.forEach((p) => px(...p));

  // Torso con cinturón
  px('s', 5, 7 + dy, 6, 8);
  px('d', 5, 12 + dy, 6, 1);

  // Cabeza: piel, pelo, vincha y ojo (cerrado si está golpeado)
  px('k', 5 + hx, 1 + dy, 6, 6);
  px('i', 5 + hx, 1 + dy, 6, 2);
  px('w', 5 + hx, 3 + dy, 6, 1);
  if (pose.hurt) px('i', 8 + hx, 4 + dy, 3, 1);
  else px('i', 9 + hx, 4 + dy, 1, 2);

  pose.front.forEach((p) => px(...p));
}

/** Genera una textura por pose: `${id}-${pose}` (32×44). */
export function buildFighterTextures(scene: Phaser.Scene, id: string, color: number) {
  const pal = palette(color);
  for (const [name, pose] of Object.entries(POSES)) {
    const g = scene.add.graphics();
    drawPose(g, pose, pal);
    g.generateTexture(`${id}-${name}`, GRID_W * SCALE, GRID_H * SCALE);
    g.destroy();
  }
}

/** Crea las animaciones `${id}-idle|run|jump|jab|side|up|down|spike|hurt`. */
export function createFighterAnims(scene: Phaser.Scene, id: string) {
  const make = (name: string, poses: string[], frameRate: number) =>
    scene.anims.create({
      key: `${id}-${name}`,
      frames: poses.map((p) => ({ key: `${id}-${p}` })),
      frameRate,
      repeat: -1,
    });

  make('idle', ['idle0', 'idle1'], 3);
  make('run', ['run0', 'run1', 'run2', 'run3'], 10);
  for (const single of ['jump', 'jab', 'side', 'up', 'down', 'spike', 'hurt']) {
    make(single, [single], 1);
  }
}
