"use client";

import type { CanId, CatId } from "./types";

export type PixelAnimState =
  | "walk"
  | "sit"
  | "loaf"
  | "eat"
  | "belly-up"
  | "hiss";

export interface CatPalette {
  K: string; // pixel outline
  W: string; // white fur (blaze, bib, belly, socks)
  B: string; // main coat
  S: string; // stripe / darker marking
  O: string; // orange / calico accent
  T: string; // tail tip
  P: string; // pink nose / ears / toe beans
  E: string; // pupil
  I: string; // iris
  H: string; // eye shine
  M: string; // muzzle / cheek marking
  R: string; // open hissing mouth red
  Z: string; // shadow / warm cream tint
}

/**
 * Color palettes sampled from the user's real photos:
 * - Verdi: Brown-gray mackerel torbie with apricot calico patches, white nose blaze, white chest bib, white socks, black tail tip, olive-hazel eyes.
 * - 牛肝菌 (Porcini): Ginger-orange tabby cap + saddle + signature ginger whisker-pads over snow-white belly/legs/blaze, honey-amber eyes, pink toe beans.
 */
export const CAT_PALETTES: Record<CatId, CatPalette> = {
  verdi: {
    K: "#221B15",
    W: "#F6F1E7",
    B: "#634E3C",
    S: "#33271E",
    O: "#C98242",
    T: "#1B1714",
    P: "#E39B93",
    E: "#171411",
    I: "#B2C8A2",
    H: "#FFFFFF",
    M: "#F6F1E7",
    R: "#C2594E",
    Z: "#A8947C",
  },
  porcini: {
    K: "#2D231C",
    W: "#FBF9F4",
    B: "#CE7A3A",
    S: "#9D5321",
    O: "#DF9251",
    T: "#B7662D",
    P: "#E59C95",
    E: "#281D14",
    I: "#8C5425",
    H: "#FFFFFF",
    M: "#C57135",
    R: "#C2594E",
    Z: "#E9DFCF",
  },
};

export const CAN_PIXEL_COLORS: Record<
  CanId,
  { body: string; label: string; lid: string; food: string }
> = {
  tuna: { body: "#5A7487", label: "#E4EBF0", lid: "#DED7C7", food: "#C97A57" },
  salmon: { body: "#B96B52", label: "#F3E3DC", lid: "#DED7C7", food: "#D98A68" },
  scallop: { body: "#BD9548", label: "#F4ECD8", lid: "#DED7C7", food: "#E4C891" },
};

type SpriteGrid = string[];

/**
 * Helper: All cat grids are 24 cols × 20 rows, facing RIGHT by default.
 * Flip horizontally when facing LEFT.
 *
 * Distinct body pattern templates for Verdi (torbie + white bib/socks + black tail tip)
 * vs Porcini (white belly/legs + ginger saddle + white forehead blaze + ginger mustache).
 */

// ============================================================================
// VERDI SPRITES (深棕虎斑三花：深棕＋橘黃雙色覆蓋雙眼，只剩嘴巴與胸口白毛、白襪、黑尾尖)
// ============================================================================

const VERDI_WALK_1: SpriteGrid = [
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KOBKKBSK...",
  "............KOBBSOBBBK..",
  "............KBHIOSHIEK..",
  "............KBOEEBOEEK..",
  "..KK........KBBWPPWBBK..",
  ".KTTK........KKWWWWKK...",
  "..KSTK..KKKKKKBWWWWK....",
  "...KBTKKBBBBOBBWWWWK....",
  "....KBBBSBBBOOBBWWK.....",
  "....KBSBBBBBBBSBWWK.....",
  "....KBBBBBSBBBBWWK......",
  ".....KOBBBBBBBWWK.......",
  ".....KBBKKKKKBBK........",
  "....KSBK....KSBK........",
  "....KWWK....KWWK........",
  ".....KK......KK.........",
  "........................",
];

const VERDI_WALK_2: SpriteGrid = [
  "........................",
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KOBKKBSK...",
  "............KOBBSOBBBK..",
  "............KBHIOSHIEK..",
  ".KK.........KBOEEBOEEK..",
  "KTTK........KBBWPPWBBK..",
  ".KSTK..KKKKKKKWWWWKK....",
  "..KBTKKBBBBOBBBWWWWK....",
  "...KBBBSBBBOOBBWWWWK....",
  "....KBSBBBBBBBSBWWK.....",
  "....KBBBBBSBBBBWWK......",
  ".....KOBBBBBBBWWK.......",
  ".....KBBKKKKKBBK........",
  ".....KBK....KBK.........",
  ".....KWK....KWK.........",
  "......K......K..........",
  "........................",
];

