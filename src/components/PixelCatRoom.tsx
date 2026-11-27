"use client";

import { useEffect, useRef } from "react";
import {
  drawPixelCan,
  drawPixelCat,
  drawPixelHeart,
  type PixelAnimState,
} from "@/lib/pixelCats";
import type { CanId, CatId, CatMood } from "@/lib/types";

export type RoomPreviewMode = "live" | "happy" | "unhappy";

export interface FeedingCommand {
  id: number;
  catId: CatId;
  canId: CanId;
}

interface PixelCatRoomProps {
  moods: Record<CatId, CatMood>;
  previewMode: RoomPreviewMode;
  feedingCommand: FeedingCommand | null;
  pokeCommand: { id: number; catId: CatId } | null;
  onCatTapped: (catId: CatId, reaction: "belly-up" | "hiss") => void;
  onEatingFinished: (catId: CatId) => void;
}

interface CatActor {
  id: CatId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: "left" | "right";
  mode: PixelAnimState | "goto-bowl";
  modeUntil: number;
  animTime: number;
  speech: string | null;
  speechUntil: number;
  shakeUntil: number;
  activeCanId: CanId | null;
  onMatOrBowl: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "heart" | "hiss" | "zzz" | "tap" | "crumb" | "note";
  bornAt: number;
  lifeMs: number;
  color: string;
}

const LOGICAL_W = 192;
const LOGICAL_H = 128;
const CANVAS_SCALE = 3; // 576x384 crisp pixel buffer

const FLOOR_MIN_X = 20;
const FLOOR_MAX_X = 172;
const FLOOR_MIN_Y = 70;
const FLOOR_MAX_Y = 118;

const BOWL_EAT_POS = { x: 64, y: 74 };
const CAN_SPOT = { x: 52, y: 73 };
const SCRATCHER_POS = { x: 151, y: 92 };
const YOGA_MAT_POS = { x: 48, y: 103 };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Draw the cozy low-saturation pixel room inspired by the user's real home photos:
 * - Sunlit window with gently drifting clouds
 * - Mushroom tapestry on the back wall (Photo 7!)
 * - Raised wooden twin food bowl stand (Photo 1!)
 * - Muted-purple yoga mat (Photo 3!)
 * - Round cardboard cat scratcher bowl (Photos 2 & 8!)
 */
