export const PRODUCT_UNITS = [
  "قطعة",
  "كرتونة",
  "شكارة",
  "كيلو",
  "جرام",
  "متر",
  "لتر",
  "طرد",
  "لفة",
  "دسته",
  "صندوق",
  "خدمة",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];