const VERDI_WALK_3: SpriteGrid = [
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KOBKKBSK...",
  "............KOBBSOBBBK..",
  "............KBHIOSHIEK..",
  "............KBOEEBOEEK..",
  "...KK.......KBBWPPWBBK..",
  "..KTTK.......KKWWWWKK...",
  "...KSTK.KKKKKKBWWWWK....",
  "....KBTKBBBBOBBWWWWK....",
  "....KBBBSBBBOOBBWWK.....",
  "....KBSBBBBBBBSBWWK.....",
  "....KBBBBBSBBBBWWK......",
  ".....KOBBBBBBBWWK.......",
  "......KBBKKKBBK.........",
  ".....KSBK..KSBK.........",
  "....KWWK....KWWK........",
  ".....KK......KK.........",
  "........................",
];

const VERDI_WALK_4: SpriteGrid = [
  "........................",
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KOBKKBSK...",
  "............KOBBSOBBBK..",
  "............KBHIOSHIEK..",
  "..KK........KBOEEBOEEK..",
  ".KTTK.......KBBWPPWBBK..",
  "..KSTK.KKKKKKKWWWWKK....",
  "...KBTKBBBBOBBBWWWWK....",
  "...KBBBSBBBOOBBWWWWK....",
  "....KBSBBBBBBBSBWWK.....",
  "....KBBBBBSBBBBWWK......",
  ".....KOBBBBBBBWWK.......",
  ".....KBBKKKKKBBK........",
  "......KBK..KBK..........",
  "......KWK..KWK..........",
  ".......K....K...........",
  "........................",
];

const VERDI_SIT_1: SpriteGrid = [
  "........................",
  "........KK.....KK.......",
  ".......KPKK...KKPK......",
  ".......KOBKKKKKBSK......",
  "......KOBBSBOBBSBBK.....",
  "......KOBBBOOBBBBBK.....",
  "......KBHEBOBBBOHEBK....",
  "......KBIISBBBBBSIIK....",
  "......KBBBWWWPWWWBBK....",
  ".......KKBWWWWWWBKK.....",
  ".......KBWWWWWWBK.......",
  "......KOBBWWWWBBSK......",
  "......KBBBWWWWBBBK......",
  ".....KSBBBWWWWBBBK..KK..",
  ".....KBBBBWWWWBBBK.KTTK.",
  ".....KOBBBWWWWBBBK.KSTK.",
  ".....KBSBKWWWWKBSK.KBTK.",
  ".....KWWWKWWWWKWWKKBBK..",
  "......KKKKKKKKKKKKKK....",
  "........................",
];

const VERDI_SIT_2: SpriteGrid = [
  "........................",
  "........................",
  "........KK.....KK.......",
  ".......KPKK...KKPK......",
  ".......KOBKKKKKBSK......",
  "......KOBBSBOBBSBBK.....",
  "......KOBBBOOBBBBBK.....",
  "......KBSKKOBBBKKSBK....",
  "......KBBBOOBBBBBBBK....",
  "......KBBBWWWPWWWBBK....",
  ".......KKBWWWWWWBKK.....",
  ".......KBWWWWWWBK.......",
  "......KOBBWWWWBBSK......",
  "......KBBBWWWWBBBK...KK.",
  ".....KSBBBWWWWBBBK..KTTK",
  ".....KBBBBWWWWBBBK..KSTK",
  ".....KOBBBWWWWBBBK.KBTK.",
  ".....KWWWKWWWWKWWKKBBK..",
  "......KKKKKKKKKKKKKK....",
  "........................",
];

const VERDI_LOAF_1: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "............KK...KK.....",
  "...........KPKK.KPK.....",
  ".....KKKKKKOBBKKBSK.....",
  "...KKBBBBOBOBBOBBBBK....",
  "..KBBBSBBBOOBKKOBKKBK...",
  ".KSBBBBBBBBBBBBOBBBBK...",
  ".KOBBBBBBSBBBBWWPWWBK...",
  ".KBBBBBSBBBBBWWWWWWK....",
  ".KTTKSTKBOBBBWWWWWWK....",
  "..KKKKKKKKKKKKKKKKK.....",
  "........................",
  "........................",
  "........................",
  "........................",
];

const VERDI_LOAF_2: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "............KK...KK.....",
  ".....KKKKKKKPKK.KPK.....",
  "...KKBBBBOBOBBKKBSK.....",
  "..KBBBSBBBOOBBOBBBBK....",
  ".KSBBBBBBBBBBKKOBKKBK...",
  ".KOBBBBBBSBBBBBOBBBBK...",
  ".KBBBBBSBBBBBBWWPWWBK...",
  ".KTTKSTKBOBBBWWWWWWK....",
  "..KKKKKKKKKKKKKKKKK.....",
  "........................",
  "........................",
  "........................",
  "........................",
];

