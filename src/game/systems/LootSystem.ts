import type { PartDef } from "../types";

export type RewardTier = "SR" | "SSR" | "UR";

interface DrawLootInput {
  round: number;
  parts: PartDef[];
  ownedPartIds: Iterable<string>;
  random?: () => number;
}

export const rarityTier = (part: Pick<PartDef, "category" | "rarity">): RewardTier => {
  if (part.category === "catalyst" || part.rarity === "epic") {
    return "UR";
  }

  if (part.rarity === "rare") {
    return "SSR";
  }

  return "SR";
};

export const describeRewardTier = rarityTier;

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

const noveltyScore = (part: PartDef, rewards: PartDef[]): number => {
  if (rewards.length === 0) {
    return 0;
  }

  const usedCategories = new Set(rewards.map((reward) => reward.category));
  const usedRarities = new Set(rewards.map((reward) => reward.rarity));

  return (usedCategories.has(part.category) ? 0 : 2) + (usedRarities.has(part.rarity) ? 0 : 2);
};

const pickVariedReward = (pool: PartDef[], rewards: PartDef[], random: () => number): PartDef => {
  const bestScore = Math.max(...pool.map((part) => noveltyScore(part, rewards)));
  const variedPool = pool.filter((part) => noveltyScore(part, rewards) === bestScore);

  return pickWeighted(variedPool, random);
};

export const drawLootRewards = ({ round, parts, ownedPartIds, random = Math.random }: DrawLootInput): PartDef[] => {
  const owned = new Set(ownedPartIds);
  const rewards: PartDef[] = [];
  const available = parts.filter((part) => part.category !== "catalyst" && !owned.has(part.id));

  while (rewards.length < 3 && available.length > 0) {
    const selected = pickVariedReward(available, rewards, random);
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
