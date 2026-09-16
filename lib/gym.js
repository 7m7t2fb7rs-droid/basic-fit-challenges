/* ------------------------------------------------------------------ */
/*  Ouverture de la salle                                              */
/*                                                                     */
/*  Par défaut l'état se déduit des horaires habituels. L'admin peut    */
/*  forcer une fermeture (panne, jour férié, travaux) en donnant une    */
/*  heure de réouverture : passée cette heure, on repasse tout seul     */
/*  sur les horaires.                                                  */
/* ------------------------------------------------------------------ */

export const HOURS_KEY = "gym_hours";
export const OVERRIDE_KEY = "gym_override";

// Le club vit en France : on raisonne toujours dans ce fuseau, même si le
// téléphone qui consulte la page est réglé ailleurs.
const ZONE = "Europe/Paris";

export const DAYS = [
  { key: 0, short: "Dim", long: "Dimanche" },
  { key: 1, short: "Lun", long: "Lundi" },
  { key: 2, short: "Mar", long: "Mardi" },
  { key: 3, short: "Mer", long: "Mercredi" },
  { key: 4, short: "Jeu", long: "Jeudi" },
  { key: 5, short: "Ven", long: "Vendredi" },
  { key: 6, short: "Sam", long: "Samedi" },
];

// Horaires relevés sur basic-fit.com pour le club de Saint-Claude
// (1 rue du Biolet) : du lundi au vendredi 06h00-22h30, week-end 09h00-19h00.
export const DEFAULT_HOURS = {
  0: ["09:00", "19:00"],
  1: ["06:00", "22:30"],
  2: ["06:00", "22:30"],
  3: ["06:00", "22:30"],
  4: ["06:00", "22:30"],
  5: ["06:00", "22:30"],
  6: ["09:00", "19:00"],
};

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

const pad = (n) => String(n).padStart(2, "0");
export const minutesToHHMM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Lit les horaires stockés ; toute valeur illisible retombe sur les horaires
 *  habituels plutôt que de laisser la salle dans un état indéterminé. */
export function parseHours(raw) {
  if (!raw) return DEFAULT_HOURS;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const out = {};
    for (const { key } of DAYS) {
      const slot = parsed?.[key] ?? parsed?.[String(key)];
      // null = jour de fermeture, c'est une valeur valide.
      if (slot === null) {
        out[key] = null;
        continue;
      }
      const open = toMinutes(slot?.[0]);
      const close = toMinutes(slot?.[1]);
      out[key] = open !== null && close !== null && close > open ? [slot[0], slot[1]] : DEFAULT_HOURS[key];
    }
    return out;
  } catch {
    return DEFAULT_HOURS;
  }
}

export function parseOverride(raw) {
  if (!raw) return null;
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (o?.state !== "open" && o?.state !== "closed") return null;
    return { state: o.state, until: o.until || null };
  } catch {
    return null;
  }
}

/** Jour de la semaine et minutes écoulées, à Paris. */
function parisNow(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const index = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: index[get("weekday")] ?? now.getDay(),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Prochaine ouverture : aujourd'hui si elle est encore devant, sinon le
 *  premier jour ouvré suivant. Renvoie null si la salle n'ouvre jamais. */
function nextOpening(hours, day, minutes) {
  for (let step = 0; step < 8; step++) {
    const d = (day + step) % 7;
    const slot = hours[d];
    if (!slot) continue;
    const open = toMinutes(slot[0]);
    if (step === 0 && minutes >= open) continue; // déjà passée aujourd'hui
    return { day: d, time: slot[0], today: step === 0, tomorrow: step === 1 };
  }
  return null;
}

/**
 * État de la salle à un instant donné.
 * @returns {{open:boolean, forced:boolean, until:string|null, next:object|null, closesAt:string|null}}
 */
export function gymStatus(hours, override, now = new Date()) {
  const { day, minutes } = parisNow(now);

  // Une fermeture forcée expire d'elle-même à l'heure de réouverture annoncée.
  if (override) {
    const until = override.until ? new Date(override.until) : null;
    const stillOn = !until || Number.isNaN(until.getTime()) || until > now;
    if (stillOn) {
      return {
        open: override.state === "open",
        forced: true,
        until: override.until || null,
        next: null,
        closesAt: null,
      };
    }
  }

  const slot = hours[day];
  const open = slot ? toMinutes(slot[0]) : null;
  const close = slot ? toMinutes(slot[1]) : null;
  const isOpen = slot !== null && open !== null && minutes >= open && minutes < close;

  return {
    open: isOpen,
    forced: false,
    until: null,
    next: isOpen ? null : nextOpening(hours, day, minutes),
    closesAt: isOpen ? slot[1] : null,
  };
}

/** Phrase affichée sous le logo. `now` sert à dire « aujourd'hui » juste. */
export function statusLabel(status, now = new Date()) {
  if (status.open) return "Ouvert";
  if (status.forced) {
    if (!status.until) return "Fermé";
    const d = new Date(status.until);
    const heure = new Intl.DateTimeFormat("fr-FR", {
      timeZone: ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: ZONE, weekday: "long" }).format(d);
    const aujourdhui =
      new Intl.DateTimeFormat("fr-FR", { timeZone: ZONE, dateStyle: "short" }).format(d) ===
      new Intl.DateTimeFormat("fr-FR", { timeZone: ZONE, dateStyle: "short" }).format(now);
    return aujourdhui ? `Fermé · rouvre à ${heure}` : `Fermé · rouvre ${jour} à ${heure}`;
  }
  if (!status.next) return "Fermé";
  if (status.next.today) return `Fermé · ouvre à ${status.next.time}`;
  if (status.next.tomorrow) return `Fermé · ouvre demain ${status.next.time}`;
  const jour = DAYS[status.next.day].long.toLowerCase();
  return `Fermé · ouvre ${jour} ${status.next.time}`;
}
