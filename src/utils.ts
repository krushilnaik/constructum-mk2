export const daysBetween = (aISO: string | Date, bISO: string | Date) => {
  const a = new Date(aISO);
  const b = new Date(bISO);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

export const addDays = (iso: string | Date, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Convert date -> x coordinate
export const dateToX = (startDateISO: string, dateISO: string, pixelsPerDay: number) => {
  const days = daysBetween(startDateISO, dateISO);
  return Math.round(days * pixelsPerDay);
};
