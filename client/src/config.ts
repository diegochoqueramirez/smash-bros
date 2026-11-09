export const GAME_W = 960;
export const GAME_H = 540;

export type PlayerId = 'p1' | 'p2';

export interface KeyBinding {
  left: string;
  right: string;
  up: string;
  down: string;
  jump: string;
  attack: string;
}

/**
 * Controles de los dos jugadores en el mismo teclado. Nombres de Phaser.Input.Keyboard.KeyCodes.
 * Las direcciones (left/right/up/down) mueven y además apuntan el golpe: dirección + attack.
 */
export const CONTROLS: Record<PlayerId, KeyBinding> = {
  p1: { left: 'A', right: 'D', up: 'W', down: 'S', jump: 'H', attack: 'G' },
  p2: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', jump: 'FORWARD_SLASH', attack: 'PERIOD' },
};

export const CONTROLS_LABEL: Record<PlayerId, string[]> = {
  p1: ['W A S D  mover / apuntar      H  saltar (x2)      G  golpe'],
  p2: ['← ↑ ↓ →  mover / apuntar      /  saltar (x2)      .  golpe'],
};

export const COLORS: Record<PlayerId, number> = { p1: 0x3b82f6, p2: 0xef4444 };
export const COLOR_CSS: Record<PlayerId, string> = { p1: '#60a5fa', p2: '#f87171' };