const VERDI_EAT_1: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "..KK....................",
  ".KTTK...KKKKKK..........",
  "..KSTK.KBBBBOBKK...KK...",
  "...KBTKBSBBBOOBPK.KPK...",
  "....KBBBBBSBBBBOBKBSK...",
  "....KBSBBBBBBBBOBOBBBK..",
  "....KOBBBBBBBBSKKOBKKK..",
  ".....KBBBBBBBWWBBOBBBK..",
  ".....KBBKKKKKWWBWPWBBK..",
  ".....KSBK...KWWKWWWWK...",
  ".....KWWK...KWWK.KKK....",
  "......KK.....KK.........",
  "........................",
  "........................",
  "........................",
];

const VERDI_EAT_2: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "...KK...................",
  "..KTTK..KKKKKK..........",
  "...KSTKKBBBBOBK.........",
  "...KBTKBSBBBOOBKK..KK...",
  "....KBBBBBSBBBBPK.KPK...",
  "....KBSBBBBBBBBOBKBSK...",
  "....KOBBBBBBBBSOBOBBBK..",
  ".....KBBBBBBBWWKKOBKKK..",
  ".....KBBKKKKKWWBBOBBBK..",
  ".....KSBK...KWWBWPWBBK..",
  ".....KWWK...KWWKWWWWK...",
  "......KK.....KK..KKK....",
  "........................",
  "........................",
  "........................",
];

// HAPPY BELLY-UP (翻肚撒嬌！雙色毛覆蓋雙眼，只剩嘴巴與肚皮白色、粉紅肉球)
const VERDI_BELLY_1: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  ".....KK..KK.............",
  "....KPKKKPK....KK..KK...",
  "...KOBBKKBSK..KWWKKWWK..",
  "...KOBBOBBBBK.KPKKKPK...",
  "..KBKKOBBBKKBK.KK..KK...",
  "..KBBBOOBBBBBKKWWWWKK...",
  "..KBBBWWPWWKKWWWWWWBK...",
  "...KKWWWWWWBWWWWWWOBK.KK",
  "....KBBBBWWWWWWWWWBBKKTK",
  "....KOBBBWWWWWWWWBSBKSTK",
  ".....KBSBWWWWWWWBBBBKBTK",
  "......KKBBBBBBBBBSBKKBK.",
  "........KKKKKKKKKKKKKK..",
  "........................",
  "........................",
  "........................",
];

const VERDI_BELLY_2: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "...............KK..KK...",
  ".....KK..KK...KWWKKWWK..",
  "....KPKKKPK...KPKKKPK...",
  "...KOBBKKBSK...KK..KK...",
  "...KOBBOBBBBK..KKKKKK...",
  "..KBKKOBBBKKBKKWWWWWWK..",
  "..KBBBOOBBBBBKWWWWWWBK..",
  "..KBBBWWPWWKKWWWWWWOBKKK",
  "...KKWWWWWWBWWWWWWBBKKTK",
  "....KBBBBWWWWWWWWWBSKSTK",
  "....KOBBBWWWWWWWWBBBKBTK",
  ".....KBSBWWWWWWWBBBBKBK.",
  "......KKBBBBBBBBBSBKKK..",
  "........KKKKKKKKKKKK....",
  "........................",
  "........................",
  "........................",
];

const VERDI_BELLY_3: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "......KK..KK....KK..KK..",
  ".....KPKKKPK...KWWKKWWK.",
  "....KOBBKKBSK..KPKKKPK..",
  "....KOBBOBBBBK..KK..KK..",
  "...KBKKOBBBKKBKKWWWWKK..",
  "...KBBBOOBBBBBKWWWWWWK..",
  "...KBBBWWPWWKKWWWWWWBK..",
  "....KKWWWWWWBWWWWWWOBKKK",
  ".....KBBBBWWWWWWWWBBKKTK",
  ".....KOBBBWWWWWWWBSBKSTK",
  "......KBSBWWWWWWBBBBKBTK",
  ".......KKBBBBBBBBSBKKBK.",
  ".........KKKKKKKKKKKKK..",
  "........................",
  "........................",
  "........................",
];

// ANGRY ARCHED BACK & HISSING (不開心拱背炸毛、飛機耳、雙色臉覆蓋眼周、張嘴哈氣！)
const VERDI_HISS_1: SpriteGrid = [
  "......KK................",
  ".....KTTK...KKKKK.......",
  "....KSTTK.KKBSBBOK......",
  "....KBTK.KOBBSBBBBK.....",
  "....KBTKKBBBBBSBBOBK....",
  "....KBBKBSBBBBBBBBBK....",
  ".....KBKOBBBSBBBBKK.....",
  ".....KBBBBBBKKKKBKK.....",
  ".....KBBBBKK..KKOBKKK...",
  ".....KSBBK..KKOBBOBBSKK.",
  ".....KBBK..KOBKEKBBEKOBK",
  ".....KBBK..KBBIIBBBBIIBK",
  ".....KBBK...KBBWRRWBBK..",
  ".....KSBK....KKWRRWKK...",
  "....KSBBK.....KWWWWK....",
  "....KWWK......KBBKK.....",
  "....KWWK......KSBK......",
  ".....KK.......KWWK......",
  "...............KK.......",
  "........................",
];