function drawPixelRoomBackground(
  ctx: CanvasRenderingContext2D,
  timeSec: number
) {
  // 1. Warm archival cream wall
  ctx.fillStyle = "#ECE4D3";
  ctx.fillRect(0, 0, LOGICAL_W, 56);

  // Subtle vertical editorial wallpaper stripes
  ctx.fillStyle = "#E5DCC8";
  for (let x = 0; x < LOGICAL_W; x += 12) {
    ctx.fillRect(x, 0, 2, 54);
  }

  // Wooden baseboard
  ctx.fillStyle = "#B99A73";
  ctx.fillRect(0, 52, LOGICAL_W, 5);
  ctx.fillStyle = "#987A56";
  ctx.fillRect(0, 56, LOGICAL_W, 1);

  // 2. Sunlit Window (x=18..64, y=8..42)
  ctx.fillStyle = "#8C6F4E";
  ctx.fillRect(17, 7, 48, 36); // outer frame
  ctx.fillStyle = "#D4E3E6"; // soft retro morning sky
  ctx.fillRect(19, 9, 44, 32);

  // Drifting pixel clouds inside window
  const cloudShift = Math.floor((timeSec * 2.5) % 52);
  ctx.fillStyle = "#F7F4EC";
  const c1x = 19 + ((cloudShift + 6) % 44);
  ctx.fillRect(c1x, 15, 10, 3);
  ctx.fillRect(c1x + 2, 13, 6, 2);
  const c2x = 19 + ((cloudShift + 28) % 44);
  ctx.fillRect(c2x, 24, 8, 3);
  ctx.fillRect(c2x + 1, 22, 5, 2);

  // Mask cloud overflow cleanly inside frame
  ctx.fillStyle = "#8C6F4E";
  ctx.fillRect(17, 7, 2, 36);
  ctx.fillRect(63, 7, 2, 36);
  // Window mullions
  ctx.fillRect(40, 9, 2, 32);
  ctx.fillRect(19, 25, 44, 2);
  // Window sill
  ctx.fillStyle = "#C7AA82";
  ctx.fillRect(15, 42, 52, 3);
  ctx.fillStyle = "#8C6F4E";
  ctx.fillRect(15, 44, 52, 1);

  // Tiny sage potted plant on the windowsill
  ctx.fillStyle = "#B96B52"; // terracotta pot
  ctx.fillRect(54, 38, 6, 4);
  ctx.fillStyle = "#5E7D6A"; // sage leaves
  ctx.fillRect(55, 35, 4, 3);
  ctx.fillRect(53, 36, 2, 2);
  ctx.fillRect(59, 36, 2, 2);
  ctx.fillStyle = "#7D9B87";
  ctx.fillRect(56, 33, 2, 2);

  // 3. Cozy Mushroom Tapestry (Photo 7!) (x=114..152, y=8..41)
  ctx.fillStyle = "#7B6147"; // hanging dowel rod
  ctx.fillRect(112, 7, 42, 2);
  ctx.fillStyle = "#363A3B"; // dark charcoal botanical tapestry cloth
  ctx.fillRect(115, 9, 36, 32);
  ctx.fillStyle = "#484E4F"; // border weave
  ctx.fillRect(116, 10, 34, 30);
  ctx.fillStyle = "#2E3335";
  ctx.fillRect(118, 12, 30, 26);

  // Big pixel mushroom in center of tapestry
  ctx.fillStyle = "#F0E6CE"; // stem
  ctx.fillRect(131, 24, 4, 9);
  ctx.fillStyle = "#C4634C"; // red-terracotta mushroom cap
  ctx.fillRect(124, 19, 18, 4);
  ctx.fillRect(126, 17, 14, 2);
  ctx.fillRect(129, 15, 8, 2);
  // Cute white mushroom cap dots
  ctx.fillStyle = "#F6F0DF";
  ctx.fillRect(128, 19, 2, 1);
  ctx.fillRect(134, 18, 2, 1);
  ctx.fillRect(138, 20, 2, 1);
  // Two mini side mushrooms
  ctx.fillStyle = "#E8DEC5";
  ctx.fillRect(121, 30, 2, 4);
  ctx.fillRect(142, 29, 2, 5);
  ctx.fillStyle = "#BD9548";
  ctx.fillRect(119, 28, 6, 2);
  ctx.fillStyle = "#C4634C";
  ctx.fillRect(140, 27, 6, 2);
  // Subtle green pixel foliage at tapestry bottom
  ctx.fillStyle = "#5E7D6A";
  ctx.fillRect(119, 34, 28, 3);

  // Little framed retro vinyl / tape poster on far right wall
  ctx.fillStyle = "#987A56";
  ctx.fillRect(162, 14, 18, 22);
  ctx.fillStyle = "#F6F1E3";
  ctx.fillRect(164, 16, 14, 18);
  ctx.fillStyle = "#5A7487";
  ctx.fillRect(166, 19, 10, 8);
  ctx.fillStyle = "#D48A49";
  ctx.fillRect(169, 21, 4, 4);
  ctx.fillStyle = "#B8AE9A";
  ctx.fillRect(166, 29, 10, 2);

  // 4. Warm Oak Wooden Floorboards (y=57..128)
  ctx.fillStyle = "#DEC6A4";
  ctx.fillRect(0, 57, LOGICAL_W, LOGICAL_H - 57);

  // Horizontal plank seams & subtle color variation
  for (let y = 64; y < LOGICAL_H; y += 9) {
    ctx.fillStyle = "#D1B68E";
    ctx.fillRect(0, y, LOGICAL_W, 1);
    ctx.fillStyle = "#E4CEAE";
    ctx.fillRect(0, y + 1, LOGICAL_W, 1);
    // Vertical plank joints
    const offset = ((y / 9) % 2) * 28;
    ctx.fillStyle = "#CCAFA0";
    for (let x = offset + 18; x < LOGICAL_W; x += 56) {
      ctx.fillRect(x, y, 1, 9);
    }
  }

  // Soft diagonal sunlit patch from window onto floorboards
  ctx.fillStyle = "rgba(255, 250, 234, 0.24)";
  ctx.fillRect(18, 57, 46, 24);
  ctx.fillRect(26, 81, 46, 14);

  // 5. Raised Wooden Twin Food Bowl Stand (Photo 1!) (x=18..48, y=58..71)
  ctx.fillStyle = "rgba(45, 36, 26, 0.14)";
  ctx.fillRect(19, 70, 30, 3); // stand shadow
  ctx.fillStyle = "#3A312A"; // thin metal stand legs
  ctx.fillRect(20, 64, 2, 7);
  ctx.fillRect(46, 64, 2, 7);
  ctx.fillStyle = "#A97B50"; // wooden board
  ctx.fillRect(18, 62, 32, 4);
  ctx.fillStyle = "#8C623C";
  ctx.fillRect(18, 65, 32, 1);
  // Two white ceramic bowls
  ctx.fillStyle = "#FBF9F4";
  ctx.fillRect(21, 59, 11, 4);
  ctx.fillRect(36, 59, 11, 4);
  ctx.fillStyle = "#D7CFC0"; // bowl interior
  ctx.fillRect(23, 60, 7, 2);
  ctx.fillRect(38, 60, 7, 2);
  ctx.fillStyle = "#2A231D"; // bowl rim outline
  ctx.fillRect(21, 58, 11, 1);
  ctx.fillRect(36, 58, 11, 1);

  // 6. Muted-Purple Yoga Mat (Photo 3!) (x=16..78, y=90..115)
  ctx.fillStyle = "rgba(45, 36, 26, 0.12)";
  ctx.fillRect(17, 114, 62, 2);
  ctx.fillStyle = "#796089"; // outer rim
  ctx.fillRect(16, 90, 62, 25);
  ctx.fillStyle = "#8F74A0"; // mat surface
  ctx.fillRect(17, 91, 60, 23);
  ctx.fillStyle = "#9D82AE"; // subtle texture highlight
  ctx.fillRect(19, 93, 56, 2);
  ctx.fillStyle = "#7D648D";
  ctx.fillRect(19, 110, 56, 1);

  // 7. Round Cardboard Cat Scratcher Bowl (Photos 2 & 8!) (center ~151, 92)
  ctx.fillStyle = "rgba(45, 36, 26, 0.16)";
  ctx.fillRect(131, 98, 40, 4); // bowl shadow
  // Outer cardboard wall
  ctx.fillStyle = "#9C7B50";
  ctx.fillRect(132, 84, 38, 15);
  ctx.fillRect(135, 81, 32, 20);
  // Textured woven corrugated rim
  ctx.fillStyle = "#C3A172";
  ctx.fillRect(134, 83, 34, 14);
  ctx.fillRect(137, 81, 28, 18);
  // Inner concave bowl bed
  ctx.fillStyle = "#A9885D";
  ctx.fillRect(137, 85, 28, 10);
  ctx.fillRect(140, 83, 22, 14);
  ctx.fillStyle = "#96764D";
  ctx.fillRect(141, 86, 20, 8);
  // Cute tiny corrugated pixel speckles
  ctx.fillStyle = "#D4B68A";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(136 + i * 5, 83, 2, 1);
    ctx.fillRect(138 + i * 4, 96, 2, 1);
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  urgent = false
) {
  ctx.save();
  ctx.font = "bold 7px monospace";
  const textW = Math.ceil(ctx.measureText(text).width);
  const bw = Math.max(22, textW + 8);
  const bh = 12;
  const bx = clamp(Math.round(x - bw / 2), 4, LOGICAL_W - bw - 4);
  const by = Math.max(3, Math.round(y - bh));

  // Pixel border
  ctx.fillStyle = urgent ? "#9B4838" : "#4A4338";
  ctx.fillRect(bx, by, bw, bh);
  // Fill
  ctx.fillStyle = urgent ? "#F7E2DB" : "#FBF8F1";
  ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
  // Little tail triangle
  const tx = clamp(Math.round(x), bx + 4, bx + bw - 5);
  ctx.fillStyle = urgent ? "#9B4838" : "#4A4338";
  ctx.fillRect(tx - 1, by + bh, 3, 2);
  ctx.fillStyle = urgent ? "#F7E2DB" : "#FBF8F1";
  ctx.fillRect(tx, by + bh - 1, 1, 2);

  ctx.fillStyle = urgent ? "#8B3B2B" : "#3A342C";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
  ctx.restore();
}

