import Phaser from 'phaser';
import { CONTROLS, GAME_H, GAME_W, type PlayerId } from '../config';

type Sprite = Phaser.Physics.Arcade.Sprite;
type Body = Phaser.Physics.Arcade.Body;

// --- Ajustes de sensación de juego (todo en un lugar para afinar) ---
const RUN_SPEED = 260;
const JUMP_V = 560;
const AIR_JUMP_V = 500;
const MAX_FALL = 700;
const STOCKS = 3;
const RESPAWN_MS = 1200;
const INVULN_MS = 2000;

/** Poner en true para ver las cajas de golpe (útil para ajustar alcance y daño). */
const SHOW_HITBOXES = false;
/** Tiempo extra que se mantiene la pose de golpe después de que termina la caja. */
const ATTACK_RECOVERY_MS = 110;

/** Mantener "abajo" este tiempo antes de atravesar una plataforma (así ↓ + golpe no te hace caer). */
const DROP_HOLD_MS = 140;
/** Tras atacar, no se atraviesan plataformas durante este tiempo. */
const DROP_AFTER_ATTACK_MS = 250;

type MoveName = 'jab' | 'side' | 'up' | 'down' | 'spike';

interface Move {
  /** Tamaño y posición de la caja de golpe, relativa al luchador (ox se invierte según hacia dónde mira). */
  w: number;
  h: number;
  ox: number;
  oy: number;
  damage: number;
  /** Empuje = base + growth × daño acumulado del rival. */
  kb: { base: number; growth: number };
  /** Ángulo de salida en grados sobre la horizontal (negativo = hacia abajo). */
  angle: number;
  cooldown: number;
  activeMs: number;
}

/** Golpes según la dirección presionada junto al botón de ataque. */
const MOVES: Record<MoveName, Move> = {
  // Sin dirección: rápido y de poco daño.
  jab: { w: 44, h: 36, ox: 36, oy: 0, damage: 5, kb: { base: 240, growth: 3.5 }, angle: 40, cooldown: 300, activeMs: 110 },
  // ← / → : más fuerte y más lento.
  side: { w: 58, h: 34, ox: 42, oy: 0, damage: 10, kb: { base: 300, growth: 5.5 }, angle: 35, cooldown: 520, activeMs: 150 },
  // ↑ : lanzador casi vertical.
  up: { w: 56, h: 64, ox: 0, oy: -34, damage: 8, kb: { base: 280, growth: 5 }, angle: 85, cooldown: 450, activeMs: 140 },
  // ↓ en el suelo: barrido bajo que golpea a ambos lados.
  down: { w: 90, h: 22, ox: 0, oy: 14, damage: 7, kb: { base: 220, growth: 4 }, angle: 25, cooldown: 450, activeMs: 130 },
  // ↓ en el aire: spike, manda al rival hacia abajo.
  spike: { w: 38, h: 40, ox: 0, oy: 38, damage: 9, kb: { base: 260, growth: 4.5 }, angle: -70, cooldown: 600, activeMs: 140 },
};

/** Zonas de KO: fuera de este rectángulo el luchador pierde una vida. */
const BLAST = { left: -120, right: GAME_W + 120, top: -220, bottom: GAME_H + 140 };

interface FighterKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  attack: Phaser.Input.Keyboard.Key;
}

