import type { PartDef } from "../types";

interface DrawLootInput {
  round: number;
  parts: PartDef[];
  ownedPartIds: Iterable<string>;
  random?: () => number;
}

const pickWeighted = (pool: PartDef[], random: () => number): PartDef => {
  const totalWeight = pool.reduce((sum, part) => sum + Math.max(part.weight, 0), 0);
  if (totalWeight <= 0) {
    return pool[Math.floor(random() * pool.length)] ?? pool[0];
  }

  let cursor = random() * totalWeight;
  for (const part of pool) {
    cursor -= Math.max(part.weight, 0);
    if (cursor <= 0) {
      return part;
    }
  }

  return pool[pool.length - 1];
};

export const drawLootRewards = ({ round, parts, ownedPartIds, random = Math.random }: DrawLootInput): PartDef[] => {
  const owned = new Set(ownedPartIds);
  const rewards: PartDef[] = [];
  const available = parts.filter((part) => part.category !== "catalyst" && !owned.has(part.id));

  while (rewards.length < 3 && available.length > 0) {
    const selected = pickWeighted(available, random);
    rewards.push(selected);
    available.splice(available.indexOf(selected), 1);
  }

  if (round >= 3) {
    const catalyst = parts.find((part) => part.category === "catalyst");
    if (catalyst) {
      rewards.push(catalyst);
    }
  }

  return rewards;
};