const VERDI_HISS_2: SpriteGrid = [
  ".....KK.................",
  "....KTTK....KKKKK.......",
  "...KSTTK..KKBSBBOK......",
  "....KBTK.KOBBSBBBBK.....",
  "....KBTKKBBBBBSBBOBK....",
  "....KBBKBSBBBBBBBBBK....",
  ".....KBKOBBBSBBBBKK.....",
  ".....KBBBBBBKKKKBKK.....",
  ".....KBBBBKK..KKOBKKK...",
  ".....KSBBK..KKOBBOBBSKK.",
  ".....KBBK..KOBKEKBBEKOBK",
  ".....KBBK..KBBIIBBBBIIBK",
  ".....KBBK...KBBWRRWBBK..",
  ".....KSBK....KKRRRRKK...",
  "....KSBBK.....KWWWWK....",
  "....KWWK......KBBKK.....",
  "....KWWK......KSBK......",
  ".....KK.......KWWK......",
  "...............KK.......",
  "........................",
];

// ============================================================================
// 牛肝菌 PORCINI SPRITES (白底橘貓：橘帽＋白鼻樑倒V＋橘色小鬍子＋全白胸肚腿＋橘背鞍)
// ============================================================================

const PORCINI_WALK_1: SpriteGrid = [
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KBBKKBSK...",
  "............KBBBWWBBBK..",
  "............KBSIWWISBK..",
  "............KBWWWWWMBK..",
  "..KK........KWWMPPMWWK..",
  ".KTTK........KKWWWWKK...",
  "..KSTK..KKKKKKWWWWWKK...",
  "...KBTKKBBBSBWWBWWWWK...",
  "....KBBBSBBBBWWBBWWK....",
  "....KBBBBBBBWWWWWWWK....",
  "....KWWBBBBWWWWWWWWK....",
  ".....KWWWWWWWWWWWWK.....",
  ".....KWWKKKKKWWK........",
  "....KWWK....KWWK........",
  "....KWWK....KWWK........",
  ".....KK......KK.........",
  "........................",
];

const PORCINI_WALK_2: SpriteGrid = [
  "........................",
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KBBKKBSK...",
  "............KBBBWWBBBK..",
  "............KBSIWWISBK..",
  ".KK.........KBWWWWWMBK..",
  "KTTK........KWWMPPMWWK..",
  ".KSTK..KKKKKKKWWWWKK....",
  "..KBTKKBBBSBWWWBWWWWK...",
  "...KBBBSBBBBWWBBWWWWK...",
  "....KBBBBBBBWWWWWWWK....",
  "....KWWBBBBWWWWWWWWK....",
  ".....KWWWWWWWWWWWWK.....",
  ".....KWWKKKKKWWK........",
  ".....KWK....KWK.........",
  ".....KWK....KWK.........",
  "......K......K..........",
  "........................",
];

const PORCINI_WALK_3: SpriteGrid = [
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KBBKKBSK...",
  "............KBBBWWBBBK..",
  "............KBSIWWISBK..",
  "............KBWWWWWMBK..",
  "...KK.......KWWMPPMWWK..",
  "..KTTK.......KKWWWWKK...",
  "...KSTK.KKKKKKWWWWWKK...",
  "....KBTKBBBSBWWBWWWWK...",
  "....KBBBSBBBBWWBBWWK....",
  "....KBBBBBBBWWWWWWWK....",
  "....KWWBBBBWWWWWWWWK....",
  ".....KWWWWWWWWWWWWK.....",
  "......KWWKKKWWK.........",
  ".....KWWK..KWWK.........",
  "....KWWK....KWWK........",
  ".....KK......KK.........",
  "........................",
];

const PORCINI_WALK_4: SpriteGrid = [
  "........................",
  "........................",
  "..............KK...KK...",
  ".............KPKK.KPK...",
  ".............KBBKKBSK...",
  "............KBBBWWBBBK..",
  "............KBSIWWISBK..",
  "..KK........KBWWWWWMBK..",
  ".KTTK.......KWWMPPMWWK..",
  "..KSTK.KKKKKKKWWWWKK....",
  "...KBTKBBBSBWWWBWWWWK...",
  "...KBBBSBBBBWWBBWWWWK...",
  "....KBBBBBBBWWWWWWWK....",
  "....KWWBBBBWWWWWWWWK....",
  ".....KWWWWWWWWWWWWK.....",
  ".....KWWKKKKKWWK........",
  "......KWK..KWK..........",
  "......KWK..KWK..........",
  ".......K....K...........",
  "........................",
];

