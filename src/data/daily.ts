import { dayKeyFor } from "./activity";

/**
 * Content that rotates once per calendar day.
 *
 * Selection is deterministic: the same day always yields the same proverb and
 * philosophy, so the page does not reshuffle on every reload — but it changes
 * when the date changes.
 */

export type Proverb = {
  japanese: string;
  romaji: string;
  translation: string;
};

export type Philosophy = {
  text: string;
  author: string;
  source: string;
};

export const proverbs: Proverb[] = [
  {
    japanese: "一日一生",
    romaji: "Ichinichi issho",
    translation: "Live each day as if it were an entire lifetime.",
  },
  {
    japanese: "七転び八起き",
    romaji: "Nanakorobi yaoki",
    translation: "Fall down seven times, stand up eight.",
  },
  {
    japanese: "継続は力なり",
    romaji: "Keizoku wa chikara nari",
    translation: "Continuation is strength. Persistence itself is power.",
  },
  {
    japanese: "初心忘るべからず",
    romaji: "Shoshin wasuru bekarazu",
    translation: "Never forget the mind of the beginner.",
  },
  {
    japanese: "石の上にも三年",
    romaji: "Ishi no ue ni mo sannen",
    translation: "Three years upon a stone. Endure, and the cold gives way.",
  },
  {
    japanese: "急がば回れ",
    romaji: "Isogaba maware",
    translation: "If you are in a hurry, take the long way around.",
  },
  {
    japanese: "千里の道も一歩から",
    romaji: "Senri no michi mo ippo kara",
    translation: "A journey of a thousand miles begins with a single step.",
  },
  {
    japanese: "日々是好日",
    romaji: "Nichinichi kore kōjitsu",
    translation: "Every day is a good day.",
  },
  {
    japanese: "精神一到何事か成らざらん",
    romaji: "Seishin ittō nanigoto ka narazaran",
    translation: "With a focused spirit, what cannot be accomplished?",
  },
  {
    japanese: "不撓不屈",
    romaji: "Futō fukutsu",
    translation: "Unbending, unbreaking. Tenacity without surrender.",
  },
  {
    japanese: "一期一会",
    romaji: "Ichigo ichie",
    translation: "One time, one meeting. This moment will never come again.",
  },
  {
    japanese: "鉄は熱いうちに打て",
    romaji: "Tetsu wa atsui uchi ni ute",
    translation: "Strike while the iron is hot.",
  },
  {
    japanese: "花より団子",
    romaji: "Hana yori dango",
    translation: "Substance over appearance. Choose the real thing.",
  },
  {
    japanese: "塵も積もれば山となる",
    romaji: "Chiri mo tsumoreba yama to naru",
    translation: "Even dust, when piled, becomes a mountain.",
  },
];

