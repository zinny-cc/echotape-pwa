"use client";

import type { CanId, CatId, CatMood } from "@/lib/types";

interface CatSpriteProps {
  catId: CatId;
  mood: CatMood;
  eatingCanId?: CanId;
  justPetted?: boolean;
  size?: number;
}

const CAN_TIN_COLOR: Record<CanId, string> = {
  tuna: "#5A7487",
  salmon: "#B96B52",
  scallop: "#BD9548",
};

/**
 * Hand-crafted low-saturation retro SVG cat illustrations with expressive CSS animations:
 * - "verdi": Calico Tabby (虎斑三花) — warm cream base, charcoal & terracotta patches, brown tabby stripes
 * - "porcini": Orange & White (白底橘貓 牛肝菌) — crisp white body & belly, toasted caramel-orange cap & back
 */
export function CatSprite({
  catId,
  mood,
  eatingCanId = "tuna",
  justPetted = false,
  size = 148,
}: CatSpriteProps) {
  const isVerdi = catId === "verdi";

  // Palette tuned to EchoTape's warm archival retro aesthetic
  const stroke = "#2B2925";
  const creamFur = isVerdi ? "#F8F2E4" : "#FDFBF6";
  const orangeFur = isVerdi ? "#C87A53" : "#D68A4A";
  const orangeStripe = isVerdi ? "#985436" : "#B56A32";
  const darkPatch = "#433E38";
  const tabbyStripe = "#6E5847";
  const earPink = "#DF9F92";
  const cheekBlush = "#E6A898";

  // ======================== POSE 1: HAPPY BELLY-UP (開心翻肚) ========================
  if (mood === "belly-up") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 180 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={isVerdi ? "Verdi 開心翻肚中" : "牛肝菌 開心翻肚中"}
      >
        {/* Ground shadow */}
        <ellipse cx="90" cy="138" rx="60" ry="10" fill="#DDD5C5" opacity="0.65" />

        {/* Floating purr & heart bubbles */}
        <g className="animate-cat-float">
          <path
            d="M142 36 C142 32 147 30 149 34 C151 30 156 32 156 36 C156 41 149 46 149 46 C149 46 142 41 142 36 Z"
            fill="#B96B52"
          />
          <text
            x="24"
            y="42"
            fill="#5E7D6A"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="700"
          >
            purr~
          </text>
        </g>

        {justPetted && (
          <g className="animate-cat-float">
            <path
              d="M84 20 C84 16 89 14 91 18 C93 14 98 16 98 20 C98 25 91 30 91 30 C91 30 84 25 84 20 Z"
              fill="#B96B52"
            />
          </g>
        )}

        {/* Whole rolling belly-up cat */}
        <g className="animate-cat-belly">
          {/* Happy curled tail */}
          <path
            d="M138 112 C158 108 162 88 150 82 C142 78 136 86 140 94"
            stroke={isVerdi ? darkPatch : orangeFur}
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M138 112 C158 108 162 88 150 82"
            stroke={stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Reclining plump body (belly facing up!) */}
          <ellipse
            cx="96"
            cy="108"
            rx="48"
            ry="27"
            fill={creamFur}
            stroke={stroke}
            strokeWidth="2.6"
          />

          {/* Side coat patches peeking around the fluffy belly */}
          {isVerdi ? (
            <>
              <path
                d="M112 83 C130 86 142 96 143 108 C132 106 120 98 112 83 Z"
                fill={orangeFur}
              />
              <path
                d="M60 124 C74 134 94 136 108 133 C94 126 76 122 60 124 Z"
                fill={darkPatch}
              />
              {/* Soft tabby belly-edge marks */}
              <path d="M126 95 L136 93" stroke={orangeStripe} strokeWidth="2.2" strokeLinecap="round" />
              <path d="M128 102 L139 101" stroke={orangeStripe} strokeWidth="2.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path
                d="M116 84 C132 88 142 97 143 108 C134 106 123 99 116 84 Z"
                fill={orangeFur}
              />
              <path
                d="M62 125 C76 134 96 135 112 132 C98 128 80 125 62 125 Z"
                fill={orangeFur}
                opacity="0.85"
              />
            </>
          )}

          {/* Soft exposed tummy oval */}
          <ellipse cx="96" cy="106" rx="28" ry="15" fill="#FFFDF9" opacity="0.92" />

          {/* Tilted happy head resting on left */}
          <g transform="translate(52, 86) rotate(-14)">
            {/* Ears */}
            <path
              d="M-22 -14 L-28 -36 L-6 -24 Z"
              fill={isVerdi ? darkPatch : orangeFur}
              stroke={stroke}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M-21 -18 L-24 -30 L-11 -23 Z" fill={earPink} />
            <path
              d="M8 -24 L26 -35 L22 -13 Z"
              fill={orangeFur}
              stroke={stroke}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M12 -23 L22 -29 L20 -17 Z" fill={earPink} />

            {/* Head */}
            <ellipse
              cx="0"
              cy="0"
              rx="28"
              ry="23"
              fill={creamFur}
              stroke={stroke}
              strokeWidth="2.5"
            />

            {/* Head markings */}
            {isVerdi ? (
              <>
                <path
                  d="M-26 -8 C-20 -22 -4 -24 2 -18 C-4 -10 -14 -4 -26 -8 Z"
                  fill={darkPatch}
                />
                <path
                  d="M4 -22 C16 -22 26 -14 27 -4 C18 -4 10 -10 4 -22 Z"
                  fill={orangeFur}
                />
                {/* Tabby M forehead stripes */}
                <path d="M-5 -18 L-3 -12 M0 -20 L0 -12 M5 -18 L3 -12" stroke={tabbyStripe} strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Porcini mushroom-cap orange crown */}
                <path
                  d="M-24 -10 C-18 -24 18 -24 24 -10 C12 -14 -12 -14 -24 -10 Z"
                  fill={orangeFur}
                />
                <path d="M-6 -20 L-4 -14 M0 -22 L0 -14 M6 -20 L4 -14" stroke={orangeStripe} strokeWidth="1.9" strokeLinecap="round" />
              </>
            )}

            {/* Happy closed smiling eyes (^ ^) */}
            <path d="M-15 -1 Q-10 -7 -5 -1" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M5 -1 Q10 -7 15 -1" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" fill="none" />

            {/* Rosy cheeks */}
            <ellipse cx="-16" cy="5" rx="4.5" ry="2.6" fill={cheekBlush} opacity="0.7" />
            <ellipse cx="16" cy="5" rx="4.5" ry="2.6" fill={cheekBlush} opacity="0.7" />

            {/* Pink nose & happy :3 mouth */}
            <polygon points="-3,3 3,3 0,6.5" fill={earPink} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M-6 8 Q-3 12 0 8 Q3 12 6 8" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* 4 tucked kneading paws with pink toe beans! */}
          <g className="animate-cat-paw">
            {/* Front left paw */}
            <ellipse cx="78" cy="86" rx="8" ry="11" transform="rotate(-15 78 86)" fill={creamFur} stroke={stroke} strokeWidth="2.3" />
            <circle cx="77" cy="83" r="2.2" fill={earPink} />
            {/* Front right paw */}
            <ellipse cx="101" cy="84" rx="8" ry="11" transform="rotate(14 101 84)" fill={creamFur} stroke={stroke} strokeWidth="2.3" />
            <circle cx="102" cy="81" r="2.2" fill={earPink} />
          </g>
          {/* Back paws kicked up */}
          <ellipse cx="122" cy="96" rx="8" ry="11" transform="rotate(28 122 96)" fill={creamFur} stroke={stroke} strokeWidth="2.3" />
          <circle cx="124" cy="93" r="2.2" fill={earPink} />
          <ellipse cx="132" cy="116" rx="9" ry="7" transform="rotate(-10 132 116)" fill={creamFur} stroke={stroke} strokeWidth="2.3" />
          <circle cx="134" cy="116" r="2" fill={earPink} />
        </g>
      </svg>
    );
  }

  // ======================== POSES 2, 3, 4: SITTING (IDLE / HUNGRY / ANGRY / EATING) ========================
  const isAngry = mood === "angry";
  const isEating = mood === "eating";
  const isHungry = mood === "hungry";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${isVerdi ? "Verdi" : "牛肝菌"} (${mood})`}
    >
      {/* Ground shadow */}
      <ellipse cx="90" cy="142" rx="46" ry="8" fill="#DDD5C5" opacity="0.7" />

      {/* Angry comic vein & grumpy speech */}
      {isAngry && (
        <g>
          <g transform="translate(126, 26)" stroke="#B96B52" strokeWidth="2.5" strokeLinecap="round">
            <path d="M0 6 L6 6 L6 0" />
            <path d="M12 0 L12 6 L18 6" />
            <path d="M0 12 L6 12 L6 18" />
            <path d="M18 12 L12 12 L12 18" />
          </g>
          <rect x="14" y="14" width="96" height="22" rx="11" fill="#F3E3DC" stroke="#B96B52" strokeWidth="1.5" />
          <text x="62" y="29" textAnchor="middle" fill="#9B543E" fontSize="10" fontFamily="monospace" fontWeight="700">
            {isVerdi ? "Feed me now!" : "Where's my can?"}
          </text>
        </g>
      )}

      {/* Hungry subtle bubble */}
      {isHungry && (
        <g>
          <rect x="20" y="14" width="84" height="21" rx="10" fill="#F4ECD8" stroke="#BD9548" strokeWidth="1.4" />
          <text x="62" y="28" textAnchor="middle" fill="#8B6824" fontSize="9.5" fontFamily="monospace" fontWeight="600">
            Hungry...
          </text>
        </g>
      )}

      {/* Eating floating hearts */}
      {isEating && (
        <g className="animate-cat-float">
          <path
            d="M128 42 C128 38 133 36 135 40 C137 36 142 38 142 42 C142 47 135 52 135 52 C135 52 128 47 128 42 Z"
            fill="#B96B52"
          />
          <text x="36" y="42" fill="#5E7D6A" fontSize="11" fontFamily="monospace" fontWeight="700">
            nom nom~
          </text>
        </g>
      )}

      <g className={isAngry ? "animate-cat-angry" : "animate-cat-breathe"}>
        {/* Tail (sways calmly, or lashes fast when angry!) */}
        <path
          className={isAngry ? "animate-cat-lash" : "animate-cat-tail"}
          d="M122 122 C145 118 154 96 142 84"
          stroke={isVerdi ? darkPatch : orangeFur}
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className={isAngry ? "animate-cat-lash" : "animate-cat-tail"}
          d="M122 122 C145 118 154 96 142 84"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Sitting Body */}
        <path
          d="M54 136 C50 102 64 82 90 82 C116 82 130 102 126 136 C126 141 54 141 54 136 Z"
          fill={creamFur}
          stroke={stroke}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/* Body Coat Markings */}
        {isVerdi ? (
          <>
            {/* Calico orange shoulder patch + charcoal hip patch */}
            <path d="M56 108 C64 96 76 96 78 112 C70 118 60 118 56 108 Z" fill={orangeFur} />
            <path d="M104 94 C118 96 125 110 124 124 C112 122 104 110 104 94 Z" fill={darkPatch} />
            <path d="M59 107 L69 105 M60 113 L71 112" stroke={orangeStripe} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Porcini white chest & warm orange shoulders/sides */}
            <path d="M55 112 C60 95 70 88 76 92 C72 108 66 120 55 122 Z" fill={orangeFur} />
            <path d="M125 112 C120 95 110 88 104 92 C108 108 114 120 125 122 Z" fill={orangeFur} />
          </>
        )}

        {/* White bib / paws */}
        <ellipse cx="90" cy="116" rx="16" ry="18" fill="#FFFDF9" opacity="0.88" />
        <ellipse cx="74" cy="136" rx="10" ry="6.5" fill={creamFur} stroke={stroke} strokeWidth="2.3" />
        <ellipse cx="106" cy="136" rx="10" ry="6.5" fill={creamFur} stroke={stroke} strokeWidth="2.3" />

        {/* Head group (bobs down when eating!) */}
        <g className={isEating ? "animate-cat-munch" : ""}>
          <g transform={isEating ? "translate(90, 82)" : "translate(90, 68)"}>
            {/* Ears: flattened airplane ears when angry! */}
            {isAngry ? (
              <>
                <path
                  d="M-24 -12 L-46 -18 L-28 2 Z"
                  fill={isVerdi ? darkPatch : orangeFur}
                  stroke={stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 -12 L46 -18 L28 2 Z"
                  fill={orangeFur}
                  stroke={stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              <>
                <path
                  d="M-26 -10 L-32 -36 L-8 -22 Z"
                  fill={isVerdi ? darkPatch : orangeFur}
                  stroke={stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path d="M-24 -15 L-27 -29 L-13 -20 Z" fill={earPink} />
                <path
                  d="M26 -10 L32 -36 L8 -22 Z"
                  fill={orangeFur}
                  stroke={stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path d="M24 -15 L27 -29 L13 -20 Z" fill={earPink} />
              </>
            )}

            {/* Main head shape */}
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="27"
              fill={creamFur}
              stroke={stroke}
              strokeWidth="2.6"
            />

            {/* Forehead & cheek patterns */}
            {isVerdi ? (
              <>
                {/* Calico tabby split patches */}
                <path
                  d="M-32 -8 C-24 -26 -4 -28 2 -18 C-6 -8 -18 -2 -32 -8 Z"
                  fill={darkPatch}
                />
                <path
                  d="M4 -26 C20 -26 32 -16 33 -4 C22 -2 12 -10 4 -26 Z"
                  fill={orangeFur}
                />
                {/* Classic tabby M & cheek stripes */}
                <path
                  d="M-7 -21 L-4 -14 M0 -23 L0 -14 M7 -21 L4 -14"
                  stroke={tabbyStripe}
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
                <path d="M-32 4 L-23 5 M-31 10 L-22 9" stroke={tabbyStripe} strokeWidth="1.8" strokeLinecap="round" />
                <path d="M32 4 L23 5 M31 10 L22 9" stroke={orangeStripe} strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* 牛肝菌 Porcini mushroom-cap warm orange top */}
                <path
                  d="M-31 -8 C-24 -28 24 -28 31 -8 C16 -14 -16 -14 -31 -8 Z"
                  fill={orangeFur}
                />
                <path
                  d="M-7 -22 L-5 -15 M0 -24 L0 -15 M7 -22 L5 -15"
                  stroke={orangeStripe}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Eyes by Mood */}
            {isEating ? (
              <>
                <path d="M-18 -1 Q-12 -7 -6 -1" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M6 -1 Q12 -7 18 -1" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : isAngry ? (
              <>
                <ellipse cx="-13" cy="2" rx="4.5" ry="3.2" fill={stroke} />
                <ellipse cx="13" cy="2" rx="4.5" ry="3.2" fill={stroke} />
                <circle cx="-14" cy="1" r="1.2" fill="#FFFDF9" />
                <circle cx="12" cy="1" r="1.2" fill="#FFFDF9" />
                {/* Furrowed angry V-brows */}
                <path d="M-21 -6 L-6 -1" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
                <path d="M21 -6 L6 -1" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
              </>
            ) : (
              <g className="animate-cat-blink">
                <circle cx="-13" cy="0" r={isHungry ? "5.2" : "4.4"} fill={stroke} />
                <circle cx="13" cy="0" r={isHungry ? "5.2" : "4.4"} fill={stroke} />
                <circle cx="-14.5" cy="-1.6" r="1.6" fill="#FFFDF9" />
                <circle cx="11.5" cy="-1.6" r="1.6" fill="#FFFDF9" />
                {isHungry && (
                  <>
                    <circle cx="-11.5" cy="1.8" r="1" fill="#FFFDF9" />
                    <circle cx="14.5" cy="1.8" r="1" fill="#FFFDF9" />
                  </>
                )}
              </g>
            )}

            {/* Cheeks */}
            {!isAngry && (
              <>
                <ellipse cx="-20" cy="7" rx="4.5" ry="2.5" fill={cheekBlush} opacity="0.65" />
                <ellipse cx="20" cy="7" rx="4.5" ry="2.5" fill={cheekBlush} opacity="0.65" />
              </>
            )}

            {/* Whiskers */}
            <path d="M-35 3 L-24 5 M-34 9 L-24 9" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
            <path d="M35 3 L24 5 M34 9 L24 9" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />

            {/* Nose & Mouth */}
            <polygon points="-3.2,4 3.2,4 0,7.5" fill={earPink} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
            {isAngry ? (
              <path d="M-6 13 Q0 8 6 13" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            ) : isHungry ? (
              <ellipse cx="0" cy="12" rx="3" ry="2.5" fill={earPink} stroke={stroke} strokeWidth="1.8" />
            ) : (
              <path d="M-6 10 Q-3 14 0 10 Q3 14 6 10" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
            )}
          </g>
        </g>

        {/* Retro Cat Food Tin Can when eating! */}
        {isEating && (
          <g transform="translate(68, 120)">
            <rect
              x="0"
              y="6"
              width="44"
              height="20"
              rx="4"
              fill={CAN_TIN_COLOR[eatingCanId]}
              stroke={stroke}
              strokeWidth="2.2"
            />
            <ellipse cx="22" cy="6" rx="22" ry="5" fill="#EEE9DC" stroke={stroke} strokeWidth="2" />
            <ellipse cx="22" cy="6" rx="15" ry="3" fill="#C87A53" />
            <rect x="8" y="13" width="28" height="6" rx="2" fill="#FBF9F4" opacity="0.9" />
          </g>
        )}
      </g>
    </svg>
  );
}