class Fighter extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  stocks = STOCKS;
  facing: 1 | -1 = 1;
  jumpsLeft = 2;
  hitstunUntil = 0;
  invulnerableUntil = 0;
  attackReadyAt = 0;
  lastAttackAt = -1000;
  /** Pose del último golpe y hasta cuándo se muestra (golpe + un poco de recuperación). */
  attackPose: MoveName = 'jab';
  attackAnimUntil = 0;
  /** Instante en que empezó a mantenerse "abajo" (-1 si no está presionado). */
  downHeldSince = -1;

  constructor(
    scene: Phaser.Scene,
    readonly id: PlayerId,
    readonly label: string,
    readonly keys: FighterKeys,
    readonly spawnX: number,
  ) {
    super(scene, spawnX, 200, `${id}-idle0`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Body).setSize(28, 44);
  }

  /** Movimiento y salto. Durante el hitstun no hay control: solo se aplica fricción. */
  control(time: number, delta: number) {
    const body = this.body as Body;
    const k = this.keys;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) this.jumpsLeft = 2;

    // Consumir siempre la pulsación para que no quede "pegada" durante el hitstun.
    const jumpPressed = Phaser.Input.Keyboard.JustDown(k.jump);

    if (!k.down.isDown) this.downHeldSince = -1;
    else if (this.downHeldSince < 0) this.downHeldSince = time;

    if (time < this.hitstunUntil) {
      const friction = Math.pow(onGround ? 0.01 : 0.4, delta / 1000);
      body.setVelocityX(body.velocity.x * friction);
    } else {
      const dir = (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0);
      if (dir !== 0) this.facing = dir > 0 ? 1 : -1;
      const blend = onGround ? 0.35 : 0.12;
      body.setVelocityX(body.velocity.x + (dir * RUN_SPEED - body.velocity.x) * blend);

      if (jumpPressed && this.jumpsLeft > 0) {
        body.setVelocityY(onGround ? -JUMP_V : -AIR_JUMP_V);
        this.jumpsLeft--;
      }
    }

    if (body.velocity.y > MAX_FALL) body.setVelocityY(MAX_FALL);
    this.setFlipX(this.facing === -1);
    this.animate(time, onGround);
  }

  /** Elige la animación según el estado: golpeado > golpe > aire > correr > reposo. */
  private animate(time: number, onGround: boolean) {
    let name: string = 'idle';
    if (time < this.hitstunUntil) name = 'hurt';
    else if (time < this.attackAnimUntil) name = this.attackPose;
    else if (!onGround) name = 'jump';
    else if (Math.abs((this.body as Body).velocity.x) > 40) name = 'run';
    this.anims.play(`${this.id}-${name}`, true);
  }

  /** ¿Debe atravesar una plataforma atravesable? Solo si mantiene "abajo" y no acaba de atacar. */
  wantsToDrop(time: number): boolean {
    return (
      this.downHeldSince >= 0 &&
      time - this.downHeldSince > DROP_HOLD_MS &&
      time - this.lastAttackAt > DROP_AFTER_ATTACK_MS
    );
  }
}

interface Hitbox {
  rect: Phaser.GameObjects.Rectangle;
  owner: Fighter;
  move: Move;
  expires: number;
  hit: Set<Fighter>;
}

export class GameScene extends Phaser.Scene {
  private names: Record<PlayerId, string> = { p1: 'Jugador 1', p2: 'Jugador 2' };
  private fighters: Fighter[] = [];
  private hitboxes: Hitbox[] = [];
  private huds = new Map<Fighter, { damage: Phaser.GameObjects.Text; info: Phaser.GameObjects.Text }>();
  private ended = false;
  private startedAt = 0;

  constructor() {
    super('Game');
  }

  init(data: { p1Name?: string; p2Name?: string }) {
    this.names = { p1: data.p1Name ?? 'Jugador 1', p2: data.p2Name ?? 'Jugador 2' };
  }

  create() {
    // La instancia de la escena se reutiliza entre partidas: reiniciar el estado.
    this.fighters = [];
    this.hitboxes = [];
    this.huds = new Map();
    this.ended = false;
    this.startedAt = Date.now();

    this.buildStage();
    this.buildFighters();
    this.buildHud();
    this.cameras.main.fadeIn(300);
  }

  update(time: number, delta: number) {
    if (this.ended) return;

    for (const f of this.fighters) {
      if (!f.active) continue;
      f.control(time, delta);

      // Consumir siempre la pulsación; solo atacar si no está en hitstun.
      const attackPressed = Phaser.Input.Keyboard.JustDown(f.keys.attack);
      if (attackPressed && time >= f.hitstunUntil) this.tryAttack(f, time);
    }

    this.updateHitboxes(time);
    this.checkBlastZones();
  }

