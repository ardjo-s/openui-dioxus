export const THREE_ARMS = ["openui", "a2ui", "typed-json"];

const BASE_ORDERS = [
  ["openui", "a2ui", "typed-json"],
  ["openui", "typed-json", "a2ui"],
  ["a2ui", "openui", "typed-json"],
  ["a2ui", "typed-json", "openui"],
  ["typed-json", "openui", "a2ui"],
  ["typed-json", "a2ui", "openui"],
];

export function threeArmOrder(passage) {
  if (!Number.isInteger(passage) || passage < 1 || passage > 20) {
    throw new Error(`three-arm passage must be between 1 and 20: ${passage}`);
  }
  const pair = Math.floor((passage - 1) / 2);
  const base = BASE_ORDERS[pair % BASE_ORDERS.length];
  return passage % 2 === 1 ? [...base] : [...base].reverse();
}

export function buildThreeArmSchedule() {
  return Array.from({ length: 20 }, (_, index) => ({
    passage: index + 1,
    order: threeArmOrder(index + 1),
  }));
}