const PORCINI_SIT_1: SpriteGrid = [
  "........................",
  "........KK.....KK.......",
  ".......KPKK...KKPK......",
  ".......KBBKKKKKBSK......",
  "......KBBBSBWWBSBBK.....",
  "......KBBBWWWWWWBBK.....",
  "......KBSIEWWWWEISBK....",
  "......KBWWWWWWWWWWBK....",
  "......KWWMMWPWMMWWK.....",
  ".......KKWWWWWWWKK......",
  ".......KWWWWWWWWK.......",
  "......KBBWWWWWWBBK......",
  "......KBBWWWWWWBBK......",
  ".....KBBBWWWWWWBBBK.KK..",
  ".....KWWWWWWWWWWWWKKTTK.",
  ".....KWWWWWWWWWWWWKKSTK.",
  ".....KWWWKWWWWKWWWK.KBTK",
  ".....KWWWKWWWWKWWWKKBBK.",
  "......KKKKKKKKKKKKKK....",
  "........................",
];

const PORCINI_SIT_2: SpriteGrid = [
  "........................",
  "........................",
  "........KK.....KK.......",
  ".......KPKK...KKPK......",
  ".......KBBKKKKKBSK......",
  "......KBBBSBWWBSBBK.....",
  "......KBBBWWWWWWBBK.....",
  "......KBSKKWWWWKKSBK....",
  "......KBWWWWWWWWWWBK....",
  "......KWWMMWPWMMWWK.....",
  ".......KKWWWWWWWKK......",
  ".......KWWWWWWWWK.......",
  "......KBBWWWWWWBBK......",
  "......KBBWWWWWWBBK...KK.",
  ".....KBBBWWWWWWBBBK.KTTK",
  ".....KWWWWWWWWWWWWK.KSTK",
  ".....KWWWWWWWWWWWWKKBTK.",
  ".....KWWWKWWWWKWWWKKBBK.",
  "......KKKKKKKKKKKKKK....",
  "........................",
];

const PORCINI_LOAF_1: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "............KK...KK.....",
  "...........KPKK.KPK.....",
  ".....KKKKKKBBBKKBSK.....",
  "...KKBBBSBBWWBWWBBBK....",
  "..KBBBSBBBBWWKKWWKKBK...",
  ".KBBBBBBBBWWWWWWWWWBK...",
  ".KWWBBBBBWWWWMMWPWMMK...",
  ".KWWWWWWWWWWWMWWWWWK....",
  ".KTTKSTKBWWWWWWWWWWK....",
  "..KKKKKKKKKKKKKKKKK.....",
  "........................",
  "........................",
  "........................",
  "........................",
];

const PORCINI_LOAF_2: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "............KK...KK.....",
  ".....KKKKKKKPKK.KPK.....",
  "...KKBBBSBBBBKKKBSK.....",
  "..KBBBSBBBBWWBWWBBBK....",
  ".KBBBBBBBBWWWKKWWKKBK...",
  ".KWWBBBBBWWWWWWWWWWBK...",
  ".KWWWWWWWWWWWMMWPWMMK...",
  ".KTTKSTKBWWWWWWWWWWK....",
  "..KKKKKKKKKKKKKKKKK.....",
  "........................",
  "........................",
  "........................",
  "........................",
];

const PORCINI_EAT_1: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "..KK....................",
  ".KTTK...KKKKKK..........",
  "..KSTK.KBBBSBWKK...KK...",
  "...KBTKBSBBBBWWPK.KPK...",
  "....KBBBBBBBWWWBBKBSK...",
  "....KWWBBBBWWWWBBWWBBK..",
  "....KWWWWWWWWWWKKWWKKK..",
  ".....KWWWWWWWWWMWWWMWK..",
  ".....KWWKKKKKWWMWPWMWK..",
  ".....KWWK...KWWKWWWWK...",
  ".....KWWK...KWWK.KKK....",
  "......KK.....KK.........",
  "........................",
  "........................",
  "........................",
];

const PORCINI_EAT_2: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "...KK...................",
  "..KTTK..KKKKKK..........",
  "...KSTKKBBBSBWK.........",
  "...KBTKBSBBBBWWKK..KK...",
  "....KBBBBBBBWWWPK.KPK...",
  "....KWWBBBBWWWWBBKBSK...",
  "....KWWWWWWWWWWBBWWBBK..",
  ".....KWWWWWWWWWKKWWKKK..",
  ".....KWWKKKKKWWMWWWMWK..",
  ".....KWWK...KWWMWPWMWK..",
  ".....KWWK...KWWKWWWWK...",
  "......KK.....KK..KKK....",
  "........................",
  "........................",
  "........................",
];

// HAPPY BELLY-UP (牛肝菌超經典白肚皮＋粉紅肉球翻肚撒嬌！)
const PORCINI_BELLY_1: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  ".....KK..KK.............",
  "....KPKKKPK....KK..KK...",
  "...KBBBKKBSK..KWWKKWWK..",
  "...KBBBWWBBBK.KPKKKPK...",
  "..KBKKWWWWKKBK.KK..KK...",
  "..KWWMWWWWMWWKKWWWWKK...",
  "..KWWMWPWMWKKWWWWWWWK...",
  "...KKWWWWWWWWWWWWWWBK.KK",
  "....KBBWWWWWWWWWWWWBKKTK",
  "....KBBWWWWWWWWWWWBSKSTK",
  ".....KWWWWWWWWWWBBBK.KBT",
  "......KKWWWWWWWBBBBKKBK.",
  "........KKKKKKKKKKKKKK..",
  "........................",
  "........................",
  "........................",
];

