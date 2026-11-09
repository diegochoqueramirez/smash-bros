import Phaser from 'phaser';

/**
 * Captura texto del teclado para un campo simple (nombre de jugador).
 * Llama a onChange en cada edición y a onSubmit (con el texto recortado) al presionar ENTER.
 */
export function captureText(
  scene: Phaser.Scene,
  max: number,
  initial: string,
  onChange: (text: string) => void,
  onSubmit: (text: string) => void,
): void {
  let text = initial;
  onChange(text);

  const kb = scene.input.keyboard!;
  const handler = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') {
      kb.off('keydown', handler);
      onSubmit(text.trim());
      return;
    }
    if (ev.key === 'Backspace') {
      text = text.slice(0, -1);
    } else if (ev.key.length === 1 && /[\p{L}\p{N} ]/u.test(ev.key) && text.length < max) {
      text += ev.key;
    } else {
      return;
    }
    onChange(text);
  };

  kb.on('keydown', handler);
  scene.events.once('shutdown', () => kb.off('keydown', handler));
}