export const philosophies: Philosophy[] = [
  {
    text: "The swordsman does not seek the sword. The sword seeks the swordsman.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "Do nothing that is of no use.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "You must understand that there is more than one path to the top of the mountain.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "Perceive that which cannot be seen with the eye.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "The way of the warrior is resolute acceptance of death.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "Think lightly of yourself and deeply of the world.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "It is not the mountain we conquer, but ourselves.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "There is surely nothing other than the single purpose of the present moment.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "The end is important in all things.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "The sword has to be more than a simple weapon; it has to be an answer to life's questions.",
    author: "Yagyū Munenori",
    source: "The Life-Giving Sword",
  },
  {
    text: "Do not let others lead you astray; let your own mind be your master.",
    author: "Yagyū Munenori",
    source: "The Life-Giving Sword",
  },
  {
    text: "Fall seven times, rise eight. Life begins now.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "When you reach the top of the mountain, keep climbing.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "Before enlightenment: chop wood, carry water. After enlightenment: chop wood, carry water.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "In battle, if you make your opponent flinch, you have already won.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "Get beyond love and grief: exist for the good of man.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "Accept everything just the way it is.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "Do not regret what you have done.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "Never stray from the way.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "Do not seek pleasure for its own sake.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "Be detached from desire your whole life long.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "Do not act following customary beliefs.",
    author: "Miyamoto Musashi",
    source: "Dokkōdō",
  },
  {
    text: "The way of the warrior is found in death — meaning, live as though already free.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "A man is a good man if he does not boast of his own strength.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "Matters of small concern should be treated seriously.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "It is bad when one thing becomes two. One should look for one thing only.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "To hate injustice and stand on righteousness is difficult.",
    author: "Yamamoto Tsunetomo",
    source: "Hagakure",
  },
  {
    text: "Even a poor sword, wielded with resolve, cuts.",
    author: "Yagyū Munenori",
    source: "The Life-Giving Sword",
  },
  {
    text: "To win a hundred victories is not the highest skill. To need none is.",
    author: "Sun Tzu",
    source: "The Art of War",
  },
  {
    text: "Opportunities multiply as they are seized.",
    author: "Sun Tzu",
    source: "The Art of War",
  },
  {
    text: "In the midst of chaos, there is also opportunity.",
    author: "Sun Tzu",
    source: "The Art of War",
  },
  {
    text: "The supreme art of war is to subdue the enemy without fighting.",
    author: "Sun Tzu",
    source: "The Art of War",
  },
  {
    text: "Move swift as the wind, stay quiet as the forest.",
    author: "Sun Tzu",
    source: "The Art of War",
  },
  {
    text: "The mind is everything. What you think, you become.",
    author: "Buddhist Teaching",
    source: "Dhammapada",
  },
  {
    text: "Drop by drop is the water pot filled.",
    author: "Buddhist Teaching",
    source: "Dhammapada",
  },
  {
    text: "You cannot travel the path until you have become the path itself.",
    author: "Buddhist Teaching",
    source: "Traditional",
  },
  {
    text: "The obstacle is the path.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "Sitting quietly, doing nothing, spring comes, and the grass grows by itself.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "When walking, walk. When eating, eat.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "The quieter you become, the more you can hear.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "Let go, or be dragged.",
    author: "Zen Proverb",
    source: "Traditional",
  },
  {
    text: "A tree that is unbending is easily broken.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    text: "Mastering others is strength. Mastering yourself is true power.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    text: "Nature does not hurry, yet everything is accomplished.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    text: "To attain knowledge, add things every day. To attain wisdom, remove things.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    text: "The flame that burns twice as bright burns half as long.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    text: "It does not matter how slowly you go, so long as you do not stop.",
    author: "Confucius",
    source: "Analects",
  },
  {
    text: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    source: "Analects",
  },
  {
    text: "When it is obvious the goals cannot be reached, adjust the steps.",
    author: "Confucius",
    source: "Analects",
  },
  {
    text: "Real knowledge is to know the extent of one's ignorance.",
    author: "Confucius",
    source: "Analects",
  },
  {
    text: "The superior man is modest in speech but exceeds in action.",
    author: "Confucius",
    source: "Analects",
  },
  {
    text: "Vision without action is a daydream. Action without vision is a nightmare.",
    author: "Japanese Proverb",
    source: "Traditional",
  },
  {
    text: "If you understand everything, you must be misinformed.",
    author: "Japanese Proverb",
    source: "Traditional",
  },
  {
    text: "The bamboo that bends is stronger than the oak that resists.",
    author: "Japanese Proverb",
    source: "Traditional",
  },
  {
    text: "One kind word can warm three winter months.",
    author: "Japanese Proverb",
    source: "Traditional",
  },
  {
    text: "Fear is only as deep as the mind allows.",
    author: "Japanese Proverb",
    source: "Traditional",
  },
  {
    text: "Duty is heavy as a mountain; death is light as a feather.",
    author: "Japanese Proverb",
    source: "Traditional",
  },
  {
    text: "Knowing and not doing is the same as not knowing at all.",
    author: "Zen Teaching",
    source: "Traditional",
  },
  {
    text: "The pine teaches silence, the rock teaches stillness.",
    author: "Zen Teaching",
    source: "Traditional",
  },
  {
    text: "Wherever you are, be there totally.",
    author: "Zen Teaching",
    source: "Traditional",
  },
  {
    text: "A journey is best measured in friends, not in miles.",
    author: "Zen Teaching",
    source: "Traditional",
  },
  {
    text: "Do not be afraid of going slowly; be afraid only of standing still.",
    author: "Chinese Proverb",
    source: "Traditional",
  },
  {
    text: "The best time to plant a tree was twenty years ago. The second best time is now.",
    author: "Chinese Proverb",
    source: "Traditional",
  },
  {
    text: "A gem cannot be polished without friction, nor a person perfected without trials.",
    author: "Chinese Proverb",
    source: "Traditional",
  },
];

/** Day number at the 04:00 boundary — makes rotation stable within a day. */
export function dayNumber(date: Date = new Date()): number {
  const [y, m, d] = dayKeyFor(date).split("-").map(Number);
  return Math.floor(new Date(y!, m! - 1, d!).getTime() / 86_400_000);
}

/**
 * `YYYY-MM-DD` for the day you'd *say* it is — rolling over at 04:00, matching
 * the ledger. Planning at 00:30 should still show the evening's plan, not
 * tomorrow's blank one.
 */
export function dayKey(date: Date = new Date()): string {
  return dayKeyFor(date);
}

/** Picks a stable entry for the given day. Offsetting the pools keeps the
 *  proverb and the philosophy from moving in lockstep. */
export function pickForDay<T>(pool: T[], date: Date = new Date(), offset = 0): T {
  const index = (((dayNumber(date) + offset) % pool.length) + pool.length) % pool.length;
  return pool[index]!;
}

/* ------------------------------------------------------------------ *
 * No-repeat rotation
 * ------------------------------------------------------------------ */

/** Deterministic PRNG, so a given cycle always shuffles the same way. */
function seededRandom(seed: number) {
  let s = seed * 2654435761;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Fisher–Yates against a seeded source — a reproducible shuffle. */
function shuffled<T>(pool: T[], seed: number): T[] {
  const out = [...pool];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Walks the entire pool before anything comes round again, then reshuffles for
 * the next pass — so consecutive days are never the same entry, and you see all
 * of them before the first repeat.
 *
 * A finite pool must eventually cycle; what this guarantees is that the cycle is
 * as long as the pool and never lands in the same order twice.
 */
export function cycledForDay<T>(pool: T[], date: Date = new Date(), offset = 0): T {
  if (pool.length === 0) throw new Error("Cannot pick from an empty pool");
  const n = dayNumber(date) + offset;
  const cycle = Math.floor(n / pool.length);
  const index = ((n % pool.length) + pool.length) % pool.length;
  return shuffled(pool, cycle + 1)[index]!;
}

export function proverbForDay(date: Date = new Date()): Proverb {
  return cycledForDay(proverbs, date);
}

export function philosophyForDay(date: Date = new Date()): Philosophy {
  return cycledForDay(philosophies, date, 5);
}

/** How long the pool lasts before anything repeats. */
export const philosophyCycleDays = () => philosophies.length;

/** Time-of-day greeting, including the small hours. */
export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Rest Well";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}