  // ------------------------------------------------------------ escenario

  private buildStage() {
    const solid = this.physics.add.staticGroup();
    solid.create(GAME_W / 2, 420, 'stage');

    const soft = this.physics.add.staticGroup();
    soft.create(GAME_W / 2 - 190, 320, 'soft');
    soft.create(GAME_W / 2 + 190, 320, 'soft');
    soft.create(GAME_W / 2, 225, 'soft');

    // Se guardan para registrar colisiones cuando existan los luchadores.
    this.data.set('solid', solid);
    this.data.set('soft', soft);
  }

  private buildFighters() {
    const kb = this.input.keyboard!;
    const keysFor = (id: PlayerId): FighterKeys => {
      const c = CONTROLS[id];
      return {
        left: kb.addKey(c.left),
        right: kb.addKey(c.right),
        up: kb.addKey(c.up),
        down: kb.addKey(c.down),
        jump: kb.addKey(c.jump),
        attack: kb.addKey(c.attack),
      };
    };

    // Aparecen (y reaparecen) en los huecos entre plataformas, para caer siempre al escenario principal.
    this.fighters.push(new Fighter(this, 'p1', this.names.p1, keysFor('p1'), GAME_W / 2 - 100));
    this.fighters.push(new Fighter(this, 'p2', this.names.p2, keysFor('p2'), GAME_W / 2 + 100));
    this.fighters[1].facing = -1;

    const solid = this.data.get('solid') as Phaser.Physics.Arcade.StaticGroup;
    const soft = this.data.get('soft') as Phaser.Physics.Arcade.StaticGroup;

    this.physics.add.collider(this.fighters, solid);

    // Plataformas atravesables: solo colisionan al caer desde arriba y sin mantener "bajar".
    this.physics.add.collider(this.fighters, soft, undefined, (a, b) => {
      const fighter = a as Fighter;
      const fb = fighter.body as Body;
      const pb = (b as Sprite).body as Phaser.Physics.Arcade.StaticBody;
      if (fighter.wantsToDrop(this.time.now)) return false;
      return fb.velocity.y >= 0 && fb.bottom <= pb.top + 14;
    });
  }

  // ------------------------------------------------------------------ HUD

  private buildHud() {
    this.fighters.forEach((f, i) => {
      const x = GAME_W * (i === 0 ? 0.25 : 0.75);
      const damage = this.add
        .text(x, GAME_H - 78, '0%', { fontFamily: 'monospace', fontSize: '40px', color: '#ffffff' })
        .setOrigin(0.5);
      const info = this.add
        .text(x, GAME_H - 38, '', { fontFamily: 'monospace', fontSize: '16px', color: '#cbd5e1', align: 'center' })
        .setOrigin(0.5);
      this.huds.set(f, { damage, info });
    });
    this.refreshHud();
  }

