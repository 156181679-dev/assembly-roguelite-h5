import type { EffectPrimitive, FusionResult, FusionRule, PartDef, WeaponDef } from "../types";

const samePair = (expected: [string, string], a: string, b: string): boolean =>
  (expected[0] === a && expected[1] === b) || (expected[0] === b && expected[1] === a);

const hasAllTags = (tags: string[], required: string[]): boolean => required.every((tag) => tags.includes(tag));

const hasCategories = (a: PartDef, b: PartDef, categories: string[]): boolean =>
  categories.every((category) => a.category === category || b.category === category);

const toResult = (ruleType: FusionResult["ruleType"], rule: FusionRule, a: PartDef, b: PartDef): FusionResult => ({
  ruleType,
  weapon: rule.result,
  formulaText: `${a.name} + ${b.name} = ${rule.result.name}`
});

const effectsFromTags = (tags: string[]): EffectPrimitive[] => {
  const effects = new Set<EffectPrimitive>();
  if (tags.includes("fire")) effects.add("burn");
  if (tags.includes("ice") || tags.includes("delay")) effects.add("freeze");
  if (tags.includes("lightning")) effects.add("shock");
  if (tags.includes("poison")) effects.add("poison");
  if (tags.includes("blade") || tags.includes("metal")) effects.add("pierce");
  if (tags.includes("rocket") || tags.includes("homing")) effects.add("homing");
  if (tags.includes("spring") || tags.includes("bonk") || tags.includes("wind")) effects.add("knockback");
  if (tags.includes("glitch") || tags.includes("curse") || tags.includes("kpi")) effects.add("glitch");
  if (tags.includes("blessing") || tags.includes("friendship")) effects.add("buff");
  if (tags.includes("explosion") || tags.includes("money")) effects.add("burst");

  const result = [...effects];
  return result.length >= 2 ? result : ["knockback", "glitch"];
};

export const fuseParts = (a: PartDef, b: PartDef, rules: FusionRule[]): FusionResult => {
  const sortedRules = [...rules].sort((left, right) => right.priority - left.priority);
  const exactRule = sortedRules.find((rule) => rule.match.partIds && samePair(rule.match.partIds, a.id, b.id));
  if (exactRule) {
    return toResult("exact", exactRule, a, b);
  }

  const combinedTags = [...new Set([...a.tags, ...b.tags])];
  const tagRule = sortedRules.find((rule) => {
    if (rule.match.partIds) return false;
    if (rule.match.tags && !hasAllTags(combinedTags, rule.match.tags)) return false;
    if (rule.match.categories && !hasCategories(a, b, rule.match.categories)) return false;
    return Boolean(rule.match.tags || rule.match.categories);
  });

  if (tagRule) {
    return toResult("tag", tagRule, a, b);
  }

  const effects = effectsFromTags(combinedTags);
  const chaosWeapon: WeaponDef = {
    id: `weapon_chaos_${a.id}_${b.id}`,
    name: `混沌${a.name}${b.name}`,
    tags: ["weapon", "chaos", ...combinedTags],
    color: "#f4f04d",
    icon: "混沌",
    effects,
    trigger: {
      id: `chaos_${a.id}_${b.id}`,
      cooldownMs: 620,
      target: "random",
      damage: 26 + effects.length * 6,
      effects,
      visualPreset: "chaos"
    }
  };

  return {
    ruleType: "chaos",
    weapon: chaosWeapon,
    formulaText: `${a.name} + ${b.name} = ${chaosWeapon.name}`
  };
};