const PORCINI_BELLY_2: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "...............KK..KK...",
  ".....KK..KK...KWWKKWWK..",
  "....KPKKKPK...KPKKKPK...",
  "...KBBBKKBSK...KK..KK...",
  "...KBBBWWBBBK..KKKKKK...",
  "..KBKKWWWWKKBKKWWWWWWK..",
  "..KWWMWWWWMWWKWWWWWWWK..",
  "..KWWMWPWMWKKWWWWWWBKKTK",
  "...KKWWWWWWWWWWWWWWBKKTK",
  "....KBBWWWWWWWWWWWBSKSTK",
  "....KBBWWWWWWWWWWBBBKBTK",
  ".....KWWWWWWWWWWBBBBKBK.",
  "......KKWWWWWWWBBBBKKK..",
  "........KKKKKKKKKKKK....",
  "........................",
  "........................",
  "........................",
];

const PORCINI_BELLY_3: SpriteGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "......KK..KK....KK..KK..",
  ".....KPKKKPK...KWWKKWWK.",
  "....KBBBKKBSK..KPKKKPK..",
  "....KBBBWWBBBK..KK..KK..",
  "...KBKKWWWWKKBKKWWWWKK..",
  "...KWWMWWWWMWWKWWWWWWK..",
  "...KWWMWPWMWKKWWWWWWWK..",
  "....KKWWWWWWWWWWWWWWBKKK",
  ".....KBBWWWWWWWWWWWWBKTK",
  ".....KBBWWWWWWWWWWBSKSTK",
  "......KWWWWWWWWWWBBBKBTK",
  ".......KKWWWWWWWBBBKKBK.",
  ".........KKKKKKKKKKKKK..",
  "........................",
  "........................",
  "........................",
];

// ANGRY ARCHED BACK & HISSING (牛肝菌拱背炸毛、飛機耳、張嘴哈氣！)
const PORCINI_HISS_1: SpriteGrid = [
  "......KK................",
  ".....KTTK...KKKKK.......",
  "....KSTTK.KKBSBBBK......",
  "....KBTK.KBBBSBBBBK.....",
  "....KBTKKBBBBBBBWWBK....",
  "....KBBKBBBBBWWWWBBK....",
  ".....KBKWWWWWWWWWWKK....",
  ".....KWWWWWWKKKKBKK.....",
  ".....KWWWWKK..KKBBKKK...",
  ".....KWWWK..KKBBBWWBSKK.",
  ".....KWWK..KBBKEKWWEKBBK",
  ".....KWWK..KBWWWWWWWWBK.",
  ".....KWWK...KWWMRRMWWK..",
  ".....KWWK....KKWRRWKK...",
  "....KWWWK.....KWWWWK....",
  "....KWWK......KWWKK.....",
  "....KWWK......KWWK......",
  ".....KK.......KWWK......",
  "...............KK.......",
  "........................",
];

const PORCINI_HISS_2: SpriteGrid = [
  ".....KK.................",
  "....KTTK....KKKKK.......",
  "...KSTTK..KKBSBBBK......",
  "....KBTK.KBBBSBBBBK.....",
  "....KBTKKBBBBBBBWWBK....",
  "....KBBKBBBBBWWWWBBK....",
  ".....KBKWWWWWWWWWWKK....",
  ".....KWWWWWWKKKKBKK.....",
  ".....KWWWWKK..KKBBKKK...",
  ".....KWWWK..KKBBBWWBSKK.",
  ".....KWWK..KBBKEKWWEKBBK",
  ".....KWWK..KBWWWWWWWWBK.",
  ".....KWWK...KWWMRRMWWK..",
  ".....KWWK....KKRRRRKK...",
  "....KWWWK.....KWWWWK....",
  "....KWWK......KWWKK.....",
  "....KWWK......KWWK......",
  ".....KK.......KWWK......",
  "...............KK.......",
  "........................",
];