  private refreshHud() {
    for (const [f, hud] of this.huds) {
      hud.damage.setText(`${Math.round(f.damage)}%`);
      // Del blanco al rojo a medida que sube el daño.
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(255, 255, 255),
        new Phaser.Display.Color(239, 68, 68),
        150,
        Math.min(f.damage, 150),
      );
      hud.damage.setColor(Phaser.Display.Color.RGBToString(c.r, c.g, c.b, 255, '#'));
      hud.info.setText(`${f.label}\n${'●'.repeat(Math.max(f.stocks, 0))}`);
    }
  }

  // -------------------------------------------------------------- combate

  /** Elige el golpe según la dirección mantenida: ↑ > ↓ > lateral > sin dirección. */
  private pickMove(f: Fighter): MoveName {
    const k = f.keys;
    const body = f.body as Body;
    const airborne = !(body.blocked.down || body.touching.down);
    if (k.up.isDown) return 'up';
    if (k.down.isDown) return airborne ? 'spike' : 'down';
    if (k.left.isDown !== k.right.isDown) return 'side';
    return 'jab';
  }

  private tryAttack(f: Fighter, time: number) {
    if (time < f.attackReadyAt) return;
    const name = this.pickMove(f);
    const move = MOVES[name];
    f.attackReadyAt = time + move.cooldown;
    f.lastAttackAt = time;
    f.attackPose = name;
    f.attackAnimUntil = time + move.activeMs + ATTACK_RECOVERY_MS;

    const rect = this.add.rectangle(f.x, f.y, move.w, move.h, 0xffffff, SHOW_HITBOXES ? 0.35 : 0);
    this.hitboxes.push({ rect, owner: f, move, expires: time + move.activeMs, hit: new Set() });
  }

  private updateHitboxes(time: number) {
    this.hitboxes = this.hitboxes.filter((hb) => {
      if (time > hb.expires || !hb.owner.active) {
        hb.rect.destroy();
        return false;
      }
      const { owner, move } = hb;
      // La caja sigue al luchador mientras dura el golpe.
      hb.rect.setPosition(owner.x + owner.facing * move.ox, owner.y + move.oy);
      const area = hb.rect.getBounds();
      for (const target of this.fighters) {
        if (target === owner || !target.active || hb.hit.has(target)) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(area, target.getBounds())) {
          hb.hit.add(target);
          this.applyHit(owner, target, move, time);
        }
      }
      return true;
    });
  }

  private applyHit(attacker: Fighter, target: Fighter, move: Move, time: number) {
    if (!target.active || time < target.invulnerableUntil || this.ended) return;

    target.damage += move.damage;
    // A mayor % de daño, más fuerza de empuje.
    const force = move.kb.base + target.damage * move.kb.growth;
    // Empuja alejándose del atacante; si están alineados, hacia donde mira el atacante.
    const dir = Math.sign(target.x - attacker.x) || attacker.facing;
    const angle = Phaser.Math.DegToRad(move.angle);
    (target.body as Body).setVelocity(dir * force * Math.cos(angle), -force * Math.sin(angle));
    target.hitstunUntil = time + 120 + force * 0.25;

    target.setTintFill(0xffffff);
    this.time.delayedCall(80, () => target.active && target.clearTint());
    this.refreshHud();
  }

  // ------------------------------------------------------------------- KO

  private checkBlastZones() {
    for (const f of this.fighters) {
      if (!f.active) continue;
      if (f.x < BLAST.left || f.x > BLAST.right || f.y < BLAST.top || f.y > BLAST.bottom) this.knockOut(f);
    }
  }

  private knockOut(f: Fighter) {
    f.stocks--;
    this.refreshHud();
    f.disableBody(true, true);
    this.cameras.main.shake(180, 0.01);

    if (f.stocks <= 0) {
      this.finish(this.fighters.find((o) => o !== f)!);
      return;
    }

    this.time.delayedCall(RESPAWN_MS, () => {
      if (this.ended) return;
      f.damage = 0;
      f.hitstunUntil = 0;
      f.jumpsLeft = 2;
      f.enableBody(true, f.spawnX, 60, true, true);
      f.setVelocity(0, 0);
      f.invulnerableUntil = this.time.now + INVULN_MS;
      this.refreshHud();
      this.tweens.add({
        targets: f,
        alpha: 0.35,
        yoyo: true,
        repeat: 7,
        duration: 125,
        onComplete: () => f.setAlpha(1),
      });
    });
  }

  private finish(winner: Fighter) {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();

    this.add
      .text(GAME_W / 2, GAME_H / 2 - 40, '¡KO!', { fontFamily: 'monospace', fontSize: '96px', color: '#facc15' })
      .setOrigin(0.5);

    const loser = this.fighters.find((o) => o !== winner)!;
    this.time.delayedCall(1500, () => {
      this.scene.start('GameOver', {
        winner: winner.label,
        winnerId: winner.id,
        loser: loser.label,
        winnerStocks: winner.stocks,
        duration: Math.round((Date.now() - this.startedAt) / 1000),
        p1Name: this.names.p1,
        p2Name: this.names.p2,
      });
    });
  }
}
