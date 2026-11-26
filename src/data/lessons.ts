import type { Lesson, TopicMeta } from "@/lib/types";
import { SERIES_LESSONS } from "./topics/series";
import { MUSIC_LESSONS } from "./topics/music";
import { ANIME_LESSONS } from "./topics/anime";
import { MOVIES_LESSONS } from "./topics/movies";
import { SCIENCE_LESSONS } from "./topics/science";
import { TRIVIA_LESSONS } from "./topics/trivia";
import { BUSINESS_LESSONS } from "./topics/business";
import { WORLD_LESSONS } from "./topics/world";

export const TOPICS: TopicMeta[] = [
  {
    id: "Series",
    num: "01",
    labelZh: "影集",
    labelEn: "SERIES",
    tagline: "咖啡廳日常到繼承之戰權謀交鋒",
    levelRange: "B1–C2",
    tone: "terracotta",
  },
  {
    id: "Music",
    num: "02",
    labelZh: "音樂",
    labelEn: "MUSIC",
    tagline: "創作訪談、爵士和聲與製作人剖析",
    levelRange: "B1–C2",
    tone: "slate",
  },
  {
    id: "Anime",
    num: "03",
    labelZh: "動漫",
    labelEn: "ANIME",
    tagline: "吉卜力日常到史詩演說哲學辯論",
    levelRange: "B1–C2",
    tone: "ochre",
  },
  {
    id: "Movies",
    num: "04",
    labelZh: "電影",
    labelEn: "MOVIES",
    tagline: "暖心對白到索金極速聽證與歷史交鋒",
    levelRange: "B1–C2",
    tone: "sage",
  },
  {
    id: "Science",
    num: "05",
    labelZh: "科學",
    labelEn: "SCIENCE",
    tagline: "生活科普、深度學習到量子力學前沿",
    levelRange: "B1–C2",
    tone: "slate",
  },
  {
    id: "Trivia",
    num: "06",
    labelZh: "冷知識",
    labelEn: "TRIVIA",
    tagline: "奇聞邏輯謎題到英國 QI 冷幽默機鋒",
    levelRange: "B1–C2",
    tone: "ochre",
  },
  {
    id: "Business",
    num: "07",
    labelZh: "商業",
    labelEn: "BUSINESS",
    tagline: "創業實戰、哈佛策略到 FT 總經深評",
    levelRange: "B1–C2",
    tone: "sage",
  },
  {
    id: "World",
    num: "08",
    labelZh: "國際",
    labelEn: "WORLD",
    tagline: "多元觀點、BBC 外交到 DW 地緣戰略",
    levelRange: "B1–C2",
    tone: "terracotta",
  },
];

export const CURATED_LESSONS: Lesson[] = [
  ...SERIES_LESSONS,
  ...MUSIC_LESSONS,
  ...ANIME_LESSONS,
  ...MOVIES_LESSONS,
  ...SCIENCE_LESSONS,
  ...TRIVIA_LESSONS,
  ...BUSINESS_LESSONS,
  ...WORLD_LESSONS,
];

export function getCuratedLessonById(id: string): Lesson | undefined {
  return CURATED_LESSONS.find((lesson) => lesson.id === id);
}

export function getYoutubeThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export const OFFLINE_QUIZ_DISTRACTORS: string[] = [
  "義式濃縮咖啡",
  "店家請客、免費招待",
  "穩定的、不顫抖的",
  "仔細觀察、洞察",
  "不太可能的、出乎意料的",
  "談判籌碼、影響力優勢",
  "法律或規則漏洞",
  "精明敏銳的、老練的",
  "道貌岸然的、假裝道德高尚的",
  "後世、後代子孫",
  "侵蝕、腐化",
  "看似簡單實則暗藏玄機",
  "切分音、錯拍律動",
  "毫不間斷的、步步緊逼的",
  "即興演奏、臨場應變",
  "混亂無序的",
  "人為雕琢感、矯揉造作",
  "自發性、渾然天成的即興感",
  "掌握訣竅、漸漸上手",
  "讓人不知所措的",
  "極度痛苦煎熬的",
  "經過縝密盤算的",
  "沉著冷靜的、從容不迫的",
  "報復、反擊",
  "仲裁者、最高裁決人",
  "天青藍、蔚藍色",
  "漫不經心地、渾然不覺地",
  "居高臨下的、自以為高人一等的",
  "不可或缺的",
  "坦率直言、真誠不諱",
  "坍縮、崩塌",
  "微妙脆弱的、精細的",
  "量化、以數據衡量",
  "差異、誤差、出入",
  "衰減、減弱",
  "無窮小的、極其微小的",
  "離散的、不連續的",
  "模稜兩可的、語意含糊的",
  "無懈可擊的、滴水不漏的",
  "演繹推斷、推導出",
  "面無表情一本正經搞笑的",
  "低調含蓄的",
  "徹底改革、全面檢修翻新",
  "先決條件、必備前提",
  "極度細心費力的、煞費苦心的",
  "僵局、談判死胡同",
  "咽喉要道、關鍵瓶頸節點",
  "相互依存關係",
  "不可阻擋地、必然地",
  "均衡狀態、戰略均勢",
];