const SPRITE_ATLAS: Record<CatId, Record<PixelAnimState, SpriteGrid[]>> = {
  verdi: {
    walk: [VERDI_WALK_1, VERDI_WALK_2, VERDI_WALK_3, VERDI_WALK_4],
    sit: [VERDI_SIT_1, VERDI_SIT_2],
    loaf: [VERDI_LOAF_1, VERDI_LOAF_2],
    eat: [VERDI_EAT_1, VERDI_EAT_2],
    "belly-up": [VERDI_BELLY_1, VERDI_BELLY_2, VERDI_BELLY_3],
    hiss: [VERDI_HISS_1, VERDI_HISS_2],
  },
  porcini: {
    walk: [PORCINI_WALK_1, PORCINI_WALK_2, PORCINI_WALK_3, PORCINI_WALK_4],
    sit: [PORCINI_SIT_1, PORCINI_SIT_2],
    loaf: [PORCINI_LOAF_1, PORCINI_LOAF_2],
    eat: [PORCINI_EAT_1, PORCINI_EAT_2],
    "belly-up": [PORCINI_BELLY_1, PORCINI_BELLY_2, PORCINI_BELLY_3],
    hiss: [PORCINI_HISS_1, PORCINI_HISS_2],
  },
};

export function getCatSpriteGrid(
  catId: CatId,
  anim: PixelAnimState,
  frameIndex: number
): SpriteGrid {
  const frames = SPRITE_ATLAS[catId][anim];
  return frames[Math.abs(frameIndex) % frames.length];
}

/**
 * Draw a crisp pixel-art cat onto a 2D canvas context.
 * (cx, cy) is the bottom-center anchor point in logical room pixel coords.
 */
export function drawPixelCat(
  ctx: CanvasRenderingContext2D,
  catId: CatId,
  anim: PixelAnimState,
  frameIndex: number,
  cx: number,
  cy: number,
  facing: "left" | "right",
  scale = 1
) {
  const grid = getCatSpriteGrid(catId, anim, frameIndex);
  const palette = CAT_PALETTES[catId];
  const rows = grid.length;
  const cols = grid[0].length;

  const startX = Math.round(cx - (cols * scale) / 2);
  const startY = Math.round(cy - rows * scale);

  // Soft pixel ground shadow
  ctx.fillStyle = "rgba(45, 36, 26, 0.16)";
  const shadowW = anim === "belly-up" ? 18 * scale : 14 * scale;
  ctx.fillRect(
    Math.round(cx - shadowW / 2),
    Math.round(cy - 2 * scale),
    Math.round(shadowW),
    Math.round(2 * scale)
  );

  for (let r = 0; r < rows; r++) {
    const rowStr = grid[r];
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c];
      if (ch === ".") continue;
      const color = palette[ch as keyof CatPalette];
      if (!color) continue;
      const drawCol = facing === "right" ? c : cols - 1 - c;
      ctx.fillStyle = color;
      ctx.fillRect(
        startX + drawCol * scale,
        startY + r * scale,
        scale,
        scale
      );
    }
  }
}

/**
 * Draw a tiny pixel heart at logical coordinates (x, y)
 */
export function drawPixelHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color = "#C86753"
) {
  const px = Math.round(x);
  const py = Math.round(y);
  ctx.fillStyle = color;
  ctx.fillRect(px - 2, py - 2, 2, 2);
  ctx.fillRect(px + 1, py - 2, 2, 2);
  ctx.fillRect(px - 3, py - 1, 7, 2);
  ctx.fillRect(px - 2, py + 1, 5, 1);
  ctx.fillRect(px - 1, py + 2, 3, 1);
  ctx.fillRect(px, py + 3, 1, 1);
}

/**
 * Draw a pixel tin can at logical coordinates (x, y)
 */
export function drawPixelCan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  canId: CanId
) {
  const c = CAN_PIXEL_COLORS[canId];
  const px = Math.round(x);
  const py = Math.round(y);
  // Outline
  ctx.fillStyle = "#2A231D";
  ctx.fillRect(px - 5, py - 4, 10, 6);
  // Can body
  ctx.fillStyle = c.body;
  ctx.fillRect(px - 4, py - 2, 8, 3);
  // Label stripe
  ctx.fillStyle = c.label;
  ctx.fillRect(px - 3, py - 1, 6, 1);
  // Lid & tasty food mound
  ctx.fillStyle = c.lid;
  ctx.fillRect(px - 4, py - 3, 8, 1);
  ctx.fillStyle = c.food;
  ctx.fillRect(px - 3, py - 4, 6, 1);
}

// ============================================================================
// COMBINED 2-CAT WRESTLING / TUSSLE SPRITE (Verdi 虎斑三花 + 牛肝菌 橘白 扭打一團!)
// 30 cols × 22 rows, 3 rapid tumbling frames
// ============================================================================

const TUSSLE_PALETTE: Record<string, string> = {
  K: "#2A231D", // pixel outline
  C: "#F6F0E3", // bright dust cloud
  D: "#DFD5BF", // dust cloud shadow
  V: "#634E3C", // Verdi deep brown tabby
  S: "#33271E", // Verdi dark espresso stripe
  A: "#C98242", // Verdi apricot patch
  T: "#1B1714", // Verdi black tail tip
  O: "#CE7A3A", // Porcini ginger orange
  G: "#9D5321", // Porcini deep ginger stripe
  W: "#FBF9F4", // white fur & paws
  P: "#E39B93", // pink toe beans / ears
  Y: "#E2B249", // comic impact yellow star
  R: "#C85C47", // comic anger/impact terracotta
};