function drawNameplate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  accent: string
) {
  ctx.save();
  ctx.font = "bold 6px sans-serif";
  const w = Math.ceil(ctx.measureText(label).width) + 6;
  const bx = clamp(Math.round(x - w / 2), 2, LOGICAL_W - w - 2);
  const by = clamp(Math.round(y + 1), 2, LOGICAL_H - 10);

  ctx.fillStyle = "rgba(42, 35, 29, 0.72)";
  ctx.fillRect(bx, by, w, 9);
  ctx.fillStyle = accent;
  ctx.fillRect(bx, by, 2, 9);

  ctx.fillStyle = "#FBF8F1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx + w / 2 + 1, by + 5);
  ctx.restore();
}

export function PixelCatRoom({
  moods,
  previewMode,
  feedingCommand,
  pokeCommand,
  onCatTapped,
  onEatingFinished,
}: PixelCatRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store latest props in refs so the 60fps animation loop stays rock-solid without resetting cat positions
  const moodsRef = useRef(moods);
  const previewRef = useRef(previewMode);
  const onCatTappedRef = useRef(onCatTapped);
  const onEatingFinishedRef = useRef(onEatingFinished);

  moodsRef.current = moods;
  previewRef.current = previewMode;
  onCatTappedRef.current = onCatTapped;
  onEatingFinishedRef.current = onEatingFinished;

  const actorsRef = useRef<Record<CatId, CatActor>>({
    verdi: {
      id: "verdi",
      x: 56,
      y: 102,
      targetX: 88,
      targetY: 96,
      facing: "right",
      mode: "walk",
      modeUntil: 0,
      animTime: 0,
      speech: null,
      speechUntil: 0,
      shakeUntil: 0,
      activeCanId: null,
      onMatOrBowl: false,
    },
    porcini: {
      id: "porcini",
      x: 146,
      y: 92,
      targetX: 118,
      targetY: 88,
      facing: "left",
      mode: "sit",
      modeUntil: Date.now() + 2200,
      animTime: 0,
      speech: null,
      speechUntil: 0,
      shakeUntil: 0,
      activeCanId: null,
      onMatOrBowl: true,
    },
  });

  const particlesRef = useRef<Particle[]>([]);
  const lastFeedIdRef = useRef<number>(0);
  const lastPokeIdRef = useRef<number>(0);
  const lastSocialCheckRef = useRef<number>(0);

  const isCatUnhappy = (catId: CatId): boolean => {
    if (previewRef.current === "unhappy") return true;
    if (previewRef.current === "happy") return false;
    const m = moodsRef.current[catId];
    return m === "angry" || m === "hungry";
  };

  const spawnHearts = (x: number, y: number, count = 4) => {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + randRange(-10, 10),
        y: y - randRange(12, 20),
        vx: randRange(-6, 6),
        vy: randRange(-14, -9),
        kind: "heart",
        bornAt: now + i * 90,
        lifeMs: 1100 + Math.random() * 400,
        color: i % 2 === 0 ? "#C86753" : "#DF9B92",
      });
    }
  };

  const spawnHissSparks = (x: number, y: number, facing: "left" | "right") => {
    const now = performance.now();
    const dir = facing === "right" ? 1 : -1;
    for (let i = 0; i < 6; i++) {
      particlesRef.current.push({
        x: x + dir * randRange(6, 14),
        y: y - randRange(8, 18),
        vx: dir * randRange(12, 24),
        vy: randRange(-10, 6),
        kind: "hiss",
        bornAt: now + i * 60,
        lifeMs: 550 + Math.random() * 250,
        color: i % 2 === 0 ? "#B95240" : "#F4ECD8",
      });
    }
  };

  const triggerCatInteraction = (catId: CatId) => {
    const actor = actorsRef.current[catId];
    if (!actor || actor.mode === "eat" || actor.mode === "goto-bowl") return;

    const now = performance.now();
    if (isCatUnhappy(catId)) {
      actor.mode = "hiss";
      actor.modeUntil = now + 3000;
      actor.shakeUntil = now + 700;
      actor.speech = catId === "verdi" ? "HISS!! 嘶!" : "嘶——! 罐頭!";
      actor.speechUntil = now + 2600;
      spawnHissSparks(actor.x, actor.y, actor.facing);
      onCatTappedRef.current(catId, "hiss");
    } else {
      actor.mode = "belly-up";
      actor.modeUntil = now + 4500;
      actor.speech = catId === "verdi" ? "purr~ ♥" : "呼嚕嚕 ♥";
      actor.speechUntil = now + 2800;
      spawnHearts(actor.x, actor.y, 5);
      onCatTappedRef.current(catId, "belly-up");
    }
  };

  // React to preview mode switches immediately so users can visually see happy vs unhappy right away
  useEffect(() => {
    const now = performance.now();
    (["verdi", "porcini"] as CatId[]).forEach((id) => {
      const a = actorsRef.current[id];
      if (a.mode === "eat" || a.mode === "goto-bowl") return;
      if (previewMode === "happy") {
        a.mode = "belly-up";
        a.modeUntil = now + 6000;
        a.speech = id === "verdi" ? "purr~ ♥" : "摸肚肚~";
        a.speechUntil = now + 2400;
        spawnHearts(a.x, a.y, 3);
      } else if (previewMode === "unhappy") {
        a.mode = "hiss";
        a.modeUntil = now + 6000;
        a.shakeUntil = now + 500;
        a.speech = id === "verdi" ? "HISS!!" : "嘶——!";
        a.speechUntil = now + 2400;
        spawnHissSparks(a.x, a.y, a.facing);
      } else {
        // Return gently to autonomous strolling
        a.mode = "walk";
        a.targetX = id === "verdi" ? 68 : 132;
        a.targetY = id === "verdi" ? 100 : 92;
        a.speech = null;
      }
    });
  }, [previewMode]);

  // React to feeding command: chosen cat trots over to the twin food bowl and eats!
  useEffect(() => {
    if (!feedingCommand || feedingCommand.id === lastFeedIdRef.current) return;
    lastFeedIdRef.current = feedingCommand.id;

    const actor = actorsRef.current[feedingCommand.catId];
    actor.mode = "goto-bowl";
    actor.targetX = BOWL_EAT_POS.x;
    actor.targetY = BOWL_EAT_POS.y;
    actor.activeCanId = feedingCommand.canId;
    actor.speech = "開罐頭!!";
    actor.speechUntil = performance.now() + 1800;
  }, [feedingCommand]);

  // React to external poke button (from status cards below)
  useEffect(() => {
    if (!pokeCommand || pokeCommand.id === lastPokeIdRef.current) return;
    lastPokeIdRef.current = pokeCommand.id;
    triggerCatInteraction(pokeCommand.catId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeCommand]);

  // Main 60fps simulation & pixel rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();

    const pickNextAutonomousAction = (actor: CatActor, now: number) => {
      const unhappy = isCatUnhappy(actor.id);
      const liveMood = moodsRef.current[actor.id];

      // If in post-can happy window (live mode), bias strongly toward rolling belly-up!
      if (previewRef.current === "live" && liveMood === "belly-up" && Math.random() < 0.55) {
        actor.mode = "belly-up";
        actor.modeUntil = now + randRange(3600, 5600);
        actor.speech = "purr~ ♥";
        actor.speechUntil = now + 2200;
        spawnHearts(actor.x, actor.y, 2);
        return;
      }

      // If unhappy, pace near the empty food bowls and grumble
      if (unhappy && Math.random() < 0.55) {
        actor.mode = "walk";
        actor.targetX = randRange(36, 86);
        actor.targetY = randRange(72, 92);
        actor.speech = Math.random() < 0.5 ? "餓..." : "罐頭?";
        actor.speechUntil = now + 2000;
        return;
      }

      const roll = Math.random();
      if (roll < 0.52) {
        // Stroll to a cozy room spot (or cardboard bowl / purple yoga mat!)
        actor.mode = "walk";
        const destRoll = Math.random();
        if (destRoll < 0.24) {
          actor.targetX = SCRATCHER_POS.x + randRange(-5, 5);
          actor.targetY = SCRATCHER_POS.y + randRange(-3, 3);
        } else if (destRoll < 0.48) {
          actor.targetX = YOGA_MAT_POS.x + randRange(-14, 14);
          actor.targetY = YOGA_MAT_POS.y + randRange(-6, 6);
        } else {
          actor.targetX = randRange(FLOOR_MIN_X + 6, FLOOR_MAX_X - 6);
          actor.targetY = randRange(FLOOR_MIN_Y + 4, FLOOR_MAX_Y - 4);
        }
      } else if (roll < 0.8) {
        actor.mode = "sit";
        actor.modeUntil = now + randRange(2400, 4400);
      } else {
        actor.mode = "loaf";
        actor.modeUntil = now + randRange(3200, 5200);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const timeSec = now / 1000;

      const verdi = actorsRef.current.verdi;
      const porcini = actorsRef.current.porcini;
      const catList = [verdi, porcini];

      // Update both cats
      for (const actor of catList) {
        actor.animTime += dt;

        if (actor.mode === "goto-bowl") {
          const dx = actor.targetX - actor.x;
          const dy = actor.targetY - actor.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dx) > 1) actor.facing = dx >= 0 ? "right" : "left";

          if (dist < 2.2) {
            actor.x = actor.targetX;
            actor.y = actor.targetY;
            actor.facing = "left"; // face the pixel tin can & bowls
            actor.mode = "eat";
            actor.modeUntil = now + 2400;
            actor.speech = "nom nom~";
            actor.speechUntil = now + 2200;
            spawnHearts(actor.x, actor.y, 2);
          } else {
            const speed = 52; // eager trot toward food!
            actor.x += (dx / dist) * speed * dt;
            actor.y += (dy / dist) * speed * dt;
          }
        } else if (actor.mode === "eat") {
          // Spawn cute pixel food crumbs periodically
          if (Math.random() < dt * 4) {
            particlesRef.current.push({
              x: CAN_SPOT.x + randRange(-2, 3),
              y: CAN_SPOT.y - 4,
              vx: randRange(-8, 8),
              vy: randRange(-12, -5),
              kind: "crumb",
              bornAt: now,
              lifeMs: 420,
              color: "#C97A57",
            });
          }
          if (now >= actor.modeUntil) {
            actor.activeCanId = null;
            actor.mode = "belly-up";
            actor.modeUntil = now + 5200;
            actor.speech = "好幸福~ ♥";
            actor.speechUntil = now + 2600;
            spawnHearts(actor.x, actor.y, 6);
            onEatingFinishedRef.current(actor.id);
          }
        } else if (actor.mode === "walk") {
          const dx = actor.targetX - actor.x;
          const dy = actor.targetY - actor.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dx) > 1) actor.facing = dx >= 0 ? "right" : "left";

          if (dist < 2) {
            actor.x = actor.targetX;
            actor.y = actor.targetY;
            // If arrived on scratcher bowl or yoga mat, often loaf or belly-up!
            const nearScratcher =
              Math.hypot(actor.x - SCRATCHER_POS.x, actor.y - SCRATCHER_POS.y) < 12;
            const nearYogaMat =
              Math.hypot(actor.x - YOGA_MAT_POS.x, actor.y - YOGA_MAT_POS.y) < 18;
            if (nearScratcher) {
              actor.mode = "loaf";
              actor.modeUntil = now + randRange(3800, 5800);
            } else if (
              nearYogaMat &&
              !isCatUnhappy(actor.id) &&
              Math.random() < 0.5
            ) {
              actor.mode = "belly-up";
              actor.modeUntil = now + randRange(3200, 4800);
              actor.speech = "purr~";
              actor.speechUntil = now + 1800;
            } else {
              actor.mode = "sit";
              actor.modeUntil = now + randRange(2000, 3800);
            }
          } else {
            const speed = isCatUnhappy(actor.id) ? 30 : 22;
            actor.x += (dx / dist) * speed * dt;
            actor.y += (dy / dist) * speed * dt;
          }
        } else {
          // Sitting, loafing, belly-up, or hissing
          if (actor.mode === "loaf" && Math.random() < dt * 0.9) {
            particlesRef.current.push({
              x: actor.x + (actor.facing === "right" ? 7 : -7),
              y: actor.y - 12,
              vx: 2,
              vy: -6,
              kind: "zzz",
              bornAt: now,
              lifeMs: 1400,
              color: "#6B6456",
            });
          } else if (actor.mode === "belly-up" && Math.random() < dt * 1.4) {
            particlesRef.current.push({
              x: actor.x + randRange(-8, 8),
              y: actor.y - 14,
              vx: randRange(-3, 3),
              vy: -9,
              kind: "heart",
              bornAt: now,
              lifeMs: 950,
              color: "#C86753",
            });
          } else if (actor.mode === "hiss" && Math.random() < dt * 2.5) {
            const dir = actor.facing === "right" ? 1 : -1;
            particlesRef.current.push({
              x: actor.x + dir * 10,
              y: actor.y - 12,
              vx: dir * 16,
              vy: randRange(-6, 4),
              kind: "hiss",
              bornAt: now,
              lifeMs: 420,
              color: "#B95240",
            });
          }

          if (now >= actor.modeUntil) {
            pickNextAutonomousAction(actor, now);
          }
        }

        // Clamp within walkable room
        actor.x = clamp(actor.x, FLOOR_MIN_X, FLOOR_MAX_X);
        actor.y = clamp(actor.y, FLOOR_MIN_Y, FLOOR_MAX_Y);
      }

      // Cute cat-to-cat social nose-boop when they pass close to each other!
      if (now - lastSocialCheckRef.current > 8000) {
        const pairDist = Math.hypot(verdi.x - porcini.x, verdi.y - porcini.y);
        if (
          pairDist < 24 &&
          verdi.mode === "walk" &&
          porcini.mode === "walk" &&
          !isCatUnhappy("verdi") &&
          !isCatUnhappy("porcini")
        ) {
          lastSocialCheckRef.current = now;
          verdi.mode = "sit";
          porcini.mode = "sit";
          verdi.modeUntil = now + 2200;
          porcini.modeUntil = now + 2200;
          verdi.facing = verdi.x <= porcini.x ? "right" : "left";
          porcini.facing = porcini.x < verdi.x ? "right" : "left";
          verdi.speech = "喵~";
          verdi.speechUntil = now + 1600;
          particlesRef.current.push({
            x: (verdi.x + porcini.x) / 2,
            y: Math.min(verdi.y, porcini.y) - 18,
            vx: 0,
            vy: -7,
            kind: "heart",
            bornAt: now,
            lifeMs: 1200,
            color: "#D98A68",
          });
        }
      }

      // ==================== RENDER PIXEL SCENE ====================
      ctx.save();
      ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
      ctx.imageSmoothingEnabled = false;

      drawPixelRoomBackground(ctx, timeSec);

      // Draw pixel tin can at bowl if either cat is heading to bowl or eating
      const activeCanActor = catList.find((a) => a.activeCanId !== null);
      if (activeCanActor && activeCanActor.activeCanId) {
        drawPixelCan(ctx, CAN_SPOT.x, CAN_SPOT.y, activeCanActor.activeCanId);
      }

      // Depth-sort cats by Y coordinate so the lower cat renders in front
      const sortedCats = [...catList].sort((a, b) => a.y - b.y);
      for (const actor of sortedCats) {
        const anim: PixelAnimState =
          actor.mode === "goto-bowl" ? "walk" : actor.mode;

        const fps =
          anim === "walk"
            ? actor.mode === "goto-bowl"
              ? 10
              : 6
            : anim === "eat"
            ? 5
            : anim === "belly-up"
            ? 3.5
            : anim === "hiss"
            ? 6
            : 1.8;

        const frameIdx = Math.floor(actor.animTime * fps);
        const shakeX =
          now < actor.shakeUntil ? (Math.floor(now / 45) % 2 === 0 ? -1 : 1) : 0;

        drawPixelCat(
          ctx,
          actor.id,
          anim,
          frameIdx,
          actor.x + shakeX,
          actor.y,
          actor.facing,
          1
        );

        // Nameplate pill under feet
        drawNameplate(
          ctx,
          actor.x,
          actor.y,
          actor.id === "verdi" ? "Verdi" : "牛肝菌",
          actor.id === "verdi" ? "#D58C4A" : "#CE7A3A"
        );

        // Speech bubble above head
        if (actor.speech && now < actor.speechUntil) {
          drawSpeechBubble(
            ctx,
            actor.x,
            actor.y - 21,
            actor.speech,
            actor.mode === "hiss" || isCatUnhappy(actor.id)
          );
        }
      }

      // Render & prune particles
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        const age = now - p.bornAt;
        if (age < 0) {
          alive.push(p);
          continue;
        }
        if (age >= p.lifeMs) continue;
        alive.push(p);

        const t = age / p.lifeMs;
        const px = Math.round(p.x + p.vx * (age / 1000));
        const py = Math.round(p.y + p.vy * (age / 1000));

        ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
        if (p.kind === "heart") {
          drawPixelHeart(ctx, px, py, p.color);
        } else if (p.kind === "hiss") {
          // Jagged pixel hiss spark
          ctx.fillStyle = p.color;
          ctx.fillRect(px, py, 3, 1);
          ctx.fillRect(px + 2, py - 1, 2, 1);
          ctx.fillRect(px + 1, py + 1, 2, 1);
        } else if (p.kind === "zzz") {
          ctx.fillStyle = p.color;
          ctx.font = "bold 6px monospace";
          ctx.fillText("z", px, py);
        } else if (p.kind === "crumb") {
          ctx.fillStyle = p.color;
          ctx.fillRect(px, py, 2, 2);
        } else if (p.kind === "tap") {
          const rad = Math.round(2 + t * 6);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(px - rad, py - Math.round(rad / 2), rad * 2, rad);
        }
        ctx.globalAlpha = 1;
      }
      particlesRef.current = alive;

      ctx.restore();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tapX = ((e.clientX - rect.left) / rect.width) * LOGICAL_W;
    const tapY = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;

    // Check front-most cat first with generous touch hitbox
    const sortedFrontFirst = [
      actorsRef.current.verdi,
      actorsRef.current.porcini,
    ].sort((a, b) => b.y - a.y);

    for (const actor of sortedFrontFirst) {
      const hitX = Math.abs(tapX - actor.x) <= 18;
      const hitY = tapY >= actor.y - 26 && tapY <= actor.y + 8;
      if (hitX && hitY) {
        triggerCatInteraction(actor.id);
        return;
      }
    }

    // Otherwise tapped empty floor: spawn ripple & call the nearest free cat over!
    const destX = clamp(tapX, FLOOR_MIN_X + 4, FLOOR_MAX_X - 4);
    const destY = clamp(tapY, FLOOR_MIN_Y + 2, FLOOR_MAX_Y - 2);
    const now = performance.now();

    particlesRef.current.push({
      x: destX,
      y: destY,
      vx: 0,
      vy: 0,
      kind: "tap",
      bornAt: now,
      lifeMs: 550,
      color: "#5E7D6A",
    });

    const freeCats = sortedFrontFirst.filter(
      (a) => a.mode !== "eat" && a.mode !== "goto-bowl" && a.mode !== "hiss"
    );
    if (freeCats.length > 0) {
      const nearest = freeCats.reduce((best, cur) =>
        Math.hypot(cur.x - destX, cur.y - destY) <
        Math.hypot(best.x - destX, best.y - destY)
          ? cur
          : best
      );
      nearest.mode = "walk";
      nearest.targetX = destX;
      nearest.targetY = destY;
      nearest.speech = "喵?";
      nearest.speechUntil = now + 1100;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[#3A322A]/85 bg-[#ECE4D3] shadow-[0_4px_0_0_#C8BEAA]">
      <canvas
        ref={canvasRef}
        width={LOGICAL_W * CANVAS_SCALE}
        height={LOGICAL_H * CANVAS_SCALE}
        onPointerDown={handleCanvasPointerDown}
        aria-label="Verdi 與牛肝菌的 2D 像素互動客廳：點擊貓咪互動，點擊空地呼喚貓咪"
        className="block w-full cursor-pointer select-none touch-manipulation"
        style={{ imageRendering: "pixelated", aspectRatio: "3 / 2" }}
      />
      <div className="flex items-center justify-between border-t border-paper-border bg-paper-card/95 px-3 py-1.5 font-mono text-[10px] text-ink-muted">
        <span>點貓咪：開心翻肚 / 不開心拱背哈氣</span>
        <span className="text-sage-dark">點地板呼喚</span>
      </div>
    </div>
  );
}