const TUSSLE_FRAME_1: SpriteGrid = [
  "............Y.................",
  "...........YYY........R.......",
  ".......KK...Y........RRR......",
  "......KTTK...KKKKKK...R.......",
  ".....KSTTK.KKCCOOCCKK.........",
  "......KVKKCCCOOGOOCCCK.KK.....",
  "....KKCCKVVSCCCCWWWWCCKPKK....",
  "...KCCCCVVVAVCCWWWWWWKWWWK....",
  "..KCDCCCVSVVCCCOOWWWCCKPK.....",
  ".KCCWWKCCVVCCCOOGWWCCCCKK.....",
  ".KCPWKCCVVVVCCWWWWCCCCCCK.....",
  ".KCCKKCCAVSVCCCOOWWCCCDCK.....",
  "..KCDCCCVVVVCCCCWWWCCCDCK.....",
  "..KCCCCOOGOOCCCVVSCCCCCK..Y...",
  "...KKCCCOOOCCCVVAVCCCKK..YYY..",
  "....KKCCWWWWCCCVVCCKK.....Y...",
  ".....KKKWWPKCCCCKKKK..........",
  "........KKK.KKKK..............",
  "..............................",
  "..............................",
  "..............................",
  "..............................",
];

const TUSSLE_FRAME_2: SpriteGrid = [
  "......................Y.......",
  "....R................YYY......",
  "...RRR.....KK..KK.....Y.......",
  "....R.....KPKKKPK..KKKK.......",
  ".......KKCCWWWWWCCKOOOK.......",
  ".....KKCCCOOOGOOCCCOOGK.......",
  "....KCCCCOOWWWWCCCCOOCCK......",
  "...KCDCCWWWWWWCCVVSVCCCK..KK..",
  "..KCCCCOOGWWCCCVVVAVCCCCKKTTK.",
  "..KCCKCCWWWWCCCVSVVVCCCKKSTTK.",
  "..KPKKCCCOOWWCCVVVVCCCDCKVKK..",
  "..KWWKCCCCWWCCAVSVVCCCCKK.....",
  "...KKCCCDCCCCCVVVVCCCCCK......",
  "....KCCCDCCCCVVSVVCCWWKK......",
  "...Y.KKCCCCCOOGOOCCKPKK.......",
  "..YYY..KKCCCOOOCCCCKK.........",
  "...Y....KKKKCCCCKKKK..........",
  "............KKKK..............",
  "..............................",
  "..............................",
  "..............................",
  "..............................",
];

const TUSSLE_FRAME_3: SpriteGrid = [
  "...............R..............",
  "..............RRR.............",
  "......Y........R......KK......",
  ".....YYY...KKKKKK....KTTK.....",
  "......Y..KKCCVVCCKK..KSTTK....",
  "........KCCVVVAVVCCKKKVKK.....",
  "....KK.KCCVVSVVVCCCCCK........",
  "...KPKKCCCVVVVCCCOOWWCK.......",
  "..KWWWKCCCVVCCCWWOOOGCCK......",
  "...KPKCCCDCCCCWWWWWWCCCK..Y...",
  "....KKCCCDCCCOOGWWWWCCCK.YYY..",
  "....KCCCCCCCWWWWWOOCCCCK..Y...",
  "....KCCOOCCCVVVVVCCCCDCK......",
  "....KCOOGCCCVSVAVCCCDCK.......",
  ".....KCOOCCCVVVVCCCKWK........",
  "......KKCCCCVVCCCCKPK.........",
  "........KKKKCCKKKKKK..........",
  "............KK................",
  "..............................",
  "..............................",
  "..............................",
  "..............................",
];

const TUSSLE_FRAMES: SpriteGrid[] = [
  TUSSLE_FRAME_1,
  TUSSLE_FRAME_2,
  TUSSLE_FRAME_3,
];

/**
 * Draw the animated 2-cat wrestling dust-cloud sprite (Verdi + 牛肝菌 tumbling together!).
 */
export function drawPixelTussle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frameIndex: number,
  scale = 1
) {
  const grid = TUSSLE_FRAMES[Math.abs(frameIndex) % TUSSLE_FRAMES.length];
  const rows = grid.length;
  const cols = grid[0].length;
  const startX = Math.round(cx - (cols * scale) / 2);
  const startY = Math.round(cy - (rows - 3) * scale);

  // Wide tumbling shadow
  ctx.fillStyle = "rgba(45, 36, 26, 0.2)";
  ctx.fillRect(
    Math.round(cx - 11 * scale),
    Math.round(cy - 2 * scale),
    Math.round(22 * scale),
    Math.round(3 * scale)
  );

  for (let r = 0; r < rows; r++) {
    const rowStr = grid[r];
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c];
      if (ch === ".") continue;
      const color = TUSSLE_PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
    }
  }
}
