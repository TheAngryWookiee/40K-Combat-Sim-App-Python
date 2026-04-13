import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.jsx");import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=d2783e04"; const useEffect = __vite__cjsImport0_react["useEffect"]; const useMemo = __vite__cjsImport0_react["useMemo"]; const useRef = __vite__cjsImport0_react["useRef"]; const useState = __vite__cjsImport0_react["useState"];
import "/src/App.css";
import { fetchFactions, fetchFactionDetails, fetchUnitDetailsWithLoadout, fetchUnits, simulateCombat } from "/src/api.js";
var _jsxFileName = "C:/Users/EricThompson/OneDrive - LP and Associates Inc/Documents/WH40K/40K Combat Sim App Python/frontend/src/App.jsx";
import __vite__cjsImport3_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=d2783e04"; const _jsxDEV = __vite__cjsImport3_react_jsxDevRuntime["jsxDEV"]; const _Fragment = __vite__cjsImport3_react_jsxDevRuntime["Fragment"];
var _s = $RefreshSig$();
const statDisplayRows = [[
	[
		"movement",
		"M",
		(value) => `${value}"`
	],
	["toughness", "T"],
	["save", "SV"]
], [
	["wounds", "W"],
	["leadership", "LD"],
	["objective_control", "OC"]
]];
const ALL_RANGED_WEAPONS = "__all_ranged__";
const ALL_MELEE_WEAPONS = "__all_melee__";
const initialOptions = {
	target_has_cover: false,
	attacker_in_engagement_range: false,
	target_in_engagement_range_of_allies: false,
	in_half_range: false,
	oath_of_moment_active: false,
	charged_this_turn: false,
	remained_stationary: false,
	indirect_target_visible: true,
	attached_character_name: "",
	hazardous_overwatch_charge_phase: false,
	hazardous_bearer_current_wounds: "",
	attacker_fire_discipline_active: false,
	attacker_marked_for_destruction_active: false,
	attacker_unforgiven_fury_active: false,
	attacker_unforgiven_fury_army_battleshocked: false,
	attacker_stubborn_tenacity_active: false,
	attacker_weapons_of_the_first_legion_active: false,
	attacker_pennant_of_remembrance_active: false,
	attacker_below_starting_strength: false,
	attacker_battleshocked: false,
	defender_armour_of_contempt_active: false,
	defender_overwhelming_onslaught_active: false,
	defender_unbreakable_lines_active: false,
	defender_pennant_of_remembrance_active: false,
	defender_battleshocked: false
};
const UNFORGIVEN_TASK_FORCE = "Unforgiven Task Force";
const SAGA_OF_THE_HUNTER = "Saga of the Hunter";
const OATH_EXCLUDED_KEYWORDS = [
	"black templars",
	"blood angels",
	"dark angels",
	"deathwatch",
	"space wolves"
];
const OATH_OF_MOMENT_RULE_TEXT = "Select one enemy unit. Each time a model with Oath of Moment makes an attack that targets that unit, you can re-roll the Hit roll.";
const OATH_OF_MOMENT_CODEX_RIDER_TEXT = "If you are using a Codex: Space Marines Detachment and your army does not include Black Templars, Blood Angels, Dark Angels, Deathwatch, or Space Wolves units, add 1 to the Wound roll as well.";
const BATTLEFIELD_WIDTH_INCHES = 60;
const BATTLEFIELD_HEIGHT_INCHES = 44;
const UNIT_BASE_DIAMETERS_MM = {
	"Lion El'Jonson": 60,
	"Logan Grimnar": 80
};
function getDetachmentByName(factionDetails, detachmentName) {
	return factionDetails?.detachments?.find((detachment) => detachment.name === detachmentName) || null;
}
function unitIsEpicHero(unit) {
	return (unit?.keywords || []).some((keyword) => String(keyword).toLowerCase() === "epic hero");
}
function getAttackerEnhancementOptions(detachment, unit, selectedWeapon, hasHazardous) {
	if (!detachment || detachment.name !== UNFORGIVEN_TASK_FORCE || unitIsEpicHero(unit)) {
		return [];
	}
	return (detachment.enhancements || []).filter((enhancement) => {
		if (enhancement.name === "Stubborn Tenacity") {
			return true;
		}
		if (enhancement.name === "Weapons of the First Legion") {
			return selectedWeapon?.range === "Melee";
		}
		if (enhancement.name === "Pennant of Remembrance") {
			return hasHazardous;
		}
		return false;
	});
}
function getDefenderEnhancementOptions(detachment, unit) {
	if (!detachment || detachment.name !== UNFORGIVEN_TASK_FORCE || unitIsEpicHero(unit)) {
		return [];
	}
	return (detachment.enhancements || []).filter((enhancement) => enhancement.name === "Pennant of Remembrance");
}
function getAttackerStratagemOptions(detachment, unit, isRangedWeapon) {
	if (!detachment) {
		return [];
	}
	return (detachment.stratagems || []).filter((stratagem) => {
		if (detachment.name === UNFORGIVEN_TASK_FORCE) {
			if (stratagem.name === "Fire Discipline") {
				return isRangedWeapon;
			}
			return stratagem.name === "Unforgiven Fury";
		}
		if (detachment.name === SAGA_OF_THE_HUNTER) {
			return stratagem.name === "Marked for Destruction" && isRangedWeapon && !unitHasKeyword(unit, "beasts");
		}
		return false;
	});
}
function getDefenderStratagemOptions(detachment, selectedWeapon) {
	if (!detachment) {
		return [];
	}
	return (detachment.stratagems || []).filter((stratagem) => {
		if (detachment.name === UNFORGIVEN_TASK_FORCE) {
			if (stratagem.name === "Armour of Contempt") {
				return Number(selectedWeapon?.ap || 0) > 0;
			}
			return stratagem.name === "Unbreakable Lines";
		}
		if (detachment.name === SAGA_OF_THE_HUNTER) {
			return stratagem.name === "Overwhelming Onslaught" && selectedWeapon?.range === "Melee";
		}
		return false;
	});
}
function formatError(error) {
	if (error?.response?.data?.detail) {
		return String(error.response.data.detail);
	}
	return error?.message || "Something went wrong.";
}
function buildSimulationPayload(state) {
	const options = {
		target_has_cover: state.targetHasCover,
		attacker_in_engagement_range: state.attackerInEngagementRange,
		target_in_engagement_range_of_allies: state.targetInEngagementRangeOfAllies,
		in_half_range: state.inHalfRange,
		oath_of_moment_active: state.oathOfMomentActive,
		charged_this_turn: state.chargedThisTurn,
		remained_stationary: state.remainedStationary,
		indirect_target_visible: state.indirectTargetVisible,
		hazardous_overwatch_charge_phase: state.hazardousOverwatchChargePhase,
		attacker_marked_for_destruction_active: state.attackerMarkedForDestructionActive,
		attacker_fire_discipline_active: state.attackerFireDisciplineActive,
		attacker_unforgiven_fury_active: state.attackerUnforgivenFuryActive,
		attacker_unforgiven_fury_army_battleshocked: state.attackerUnforgivenFuryArmyBattleshocked,
		attacker_stubborn_tenacity_active: state.attackerStubbornTenacityActive,
		attacker_weapons_of_the_first_legion_active: state.attackerWeaponsOfTheFirstLegionActive,
		attacker_pennant_of_remembrance_active: state.attackerPennantOfRemembranceActive,
		attacker_below_starting_strength: state.attackerBelowStartingStrength,
		attacker_battleshocked: state.attackerBattleshocked,
		defender_armour_of_contempt_active: state.defenderArmourOfContemptActive,
		defender_overwhelming_onslaught_active: state.defenderOverwhelmingOnslaughtActive,
		defender_unbreakable_lines_active: state.defenderUnbreakableLinesActive,
		defender_pennant_of_remembrance_active: state.defenderPennantOfRemembranceActive,
		defender_battleshocked: state.defenderBattleshocked
	};
	if (state.attachedCharacterName) {
		options.attached_character_name = state.attachedCharacterName;
	}
	if (state.hazardousBearerCurrentWounds !== "") {
		options.hazardous_bearer_current_wounds = Number(state.hazardousBearerCurrentWounds);
	}
	return {
		attacker_faction: state.attackerFaction,
		attacker_unit: state.attackerUnit,
		attacker_loadout: state.attackerLoadoutSelections || {},
		attacker_model_count: state.attackerModelCount !== "" ? Number(state.attackerModelCount) : undefined,
		weapon_name: state.weaponName,
		defender_faction: state.defenderFaction,
		defender_unit: state.defenderUnit,
		defender_loadout: state.defenderLoadoutSelections || {},
		defender_model_count: state.defenderModelCount !== "" ? Number(state.defenderModelCount) : undefined,
		attached_character_loadout: state.attachedCharacterLoadoutSelections || {},
		attached_character_model_count: state.attachedCharacterModelCount !== "" ? Number(state.attachedCharacterModelCount) : undefined,
		options
	};
}
function formatInvulnerableSave(value) {
	const text = String(value);
	return text.endsWith("+") ? `${text}+` : `${text}++`;
}
function formatRangeValue(value) {
	return String(value).replace(/\s*inches?/i, "\"");
}
function formatWeaponBaseName(name) {
	return String(name).replace(/-\s*([a-z])/, (_, firstLetter) => `- ${firstLetter.toUpperCase()}`);
}
function formatWeaponName(weapon) {
	if (!weapon) {
		return "";
	}
	if (weapon.label) {
		return weapon.label;
	}
	const keywordText = (weapon.raw_keywords || []).map((keyword) => `[${keyword}]`).join(" ");
	const formattedName = formatWeaponBaseName(weapon.name);
	return keywordText ? `${formattedName} ${keywordText}` : formattedName;
}
function weaponHasExtraAttacks(weapon) {
	return (weapon?.raw_keywords || []).includes("Extra Attacks");
}
function buildWeaponSelectionProfile(selectedWeapons, weaponName) {
	if (!selectedWeapons.length) {
		return null;
	}
	if (selectedWeapons.length === 1 && weaponName !== ALL_RANGED_WEAPONS && weaponName !== ALL_MELEE_WEAPONS) {
		return selectedWeapons[0];
	}
	const rawKeywordSet = new Set();
	const keywordSet = new Set();
	let maximumAp = 0;
	for (const weapon of selectedWeapons) {
		for (const keyword of weapon.raw_keywords || []) {
			rawKeywordSet.add(keyword);
		}
		for (const keyword of weapon.keywords || []) {
			keywordSet.add(keyword);
		}
		maximumAp = Math.max(maximumAp, Number(weapon.ap || 0));
	}
	return {
		name: weaponName,
		label: weaponName === ALL_MELEE_WEAPONS ? "All Melee Weapons" : "All Ranged Weapons",
		range: weaponName === ALL_MELEE_WEAPONS ? "Melee" : "Mixed",
		ap: maximumAp,
		ap_display: maximumAp > 0 ? `-${maximumAp}` : "0",
		raw_keywords: Array.from(rawKeywordSet),
		keywords: Array.from(keywordSet)
	};
}
function unitHasOathOfMoment(unit) {
	return (unit?.abilities || []).some((ability) => {
		const name = String(ability.name || "").toLowerCase();
		const rulesText = String(ability.rules_text || "").toLowerCase();
		return name.includes("oath of moment") || rulesText.includes("oath of moment");
	});
}
function unitGetsOathWoundBonus(unit) {
	const combinedKeywords = [...unit?.keywords || [], ...unit?.faction_keywords || []].map((keyword) => String(keyword).toLowerCase());
	return !OATH_EXCLUDED_KEYWORDS.some((keyword) => combinedKeywords.includes(keyword));
}
function getDetachmentEntry(detachment, collectionName, entryName) {
	return detachment?.[collectionName]?.find((entry) => entry.name === entryName) || null;
}
function getUnitAbility(unit, matcher) {
	return (unit?.abilities || []).find((ability) => matcher(ability)) || (unit?.wargear_abilities || []).find((ability) => matcher(ability)) || null;
}
function buildTooltip(...sections) {
	return sections.map((section) => String(section || "").trim()).filter(Boolean).join("\n\n");
}
function formatDetachmentTooltip(detachment) {
	if (!detachment) {
		return "No detachment selected.";
	}
	const restrictionText = String(detachment.restrictions || "").trim();
	return buildTooltip(detachment.rule?.name ? `${detachment.rule.name}: ${detachment.rule.rules_text || ""}` : "", restrictionText ? `Restrictions: ${restrictionText}` : "") || detachment.name;
}
function formatEnhancementTooltip(enhancement) {
	if (!enhancement) {
		return "No enhancement selected.";
	}
	const restrictionText = Array.isArray(enhancement.restrictions) ? enhancement.restrictions.join(" ") : String(enhancement.restrictions || "");
	return buildTooltip(enhancement.rules_text, restrictionText ? `Restrictions: ${restrictionText}` : "") || enhancement.name;
}
function formatStratagemTooltip(stratagem) {
	if (!stratagem) {
		return "";
	}
	return buildTooltip(stratagem.type ? `${stratagem.type} Stratagem` : "", stratagem.timing ? `When: ${stratagem.timing}` : "", stratagem.target ? `Target: ${stratagem.target}` : "", stratagem.effect ? `Effect: ${stratagem.effect}` : "") || stratagem.name;
}
function getBaseDiameterMm(unit) {
	return UNIT_BASE_DIAMETERS_MM[unit?.name] || 40;
}
function mmToInches(value) {
	return value / 25.4;
}
function clamp(value, minimum, maximum) {
	return Math.min(Math.max(value, minimum), maximum);
}
function parseWeaponRangeInches(range) {
	const match = String(range || "").match(/(\d+(\.\d+)?)/);
	return match ? Number(match[1]) : null;
}
function unitHasKeyword(unit, keyword) {
	const normalizedKeyword = String(keyword).toLowerCase();
	return [...unit?.keywords || [], ...unit?.faction_keywords || []].some((entry) => String(entry).toLowerCase() === normalizedKeyword);
}
function parsePlusValue(value) {
	const match = String(value || "").match(/(\d+)/);
	return match ? Number(match[1]) : 0;
}
function weaponHasRawKeyword(weapon, keyword) {
	return (weapon?.raw_keywords || []).some((rawKeyword) => String(rawKeyword).toLowerCase() === keyword.toLowerCase());
}
function getWeaponKeywordValue(weapon, keywordPrefix) {
	const matchingKeyword = (weapon?.raw_keywords || []).find((rawKeyword) => new RegExp(`^${keywordPrefix}\\s+(\\d+)`, "i").test(String(rawKeyword)));
	if (!matchingKeyword) {
		return 0;
	}
	const match = String(matchingKeyword).match(/(\d+)/);
	return match ? Number(match[1]) : 0;
}
function getResolvedLoadoutSelections(unitDetails, loadoutSelections) {
	return {
		...unitDetails?.selected_loadout || {},
		...loadoutSelections || {}
	};
}
function getLoadoutGroupPoolCount(unitDetails, group) {
	if (!group?.target_model) {
		return Number(unitDetails?.model_count ?? 0);
	}
	return Number(unitDetails?.model_counts_by_name?.[group.target_model] ?? 0);
}
function getLoadoutGroupMaxTotal(unitDetails, group) {
	const poolCount = getLoadoutGroupPoolCount(unitDetails, group);
	let maximumTotal = poolCount;
	if (group?.max_total_count !== undefined && group?.max_total_count !== null) {
		maximumTotal = Math.min(maximumTotal, Number(group.max_total_count) || 0);
	}
	if (group?.max_total_per_models !== undefined && group?.max_total_per_models !== null) {
		const divisor = Number(group.max_total_per_models) || 1;
		maximumTotal = Math.min(maximumTotal, Math.floor(poolCount / Math.max(1, divisor)));
	}
	return Math.max(0, maximumTotal);
}
function getLoadoutOptionMaxCount(unitDetails, group, option) {
	const poolCount = getLoadoutGroupPoolCount(unitDetails, group);
	let maximumCount = poolCount;
	if (option?.max_count !== undefined && option?.max_count !== null) {
		maximumCount = Math.min(maximumCount, Number(option.max_count) || 0);
	}
	if (option?.max_count_per_models !== undefined && option?.max_count_per_models !== null) {
		const divisor = Number(option.max_count_per_models) || 1;
		maximumCount = Math.min(maximumCount, Math.floor(poolCount / Math.max(1, divisor)));
	}
	return Math.max(0, maximumCount);
}
function getLoadoutSelectionValue(unitDetails, loadoutSelections, group) {
	const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections);
	return resolvedSelections[group.id] || group.default_option_id || group.options?.[0]?.id || "";
}
function getLoadoutCountSelectionValue(unitDetails, loadoutSelections, group, optionId) {
	const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections);
	const groupSelection = resolvedSelections[group.id];
	if (!groupSelection || typeof groupSelection !== "object") {
		return "0";
	}
	const value = groupSelection[optionId];
	return value === undefined || value === null ? "0" : String(value);
}
function getCombatWeaponOptions(unitDetails) {
	const weapons = unitDetails?.weapons || [];
	const options = [];
	const rangedWeapons = weapons.filter((weapon) => weapon.range !== "Melee");
	const meleeWeapons = weapons.filter((weapon) => weapon.range === "Melee" && !weaponHasExtraAttacks(weapon));
	if (rangedWeapons.length > 1) {
		options.push({
			name: ALL_RANGED_WEAPONS,
			label: "All Ranged Weapons",
			range: "Mixed",
			raw_keywords: [],
			keywords: []
		});
	}
	if (meleeWeapons.length > 1) {
		options.push({
			name: ALL_MELEE_WEAPONS,
			label: "All Melee Weapons",
			range: "Melee",
			raw_keywords: [],
			keywords: []
		});
	}
	return [...options, ...weapons];
}
function formatLoadoutOptionLabel(option) {
	const description = String(option?.description || "").trim();
	return description ? `${option.label} (${description})` : option.label;
}
function getUnitModelCountValue(unitDetails, modelCount) {
	if (modelCount !== "" && modelCount !== null && modelCount !== undefined) {
		return String(modelCount);
	}
	if (unitDetails?.model_count !== undefined && unitDetails?.model_count !== null) {
		return String(unitDetails.model_count);
	}
	if (unitDetails?.unit_composition?.min_models !== undefined) {
		return String(unitDetails.unit_composition.min_models);
	}
	return "1";
}
function defenderGetsCoverBenefit({ selectedWeapon, defenderUnitDetails, targetHasCover, indirectTargetVisible, attackerFireDisciplineActive }) {
	if (!selectedWeapon || selectedWeapon.range === "Melee") {
		return false;
	}
	const hasIndirectNoVisibility = weaponHasRawKeyword(selectedWeapon, "Indirect Fire") && !indirectTargetVisible;
	const hasCoverSource = targetHasCover || hasIndirectNoVisibility;
	if (!hasCoverSource) {
		return false;
	}
	const ignoresCover = weaponHasRawKeyword(selectedWeapon, "Ignores Cover") || attackerFireDisciplineActive;
	if (ignoresCover) {
		return false;
	}
	const armorSave = parsePlusValue(defenderUnitDetails?.stats?.save);
	const effectiveAp = Number(selectedWeapon?.ap || 0);
	return !(effectiveAp === 0 && armorSave > 0 && armorSave <= 3);
}
function average(values) {
	if (!values.length) {
		return 0;
	}
	return values.reduce((total, value) => total + value, 0) / values.length;
}
function formatAverage(value) {
	return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
function formatPercent(value, total) {
	if (!total) {
		return "0%";
	}
	return `${(value / total * 100).toFixed(1)}%`;
}
function sumBy(items, selector) {
	return items.reduce((total, item) => total + selector(item), 0);
}
function buildRunSummary(runs) {
	const totalRuns = runs.length;
	const targets = runs.map((run) => run.result.target);
	const combatStats = runs.map((run) => run.result.stats || {});
	const attachedCharacters = runs.map((run) => run.result.attached_character).filter(Boolean);
	const hazardousBearers = runs.map((run) => run.result.hazardous_bearer).filter(Boolean);
	return {
		totalRuns,
		targetDestroyedCount: targets.filter((item) => item.destroyed).length,
		averageTargetModelsRemaining: average(targets.map((item) => item.models_remaining)),
		averageTargetCurrentWounds: average(targets.map((item) => item.current_model_wounds)),
		attachedCharacterRuns: attachedCharacters.length,
		attachedCharacterDestroyedCount: attachedCharacters.filter((item) => item.destroyed).length,
		averageAttachedCharacterWounds: average(attachedCharacters.map((item) => item.current_model_wounds)),
		hazardousBearerRuns: hazardousBearers.length,
		hazardousBearerDestroyedCount: hazardousBearers.filter((item) => item.destroyed).length,
		averageHazardousBearerWounds: average(hazardousBearers.map((item) => item.current_model_wounds)),
		combat: {
			attackInstances: sumBy(combatStats, (stat) => stat.attack_instances || 0),
			hitRolls: sumBy(combatStats, (stat) => stat.hit_rolls || 0),
			autoHitAttacks: sumBy(combatStats, (stat) => stat.auto_hit_attacks || 0),
			successfulHitAttacks: sumBy(combatStats, (stat) => stat.successful_hit_attacks || 0),
			failedHitAttacks: sumBy(combatStats, (stat) => stat.failed_hit_attacks || 0),
			criticalHitAttacks: sumBy(combatStats, (stat) => stat.critical_hit_attacks || 0),
			extraHitsGenerated: sumBy(combatStats, (stat) => stat.extra_hits_generated || 0),
			hitRerollsUsed: sumBy(combatStats, (stat) => stat.hit_rerolls_used || 0),
			hitRerollSuccesses: sumBy(combatStats, (stat) => stat.hit_reroll_successes || 0),
			woundRolls: sumBy(combatStats, (stat) => stat.wound_rolls || 0),
			autoWounds: sumBy(combatStats, (stat) => stat.auto_wounds || 0),
			successfulWoundRolls: sumBy(combatStats, (stat) => stat.successful_wound_rolls || 0),
			failedWoundRolls: sumBy(combatStats, (stat) => stat.failed_wound_rolls || 0),
			criticalWounds: sumBy(combatStats, (stat) => stat.critical_wounds || 0),
			woundRerollsUsed: sumBy(combatStats, (stat) => stat.wound_rerolls_used || 0),
			woundRerollSuccesses: sumBy(combatStats, (stat) => stat.wound_reroll_successes || 0),
			saveAttempts: sumBy(combatStats, (stat) => stat.save_attempts || 0),
			savesPassed: sumBy(combatStats, (stat) => stat.saves_passed || 0),
			savesFailed: sumBy(combatStats, (stat) => stat.saves_failed || 0),
			unsavableWounds: sumBy(combatStats, (stat) => stat.unsavable_wounds || 0)
		}
	};
}
function getRelevantUnitRules(unit, role, hasHazardousWeapon) {
	const relevantEffectTypes = role === "attacker" ? new Set(["outgoing_wound_modifier", ...hasHazardousWeapon ? ["feel_no_pain"] : []]) : new Set(["incoming_wound_modifier", "feel_no_pain"]);
	const ruleCollections = [...unit?.abilities || [], ...unit?.wargear_abilities || []];
	return ruleCollections.filter((rule) => (rule.effects || []).some((effect) => relevantEffectTypes.has(effect.type))).map((rule) => ({
		name: rule.name,
		source: "Datasheet Ability",
		text: rule.rules_text
	}));
}
function buildAttackerActiveRules({ attackerUnitDetails, selectedWeapon, oathOfMomentActive, attackerDetachment, attackerMarkedForDestructionActive, attackerFireDisciplineActive, attackerUnforgivenFuryActive, attackerStubbornTenacityActive, attackerWeaponsOfTheFirstLegionActive, attackerPennantOfRemembranceActive, attackerBelowStartingStrength, inHalfRange, remainedStationary, chargedThisTurn, indirectTargetVisible, attackerInEngagementRange, hasHazardous }) {
	const rules = [...getRelevantUnitRules(attackerUnitDetails, "attacker", hasHazardous)];
	if (oathOfMomentActive && unitHasOathOfMoment(attackerUnitDetails)) {
		const woundBonusText = unitGetsOathWoundBonus(attackerUnitDetails) ? " Re-roll Hit rolls against the selected target, and this attack also gets +1 to the Wound roll." : " Re-roll Hit rolls against the selected target.";
		rules.unshift({
			name: "Oath of Moment",
			source: "Army Rule",
			text: `This unit is attacking its Oath of Moment target.${woundBonusText}`
		});
	}
	if (attackerFireDisciplineActive) {
		const stratagem = getDetachmentEntry(attackerDetachment, "stratagems", "Fire Discipline");
		if (stratagem) {
			rules.push({
				name: stratagem.name,
				source: `${attackerDetachment.name} Stratagem`,
				text: stratagem.effect
			});
		}
	}
	if (attackerMarkedForDestructionActive) {
		const stratagem = getDetachmentEntry(attackerDetachment, "stratagems", "Marked for Destruction");
		if (stratagem) {
			rules.push({
				name: stratagem.name,
				source: `${attackerDetachment.name} Stratagem`,
				text: stratagem.effect
			});
		}
	}
	if (attackerUnforgivenFuryActive) {
		const stratagem = getDetachmentEntry(attackerDetachment, "stratagems", "Unforgiven Fury");
		if (stratagem) {
			rules.push({
				name: stratagem.name,
				source: `${attackerDetachment.name} Stratagem`,
				text: stratagem.effect
			});
		}
	}
	if (attackerStubbornTenacityActive && attackerBelowStartingStrength) {
		const enhancement = getDetachmentEntry(attackerDetachment, "enhancements", "Stubborn Tenacity");
		if (enhancement) {
			rules.push({
				name: enhancement.name,
				source: `${attackerDetachment.name} Enhancement`,
				text: enhancement.rules_text
			});
		}
	}
	if (attackerWeaponsOfTheFirstLegionActive) {
		const enhancement = getDetachmentEntry(attackerDetachment, "enhancements", "Weapons of the First Legion");
		if (enhancement) {
			rules.push({
				name: enhancement.name,
				source: `${attackerDetachment.name} Enhancement`,
				text: enhancement.rules_text
			});
		}
	}
	if (attackerPennantOfRemembranceActive) {
		const enhancement = getDetachmentEntry(attackerDetachment, "enhancements", "Pennant of Remembrance");
		if (enhancement) {
			rules.push({
				name: enhancement.name,
				source: `${attackerDetachment.name} Enhancement`,
				text: enhancement.rules_text
			});
		}
	}
	if (selectedWeapon && inHalfRange) {
		const rapidFireValue = getWeaponKeywordValue(selectedWeapon, "Rapid Fire");
		if (rapidFireValue > 0) {
			rules.push({
				name: `Rapid Fire ${rapidFireValue}`,
				source: "Weapon Rule",
				text: `This weapon is in half range, so it gains ${rapidFireValue} additional attack${rapidFireValue === 1 ? "" : "s"}.`
			});
		}
		const meltaValue = getWeaponKeywordValue(selectedWeapon, "Melta");
		if (meltaValue > 0) {
			rules.push({
				name: `Melta ${meltaValue}`,
				source: "Weapon Rule",
				text: `This weapon is in half range, so each unsaved attack gets +${meltaValue} damage.`
			});
		}
	}
	if (selectedWeapon && remainedStationary) {
		const hasHeavyRule = weaponHasRawKeyword(selectedWeapon, "Heavy") || attackerFireDisciplineActive;
		if (hasHeavyRule && selectedWeapon.range !== "Melee") {
			rules.push({
				name: "Heavy",
				source: "Weapon Rule",
				text: "This unit remained Stationary, so this attack gets +1 to the Hit roll."
			});
		}
	}
	if (selectedWeapon && chargedThisTurn && weaponHasRawKeyword(selectedWeapon, "Lance")) {
		rules.push({
			name: "Lance",
			source: "Weapon Rule",
			text: "This unit charged this turn, so this attack gets +1 to the Wound roll."
		});
	}
	if (selectedWeapon && attackerInEngagementRange && weaponHasRawKeyword(selectedWeapon, "Pistol")) {
		rules.push({
			name: "Pistol",
			source: "Weapon Rule",
			text: "This unit is in Engagement Range, but this ranged attack is still legal because the selected weapon is a Pistol."
		});
	}
	if (selectedWeapon && weaponHasRawKeyword(selectedWeapon, "Indirect Fire") && !indirectTargetVisible) {
		rules.push({
			name: "Indirect Fire",
			source: "Weapon Rule",
			text: "This attack is being made without visibility, so it takes -1 to Hit and unmodified hit rolls of 1-3 fail."
		});
	}
	return rules;
}
function buildDefenderActiveRules({ defenderUnitDetails, selectedWeapon, defenderDetachment, defenderArmourOfContemptActive, defenderOverwhelmingOnslaughtActive, defenderUnbreakableLinesActive, defenderPennantOfRemembranceActive, targetHasCover, indirectTargetVisible, attackerFireDisciplineActive }) {
	const rules = [...getRelevantUnitRules(defenderUnitDetails, "defender", false)];
	if (defenderArmourOfContemptActive) {
		const stratagem = getDetachmentEntry(defenderDetachment, "stratagems", "Armour of Contempt");
		if (stratagem) {
			rules.push({
				name: stratagem.name,
				source: `${defenderDetachment.name} Stratagem`,
				text: stratagem.effect
			});
		}
	}
	if (defenderOverwhelmingOnslaughtActive) {
		const stratagem = getDetachmentEntry(defenderDetachment, "stratagems", "Overwhelming Onslaught");
		if (stratagem) {
			rules.push({
				name: stratagem.name,
				source: `${defenderDetachment.name} Stratagem`,
				text: stratagem.effect
			});
		}
	}
	if (defenderUnbreakableLinesActive) {
		const stratagem = getDetachmentEntry(defenderDetachment, "stratagems", "Unbreakable Lines");
		if (stratagem) {
			rules.push({
				name: stratagem.name,
				source: `${defenderDetachment.name} Stratagem`,
				text: stratagem.effect
			});
		}
	}
	if (defenderPennantOfRemembranceActive) {
		const enhancement = getDetachmentEntry(defenderDetachment, "enhancements", "Pennant of Remembrance");
		if (enhancement) {
			rules.push({
				name: enhancement.name,
				source: `${defenderDetachment.name} Enhancement`,
				text: enhancement.rules_text
			});
		}
	}
	if (defenderGetsCoverBenefit({
		selectedWeapon,
		defenderUnitDetails,
		targetHasCover,
		indirectTargetVisible,
		attackerFireDisciplineActive
	})) {
		rules.push({
			name: "Cover",
			source: "Terrain Rule",
			text: "This target gets +1 to its armor save against this ranged attack."
		});
	}
	return rules;
}
function renderStatsGrid(stats) {
	return statDisplayRows.map((row, index) => /* @__PURE__ */ _jsxDEV("div", {
		className: "stat-row",
		children: row.map(([key, label, formatValue]) => {
			const value = stats?.[key];
			if (value === undefined || value === null || value === "") {
				return null;
			}
			if (key === "save" && stats?.invulnerable_save) {
				return /* @__PURE__ */ _jsxDEV("div", {
					className: "stat-chip stat-chip-save",
					children: [
						/* @__PURE__ */ _jsxDEV("span", {
							className: "stat-label stat-label-save",
							children: label
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 862,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ _jsxDEV("strong", {
							className: "stat-value stat-value-save",
							children: formatValue ? formatValue(value) : String(value)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 863,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ _jsxDEV("strong", {
							className: "stat-value stat-value-invuln",
							children: formatInvulnerableSave(stats.invulnerable_save)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 866,
							columnNumber: 15
						}, this)
					]
				}, key, true, {
					fileName: _jsxFileName,
					lineNumber: 861,
					columnNumber: 13
				}, this);
			}
			return /* @__PURE__ */ _jsxDEV("div", {
				className: "stat-chip",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "stat-label",
					children: label
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 875,
					columnNumber: 13
				}, this), /* @__PURE__ */ _jsxDEV("strong", {
					className: "stat-value",
					children: formatValue ? formatValue(value) : String(value)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 876,
					columnNumber: 13
				}, this)]
			}, key, true, {
				fileName: _jsxFileName,
				lineNumber: 874,
				columnNumber: 11
			}, this);
		})
	}, index, false, {
		fileName: _jsxFileName,
		lineNumber: 852,
		columnNumber: 5
	}, this));
}
function renderWeaponStatsGrid(weapon) {
	if (!weapon) {
		return null;
	}
	const topRow = [
		["Range", formatRangeValue(weapon.range)],
		["A", String(weapon.attacks)],
		[weapon.skill_type || "BS", weapon.skill_display]
	];
	const bottomRow = [
		["S", String(weapon.strength)],
		["AP", weapon.ap_display],
		["D", weapon.damage_display]
	];
	return [topRow, bottomRow].map((row, index) => /* @__PURE__ */ _jsxDEV("div", {
		className: "stat-row",
		children: row.map(([label, value]) => /* @__PURE__ */ _jsxDEV("div", {
			className: "stat-chip",
			children: [/* @__PURE__ */ _jsxDEV("span", {
				className: "stat-label",
				children: label
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 907,
				columnNumber: 11
			}, this), /* @__PURE__ */ _jsxDEV("strong", {
				className: "stat-value",
				children: value
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 908,
				columnNumber: 11
			}, this)]
		}, label, true, {
			fileName: _jsxFileName,
			lineNumber: 906,
			columnNumber: 9
		}, this))
	}, index, false, {
		fileName: _jsxFileName,
		lineNumber: 904,
		columnNumber: 5
	}, this));
}
function App() {
	_s();
	const [factions, setFactions] = useState([]);
	const [attackerUnits, setAttackerUnits] = useState([]);
	const [defenderUnits, setDefenderUnits] = useState([]);
	const [attackerFactionDetails, setAttackerFactionDetails] = useState(null);
	const [defenderFactionDetails, setDefenderFactionDetails] = useState(null);
	const [attackerUnitDetails, setAttackerUnitDetails] = useState(null);
	const [defenderUnitDetails, setDefenderUnitDetails] = useState(null);
	const [attachedCharacterUnitDetails, setAttachedCharacterUnitDetails] = useState(null);
	const [simulationRuns, setSimulationRuns] = useState([]);
	const [activeRunView, setActiveRunView] = useState("summary");
	const [loading, setLoading] = useState(true);
	const [simulating, setSimulating] = useState(false);
	const [error, setError] = useState("");
	const [activePage, setActivePage] = useState("combat");
	const [armyListEntries, setArmyListEntries] = useState([]);
	const [battlefieldPositions, setBattlefieldPositions] = useState({
		attacker: {
			x: 20,
			y: 50
		},
		defender: {
			x: 80,
			y: 50
		}
	});
	const [draggingUnitId, setDraggingUnitId] = useState("");
	const [selectedBattlefieldUnitId, setSelectedBattlefieldUnitId] = useState("attacker");
	const [battlefieldCombatAttackerId, setBattlefieldCombatAttackerId] = useState("");
	const [battlefieldCombatWeaponName, setBattlefieldCombatWeaponName] = useState("");
	const battlefieldBoardRef = useRef(null);
	const [attackerFaction, setAttackerFaction] = useState("");
	const [attackerUnit, setAttackerUnit] = useState("");
	const [attackerLoadoutSelections, setAttackerLoadoutSelections] = useState({});
	const [attackerModelCount, setAttackerModelCount] = useState("");
	const [weaponName, setWeaponName] = useState("");
	const [defenderFaction, setDefenderFaction] = useState("");
	const [defenderUnit, setDefenderUnit] = useState("");
	const [defenderLoadoutSelections, setDefenderLoadoutSelections] = useState({});
	const [defenderModelCount, setDefenderModelCount] = useState("");
	const [attachedCharacterName, setAttachedCharacterName] = useState("");
	const [attachedCharacterLoadoutSelections, setAttachedCharacterLoadoutSelections] = useState({});
	const [attachedCharacterModelCount, setAttachedCharacterModelCount] = useState("");
	const [attackerDetachmentName, setAttackerDetachmentName] = useState("");
	const [defenderDetachmentName, setDefenderDetachmentName] = useState("");
	const [attackerEnhancementName, setAttackerEnhancementName] = useState("");
	const [defenderEnhancementName, setDefenderEnhancementName] = useState("");
	const [runCount, setRunCount] = useState("1");
	const [targetHasCover, setTargetHasCover] = useState(initialOptions.target_has_cover);
	const [attackerInEngagementRange, setAttackerInEngagementRange] = useState(initialOptions.attacker_in_engagement_range);
	const [targetInEngagementRangeOfAllies, setTargetInEngagementRangeOfAllies] = useState(initialOptions.target_in_engagement_range_of_allies);
	const [inHalfRange, setInHalfRange] = useState(initialOptions.in_half_range);
	const [oathOfMomentActive, setOathOfMomentActive] = useState(initialOptions.oath_of_moment_active);
	const [chargedThisTurn, setChargedThisTurn] = useState(initialOptions.charged_this_turn);
	const [remainedStationary, setRemainedStationary] = useState(initialOptions.remained_stationary);
	const [indirectTargetVisible, setIndirectTargetVisible] = useState(initialOptions.indirect_target_visible);
	const [hazardousOverwatchChargePhase, setHazardousOverwatchChargePhase] = useState(initialOptions.hazardous_overwatch_charge_phase);
	const [hazardousBearerCurrentWounds, setHazardousBearerCurrentWounds] = useState(initialOptions.hazardous_bearer_current_wounds);
	const [attackerFireDisciplineActive, setAttackerFireDisciplineActive] = useState(initialOptions.attacker_fire_discipline_active);
	const [attackerMarkedForDestructionActive, setAttackerMarkedForDestructionActive] = useState(initialOptions.attacker_marked_for_destruction_active);
	const [attackerUnforgivenFuryActive, setAttackerUnforgivenFuryActive] = useState(initialOptions.attacker_unforgiven_fury_active);
	const [attackerUnforgivenFuryArmyBattleshocked, setAttackerUnforgivenFuryArmyBattleshocked] = useState(initialOptions.attacker_unforgiven_fury_army_battleshocked);
	const [attackerStubbornTenacityActive, setAttackerStubbornTenacityActive] = useState(initialOptions.attacker_stubborn_tenacity_active);
	const [attackerWeaponsOfTheFirstLegionActive, setAttackerWeaponsOfTheFirstLegionActive] = useState(initialOptions.attacker_weapons_of_the_first_legion_active);
	const [attackerPennantOfRemembranceActive, setAttackerPennantOfRemembranceActive] = useState(initialOptions.attacker_pennant_of_remembrance_active);
	const [attackerBelowStartingStrength, setAttackerBelowStartingStrength] = useState(initialOptions.attacker_below_starting_strength);
	const [attackerBattleshocked, setAttackerBattleshocked] = useState(initialOptions.attacker_battleshocked);
	const [defenderArmourOfContemptActive, setDefenderArmourOfContemptActive] = useState(initialOptions.defender_armour_of_contempt_active);
	const [defenderOverwhelmingOnslaughtActive, setDefenderOverwhelmingOnslaughtActive] = useState(initialOptions.defender_overwhelming_onslaught_active);
	const [defenderUnbreakableLinesActive, setDefenderUnbreakableLinesActive] = useState(initialOptions.defender_unbreakable_lines_active);
	const [defenderPennantOfRemembranceActive, setDefenderPennantOfRemembranceActive] = useState(initialOptions.defender_pennant_of_remembrance_active);
	const [defenderBattleshocked, setDefenderBattleshocked] = useState(initialOptions.defender_battleshocked);
	useEffect(() => {
		async function loadFactions() {
			try {
				setLoading(true);
				const data = await fetchFactions();
				const items = data.items || [];
				setFactions(items);
				if (items[0]) {
					setAttackerFaction(items[0].name);
					setDefenderFaction(items[0].name);
				}
			} catch (requestError) {
				setError(formatError(requestError));
			} finally {
				setLoading(false);
			}
		}
		loadFactions();
	}, []);
	useEffect(() => {
		if (!attackerFaction) {
			return;
		}
		let active = true;
		setAttackerUnitDetails(null);
		setWeaponName("");
		async function loadAttackerUnits() {
			try {
				const data = await fetchUnits(attackerFaction);
				if (!active) {
					return;
				}
				const items = data.items || [];
				setAttackerUnits(items);
				setAttackerUnit((currentUnit) => items.some((unit) => unit.name === currentUnit) ? currentUnit : items[0]?.name || "");
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadAttackerUnits();
		return () => {
			active = false;
		};
	}, [attackerFaction]);
	useEffect(() => {
		if (!attackerFaction) {
			return;
		}
		let active = true;
		async function loadAttackerFactionDetails() {
			try {
				const data = await fetchFactionDetails(attackerFaction);
				if (!active) {
					return;
				}
				setAttackerFactionDetails(data);
				setAttackerDetachmentName((currentDetachment) => data.detachments?.some((detachment) => detachment.name === currentDetachment) ? currentDetachment : data.detachments?.[0]?.name || "");
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadAttackerFactionDetails();
		return () => {
			active = false;
		};
	}, [attackerFaction]);
	useEffect(() => {
		if (!defenderFaction) {
			return;
		}
		let active = true;
		setDefenderUnitDetails(null);
		setAttachedCharacterName("");
		async function loadDefenderUnits() {
			try {
				const data = await fetchUnits(defenderFaction);
				if (!active) {
					return;
				}
				const items = data.items || [];
				setDefenderUnits(items);
				setDefenderUnit((currentUnit) => items.some((unit) => unit.name === currentUnit) ? currentUnit : items[0]?.name || "");
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadDefenderUnits();
		return () => {
			active = false;
		};
	}, [defenderFaction]);
	useEffect(() => {
		if (!defenderFaction) {
			return;
		}
		let active = true;
		async function loadDefenderFactionDetails() {
			try {
				const data = await fetchFactionDetails(defenderFaction);
				if (!active) {
					return;
				}
				setDefenderFactionDetails(data);
				setDefenderDetachmentName((currentDetachment) => data.detachments?.some((detachment) => detachment.name === currentDetachment) ? currentDetachment : data.detachments?.[0]?.name || "");
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadDefenderFactionDetails();
		return () => {
			active = false;
		};
	}, [defenderFaction]);
	useEffect(() => {
		setAttackerLoadoutSelections({});
		setAttackerModelCount("");
	}, [attackerFaction, attackerUnit]);
	useEffect(() => {
		setDefenderLoadoutSelections({});
		setDefenderModelCount("");
	}, [defenderFaction, defenderUnit]);
	useEffect(() => {
		setAttachedCharacterLoadoutSelections({});
		setAttachedCharacterModelCount("");
		setAttachedCharacterUnitDetails(null);
	}, [attachedCharacterName]);
	useEffect(() => {
		if (!attackerFaction || !attackerUnit || !attackerUnits.some((unit) => unit.name === attackerUnit)) {
			return;
		}
		let active = true;
		async function loadAttackerUnitDetails() {
			try {
				const data = await fetchUnitDetailsWithLoadout(attackerFaction, attackerUnit, attackerLoadoutSelections, attackerModelCount);
				if (!active) {
					return;
				}
				setAttackerUnitDetails(data);
				setAttackerModelCount((currentModelCount) => {
					const currentValue = currentModelCount === "" ? null : Number(currentModelCount);
					const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1);
					const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels);
					if (currentValue === null || Number.isNaN(currentValue) || currentValue < minimumModels || currentValue > maximumModels) {
						return String(data.model_count ?? minimumModels);
					}
					return currentModelCount;
				});
				setWeaponName((currentWeapon) => data.weapons?.some((weapon) => weapon.name === currentWeapon) || currentWeapon === ALL_RANGED_WEAPONS && (data.weapons || []).filter((weapon) => weapon.range !== "Melee").length > 1 || currentWeapon === ALL_MELEE_WEAPONS && (data.weapons || []).filter((weapon) => weapon.range === "Melee" && !weaponHasExtraAttacks(weapon)).length > 1 ? currentWeapon : getCombatWeaponOptions(data)[0]?.name || "");
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadAttackerUnitDetails();
		return () => {
			active = false;
		};
	}, [
		attackerFaction,
		attackerLoadoutSelections,
		attackerModelCount,
		attackerUnit,
		attackerUnits
	]);
	useEffect(() => {
		if (!defenderFaction || !defenderUnit || !defenderUnits.some((unit) => unit.name === defenderUnit)) {
			return;
		}
		let active = true;
		async function loadDefenderUnitDetails() {
			try {
				const data = await fetchUnitDetailsWithLoadout(defenderFaction, defenderUnit, defenderLoadoutSelections, defenderModelCount);
				if (!active) {
					return;
				}
				setDefenderUnitDetails(data);
				setDefenderModelCount((currentModelCount) => {
					const currentValue = currentModelCount === "" ? null : Number(currentModelCount);
					const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1);
					const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels);
					if (currentValue === null || Number.isNaN(currentValue) || currentValue < minimumModels || currentValue > maximumModels) {
						return String(data.model_count ?? minimumModels);
					}
					return currentModelCount;
				});
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadDefenderUnitDetails();
		return () => {
			active = false;
		};
	}, [
		defenderFaction,
		defenderLoadoutSelections,
		defenderModelCount,
		defenderUnit,
		defenderUnits
	]);
	useEffect(() => {
		if (!canUsePrecision || !attachedCharacterName || !defenderFaction || !attachedCharacterOptions.some((unit) => unit.name === attachedCharacterName)) {
			return;
		}
		let active = true;
		async function loadAttachedCharacterUnitDetails() {
			try {
				const data = await fetchUnitDetailsWithLoadout(defenderFaction, attachedCharacterName, attachedCharacterLoadoutSelections, attachedCharacterModelCount);
				if (!active) {
					return;
				}
				setAttachedCharacterUnitDetails(data);
				setAttachedCharacterModelCount((currentModelCount) => {
					const currentValue = currentModelCount === "" ? null : Number(currentModelCount);
					const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1);
					const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels);
					if (currentValue === null || Number.isNaN(currentValue) || currentValue < minimumModels || currentValue > maximumModels) {
						return String(data.model_count ?? minimumModels);
					}
					return currentModelCount;
				});
				setError("");
			} catch (requestError) {
				if (active) {
					setError(formatError(requestError));
				}
			}
		}
		loadAttachedCharacterUnitDetails();
		return () => {
			active = false;
		};
	}, [
		attachedCharacterLoadoutSelections,
		attachedCharacterModelCount,
		attachedCharacterName,
		attachedCharacterOptions,
		canUsePrecision,
		defenderFaction
	]);
	const combatWeaponOptions = useMemo(() => getCombatWeaponOptions(attackerUnitDetails), [attackerUnitDetails]);
	const selectedAttackWeapons = useMemo(() => {
		const weapons = attackerUnitDetails?.weapons || [];
		if (weaponName === ALL_RANGED_WEAPONS) {
			return weapons.filter((weapon) => weapon.range !== "Melee");
		}
		if (weaponName === ALL_MELEE_WEAPONS) {
			return weapons.filter((weapon) => weapon.range === "Melee" && !weaponHasExtraAttacks(weapon));
		}
		return weapons.filter((weapon) => weapon.name === weaponName);
	}, [attackerUnitDetails, weaponName]);
	const selectedWeapon = useMemo(() => buildWeaponSelectionProfile(selectedAttackWeapons, weaponName), [selectedAttackWeapons, weaponName]);
	const selectedAttackerDetachment = useMemo(() => getDetachmentByName(attackerFactionDetails, attackerDetachmentName), [attackerFactionDetails, attackerDetachmentName]);
	const selectedDefenderDetachment = useMemo(() => getDetachmentByName(defenderFactionDetails, defenderDetachmentName), [defenderFactionDetails, defenderDetachmentName]);
	const resolvedAttackerLoadoutSelections = useMemo(() => getResolvedLoadoutSelections(attackerUnitDetails, attackerLoadoutSelections), [attackerLoadoutSelections, attackerUnitDetails]);
	const resolvedDefenderLoadoutSelections = useMemo(() => getResolvedLoadoutSelections(defenderUnitDetails, defenderLoadoutSelections), [defenderLoadoutSelections, defenderUnitDetails]);
	const resolvedAttachedCharacterLoadoutSelections = useMemo(() => getResolvedLoadoutSelections(attachedCharacterUnitDetails, attachedCharacterLoadoutSelections), [attachedCharacterLoadoutSelections, attachedCharacterUnitDetails]);
	const isRangedWeapon = selectedAttackWeapons.length > 0 && selectedAttackWeapons.every((weapon) => weapon.range !== "Melee");
	const isMeleeWeapon = selectedAttackWeapons.length > 0 && selectedAttackWeapons.every((weapon) => weapon.range === "Melee");
	const hasHeavy = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, "Heavy"));
	const hasBlast = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, "Blast"));
	const hasIndirectFire = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, "Indirect Fire"));
	const hasHazardous = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, "Hazardous"));
	const canUsePrecision = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, "Precision"));
	const canUseLance = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, "Lance"));
	const attachedCharacterOptions = useMemo(() => {
		if (!defenderUnit || !defenderFactionDetails?.units?.length) {
			return [];
		}
		return defenderFactionDetails.units.filter((unit) => {
			const canLead = unit.leader?.can_lead || [];
			return unit.name !== defenderUnit && canLead.includes(defenderUnit);
		});
	}, [defenderFactionDetails, defenderUnit]);
	const canUseCover = isRangedWeapon;
	const canUseHalfRange = isRangedWeapon && (selectedAttackWeapons.some((weapon) => getWeaponKeywordValue(weapon, "Rapid Fire") > 0) || selectedAttackWeapons.some((weapon) => getWeaponKeywordValue(weapon, "Melta") > 0));
	const hasOathOfMoment = unitHasOathOfMoment(attackerUnitDetails);
	const attackerEnhancementOptions = useMemo(() => getAttackerEnhancementOptions(selectedAttackerDetachment, attackerUnitDetails, selectedWeapon, hasHazardous), [
		selectedAttackerDetachment,
		attackerUnitDetails,
		selectedWeapon,
		hasHazardous
	]);
	const defenderEnhancementOptions = useMemo(() => getDefenderEnhancementOptions(selectedDefenderDetachment, defenderUnitDetails), [selectedDefenderDetachment, defenderUnitDetails]);
	const attackerStratagemOptions = useMemo(() => getAttackerStratagemOptions(selectedAttackerDetachment, attackerUnitDetails, isRangedWeapon), [
		selectedAttackerDetachment,
		attackerUnitDetails,
		isRangedWeapon
	]);
	const defenderStratagemOptions = useMemo(() => getDefenderStratagemOptions(selectedDefenderDetachment, selectedWeapon), [selectedDefenderDetachment, selectedWeapon]);
	const canUseAttackerFireDiscipline = attackerStratagemOptions.some((item) => item.name === "Fire Discipline");
	const canUseAttackerMarkedForDestruction = attackerStratagemOptions.some((item) => item.name === "Marked for Destruction");
	const canUseAttackerUnforgivenFury = attackerStratagemOptions.some((item) => item.name === "Unforgiven Fury");
	const canUseDefenderArmourOfContempt = defenderStratagemOptions.some((item) => item.name === "Armour of Contempt");
	const canUseDefenderOverwhelmingOnslaught = defenderStratagemOptions.some((item) => item.name === "Overwhelming Onslaught");
	const canUseDefenderUnbreakableLines = defenderStratagemOptions.some((item) => item.name === "Unbreakable Lines");
	const selectedAttackerEnhancement = useMemo(() => getDetachmentEntry(selectedAttackerDetachment, "enhancements", attackerEnhancementName), [selectedAttackerDetachment, attackerEnhancementName]);
	const selectedDefenderEnhancement = useMemo(() => getDetachmentEntry(selectedDefenderDetachment, "enhancements", defenderEnhancementName), [selectedDefenderDetachment, defenderEnhancementName]);
	const fireDisciplineEntry = useMemo(() => getDetachmentEntry(selectedAttackerDetachment, "stratagems", "Fire Discipline"), [selectedAttackerDetachment]);
	const markedForDestructionEntry = useMemo(() => getDetachmentEntry(selectedAttackerDetachment, "stratagems", "Marked for Destruction"), [selectedAttackerDetachment]);
	const unforgivenFuryEntry = useMemo(() => getDetachmentEntry(selectedAttackerDetachment, "stratagems", "Unforgiven Fury"), [selectedAttackerDetachment]);
	const armourOfContemptEntry = useMemo(() => getDetachmentEntry(selectedDefenderDetachment, "stratagems", "Armour of Contempt"), [selectedDefenderDetachment]);
	const overwhelmingOnslaughtEntry = useMemo(() => getDetachmentEntry(selectedDefenderDetachment, "stratagems", "Overwhelming Onslaught"), [selectedDefenderDetachment]);
	const unbreakableLinesEntry = useMemo(() => getDetachmentEntry(selectedDefenderDetachment, "stratagems", "Unbreakable Lines"), [selectedDefenderDetachment]);
	const oathAbility = useMemo(() => getUnitAbility(attackerUnitDetails, (ability) => {
		const name = String(ability.name || "").toLowerCase();
		const rulesText = String(ability.rules_text || "").toLowerCase();
		return name.includes("oath of moment") || rulesText.includes("oath of moment");
	}), [attackerUnitDetails]);
	const rapidFireValue = selectedAttackWeapons.reduce((maximumValue, weapon) => Math.max(maximumValue, getWeaponKeywordValue(weapon, "Rapid Fire")), 0);
	const meltaValue = selectedAttackWeapons.reduce((maximumValue, weapon) => Math.max(maximumValue, getWeaponKeywordValue(weapon, "Melta")), 0);
	const attackerDetachmentTooltip = formatDetachmentTooltip(selectedAttackerDetachment);
	const defenderDetachmentTooltip = formatDetachmentTooltip(selectedDefenderDetachment);
	const attackerEnhancementTooltip = formatEnhancementTooltip(selectedAttackerEnhancement);
	const defenderEnhancementTooltip = formatEnhancementTooltip(selectedDefenderEnhancement);
	const fireDisciplineTooltip = formatStratagemTooltip(fireDisciplineEntry);
	const markedForDestructionTooltip = formatStratagemTooltip(markedForDestructionEntry);
	const unforgivenFuryTooltip = formatStratagemTooltip(unforgivenFuryEntry);
	const armourOfContemptTooltip = formatStratagemTooltip(armourOfContemptEntry);
	const overwhelmingOnslaughtTooltip = formatStratagemTooltip(overwhelmingOnslaughtEntry);
	const unbreakableLinesTooltip = formatStratagemTooltip(unbreakableLinesEntry);
	const oathTooltip = buildTooltip(OATH_OF_MOMENT_RULE_TEXT, unitGetsOathWoundBonus(attackerUnitDetails) ? OATH_OF_MOMENT_CODEX_RIDER_TEXT : "", oathAbility?.rules_text && oathAbility.rules_text !== "Oath of Moment" ? `Datasheet entry: ${oathAbility.rules_text}` : "");
	const halfRangeTooltip = buildTooltip(rapidFireValue > 0 ? `Rapid Fire ${rapidFireValue}: if the target is in half range, this weapon gains ${rapidFireValue} additional attack${rapidFireValue === 1 ? "" : "s"}.` : "", meltaValue > 0 ? `Melta ${meltaValue}: if the target is in half range, each unsaved attack gets +${meltaValue} damage.` : "");
	const coverTooltip = "Benefit of Cover improves the armor save by 1 against ranged attacks. It does not improve invulnerable saves and does not help a 3+ or better save against AP 0.";
	const engagementTooltip = weaponHasRawKeyword(selectedWeapon, "Pistol") ? "Pistol: this ranged attack can still be made while the attacker is in Engagement Range, but it must target an enemy unit within Engagement Range." : "Non-Pistol ranged weapons are usually not allowed while the attacker is in Engagement Range unless the attacker is a Monster or Vehicle.";
	const heavyTooltip = "Heavy: if the unit remained Stationary, add 1 to the Hit roll for this attack.";
	const blastTooltip = "Blast: this weapon cannot target a unit that is within Engagement Range of allied units.";
	function renderLoadoutSelectors(sideLabel, unitDetails, loadoutSelections, setLoadoutSelections) {
		if (!unitDetails?.loadout_options?.length) {
			return null;
		}
		return /* @__PURE__ */ _jsxDEV("div", {
			className: "cluster two-up",
			children: unitDetails.loadout_options.map((group) => {
				if (group.selection_type === "count") {
					const maximumTotal = getLoadoutGroupMaxTotal(unitDetails, group);
					const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections);
					const currentGroupSelection = resolvedSelections[group.id] && typeof resolvedSelections[group.id] === "object" ? resolvedSelections[group.id] : {};
					const currentTotal = Object.values(currentGroupSelection).reduce((sum, value) => sum + (Number(value) || 0), 0);
					return /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("span", { children: `${sideLabel} ${group.label}` }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1529,
						columnNumber: 17
					}, this), (group.options || []).map((option) => {
						const maximumCount = getLoadoutOptionMaxCount(unitDetails, group, option);
						const currentValue = Number(getLoadoutCountSelectionValue(unitDetails, loadoutSelections, group, option.id)) || 0;
						const remainingAllowance = Math.max(0, maximumTotal - (currentTotal - currentValue));
						const inputMaximum = Math.min(maximumCount, remainingAllowance);
						return /* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: formatLoadoutOptionLabel(option) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1538,
							columnNumber: 23
						}, this), /* @__PURE__ */ _jsxDEV("input", {
							type: "number",
							min: "0",
							max: String(inputMaximum),
							value: String(currentValue),
							onChange: (event) => {
								const nextValue = Math.max(0, Math.min(inputMaximum, Number(event.target.value) || 0));
								setLoadoutSelections((currentSelections) => {
									const existingGroupSelection = currentSelections[group.id] && typeof currentSelections[group.id] === "object" ? currentSelections[group.id] : currentGroupSelection;
									const nextGroupSelection = {
										...existingGroupSelection,
										[option.id]: nextValue
									};
									if (nextValue <= 0) {
										delete nextGroupSelection[option.id];
									}
									return {
										...currentSelections,
										[group.id]: nextGroupSelection
									};
								});
							}
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1539,
							columnNumber: 23
						}, this)] }, `${sideLabel}-${group.id}-${option.id}`, true, {
							fileName: _jsxFileName,
							lineNumber: 1537,
							columnNumber: 21
						}, this);
					})] }, `${sideLabel}-${group.id}`, true, {
						fileName: _jsxFileName,
						lineNumber: 1528,
						columnNumber: 15
					}, this);
				}
				return /* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: `${sideLabel} ${group.label}` }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1580,
					columnNumber: 15
				}, this), /* @__PURE__ */ _jsxDEV("select", {
					value: getLoadoutSelectionValue(unitDetails, loadoutSelections, group),
					onChange: (event) => {
						const nextOptionId = event.target.value;
						setLoadoutSelections((currentSelections) => ({
							...currentSelections,
							[group.id]: nextOptionId
						}));
					},
					children: (group.options || []).map((option) => /* @__PURE__ */ _jsxDEV("option", {
						value: option.id,
						title: formatLoadoutOptionLabel(option),
						children: formatLoadoutOptionLabel(option)
					}, option.id, false, {
						fileName: _jsxFileName,
						lineNumber: 1592,
						columnNumber: 19
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1581,
					columnNumber: 15
				}, this)] }, `${sideLabel}-${group.id}`, true, {
					fileName: _jsxFileName,
					lineNumber: 1579,
					columnNumber: 13
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1514,
			columnNumber: 7
		}, this);
	}
	function renderModelCountSelector(sideLabel, unitDetails, modelCount, setModelCount) {
		const minimumModels = Number(unitDetails?.unit_composition?.min_models ?? 1);
		const maximumModels = Number(unitDetails?.unit_composition?.max_models ?? minimumModels);
		if (!unitDetails || maximumModels <= minimumModels) {
			return null;
		}
		const options = Array.from({ length: maximumModels - minimumModels + 1 }, (_, index) => String(minimumModels + index));
		return /* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: `${sideLabel} Squad Size` }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1622,
			columnNumber: 9
		}, this), /* @__PURE__ */ _jsxDEV("select", {
			value: getUnitModelCountValue(unitDetails, modelCount),
			onChange: (event) => setModelCount(event.target.value),
			children: options.map((option) => /* @__PURE__ */ _jsxDEV("option", {
				value: option,
				children: [option, " models"]
			}, `${sideLabel}-${option}`, true, {
				fileName: _jsxFileName,
				lineNumber: 1628,
				columnNumber: 13
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1623,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1621,
			columnNumber: 7
		}, this);
	}
	useEffect(() => {
		const attachedCharacterStillValid = attachedCharacterOptions.some((unit) => unit.name === attachedCharacterName);
		if (canUsePrecision && (!attachedCharacterName || attachedCharacterStillValid)) {
			return;
		}
		if (attachedCharacterName && (!canUsePrecision || !attachedCharacterStillValid)) {
			setAttachedCharacterName("");
		}
		if (attachedCharacterUnitDetails) {
			setAttachedCharacterUnitDetails(null);
		}
		if (Object.keys(attachedCharacterLoadoutSelections).length) {
			setAttachedCharacterLoadoutSelections({});
		}
		if (attachedCharacterModelCount !== "") {
			setAttachedCharacterModelCount("");
		}
	}, [
		attachedCharacterLoadoutSelections,
		attachedCharacterModelCount,
		attachedCharacterName,
		attachedCharacterOptions,
		attachedCharacterUnitDetails,
		canUsePrecision
	]);
	const indirectTooltip = "Indirect Fire: if no defender models are visible, the attack takes -1 to Hit, hit rolls of 1-3 always fail, and the defender gets the benefit of cover.";
	const lanceTooltip = "Lance: if the bearer made a charge move this turn, add 1 to the Wound roll for this attack.";
	const attackerArmyBattleshockTooltip = "Unforgiven Fury: if one or more Adeptus Astartes units from your army are Battle-shocked, successful unmodified Hit rolls of 5+ score a Critical Hit until the end of the phase.";
	const attackerBelowStartingStrengthTooltip = attackerEnhancementTooltip;
	const attackerBattleshockedTooltip = buildTooltip(attackerEnhancementName === "Weapons of the First Legion" ? "Weapons of the First Legion improves further while the bearer is Battle-shocked." : "", attackerEnhancementName === "Pennant of Remembrance" ? "Pennant of Remembrance improves Feel No Pain while the bearer is Battle-shocked." : "", attackerEnhancementName === "Stubborn Tenacity" ? "Stubborn Tenacity can add an additional +1 to Wound while the bearer is Battle-shocked and below Starting Strength." : "");
	const defenderBattleshockedTooltip = defenderEnhancementTooltip;
	const attachedCharacterTooltip = "Precision: successful wounds from this attack can be allocated to the attached Character first.";
	const hazardousOverwatchTooltip = "If this Hazardous weapon was used for Fire Overwatch in the opponent charge phase, the self-inflicted mortal wounds are allocated after the charging unit ends its charge move.";
	const hazardousBearerTooltip = "Set the current wounds on the Hazardous bearer so self-damage is allocated against the correct model state.";
	const attackerActiveRules = useMemo(() => buildAttackerActiveRules({
		attackerUnitDetails,
		selectedWeapon,
		oathOfMomentActive,
		attackerDetachment: selectedAttackerDetachment,
		attackerMarkedForDestructionActive,
		attackerFireDisciplineActive,
		attackerUnforgivenFuryActive,
		attackerStubbornTenacityActive,
		attackerWeaponsOfTheFirstLegionActive,
		attackerPennantOfRemembranceActive,
		attackerBelowStartingStrength,
		inHalfRange,
		remainedStationary,
		chargedThisTurn,
		indirectTargetVisible,
		attackerInEngagementRange,
		hasHazardous
	}), [
		attackerUnitDetails,
		selectedWeapon,
		oathOfMomentActive,
		selectedAttackerDetachment,
		attackerMarkedForDestructionActive,
		attackerFireDisciplineActive,
		attackerUnforgivenFuryActive,
		attackerStubbornTenacityActive,
		attackerWeaponsOfTheFirstLegionActive,
		attackerPennantOfRemembranceActive,
		attackerBelowStartingStrength,
		inHalfRange,
		remainedStationary,
		chargedThisTurn,
		indirectTargetVisible,
		attackerInEngagementRange,
		hasHazardous
	]);
	const defenderActiveRules = useMemo(() => buildDefenderActiveRules({
		defenderUnitDetails,
		selectedWeapon,
		defenderDetachment: selectedDefenderDetachment,
		defenderArmourOfContemptActive,
		defenderOverwhelmingOnslaughtActive,
		defenderUnbreakableLinesActive,
		defenderPennantOfRemembranceActive,
		targetHasCover,
		indirectTargetVisible,
		attackerFireDisciplineActive
	}), [
		defenderUnitDetails,
		selectedWeapon,
		selectedDefenderDetachment,
		defenderArmourOfContemptActive,
		defenderOverwhelmingOnslaughtActive,
		defenderUnbreakableLinesActive,
		defenderPennantOfRemembranceActive,
		targetHasCover,
		indirectTargetVisible,
		attackerFireDisciplineActive
	]);
	const summaryStats = useMemo(() => buildRunSummary(simulationRuns), [simulationRuns]);
	const activeRun = useMemo(() => {
		if (activeRunView === "summary") {
			return null;
		}
		return simulationRuns.find((run) => run.runIndex === activeRunView) || null;
	}, [activeRunView, simulationRuns]);
	const battlefieldUnits = useMemo(() => {
		const attackerBaseMm = getBaseDiameterMm(attackerUnitDetails);
		const defenderBaseMm = getBaseDiameterMm(defenderUnitDetails);
		return [attackerUnitDetails ? {
			id: "attacker",
			role: "Attacker",
			name: attackerUnitDetails.name,
			faction: attackerFaction,
			baseMm: attackerBaseMm,
			baseInches: mmToInches(attackerBaseMm),
			x: 20,
			y: 50
		} : null, defenderUnitDetails ? {
			id: "defender",
			role: "Defender",
			name: defenderUnitDetails.name,
			faction: defenderFaction,
			baseMm: defenderBaseMm,
			baseInches: mmToInches(defenderBaseMm),
			x: 80,
			y: 50
		} : null].filter(Boolean);
	}, [
		attackerFaction,
		attackerUnitDetails,
		defenderFaction,
		defenderUnitDetails
	]);
	const battlefieldUnitMap = useMemo(() => Object.fromEntries(battlefieldUnits.map((unit) => [unit.id, unit])), [battlefieldUnits]);
	const selectedBattlefieldUnit = battlefieldUnitMap[selectedBattlefieldUnitId] || battlefieldUnits[0] || null;
	const enemyBattlefieldUnit = selectedBattlefieldUnit ? battlefieldUnits.find((unit) => unit.id !== selectedBattlefieldUnit.id) || null : null;
	const battlefieldCenterDistanceInches = useMemo(() => {
		if (!selectedBattlefieldUnit || !enemyBattlefieldUnit) {
			return null;
		}
		const selectedPosition = battlefieldPositions[selectedBattlefieldUnit.id] || selectedBattlefieldUnit;
		const enemyPosition = battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit;
		const dxInches = Math.abs(enemyPosition.x - selectedPosition.x) * BATTLEFIELD_WIDTH_INCHES / 100;
		const dyInches = Math.abs(enemyPosition.y - selectedPosition.y) * BATTLEFIELD_HEIGHT_INCHES / 100;
		return Math.hypot(dxInches, dyInches);
	}, [
		battlefieldPositions,
		enemyBattlefieldUnit,
		selectedBattlefieldUnit
	]);
	const battlefieldEdgeDistanceInches = useMemo(() => {
		if (battlefieldCenterDistanceInches === null || !selectedBattlefieldUnit || !enemyBattlefieldUnit) {
			return null;
		}
		const totalBaseRadius = selectedBattlefieldUnit.baseInches / 2 + enemyBattlefieldUnit.baseInches / 2;
		return Math.max(0, battlefieldCenterDistanceInches - totalBaseRadius);
	}, [
		battlefieldCenterDistanceInches,
		enemyBattlefieldUnit,
		selectedBattlefieldUnit
	]);
	const selectedBattlefieldUnitDetails = selectedBattlefieldUnit?.id === "attacker" ? attackerUnitDetails : selectedBattlefieldUnit?.id === "defender" ? defenderUnitDetails : null;
	const battlefieldInEngagementRange = battlefieldEdgeDistanceInches !== null && battlefieldEdgeDistanceInches <= 1;
	const selectedBattlefieldWeaponRanges = useMemo(() => (selectedBattlefieldUnitDetails?.weapons || []).map((weapon) => {
		const rangeInches = parseWeaponRangeInches(weapon.range);
		const hasHalfRangeRule = getWeaponKeywordValue(weapon, "Rapid Fire") > 0 || getWeaponKeywordValue(weapon, "Melta") > 0;
		return rangeInches ? {
			...weapon,
			rangeInches,
			hasHalfRangeRule,
			halfRangeInches: rangeInches / 2,
			totalDiameterInches: rangeInches * 2 + (selectedBattlefieldUnit?.baseInches || 0)
		} : null;
	}).filter(Boolean), [selectedBattlefieldUnit, selectedBattlefieldUnitDetails]);
	const selectedBattlefieldMeleeWeapons = useMemo(() => (selectedBattlefieldUnitDetails?.weapons || []).filter((weapon) => weapon.range === "Melee"), [selectedBattlefieldUnitDetails]);
	const selectedBattlefieldPistolWeapons = useMemo(() => (selectedBattlefieldUnitDetails?.weapons || []).filter((weapon) => weapon.range !== "Melee" && weaponHasRawKeyword(weapon, "Pistol")), [selectedBattlefieldUnitDetails]);
	const inRangeWeaponNames = useMemo(() => {
		if (battlefieldEdgeDistanceInches === null || battlefieldInEngagementRange) {
			return [];
		}
		return selectedBattlefieldWeaponRanges.filter((weapon) => battlefieldEdgeDistanceInches <= weapon.rangeInches).map((weapon) => formatWeaponName(weapon));
	}, [
		battlefieldEdgeDistanceInches,
		battlefieldInEngagementRange,
		selectedBattlefieldWeaponRanges
	]);
	const halfRangeWeaponNames = useMemo(() => {
		if (battlefieldEdgeDistanceInches === null || battlefieldInEngagementRange) {
			return [];
		}
		return selectedBattlefieldWeaponRanges.filter((weapon) => weapon.hasHalfRangeRule && battlefieldEdgeDistanceInches <= weapon.halfRangeInches).map((weapon) => formatWeaponName(weapon));
	}, [
		battlefieldEdgeDistanceInches,
		battlefieldInEngagementRange,
		selectedBattlefieldWeaponRanges
	]);
	const showBattlefieldRangeLine = !battlefieldInEngagementRange && inRangeWeaponNames.length > 0 && selectedBattlefieldUnit && enemyBattlefieldUnit;
	const battlefieldCombatOptions = useMemo(() => {
		if (battlefieldEdgeDistanceInches === null) {
			return [];
		}
		return battlefieldUnits.map((unit) => {
			const attackerDetails = unit.id === "attacker" ? attackerUnitDetails : defenderUnitDetails;
			const defenderDetails = unit.id === "attacker" ? defenderUnitDetails : attackerUnitDetails;
			const defender = battlefieldUnits.find((candidate) => candidate.id !== unit.id);
			if (!attackerDetails || !defenderDetails || !defender) {
				return null;
			}
			const canFireNonPistolInEngagement = unitHasKeyword(attackerDetails, "Monster") || unitHasKeyword(attackerDetails, "Vehicle");
			const eligibleWeapons = (attackerDetails.weapons || []).filter((weapon) => {
				if (battlefieldInEngagementRange) {
					if (weapon.range === "Melee") {
						return true;
					}
					return weaponHasRawKeyword(weapon, "Pistol") || canFireNonPistolInEngagement;
				}
				if (weapon.range === "Melee") {
					return false;
				}
				const rangeInches = parseWeaponRangeInches(weapon.range);
				return rangeInches !== null && battlefieldEdgeDistanceInches <= rangeInches;
			});
			if (!eligibleWeapons.length) {
				return null;
			}
			return {
				id: unit.id,
				attackerFaction: unit.faction,
				attackerName: unit.name,
				attackerDetails,
				defenderFaction: defender.faction,
				defenderName: defender.name,
				defenderDetails,
				eligibleWeapons
			};
		}).filter(Boolean);
	}, [
		attackerUnitDetails,
		battlefieldEdgeDistanceInches,
		battlefieldInEngagementRange,
		battlefieldUnits,
		defenderUnitDetails
	]);
	const selectedBattlefieldCombatant = battlefieldCombatOptions.find((option) => option.id === battlefieldCombatAttackerId) || battlefieldCombatOptions[0] || null;
	const battlefieldCombatWeaponOptions = useMemo(() => selectedBattlefieldCombatant?.eligibleWeapons || [], [selectedBattlefieldCombatant]);
	const selectedBattlefieldCombatWeapon = battlefieldCombatWeaponOptions.find((weapon) => weapon.name === battlefieldCombatWeaponName) || battlefieldCombatWeaponOptions[0] || null;
	const readyToSimulate = attackerFaction && attackerUnit && weaponName && defenderFaction && defenderUnit;
	useEffect(() => {
		if (!canUseCover && targetHasCover) {
			setTargetHasCover(false);
		}
	}, [canUseCover, targetHasCover]);
	useEffect(() => {
		if (!canUseHalfRange && inHalfRange) {
			setInHalfRange(false);
		}
	}, [canUseHalfRange, inHalfRange]);
	useEffect(() => {
		if (!hasOathOfMoment && oathOfMomentActive) {
			setOathOfMomentActive(false);
		}
	}, [hasOathOfMoment, oathOfMomentActive]);
	useEffect(() => {
		if (!attackerEnhancementOptions.some((item) => item.name === attackerEnhancementName)) {
			setAttackerEnhancementName("");
		}
	}, [attackerEnhancementOptions, attackerEnhancementName]);
	useEffect(() => {
		if (!defenderEnhancementOptions.some((item) => item.name === defenderEnhancementName)) {
			setDefenderEnhancementName("");
		}
	}, [defenderEnhancementOptions, defenderEnhancementName]);
	useEffect(() => {
		if (!canUseAttackerFireDiscipline && attackerFireDisciplineActive) {
			setAttackerFireDisciplineActive(false);
		}
	}, [canUseAttackerFireDiscipline, attackerFireDisciplineActive]);
	useEffect(() => {
		if (!canUseAttackerMarkedForDestruction && attackerMarkedForDestructionActive) {
			setAttackerMarkedForDestructionActive(false);
		}
	}, [canUseAttackerMarkedForDestruction, attackerMarkedForDestructionActive]);
	useEffect(() => {
		if (!canUseAttackerUnforgivenFury) {
			if (attackerUnforgivenFuryActive) {
				setAttackerUnforgivenFuryActive(false);
			}
			if (attackerUnforgivenFuryArmyBattleshocked) {
				setAttackerUnforgivenFuryArmyBattleshocked(false);
			}
		}
	}, [
		canUseAttackerUnforgivenFury,
		attackerUnforgivenFuryActive,
		attackerUnforgivenFuryArmyBattleshocked
	]);
	useEffect(() => {
		if (!canUseDefenderArmourOfContempt && defenderArmourOfContemptActive) {
			setDefenderArmourOfContemptActive(false);
		}
	}, [canUseDefenderArmourOfContempt, defenderArmourOfContemptActive]);
	useEffect(() => {
		if (!canUseDefenderOverwhelmingOnslaught && defenderOverwhelmingOnslaughtActive) {
			setDefenderOverwhelmingOnslaughtActive(false);
		}
	}, [canUseDefenderOverwhelmingOnslaught, defenderOverwhelmingOnslaughtActive]);
	useEffect(() => {
		if (!canUseDefenderUnbreakableLines && defenderUnbreakableLinesActive) {
			setDefenderUnbreakableLinesActive(false);
		}
	}, [canUseDefenderUnbreakableLines, defenderUnbreakableLinesActive]);
	useEffect(() => {
		const active = attackerEnhancementName === "Stubborn Tenacity";
		setAttackerStubbornTenacityActive(active);
		if (!active && attackerBelowStartingStrength) {
			setAttackerBelowStartingStrength(false);
		}
	}, [attackerEnhancementName, attackerBelowStartingStrength]);
	useEffect(() => {
		const active = attackerEnhancementName === "Weapons of the First Legion";
		setAttackerWeaponsOfTheFirstLegionActive(active);
	}, [attackerEnhancementName]);
	useEffect(() => {
		const active = attackerEnhancementName === "Pennant of Remembrance";
		setAttackerPennantOfRemembranceActive(active);
	}, [attackerEnhancementName]);
	useEffect(() => {
		const active = defenderEnhancementName === "Pennant of Remembrance";
		setDefenderPennantOfRemembranceActive(active);
		if (!active && defenderBattleshocked) {
			setDefenderBattleshocked(false);
		}
	}, [defenderEnhancementName, defenderBattleshocked]);
	useEffect(() => {
		setSimulationRuns([]);
		setActiveRunView("summary");
	}, [
		attackerFaction,
		attackerUnit,
		resolvedAttackerLoadoutSelections,
		attackerModelCount,
		weaponName,
		defenderFaction,
		defenderUnit,
		resolvedDefenderLoadoutSelections,
		defenderModelCount,
		attachedCharacterName,
		resolvedAttachedCharacterLoadoutSelections,
		attachedCharacterModelCount,
		attackerDetachmentName,
		defenderDetachmentName
	]);
	useEffect(() => {
		setBattlefieldPositions({
			attacker: {
				x: 20,
				y: 50
			},
			defender: {
				x: 80,
				y: 50
			}
		});
	}, [attackerUnitDetails?.name, defenderUnitDetails?.name]);
	useEffect(() => {
		if (!battlefieldUnitMap[selectedBattlefieldUnitId]) {
			setSelectedBattlefieldUnitId(battlefieldUnits[0]?.id || "");
		}
	}, [
		battlefieldUnitMap,
		battlefieldUnits,
		selectedBattlefieldUnitId
	]);
	useEffect(() => {
		if (!battlefieldCombatOptions.some((option) => option.id === battlefieldCombatAttackerId)) {
			setBattlefieldCombatAttackerId(battlefieldCombatOptions[0]?.id || "");
		}
	}, [battlefieldCombatAttackerId, battlefieldCombatOptions]);
	useEffect(() => {
		if (!battlefieldCombatWeaponOptions.some((weapon) => weapon.name === battlefieldCombatWeaponName)) {
			setBattlefieldCombatWeaponName(battlefieldCombatWeaponOptions[0]?.name || "");
		}
	}, [battlefieldCombatWeaponName, battlefieldCombatWeaponOptions]);
	useEffect(() => {
		if (!draggingUnitId) {
			return undefined;
		}
		function updateDraggedUnitPosition(clientX, clientY) {
			const board = battlefieldBoardRef.current;
			const unit = battlefieldUnitMap[draggingUnitId];
			if (!board || !unit) {
				return;
			}
			const rect = board.getBoundingClientRect();
			const radiusXPercent = unit.baseInches / 2 / BATTLEFIELD_WIDTH_INCHES * 100;
			const radiusYPercent = unit.baseInches / 2 / BATTLEFIELD_HEIGHT_INCHES * 100;
			const xPercent = (clientX - rect.left) / rect.width * 100;
			const yPercent = (clientY - rect.top) / rect.height * 100;
			setBattlefieldPositions((current) => ({
				...current,
				[draggingUnitId]: {
					x: clamp(xPercent, radiusXPercent, 100 - radiusXPercent),
					y: clamp(yPercent, radiusYPercent, 100 - radiusYPercent)
				}
			}));
		}
		function handlePointerMove(event) {
			updateDraggedUnitPosition(event.clientX, event.clientY);
		}
		function handlePointerUp() {
			setDraggingUnitId("");
		}
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [draggingUnitId, battlefieldUnitMap]);
	async function executeSimulation(payload, runsToExecute) {
		try {
			setSimulating(true);
			setError("");
			setSimulationRuns([]);
			const seedBase = Date.now();
			const responses = await Promise.all(Array.from({ length: runsToExecute }, (_, index) => simulateCombat({
				...payload,
				seed: seedBase + index
			})));
			const runs = responses.map((data, index) => ({
				...data,
				runIndex: index + 1
			}));
			setSimulationRuns(runs);
			setActiveRunView("summary");
		} catch (requestError) {
			setError(formatError(requestError));
			setSimulationRuns([]);
		} finally {
			setSimulating(false);
		}
	}
	async function handleSimulate(event) {
		event.preventDefault();
		if (!readyToSimulate) {
			return;
		}
		const payload = buildSimulationPayload({
			attackerFaction,
			attackerUnit,
			attackerLoadoutSelections: resolvedAttackerLoadoutSelections,
			attackerModelCount,
			weaponName,
			defenderFaction,
			defenderUnit,
			defenderLoadoutSelections: resolvedDefenderLoadoutSelections,
			defenderModelCount,
			attachedCharacterLoadoutSelections: resolvedAttachedCharacterLoadoutSelections,
			attachedCharacterModelCount,
			targetHasCover,
			attackerInEngagementRange,
			targetInEngagementRangeOfAllies,
			inHalfRange,
			oathOfMomentActive,
			chargedThisTurn,
			remainedStationary,
			indirectTargetVisible,
			attachedCharacterName,
			hazardousOverwatchChargePhase,
			hazardousBearerCurrentWounds,
			attackerFireDisciplineActive,
			attackerMarkedForDestructionActive,
			attackerUnforgivenFuryActive,
			attackerUnforgivenFuryArmyBattleshocked,
			attackerStubbornTenacityActive,
			attackerWeaponsOfTheFirstLegionActive,
			attackerPennantOfRemembranceActive,
			attackerBelowStartingStrength,
			attackerBattleshocked,
			defenderArmourOfContemptActive,
			defenderOverwhelmingOnslaughtActive,
			defenderUnbreakableLinesActive,
			defenderPennantOfRemembranceActive,
			defenderBattleshocked
		});
		await executeSimulation(payload, Math.max(1, Number(runCount) || 1));
	}
	async function handleBattlefieldSimulate() {
		if (!selectedBattlefieldCombatant || !selectedBattlefieldCombatWeapon) {
			return;
		}
		const battlefieldHalfRangeActive = battlefieldEdgeDistanceInches !== null && selectedBattlefieldCombatWeapon.range !== "Melee" && (getWeaponKeywordValue(selectedBattlefieldCombatWeapon, "Rapid Fire") > 0 || getWeaponKeywordValue(selectedBattlefieldCombatWeapon, "Melta") > 0) && battlefieldEdgeDistanceInches <= (parseWeaponRangeInches(selectedBattlefieldCombatWeapon.range) || 0) / 2;
		const battlefieldAttackerLoadoutSelections = selectedBattlefieldCombatant.id === "attacker" ? resolvedAttackerLoadoutSelections : resolvedDefenderLoadoutSelections;
		const battlefieldDefenderLoadoutSelections = selectedBattlefieldCombatant.id === "attacker" ? resolvedDefenderLoadoutSelections : resolvedAttackerLoadoutSelections;
		const battlefieldAttackerModelCount = selectedBattlefieldCombatant.id === "attacker" ? attackerModelCount !== "" ? Number(attackerModelCount) : undefined : defenderModelCount !== "" ? Number(defenderModelCount) : undefined;
		const battlefieldDefenderModelCount = selectedBattlefieldCombatant.id === "attacker" ? defenderModelCount !== "" ? Number(defenderModelCount) : undefined : attackerModelCount !== "" ? Number(attackerModelCount) : undefined;
		await executeSimulation({
			attacker_faction: selectedBattlefieldCombatant.attackerFaction,
			attacker_unit: selectedBattlefieldCombatant.attackerName,
			attacker_loadout: battlefieldAttackerLoadoutSelections,
			attacker_model_count: battlefieldAttackerModelCount,
			weapon_name: selectedBattlefieldCombatWeapon.name,
			defender_faction: selectedBattlefieldCombatant.defenderFaction,
			defender_unit: selectedBattlefieldCombatant.defenderName,
			defender_loadout: battlefieldDefenderLoadoutSelections,
			defender_model_count: battlefieldDefenderModelCount,
			attached_character_loadout: resolvedAttachedCharacterLoadoutSelections,
			attached_character_model_count: attachedCharacterModelCount !== "" ? Number(attachedCharacterModelCount) : undefined,
			options: {
				attacker_in_engagement_range: battlefieldInEngagementRange,
				in_half_range: battlefieldHalfRangeActive
			}
		}, Math.max(1, Number(runCount) || 1));
	}
	function handleBattlefieldUnitPointerDown(unitId) {
		return (event) => {
			event.preventDefault();
			setSelectedBattlefieldUnitId(unitId);
			setDraggingUnitId(unitId);
		};
	}
	function addUnitToArmyList(unitDetails, faction) {
		if (!unitDetails?.name || !faction) {
			return;
		}
		const entryId = `${faction}::${unitDetails.name}`;
		setArmyListEntries((currentEntries) => {
			const existingEntry = currentEntries.find((entry) => entry.id === entryId);
			if (existingEntry) {
				return currentEntries.map((entry) => entry.id === entryId ? {
					...entry,
					count: entry.count + 1
				} : entry);
			}
			return [...currentEntries, {
				id: entryId,
				faction,
				name: unitDetails.name,
				count: 1,
				stats: unitDetails.stats,
				keywords: unitDetails.keywords || []
			}];
		});
	}
	function removeArmyListEntry(entryId) {
		setArmyListEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId));
	}
	function updateArmyListEntryCount(entryId, nextCount) {
		const normalizedCount = Math.max(1, Number(nextCount) || 1);
		setArmyListEntries((currentEntries) => currentEntries.map((entry) => entry.id === entryId ? {
			...entry,
			count: normalizedCount
		} : entry));
	}
	function resetOptions() {
		setTargetHasCover(initialOptions.target_has_cover);
		setAttackerInEngagementRange(initialOptions.attacker_in_engagement_range);
		setTargetInEngagementRangeOfAllies(initialOptions.target_in_engagement_range_of_allies);
		setInHalfRange(initialOptions.in_half_range);
		setOathOfMomentActive(initialOptions.oath_of_moment_active);
		setChargedThisTurn(initialOptions.charged_this_turn);
		setRemainedStationary(initialOptions.remained_stationary);
		setIndirectTargetVisible(initialOptions.indirect_target_visible);
		setAttachedCharacterName(initialOptions.attached_character_name);
		setHazardousOverwatchChargePhase(initialOptions.hazardous_overwatch_charge_phase);
		setHazardousBearerCurrentWounds(initialOptions.hazardous_bearer_current_wounds);
		setAttackerFireDisciplineActive(initialOptions.attacker_fire_discipline_active);
		setAttackerMarkedForDestructionActive(initialOptions.attacker_marked_for_destruction_active);
		setAttackerUnforgivenFuryActive(initialOptions.attacker_unforgiven_fury_active);
		setAttackerUnforgivenFuryArmyBattleshocked(initialOptions.attacker_unforgiven_fury_army_battleshocked);
		setAttackerStubbornTenacityActive(initialOptions.attacker_stubborn_tenacity_active);
		setAttackerWeaponsOfTheFirstLegionActive(initialOptions.attacker_weapons_of_the_first_legion_active);
		setAttackerPennantOfRemembranceActive(initialOptions.attacker_pennant_of_remembrance_active);
		setAttackerBelowStartingStrength(initialOptions.attacker_below_starting_strength);
		setAttackerBattleshocked(initialOptions.attacker_battleshocked);
		setDefenderArmourOfContemptActive(initialOptions.defender_armour_of_contempt_active);
		setDefenderOverwhelmingOnslaughtActive(initialOptions.defender_overwhelming_onslaught_active);
		setDefenderUnbreakableLinesActive(initialOptions.defender_unbreakable_lines_active);
		setDefenderPennantOfRemembranceActive(initialOptions.defender_pennant_of_remembrance_active);
		setDefenderBattleshocked(initialOptions.defender_battleshocked);
		setAttackerEnhancementName("");
		setDefenderEnhancementName("");
		setRunCount("1");
	}
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ _jsxDEV("header", {
				className: "hero-band",
				children: [/* @__PURE__ */ _jsxDEV("p", {
					className: "eyebrow",
					children: "Warhammer 40,000 Combat Simulator"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2314,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "hero-copy",
					children: [/* @__PURE__ */ _jsxDEV("h1", { children: activePage === "combat" ? "Check Unit Effectiveness" : activePage === "battlefield" ? "Plot Units on the Battlefield" : "Build Army Lists" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2316,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("p", { children: activePage === "combat" ? "Pick an attacker, a weapon profile, a defender, and the combat context. Applies the rules engine and returns a full combat log." : activePage === "battlefield" ? "The selected units from Combat are shown as scaled bases on a 44 x 60 inch top-down board." : "Army list management will live here. The page shell is in place so the next pass can define the actual roster workflow." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2323,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2315,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2313,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("nav", {
				className: "page-nav",
				"aria-label": "Primary",
				children: [
					/* @__PURE__ */ _jsxDEV("button", {
						type: "button",
						className: `page-nav-button ${activePage === "army-list" ? "active" : ""}`,
						onClick: () => setActivePage("army-list"),
						children: "Army List"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2334,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						type: "button",
						className: `page-nav-button ${activePage === "combat" ? "active" : ""}`,
						onClick: () => setActivePage("combat"),
						children: "Combat"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2341,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						type: "button",
						className: `page-nav-button ${activePage === "battlefield" ? "active" : ""}`,
						onClick: () => setActivePage("battlefield"),
						children: "Battlefield"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2348,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2333,
				columnNumber: 7
			}, this),
			activePage === "combat" ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: [/* @__PURE__ */ _jsxDEV("main", {
				className: "workspace-grid",
				children: [/* @__PURE__ */ _jsxDEV("section", {
					className: "panel control-panel",
					children: [
						/* @__PURE__ */ _jsxDEV("div", {
							className: "panel-heading",
							children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
								className: "kicker",
								children: "Setup"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2363,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("h2", { children: "Simulation Input" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2364,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2362,
								columnNumber: 13
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								type: "button",
								className: "secondary-button",
								onClick: resetOptions,
								children: "Reset Options"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2366,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2361,
							columnNumber: 11
						}, this),
						loading ? /* @__PURE__ */ _jsxDEV("p", {
							className: "status-line",
							children: "Loading faction data..."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2371,
							columnNumber: 22
						}, this) : null,
						error ? /* @__PURE__ */ _jsxDEV("p", {
							className: "status-line error",
							children: error
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2372,
							columnNumber: 20
						}, this) : null,
						/* @__PURE__ */ _jsxDEV("form", {
							className: "sim-form",
							onSubmit: handleSimulate,
							children: [
								/* @__PURE__ */ _jsxDEV("div", {
									className: "cluster two-up",
									children: [/* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Attacking Faction" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2377,
										columnNumber: 17
									}, this), /* @__PURE__ */ _jsxDEV("select", {
										value: attackerFaction,
										onChange: (event) => setAttackerFaction(event.target.value),
										children: factions.map((faction) => /* @__PURE__ */ _jsxDEV("option", {
											value: faction.name,
											children: faction.name
										}, faction.name, false, {
											fileName: _jsxFileName,
											lineNumber: 2380,
											columnNumber: 21
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2378,
										columnNumber: 17
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2376,
										columnNumber: 15
									}, this), /* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Defending Faction" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2388,
										columnNumber: 17
									}, this), /* @__PURE__ */ _jsxDEV("select", {
										value: defenderFaction,
										onChange: (event) => setDefenderFaction(event.target.value),
										children: factions.map((faction) => /* @__PURE__ */ _jsxDEV("option", {
											value: faction.name,
											children: faction.name
										}, faction.name, false, {
											fileName: _jsxFileName,
											lineNumber: 2391,
											columnNumber: 21
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2389,
										columnNumber: 17
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2387,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2375,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "cluster two-up",
									children: [/* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Attacking Unit" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2401,
										columnNumber: 17
									}, this), /* @__PURE__ */ _jsxDEV("select", {
										value: attackerUnit,
										onChange: (event) => setAttackerUnit(event.target.value),
										children: attackerUnits.map((unit) => /* @__PURE__ */ _jsxDEV("option", {
											value: unit.name,
											children: unit.name
										}, unit.name, false, {
											fileName: _jsxFileName,
											lineNumber: 2404,
											columnNumber: 21
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2402,
										columnNumber: 17
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2400,
										columnNumber: 15
									}, this), /* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Defending Unit" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2412,
										columnNumber: 17
									}, this), /* @__PURE__ */ _jsxDEV("select", {
										value: defenderUnit,
										onChange: (event) => setDefenderUnit(event.target.value),
										children: defenderUnits.map((unit) => /* @__PURE__ */ _jsxDEV("option", {
											value: unit.name,
											children: unit.name
										}, unit.name, false, {
											fileName: _jsxFileName,
											lineNumber: 2415,
											columnNumber: 21
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2413,
										columnNumber: 17
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2411,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2399,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "cluster two-up",
									children: [renderModelCountSelector("Attacker", attackerUnitDetails, attackerModelCount, setAttackerModelCount), renderModelCountSelector("Defender", defenderUnitDetails, defenderModelCount, setDefenderModelCount)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2423,
									columnNumber: 13
								}, this),
								renderLoadoutSelectors("Attacker", attackerUnitDetails, attackerLoadoutSelections, setAttackerLoadoutSelections),
								renderLoadoutSelectors("Defender", defenderUnitDetails, defenderLoadoutSelections, setDefenderLoadoutSelections),
								attackerFactionDetails?.detachments?.length || defenderFactionDetails?.detachments?.length ? /* @__PURE__ */ _jsxDEV("div", {
									className: "cluster two-up",
									children: [/* @__PURE__ */ _jsxDEV("label", {
										title: attackerDetachmentTooltip,
										children: [/* @__PURE__ */ _jsxDEV("span", { children: "Attacker Detachment" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2455,
											columnNumber: 19
										}, this), /* @__PURE__ */ _jsxDEV("select", {
											title: attackerDetachmentTooltip,
											value: attackerDetachmentName,
											onChange: (event) => setAttackerDetachmentName(event.target.value),
											children: [/* @__PURE__ */ _jsxDEV("option", {
												value: "",
												children: "No detachment"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2461,
												columnNumber: 21
											}, this), (attackerFactionDetails?.detachments || []).map((detachment) => /* @__PURE__ */ _jsxDEV("option", {
												value: detachment.name,
												title: formatDetachmentTooltip(detachment),
												children: detachment.name
											}, detachment.name, false, {
												fileName: _jsxFileName,
												lineNumber: 2463,
												columnNumber: 23
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2456,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2454,
										columnNumber: 17
									}, this), /* @__PURE__ */ _jsxDEV("label", {
										title: defenderDetachmentTooltip,
										children: [/* @__PURE__ */ _jsxDEV("span", { children: "Defender Detachment" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2475,
											columnNumber: 19
										}, this), /* @__PURE__ */ _jsxDEV("select", {
											title: defenderDetachmentTooltip,
											value: defenderDetachmentName,
											onChange: (event) => setDefenderDetachmentName(event.target.value),
											children: [/* @__PURE__ */ _jsxDEV("option", {
												value: "",
												children: "No detachment"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2481,
												columnNumber: 21
											}, this), (defenderFactionDetails?.detachments || []).map((detachment) => /* @__PURE__ */ _jsxDEV("option", {
												value: detachment.name,
												title: formatDetachmentTooltip(detachment),
												children: detachment.name
											}, detachment.name, false, {
												fileName: _jsxFileName,
												lineNumber: 2483,
												columnNumber: 23
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2476,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2474,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2453,
									columnNumber: 15
								}, this) : null,
								/* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Weapon Profile" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2497,
									columnNumber: 15
								}, this), /* @__PURE__ */ _jsxDEV("select", {
									value: weaponName,
									onChange: (event) => setWeaponName(event.target.value),
									children: combatWeaponOptions.map((weapon) => /* @__PURE__ */ _jsxDEV("option", {
										value: weapon.name,
										children: formatWeaponName(weapon)
									}, weapon.name, false, {
										fileName: _jsxFileName,
										lineNumber: 2500,
										columnNumber: 19
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2498,
									columnNumber: 15
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2496,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Number of Runs" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2508,
									columnNumber: 15
								}, this), /* @__PURE__ */ _jsxDEV("input", {
									type: "number",
									min: "1",
									max: "100",
									value: runCount,
									onChange: (event) => setRunCount(event.target.value)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2509,
									columnNumber: 15
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2507,
									columnNumber: 13
								}, this),
								selectedWeapon ? /* @__PURE__ */ _jsxDEV("div", {
									className: "weapon-card",
									children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
										className: "kicker",
										children: "Selected Weapon"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2521,
										columnNumber: 19
									}, this), /* @__PURE__ */ _jsxDEV("h3", { children: formatWeaponName(selectedWeapon) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2522,
										columnNumber: 19
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2520,
										columnNumber: 17
									}, this), weaponName === ALL_RANGED_WEAPONS || weaponName === ALL_MELEE_WEAPONS ? /* @__PURE__ */ _jsxDEV("p", { children: selectedAttackWeapons.map((weapon) => formatWeaponName(weapon)).join(", ") }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2525,
										columnNumber: 19
									}, this) : /* @__PURE__ */ _jsxDEV("div", {
										className: "datasheet-stats",
										children: renderWeaponStatsGrid(selectedWeapon)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2527,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2519,
									columnNumber: 15
								}, this) : null,
								/* @__PURE__ */ _jsxDEV("div", {
									className: "rule-grid",
									children: [
										attackerEnhancementOptions.length ? /* @__PURE__ */ _jsxDEV("label", {
											title: attackerEnhancementTooltip,
											children: [/* @__PURE__ */ _jsxDEV("span", { children: "Attacker Enhancement" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2537,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("select", {
												title: attackerEnhancementTooltip,
												value: attackerEnhancementName,
												onChange: (event) => setAttackerEnhancementName(event.target.value),
												children: [/* @__PURE__ */ _jsxDEV("option", {
													value: "",
													children: "No enhancement"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 2543,
													columnNumber: 21
												}, this), attackerEnhancementOptions.map((enhancement) => /* @__PURE__ */ _jsxDEV("option", {
													value: enhancement.name,
													title: formatEnhancementTooltip(enhancement),
													children: enhancement.name
												}, enhancement.name, false, {
													fileName: _jsxFileName,
													lineNumber: 2545,
													columnNumber: 23
												}, this))]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 2538,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2536,
											columnNumber: 17
										}, this) : null,
										defenderEnhancementOptions.length ? /* @__PURE__ */ _jsxDEV("label", {
											title: defenderEnhancementTooltip,
											children: [/* @__PURE__ */ _jsxDEV("span", { children: "Defender Enhancement" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2559,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("select", {
												title: defenderEnhancementTooltip,
												value: defenderEnhancementName,
												onChange: (event) => setDefenderEnhancementName(event.target.value),
												children: [/* @__PURE__ */ _jsxDEV("option", {
													value: "",
													children: "No enhancement"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 2565,
													columnNumber: 21
												}, this), defenderEnhancementOptions.map((enhancement) => /* @__PURE__ */ _jsxDEV("option", {
													value: enhancement.name,
													title: formatEnhancementTooltip(enhancement),
													children: enhancement.name
												}, enhancement.name, false, {
													fileName: _jsxFileName,
													lineNumber: 2567,
													columnNumber: 23
												}, this))]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 2560,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2558,
											columnNumber: 17
										}, this) : null,
										canUseAttackerFireDiscipline ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: fireDisciplineTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerFireDisciplineActive,
												onChange: (event) => setAttackerFireDisciplineActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2581,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Use Fire Discipline" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2586,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2580,
											columnNumber: 17
										}, this) : null,
										canUseAttackerMarkedForDestruction ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: markedForDestructionTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerMarkedForDestructionActive,
												onChange: (event) => setAttackerMarkedForDestructionActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2592,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Use Marked for Destruction" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2597,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2591,
											columnNumber: 17
										}, this) : null,
										canUseAttackerUnforgivenFury ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: unforgivenFuryTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerUnforgivenFuryActive,
												onChange: (event) => setAttackerUnforgivenFuryActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2603,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Use Unforgiven Fury" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2608,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2602,
											columnNumber: 17
										}, this) : null,
										attackerUnforgivenFuryActive ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: attackerArmyBattleshockTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerUnforgivenFuryArmyBattleshocked,
												onChange: (event) => setAttackerUnforgivenFuryArmyBattleshocked(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2614,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Attacker army has a Battle-shocked Adeptus Astartes unit" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2619,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2613,
											columnNumber: 17
										}, this) : null,
										canUseDefenderArmourOfContempt ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: armourOfContemptTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: defenderArmourOfContemptActive,
												onChange: (event) => setDefenderArmourOfContemptActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2625,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender uses Armour of Contempt" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2630,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2624,
											columnNumber: 17
										}, this) : null,
										canUseDefenderOverwhelmingOnslaught ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: overwhelmingOnslaughtTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: defenderOverwhelmingOnslaughtActive,
												onChange: (event) => setDefenderOverwhelmingOnslaughtActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2636,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender uses Overwhelming Onslaught" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2641,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2635,
											columnNumber: 17
										}, this) : null,
										canUseDefenderUnbreakableLines ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: unbreakableLinesTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: defenderUnbreakableLinesActive,
												onChange: (event) => setDefenderUnbreakableLinesActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2647,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender uses Unbreakable Lines" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2652,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2646,
											columnNumber: 17
										}, this) : null,
										canUseCover ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: coverTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: targetHasCover,
												onChange: (event) => setTargetHasCover(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2658,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender has cover" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2663,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2657,
											columnNumber: 17
										}, this) : null,
										hasOathOfMoment ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: oathTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: oathOfMomentActive,
												onChange: (event) => setOathOfMomentActive(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2669,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender is the Oath of Moment target" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2674,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2668,
											columnNumber: 17
										}, this) : null,
										canUseHalfRange ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: halfRangeTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: inHalfRange,
												onChange: (event) => setInHalfRange(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2680,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Target is in Half Range" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2685,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2679,
											columnNumber: 17
										}, this) : null,
										isRangedWeapon ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: engagementTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerInEngagementRange,
												onChange: (event) => setAttackerInEngagementRange(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2691,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Attacker is in Engagement Range" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2696,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2690,
											columnNumber: 17
										}, this) : null,
										hasHeavy ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: heavyTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: remainedStationary,
												onChange: (event) => setRemainedStationary(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2702,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Attacker remained Stationary" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2707,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2701,
											columnNumber: 17
										}, this) : null,
										hasBlast ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: blastTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: targetInEngagementRangeOfAllies,
												onChange: (event) => setTargetInEngagementRangeOfAllies(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2713,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender is in Engagement Range of allied units" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2718,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2712,
											columnNumber: 17
										}, this) : null,
										hasIndirectFire ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: indirectTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: indirectTargetVisible,
												onChange: (event) => setIndirectTargetVisible(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2724,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Any defender models are visible" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2729,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2723,
											columnNumber: 17
										}, this) : null,
										canUseLance && isMeleeWeapon ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: lanceTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: chargedThisTurn,
												onChange: (event) => setChargedThisTurn(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2735,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Attacker charged this turn" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2740,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2734,
											columnNumber: 17
										}, this) : null,
										attackerEnhancementName === "Stubborn Tenacity" ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: attackerBelowStartingStrengthTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerBelowStartingStrength,
												onChange: (event) => setAttackerBelowStartingStrength(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2746,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Attacker is below Starting Strength" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2751,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2745,
											columnNumber: 17
										}, this) : null,
										attackerEnhancementName === "Stubborn Tenacity" || attackerEnhancementName === "Weapons of the First Legion" || attackerEnhancementName === "Pennant of Remembrance" ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: attackerBattleshockedTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: attackerBattleshocked,
												onChange: (event) => setAttackerBattleshocked(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2759,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Attacker is Battle-shocked" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2764,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2758,
											columnNumber: 17
										}, this) : null,
										defenderEnhancementName === "Pennant of Remembrance" ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: defenderBattleshockedTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: defenderBattleshocked,
												onChange: (event) => setDefenderBattleshocked(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2770,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Defender is Battle-shocked" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2775,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2769,
											columnNumber: 17
										}, this) : null,
										canUsePrecision ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: [
											/* @__PURE__ */ _jsxDEV("label", {
												title: attachedCharacterTooltip,
												children: [/* @__PURE__ */ _jsxDEV("span", { children: "Attached Character" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 2782,
													columnNumber: 21
												}, this), /* @__PURE__ */ _jsxDEV("select", {
													title: attachedCharacterTooltip,
													value: attachedCharacterName,
													onChange: (event) => setAttachedCharacterName(event.target.value),
													children: [/* @__PURE__ */ _jsxDEV("option", {
														value: "",
														children: "No attached character"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 2788,
														columnNumber: 23
													}, this), attachedCharacterOptions.map((unit) => /* @__PURE__ */ _jsxDEV("option", {
														value: unit.name,
														children: unit.name
													}, unit.name, false, {
														fileName: _jsxFileName,
														lineNumber: 2790,
														columnNumber: 25
													}, this))]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 2783,
													columnNumber: 21
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 2781,
												columnNumber: 19
											}, this),
											renderLoadoutSelectors("Attached Character", attachedCharacterUnitDetails, attachedCharacterLoadoutSelections, setAttachedCharacterLoadoutSelections),
											renderModelCountSelector("Attached Character", attachedCharacterUnitDetails, attachedCharacterModelCount, setAttachedCharacterModelCount)
										] }, void 0, true) : null,
										hasHazardous ? /* @__PURE__ */ _jsxDEV("label", {
											className: "checkbox-row",
											title: hazardousOverwatchTooltip,
											children: [/* @__PURE__ */ _jsxDEV("input", {
												type: "checkbox",
												checked: hazardousOverwatchChargePhase,
												onChange: (event) => setHazardousOverwatchChargePhase(event.target.checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2815,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Used Fire Overwatch in opponent charge phase" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2820,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2814,
											columnNumber: 17
										}, this) : null,
										hasHazardous ? /* @__PURE__ */ _jsxDEV("label", {
											title: hazardousBearerTooltip,
											children: [/* @__PURE__ */ _jsxDEV("span", { children: "Hazardous Bearer Current Wounds" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2826,
												columnNumber: 19
											}, this), /* @__PURE__ */ _jsxDEV("input", {
												title: hazardousBearerTooltip,
												type: "number",
												min: "0",
												value: hazardousBearerCurrentWounds,
												onChange: (event) => setHazardousBearerCurrentWounds(event.target.value)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 2827,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2825,
											columnNumber: 17
										}, this) : null
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2534,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ _jsxDEV("button", {
									type: "submit",
									className: "primary-button",
									disabled: !readyToSimulate || simulating,
									children: simulating ? "Running Simulations..." : "Run Simulations"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2838,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2374,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2360,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("section", {
					className: "panel data-panel",
					children: [
						/* @__PURE__ */ _jsxDEV("div", {
							className: "panel-heading",
							children: /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
								className: "kicker",
								children: "Reference"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2847,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("h2", { children: "Datasheets" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2848,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2846,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2845,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "snapshot-grid",
							children: [/* @__PURE__ */ _jsxDEV("article", {
								className: "datasheet-card",
								children: [
									/* @__PURE__ */ _jsxDEV("p", {
										className: "kicker",
										children: "Attacker"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2854,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("h3", { children: attackerUnitDetails?.name || "No unit selected" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2855,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("p", { children: attackerFaction || "Faction not set" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2856,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("button", {
										type: "button",
										className: "secondary-button army-list-button",
										onClick: () => addUnitToArmyList(attackerUnitDetails, attackerFaction),
										disabled: !attackerUnitDetails || !attackerFaction,
										children: "Add To Army List"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2857,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("div", {
										className: "datasheet-stats",
										children: renderStatsGrid(attackerUnitDetails?.stats)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2865,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("div", {
										className: "active-rules",
										children: [/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Active Rules"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2869,
											columnNumber: 17
										}, this), attackerActiveRules.length ? /* @__PURE__ */ _jsxDEV("div", {
											className: "active-rule-list",
											children: attackerActiveRules.map((rule) => /* @__PURE__ */ _jsxDEV("article", {
												className: "active-rule-card",
												children: [/* @__PURE__ */ _jsxDEV("div", {
													className: "active-rule-header",
													children: [/* @__PURE__ */ _jsxDEV("h4", { children: rule.name }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 2875,
														columnNumber: 27
													}, this), /* @__PURE__ */ _jsxDEV("span", {
														className: "active-rule-source",
														children: rule.source
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 2876,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 2874,
													columnNumber: 25
												}, this), /* @__PURE__ */ _jsxDEV("p", { children: rule.text }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 2878,
													columnNumber: 25
												}, this)]
											}, `${rule.source}-${rule.name}`, true, {
												fileName: _jsxFileName,
												lineNumber: 2873,
												columnNumber: 23
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2871,
											columnNumber: 19
										}, this) : /* @__PURE__ */ _jsxDEV("p", {
											className: "active-rule-empty",
											children: "No active rules affecting this attack."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2883,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2868,
										columnNumber: 15
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2853,
								columnNumber: 13
							}, this), /* @__PURE__ */ _jsxDEV("article", {
								className: "datasheet-card",
								children: [
									/* @__PURE__ */ _jsxDEV("p", {
										className: "kicker",
										children: "Defender"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2889,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("h3", { children: defenderUnitDetails?.name || "No unit selected" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2890,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("p", { children: defenderFaction || "Faction not set" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2891,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("button", {
										type: "button",
										className: "secondary-button army-list-button",
										onClick: () => addUnitToArmyList(defenderUnitDetails, defenderFaction),
										disabled: !defenderUnitDetails || !defenderFaction,
										children: "Add To Army List"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2892,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("div", {
										className: "datasheet-stats",
										children: renderStatsGrid(defenderUnitDetails?.stats)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2900,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ _jsxDEV("div", {
										className: "active-rules",
										children: [/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Active Rules"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2904,
											columnNumber: 17
										}, this), defenderActiveRules.length ? /* @__PURE__ */ _jsxDEV("div", {
											className: "active-rule-list",
											children: defenderActiveRules.map((rule) => /* @__PURE__ */ _jsxDEV("article", {
												className: "active-rule-card",
												children: [/* @__PURE__ */ _jsxDEV("div", {
													className: "active-rule-header",
													children: [/* @__PURE__ */ _jsxDEV("h4", { children: rule.name }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 2910,
														columnNumber: 27
													}, this), /* @__PURE__ */ _jsxDEV("span", {
														className: "active-rule-source",
														children: rule.source
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 2911,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 2909,
													columnNumber: 25
												}, this), /* @__PURE__ */ _jsxDEV("p", { children: rule.text }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 2913,
													columnNumber: 25
												}, this)]
											}, `${rule.source}-${rule.name}`, true, {
												fileName: _jsxFileName,
												lineNumber: 2908,
												columnNumber: 23
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2906,
											columnNumber: 19
										}, this) : /* @__PURE__ */ _jsxDEV("p", {
											className: "active-rule-empty",
											children: "No active rules affecting this attack."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2918,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 2903,
										columnNumber: 15
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2888,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2852,
							columnNumber: 11
						}, this),
						simulationRuns.length ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "run-tabs",
							children: [/* @__PURE__ */ _jsxDEV("button", {
								type: "button",
								className: `run-tab ${activeRunView === "summary" ? "active" : ""}`,
								onClick: () => setActiveRunView("summary"),
								children: "Summary"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2927,
								columnNumber: 17
							}, this), simulationRuns.map((run) => /* @__PURE__ */ _jsxDEV("button", {
								type: "button",
								className: `run-tab ${activeRunView === run.runIndex ? "active" : ""}`,
								onClick: () => setActiveRunView(run.runIndex),
								children: ["Run ", run.runIndex]
							}, run.runIndex, true, {
								fileName: _jsxFileName,
								lineNumber: 2935,
								columnNumber: 19
							}, this))]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2926,
							columnNumber: 15
						}, this), activeRunView === "summary" ? /* @__PURE__ */ _jsxDEV("div", {
							className: "outcome-grid",
							children: [
								/* @__PURE__ */ _jsxDEV("article", {
									className: "result-card accent",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Target Summary"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2949,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: defenderUnit || "Defender" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2950,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [summaryStats.totalRuns, " runs completed"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2951,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Destroyed: ",
											summaryStats.targetDestroyedCount,
											" (",
											formatPercent(summaryStats.targetDestroyedCount, summaryStats.totalRuns),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2952,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Avg models remaining: ", formatAverage(summaryStats.averageTargetModelsRemaining)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2953,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Avg current model wounds: ", formatAverage(summaryStats.averageTargetCurrentWounds)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2954,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2948,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ _jsxDEV("article", {
									className: "result-card",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Hit Breakdown"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2958,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: "Accuracy" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2959,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Attack instances: ", summaryStats.combat.attackInstances] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2960,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Hits landed: ",
											summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks,
											" (",
											formatPercent(summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks, summaryStats.combat.attackInstances),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2961,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Auto-hits: ", summaryStats.combat.autoHitAttacks] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2962,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Critical hits: ",
											summaryStats.combat.criticalHitAttacks,
											" (",
											formatPercent(summaryStats.combat.criticalHitAttacks, summaryStats.combat.attackInstances),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2963,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Extra hits generated: ", summaryStats.combat.extraHitsGenerated] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2964,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2957,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ _jsxDEV("article", {
									className: "result-card",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Wound Breakdown"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2968,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: "Conversion" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2969,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Wound rolls made: ", summaryStats.combat.woundRolls] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2970,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Successful wound rolls: ",
											summaryStats.combat.successfulWoundRolls,
											" (",
											formatPercent(summaryStats.combat.successfulWoundRolls, summaryStats.combat.woundRolls),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2971,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Auto-wounds: ", summaryStats.combat.autoWounds] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2972,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Critical wounds: ",
											summaryStats.combat.criticalWounds,
											" (",
											formatPercent(summaryStats.combat.criticalWounds, summaryStats.combat.woundRolls + summaryStats.combat.autoWounds),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2973,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Total wounds created: ", summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2974,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2967,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ _jsxDEV("article", {
									className: "result-card",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Save Breakdown"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2978,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: "Defense" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2979,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Save attempts: ", summaryStats.combat.saveAttempts] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2980,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Failed saves: ",
											summaryStats.combat.savesFailed,
											" (",
											formatPercent(summaryStats.combat.savesFailed, summaryStats.combat.saveAttempts),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2981,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Passed saves: ",
											summaryStats.combat.savesPassed,
											" (",
											formatPercent(summaryStats.combat.savesPassed, summaryStats.combat.saveAttempts),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2982,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Unsavable wounds: ", summaryStats.combat.unsavableWounds] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2983,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2977,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ _jsxDEV("article", {
									className: "result-card",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Re-roll Breakdown"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2987,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: "Efficiency" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2988,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Hit re-rolls used: ", summaryStats.combat.hitRerollsUsed] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2989,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Hit re-roll success: ",
											summaryStats.combat.hitRerollSuccesses,
											" (",
											formatPercent(summaryStats.combat.hitRerollSuccesses, summaryStats.combat.hitRerollsUsed),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2990,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Wound re-rolls used: ", summaryStats.combat.woundRerollsUsed] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2991,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Wound re-roll success: ",
											summaryStats.combat.woundRerollSuccesses,
											" (",
											formatPercent(summaryStats.combat.woundRerollSuccesses, summaryStats.combat.woundRerollsUsed),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2992,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2986,
									columnNumber: 19
								}, this),
								summaryStats.attachedCharacterRuns > 0 ? /* @__PURE__ */ _jsxDEV("article", {
									className: "result-card",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Attached Character Summary"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2997,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: attachedCharacterName || "Attached Character" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 2998,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Tracked in ",
											summaryStats.attachedCharacterRuns,
											" runs"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 2999,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Destroyed: ",
											summaryStats.attachedCharacterDestroyedCount,
											" (",
											formatPercent(summaryStats.attachedCharacterDestroyedCount, summaryStats.attachedCharacterRuns),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3e3,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Avg current wounds: ", formatAverage(summaryStats.averageAttachedCharacterWounds)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3001,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 2996,
									columnNumber: 21
								}, this) : null,
								summaryStats.hazardousBearerRuns > 0 ? /* @__PURE__ */ _jsxDEV("article", {
									className: "result-card warning",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Hazardous Summary"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3007,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: attackerUnit || "Hazardous Bearer" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3008,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Triggered in ",
											summaryStats.hazardousBearerRuns,
											" runs"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3009,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: [
											"Destroyed: ",
											summaryStats.hazardousBearerDestroyedCount,
											" (",
											formatPercent(summaryStats.hazardousBearerDestroyedCount, summaryStats.hazardousBearerRuns),
											")"
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3010,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Avg current wounds: ", formatAverage(summaryStats.averageHazardousBearerWounds)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3011,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3006,
									columnNumber: 21
								}, this) : null
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2947,
							columnNumber: 17
						}, this) : activeRun ? /* @__PURE__ */ _jsxDEV("div", {
							className: "outcome-grid",
							children: [
								/* @__PURE__ */ _jsxDEV("article", {
									className: "result-card accent",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: ["Run ", activeRun.runIndex]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3018,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: activeRun.result.target.name }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3019,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: activeRun.result.target.destroyed ? "Destroyed" : `${activeRun.result.target.models_remaining} models remain` }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3020,
											columnNumber: 21
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Current model wounds: ", activeRun.result.target.current_model_wounds] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3025,
											columnNumber: 21
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3017,
									columnNumber: 19
								}, this),
								activeRun.result.attached_character ? /* @__PURE__ */ _jsxDEV("article", {
									className: "result-card",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Attached Character"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3030,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: activeRun.result.attached_character.name }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3031,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: activeRun.result.attached_character.destroyed ? "Destroyed" : `${activeRun.result.attached_character.models_remaining} model remains` }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3032,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Current wounds: ", activeRun.result.attached_character.current_model_wounds] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3037,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3029,
									columnNumber: 21
								}, this) : null,
								activeRun.result.hazardous_bearer ? /* @__PURE__ */ _jsxDEV("article", {
									className: "result-card warning",
									children: [
										/* @__PURE__ */ _jsxDEV("p", {
											className: "kicker",
											children: "Hazardous Bearer"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3043,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("h3", { children: activeRun.result.hazardous_bearer.name }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3044,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: activeRun.result.hazardous_bearer.destroyed ? "Destroyed" : `${activeRun.result.hazardous_bearer.models_remaining} model remains` }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3045,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("p", { children: ["Current wounds: ", activeRun.result.hazardous_bearer.current_model_wounds] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3050,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3042,
									columnNumber: 21
								}, this) : null
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 3016,
							columnNumber: 17
						}, this) : null] }, void 0, true) : /* @__PURE__ */ _jsxDEV("div", {
							className: "empty-state",
							children: /* @__PURE__ */ _jsxDEV("p", { children: "Run one or more simulations to see summary statistics and individual combat logs." }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3058,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3057,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2844,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2359,
				columnNumber: 11
			}, this), /* @__PURE__ */ _jsxDEV("section", {
				className: "panel log-panel",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "panel-heading",
					children: /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
						className: "kicker",
						children: "Resolution"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3067,
						columnNumber: 17
					}, this), /* @__PURE__ */ _jsxDEV("h2", { children: activeRunView === "summary" ? "Run Index" : `Combat Log: Run ${activeRunView}` }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3068,
						columnNumber: 17
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3066,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3065,
					columnNumber: 13
				}, this), simulationRuns.length && activeRunView === "summary" ? /* @__PURE__ */ _jsxDEV("div", {
					className: "summary-index",
					children: [/* @__PURE__ */ _jsxDEV("p", {
						className: "summary-index-copy",
						children: "Use the tabs above to switch between the summary page and each individual run."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3074,
						columnNumber: 17
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "summary-index-grid",
						children: simulationRuns.map((run) => /* @__PURE__ */ _jsxDEV("button", {
							type: "button",
							className: "summary-index-card",
							onClick: () => setActiveRunView(run.runIndex),
							children: [
								/* @__PURE__ */ _jsxDEV("strong", { children: ["Run ", run.runIndex] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3085,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ _jsxDEV("span", { children: run.result.target.destroyed ? "Target destroyed" : `${run.result.target.models_remaining} models remain` }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3086,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ _jsxDEV("span", { children: ["Current wounds: ", run.result.target.current_model_wounds] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3087,
									columnNumber: 23
								}, this)
							]
						}, run.runIndex, true, {
							fileName: _jsxFileName,
							lineNumber: 3079,
							columnNumber: 21
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3077,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 3073,
					columnNumber: 15
				}, this) : activeRun?.result?.log?.length ? /* @__PURE__ */ _jsxDEV("ol", {
					className: "combat-log",
					children: activeRun.result.log.map((line, index) => /* @__PURE__ */ _jsxDEV("li", { children: line }, `${index}-${line}`, false, {
						fileName: _jsxFileName,
						lineNumber: 3095,
						columnNumber: 19
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3093,
					columnNumber: 15
				}, this) : /* @__PURE__ */ _jsxDEV("div", {
					className: "empty-state compact",
					children: /* @__PURE__ */ _jsxDEV("p", { children: "The run index and combat logs will appear here after a simulation." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3100,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3099,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3064,
				columnNumber: 11
			}, this)] }, void 0, true) : activePage === "battlefield" ? /* @__PURE__ */ _jsxDEV("section", {
				className: "panel battlefield-panel",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "panel-heading",
						children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
							className: "kicker",
							children: "Tabletop"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3109,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("h2", { children: "Battlefield" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3110,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 3108,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "battlefield-meta",
							children: [/* @__PURE__ */ _jsxDEV("span", { children: "60\" x 44\"" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3113,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Top-Down View" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3114,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 3112,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3107,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "battlefield-board-shell",
						children: /* @__PURE__ */ _jsxDEV("div", {
							ref: battlefieldBoardRef,
							className: "battlefield-board",
							children: [
								/* @__PURE__ */ _jsxDEV("div", { className: "battlefield-center-line" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3120,
									columnNumber: 15
								}, this),
								selectedBattlefieldUnit && !battlefieldInEngagementRange ? selectedBattlefieldWeaponRanges.map((weapon, index) => /* @__PURE__ */ _jsxDEV("div", {
									className: `battlefield-range-ring ${inRangeWeaponNames.includes(formatWeaponName(weapon)) ? "in-range" : ""}`,
									style: {
										left: `${battlefieldPositions[selectedBattlefieldUnit.id]?.x ?? selectedBattlefieldUnit.x}%`,
										top: `${battlefieldPositions[selectedBattlefieldUnit.id]?.y ?? selectedBattlefieldUnit.y}%`,
										width: `${weapon.totalDiameterInches / BATTLEFIELD_WIDTH_INCHES * 100}%`,
										height: `${weapon.totalDiameterInches / BATTLEFIELD_HEIGHT_INCHES * 100}%`,
										zIndex: selectedBattlefieldWeaponRanges.length - index
									}
								}, `${selectedBattlefieldUnit.id}-${weapon.name}`, false, {
									fileName: _jsxFileName,
									lineNumber: 3122,
									columnNumber: 17
								}, this)) : null,
								showBattlefieldRangeLine ? /* @__PURE__ */ _jsxDEV("svg", {
									className: "battlefield-range-line-layer",
									viewBox: "0 0 100 100",
									preserveAspectRatio: "none",
									children: /* @__PURE__ */ _jsxDEV("line", {
										className: "battlefield-range-line",
										x1: battlefieldPositions[selectedBattlefieldUnit.id]?.x ?? selectedBattlefieldUnit.x,
										y1: battlefieldPositions[selectedBattlefieldUnit.id]?.y ?? selectedBattlefieldUnit.y,
										x2: battlefieldPositions[enemyBattlefieldUnit.id]?.x ?? enemyBattlefieldUnit.x,
										y2: battlefieldPositions[enemyBattlefieldUnit.id]?.y ?? enemyBattlefieldUnit.y
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3136,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3135,
									columnNumber: 17
								}, this) : null,
								battlefieldUnits.map((unit) => /* @__PURE__ */ _jsxDEV("div", {
									className: `battlefield-unit battlefield-unit-${unit.id} ${draggingUnitId === unit.id ? "dragging" : ""} ${selectedBattlefieldUnitId === unit.id ? "selected" : ""}`,
									style: {
										left: `${battlefieldPositions[unit.id]?.x ?? unit.x}%`,
										top: `${battlefieldPositions[unit.id]?.y ?? unit.y}%`,
										width: `${unit.baseInches / BATTLEFIELD_WIDTH_INCHES * 100}%`,
										height: `${unit.baseInches / BATTLEFIELD_HEIGHT_INCHES * 100}%`
									},
									onPointerDown: handleBattlefieldUnitPointerDown(unit.id),
									children: [/* @__PURE__ */ _jsxDEV("div", { className: "battlefield-unit-dot" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3157,
										columnNumber: 19
									}, this), /* @__PURE__ */ _jsxDEV("div", {
										className: "battlefield-unit-label",
										children: [
											/* @__PURE__ */ _jsxDEV("strong", { children: unit.name }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 3159,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ _jsxDEV("span", { children: unit.role }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 3160,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ _jsxDEV("span", { children: [unit.baseMm, "mm base"] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 3161,
												columnNumber: 21
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 3158,
										columnNumber: 19
									}, this)]
								}, unit.id, true, {
									fileName: _jsxFileName,
									lineNumber: 3146,
									columnNumber: 17
								}, this))
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 3119,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3118,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "battlefield-range-summary",
						children: [
							/* @__PURE__ */ _jsxDEV("p", {
								className: "kicker",
								children: "Selected Unit Ranges"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3169,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV("h3", { children: selectedBattlefieldUnit?.name || "No unit selected" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3170,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV("p", { children: battlefieldEdgeDistanceInches === null ? "Select a unit marker to inspect its weapon ranges." : battlefieldInEngagementRange ? `Enemy distance: ${battlefieldEdgeDistanceInches.toFixed(1)}". Units are in Engagement Range.` : `Enemy distance: ${battlefieldEdgeDistanceInches.toFixed(1)}".` }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3171,
								columnNumber: 13
							}, this),
							battlefieldInEngagementRange ? selectedBattlefieldMeleeWeapons.length || selectedBattlefieldPistolWeapons.length ? /* @__PURE__ */ _jsxDEV("div", {
								className: "battlefield-range-list",
								children: [selectedBattlefieldMeleeWeapons.map((weapon) => /* @__PURE__ */ _jsxDEV("div", {
									className: "battlefield-range-list-item engaged",
									children: [/* @__PURE__ */ _jsxDEV("strong", { children: formatWeaponName(weapon) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3186,
										columnNumber: 23
									}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Melee" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3187,
										columnNumber: 23
									}, this)]
								}, `melee-${weapon.name}`, true, {
									fileName: _jsxFileName,
									lineNumber: 3182,
									columnNumber: 21
								}, this)), selectedBattlefieldPistolWeapons.map((weapon) => /* @__PURE__ */ _jsxDEV("div", {
									className: "battlefield-range-list-item engaged pistol",
									children: [/* @__PURE__ */ _jsxDEV("strong", { children: formatWeaponName(weapon) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3195,
										columnNumber: 23
									}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Pistol" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3196,
										columnNumber: 23
									}, this)]
								}, `pistol-${weapon.name}`, true, {
									fileName: _jsxFileName,
									lineNumber: 3191,
									columnNumber: 21
								}, this))]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3180,
								columnNumber: 17
							}, this) : /* @__PURE__ */ _jsxDEV("p", { children: "No melee or pistol weapons available." }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3201,
								columnNumber: 17
							}, this) : selectedBattlefieldWeaponRanges.length ? /* @__PURE__ */ _jsxDEV("div", {
								className: "battlefield-range-list",
								children: selectedBattlefieldWeaponRanges.map((weapon) => {
									const weaponInRange = inRangeWeaponNames.includes(formatWeaponName(weapon));
									const weaponInHalfRange = halfRangeWeaponNames.includes(formatWeaponName(weapon));
									return /* @__PURE__ */ _jsxDEV("div", {
										className: `battlefield-range-list-item ${weaponInRange ? "in-range" : ""}`,
										children: [/* @__PURE__ */ _jsxDEV("div", {
											className: "battlefield-range-list-copy",
											children: [/* @__PURE__ */ _jsxDEV("strong", { children: formatWeaponName(weapon) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 3214,
												columnNumber: 25
											}, this), weapon.hasHalfRangeRule ? /* @__PURE__ */ _jsxDEV("span", {
												className: `battlefield-half-range-badge ${weaponInHalfRange ? "active" : ""}`,
												children: [
													"Half Range ",
													weapon.halfRangeInches,
													"\""
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 3216,
												columnNumber: 27
											}, this) : null]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3213,
											columnNumber: 23
										}, this), /* @__PURE__ */ _jsxDEV("span", { children: [weapon.rangeInches, "\""] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3221,
											columnNumber: 23
										}, this)]
									}, `summary-${weapon.name}`, true, {
										fileName: _jsxFileName,
										lineNumber: 3209,
										columnNumber: 21
									}, this);
								})
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3204,
								columnNumber: 15
							}, this) : /* @__PURE__ */ _jsxDEV("p", { children: "No ranged weapons to display." }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3227,
								columnNumber: 15
							}, this),
							!battlefieldInEngagementRange && showBattlefieldRangeLine ? /* @__PURE__ */ _jsxDEV("p", { children: ["In range: ", inRangeWeaponNames.join(", ")] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3230,
								columnNumber: 15
							}, this) : !battlefieldInEngagementRange && battlefieldEdgeDistanceInches !== null ? /* @__PURE__ */ _jsxDEV("p", { children: "No ranged weapons currently reach the enemy unit." }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3234,
								columnNumber: 15
							}, this) : null,
							!battlefieldInEngagementRange && halfRangeWeaponNames.length ? /* @__PURE__ */ _jsxDEV("p", { children: ["Within half range: ", halfRangeWeaponNames.join(", ")] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3237,
								columnNumber: 15
							}, this) : null
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3168,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "battlefield-combat-panel",
						children: [
							/* @__PURE__ */ _jsxDEV("div", {
								className: "panel-heading",
								children: /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
									className: "kicker",
									children: "Battlefield Sim"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3246,
									columnNumber: 17
								}, this), /* @__PURE__ */ _jsxDEV("h2", { children: "Eligible Combat" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3247,
									columnNumber: 17
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3245,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3244,
								columnNumber: 13
							}, this),
							battlefieldCombatOptions.length ? /* @__PURE__ */ _jsxDEV("div", {
								className: "battlefield-combat-grid",
								children: [
									/* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Eligible Combatant" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3254,
										columnNumber: 19
									}, this), /* @__PURE__ */ _jsxDEV("select", {
										value: battlefieldCombatAttackerId,
										onChange: (event) => setBattlefieldCombatAttackerId(event.target.value),
										children: battlefieldCombatOptions.map((option) => /* @__PURE__ */ _jsxDEV("option", {
											value: option.id,
											children: option.attackerName
										}, option.id, false, {
											fileName: _jsxFileName,
											lineNumber: 3260,
											columnNumber: 23
										}, this))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3255,
										columnNumber: 19
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 3253,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ _jsxDEV("label", { children: [/* @__PURE__ */ _jsxDEV("span", { children: "Target" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3268,
										columnNumber: 19
									}, this), /* @__PURE__ */ _jsxDEV("input", {
										type: "text",
										value: selectedBattlefieldCombatant?.defenderName || "",
										readOnly: true
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3269,
										columnNumber: 19
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 3267,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ _jsxDEV("label", {
										className: "battlefield-combat-span",
										children: [/* @__PURE__ */ _jsxDEV("span", { children: "Eligible Weapon Profile" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3277,
											columnNumber: 19
										}, this), /* @__PURE__ */ _jsxDEV("select", {
											value: battlefieldCombatWeaponName,
											onChange: (event) => setBattlefieldCombatWeaponName(event.target.value),
											children: battlefieldCombatWeaponOptions.map((weapon) => /* @__PURE__ */ _jsxDEV("option", {
												value: weapon.name,
												children: formatWeaponName(weapon)
											}, weapon.name, false, {
												fileName: _jsxFileName,
												lineNumber: 3283,
												columnNumber: 23
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3278,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 3276,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ _jsxDEV("button", {
										type: "button",
										className: "primary-button battlefield-combat-button",
										onClick: handleBattlefieldSimulate,
										disabled: !selectedBattlefieldCombatant || !selectedBattlefieldCombatWeapon || simulating,
										children: simulating ? "Running Simulations..." : "Run Battlefield Simulation"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 3290,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3252,
								columnNumber: 15
							}, this) : /* @__PURE__ */ _jsxDEV("div", {
								className: "empty-state compact",
								children: /* @__PURE__ */ _jsxDEV("p", { children: "No eligible combatants at the current positions." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3301,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3300,
								columnNumber: 15
							}, this),
							simulationRuns.length ? /* @__PURE__ */ _jsxDEV("div", {
								className: "battlefield-combat-results",
								children: [/* @__PURE__ */ _jsxDEV("p", {
									className: "kicker",
									children: "Latest Result"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3307,
									columnNumber: 17
								}, this), /* @__PURE__ */ _jsxDEV("div", {
									className: "battlefield-combat-result-grid",
									children: [
										/* @__PURE__ */ _jsxDEV("article", {
											className: "result-card accent",
											children: [
												/* @__PURE__ */ _jsxDEV("h3", { children: simulationRuns[0].result.target.name }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3310,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: [
													summaryStats.totalRuns,
													" run",
													summaryStats.totalRuns === 1 ? "" : "s"
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3311,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: [
													"Destroyed: ",
													summaryStats.targetDestroyedCount,
													" (",
													formatPercent(summaryStats.targetDestroyedCount, summaryStats.totalRuns),
													")"
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3314,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3309,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ _jsxDEV("article", {
											className: "result-card",
											children: [
												/* @__PURE__ */ _jsxDEV("h3", { children: "Selected Attack" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3319,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: selectedBattlefieldCombatant?.attackerName || "No combatant selected" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3320,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: formatWeaponName(selectedBattlefieldCombatWeapon) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3321,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: selectedBattlefieldCombatant?.defenderName || "No target selected" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3322,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3318,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ _jsxDEV("article", {
											className: "result-card",
											children: [
												/* @__PURE__ */ _jsxDEV("h3", { children: "Hits" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3325,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: [
													"Landed: ",
													summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks,
													" ",
													"(",
													formatPercent(summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks, summaryStats.combat.attackInstances),
													")"
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3326,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Critical: ", summaryStats.combat.criticalHitAttacks] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3330,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Extra hits: ", summaryStats.combat.extraHitsGenerated] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3331,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3324,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ _jsxDEV("article", {
											className: "result-card",
											children: [
												/* @__PURE__ */ _jsxDEV("h3", { children: "Wounds" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3334,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: [
													"Successful: ",
													summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds,
													" ",
													"(",
													formatPercent(summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds, summaryStats.combat.woundRolls + summaryStats.combat.autoWounds),
													")"
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3335,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Critical: ", summaryStats.combat.criticalWounds] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3339,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Auto-wounds: ", summaryStats.combat.autoWounds] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3340,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3333,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ _jsxDEV("article", {
											className: "result-card",
											children: [
												/* @__PURE__ */ _jsxDEV("h3", { children: "Saves" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3343,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Attempts: ", summaryStats.combat.saveAttempts] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3344,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: [
													"Failed: ",
													summaryStats.combat.savesFailed,
													" (",
													formatPercent(summaryStats.combat.savesFailed, summaryStats.combat.saveAttempts),
													")"
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3345,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Unsavable: ", summaryStats.combat.unsavableWounds] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3346,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3342,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ _jsxDEV("article", {
											className: "result-card",
											children: [
												/* @__PURE__ */ _jsxDEV("h3", { children: "Re-rolls" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 3349,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Hit re-rolls: ", summaryStats.combat.hitRerollsUsed] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3350,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Hit success: ", formatPercent(summaryStats.combat.hitRerollSuccesses, summaryStats.combat.hitRerollsUsed)] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3351,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ _jsxDEV("p", { children: ["Wound success: ", formatPercent(summaryStats.combat.woundRerollSuccesses, summaryStats.combat.woundRerollsUsed)] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 3352,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 3348,
											columnNumber: 19
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3308,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3306,
								columnNumber: 15
							}, this) : null
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3243,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "battlefield-legend",
						children: battlefieldUnits.map((unit) => /* @__PURE__ */ _jsxDEV("article", {
							className: "battlefield-legend-card",
							children: [
								/* @__PURE__ */ _jsxDEV("p", {
									className: "kicker",
									children: unit.role
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3362,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ _jsxDEV("h3", { children: unit.name }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3363,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ _jsxDEV("p", { children: unit.faction || "Faction not set" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3364,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ _jsxDEV("p", { children: [
									"Base: ",
									unit.baseMm,
									"mm"
								] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3365,
									columnNumber: 17
								}, this)
							]
						}, `${unit.id}-legend`, true, {
							fileName: _jsxFileName,
							lineNumber: 3361,
							columnNumber: 15
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3359,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3106,
				columnNumber: 9
			}, this) : /* @__PURE__ */ _jsxDEV("section", {
				className: "panel placeholder-panel",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "panel-heading",
					children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
						className: "kicker",
						children: "Roster"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3374,
						columnNumber: 15
					}, this), /* @__PURE__ */ _jsxDEV("h2", { children: "Army List" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3375,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3373,
						columnNumber: 13
					}, this), /* @__PURE__ */ _jsxDEV("p", {
						className: "army-list-count",
						children: [
							armyListEntries.reduce((total, entry) => total + entry.count, 0),
							" unit",
							armyListEntries.reduce((total, entry) => total + entry.count, 0) === 1 ? "" : "s"
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3377,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 3372,
					columnNumber: 11
				}, this), armyListEntries.length ? /* @__PURE__ */ _jsxDEV("div", {
					className: "army-list-grid",
					children: armyListEntries.map((entry) => /* @__PURE__ */ _jsxDEV("article", {
						className: "army-list-card",
						children: [
							/* @__PURE__ */ _jsxDEV("div", {
								className: "army-list-card-header",
								children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
									className: "kicker",
									children: entry.faction
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3388,
									columnNumber: 23
								}, this), /* @__PURE__ */ _jsxDEV("h3", { children: entry.name }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3389,
									columnNumber: 23
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3387,
									columnNumber: 21
								}, this), /* @__PURE__ */ _jsxDEV("div", {
									className: "army-list-quantity",
									children: [
										/* @__PURE__ */ _jsxDEV("button", {
											type: "button",
											className: "secondary-button army-list-quantity-button",
											onClick: () => updateArmyListEntryCount(entry.id, entry.count - 1),
											disabled: entry.count <= 1,
											children: "-"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3392,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("input", {
											type: "number",
											min: "1",
											className: "army-list-quantity-input",
											value: entry.count,
											onChange: (event) => updateArmyListEntryCount(entry.id, event.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3400,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ _jsxDEV("button", {
											type: "button",
											className: "secondary-button army-list-quantity-button",
											onClick: () => updateArmyListEntryCount(entry.id, entry.count + 1),
											children: "+"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 3407,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3391,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3386,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("div", {
								className: "datasheet-stats",
								children: renderStatsGrid(entry.stats)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3416,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("div", {
								className: "army-list-card-actions",
								children: [/* @__PURE__ */ _jsxDEV("span", {
									className: "army-list-badge",
									children: ["x", entry.count]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 3420,
									columnNumber: 21
								}, this), /* @__PURE__ */ _jsxDEV("button", {
									type: "button",
									className: "secondary-button",
									onClick: () => removeArmyListEntry(entry.id),
									children: "Remove Entry"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3421,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 3419,
								columnNumber: 19
							}, this)
						]
					}, entry.id, true, {
						fileName: _jsxFileName,
						lineNumber: 3385,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3383,
					columnNumber: 13
				}, this) : /* @__PURE__ */ _jsxDEV("div", {
					className: "empty-state",
					children: /* @__PURE__ */ _jsxDEV("p", { children: "Add units from the Combat page and they will appear here." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3434,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3433,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3371,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2312,
		columnNumber: 5
	}, this);
}
_s(App, "fqCHbrywftNM5ewVOfBekBPP/fk=");
_c = App;
export default App;
var _c;
$RefreshReg$(_c, "App");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/src/App.jsx";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/EricThompson/OneDrive - LP and Associates Inc/Documents/WH40K/40K Combat Sim App Python/frontend/src/App.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/EricThompson/OneDrive - LP and Associates Inc/Documents/WH40K/40K Combat Sim App Python/frontend/src/App.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "C:/Users/EricThompson/OneDrive - LP and Associates Inc/Documents/WH40K/40K Combat Sim App Python/frontend/src/App.jsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,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a0MsS0FBRSxNQUFNLE1BQWE7Ozs7O2tCQUN2RCx3QkFBQyxVQUFEO1NBQ0UsTUFBSztTQUNMLFdBQVU7U0FDVixlQUFlLG9CQUFvQixNQUFNLEdBQUc7bUJBQzdDO1NBRVE7Ozs7aUJBQ0w7Ozs7OztPQUNFO1FBNUNJLE1BQU07Ozs7YUE0Q1YsQ0FDVjtLQUNFOzs7O2VBRU4sd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFDYix3QkFBQyxLQUFELFlBQUcsNkRBQTZEOzs7OztLQUM1RDs7OzthQUVBOzs7Ozs7R0FFUjs7Ozs7Ozt1Q0FFVDs7QUFFRCxlQUFlIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIkFwcC5qc3giXSwidmVyc2lvbiI6Mywic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnXG5pbXBvcnQgJy4vQXBwLmNzcydcbmltcG9ydCB7XG4gIGZldGNoRmFjdGlvbnMsXG4gIGZldGNoRmFjdGlvbkRldGFpbHMsXG4gIGZldGNoVW5pdERldGFpbHNXaXRoTG9hZG91dCxcbiAgZmV0Y2hVbml0cyxcbiAgc2ltdWxhdGVDb21iYXQsXG59IGZyb20gJy4vYXBpJ1xuXG5jb25zdCBzdGF0RGlzcGxheVJvd3MgPSBbXG4gIFtcbiAgICBbJ21vdmVtZW50JywgJ00nLCAodmFsdWUpID0+IGAke3ZhbHVlfVwiYF0sXG4gICAgWyd0b3VnaG5lc3MnLCAnVCddLFxuICAgIFsnc2F2ZScsICdTViddLFxuICBdLFxuICBbXG4gICAgWyd3b3VuZHMnLCAnVyddLFxuICAgIFsnbGVhZGVyc2hpcCcsICdMRCddLFxuICAgIFsnb2JqZWN0aXZlX2NvbnRyb2wnLCAnT0MnXSxcbiAgXSxcbl1cblxuY29uc3QgQUxMX1JBTkdFRF9XRUFQT05TID0gJ19fYWxsX3JhbmdlZF9fJ1xuY29uc3QgQUxMX01FTEVFX1dFQVBPTlMgPSAnX19hbGxfbWVsZWVfXydcblxuY29uc3QgaW5pdGlhbE9wdGlvbnMgPSB7XG4gIHRhcmdldF9oYXNfY292ZXI6IGZhbHNlLFxuICBhdHRhY2tlcl9pbl9lbmdhZ2VtZW50X3JhbmdlOiBmYWxzZSxcbiAgdGFyZ2V0X2luX2VuZ2FnZW1lbnRfcmFuZ2Vfb2ZfYWxsaWVzOiBmYWxzZSxcbiAgaW5faGFsZl9yYW5nZTogZmFsc2UsXG4gIG9hdGhfb2ZfbW9tZW50X2FjdGl2ZTogZmFsc2UsXG4gIGNoYXJnZWRfdGhpc190dXJuOiBmYWxzZSxcbiAgcmVtYWluZWRfc3RhdGlvbmFyeTogZmFsc2UsXG4gIGluZGlyZWN0X3RhcmdldF92aXNpYmxlOiB0cnVlLFxuICBhdHRhY2hlZF9jaGFyYWN0ZXJfbmFtZTogJycsXG4gIGhhemFyZG91c19vdmVyd2F0Y2hfY2hhcmdlX3BoYXNlOiBmYWxzZSxcbiAgaGF6YXJkb3VzX2JlYXJlcl9jdXJyZW50X3dvdW5kczogJycsXG4gIGF0dGFja2VyX2ZpcmVfZGlzY2lwbGluZV9hY3RpdmU6IGZhbHNlLFxuICBhdHRhY2tlcl9tYXJrZWRfZm9yX2Rlc3RydWN0aW9uX2FjdGl2ZTogZmFsc2UsXG4gIGF0dGFja2VyX3VuZm9yZ2l2ZW5fZnVyeV9hY3RpdmU6IGZhbHNlLFxuICBhdHRhY2tlcl91bmZvcmdpdmVuX2Z1cnlfYXJteV9iYXR0bGVzaG9ja2VkOiBmYWxzZSxcbiAgYXR0YWNrZXJfc3R1YmJvcm5fdGVuYWNpdHlfYWN0aXZlOiBmYWxzZSxcbiAgYXR0YWNrZXJfd2VhcG9uc19vZl90aGVfZmlyc3RfbGVnaW9uX2FjdGl2ZTogZmFsc2UsXG4gIGF0dGFja2VyX3Blbm5hbnRfb2ZfcmVtZW1icmFuY2VfYWN0aXZlOiBmYWxzZSxcbiAgYXR0YWNrZXJfYmVsb3dfc3RhcnRpbmdfc3RyZW5ndGg6IGZhbHNlLFxuICBhdHRhY2tlcl9iYXR0bGVzaG9ja2VkOiBmYWxzZSxcbiAgZGVmZW5kZXJfYXJtb3VyX29mX2NvbnRlbXB0X2FjdGl2ZTogZmFsc2UsXG4gIGRlZmVuZGVyX292ZXJ3aGVsbWluZ19vbnNsYXVnaHRfYWN0aXZlOiBmYWxzZSxcbiAgZGVmZW5kZXJfdW5icmVha2FibGVfbGluZXNfYWN0aXZlOiBmYWxzZSxcbiAgZGVmZW5kZXJfcGVubmFudF9vZl9yZW1lbWJyYW5jZV9hY3RpdmU6IGZhbHNlLFxuICBkZWZlbmRlcl9iYXR0bGVzaG9ja2VkOiBmYWxzZSxcbn1cblxuY29uc3QgVU5GT1JHSVZFTl9UQVNLX0ZPUkNFID0gJ1VuZm9yZ2l2ZW4gVGFzayBGb3JjZSdcbmNvbnN0IFNBR0FfT0ZfVEhFX0hVTlRFUiA9ICdTYWdhIG9mIHRoZSBIdW50ZXInXG5jb25zdCBPQVRIX0VYQ0xVREVEX0tFWVdPUkRTID0gW1xuICAnYmxhY2sgdGVtcGxhcnMnLFxuICAnYmxvb2QgYW5nZWxzJyxcbiAgJ2RhcmsgYW5nZWxzJyxcbiAgJ2RlYXRod2F0Y2gnLFxuICAnc3BhY2Ugd29sdmVzJyxcbl1cbmNvbnN0IE9BVEhfT0ZfTU9NRU5UX1JVTEVfVEVYVCA9ICdTZWxlY3Qgb25lIGVuZW15IHVuaXQuIEVhY2ggdGltZSBhIG1vZGVsIHdpdGggT2F0aCBvZiBNb21lbnQgbWFrZXMgYW4gYXR0YWNrIHRoYXQgdGFyZ2V0cyB0aGF0IHVuaXQsIHlvdSBjYW4gcmUtcm9sbCB0aGUgSGl0IHJvbGwuJ1xuY29uc3QgT0FUSF9PRl9NT01FTlRfQ09ERVhfUklERVJfVEVYVCA9ICdJZiB5b3UgYXJlIHVzaW5nIGEgQ29kZXg6IFNwYWNlIE1hcmluZXMgRGV0YWNobWVudCBhbmQgeW91ciBhcm15IGRvZXMgbm90IGluY2x1ZGUgQmxhY2sgVGVtcGxhcnMsIEJsb29kIEFuZ2VscywgRGFyayBBbmdlbHMsIERlYXRod2F0Y2gsIG9yIFNwYWNlIFdvbHZlcyB1bml0cywgYWRkIDEgdG8gdGhlIFdvdW5kIHJvbGwgYXMgd2VsbC4nXG5jb25zdCBCQVRUTEVGSUVMRF9XSURUSF9JTkNIRVMgPSA2MFxuY29uc3QgQkFUVExFRklFTERfSEVJR0hUX0lOQ0hFUyA9IDQ0XG5jb25zdCBVTklUX0JBU0VfRElBTUVURVJTX01NID0ge1xuICBcIkxpb24gRWwnSm9uc29uXCI6IDYwLFxuICAnTG9nYW4gR3JpbW5hcic6IDgwLFxufVxuXG5mdW5jdGlvbiBnZXREZXRhY2htZW50QnlOYW1lKGZhY3Rpb25EZXRhaWxzLCBkZXRhY2htZW50TmFtZSkge1xuICByZXR1cm4gZmFjdGlvbkRldGFpbHM/LmRldGFjaG1lbnRzPy5maW5kKChkZXRhY2htZW50KSA9PiBkZXRhY2htZW50Lm5hbWUgPT09IGRldGFjaG1lbnROYW1lKSB8fCBudWxsXG59XG5cbmZ1bmN0aW9uIHVuaXRJc0VwaWNIZXJvKHVuaXQpIHtcbiAgcmV0dXJuICh1bml0Py5rZXl3b3JkcyB8fCBbXSkuc29tZSgoa2V5d29yZCkgPT4gU3RyaW5nKGtleXdvcmQpLnRvTG93ZXJDYXNlKCkgPT09ICdlcGljIGhlcm8nKVxufVxuXG5mdW5jdGlvbiBnZXRBdHRhY2tlckVuaGFuY2VtZW50T3B0aW9ucyhkZXRhY2htZW50LCB1bml0LCBzZWxlY3RlZFdlYXBvbiwgaGFzSGF6YXJkb3VzKSB7XG4gIGlmICghZGV0YWNobWVudCB8fCBkZXRhY2htZW50Lm5hbWUgIT09IFVORk9SR0lWRU5fVEFTS19GT1JDRSB8fCB1bml0SXNFcGljSGVybyh1bml0KSkge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgcmV0dXJuIChkZXRhY2htZW50LmVuaGFuY2VtZW50cyB8fCBbXSkuZmlsdGVyKChlbmhhbmNlbWVudCkgPT4ge1xuICAgIGlmIChlbmhhbmNlbWVudC5uYW1lID09PSAnU3R1YmJvcm4gVGVuYWNpdHknKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoZW5oYW5jZW1lbnQubmFtZSA9PT0gJ1dlYXBvbnMgb2YgdGhlIEZpcnN0IExlZ2lvbicpIHtcbiAgICAgIHJldHVybiBzZWxlY3RlZFdlYXBvbj8ucmFuZ2UgPT09ICdNZWxlZSdcbiAgICB9XG4gICAgaWYgKGVuaGFuY2VtZW50Lm5hbWUgPT09ICdQZW5uYW50IG9mIFJlbWVtYnJhbmNlJykge1xuICAgICAgcmV0dXJuIGhhc0hhemFyZG91c1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0RGVmZW5kZXJFbmhhbmNlbWVudE9wdGlvbnMoZGV0YWNobWVudCwgdW5pdCkge1xuICBpZiAoIWRldGFjaG1lbnQgfHwgZGV0YWNobWVudC5uYW1lICE9PSBVTkZPUkdJVkVOX1RBU0tfRk9SQ0UgfHwgdW5pdElzRXBpY0hlcm8odW5pdCkpIHtcbiAgICByZXR1cm4gW11cbiAgfVxuXG4gIHJldHVybiAoZGV0YWNobWVudC5lbmhhbmNlbWVudHMgfHwgW10pLmZpbHRlcihcbiAgICAoZW5oYW5jZW1lbnQpID0+IGVuaGFuY2VtZW50Lm5hbWUgPT09ICdQZW5uYW50IG9mIFJlbWVtYnJhbmNlJyxcbiAgKVxufVxuXG5mdW5jdGlvbiBnZXRBdHRhY2tlclN0cmF0YWdlbU9wdGlvbnMoZGV0YWNobWVudCwgdW5pdCwgaXNSYW5nZWRXZWFwb24pIHtcbiAgaWYgKCFkZXRhY2htZW50KSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICByZXR1cm4gKGRldGFjaG1lbnQuc3RyYXRhZ2VtcyB8fCBbXSkuZmlsdGVyKChzdHJhdGFnZW0pID0+IHtcbiAgICBpZiAoZGV0YWNobWVudC5uYW1lID09PSBVTkZPUkdJVkVOX1RBU0tfRk9SQ0UpIHtcbiAgICAgIGlmIChzdHJhdGFnZW0ubmFtZSA9PT0gJ0ZpcmUgRGlzY2lwbGluZScpIHtcbiAgICAgICAgcmV0dXJuIGlzUmFuZ2VkV2VhcG9uXG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyYXRhZ2VtLm5hbWUgPT09ICdVbmZvcmdpdmVuIEZ1cnknXG4gICAgfVxuXG4gICAgaWYgKGRldGFjaG1lbnQubmFtZSA9PT0gU0FHQV9PRl9USEVfSFVOVEVSKSB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICBzdHJhdGFnZW0ubmFtZSA9PT0gJ01hcmtlZCBmb3IgRGVzdHJ1Y3Rpb24nXG4gICAgICAgICYmIGlzUmFuZ2VkV2VhcG9uXG4gICAgICAgICYmICF1bml0SGFzS2V5d29yZCh1bml0LCAnYmVhc3RzJylcbiAgICAgIClcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0RGVmZW5kZXJTdHJhdGFnZW1PcHRpb25zKGRldGFjaG1lbnQsIHNlbGVjdGVkV2VhcG9uKSB7XG4gIGlmICghZGV0YWNobWVudCkge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgcmV0dXJuIChkZXRhY2htZW50LnN0cmF0YWdlbXMgfHwgW10pLmZpbHRlcigoc3RyYXRhZ2VtKSA9PiB7XG4gICAgaWYgKGRldGFjaG1lbnQubmFtZSA9PT0gVU5GT1JHSVZFTl9UQVNLX0ZPUkNFKSB7XG4gICAgICBpZiAoc3RyYXRhZ2VtLm5hbWUgPT09ICdBcm1vdXIgb2YgQ29udGVtcHQnKSB7XG4gICAgICAgIHJldHVybiBOdW1iZXIoc2VsZWN0ZWRXZWFwb24/LmFwIHx8IDApID4gMFxuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cmF0YWdlbS5uYW1lID09PSAnVW5icmVha2FibGUgTGluZXMnXG4gICAgfVxuXG4gICAgaWYgKGRldGFjaG1lbnQubmFtZSA9PT0gU0FHQV9PRl9USEVfSFVOVEVSKSB7XG4gICAgICByZXR1cm4gc3RyYXRhZ2VtLm5hbWUgPT09ICdPdmVyd2hlbG1pbmcgT25zbGF1Z2h0JyAmJiBzZWxlY3RlZFdlYXBvbj8ucmFuZ2UgPT09ICdNZWxlZSdcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbn1cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IoZXJyb3IpIHtcbiAgaWYgKGVycm9yPy5yZXNwb25zZT8uZGF0YT8uZGV0YWlsKSB7XG4gICAgcmV0dXJuIFN0cmluZyhlcnJvci5yZXNwb25zZS5kYXRhLmRldGFpbClcbiAgfVxuICByZXR1cm4gZXJyb3I/Lm1lc3NhZ2UgfHwgJ1NvbWV0aGluZyB3ZW50IHdyb25nLidcbn1cblxuZnVuY3Rpb24gYnVpbGRTaW11bGF0aW9uUGF5bG9hZChzdGF0ZSkge1xuICBjb25zdCBvcHRpb25zID0ge1xuICAgIHRhcmdldF9oYXNfY292ZXI6IHN0YXRlLnRhcmdldEhhc0NvdmVyLFxuICAgIGF0dGFja2VyX2luX2VuZ2FnZW1lbnRfcmFuZ2U6IHN0YXRlLmF0dGFja2VySW5FbmdhZ2VtZW50UmFuZ2UsXG4gICAgdGFyZ2V0X2luX2VuZ2FnZW1lbnRfcmFuZ2Vfb2ZfYWxsaWVzOiBzdGF0ZS50YXJnZXRJbkVuZ2FnZW1lbnRSYW5nZU9mQWxsaWVzLFxuICAgIGluX2hhbGZfcmFuZ2U6IHN0YXRlLmluSGFsZlJhbmdlLFxuICAgIG9hdGhfb2ZfbW9tZW50X2FjdGl2ZTogc3RhdGUub2F0aE9mTW9tZW50QWN0aXZlLFxuICAgIGNoYXJnZWRfdGhpc190dXJuOiBzdGF0ZS5jaGFyZ2VkVGhpc1R1cm4sXG4gICAgcmVtYWluZWRfc3RhdGlvbmFyeTogc3RhdGUucmVtYWluZWRTdGF0aW9uYXJ5LFxuICAgIGluZGlyZWN0X3RhcmdldF92aXNpYmxlOiBzdGF0ZS5pbmRpcmVjdFRhcmdldFZpc2libGUsXG4gICAgaGF6YXJkb3VzX292ZXJ3YXRjaF9jaGFyZ2VfcGhhc2U6IHN0YXRlLmhhemFyZG91c092ZXJ3YXRjaENoYXJnZVBoYXNlLFxuICAgIGF0dGFja2VyX21hcmtlZF9mb3JfZGVzdHJ1Y3Rpb25fYWN0aXZlOiBzdGF0ZS5hdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlLFxuICAgIGF0dGFja2VyX2ZpcmVfZGlzY2lwbGluZV9hY3RpdmU6IHN0YXRlLmF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUsXG4gICAgYXR0YWNrZXJfdW5mb3JnaXZlbl9mdXJ5X2FjdGl2ZTogc3RhdGUuYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFjdGl2ZSxcbiAgICBhdHRhY2tlcl91bmZvcmdpdmVuX2Z1cnlfYXJteV9iYXR0bGVzaG9ja2VkOiBzdGF0ZS5hdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QXJteUJhdHRsZXNob2NrZWQsXG4gICAgYXR0YWNrZXJfc3R1YmJvcm5fdGVuYWNpdHlfYWN0aXZlOiBzdGF0ZS5hdHRhY2tlclN0dWJib3JuVGVuYWNpdHlBY3RpdmUsXG4gICAgYXR0YWNrZXJfd2VhcG9uc19vZl90aGVfZmlyc3RfbGVnaW9uX2FjdGl2ZTogc3RhdGUuYXR0YWNrZXJXZWFwb25zT2ZUaGVGaXJzdExlZ2lvbkFjdGl2ZSxcbiAgICBhdHRhY2tlcl9wZW5uYW50X29mX3JlbWVtYnJhbmNlX2FjdGl2ZTogc3RhdGUuYXR0YWNrZXJQZW5uYW50T2ZSZW1lbWJyYW5jZUFjdGl2ZSxcbiAgICBhdHRhY2tlcl9iZWxvd19zdGFydGluZ19zdHJlbmd0aDogc3RhdGUuYXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGgsXG4gICAgYXR0YWNrZXJfYmF0dGxlc2hvY2tlZDogc3RhdGUuYXR0YWNrZXJCYXR0bGVzaG9ja2VkLFxuICAgIGRlZmVuZGVyX2FybW91cl9vZl9jb250ZW1wdF9hY3RpdmU6IHN0YXRlLmRlZmVuZGVyQXJtb3VyT2ZDb250ZW1wdEFjdGl2ZSxcbiAgICBkZWZlbmRlcl9vdmVyd2hlbG1pbmdfb25zbGF1Z2h0X2FjdGl2ZTogc3RhdGUuZGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHRBY3RpdmUsXG4gICAgZGVmZW5kZXJfdW5icmVha2FibGVfbGluZXNfYWN0aXZlOiBzdGF0ZS5kZWZlbmRlclVuYnJlYWthYmxlTGluZXNBY3RpdmUsXG4gICAgZGVmZW5kZXJfcGVubmFudF9vZl9yZW1lbWJyYW5jZV9hY3RpdmU6IHN0YXRlLmRlZmVuZGVyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUsXG4gICAgZGVmZW5kZXJfYmF0dGxlc2hvY2tlZDogc3RhdGUuZGVmZW5kZXJCYXR0bGVzaG9ja2VkLFxuICB9XG5cbiAgaWYgKHN0YXRlLmF0dGFjaGVkQ2hhcmFjdGVyTmFtZSkge1xuICAgIG9wdGlvbnMuYXR0YWNoZWRfY2hhcmFjdGVyX25hbWUgPSBzdGF0ZS5hdHRhY2hlZENoYXJhY3Rlck5hbWVcbiAgfVxuICBpZiAoc3RhdGUuaGF6YXJkb3VzQmVhcmVyQ3VycmVudFdvdW5kcyAhPT0gJycpIHtcbiAgICBvcHRpb25zLmhhemFyZG91c19iZWFyZXJfY3VycmVudF93b3VuZHMgPSBOdW1iZXIoc3RhdGUuaGF6YXJkb3VzQmVhcmVyQ3VycmVudFdvdW5kcylcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYXR0YWNrZXJfZmFjdGlvbjogc3RhdGUuYXR0YWNrZXJGYWN0aW9uLFxuICAgIGF0dGFja2VyX3VuaXQ6IHN0YXRlLmF0dGFja2VyVW5pdCxcbiAgICBhdHRhY2tlcl9sb2Fkb3V0OiBzdGF0ZS5hdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zIHx8IHt9LFxuICAgIGF0dGFja2VyX21vZGVsX2NvdW50OiBzdGF0ZS5hdHRhY2tlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKHN0YXRlLmF0dGFja2VyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQsXG4gICAgd2VhcG9uX25hbWU6IHN0YXRlLndlYXBvbk5hbWUsXG4gICAgZGVmZW5kZXJfZmFjdGlvbjogc3RhdGUuZGVmZW5kZXJGYWN0aW9uLFxuICAgIGRlZmVuZGVyX3VuaXQ6IHN0YXRlLmRlZmVuZGVyVW5pdCxcbiAgICBkZWZlbmRlcl9sb2Fkb3V0OiBzdGF0ZS5kZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zIHx8IHt9LFxuICAgIGRlZmVuZGVyX21vZGVsX2NvdW50OiBzdGF0ZS5kZWZlbmRlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKHN0YXRlLmRlZmVuZGVyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQsXG4gICAgYXR0YWNoZWRfY2hhcmFjdGVyX2xvYWRvdXQ6IHN0YXRlLmF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMgfHwge30sXG4gICAgYXR0YWNoZWRfY2hhcmFjdGVyX21vZGVsX2NvdW50OiBzdGF0ZS5hdHRhY2hlZENoYXJhY3Rlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKHN0YXRlLmF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQsXG4gICAgb3B0aW9ucyxcbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JtYXRJbnZ1bG5lcmFibGVTYXZlKHZhbHVlKSB7XG4gIGNvbnN0IHRleHQgPSBTdHJpbmcodmFsdWUpXG4gIHJldHVybiB0ZXh0LmVuZHNXaXRoKCcrJykgPyBgJHt0ZXh0fStgIDogYCR7dGV4dH0rK2Bcbn1cblxuZnVuY3Rpb24gZm9ybWF0UmFuZ2VWYWx1ZSh2YWx1ZSkge1xuICByZXR1cm4gU3RyaW5nKHZhbHVlKS5yZXBsYWNlKC9cXHMqaW5jaGVzPy9pLCAnXCInKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWFwb25CYXNlTmFtZShuYW1lKSB7XG4gIHJldHVybiBTdHJpbmcobmFtZSkucmVwbGFjZSgvLVxccyooW2Etel0pLywgKF8sIGZpcnN0TGV0dGVyKSA9PiBgLSAke2ZpcnN0TGV0dGVyLnRvVXBwZXJDYXNlKCl9YClcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2VhcG9uTmFtZSh3ZWFwb24pIHtcbiAgaWYgKCF3ZWFwb24pIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICBpZiAod2VhcG9uLmxhYmVsKSB7XG4gICAgcmV0dXJuIHdlYXBvbi5sYWJlbFxuICB9XG5cbiAgY29uc3Qga2V5d29yZFRleHQgPSAod2VhcG9uLnJhd19rZXl3b3JkcyB8fCBbXSlcbiAgICAubWFwKChrZXl3b3JkKSA9PiBgWyR7a2V5d29yZH1dYClcbiAgICAuam9pbignICcpXG5cbiAgY29uc3QgZm9ybWF0dGVkTmFtZSA9IGZvcm1hdFdlYXBvbkJhc2VOYW1lKHdlYXBvbi5uYW1lKVxuICByZXR1cm4ga2V5d29yZFRleHQgPyBgJHtmb3JtYXR0ZWROYW1lfSAke2tleXdvcmRUZXh0fWAgOiBmb3JtYXR0ZWROYW1lXG59XG5cbmZ1bmN0aW9uIHdlYXBvbkhhc0V4dHJhQXR0YWNrcyh3ZWFwb24pIHtcbiAgcmV0dXJuICh3ZWFwb24/LnJhd19rZXl3b3JkcyB8fCBbXSkuaW5jbHVkZXMoJ0V4dHJhIEF0dGFja3MnKVxufVxuXG5mdW5jdGlvbiBidWlsZFdlYXBvblNlbGVjdGlvblByb2ZpbGUoc2VsZWN0ZWRXZWFwb25zLCB3ZWFwb25OYW1lKSB7XG4gIGlmICghc2VsZWN0ZWRXZWFwb25zLmxlbmd0aCkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgaWYgKHNlbGVjdGVkV2VhcG9ucy5sZW5ndGggPT09IDEgJiYgd2VhcG9uTmFtZSAhPT0gQUxMX1JBTkdFRF9XRUFQT05TICYmIHdlYXBvbk5hbWUgIT09IEFMTF9NRUxFRV9XRUFQT05TKSB7XG4gICAgcmV0dXJuIHNlbGVjdGVkV2VhcG9uc1swXVxuICB9XG5cbiAgY29uc3QgcmF3S2V5d29yZFNldCA9IG5ldyBTZXQoKVxuICBjb25zdCBrZXl3b3JkU2V0ID0gbmV3IFNldCgpXG4gIGxldCBtYXhpbXVtQXAgPSAwXG4gIGZvciAoY29uc3Qgd2VhcG9uIG9mIHNlbGVjdGVkV2VhcG9ucykge1xuICAgIGZvciAoY29uc3Qga2V5d29yZCBvZiB3ZWFwb24ucmF3X2tleXdvcmRzIHx8IFtdKSB7XG4gICAgICByYXdLZXl3b3JkU2V0LmFkZChrZXl3b3JkKVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleXdvcmQgb2Ygd2VhcG9uLmtleXdvcmRzIHx8IFtdKSB7XG4gICAgICBrZXl3b3JkU2V0LmFkZChrZXl3b3JkKVxuICAgIH1cbiAgICBtYXhpbXVtQXAgPSBNYXRoLm1heChtYXhpbXVtQXAsIE51bWJlcih3ZWFwb24uYXAgfHwgMCkpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIG5hbWU6IHdlYXBvbk5hbWUsXG4gICAgbGFiZWw6IHdlYXBvbk5hbWUgPT09IEFMTF9NRUxFRV9XRUFQT05TID8gJ0FsbCBNZWxlZSBXZWFwb25zJyA6ICdBbGwgUmFuZ2VkIFdlYXBvbnMnLFxuICAgIHJhbmdlOiB3ZWFwb25OYW1lID09PSBBTExfTUVMRUVfV0VBUE9OUyA/ICdNZWxlZScgOiAnTWl4ZWQnLFxuICAgIGFwOiBtYXhpbXVtQXAsXG4gICAgYXBfZGlzcGxheTogbWF4aW11bUFwID4gMCA/IGAtJHttYXhpbXVtQXB9YCA6ICcwJyxcbiAgICByYXdfa2V5d29yZHM6IEFycmF5LmZyb20ocmF3S2V5d29yZFNldCksXG4gICAga2V5d29yZHM6IEFycmF5LmZyb20oa2V5d29yZFNldCksXG4gIH1cbn1cblxuZnVuY3Rpb24gdW5pdEhhc09hdGhPZk1vbWVudCh1bml0KSB7XG4gIHJldHVybiAodW5pdD8uYWJpbGl0aWVzIHx8IFtdKS5zb21lKChhYmlsaXR5KSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IFN0cmluZyhhYmlsaXR5Lm5hbWUgfHwgJycpLnRvTG93ZXJDYXNlKClcbiAgICBjb25zdCBydWxlc1RleHQgPSBTdHJpbmcoYWJpbGl0eS5ydWxlc190ZXh0IHx8ICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgcmV0dXJuIG5hbWUuaW5jbHVkZXMoJ29hdGggb2YgbW9tZW50JykgfHwgcnVsZXNUZXh0LmluY2x1ZGVzKCdvYXRoIG9mIG1vbWVudCcpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIHVuaXRHZXRzT2F0aFdvdW5kQm9udXModW5pdCkge1xuICBjb25zdCBjb21iaW5lZEtleXdvcmRzID0gW1xuICAgIC4uLih1bml0Py5rZXl3b3JkcyB8fCBbXSksXG4gICAgLi4uKHVuaXQ/LmZhY3Rpb25fa2V5d29yZHMgfHwgW10pLFxuICBdLm1hcCgoa2V5d29yZCkgPT4gU3RyaW5nKGtleXdvcmQpLnRvTG93ZXJDYXNlKCkpXG5cbiAgcmV0dXJuICFPQVRIX0VYQ0xVREVEX0tFWVdPUkRTLnNvbWUoKGtleXdvcmQpID0+IGNvbWJpbmVkS2V5d29yZHMuaW5jbHVkZXMoa2V5d29yZCkpXG59XG5cbmZ1bmN0aW9uIGdldERldGFjaG1lbnRFbnRyeShkZXRhY2htZW50LCBjb2xsZWN0aW9uTmFtZSwgZW50cnlOYW1lKSB7XG4gIHJldHVybiBkZXRhY2htZW50Py5bY29sbGVjdGlvbk5hbWVdPy5maW5kKChlbnRyeSkgPT4gZW50cnkubmFtZSA9PT0gZW50cnlOYW1lKSB8fCBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFVuaXRBYmlsaXR5KHVuaXQsIG1hdGNoZXIpIHtcbiAgcmV0dXJuICh1bml0Py5hYmlsaXRpZXMgfHwgW10pLmZpbmQoKGFiaWxpdHkpID0+IG1hdGNoZXIoYWJpbGl0eSkpXG4gICAgfHwgKHVuaXQ/LndhcmdlYXJfYWJpbGl0aWVzIHx8IFtdKS5maW5kKChhYmlsaXR5KSA9PiBtYXRjaGVyKGFiaWxpdHkpKVxuICAgIHx8IG51bGxcbn1cblxuZnVuY3Rpb24gYnVpbGRUb29sdGlwKC4uLnNlY3Rpb25zKSB7XG4gIHJldHVybiBzZWN0aW9uc1xuICAgIC5tYXAoKHNlY3Rpb24pID0+IFN0cmluZyhzZWN0aW9uIHx8ICcnKS50cmltKCkpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5qb2luKCdcXG5cXG4nKVxufVxuXG5mdW5jdGlvbiBmb3JtYXREZXRhY2htZW50VG9vbHRpcChkZXRhY2htZW50KSB7XG4gIGlmICghZGV0YWNobWVudCkge1xuICAgIHJldHVybiAnTm8gZGV0YWNobWVudCBzZWxlY3RlZC4nXG4gIH1cblxuICBjb25zdCByZXN0cmljdGlvblRleHQgPSBTdHJpbmcoZGV0YWNobWVudC5yZXN0cmljdGlvbnMgfHwgJycpLnRyaW0oKVxuICByZXR1cm4gYnVpbGRUb29sdGlwKFxuICAgIGRldGFjaG1lbnQucnVsZT8ubmFtZSA/IGAke2RldGFjaG1lbnQucnVsZS5uYW1lfTogJHtkZXRhY2htZW50LnJ1bGUucnVsZXNfdGV4dCB8fCAnJ31gIDogJycsXG4gICAgcmVzdHJpY3Rpb25UZXh0ID8gYFJlc3RyaWN0aW9uczogJHtyZXN0cmljdGlvblRleHR9YCA6ICcnLFxuICApIHx8IGRldGFjaG1lbnQubmFtZVxufVxuXG5mdW5jdGlvbiBmb3JtYXRFbmhhbmNlbWVudFRvb2x0aXAoZW5oYW5jZW1lbnQpIHtcbiAgaWYgKCFlbmhhbmNlbWVudCkge1xuICAgIHJldHVybiAnTm8gZW5oYW5jZW1lbnQgc2VsZWN0ZWQuJ1xuICB9XG5cbiAgY29uc3QgcmVzdHJpY3Rpb25UZXh0ID0gQXJyYXkuaXNBcnJheShlbmhhbmNlbWVudC5yZXN0cmljdGlvbnMpXG4gICAgPyBlbmhhbmNlbWVudC5yZXN0cmljdGlvbnMuam9pbignICcpXG4gICAgOiBTdHJpbmcoZW5oYW5jZW1lbnQucmVzdHJpY3Rpb25zIHx8ICcnKVxuXG4gIHJldHVybiBidWlsZFRvb2x0aXAoXG4gICAgZW5oYW5jZW1lbnQucnVsZXNfdGV4dCxcbiAgICByZXN0cmljdGlvblRleHQgPyBgUmVzdHJpY3Rpb25zOiAke3Jlc3RyaWN0aW9uVGV4dH1gIDogJycsXG4gICkgfHwgZW5oYW5jZW1lbnQubmFtZVxufVxuXG5mdW5jdGlvbiBmb3JtYXRTdHJhdGFnZW1Ub29sdGlwKHN0cmF0YWdlbSkge1xuICBpZiAoIXN0cmF0YWdlbSkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgcmV0dXJuIGJ1aWxkVG9vbHRpcChcbiAgICBzdHJhdGFnZW0udHlwZSA/IGAke3N0cmF0YWdlbS50eXBlfSBTdHJhdGFnZW1gIDogJycsXG4gICAgc3RyYXRhZ2VtLnRpbWluZyA/IGBXaGVuOiAke3N0cmF0YWdlbS50aW1pbmd9YCA6ICcnLFxuICAgIHN0cmF0YWdlbS50YXJnZXQgPyBgVGFyZ2V0OiAke3N0cmF0YWdlbS50YXJnZXR9YCA6ICcnLFxuICAgIHN0cmF0YWdlbS5lZmZlY3QgPyBgRWZmZWN0OiAke3N0cmF0YWdlbS5lZmZlY3R9YCA6ICcnLFxuICApIHx8IHN0cmF0YWdlbS5uYW1lXG59XG5cbmZ1bmN0aW9uIGdldEJhc2VEaWFtZXRlck1tKHVuaXQpIHtcbiAgcmV0dXJuIFVOSVRfQkFTRV9ESUFNRVRFUlNfTU1bdW5pdD8ubmFtZV0gfHwgNDBcbn1cblxuZnVuY3Rpb24gbW1Ub0luY2hlcyh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgLyAyNS40XG59XG5cbmZ1bmN0aW9uIGNsYW1wKHZhbHVlLCBtaW5pbXVtLCBtYXhpbXVtKSB7XG4gIHJldHVybiBNYXRoLm1pbihNYXRoLm1heCh2YWx1ZSwgbWluaW11bSksIG1heGltdW0pXG59XG5cbmZ1bmN0aW9uIHBhcnNlV2VhcG9uUmFuZ2VJbmNoZXMocmFuZ2UpIHtcbiAgY29uc3QgbWF0Y2ggPSBTdHJpbmcocmFuZ2UgfHwgJycpLm1hdGNoKC8oXFxkKyhcXC5cXGQrKT8pLylcbiAgcmV0dXJuIG1hdGNoID8gTnVtYmVyKG1hdGNoWzFdKSA6IG51bGxcbn1cblxuZnVuY3Rpb24gdW5pdEhhc0tleXdvcmQodW5pdCwga2V5d29yZCkge1xuICBjb25zdCBub3JtYWxpemVkS2V5d29yZCA9IFN0cmluZyhrZXl3b3JkKS50b0xvd2VyQ2FzZSgpXG4gIHJldHVybiBbLi4uKHVuaXQ/LmtleXdvcmRzIHx8IFtdKSwgLi4uKHVuaXQ/LmZhY3Rpb25fa2V5d29yZHMgfHwgW10pXVxuICAgIC5zb21lKChlbnRyeSkgPT4gU3RyaW5nKGVudHJ5KS50b0xvd2VyQ2FzZSgpID09PSBub3JtYWxpemVkS2V5d29yZClcbn1cblxuZnVuY3Rpb24gcGFyc2VQbHVzVmFsdWUodmFsdWUpIHtcbiAgY29uc3QgbWF0Y2ggPSBTdHJpbmcodmFsdWUgfHwgJycpLm1hdGNoKC8oXFxkKykvKVxuICByZXR1cm4gbWF0Y2ggPyBOdW1iZXIobWF0Y2hbMV0pIDogMFxufVxuXG5mdW5jdGlvbiB3ZWFwb25IYXNSYXdLZXl3b3JkKHdlYXBvbiwga2V5d29yZCkge1xuICByZXR1cm4gKHdlYXBvbj8ucmF3X2tleXdvcmRzIHx8IFtdKS5zb21lKFxuICAgIChyYXdLZXl3b3JkKSA9PiBTdHJpbmcocmF3S2V5d29yZCkudG9Mb3dlckNhc2UoKSA9PT0ga2V5d29yZC50b0xvd2VyQ2FzZSgpLFxuICApXG59XG5cbmZ1bmN0aW9uIGdldFdlYXBvbktleXdvcmRWYWx1ZSh3ZWFwb24sIGtleXdvcmRQcmVmaXgpIHtcbiAgY29uc3QgbWF0Y2hpbmdLZXl3b3JkID0gKHdlYXBvbj8ucmF3X2tleXdvcmRzIHx8IFtdKS5maW5kKChyYXdLZXl3b3JkKSA9PiAoXG4gICAgbmV3IFJlZ0V4cChgXiR7a2V5d29yZFByZWZpeH1cXFxccysoXFxcXGQrKWAsICdpJykudGVzdChTdHJpbmcocmF3S2V5d29yZCkpXG4gICkpXG4gIGlmICghbWF0Y2hpbmdLZXl3b3JkKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBjb25zdCBtYXRjaCA9IFN0cmluZyhtYXRjaGluZ0tleXdvcmQpLm1hdGNoKC8oXFxkKykvKVxuICByZXR1cm4gbWF0Y2ggPyBOdW1iZXIobWF0Y2hbMV0pIDogMFxufVxuXG5mdW5jdGlvbiBnZXRSZXNvbHZlZExvYWRvdXRTZWxlY3Rpb25zKHVuaXREZXRhaWxzLCBsb2Fkb3V0U2VsZWN0aW9ucykge1xuICByZXR1cm4ge1xuICAgIC4uLih1bml0RGV0YWlscz8uc2VsZWN0ZWRfbG9hZG91dCB8fCB7fSksXG4gICAgLi4uKGxvYWRvdXRTZWxlY3Rpb25zIHx8IHt9KSxcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRMb2Fkb3V0R3JvdXBQb29sQ291bnQodW5pdERldGFpbHMsIGdyb3VwKSB7XG4gIGlmICghZ3JvdXA/LnRhcmdldF9tb2RlbCkge1xuICAgIHJldHVybiBOdW1iZXIodW5pdERldGFpbHM/Lm1vZGVsX2NvdW50ID8/IDApXG4gIH1cbiAgcmV0dXJuIE51bWJlcih1bml0RGV0YWlscz8ubW9kZWxfY291bnRzX2J5X25hbWU/Lltncm91cC50YXJnZXRfbW9kZWxdID8/IDApXG59XG5cbmZ1bmN0aW9uIGdldExvYWRvdXRHcm91cE1heFRvdGFsKHVuaXREZXRhaWxzLCBncm91cCkge1xuICBjb25zdCBwb29sQ291bnQgPSBnZXRMb2Fkb3V0R3JvdXBQb29sQ291bnQodW5pdERldGFpbHMsIGdyb3VwKVxuICBsZXQgbWF4aW11bVRvdGFsID0gcG9vbENvdW50XG4gIGlmIChncm91cD8ubWF4X3RvdGFsX2NvdW50ICE9PSB1bmRlZmluZWQgJiYgZ3JvdXA/Lm1heF90b3RhbF9jb3VudCAhPT0gbnVsbCkge1xuICAgIG1heGltdW1Ub3RhbCA9IE1hdGgubWluKG1heGltdW1Ub3RhbCwgTnVtYmVyKGdyb3VwLm1heF90b3RhbF9jb3VudCkgfHwgMClcbiAgfVxuICBpZiAoZ3JvdXA/Lm1heF90b3RhbF9wZXJfbW9kZWxzICE9PSB1bmRlZmluZWQgJiYgZ3JvdXA/Lm1heF90b3RhbF9wZXJfbW9kZWxzICE9PSBudWxsKSB7XG4gICAgY29uc3QgZGl2aXNvciA9IE51bWJlcihncm91cC5tYXhfdG90YWxfcGVyX21vZGVscykgfHwgMVxuICAgIG1heGltdW1Ub3RhbCA9IE1hdGgubWluKG1heGltdW1Ub3RhbCwgTWF0aC5mbG9vcihwb29sQ291bnQgLyBNYXRoLm1heCgxLCBkaXZpc29yKSkpXG4gIH1cbiAgcmV0dXJuIE1hdGgubWF4KDAsIG1heGltdW1Ub3RhbClcbn1cblxuZnVuY3Rpb24gZ2V0TG9hZG91dE9wdGlvbk1heENvdW50KHVuaXREZXRhaWxzLCBncm91cCwgb3B0aW9uKSB7XG4gIGNvbnN0IHBvb2xDb3VudCA9IGdldExvYWRvdXRHcm91cFBvb2xDb3VudCh1bml0RGV0YWlscywgZ3JvdXApXG4gIGxldCBtYXhpbXVtQ291bnQgPSBwb29sQ291bnRcbiAgaWYgKG9wdGlvbj8ubWF4X2NvdW50ICE9PSB1bmRlZmluZWQgJiYgb3B0aW9uPy5tYXhfY291bnQgIT09IG51bGwpIHtcbiAgICBtYXhpbXVtQ291bnQgPSBNYXRoLm1pbihtYXhpbXVtQ291bnQsIE51bWJlcihvcHRpb24ubWF4X2NvdW50KSB8fCAwKVxuICB9XG4gIGlmIChvcHRpb24/Lm1heF9jb3VudF9wZXJfbW9kZWxzICE9PSB1bmRlZmluZWQgJiYgb3B0aW9uPy5tYXhfY291bnRfcGVyX21vZGVscyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGRpdmlzb3IgPSBOdW1iZXIob3B0aW9uLm1heF9jb3VudF9wZXJfbW9kZWxzKSB8fCAxXG4gICAgbWF4aW11bUNvdW50ID0gTWF0aC5taW4obWF4aW11bUNvdW50LCBNYXRoLmZsb29yKHBvb2xDb3VudCAvIE1hdGgubWF4KDEsIGRpdmlzb3IpKSlcbiAgfVxuICByZXR1cm4gTWF0aC5tYXgoMCwgbWF4aW11bUNvdW50KVxufVxuXG5mdW5jdGlvbiBnZXRMb2Fkb3V0U2VsZWN0aW9uVmFsdWUodW5pdERldGFpbHMsIGxvYWRvdXRTZWxlY3Rpb25zLCBncm91cCkge1xuICBjb25zdCByZXNvbHZlZFNlbGVjdGlvbnMgPSBnZXRSZXNvbHZlZExvYWRvdXRTZWxlY3Rpb25zKHVuaXREZXRhaWxzLCBsb2Fkb3V0U2VsZWN0aW9ucylcbiAgcmV0dXJuIChcbiAgICByZXNvbHZlZFNlbGVjdGlvbnNbZ3JvdXAuaWRdXG4gICAgfHwgZ3JvdXAuZGVmYXVsdF9vcHRpb25faWRcbiAgICB8fCBncm91cC5vcHRpb25zPy5bMF0/LmlkXG4gICAgfHwgJydcbiAgKVxufVxuXG5mdW5jdGlvbiBnZXRMb2Fkb3V0Q291bnRTZWxlY3Rpb25WYWx1ZSh1bml0RGV0YWlscywgbG9hZG91dFNlbGVjdGlvbnMsIGdyb3VwLCBvcHRpb25JZCkge1xuICBjb25zdCByZXNvbHZlZFNlbGVjdGlvbnMgPSBnZXRSZXNvbHZlZExvYWRvdXRTZWxlY3Rpb25zKHVuaXREZXRhaWxzLCBsb2Fkb3V0U2VsZWN0aW9ucylcbiAgY29uc3QgZ3JvdXBTZWxlY3Rpb24gPSByZXNvbHZlZFNlbGVjdGlvbnNbZ3JvdXAuaWRdXG4gIGlmICghZ3JvdXBTZWxlY3Rpb24gfHwgdHlwZW9mIGdyb3VwU2VsZWN0aW9uICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiAnMCdcbiAgfVxuICBjb25zdCB2YWx1ZSA9IGdyb3VwU2VsZWN0aW9uW29wdGlvbklkXVxuICByZXR1cm4gdmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCA/ICcwJyA6IFN0cmluZyh2YWx1ZSlcbn1cblxuZnVuY3Rpb24gZ2V0Q29tYmF0V2VhcG9uT3B0aW9ucyh1bml0RGV0YWlscykge1xuICBjb25zdCB3ZWFwb25zID0gdW5pdERldGFpbHM/LndlYXBvbnMgfHwgW11cbiAgY29uc3Qgb3B0aW9ucyA9IFtdXG4gIGNvbnN0IHJhbmdlZFdlYXBvbnMgPSB3ZWFwb25zLmZpbHRlcigod2VhcG9uKSA9PiB3ZWFwb24ucmFuZ2UgIT09ICdNZWxlZScpXG4gIGNvbnN0IG1lbGVlV2VhcG9ucyA9IHdlYXBvbnMuZmlsdGVyKCh3ZWFwb24pID0+IHdlYXBvbi5yYW5nZSA9PT0gJ01lbGVlJyAmJiAhd2VhcG9uSGFzRXh0cmFBdHRhY2tzKHdlYXBvbikpXG5cbiAgaWYgKHJhbmdlZFdlYXBvbnMubGVuZ3RoID4gMSkge1xuICAgIG9wdGlvbnMucHVzaCh7XG4gICAgICBuYW1lOiBBTExfUkFOR0VEX1dFQVBPTlMsXG4gICAgICBsYWJlbDogJ0FsbCBSYW5nZWQgV2VhcG9ucycsXG4gICAgICByYW5nZTogJ01peGVkJyxcbiAgICAgIHJhd19rZXl3b3JkczogW10sXG4gICAgICBrZXl3b3JkczogW10sXG4gICAgfSlcbiAgfVxuICBpZiAobWVsZWVXZWFwb25zLmxlbmd0aCA+IDEpIHtcbiAgICBvcHRpb25zLnB1c2goe1xuICAgICAgbmFtZTogQUxMX01FTEVFX1dFQVBPTlMsXG4gICAgICBsYWJlbDogJ0FsbCBNZWxlZSBXZWFwb25zJyxcbiAgICAgIHJhbmdlOiAnTWVsZWUnLFxuICAgICAgcmF3X2tleXdvcmRzOiBbXSxcbiAgICAgIGtleXdvcmRzOiBbXSxcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIFsuLi5vcHRpb25zLCAuLi53ZWFwb25zXVxufVxuXG5mdW5jdGlvbiBmb3JtYXRMb2Fkb3V0T3B0aW9uTGFiZWwob3B0aW9uKSB7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gU3RyaW5nKG9wdGlvbj8uZGVzY3JpcHRpb24gfHwgJycpLnRyaW0oKVxuICByZXR1cm4gZGVzY3JpcHRpb24gPyBgJHtvcHRpb24ubGFiZWx9ICgke2Rlc2NyaXB0aW9ufSlgIDogb3B0aW9uLmxhYmVsXG59XG5cbmZ1bmN0aW9uIGdldFVuaXRNb2RlbENvdW50VmFsdWUodW5pdERldGFpbHMsIG1vZGVsQ291bnQpIHtcbiAgaWYgKG1vZGVsQ291bnQgIT09ICcnICYmIG1vZGVsQ291bnQgIT09IG51bGwgJiYgbW9kZWxDb3VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIFN0cmluZyhtb2RlbENvdW50KVxuICB9XG4gIGlmICh1bml0RGV0YWlscz8ubW9kZWxfY291bnQgIT09IHVuZGVmaW5lZCAmJiB1bml0RGV0YWlscz8ubW9kZWxfY291bnQgIT09IG51bGwpIHtcbiAgICByZXR1cm4gU3RyaW5nKHVuaXREZXRhaWxzLm1vZGVsX2NvdW50KVxuICB9XG4gIGlmICh1bml0RGV0YWlscz8udW5pdF9jb21wb3NpdGlvbj8ubWluX21vZGVscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIFN0cmluZyh1bml0RGV0YWlscy51bml0X2NvbXBvc2l0aW9uLm1pbl9tb2RlbHMpXG4gIH1cbiAgcmV0dXJuICcxJ1xufVxuXG5mdW5jdGlvbiBkZWZlbmRlckdldHNDb3ZlckJlbmVmaXQoe1xuICBzZWxlY3RlZFdlYXBvbixcbiAgZGVmZW5kZXJVbml0RGV0YWlscyxcbiAgdGFyZ2V0SGFzQ292ZXIsXG4gIGluZGlyZWN0VGFyZ2V0VmlzaWJsZSxcbiAgYXR0YWNrZXJGaXJlRGlzY2lwbGluZUFjdGl2ZSxcbn0pIHtcbiAgaWYgKCFzZWxlY3RlZFdlYXBvbiB8fCBzZWxlY3RlZFdlYXBvbi5yYW5nZSA9PT0gJ01lbGVlJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3QgaGFzSW5kaXJlY3ROb1Zpc2liaWxpdHkgPSB3ZWFwb25IYXNSYXdLZXl3b3JkKHNlbGVjdGVkV2VhcG9uLCAnSW5kaXJlY3QgRmlyZScpICYmICFpbmRpcmVjdFRhcmdldFZpc2libGVcbiAgY29uc3QgaGFzQ292ZXJTb3VyY2UgPSB0YXJnZXRIYXNDb3ZlciB8fCBoYXNJbmRpcmVjdE5vVmlzaWJpbGl0eVxuICBpZiAoIWhhc0NvdmVyU291cmNlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBjb25zdCBpZ25vcmVzQ292ZXIgPSB3ZWFwb25IYXNSYXdLZXl3b3JkKHNlbGVjdGVkV2VhcG9uLCAnSWdub3JlcyBDb3ZlcicpIHx8IGF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmVcbiAgaWYgKGlnbm9yZXNDb3Zlcikge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3QgYXJtb3JTYXZlID0gcGFyc2VQbHVzVmFsdWUoZGVmZW5kZXJVbml0RGV0YWlscz8uc3RhdHM/LnNhdmUpXG4gIGNvbnN0IGVmZmVjdGl2ZUFwID0gTnVtYmVyKHNlbGVjdGVkV2VhcG9uPy5hcCB8fCAwKVxuICByZXR1cm4gIShlZmZlY3RpdmVBcCA9PT0gMCAmJiBhcm1vclNhdmUgPiAwICYmIGFybW9yU2F2ZSA8PSAzKVxufVxuXG5mdW5jdGlvbiBhdmVyYWdlKHZhbHVlcykge1xuICBpZiAoIXZhbHVlcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIHJldHVybiB2YWx1ZXMucmVkdWNlKCh0b3RhbCwgdmFsdWUpID0+IHRvdGFsICsgdmFsdWUsIDApIC8gdmFsdWVzLmxlbmd0aFxufVxuXG5mdW5jdGlvbiBmb3JtYXRBdmVyYWdlKHZhbHVlKSB7XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSA/IFN0cmluZyh2YWx1ZSkgOiB2YWx1ZS50b0ZpeGVkKDIpXG59XG5cbmZ1bmN0aW9uIGZvcm1hdFBlcmNlbnQodmFsdWUsIHRvdGFsKSB7XG4gIGlmICghdG90YWwpIHtcbiAgICByZXR1cm4gJzAlJ1xuICB9XG4gIHJldHVybiBgJHsoKHZhbHVlIC8gdG90YWwpICogMTAwKS50b0ZpeGVkKDEpfSVgXG59XG5cbmZ1bmN0aW9uIHN1bUJ5KGl0ZW1zLCBzZWxlY3Rvcikge1xuICByZXR1cm4gaXRlbXMucmVkdWNlKCh0b3RhbCwgaXRlbSkgPT4gdG90YWwgKyBzZWxlY3RvcihpdGVtKSwgMClcbn1cblxuZnVuY3Rpb24gYnVpbGRSdW5TdW1tYXJ5KHJ1bnMpIHtcbiAgY29uc3QgdG90YWxSdW5zID0gcnVucy5sZW5ndGhcbiAgY29uc3QgdGFyZ2V0cyA9IHJ1bnMubWFwKChydW4pID0+IHJ1bi5yZXN1bHQudGFyZ2V0KVxuICBjb25zdCBjb21iYXRTdGF0cyA9IHJ1bnMubWFwKChydW4pID0+IHJ1bi5yZXN1bHQuc3RhdHMgfHwge30pXG4gIGNvbnN0IGF0dGFjaGVkQ2hhcmFjdGVycyA9IHJ1bnNcbiAgICAubWFwKChydW4pID0+IHJ1bi5yZXN1bHQuYXR0YWNoZWRfY2hhcmFjdGVyKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgY29uc3QgaGF6YXJkb3VzQmVhcmVycyA9IHJ1bnNcbiAgICAubWFwKChydW4pID0+IHJ1bi5yZXN1bHQuaGF6YXJkb3VzX2JlYXJlcilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG5cbiAgcmV0dXJuIHtcbiAgICB0b3RhbFJ1bnMsXG4gICAgdGFyZ2V0RGVzdHJveWVkQ291bnQ6IHRhcmdldHMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLmRlc3Ryb3llZCkubGVuZ3RoLFxuICAgIGF2ZXJhZ2VUYXJnZXRNb2RlbHNSZW1haW5pbmc6IGF2ZXJhZ2UodGFyZ2V0cy5tYXAoKGl0ZW0pID0+IGl0ZW0ubW9kZWxzX3JlbWFpbmluZykpLFxuICAgIGF2ZXJhZ2VUYXJnZXRDdXJyZW50V291bmRzOiBhdmVyYWdlKHRhcmdldHMubWFwKChpdGVtKSA9PiBpdGVtLmN1cnJlbnRfbW9kZWxfd291bmRzKSksXG4gICAgYXR0YWNoZWRDaGFyYWN0ZXJSdW5zOiBhdHRhY2hlZENoYXJhY3RlcnMubGVuZ3RoLFxuICAgIGF0dGFjaGVkQ2hhcmFjdGVyRGVzdHJveWVkQ291bnQ6IGF0dGFjaGVkQ2hhcmFjdGVycy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uZGVzdHJveWVkKS5sZW5ndGgsXG4gICAgYXZlcmFnZUF0dGFjaGVkQ2hhcmFjdGVyV291bmRzOiBhdmVyYWdlKGF0dGFjaGVkQ2hhcmFjdGVycy5tYXAoKGl0ZW0pID0+IGl0ZW0uY3VycmVudF9tb2RlbF93b3VuZHMpKSxcbiAgICBoYXphcmRvdXNCZWFyZXJSdW5zOiBoYXphcmRvdXNCZWFyZXJzLmxlbmd0aCxcbiAgICBoYXphcmRvdXNCZWFyZXJEZXN0cm95ZWRDb3VudDogaGF6YXJkb3VzQmVhcmVycy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uZGVzdHJveWVkKS5sZW5ndGgsXG4gICAgYXZlcmFnZUhhemFyZG91c0JlYXJlcldvdW5kczogYXZlcmFnZShoYXphcmRvdXNCZWFyZXJzLm1hcCgoaXRlbSkgPT4gaXRlbS5jdXJyZW50X21vZGVsX3dvdW5kcykpLFxuICAgIGNvbWJhdDoge1xuICAgICAgYXR0YWNrSW5zdGFuY2VzOiBzdW1CeShjb21iYXRTdGF0cywgKHN0YXQpID0+IHN0YXQuYXR0YWNrX2luc3RhbmNlcyB8fCAwKSxcbiAgICAgIGhpdFJvbGxzOiBzdW1CeShjb21iYXRTdGF0cywgKHN0YXQpID0+IHN0YXQuaGl0X3JvbGxzIHx8IDApLFxuICAgICAgYXV0b0hpdEF0dGFja3M6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5hdXRvX2hpdF9hdHRhY2tzIHx8IDApLFxuICAgICAgc3VjY2Vzc2Z1bEhpdEF0dGFja3M6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5zdWNjZXNzZnVsX2hpdF9hdHRhY2tzIHx8IDApLFxuICAgICAgZmFpbGVkSGl0QXR0YWNrczogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LmZhaWxlZF9oaXRfYXR0YWNrcyB8fCAwKSxcbiAgICAgIGNyaXRpY2FsSGl0QXR0YWNrczogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LmNyaXRpY2FsX2hpdF9hdHRhY2tzIHx8IDApLFxuICAgICAgZXh0cmFIaXRzR2VuZXJhdGVkOiBzdW1CeShjb21iYXRTdGF0cywgKHN0YXQpID0+IHN0YXQuZXh0cmFfaGl0c19nZW5lcmF0ZWQgfHwgMCksXG4gICAgICBoaXRSZXJvbGxzVXNlZDogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LmhpdF9yZXJvbGxzX3VzZWQgfHwgMCksXG4gICAgICBoaXRSZXJvbGxTdWNjZXNzZXM6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5oaXRfcmVyb2xsX3N1Y2Nlc3NlcyB8fCAwKSxcbiAgICAgIHdvdW5kUm9sbHM6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC53b3VuZF9yb2xscyB8fCAwKSxcbiAgICAgIGF1dG9Xb3VuZHM6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5hdXRvX3dvdW5kcyB8fCAwKSxcbiAgICAgIHN1Y2Nlc3NmdWxXb3VuZFJvbGxzOiBzdW1CeShjb21iYXRTdGF0cywgKHN0YXQpID0+IHN0YXQuc3VjY2Vzc2Z1bF93b3VuZF9yb2xscyB8fCAwKSxcbiAgICAgIGZhaWxlZFdvdW5kUm9sbHM6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5mYWlsZWRfd291bmRfcm9sbHMgfHwgMCksXG4gICAgICBjcml0aWNhbFdvdW5kczogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LmNyaXRpY2FsX3dvdW5kcyB8fCAwKSxcbiAgICAgIHdvdW5kUmVyb2xsc1VzZWQ6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC53b3VuZF9yZXJvbGxzX3VzZWQgfHwgMCksXG4gICAgICB3b3VuZFJlcm9sbFN1Y2Nlc3Nlczogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LndvdW5kX3Jlcm9sbF9zdWNjZXNzZXMgfHwgMCksXG4gICAgICBzYXZlQXR0ZW1wdHM6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5zYXZlX2F0dGVtcHRzIHx8IDApLFxuICAgICAgc2F2ZXNQYXNzZWQ6IHN1bUJ5KGNvbWJhdFN0YXRzLCAoc3RhdCkgPT4gc3RhdC5zYXZlc19wYXNzZWQgfHwgMCksXG4gICAgICBzYXZlc0ZhaWxlZDogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LnNhdmVzX2ZhaWxlZCB8fCAwKSxcbiAgICAgIHVuc2F2YWJsZVdvdW5kczogc3VtQnkoY29tYmF0U3RhdHMsIChzdGF0KSA9PiBzdGF0LnVuc2F2YWJsZV93b3VuZHMgfHwgMCksXG4gICAgfSxcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZWxldmFudFVuaXRSdWxlcyh1bml0LCByb2xlLCBoYXNIYXphcmRvdXNXZWFwb24pIHtcbiAgY29uc3QgcmVsZXZhbnRFZmZlY3RUeXBlcyA9IHJvbGUgPT09ICdhdHRhY2tlcidcbiAgICA/IG5ldyBTZXQoWydvdXRnb2luZ193b3VuZF9tb2RpZmllcicsIC4uLihoYXNIYXphcmRvdXNXZWFwb24gPyBbJ2ZlZWxfbm9fcGFpbiddIDogW10pXSlcbiAgICA6IG5ldyBTZXQoWydpbmNvbWluZ193b3VuZF9tb2RpZmllcicsICdmZWVsX25vX3BhaW4nXSlcblxuICBjb25zdCBydWxlQ29sbGVjdGlvbnMgPSBbLi4uKHVuaXQ/LmFiaWxpdGllcyB8fCBbXSksIC4uLih1bml0Py53YXJnZWFyX2FiaWxpdGllcyB8fCBbXSldXG5cbiAgcmV0dXJuIHJ1bGVDb2xsZWN0aW9uc1xuICAgIC5maWx0ZXIoKHJ1bGUpID0+IChydWxlLmVmZmVjdHMgfHwgW10pLnNvbWUoKGVmZmVjdCkgPT4gcmVsZXZhbnRFZmZlY3RUeXBlcy5oYXMoZWZmZWN0LnR5cGUpKSlcbiAgICAubWFwKChydWxlKSA9PiAoe1xuICAgICAgbmFtZTogcnVsZS5uYW1lLFxuICAgICAgc291cmNlOiAnRGF0YXNoZWV0IEFiaWxpdHknLFxuICAgICAgdGV4dDogcnVsZS5ydWxlc190ZXh0LFxuICAgIH0pKVxufVxuXG5mdW5jdGlvbiBidWlsZEF0dGFja2VyQWN0aXZlUnVsZXMoe1xuICBhdHRhY2tlclVuaXREZXRhaWxzLFxuICBzZWxlY3RlZFdlYXBvbixcbiAgb2F0aE9mTW9tZW50QWN0aXZlLFxuICBhdHRhY2tlckRldGFjaG1lbnQsXG4gIGF0dGFja2VyTWFya2VkRm9yRGVzdHJ1Y3Rpb25BY3RpdmUsXG4gIGF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUsXG4gIGF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBY3RpdmUsXG4gIGF0dGFja2VyU3R1YmJvcm5UZW5hY2l0eUFjdGl2ZSxcbiAgYXR0YWNrZXJXZWFwb25zT2ZUaGVGaXJzdExlZ2lvbkFjdGl2ZSxcbiAgYXR0YWNrZXJQZW5uYW50T2ZSZW1lbWJyYW5jZUFjdGl2ZSxcbiAgYXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGgsXG4gIGluSGFsZlJhbmdlLFxuICByZW1haW5lZFN0YXRpb25hcnksXG4gIGNoYXJnZWRUaGlzVHVybixcbiAgaW5kaXJlY3RUYXJnZXRWaXNpYmxlLFxuICBhdHRhY2tlckluRW5nYWdlbWVudFJhbmdlLFxuICBoYXNIYXphcmRvdXMsXG59KSB7XG4gIGNvbnN0IHJ1bGVzID0gW1xuICAgIC4uLmdldFJlbGV2YW50VW5pdFJ1bGVzKGF0dGFja2VyVW5pdERldGFpbHMsICdhdHRhY2tlcicsIGhhc0hhemFyZG91cyksXG4gIF1cblxuICBpZiAob2F0aE9mTW9tZW50QWN0aXZlICYmIHVuaXRIYXNPYXRoT2ZNb21lbnQoYXR0YWNrZXJVbml0RGV0YWlscykpIHtcbiAgICBjb25zdCB3b3VuZEJvbnVzVGV4dCA9IHVuaXRHZXRzT2F0aFdvdW5kQm9udXMoYXR0YWNrZXJVbml0RGV0YWlscylcbiAgICAgID8gJyBSZS1yb2xsIEhpdCByb2xscyBhZ2FpbnN0IHRoZSBzZWxlY3RlZCB0YXJnZXQsIGFuZCB0aGlzIGF0dGFjayBhbHNvIGdldHMgKzEgdG8gdGhlIFdvdW5kIHJvbGwuJ1xuICAgICAgOiAnIFJlLXJvbGwgSGl0IHJvbGxzIGFnYWluc3QgdGhlIHNlbGVjdGVkIHRhcmdldC4nXG4gICAgcnVsZXMudW5zaGlmdCh7XG4gICAgICBuYW1lOiAnT2F0aCBvZiBNb21lbnQnLFxuICAgICAgc291cmNlOiAnQXJteSBSdWxlJyxcbiAgICAgIHRleHQ6IGBUaGlzIHVuaXQgaXMgYXR0YWNraW5nIGl0cyBPYXRoIG9mIE1vbWVudCB0YXJnZXQuJHt3b3VuZEJvbnVzVGV4dH1gLFxuICAgIH0pXG4gIH1cblxuICBpZiAoYXR0YWNrZXJGaXJlRGlzY2lwbGluZUFjdGl2ZSkge1xuICAgIGNvbnN0IHN0cmF0YWdlbSA9IGdldERldGFjaG1lbnRFbnRyeShhdHRhY2tlckRldGFjaG1lbnQsICdzdHJhdGFnZW1zJywgJ0ZpcmUgRGlzY2lwbGluZScpXG4gICAgaWYgKHN0cmF0YWdlbSkge1xuICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IHN0cmF0YWdlbS5uYW1lLFxuICAgICAgICBzb3VyY2U6IGAke2F0dGFja2VyRGV0YWNobWVudC5uYW1lfSBTdHJhdGFnZW1gLFxuICAgICAgICB0ZXh0OiBzdHJhdGFnZW0uZWZmZWN0LFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoYXR0YWNrZXJNYXJrZWRGb3JEZXN0cnVjdGlvbkFjdGl2ZSkge1xuICAgIGNvbnN0IHN0cmF0YWdlbSA9IGdldERldGFjaG1lbnRFbnRyeShhdHRhY2tlckRldGFjaG1lbnQsICdzdHJhdGFnZW1zJywgJ01hcmtlZCBmb3IgRGVzdHJ1Y3Rpb24nKVxuICAgIGlmIChzdHJhdGFnZW0pIHtcbiAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICBuYW1lOiBzdHJhdGFnZW0ubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHthdHRhY2tlckRldGFjaG1lbnQubmFtZX0gU3RyYXRhZ2VtYCxcbiAgICAgICAgdGV4dDogc3RyYXRhZ2VtLmVmZmVjdCxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKGF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBY3RpdmUpIHtcbiAgICBjb25zdCBzdHJhdGFnZW0gPSBnZXREZXRhY2htZW50RW50cnkoYXR0YWNrZXJEZXRhY2htZW50LCAnc3RyYXRhZ2VtcycsICdVbmZvcmdpdmVuIEZ1cnknKVxuICAgIGlmIChzdHJhdGFnZW0pIHtcbiAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICBuYW1lOiBzdHJhdGFnZW0ubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHthdHRhY2tlckRldGFjaG1lbnQubmFtZX0gU3RyYXRhZ2VtYCxcbiAgICAgICAgdGV4dDogc3RyYXRhZ2VtLmVmZmVjdCxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKGF0dGFja2VyU3R1YmJvcm5UZW5hY2l0eUFjdGl2ZSAmJiBhdHRhY2tlckJlbG93U3RhcnRpbmdTdHJlbmd0aCkge1xuICAgIGNvbnN0IGVuaGFuY2VtZW50ID0gZ2V0RGV0YWNobWVudEVudHJ5KGF0dGFja2VyRGV0YWNobWVudCwgJ2VuaGFuY2VtZW50cycsICdTdHViYm9ybiBUZW5hY2l0eScpXG4gICAgaWYgKGVuaGFuY2VtZW50KSB7XG4gICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogZW5oYW5jZW1lbnQubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHthdHRhY2tlckRldGFjaG1lbnQubmFtZX0gRW5oYW5jZW1lbnRgLFxuICAgICAgICB0ZXh0OiBlbmhhbmNlbWVudC5ydWxlc190ZXh0LFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoYXR0YWNrZXJXZWFwb25zT2ZUaGVGaXJzdExlZ2lvbkFjdGl2ZSkge1xuICAgIGNvbnN0IGVuaGFuY2VtZW50ID0gZ2V0RGV0YWNobWVudEVudHJ5KGF0dGFja2VyRGV0YWNobWVudCwgJ2VuaGFuY2VtZW50cycsICdXZWFwb25zIG9mIHRoZSBGaXJzdCBMZWdpb24nKVxuICAgIGlmIChlbmhhbmNlbWVudCkge1xuICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IGVuaGFuY2VtZW50Lm5hbWUsXG4gICAgICAgIHNvdXJjZTogYCR7YXR0YWNrZXJEZXRhY2htZW50Lm5hbWV9IEVuaGFuY2VtZW50YCxcbiAgICAgICAgdGV4dDogZW5oYW5jZW1lbnQucnVsZXNfdGV4dCxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKGF0dGFja2VyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUpIHtcbiAgICBjb25zdCBlbmhhbmNlbWVudCA9IGdldERldGFjaG1lbnRFbnRyeShhdHRhY2tlckRldGFjaG1lbnQsICdlbmhhbmNlbWVudHMnLCAnUGVubmFudCBvZiBSZW1lbWJyYW5jZScpXG4gICAgaWYgKGVuaGFuY2VtZW50KSB7XG4gICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogZW5oYW5jZW1lbnQubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHthdHRhY2tlckRldGFjaG1lbnQubmFtZX0gRW5oYW5jZW1lbnRgLFxuICAgICAgICB0ZXh0OiBlbmhhbmNlbWVudC5ydWxlc190ZXh0LFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoc2VsZWN0ZWRXZWFwb24gJiYgaW5IYWxmUmFuZ2UpIHtcbiAgICBjb25zdCByYXBpZEZpcmVWYWx1ZSA9IGdldFdlYXBvbktleXdvcmRWYWx1ZShzZWxlY3RlZFdlYXBvbiwgJ1JhcGlkIEZpcmUnKVxuICAgIGlmIChyYXBpZEZpcmVWYWx1ZSA+IDApIHtcbiAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICBuYW1lOiBgUmFwaWQgRmlyZSAke3JhcGlkRmlyZVZhbHVlfWAsXG4gICAgICAgIHNvdXJjZTogJ1dlYXBvbiBSdWxlJyxcbiAgICAgICAgdGV4dDogYFRoaXMgd2VhcG9uIGlzIGluIGhhbGYgcmFuZ2UsIHNvIGl0IGdhaW5zICR7cmFwaWRGaXJlVmFsdWV9IGFkZGl0aW9uYWwgYXR0YWNrJHtyYXBpZEZpcmVWYWx1ZSA9PT0gMSA/ICcnIDogJ3MnfS5gLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjb25zdCBtZWx0YVZhbHVlID0gZ2V0V2VhcG9uS2V5d29yZFZhbHVlKHNlbGVjdGVkV2VhcG9uLCAnTWVsdGEnKVxuICAgIGlmIChtZWx0YVZhbHVlID4gMCkge1xuICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IGBNZWx0YSAke21lbHRhVmFsdWV9YCxcbiAgICAgICAgc291cmNlOiAnV2VhcG9uIFJ1bGUnLFxuICAgICAgICB0ZXh0OiBgVGhpcyB3ZWFwb24gaXMgaW4gaGFsZiByYW5nZSwgc28gZWFjaCB1bnNhdmVkIGF0dGFjayBnZXRzICske21lbHRhVmFsdWV9IGRhbWFnZS5gLFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoc2VsZWN0ZWRXZWFwb24gJiYgcmVtYWluZWRTdGF0aW9uYXJ5KSB7XG4gICAgY29uc3QgaGFzSGVhdnlSdWxlID0gd2VhcG9uSGFzUmF3S2V5d29yZChzZWxlY3RlZFdlYXBvbiwgJ0hlYXZ5JykgfHwgYXR0YWNrZXJGaXJlRGlzY2lwbGluZUFjdGl2ZVxuICAgIGlmIChoYXNIZWF2eVJ1bGUgJiYgc2VsZWN0ZWRXZWFwb24ucmFuZ2UgIT09ICdNZWxlZScpIHtcbiAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICBuYW1lOiAnSGVhdnknLFxuICAgICAgICBzb3VyY2U6ICdXZWFwb24gUnVsZScsXG4gICAgICAgIHRleHQ6ICdUaGlzIHVuaXQgcmVtYWluZWQgU3RhdGlvbmFyeSwgc28gdGhpcyBhdHRhY2sgZ2V0cyArMSB0byB0aGUgSGl0IHJvbGwuJyxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKHNlbGVjdGVkV2VhcG9uICYmIGNoYXJnZWRUaGlzVHVybiAmJiB3ZWFwb25IYXNSYXdLZXl3b3JkKHNlbGVjdGVkV2VhcG9uLCAnTGFuY2UnKSkge1xuICAgIHJ1bGVzLnB1c2goe1xuICAgICAgbmFtZTogJ0xhbmNlJyxcbiAgICAgIHNvdXJjZTogJ1dlYXBvbiBSdWxlJyxcbiAgICAgIHRleHQ6ICdUaGlzIHVuaXQgY2hhcmdlZCB0aGlzIHR1cm4sIHNvIHRoaXMgYXR0YWNrIGdldHMgKzEgdG8gdGhlIFdvdW5kIHJvbGwuJyxcbiAgICB9KVxuICB9XG5cbiAgaWYgKHNlbGVjdGVkV2VhcG9uICYmIGF0dGFja2VySW5FbmdhZ2VtZW50UmFuZ2UgJiYgd2VhcG9uSGFzUmF3S2V5d29yZChzZWxlY3RlZFdlYXBvbiwgJ1Bpc3RvbCcpKSB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICBuYW1lOiAnUGlzdG9sJyxcbiAgICAgIHNvdXJjZTogJ1dlYXBvbiBSdWxlJyxcbiAgICAgIHRleHQ6ICdUaGlzIHVuaXQgaXMgaW4gRW5nYWdlbWVudCBSYW5nZSwgYnV0IHRoaXMgcmFuZ2VkIGF0dGFjayBpcyBzdGlsbCBsZWdhbCBiZWNhdXNlIHRoZSBzZWxlY3RlZCB3ZWFwb24gaXMgYSBQaXN0b2wuJyxcbiAgICB9KVxuICB9XG5cbiAgaWYgKHNlbGVjdGVkV2VhcG9uICYmIHdlYXBvbkhhc1Jhd0tleXdvcmQoc2VsZWN0ZWRXZWFwb24sICdJbmRpcmVjdCBGaXJlJykgJiYgIWluZGlyZWN0VGFyZ2V0VmlzaWJsZSkge1xuICAgIHJ1bGVzLnB1c2goe1xuICAgICAgbmFtZTogJ0luZGlyZWN0IEZpcmUnLFxuICAgICAgc291cmNlOiAnV2VhcG9uIFJ1bGUnLFxuICAgICAgdGV4dDogJ1RoaXMgYXR0YWNrIGlzIGJlaW5nIG1hZGUgd2l0aG91dCB2aXNpYmlsaXR5LCBzbyBpdCB0YWtlcyAtMSB0byBIaXQgYW5kIHVubW9kaWZpZWQgaGl0IHJvbGxzIG9mIDEtMyBmYWlsLicsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiBydWxlc1xufVxuXG5mdW5jdGlvbiBidWlsZERlZmVuZGVyQWN0aXZlUnVsZXMoe1xuICBkZWZlbmRlclVuaXREZXRhaWxzLFxuICBzZWxlY3RlZFdlYXBvbixcbiAgZGVmZW5kZXJEZXRhY2htZW50LFxuICBkZWZlbmRlckFybW91ck9mQ29udGVtcHRBY3RpdmUsXG4gIGRlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0QWN0aXZlLFxuICBkZWZlbmRlclVuYnJlYWthYmxlTGluZXNBY3RpdmUsXG4gIGRlZmVuZGVyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUsXG4gIHRhcmdldEhhc0NvdmVyLFxuICBpbmRpcmVjdFRhcmdldFZpc2libGUsXG4gIGF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUsXG59KSB7XG4gIGNvbnN0IHJ1bGVzID0gW1xuICAgIC4uLmdldFJlbGV2YW50VW5pdFJ1bGVzKGRlZmVuZGVyVW5pdERldGFpbHMsICdkZWZlbmRlcicsIGZhbHNlKSxcbiAgXVxuXG4gIGlmIChkZWZlbmRlckFybW91ck9mQ29udGVtcHRBY3RpdmUpIHtcbiAgICBjb25zdCBzdHJhdGFnZW0gPSBnZXREZXRhY2htZW50RW50cnkoZGVmZW5kZXJEZXRhY2htZW50LCAnc3RyYXRhZ2VtcycsICdBcm1vdXIgb2YgQ29udGVtcHQnKVxuICAgIGlmIChzdHJhdGFnZW0pIHtcbiAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICBuYW1lOiBzdHJhdGFnZW0ubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHtkZWZlbmRlckRldGFjaG1lbnQubmFtZX0gU3RyYXRhZ2VtYCxcbiAgICAgICAgdGV4dDogc3RyYXRhZ2VtLmVmZmVjdCxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKGRlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0QWN0aXZlKSB7XG4gICAgY29uc3Qgc3RyYXRhZ2VtID0gZ2V0RGV0YWNobWVudEVudHJ5KGRlZmVuZGVyRGV0YWNobWVudCwgJ3N0cmF0YWdlbXMnLCAnT3ZlcndoZWxtaW5nIE9uc2xhdWdodCcpXG4gICAgaWYgKHN0cmF0YWdlbSkge1xuICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IHN0cmF0YWdlbS5uYW1lLFxuICAgICAgICBzb3VyY2U6IGAke2RlZmVuZGVyRGV0YWNobWVudC5uYW1lfSBTdHJhdGFnZW1gLFxuICAgICAgICB0ZXh0OiBzdHJhdGFnZW0uZWZmZWN0LFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoZGVmZW5kZXJVbmJyZWFrYWJsZUxpbmVzQWN0aXZlKSB7XG4gICAgY29uc3Qgc3RyYXRhZ2VtID0gZ2V0RGV0YWNobWVudEVudHJ5KGRlZmVuZGVyRGV0YWNobWVudCwgJ3N0cmF0YWdlbXMnLCAnVW5icmVha2FibGUgTGluZXMnKVxuICAgIGlmIChzdHJhdGFnZW0pIHtcbiAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICBuYW1lOiBzdHJhdGFnZW0ubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHtkZWZlbmRlckRldGFjaG1lbnQubmFtZX0gU3RyYXRhZ2VtYCxcbiAgICAgICAgdGV4dDogc3RyYXRhZ2VtLmVmZmVjdCxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKGRlZmVuZGVyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUpIHtcbiAgICBjb25zdCBlbmhhbmNlbWVudCA9IGdldERldGFjaG1lbnRFbnRyeShkZWZlbmRlckRldGFjaG1lbnQsICdlbmhhbmNlbWVudHMnLCAnUGVubmFudCBvZiBSZW1lbWJyYW5jZScpXG4gICAgaWYgKGVuaGFuY2VtZW50KSB7XG4gICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogZW5oYW5jZW1lbnQubmFtZSxcbiAgICAgICAgc291cmNlOiBgJHtkZWZlbmRlckRldGFjaG1lbnQubmFtZX0gRW5oYW5jZW1lbnRgLFxuICAgICAgICB0ZXh0OiBlbmhhbmNlbWVudC5ydWxlc190ZXh0LFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoZGVmZW5kZXJHZXRzQ292ZXJCZW5lZml0KHtcbiAgICBzZWxlY3RlZFdlYXBvbixcbiAgICBkZWZlbmRlclVuaXREZXRhaWxzLFxuICAgIHRhcmdldEhhc0NvdmVyLFxuICAgIGluZGlyZWN0VGFyZ2V0VmlzaWJsZSxcbiAgICBhdHRhY2tlckZpcmVEaXNjaXBsaW5lQWN0aXZlLFxuICB9KSkge1xuICAgIHJ1bGVzLnB1c2goe1xuICAgICAgbmFtZTogJ0NvdmVyJyxcbiAgICAgIHNvdXJjZTogJ1RlcnJhaW4gUnVsZScsXG4gICAgICB0ZXh0OiAnVGhpcyB0YXJnZXQgZ2V0cyArMSB0byBpdHMgYXJtb3Igc2F2ZSBhZ2FpbnN0IHRoaXMgcmFuZ2VkIGF0dGFjay4nLFxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gcnVsZXNcbn1cblxuZnVuY3Rpb24gcmVuZGVyU3RhdHNHcmlkKHN0YXRzKSB7XG4gIHJldHVybiBzdGF0RGlzcGxheVJvd3MubWFwKChyb3csIGluZGV4KSA9PiAoXG4gICAgPGRpdiBrZXk9e2luZGV4fSBjbGFzc05hbWU9XCJzdGF0LXJvd1wiPlxuICAgICAge3Jvdy5tYXAoKFtrZXksIGxhYmVsLCBmb3JtYXRWYWx1ZV0pID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzdGF0cz8uW2tleV1cbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChrZXkgPT09ICdzYXZlJyAmJiBzdGF0cz8uaW52dWxuZXJhYmxlX3NhdmUpIHtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGRpdiBrZXk9e2tleX0gY2xhc3NOYW1lPVwic3RhdC1jaGlwIHN0YXQtY2hpcC1zYXZlXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInN0YXQtbGFiZWwgc3RhdC1sYWJlbC1zYXZlXCI+e2xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHN0cm9uZyBjbGFzc05hbWU9XCJzdGF0LXZhbHVlIHN0YXQtdmFsdWUtc2F2ZVwiPlxuICAgICAgICAgICAgICAgIHtmb3JtYXRWYWx1ZSA/IGZvcm1hdFZhbHVlKHZhbHVlKSA6IFN0cmluZyh2YWx1ZSl9XG4gICAgICAgICAgICAgIDwvc3Ryb25nPlxuICAgICAgICAgICAgICA8c3Ryb25nIGNsYXNzTmFtZT1cInN0YXQtdmFsdWUgc3RhdC12YWx1ZS1pbnZ1bG5cIj5cbiAgICAgICAgICAgICAgICB7Zm9ybWF0SW52dWxuZXJhYmxlU2F2ZShzdGF0cy5pbnZ1bG5lcmFibGVfc2F2ZSl9XG4gICAgICAgICAgICAgIDwvc3Ryb25nPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICA8ZGl2IGtleT17a2V5fSBjbGFzc05hbWU9XCJzdGF0LWNoaXBcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInN0YXQtbGFiZWxcIj57bGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgPHN0cm9uZyBjbGFzc05hbWU9XCJzdGF0LXZhbHVlXCI+XG4gICAgICAgICAgICAgIHtmb3JtYXRWYWx1ZSA/IGZvcm1hdFZhbHVlKHZhbHVlKSA6IFN0cmluZyh2YWx1ZSl9XG4gICAgICAgICAgICA8L3N0cm9uZz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKVxuICAgICAgfSl9XG4gICAgPC9kaXY+XG4gICkpXG59XG5cbmZ1bmN0aW9uIHJlbmRlcldlYXBvblN0YXRzR3JpZCh3ZWFwb24pIHtcbiAgaWYgKCF3ZWFwb24pIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgY29uc3QgdG9wUm93ID0gW1xuICAgIFsnUmFuZ2UnLCBmb3JtYXRSYW5nZVZhbHVlKHdlYXBvbi5yYW5nZSldLFxuICAgIFsnQScsIFN0cmluZyh3ZWFwb24uYXR0YWNrcyldLFxuICAgIFt3ZWFwb24uc2tpbGxfdHlwZSB8fCAnQlMnLCB3ZWFwb24uc2tpbGxfZGlzcGxheV0sXG4gIF1cblxuICBjb25zdCBib3R0b21Sb3cgPSBbXG4gICAgWydTJywgU3RyaW5nKHdlYXBvbi5zdHJlbmd0aCldLFxuICAgIFsnQVAnLCB3ZWFwb24uYXBfZGlzcGxheV0sXG4gICAgWydEJywgd2VhcG9uLmRhbWFnZV9kaXNwbGF5XSxcbiAgXVxuXG4gIHJldHVybiBbdG9wUm93LCBib3R0b21Sb3ddLm1hcCgocm93LCBpbmRleCkgPT4gKFxuICAgIDxkaXYga2V5PXtpbmRleH0gY2xhc3NOYW1lPVwic3RhdC1yb3dcIj5cbiAgICAgIHtyb3cubWFwKChbbGFiZWwsIHZhbHVlXSkgPT4gKFxuICAgICAgICA8ZGl2IGtleT17bGFiZWx9IGNsYXNzTmFtZT1cInN0YXQtY2hpcFwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInN0YXQtbGFiZWxcIj57bGFiZWx9PC9zcGFuPlxuICAgICAgICAgIDxzdHJvbmcgY2xhc3NOYW1lPVwic3RhdC12YWx1ZVwiPnt2YWx1ZX08L3N0cm9uZz5cbiAgICAgICAgPC9kaXY+XG4gICAgICApKX1cbiAgICA8L2Rpdj5cbiAgKSlcbn1cblxuZnVuY3Rpb24gQXBwKCkge1xuICBjb25zdCBbZmFjdGlvbnMsIHNldEZhY3Rpb25zXSA9IHVzZVN0YXRlKFtdKVxuICBjb25zdCBbYXR0YWNrZXJVbml0cywgc2V0QXR0YWNrZXJVbml0c10gPSB1c2VTdGF0ZShbXSlcbiAgY29uc3QgW2RlZmVuZGVyVW5pdHMsIHNldERlZmVuZGVyVW5pdHNdID0gdXNlU3RhdGUoW10pXG4gIGNvbnN0IFthdHRhY2tlckZhY3Rpb25EZXRhaWxzLCBzZXRBdHRhY2tlckZhY3Rpb25EZXRhaWxzXSA9IHVzZVN0YXRlKG51bGwpXG4gIGNvbnN0IFtkZWZlbmRlckZhY3Rpb25EZXRhaWxzLCBzZXREZWZlbmRlckZhY3Rpb25EZXRhaWxzXSA9IHVzZVN0YXRlKG51bGwpXG4gIGNvbnN0IFthdHRhY2tlclVuaXREZXRhaWxzLCBzZXRBdHRhY2tlclVuaXREZXRhaWxzXSA9IHVzZVN0YXRlKG51bGwpXG4gIGNvbnN0IFtkZWZlbmRlclVuaXREZXRhaWxzLCBzZXREZWZlbmRlclVuaXREZXRhaWxzXSA9IHVzZVN0YXRlKG51bGwpXG4gIGNvbnN0IFthdHRhY2hlZENoYXJhY3RlclVuaXREZXRhaWxzLCBzZXRBdHRhY2hlZENoYXJhY3RlclVuaXREZXRhaWxzXSA9IHVzZVN0YXRlKG51bGwpXG4gIGNvbnN0IFtzaW11bGF0aW9uUnVucywgc2V0U2ltdWxhdGlvblJ1bnNdID0gdXNlU3RhdGUoW10pXG4gIGNvbnN0IFthY3RpdmVSdW5WaWV3LCBzZXRBY3RpdmVSdW5WaWV3XSA9IHVzZVN0YXRlKCdzdW1tYXJ5JylcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSlcbiAgY29uc3QgW3NpbXVsYXRpbmcsIHNldFNpbXVsYXRpbmddID0gdXNlU3RhdGUoZmFsc2UpXG4gIGNvbnN0IFtlcnJvciwgc2V0RXJyb3JdID0gdXNlU3RhdGUoJycpXG4gIGNvbnN0IFthY3RpdmVQYWdlLCBzZXRBY3RpdmVQYWdlXSA9IHVzZVN0YXRlKCdjb21iYXQnKVxuICBjb25zdCBbYXJteUxpc3RFbnRyaWVzLCBzZXRBcm15TGlzdEVudHJpZXNdID0gdXNlU3RhdGUoW10pXG4gIGNvbnN0IFtiYXR0bGVmaWVsZFBvc2l0aW9ucywgc2V0QmF0dGxlZmllbGRQb3NpdGlvbnNdID0gdXNlU3RhdGUoe1xuICAgIGF0dGFja2VyOiB7IHg6IDIwLCB5OiA1MCB9LFxuICAgIGRlZmVuZGVyOiB7IHg6IDgwLCB5OiA1MCB9LFxuICB9KVxuICBjb25zdCBbZHJhZ2dpbmdVbml0SWQsIHNldERyYWdnaW5nVW5pdElkXSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXRJZCwgc2V0U2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXRJZF0gPSB1c2VTdGF0ZSgnYXR0YWNrZXInKVxuICBjb25zdCBbYmF0dGxlZmllbGRDb21iYXRBdHRhY2tlcklkLCBzZXRCYXR0bGVmaWVsZENvbWJhdEF0dGFja2VySWRdID0gdXNlU3RhdGUoJycpXG4gIGNvbnN0IFtiYXR0bGVmaWVsZENvbWJhdFdlYXBvbk5hbWUsIHNldEJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uTmFtZV0gPSB1c2VTdGF0ZSgnJylcbiAgY29uc3QgYmF0dGxlZmllbGRCb2FyZFJlZiA9IHVzZVJlZihudWxsKVxuXG4gIGNvbnN0IFthdHRhY2tlckZhY3Rpb24sIHNldEF0dGFja2VyRmFjdGlvbl0gPSB1c2VTdGF0ZSgnJylcbiAgY29uc3QgW2F0dGFja2VyVW5pdCwgc2V0QXR0YWNrZXJVbml0XSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbYXR0YWNrZXJMb2Fkb3V0U2VsZWN0aW9ucywgc2V0QXR0YWNrZXJMb2Fkb3V0U2VsZWN0aW9uc10gPSB1c2VTdGF0ZSh7fSlcbiAgY29uc3QgW2F0dGFja2VyTW9kZWxDb3VudCwgc2V0QXR0YWNrZXJNb2RlbENvdW50XSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbd2VhcG9uTmFtZSwgc2V0V2VhcG9uTmFtZV0gPSB1c2VTdGF0ZSgnJylcbiAgY29uc3QgW2RlZmVuZGVyRmFjdGlvbiwgc2V0RGVmZW5kZXJGYWN0aW9uXSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbZGVmZW5kZXJVbml0LCBzZXREZWZlbmRlclVuaXRdID0gdXNlU3RhdGUoJycpXG4gIGNvbnN0IFtkZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zLCBzZXREZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zXSA9IHVzZVN0YXRlKHt9KVxuICBjb25zdCBbZGVmZW5kZXJNb2RlbENvdW50LCBzZXREZWZlbmRlck1vZGVsQ291bnRdID0gdXNlU3RhdGUoJycpXG4gIGNvbnN0IFthdHRhY2hlZENoYXJhY3Rlck5hbWUsIHNldEF0dGFjaGVkQ2hhcmFjdGVyTmFtZV0gPSB1c2VTdGF0ZSgnJylcbiAgY29uc3QgW2F0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMsIHNldEF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnNdID0gdXNlU3RhdGUoe30pXG4gIGNvbnN0IFthdHRhY2hlZENoYXJhY3Rlck1vZGVsQ291bnQsIHNldEF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudF0gPSB1c2VTdGF0ZSgnJylcbiAgY29uc3QgW2F0dGFja2VyRGV0YWNobWVudE5hbWUsIHNldEF0dGFja2VyRGV0YWNobWVudE5hbWVdID0gdXNlU3RhdGUoJycpXG4gIGNvbnN0IFtkZWZlbmRlckRldGFjaG1lbnROYW1lLCBzZXREZWZlbmRlckRldGFjaG1lbnROYW1lXSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbYXR0YWNrZXJFbmhhbmNlbWVudE5hbWUsIHNldEF0dGFja2VyRW5oYW5jZW1lbnROYW1lXSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbZGVmZW5kZXJFbmhhbmNlbWVudE5hbWUsIHNldERlZmVuZGVyRW5oYW5jZW1lbnROYW1lXSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbcnVuQ291bnQsIHNldFJ1bkNvdW50XSA9IHVzZVN0YXRlKCcxJylcblxuICBjb25zdCBbdGFyZ2V0SGFzQ292ZXIsIHNldFRhcmdldEhhc0NvdmVyXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLnRhcmdldF9oYXNfY292ZXIpXG4gIGNvbnN0IFthdHRhY2tlckluRW5nYWdlbWVudFJhbmdlLCBzZXRBdHRhY2tlckluRW5nYWdlbWVudFJhbmdlXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX2luX2VuZ2FnZW1lbnRfcmFuZ2UpXG4gIGNvbnN0IFt0YXJnZXRJbkVuZ2FnZW1lbnRSYW5nZU9mQWxsaWVzLCBzZXRUYXJnZXRJbkVuZ2FnZW1lbnRSYW5nZU9mQWxsaWVzXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLnRhcmdldF9pbl9lbmdhZ2VtZW50X3JhbmdlX29mX2FsbGllcylcbiAgY29uc3QgW2luSGFsZlJhbmdlLCBzZXRJbkhhbGZSYW5nZV0gPSB1c2VTdGF0ZShpbml0aWFsT3B0aW9ucy5pbl9oYWxmX3JhbmdlKVxuICBjb25zdCBbb2F0aE9mTW9tZW50QWN0aXZlLCBzZXRPYXRoT2ZNb21lbnRBY3RpdmVdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMub2F0aF9vZl9tb21lbnRfYWN0aXZlKVxuICBjb25zdCBbY2hhcmdlZFRoaXNUdXJuLCBzZXRDaGFyZ2VkVGhpc1R1cm5dID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuY2hhcmdlZF90aGlzX3R1cm4pXG4gIGNvbnN0IFtyZW1haW5lZFN0YXRpb25hcnksIHNldFJlbWFpbmVkU3RhdGlvbmFyeV0gPSB1c2VTdGF0ZShpbml0aWFsT3B0aW9ucy5yZW1haW5lZF9zdGF0aW9uYXJ5KVxuICBjb25zdCBbaW5kaXJlY3RUYXJnZXRWaXNpYmxlLCBzZXRJbmRpcmVjdFRhcmdldFZpc2libGVdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuaW5kaXJlY3RfdGFyZ2V0X3Zpc2libGUpXG4gIGNvbnN0IFtoYXphcmRvdXNPdmVyd2F0Y2hDaGFyZ2VQaGFzZSwgc2V0SGF6YXJkb3VzT3ZlcndhdGNoQ2hhcmdlUGhhc2VdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuaGF6YXJkb3VzX292ZXJ3YXRjaF9jaGFyZ2VfcGhhc2UpXG4gIGNvbnN0IFtoYXphcmRvdXNCZWFyZXJDdXJyZW50V291bmRzLCBzZXRIYXphcmRvdXNCZWFyZXJDdXJyZW50V291bmRzXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLmhhemFyZG91c19iZWFyZXJfY3VycmVudF93b3VuZHMpXG4gIGNvbnN0IFthdHRhY2tlckZpcmVEaXNjaXBsaW5lQWN0aXZlLCBzZXRBdHRhY2tlckZpcmVEaXNjaXBsaW5lQWN0aXZlXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX2ZpcmVfZGlzY2lwbGluZV9hY3RpdmUpXG4gIGNvbnN0IFthdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlLCBzZXRBdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX21hcmtlZF9mb3JfZGVzdHJ1Y3Rpb25fYWN0aXZlKVxuICBjb25zdCBbYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFjdGl2ZSwgc2V0QXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFjdGl2ZV0gPSB1c2VTdGF0ZShpbml0aWFsT3B0aW9ucy5hdHRhY2tlcl91bmZvcmdpdmVuX2Z1cnlfYWN0aXZlKVxuICBjb25zdCBbYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFybXlCYXR0bGVzaG9ja2VkLCBzZXRBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QXJteUJhdHRsZXNob2NrZWRdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfdW5mb3JnaXZlbl9mdXJ5X2FybXlfYmF0dGxlc2hvY2tlZClcbiAgY29uc3QgW2F0dGFja2VyU3R1YmJvcm5UZW5hY2l0eUFjdGl2ZSwgc2V0QXR0YWNrZXJTdHViYm9yblRlbmFjaXR5QWN0aXZlXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX3N0dWJib3JuX3RlbmFjaXR5X2FjdGl2ZSlcbiAgY29uc3QgW2F0dGFja2VyV2VhcG9uc09mVGhlRmlyc3RMZWdpb25BY3RpdmUsIHNldEF0dGFja2VyV2VhcG9uc09mVGhlRmlyc3RMZWdpb25BY3RpdmVdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfd2VhcG9uc19vZl90aGVfZmlyc3RfbGVnaW9uX2FjdGl2ZSlcbiAgY29uc3QgW2F0dGFja2VyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUsIHNldEF0dGFja2VyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmVdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfcGVubmFudF9vZl9yZW1lbWJyYW5jZV9hY3RpdmUpXG4gIGNvbnN0IFthdHRhY2tlckJlbG93U3RhcnRpbmdTdHJlbmd0aCwgc2V0QXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGhdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfYmVsb3dfc3RhcnRpbmdfc3RyZW5ndGgpXG4gIGNvbnN0IFthdHRhY2tlckJhdHRsZXNob2NrZWQsIHNldEF0dGFja2VyQmF0dGxlc2hvY2tlZF0gPSB1c2VTdGF0ZShpbml0aWFsT3B0aW9ucy5hdHRhY2tlcl9iYXR0bGVzaG9ja2VkKVxuICBjb25zdCBbZGVmZW5kZXJBcm1vdXJPZkNvbnRlbXB0QWN0aXZlLCBzZXREZWZlbmRlckFybW91ck9mQ29udGVtcHRBY3RpdmVdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuZGVmZW5kZXJfYXJtb3VyX29mX2NvbnRlbXB0X2FjdGl2ZSlcbiAgY29uc3QgW2RlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0QWN0aXZlLCBzZXREZWZlbmRlck92ZXJ3aGVsbWluZ09uc2xhdWdodEFjdGl2ZV0gPSB1c2VTdGF0ZShpbml0aWFsT3B0aW9ucy5kZWZlbmRlcl9vdmVyd2hlbG1pbmdfb25zbGF1Z2h0X2FjdGl2ZSlcbiAgY29uc3QgW2RlZmVuZGVyVW5icmVha2FibGVMaW5lc0FjdGl2ZSwgc2V0RGVmZW5kZXJVbmJyZWFrYWJsZUxpbmVzQWN0aXZlXSA9IHVzZVN0YXRlKGluaXRpYWxPcHRpb25zLmRlZmVuZGVyX3VuYnJlYWthYmxlX2xpbmVzX2FjdGl2ZSlcbiAgY29uc3QgW2RlZmVuZGVyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUsIHNldERlZmVuZGVyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmVdID0gdXNlU3RhdGUoaW5pdGlhbE9wdGlvbnMuZGVmZW5kZXJfcGVubmFudF9vZl9yZW1lbWJyYW5jZV9hY3RpdmUpXG4gIGNvbnN0IFtkZWZlbmRlckJhdHRsZXNob2NrZWQsIHNldERlZmVuZGVyQmF0dGxlc2hvY2tlZF0gPSB1c2VTdGF0ZShpbml0aWFsT3B0aW9ucy5kZWZlbmRlcl9iYXR0bGVzaG9ja2VkKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEZhY3Rpb25zKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc2V0TG9hZGluZyh0cnVlKVxuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgZmV0Y2hGYWN0aW9ucygpXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZGF0YS5pdGVtcyB8fCBbXVxuICAgICAgICBzZXRGYWN0aW9ucyhpdGVtcylcbiAgICAgICAgaWYgKGl0ZW1zWzBdKSB7XG4gICAgICAgICAgc2V0QXR0YWNrZXJGYWN0aW9uKGl0ZW1zWzBdLm5hbWUpXG4gICAgICAgICAgc2V0RGVmZW5kZXJGYWN0aW9uKGl0ZW1zWzBdLm5hbWUpXG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKHJlcXVlc3RFcnJvcikge1xuICAgICAgICBzZXRFcnJvcihmb3JtYXRFcnJvcihyZXF1ZXN0RXJyb3IpKVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc2V0TG9hZGluZyhmYWxzZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2FkRmFjdGlvbnMoKVxuICB9LCBbXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYXR0YWNrZXJGYWN0aW9uKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBsZXQgYWN0aXZlID0gdHJ1ZVxuICAgIHNldEF0dGFja2VyVW5pdERldGFpbHMobnVsbClcbiAgICBzZXRXZWFwb25OYW1lKCcnKVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEF0dGFja2VyVW5pdHMoKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgZmV0Y2hVbml0cyhhdHRhY2tlckZhY3Rpb24pXG4gICAgICAgIGlmICghYWN0aXZlKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaXRlbXMgPSBkYXRhLml0ZW1zIHx8IFtdXG4gICAgICAgIHNldEF0dGFja2VyVW5pdHMoaXRlbXMpXG4gICAgICAgIHNldEF0dGFja2VyVW5pdCgoY3VycmVudFVuaXQpID0+IChcbiAgICAgICAgICBpdGVtcy5zb21lKCh1bml0KSA9PiB1bml0Lm5hbWUgPT09IGN1cnJlbnRVbml0KVxuICAgICAgICAgICAgPyBjdXJyZW50VW5pdFxuICAgICAgICAgICAgOiBpdGVtc1swXT8ubmFtZSB8fCAnJ1xuICAgICAgICApKVxuICAgICAgICBzZXRFcnJvcignJylcbiAgICAgIH0gY2F0Y2ggKHJlcXVlc3RFcnJvcikge1xuICAgICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgICAgc2V0RXJyb3IoZm9ybWF0RXJyb3IocmVxdWVzdEVycm9yKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxvYWRBdHRhY2tlclVuaXRzKClcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBhY3RpdmUgPSBmYWxzZVxuICAgIH1cbiAgfSwgW2F0dGFja2VyRmFjdGlvbl0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWF0dGFja2VyRmFjdGlvbikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IGFjdGl2ZSA9IHRydWVcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRBdHRhY2tlckZhY3Rpb25EZXRhaWxzKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZldGNoRmFjdGlvbkRldGFpbHMoYXR0YWNrZXJGYWN0aW9uKVxuICAgICAgICBpZiAoIWFjdGl2ZSkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHNldEF0dGFja2VyRmFjdGlvbkRldGFpbHMoZGF0YSlcbiAgICAgICAgc2V0QXR0YWNrZXJEZXRhY2htZW50TmFtZSgoY3VycmVudERldGFjaG1lbnQpID0+IChcbiAgICAgICAgICBkYXRhLmRldGFjaG1lbnRzPy5zb21lKChkZXRhY2htZW50KSA9PiBkZXRhY2htZW50Lm5hbWUgPT09IGN1cnJlbnREZXRhY2htZW50KVxuICAgICAgICAgICAgPyBjdXJyZW50RGV0YWNobWVudFxuICAgICAgICAgICAgOiBkYXRhLmRldGFjaG1lbnRzPy5bMF0/Lm5hbWUgfHwgJydcbiAgICAgICAgKSlcbiAgICAgICAgc2V0RXJyb3IoJycpXG4gICAgICB9IGNhdGNoIChyZXF1ZXN0RXJyb3IpIHtcbiAgICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAgIHNldEVycm9yKGZvcm1hdEVycm9yKHJlcXVlc3RFcnJvcikpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2FkQXR0YWNrZXJGYWN0aW9uRGV0YWlscygpXG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgYWN0aXZlID0gZmFsc2VcbiAgICB9XG4gIH0sIFthdHRhY2tlckZhY3Rpb25dKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFkZWZlbmRlckZhY3Rpb24pIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxldCBhY3RpdmUgPSB0cnVlXG4gICAgc2V0RGVmZW5kZXJVbml0RGV0YWlscyhudWxsKVxuICAgIHNldEF0dGFjaGVkQ2hhcmFjdGVyTmFtZSgnJylcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWREZWZlbmRlclVuaXRzKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZldGNoVW5pdHMoZGVmZW5kZXJGYWN0aW9uKVxuICAgICAgICBpZiAoIWFjdGl2ZSkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZGF0YS5pdGVtcyB8fCBbXVxuICAgICAgICBzZXREZWZlbmRlclVuaXRzKGl0ZW1zKVxuICAgICAgICBzZXREZWZlbmRlclVuaXQoKGN1cnJlbnRVbml0KSA9PiAoXG4gICAgICAgICAgaXRlbXMuc29tZSgodW5pdCkgPT4gdW5pdC5uYW1lID09PSBjdXJyZW50VW5pdClcbiAgICAgICAgICAgID8gY3VycmVudFVuaXRcbiAgICAgICAgICAgIDogaXRlbXNbMF0/Lm5hbWUgfHwgJydcbiAgICAgICAgKSlcbiAgICAgICAgc2V0RXJyb3IoJycpXG4gICAgICB9IGNhdGNoIChyZXF1ZXN0RXJyb3IpIHtcbiAgICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAgIHNldEVycm9yKGZvcm1hdEVycm9yKHJlcXVlc3RFcnJvcikpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2FkRGVmZW5kZXJVbml0cygpXG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgYWN0aXZlID0gZmFsc2VcbiAgICB9XG4gIH0sIFtkZWZlbmRlckZhY3Rpb25dKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFkZWZlbmRlckZhY3Rpb24pIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxldCBhY3RpdmUgPSB0cnVlXG5cbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkRGVmZW5kZXJGYWN0aW9uRGV0YWlscygpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmZXRjaEZhY3Rpb25EZXRhaWxzKGRlZmVuZGVyRmFjdGlvbilcbiAgICAgICAgaWYgKCFhY3RpdmUpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBzZXREZWZlbmRlckZhY3Rpb25EZXRhaWxzKGRhdGEpXG4gICAgICAgIHNldERlZmVuZGVyRGV0YWNobWVudE5hbWUoKGN1cnJlbnREZXRhY2htZW50KSA9PiAoXG4gICAgICAgICAgZGF0YS5kZXRhY2htZW50cz8uc29tZSgoZGV0YWNobWVudCkgPT4gZGV0YWNobWVudC5uYW1lID09PSBjdXJyZW50RGV0YWNobWVudClcbiAgICAgICAgICAgID8gY3VycmVudERldGFjaG1lbnRcbiAgICAgICAgICAgIDogZGF0YS5kZXRhY2htZW50cz8uWzBdPy5uYW1lIHx8ICcnXG4gICAgICAgICkpXG4gICAgICAgIHNldEVycm9yKCcnKVxuICAgICAgfSBjYXRjaCAocmVxdWVzdEVycm9yKSB7XG4gICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICBzZXRFcnJvcihmb3JtYXRFcnJvcihyZXF1ZXN0RXJyb3IpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9hZERlZmVuZGVyRmFjdGlvbkRldGFpbHMoKVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGFjdGl2ZSA9IGZhbHNlXG4gICAgfVxuICB9LCBbZGVmZW5kZXJGYWN0aW9uXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNldEF0dGFja2VyTG9hZG91dFNlbGVjdGlvbnMoe30pXG4gICAgc2V0QXR0YWNrZXJNb2RlbENvdW50KCcnKVxuICB9LCBbYXR0YWNrZXJGYWN0aW9uLCBhdHRhY2tlclVuaXRdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0RGVmZW5kZXJMb2Fkb3V0U2VsZWN0aW9ucyh7fSlcbiAgICBzZXREZWZlbmRlck1vZGVsQ291bnQoJycpXG4gIH0sIFtkZWZlbmRlckZhY3Rpb24sIGRlZmVuZGVyVW5pdF0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzZXRBdHRhY2hlZENoYXJhY3RlckxvYWRvdXRTZWxlY3Rpb25zKHt9KVxuICAgIHNldEF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCgnJylcbiAgICBzZXRBdHRhY2hlZENoYXJhY3RlclVuaXREZXRhaWxzKG51bGwpXG4gIH0sIFthdHRhY2hlZENoYXJhY3Rlck5hbWVdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFhdHRhY2tlckZhY3Rpb24gfHwgIWF0dGFja2VyVW5pdCB8fCAhYXR0YWNrZXJVbml0cy5zb21lKCh1bml0KSA9PiB1bml0Lm5hbWUgPT09IGF0dGFja2VyVW5pdCkpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxldCBhY3RpdmUgPSB0cnVlXG5cbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkQXR0YWNrZXJVbml0RGV0YWlscygpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmZXRjaFVuaXREZXRhaWxzV2l0aExvYWRvdXQoXG4gICAgICAgICAgYXR0YWNrZXJGYWN0aW9uLFxuICAgICAgICAgIGF0dGFja2VyVW5pdCxcbiAgICAgICAgICBhdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgICAgICAgIGF0dGFja2VyTW9kZWxDb3VudCxcbiAgICAgICAgKVxuICAgICAgICBpZiAoIWFjdGl2ZSkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHNldEF0dGFja2VyVW5pdERldGFpbHMoZGF0YSlcbiAgICAgICAgc2V0QXR0YWNrZXJNb2RlbENvdW50KChjdXJyZW50TW9kZWxDb3VudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGN1cnJlbnRNb2RlbENvdW50ID09PSAnJyA/IG51bGwgOiBOdW1iZXIoY3VycmVudE1vZGVsQ291bnQpXG4gICAgICAgICAgY29uc3QgbWluaW11bU1vZGVscyA9IE51bWJlcihkYXRhLnVuaXRfY29tcG9zaXRpb24/Lm1pbl9tb2RlbHMgPz8gZGF0YS5tb2RlbF9jb3VudCA/PyAxKVxuICAgICAgICAgIGNvbnN0IG1heGltdW1Nb2RlbHMgPSBOdW1iZXIoZGF0YS51bml0X2NvbXBvc2l0aW9uPy5tYXhfbW9kZWxzID8/IG1pbmltdW1Nb2RlbHMpXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgY3VycmVudFZhbHVlID09PSBudWxsXG4gICAgICAgICAgICB8fCBOdW1iZXIuaXNOYU4oY3VycmVudFZhbHVlKVxuICAgICAgICAgICAgfHwgY3VycmVudFZhbHVlIDwgbWluaW11bU1vZGVsc1xuICAgICAgICAgICAgfHwgY3VycmVudFZhbHVlID4gbWF4aW11bU1vZGVsc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhLm1vZGVsX2NvdW50ID8/IG1pbmltdW1Nb2RlbHMpXG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjdXJyZW50TW9kZWxDb3VudFxuICAgICAgICB9KVxuICAgICAgICBzZXRXZWFwb25OYW1lKChjdXJyZW50V2VhcG9uKSA9PiAoXG4gICAgICAgICAgKFxuICAgICAgICAgICAgZGF0YS53ZWFwb25zPy5zb21lKCh3ZWFwb24pID0+IHdlYXBvbi5uYW1lID09PSBjdXJyZW50V2VhcG9uKVxuICAgICAgICAgICAgfHwgKFxuICAgICAgICAgICAgICBjdXJyZW50V2VhcG9uID09PSBBTExfUkFOR0VEX1dFQVBPTlNcbiAgICAgICAgICAgICAgJiYgKGRhdGEud2VhcG9ucyB8fCBbXSkuZmlsdGVyKCh3ZWFwb24pID0+IHdlYXBvbi5yYW5nZSAhPT0gJ01lbGVlJykubGVuZ3RoID4gMVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgfHwgKFxuICAgICAgICAgICAgICBjdXJyZW50V2VhcG9uID09PSBBTExfTUVMRUVfV0VBUE9OU1xuICAgICAgICAgICAgICAmJiAoZGF0YS53ZWFwb25zIHx8IFtdKS5maWx0ZXIoKHdlYXBvbikgPT4gd2VhcG9uLnJhbmdlID09PSAnTWVsZWUnICYmICF3ZWFwb25IYXNFeHRyYUF0dGFja3Mod2VhcG9uKSkubGVuZ3RoID4gMVxuICAgICAgICAgICAgKVxuICAgICAgICAgIClcbiAgICAgICAgICAgID8gY3VycmVudFdlYXBvblxuICAgICAgICAgICAgOiBnZXRDb21iYXRXZWFwb25PcHRpb25zKGRhdGEpWzBdPy5uYW1lIHx8ICcnXG4gICAgICAgICkpXG4gICAgICAgIHNldEVycm9yKCcnKVxuICAgICAgfSBjYXRjaCAocmVxdWVzdEVycm9yKSB7XG4gICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICBzZXRFcnJvcihmb3JtYXRFcnJvcihyZXF1ZXN0RXJyb3IpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9hZEF0dGFja2VyVW5pdERldGFpbHMoKVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGFjdGl2ZSA9IGZhbHNlXG4gICAgfVxuICB9LCBbYXR0YWNrZXJGYWN0aW9uLCBhdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zLCBhdHRhY2tlck1vZGVsQ291bnQsIGF0dGFja2VyVW5pdCwgYXR0YWNrZXJVbml0c10pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWRlZmVuZGVyRmFjdGlvbiB8fCAhZGVmZW5kZXJVbml0IHx8ICFkZWZlbmRlclVuaXRzLnNvbWUoKHVuaXQpID0+IHVuaXQubmFtZSA9PT0gZGVmZW5kZXJVbml0KSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IGFjdGl2ZSA9IHRydWVcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWREZWZlbmRlclVuaXREZXRhaWxzKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZldGNoVW5pdERldGFpbHNXaXRoTG9hZG91dChcbiAgICAgICAgICBkZWZlbmRlckZhY3Rpb24sXG4gICAgICAgICAgZGVmZW5kZXJVbml0LFxuICAgICAgICAgIGRlZmVuZGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgICAgICAgZGVmZW5kZXJNb2RlbENvdW50LFxuICAgICAgICApXG4gICAgICAgIGlmICghYWN0aXZlKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgc2V0RGVmZW5kZXJVbml0RGV0YWlscyhkYXRhKVxuICAgICAgICBzZXREZWZlbmRlck1vZGVsQ291bnQoKGN1cnJlbnRNb2RlbENvdW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY3VycmVudE1vZGVsQ291bnQgPT09ICcnID8gbnVsbCA6IE51bWJlcihjdXJyZW50TW9kZWxDb3VudClcbiAgICAgICAgICBjb25zdCBtaW5pbXVtTW9kZWxzID0gTnVtYmVyKGRhdGEudW5pdF9jb21wb3NpdGlvbj8ubWluX21vZGVscyA/PyBkYXRhLm1vZGVsX2NvdW50ID8/IDEpXG4gICAgICAgICAgY29uc3QgbWF4aW11bU1vZGVscyA9IE51bWJlcihkYXRhLnVuaXRfY29tcG9zaXRpb24/Lm1heF9tb2RlbHMgPz8gbWluaW11bU1vZGVscylcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBjdXJyZW50VmFsdWUgPT09IG51bGxcbiAgICAgICAgICAgIHx8IE51bWJlci5pc05hTihjdXJyZW50VmFsdWUpXG4gICAgICAgICAgICB8fCBjdXJyZW50VmFsdWUgPCBtaW5pbXVtTW9kZWxzXG4gICAgICAgICAgICB8fCBjdXJyZW50VmFsdWUgPiBtYXhpbXVtTW9kZWxzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEubW9kZWxfY291bnQgPz8gbWluaW11bU1vZGVscylcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGN1cnJlbnRNb2RlbENvdW50XG4gICAgICAgIH0pXG4gICAgICAgIHNldEVycm9yKCcnKVxuICAgICAgfSBjYXRjaCAocmVxdWVzdEVycm9yKSB7XG4gICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICBzZXRFcnJvcihmb3JtYXRFcnJvcihyZXF1ZXN0RXJyb3IpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9hZERlZmVuZGVyVW5pdERldGFpbHMoKVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGFjdGl2ZSA9IGZhbHNlXG4gICAgfVxuICB9LCBbZGVmZW5kZXJGYWN0aW9uLCBkZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zLCBkZWZlbmRlck1vZGVsQ291bnQsIGRlZmVuZGVyVW5pdCwgZGVmZW5kZXJVbml0c10pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoXG4gICAgICAhY2FuVXNlUHJlY2lzaW9uXG4gICAgICB8fCAhYXR0YWNoZWRDaGFyYWN0ZXJOYW1lXG4gICAgICB8fCAhZGVmZW5kZXJGYWN0aW9uXG4gICAgICB8fCAhYXR0YWNoZWRDaGFyYWN0ZXJPcHRpb25zLnNvbWUoKHVuaXQpID0+IHVuaXQubmFtZSA9PT0gYXR0YWNoZWRDaGFyYWN0ZXJOYW1lKVxuICAgICkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IGFjdGl2ZSA9IHRydWVcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRBdHRhY2hlZENoYXJhY3RlclVuaXREZXRhaWxzKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZldGNoVW5pdERldGFpbHNXaXRoTG9hZG91dChcbiAgICAgICAgICBkZWZlbmRlckZhY3Rpb24sXG4gICAgICAgICAgYXR0YWNoZWRDaGFyYWN0ZXJOYW1lLFxuICAgICAgICAgIGF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgICAgICAgYXR0YWNoZWRDaGFyYWN0ZXJNb2RlbENvdW50LFxuICAgICAgICApXG4gICAgICAgIGlmICghYWN0aXZlKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgc2V0QXR0YWNoZWRDaGFyYWN0ZXJVbml0RGV0YWlscyhkYXRhKVxuICAgICAgICBzZXRBdHRhY2hlZENoYXJhY3Rlck1vZGVsQ291bnQoKGN1cnJlbnRNb2RlbENvdW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY3VycmVudE1vZGVsQ291bnQgPT09ICcnID8gbnVsbCA6IE51bWJlcihjdXJyZW50TW9kZWxDb3VudClcbiAgICAgICAgICBjb25zdCBtaW5pbXVtTW9kZWxzID0gTnVtYmVyKGRhdGEudW5pdF9jb21wb3NpdGlvbj8ubWluX21vZGVscyA/PyBkYXRhLm1vZGVsX2NvdW50ID8/IDEpXG4gICAgICAgICAgY29uc3QgbWF4aW11bU1vZGVscyA9IE51bWJlcihkYXRhLnVuaXRfY29tcG9zaXRpb24/Lm1heF9tb2RlbHMgPz8gbWluaW11bU1vZGVscylcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBjdXJyZW50VmFsdWUgPT09IG51bGxcbiAgICAgICAgICAgIHx8IE51bWJlci5pc05hTihjdXJyZW50VmFsdWUpXG4gICAgICAgICAgICB8fCBjdXJyZW50VmFsdWUgPCBtaW5pbXVtTW9kZWxzXG4gICAgICAgICAgICB8fCBjdXJyZW50VmFsdWUgPiBtYXhpbXVtTW9kZWxzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEubW9kZWxfY291bnQgPz8gbWluaW11bU1vZGVscylcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGN1cnJlbnRNb2RlbENvdW50XG4gICAgICAgIH0pXG4gICAgICAgIHNldEVycm9yKCcnKVxuICAgICAgfSBjYXRjaCAocmVxdWVzdEVycm9yKSB7XG4gICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICBzZXRFcnJvcihmb3JtYXRFcnJvcihyZXF1ZXN0RXJyb3IpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9hZEF0dGFjaGVkQ2hhcmFjdGVyVW5pdERldGFpbHMoKVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGFjdGl2ZSA9IGZhbHNlXG4gICAgfVxuICB9LCBbXG4gICAgYXR0YWNoZWRDaGFyYWN0ZXJMb2Fkb3V0U2VsZWN0aW9ucyxcbiAgICBhdHRhY2hlZENoYXJhY3Rlck1vZGVsQ291bnQsXG4gICAgYXR0YWNoZWRDaGFyYWN0ZXJOYW1lLFxuICAgIGF0dGFjaGVkQ2hhcmFjdGVyT3B0aW9ucyxcbiAgICBjYW5Vc2VQcmVjaXNpb24sXG4gICAgZGVmZW5kZXJGYWN0aW9uLFxuICBdKVxuXG4gIGNvbnN0IGNvbWJhdFdlYXBvbk9wdGlvbnMgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldENvbWJhdFdlYXBvbk9wdGlvbnMoYXR0YWNrZXJVbml0RGV0YWlscyksXG4gICAgW2F0dGFja2VyVW5pdERldGFpbHNdLFxuICApXG4gIGNvbnN0IHNlbGVjdGVkQXR0YWNrV2VhcG9ucyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IHdlYXBvbnMgPSBhdHRhY2tlclVuaXREZXRhaWxzPy53ZWFwb25zIHx8IFtdXG4gICAgaWYgKHdlYXBvbk5hbWUgPT09IEFMTF9SQU5HRURfV0VBUE9OUykge1xuICAgICAgcmV0dXJuIHdlYXBvbnMuZmlsdGVyKCh3ZWFwb24pID0+IHdlYXBvbi5yYW5nZSAhPT0gJ01lbGVlJylcbiAgICB9XG4gICAgaWYgKHdlYXBvbk5hbWUgPT09IEFMTF9NRUxFRV9XRUFQT05TKSB7XG4gICAgICByZXR1cm4gd2VhcG9ucy5maWx0ZXIoKHdlYXBvbikgPT4gd2VhcG9uLnJhbmdlID09PSAnTWVsZWUnICYmICF3ZWFwb25IYXNFeHRyYUF0dGFja3Mod2VhcG9uKSlcbiAgICB9XG4gICAgcmV0dXJuIHdlYXBvbnMuZmlsdGVyKCh3ZWFwb24pID0+IHdlYXBvbi5uYW1lID09PSB3ZWFwb25OYW1lKVxuICB9LCBbYXR0YWNrZXJVbml0RGV0YWlscywgd2VhcG9uTmFtZV0pXG4gIGNvbnN0IHNlbGVjdGVkV2VhcG9uID0gdXNlTWVtbyhcbiAgICAoKSA9PiBidWlsZFdlYXBvblNlbGVjdGlvblByb2ZpbGUoc2VsZWN0ZWRBdHRhY2tXZWFwb25zLCB3ZWFwb25OYW1lKSxcbiAgICBbc2VsZWN0ZWRBdHRhY2tXZWFwb25zLCB3ZWFwb25OYW1lXSxcbiAgKVxuXG4gIGNvbnN0IHNlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50ID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXREZXRhY2htZW50QnlOYW1lKGF0dGFja2VyRmFjdGlvbkRldGFpbHMsIGF0dGFja2VyRGV0YWNobWVudE5hbWUpLFxuICAgIFthdHRhY2tlckZhY3Rpb25EZXRhaWxzLCBhdHRhY2tlckRldGFjaG1lbnROYW1lXSxcbiAgKVxuXG4gIGNvbnN0IHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50ID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXREZXRhY2htZW50QnlOYW1lKGRlZmVuZGVyRmFjdGlvbkRldGFpbHMsIGRlZmVuZGVyRGV0YWNobWVudE5hbWUpLFxuICAgIFtkZWZlbmRlckZhY3Rpb25EZXRhaWxzLCBkZWZlbmRlckRldGFjaG1lbnROYW1lXSxcbiAgKVxuICBjb25zdCByZXNvbHZlZEF0dGFja2VyTG9hZG91dFNlbGVjdGlvbnMgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldFJlc29sdmVkTG9hZG91dFNlbGVjdGlvbnMoYXR0YWNrZXJVbml0RGV0YWlscywgYXR0YWNrZXJMb2Fkb3V0U2VsZWN0aW9ucyksXG4gICAgW2F0dGFja2VyTG9hZG91dFNlbGVjdGlvbnMsIGF0dGFja2VyVW5pdERldGFpbHNdLFxuICApXG4gIGNvbnN0IHJlc29sdmVkRGVmZW5kZXJMb2Fkb3V0U2VsZWN0aW9ucyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0UmVzb2x2ZWRMb2Fkb3V0U2VsZWN0aW9ucyhkZWZlbmRlclVuaXREZXRhaWxzLCBkZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zKSxcbiAgICBbZGVmZW5kZXJMb2Fkb3V0U2VsZWN0aW9ucywgZGVmZW5kZXJVbml0RGV0YWlsc10sXG4gIClcbiAgY29uc3QgcmVzb2x2ZWRBdHRhY2hlZENoYXJhY3RlckxvYWRvdXRTZWxlY3Rpb25zID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXRSZXNvbHZlZExvYWRvdXRTZWxlY3Rpb25zKGF0dGFjaGVkQ2hhcmFjdGVyVW5pdERldGFpbHMsIGF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMpLFxuICAgIFthdHRhY2hlZENoYXJhY3RlckxvYWRvdXRTZWxlY3Rpb25zLCBhdHRhY2hlZENoYXJhY3RlclVuaXREZXRhaWxzXSxcbiAgKVxuXG4gIGNvbnN0IGlzUmFuZ2VkV2VhcG9uID0gc2VsZWN0ZWRBdHRhY2tXZWFwb25zLmxlbmd0aCA+IDAgJiYgc2VsZWN0ZWRBdHRhY2tXZWFwb25zLmV2ZXJ5KCh3ZWFwb24pID0+IHdlYXBvbi5yYW5nZSAhPT0gJ01lbGVlJylcbiAgY29uc3QgaXNNZWxlZVdlYXBvbiA9IHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5sZW5ndGggPiAwICYmIHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5ldmVyeSgod2VhcG9uKSA9PiB3ZWFwb24ucmFuZ2UgPT09ICdNZWxlZScpXG4gIGNvbnN0IGhhc0hlYXZ5ID0gc2VsZWN0ZWRBdHRhY2tXZWFwb25zLnNvbWUoKHdlYXBvbikgPT4gd2VhcG9uSGFzUmF3S2V5d29yZCh3ZWFwb24sICdIZWF2eScpKVxuICBjb25zdCBoYXNCbGFzdCA9IHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5zb21lKCh3ZWFwb24pID0+IHdlYXBvbkhhc1Jhd0tleXdvcmQod2VhcG9uLCAnQmxhc3QnKSlcbiAgY29uc3QgaGFzSW5kaXJlY3RGaXJlID0gc2VsZWN0ZWRBdHRhY2tXZWFwb25zLnNvbWUoKHdlYXBvbikgPT4gd2VhcG9uSGFzUmF3S2V5d29yZCh3ZWFwb24sICdJbmRpcmVjdCBGaXJlJykpXG4gIGNvbnN0IGhhc0hhemFyZG91cyA9IHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5zb21lKCh3ZWFwb24pID0+IHdlYXBvbkhhc1Jhd0tleXdvcmQod2VhcG9uLCAnSGF6YXJkb3VzJykpXG4gIGNvbnN0IGNhblVzZVByZWNpc2lvbiA9IHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5zb21lKCh3ZWFwb24pID0+IHdlYXBvbkhhc1Jhd0tleXdvcmQod2VhcG9uLCAnUHJlY2lzaW9uJykpXG4gIGNvbnN0IGNhblVzZUxhbmNlID0gc2VsZWN0ZWRBdHRhY2tXZWFwb25zLnNvbWUoKHdlYXBvbikgPT4gd2VhcG9uSGFzUmF3S2V5d29yZCh3ZWFwb24sICdMYW5jZScpKVxuICBjb25zdCBhdHRhY2hlZENoYXJhY3Rlck9wdGlvbnMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIWRlZmVuZGVyVW5pdCB8fCAhZGVmZW5kZXJGYWN0aW9uRGV0YWlscz8udW5pdHM/Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICAgIHJldHVybiBkZWZlbmRlckZhY3Rpb25EZXRhaWxzLnVuaXRzLmZpbHRlcigodW5pdCkgPT4ge1xuICAgICAgY29uc3QgY2FuTGVhZCA9IHVuaXQubGVhZGVyPy5jYW5fbGVhZCB8fCBbXVxuICAgICAgcmV0dXJuIHVuaXQubmFtZSAhPT0gZGVmZW5kZXJVbml0ICYmIGNhbkxlYWQuaW5jbHVkZXMoZGVmZW5kZXJVbml0KVxuICAgIH0pXG4gIH0sIFtkZWZlbmRlckZhY3Rpb25EZXRhaWxzLCBkZWZlbmRlclVuaXRdKVxuICBjb25zdCBjYW5Vc2VDb3ZlciA9IGlzUmFuZ2VkV2VhcG9uXG4gIGNvbnN0IGNhblVzZUhhbGZSYW5nZSA9IGlzUmFuZ2VkV2VhcG9uICYmIChcbiAgICBzZWxlY3RlZEF0dGFja1dlYXBvbnMuc29tZSgod2VhcG9uKSA9PiBnZXRXZWFwb25LZXl3b3JkVmFsdWUod2VhcG9uLCAnUmFwaWQgRmlyZScpID4gMClcbiAgICB8fCBzZWxlY3RlZEF0dGFja1dlYXBvbnMuc29tZSgod2VhcG9uKSA9PiBnZXRXZWFwb25LZXl3b3JkVmFsdWUod2VhcG9uLCAnTWVsdGEnKSA+IDApXG4gIClcbiAgY29uc3QgaGFzT2F0aE9mTW9tZW50ID0gdW5pdEhhc09hdGhPZk1vbWVudChhdHRhY2tlclVuaXREZXRhaWxzKVxuICBjb25zdCBhdHRhY2tlckVuaGFuY2VtZW50T3B0aW9ucyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0QXR0YWNrZXJFbmhhbmNlbWVudE9wdGlvbnMoXG4gICAgICBzZWxlY3RlZEF0dGFja2VyRGV0YWNobWVudCxcbiAgICAgIGF0dGFja2VyVW5pdERldGFpbHMsXG4gICAgICBzZWxlY3RlZFdlYXBvbixcbiAgICAgIGhhc0hhemFyZG91cyxcbiAgICApLFxuICAgIFtzZWxlY3RlZEF0dGFja2VyRGV0YWNobWVudCwgYXR0YWNrZXJVbml0RGV0YWlscywgc2VsZWN0ZWRXZWFwb24sIGhhc0hhemFyZG91c10sXG4gIClcbiAgY29uc3QgZGVmZW5kZXJFbmhhbmNlbWVudE9wdGlvbnMgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldERlZmVuZGVyRW5oYW5jZW1lbnRPcHRpb25zKHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50LCBkZWZlbmRlclVuaXREZXRhaWxzKSxcbiAgICBbc2VsZWN0ZWREZWZlbmRlckRldGFjaG1lbnQsIGRlZmVuZGVyVW5pdERldGFpbHNdLFxuICApXG4gIGNvbnN0IGF0dGFja2VyU3RyYXRhZ2VtT3B0aW9ucyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0QXR0YWNrZXJTdHJhdGFnZW1PcHRpb25zKHNlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50LCBhdHRhY2tlclVuaXREZXRhaWxzLCBpc1JhbmdlZFdlYXBvbiksXG4gICAgW3NlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50LCBhdHRhY2tlclVuaXREZXRhaWxzLCBpc1JhbmdlZFdlYXBvbl0sXG4gIClcbiAgY29uc3QgZGVmZW5kZXJTdHJhdGFnZW1PcHRpb25zID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXREZWZlbmRlclN0cmF0YWdlbU9wdGlvbnMoc2VsZWN0ZWREZWZlbmRlckRldGFjaG1lbnQsIHNlbGVjdGVkV2VhcG9uKSxcbiAgICBbc2VsZWN0ZWREZWZlbmRlckRldGFjaG1lbnQsIHNlbGVjdGVkV2VhcG9uXSxcbiAgKVxuXG4gIGNvbnN0IGNhblVzZUF0dGFja2VyRmlyZURpc2NpcGxpbmUgPSBhdHRhY2tlclN0cmF0YWdlbU9wdGlvbnMuc29tZSgoaXRlbSkgPT4gaXRlbS5uYW1lID09PSAnRmlyZSBEaXNjaXBsaW5lJylcbiAgY29uc3QgY2FuVXNlQXR0YWNrZXJNYXJrZWRGb3JEZXN0cnVjdGlvbiA9IGF0dGFja2VyU3RyYXRhZ2VtT3B0aW9ucy5zb21lKChpdGVtKSA9PiBpdGVtLm5hbWUgPT09ICdNYXJrZWQgZm9yIERlc3RydWN0aW9uJylcbiAgY29uc3QgY2FuVXNlQXR0YWNrZXJVbmZvcmdpdmVuRnVyeSA9IGF0dGFja2VyU3RyYXRhZ2VtT3B0aW9ucy5zb21lKChpdGVtKSA9PiBpdGVtLm5hbWUgPT09ICdVbmZvcmdpdmVuIEZ1cnknKVxuICBjb25zdCBjYW5Vc2VEZWZlbmRlckFybW91ck9mQ29udGVtcHQgPSBkZWZlbmRlclN0cmF0YWdlbU9wdGlvbnMuc29tZSgoaXRlbSkgPT4gaXRlbS5uYW1lID09PSAnQXJtb3VyIG9mIENvbnRlbXB0JylcbiAgY29uc3QgY2FuVXNlRGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHQgPSBkZWZlbmRlclN0cmF0YWdlbU9wdGlvbnMuc29tZSgoaXRlbSkgPT4gaXRlbS5uYW1lID09PSAnT3ZlcndoZWxtaW5nIE9uc2xhdWdodCcpXG4gIGNvbnN0IGNhblVzZURlZmVuZGVyVW5icmVha2FibGVMaW5lcyA9IGRlZmVuZGVyU3RyYXRhZ2VtT3B0aW9ucy5zb21lKChpdGVtKSA9PiBpdGVtLm5hbWUgPT09ICdVbmJyZWFrYWJsZSBMaW5lcycpXG4gIGNvbnN0IHNlbGVjdGVkQXR0YWNrZXJFbmhhbmNlbWVudCA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0RGV0YWNobWVudEVudHJ5KHNlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50LCAnZW5oYW5jZW1lbnRzJywgYXR0YWNrZXJFbmhhbmNlbWVudE5hbWUpLFxuICAgIFtzZWxlY3RlZEF0dGFja2VyRGV0YWNobWVudCwgYXR0YWNrZXJFbmhhbmNlbWVudE5hbWVdLFxuICApXG4gIGNvbnN0IHNlbGVjdGVkRGVmZW5kZXJFbmhhbmNlbWVudCA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0RGV0YWNobWVudEVudHJ5KHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50LCAnZW5oYW5jZW1lbnRzJywgZGVmZW5kZXJFbmhhbmNlbWVudE5hbWUpLFxuICAgIFtzZWxlY3RlZERlZmVuZGVyRGV0YWNobWVudCwgZGVmZW5kZXJFbmhhbmNlbWVudE5hbWVdLFxuICApXG4gIGNvbnN0IGZpcmVEaXNjaXBsaW5lRW50cnkgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldERldGFjaG1lbnRFbnRyeShzZWxlY3RlZEF0dGFja2VyRGV0YWNobWVudCwgJ3N0cmF0YWdlbXMnLCAnRmlyZSBEaXNjaXBsaW5lJyksXG4gICAgW3NlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50XSxcbiAgKVxuICBjb25zdCBtYXJrZWRGb3JEZXN0cnVjdGlvbkVudHJ5ID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXREZXRhY2htZW50RW50cnkoc2VsZWN0ZWRBdHRhY2tlckRldGFjaG1lbnQsICdzdHJhdGFnZW1zJywgJ01hcmtlZCBmb3IgRGVzdHJ1Y3Rpb24nKSxcbiAgICBbc2VsZWN0ZWRBdHRhY2tlckRldGFjaG1lbnRdLFxuICApXG4gIGNvbnN0IHVuZm9yZ2l2ZW5GdXJ5RW50cnkgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldERldGFjaG1lbnRFbnRyeShzZWxlY3RlZEF0dGFja2VyRGV0YWNobWVudCwgJ3N0cmF0YWdlbXMnLCAnVW5mb3JnaXZlbiBGdXJ5JyksXG4gICAgW3NlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50XSxcbiAgKVxuICBjb25zdCBhcm1vdXJPZkNvbnRlbXB0RW50cnkgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldERldGFjaG1lbnRFbnRyeShzZWxlY3RlZERlZmVuZGVyRGV0YWNobWVudCwgJ3N0cmF0YWdlbXMnLCAnQXJtb3VyIG9mIENvbnRlbXB0JyksXG4gICAgW3NlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50XSxcbiAgKVxuICBjb25zdCBvdmVyd2hlbG1pbmdPbnNsYXVnaHRFbnRyeSA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0RGV0YWNobWVudEVudHJ5KHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50LCAnc3RyYXRhZ2VtcycsICdPdmVyd2hlbG1pbmcgT25zbGF1Z2h0JyksXG4gICAgW3NlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50XSxcbiAgKVxuICBjb25zdCB1bmJyZWFrYWJsZUxpbmVzRW50cnkgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldERldGFjaG1lbnRFbnRyeShzZWxlY3RlZERlZmVuZGVyRGV0YWNobWVudCwgJ3N0cmF0YWdlbXMnLCAnVW5icmVha2FibGUgTGluZXMnKSxcbiAgICBbc2VsZWN0ZWREZWZlbmRlckRldGFjaG1lbnRdLFxuICApXG4gIGNvbnN0IG9hdGhBYmlsaXR5ID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXRVbml0QWJpbGl0eShhdHRhY2tlclVuaXREZXRhaWxzLCAoYWJpbGl0eSkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhhYmlsaXR5Lm5hbWUgfHwgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgIGNvbnN0IHJ1bGVzVGV4dCA9IFN0cmluZyhhYmlsaXR5LnJ1bGVzX3RleHQgfHwgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgIHJldHVybiBuYW1lLmluY2x1ZGVzKCdvYXRoIG9mIG1vbWVudCcpIHx8IHJ1bGVzVGV4dC5pbmNsdWRlcygnb2F0aCBvZiBtb21lbnQnKVxuICAgIH0pLFxuICAgIFthdHRhY2tlclVuaXREZXRhaWxzXSxcbiAgKVxuICBjb25zdCByYXBpZEZpcmVWYWx1ZSA9IHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5yZWR1Y2UoXG4gICAgKG1heGltdW1WYWx1ZSwgd2VhcG9uKSA9PiBNYXRoLm1heChtYXhpbXVtVmFsdWUsIGdldFdlYXBvbktleXdvcmRWYWx1ZSh3ZWFwb24sICdSYXBpZCBGaXJlJykpLFxuICAgIDAsXG4gIClcbiAgY29uc3QgbWVsdGFWYWx1ZSA9IHNlbGVjdGVkQXR0YWNrV2VhcG9ucy5yZWR1Y2UoXG4gICAgKG1heGltdW1WYWx1ZSwgd2VhcG9uKSA9PiBNYXRoLm1heChtYXhpbXVtVmFsdWUsIGdldFdlYXBvbktleXdvcmRWYWx1ZSh3ZWFwb24sICdNZWx0YScpKSxcbiAgICAwLFxuICApXG4gIGNvbnN0IGF0dGFja2VyRGV0YWNobWVudFRvb2x0aXAgPSBmb3JtYXREZXRhY2htZW50VG9vbHRpcChzZWxlY3RlZEF0dGFja2VyRGV0YWNobWVudClcbiAgY29uc3QgZGVmZW5kZXJEZXRhY2htZW50VG9vbHRpcCA9IGZvcm1hdERldGFjaG1lbnRUb29sdGlwKHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50KVxuICBjb25zdCBhdHRhY2tlckVuaGFuY2VtZW50VG9vbHRpcCA9IGZvcm1hdEVuaGFuY2VtZW50VG9vbHRpcChzZWxlY3RlZEF0dGFja2VyRW5oYW5jZW1lbnQpXG4gIGNvbnN0IGRlZmVuZGVyRW5oYW5jZW1lbnRUb29sdGlwID0gZm9ybWF0RW5oYW5jZW1lbnRUb29sdGlwKHNlbGVjdGVkRGVmZW5kZXJFbmhhbmNlbWVudClcbiAgY29uc3QgZmlyZURpc2NpcGxpbmVUb29sdGlwID0gZm9ybWF0U3RyYXRhZ2VtVG9vbHRpcChmaXJlRGlzY2lwbGluZUVudHJ5KVxuICBjb25zdCBtYXJrZWRGb3JEZXN0cnVjdGlvblRvb2x0aXAgPSBmb3JtYXRTdHJhdGFnZW1Ub29sdGlwKG1hcmtlZEZvckRlc3RydWN0aW9uRW50cnkpXG4gIGNvbnN0IHVuZm9yZ2l2ZW5GdXJ5VG9vbHRpcCA9IGZvcm1hdFN0cmF0YWdlbVRvb2x0aXAodW5mb3JnaXZlbkZ1cnlFbnRyeSlcbiAgY29uc3QgYXJtb3VyT2ZDb250ZW1wdFRvb2x0aXAgPSBmb3JtYXRTdHJhdGFnZW1Ub29sdGlwKGFybW91ck9mQ29udGVtcHRFbnRyeSlcbiAgY29uc3Qgb3ZlcndoZWxtaW5nT25zbGF1Z2h0VG9vbHRpcCA9IGZvcm1hdFN0cmF0YWdlbVRvb2x0aXAob3ZlcndoZWxtaW5nT25zbGF1Z2h0RW50cnkpXG4gIGNvbnN0IHVuYnJlYWthYmxlTGluZXNUb29sdGlwID0gZm9ybWF0U3RyYXRhZ2VtVG9vbHRpcCh1bmJyZWFrYWJsZUxpbmVzRW50cnkpXG4gIGNvbnN0IG9hdGhUb29sdGlwID0gYnVpbGRUb29sdGlwKFxuICAgIE9BVEhfT0ZfTU9NRU5UX1JVTEVfVEVYVCxcbiAgICB1bml0R2V0c09hdGhXb3VuZEJvbnVzKGF0dGFja2VyVW5pdERldGFpbHMpXG4gICAgICA/IE9BVEhfT0ZfTU9NRU5UX0NPREVYX1JJREVSX1RFWFRcbiAgICAgIDogJycsXG4gICAgb2F0aEFiaWxpdHk/LnJ1bGVzX3RleHQgJiYgb2F0aEFiaWxpdHkucnVsZXNfdGV4dCAhPT0gJ09hdGggb2YgTW9tZW50J1xuICAgICAgPyBgRGF0YXNoZWV0IGVudHJ5OiAke29hdGhBYmlsaXR5LnJ1bGVzX3RleHR9YFxuICAgICAgOiAnJyxcbiAgKVxuICBjb25zdCBoYWxmUmFuZ2VUb29sdGlwID0gYnVpbGRUb29sdGlwKFxuICAgIHJhcGlkRmlyZVZhbHVlID4gMFxuICAgICAgPyBgUmFwaWQgRmlyZSAke3JhcGlkRmlyZVZhbHVlfTogaWYgdGhlIHRhcmdldCBpcyBpbiBoYWxmIHJhbmdlLCB0aGlzIHdlYXBvbiBnYWlucyAke3JhcGlkRmlyZVZhbHVlfSBhZGRpdGlvbmFsIGF0dGFjayR7cmFwaWRGaXJlVmFsdWUgPT09IDEgPyAnJyA6ICdzJ30uYFxuICAgICAgOiAnJyxcbiAgICBtZWx0YVZhbHVlID4gMFxuICAgICAgPyBgTWVsdGEgJHttZWx0YVZhbHVlfTogaWYgdGhlIHRhcmdldCBpcyBpbiBoYWxmIHJhbmdlLCBlYWNoIHVuc2F2ZWQgYXR0YWNrIGdldHMgKyR7bWVsdGFWYWx1ZX0gZGFtYWdlLmBcbiAgICAgIDogJycsXG4gIClcbiAgY29uc3QgY292ZXJUb29sdGlwID0gJ0JlbmVmaXQgb2YgQ292ZXIgaW1wcm92ZXMgdGhlIGFybW9yIHNhdmUgYnkgMSBhZ2FpbnN0IHJhbmdlZCBhdHRhY2tzLiBJdCBkb2VzIG5vdCBpbXByb3ZlIGludnVsbmVyYWJsZSBzYXZlcyBhbmQgZG9lcyBub3QgaGVscCBhIDMrIG9yIGJldHRlciBzYXZlIGFnYWluc3QgQVAgMC4nXG4gIGNvbnN0IGVuZ2FnZW1lbnRUb29sdGlwID0gd2VhcG9uSGFzUmF3S2V5d29yZChzZWxlY3RlZFdlYXBvbiwgJ1Bpc3RvbCcpXG4gICAgPyAnUGlzdG9sOiB0aGlzIHJhbmdlZCBhdHRhY2sgY2FuIHN0aWxsIGJlIG1hZGUgd2hpbGUgdGhlIGF0dGFja2VyIGlzIGluIEVuZ2FnZW1lbnQgUmFuZ2UsIGJ1dCBpdCBtdXN0IHRhcmdldCBhbiBlbmVteSB1bml0IHdpdGhpbiBFbmdhZ2VtZW50IFJhbmdlLidcbiAgICA6ICdOb24tUGlzdG9sIHJhbmdlZCB3ZWFwb25zIGFyZSB1c3VhbGx5IG5vdCBhbGxvd2VkIHdoaWxlIHRoZSBhdHRhY2tlciBpcyBpbiBFbmdhZ2VtZW50IFJhbmdlIHVubGVzcyB0aGUgYXR0YWNrZXIgaXMgYSBNb25zdGVyIG9yIFZlaGljbGUuJ1xuICBjb25zdCBoZWF2eVRvb2x0aXAgPSAnSGVhdnk6IGlmIHRoZSB1bml0IHJlbWFpbmVkIFN0YXRpb25hcnksIGFkZCAxIHRvIHRoZSBIaXQgcm9sbCBmb3IgdGhpcyBhdHRhY2suJ1xuICBjb25zdCBibGFzdFRvb2x0aXAgPSAnQmxhc3Q6IHRoaXMgd2VhcG9uIGNhbm5vdCB0YXJnZXQgYSB1bml0IHRoYXQgaXMgd2l0aGluIEVuZ2FnZW1lbnQgUmFuZ2Ugb2YgYWxsaWVkIHVuaXRzLidcblxuICBmdW5jdGlvbiByZW5kZXJMb2Fkb3V0U2VsZWN0b3JzKHNpZGVMYWJlbCwgdW5pdERldGFpbHMsIGxvYWRvdXRTZWxlY3Rpb25zLCBzZXRMb2Fkb3V0U2VsZWN0aW9ucykge1xuICAgIGlmICghdW5pdERldGFpbHM/LmxvYWRvdXRfb3B0aW9ucz8ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImNsdXN0ZXIgdHdvLXVwXCI+XG4gICAgICAgIHt1bml0RGV0YWlscy5sb2Fkb3V0X29wdGlvbnMubWFwKChncm91cCkgPT4ge1xuICAgICAgICAgIGlmIChncm91cC5zZWxlY3Rpb25fdHlwZSA9PT0gJ2NvdW50Jykge1xuICAgICAgICAgICAgY29uc3QgbWF4aW11bVRvdGFsID0gZ2V0TG9hZG91dEdyb3VwTWF4VG90YWwodW5pdERldGFpbHMsIGdyb3VwKVxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRTZWxlY3Rpb25zID0gZ2V0UmVzb2x2ZWRMb2Fkb3V0U2VsZWN0aW9ucyh1bml0RGV0YWlscywgbG9hZG91dFNlbGVjdGlvbnMpXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50R3JvdXBTZWxlY3Rpb24gPSByZXNvbHZlZFNlbGVjdGlvbnNbZ3JvdXAuaWRdICYmIHR5cGVvZiByZXNvbHZlZFNlbGVjdGlvbnNbZ3JvdXAuaWRdID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgICA/IHJlc29sdmVkU2VsZWN0aW9uc1tncm91cC5pZF1cbiAgICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRvdGFsID0gT2JqZWN0LnZhbHVlcyhjdXJyZW50R3JvdXBTZWxlY3Rpb24pLnJlZHVjZShcbiAgICAgICAgICAgICAgKHN1bSwgdmFsdWUpID0+IHN1bSArIChOdW1iZXIodmFsdWUpIHx8IDApLFxuICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17YCR7c2lkZUxhYmVsfS0ke2dyb3VwLmlkfWB9PlxuICAgICAgICAgICAgICAgIDxzcGFuPntgJHtzaWRlTGFiZWx9ICR7Z3JvdXAubGFiZWx9YH08L3NwYW4+XG4gICAgICAgICAgICAgICAgeyhncm91cC5vcHRpb25zIHx8IFtdKS5tYXAoKG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbWF4aW11bUNvdW50ID0gZ2V0TG9hZG91dE9wdGlvbk1heENvdW50KHVuaXREZXRhaWxzLCBncm91cCwgb3B0aW9uKVxuICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gTnVtYmVyKGdldExvYWRvdXRDb3VudFNlbGVjdGlvblZhbHVlKHVuaXREZXRhaWxzLCBsb2Fkb3V0U2VsZWN0aW9ucywgZ3JvdXAsIG9wdGlvbi5pZCkpIHx8IDBcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ0FsbG93YW5jZSA9IE1hdGgubWF4KDAsIG1heGltdW1Ub3RhbCAtIChjdXJyZW50VG90YWwgLSBjdXJyZW50VmFsdWUpKVxuICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRNYXhpbXVtID0gTWF0aC5taW4obWF4aW11bUNvdW50LCByZW1haW5pbmdBbGxvd2FuY2UpXG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBrZXk9e2Ake3NpZGVMYWJlbH0tJHtncm91cC5pZH0tJHtvcHRpb24uaWR9YH0+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4+e2Zvcm1hdExvYWRvdXRPcHRpb25MYWJlbChvcHRpb24pfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgbWluPVwiMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXg9e1N0cmluZyhpbnB1dE1heGltdW0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e1N0cmluZyhjdXJyZW50VmFsdWUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0VmFsdWUgPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRNYXhpbXVtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNldExvYWRvdXRTZWxlY3Rpb25zKChjdXJyZW50U2VsZWN0aW9ucykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nR3JvdXBTZWxlY3Rpb24gPSBjdXJyZW50U2VsZWN0aW9uc1tncm91cC5pZF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIHR5cGVvZiBjdXJyZW50U2VsZWN0aW9uc1tncm91cC5pZF0gPT09ICdvYmplY3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGN1cnJlbnRTZWxlY3Rpb25zW2dyb3VwLmlkXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBjdXJyZW50R3JvdXBTZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0R3JvdXBTZWxlY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5leGlzdGluZ0dyb3VwU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW29wdGlvbi5pZF06IG5leHRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRWYWx1ZSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbmV4dEdyb3VwU2VsZWN0aW9uW29wdGlvbi5pZF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnRTZWxlY3Rpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2dyb3VwLmlkXTogbmV4dEdyb3VwU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxsYWJlbCBrZXk9e2Ake3NpZGVMYWJlbH0tJHtncm91cC5pZH1gfT5cbiAgICAgICAgICAgICAgPHNwYW4+e2Ake3NpZGVMYWJlbH0gJHtncm91cC5sYWJlbH1gfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNlbGVjdFxuICAgICAgICAgICAgICAgIHZhbHVlPXtnZXRMb2Fkb3V0U2VsZWN0aW9uVmFsdWUodW5pdERldGFpbHMsIGxvYWRvdXRTZWxlY3Rpb25zLCBncm91cCl9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dE9wdGlvbklkID0gZXZlbnQudGFyZ2V0LnZhbHVlXG4gICAgICAgICAgICAgICAgICBzZXRMb2Fkb3V0U2VsZWN0aW9ucygoY3VycmVudFNlbGVjdGlvbnMpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnRTZWxlY3Rpb25zLFxuICAgICAgICAgICAgICAgICAgICBbZ3JvdXAuaWRdOiBuZXh0T3B0aW9uSWQsXG4gICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgeyhncm91cC5vcHRpb25zIHx8IFtdKS5tYXAoKG9wdGlvbikgPT4gKFxuICAgICAgICAgICAgICAgICAgPG9wdGlvblxuICAgICAgICAgICAgICAgICAgICBrZXk9e29wdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e29wdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Zvcm1hdExvYWRvdXRPcHRpb25MYWJlbChvcHRpb24pfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7Zm9ybWF0TG9hZG91dE9wdGlvbkxhYmVsKG9wdGlvbil9XG4gICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgIClcbiAgICAgICAgfSl9XG4gICAgICA8L2Rpdj5cbiAgICApXG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJNb2RlbENvdW50U2VsZWN0b3Ioc2lkZUxhYmVsLCB1bml0RGV0YWlscywgbW9kZWxDb3VudCwgc2V0TW9kZWxDb3VudCkge1xuICAgIGNvbnN0IG1pbmltdW1Nb2RlbHMgPSBOdW1iZXIodW5pdERldGFpbHM/LnVuaXRfY29tcG9zaXRpb24/Lm1pbl9tb2RlbHMgPz8gMSlcbiAgICBjb25zdCBtYXhpbXVtTW9kZWxzID0gTnVtYmVyKHVuaXREZXRhaWxzPy51bml0X2NvbXBvc2l0aW9uPy5tYXhfbW9kZWxzID8/IG1pbmltdW1Nb2RlbHMpXG4gICAgaWYgKCF1bml0RGV0YWlscyB8fCBtYXhpbXVtTW9kZWxzIDw9IG1pbmltdW1Nb2RlbHMpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IEFycmF5LmZyb20oXG4gICAgICB7IGxlbmd0aDogKG1heGltdW1Nb2RlbHMgLSBtaW5pbXVtTW9kZWxzKSArIDEgfSxcbiAgICAgIChfLCBpbmRleCkgPT4gU3RyaW5nKG1pbmltdW1Nb2RlbHMgKyBpbmRleCksXG4gICAgKVxuXG4gICAgcmV0dXJuIChcbiAgICAgIDxsYWJlbD5cbiAgICAgICAgPHNwYW4+e2Ake3NpZGVMYWJlbH0gU3F1YWQgU2l6ZWB9PC9zcGFuPlxuICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgdmFsdWU9e2dldFVuaXRNb2RlbENvdW50VmFsdWUodW5pdERldGFpbHMsIG1vZGVsQ291bnQpfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldE1vZGVsQ291bnQoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgPlxuICAgICAgICAgIHtvcHRpb25zLm1hcCgob3B0aW9uKSA9PiAoXG4gICAgICAgICAgICA8b3B0aW9uIGtleT17YCR7c2lkZUxhYmVsfS0ke29wdGlvbn1gfSB2YWx1ZT17b3B0aW9ufT5cbiAgICAgICAgICAgICAge29wdGlvbn0gbW9kZWxzXG4gICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICA8L2xhYmVsPlxuICAgIClcbiAgfVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgYXR0YWNoZWRDaGFyYWN0ZXJTdGlsbFZhbGlkID0gYXR0YWNoZWRDaGFyYWN0ZXJPcHRpb25zLnNvbWUoKHVuaXQpID0+IHVuaXQubmFtZSA9PT0gYXR0YWNoZWRDaGFyYWN0ZXJOYW1lKVxuICAgIGlmIChjYW5Vc2VQcmVjaXNpb24gJiYgKCFhdHRhY2hlZENoYXJhY3Rlck5hbWUgfHwgYXR0YWNoZWRDaGFyYWN0ZXJTdGlsbFZhbGlkKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChhdHRhY2hlZENoYXJhY3Rlck5hbWUgJiYgKCFjYW5Vc2VQcmVjaXNpb24gfHwgIWF0dGFjaGVkQ2hhcmFjdGVyU3RpbGxWYWxpZCkpIHtcbiAgICAgIHNldEF0dGFjaGVkQ2hhcmFjdGVyTmFtZSgnJylcbiAgICB9XG4gICAgaWYgKGF0dGFjaGVkQ2hhcmFjdGVyVW5pdERldGFpbHMpIHtcbiAgICAgIHNldEF0dGFjaGVkQ2hhcmFjdGVyVW5pdERldGFpbHMobnVsbClcbiAgICB9XG4gICAgaWYgKE9iamVjdC5rZXlzKGF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMpLmxlbmd0aCkge1xuICAgICAgc2V0QXR0YWNoZWRDaGFyYWN0ZXJMb2Fkb3V0U2VsZWN0aW9ucyh7fSlcbiAgICB9XG4gICAgaWYgKGF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCAhPT0gJycpIHtcbiAgICAgIHNldEF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCgnJylcbiAgICB9XG4gIH0sIFtcbiAgICBhdHRhY2hlZENoYXJhY3RlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgIGF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCxcbiAgICBhdHRhY2hlZENoYXJhY3Rlck5hbWUsXG4gICAgYXR0YWNoZWRDaGFyYWN0ZXJPcHRpb25zLFxuICAgIGF0dGFjaGVkQ2hhcmFjdGVyVW5pdERldGFpbHMsXG4gICAgY2FuVXNlUHJlY2lzaW9uLFxuICBdKVxuICBjb25zdCBpbmRpcmVjdFRvb2x0aXAgPSAnSW5kaXJlY3QgRmlyZTogaWYgbm8gZGVmZW5kZXIgbW9kZWxzIGFyZSB2aXNpYmxlLCB0aGUgYXR0YWNrIHRha2VzIC0xIHRvIEhpdCwgaGl0IHJvbGxzIG9mIDEtMyBhbHdheXMgZmFpbCwgYW5kIHRoZSBkZWZlbmRlciBnZXRzIHRoZSBiZW5lZml0IG9mIGNvdmVyLidcbiAgY29uc3QgbGFuY2VUb29sdGlwID0gJ0xhbmNlOiBpZiB0aGUgYmVhcmVyIG1hZGUgYSBjaGFyZ2UgbW92ZSB0aGlzIHR1cm4sIGFkZCAxIHRvIHRoZSBXb3VuZCByb2xsIGZvciB0aGlzIGF0dGFjay4nXG4gIGNvbnN0IGF0dGFja2VyQXJteUJhdHRsZXNob2NrVG9vbHRpcCA9ICdVbmZvcmdpdmVuIEZ1cnk6IGlmIG9uZSBvciBtb3JlIEFkZXB0dXMgQXN0YXJ0ZXMgdW5pdHMgZnJvbSB5b3VyIGFybXkgYXJlIEJhdHRsZS1zaG9ja2VkLCBzdWNjZXNzZnVsIHVubW9kaWZpZWQgSGl0IHJvbGxzIG9mIDUrIHNjb3JlIGEgQ3JpdGljYWwgSGl0IHVudGlsIHRoZSBlbmQgb2YgdGhlIHBoYXNlLidcbiAgY29uc3QgYXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGhUb29sdGlwID0gYXR0YWNrZXJFbmhhbmNlbWVudFRvb2x0aXBcbiAgY29uc3QgYXR0YWNrZXJCYXR0bGVzaG9ja2VkVG9vbHRpcCA9IGJ1aWxkVG9vbHRpcChcbiAgICBhdHRhY2tlckVuaGFuY2VtZW50TmFtZSA9PT0gJ1dlYXBvbnMgb2YgdGhlIEZpcnN0IExlZ2lvbidcbiAgICAgID8gJ1dlYXBvbnMgb2YgdGhlIEZpcnN0IExlZ2lvbiBpbXByb3ZlcyBmdXJ0aGVyIHdoaWxlIHRoZSBiZWFyZXIgaXMgQmF0dGxlLXNob2NrZWQuJ1xuICAgICAgOiAnJyxcbiAgICBhdHRhY2tlckVuaGFuY2VtZW50TmFtZSA9PT0gJ1Blbm5hbnQgb2YgUmVtZW1icmFuY2UnXG4gICAgICA/ICdQZW5uYW50IG9mIFJlbWVtYnJhbmNlIGltcHJvdmVzIEZlZWwgTm8gUGFpbiB3aGlsZSB0aGUgYmVhcmVyIGlzIEJhdHRsZS1zaG9ja2VkLidcbiAgICAgIDogJycsXG4gICAgYXR0YWNrZXJFbmhhbmNlbWVudE5hbWUgPT09ICdTdHViYm9ybiBUZW5hY2l0eSdcbiAgICAgID8gJ1N0dWJib3JuIFRlbmFjaXR5IGNhbiBhZGQgYW4gYWRkaXRpb25hbCArMSB0byBXb3VuZCB3aGlsZSB0aGUgYmVhcmVyIGlzIEJhdHRsZS1zaG9ja2VkIGFuZCBiZWxvdyBTdGFydGluZyBTdHJlbmd0aC4nXG4gICAgICA6ICcnLFxuICApXG4gIGNvbnN0IGRlZmVuZGVyQmF0dGxlc2hvY2tlZFRvb2x0aXAgPSBkZWZlbmRlckVuaGFuY2VtZW50VG9vbHRpcFxuICBjb25zdCBhdHRhY2hlZENoYXJhY3RlclRvb2x0aXAgPSAnUHJlY2lzaW9uOiBzdWNjZXNzZnVsIHdvdW5kcyBmcm9tIHRoaXMgYXR0YWNrIGNhbiBiZSBhbGxvY2F0ZWQgdG8gdGhlIGF0dGFjaGVkIENoYXJhY3RlciBmaXJzdC4nXG4gIGNvbnN0IGhhemFyZG91c092ZXJ3YXRjaFRvb2x0aXAgPSAnSWYgdGhpcyBIYXphcmRvdXMgd2VhcG9uIHdhcyB1c2VkIGZvciBGaXJlIE92ZXJ3YXRjaCBpbiB0aGUgb3Bwb25lbnQgY2hhcmdlIHBoYXNlLCB0aGUgc2VsZi1pbmZsaWN0ZWQgbW9ydGFsIHdvdW5kcyBhcmUgYWxsb2NhdGVkIGFmdGVyIHRoZSBjaGFyZ2luZyB1bml0IGVuZHMgaXRzIGNoYXJnZSBtb3ZlLidcbiAgY29uc3QgaGF6YXJkb3VzQmVhcmVyVG9vbHRpcCA9ICdTZXQgdGhlIGN1cnJlbnQgd291bmRzIG9uIHRoZSBIYXphcmRvdXMgYmVhcmVyIHNvIHNlbGYtZGFtYWdlIGlzIGFsbG9jYXRlZCBhZ2FpbnN0IHRoZSBjb3JyZWN0IG1vZGVsIHN0YXRlLidcbiAgY29uc3QgYXR0YWNrZXJBY3RpdmVSdWxlcyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gYnVpbGRBdHRhY2tlckFjdGl2ZVJ1bGVzKHtcbiAgICAgIGF0dGFja2VyVW5pdERldGFpbHMsXG4gICAgICBzZWxlY3RlZFdlYXBvbixcbiAgICAgIG9hdGhPZk1vbWVudEFjdGl2ZSxcbiAgICAgIGF0dGFja2VyRGV0YWNobWVudDogc2VsZWN0ZWRBdHRhY2tlckRldGFjaG1lbnQsXG4gICAgICBhdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlLFxuICAgICAgYXR0YWNrZXJGaXJlRGlzY2lwbGluZUFjdGl2ZSxcbiAgICAgIGF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBY3RpdmUsXG4gICAgICBhdHRhY2tlclN0dWJib3JuVGVuYWNpdHlBY3RpdmUsXG4gICAgICBhdHRhY2tlcldlYXBvbnNPZlRoZUZpcnN0TGVnaW9uQWN0aXZlLFxuICAgICAgYXR0YWNrZXJQZW5uYW50T2ZSZW1lbWJyYW5jZUFjdGl2ZSxcbiAgICAgIGF0dGFja2VyQmVsb3dTdGFydGluZ1N0cmVuZ3RoLFxuICAgICAgaW5IYWxmUmFuZ2UsXG4gICAgICByZW1haW5lZFN0YXRpb25hcnksXG4gICAgICBjaGFyZ2VkVGhpc1R1cm4sXG4gICAgICBpbmRpcmVjdFRhcmdldFZpc2libGUsXG4gICAgICBhdHRhY2tlckluRW5nYWdlbWVudFJhbmdlLFxuICAgICAgaGFzSGF6YXJkb3VzLFxuICAgIH0pLFxuICAgIFtcbiAgICAgIGF0dGFja2VyVW5pdERldGFpbHMsXG4gICAgICBzZWxlY3RlZFdlYXBvbixcbiAgICAgIG9hdGhPZk1vbWVudEFjdGl2ZSxcbiAgICAgIHNlbGVjdGVkQXR0YWNrZXJEZXRhY2htZW50LFxuICAgICAgYXR0YWNrZXJNYXJrZWRGb3JEZXN0cnVjdGlvbkFjdGl2ZSxcbiAgICAgIGF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUsXG4gICAgICBhdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QWN0aXZlLFxuICAgICAgYXR0YWNrZXJTdHViYm9yblRlbmFjaXR5QWN0aXZlLFxuICAgICAgYXR0YWNrZXJXZWFwb25zT2ZUaGVGaXJzdExlZ2lvbkFjdGl2ZSxcbiAgICAgIGF0dGFja2VyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUsXG4gICAgICBhdHRhY2tlckJlbG93U3RhcnRpbmdTdHJlbmd0aCxcbiAgICAgIGluSGFsZlJhbmdlLFxuICAgICAgcmVtYWluZWRTdGF0aW9uYXJ5LFxuICAgICAgY2hhcmdlZFRoaXNUdXJuLFxuICAgICAgaW5kaXJlY3RUYXJnZXRWaXNpYmxlLFxuICAgICAgYXR0YWNrZXJJbkVuZ2FnZW1lbnRSYW5nZSxcbiAgICAgIGhhc0hhemFyZG91cyxcbiAgICBdLFxuICApXG4gIGNvbnN0IGRlZmVuZGVyQWN0aXZlUnVsZXMgPSB1c2VNZW1vKFxuICAgICgpID0+IGJ1aWxkRGVmZW5kZXJBY3RpdmVSdWxlcyh7XG4gICAgICBkZWZlbmRlclVuaXREZXRhaWxzLFxuICAgICAgc2VsZWN0ZWRXZWFwb24sXG4gICAgICBkZWZlbmRlckRldGFjaG1lbnQ6IHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50LFxuICAgICAgZGVmZW5kZXJBcm1vdXJPZkNvbnRlbXB0QWN0aXZlLFxuICAgICAgZGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHRBY3RpdmUsXG4gICAgICBkZWZlbmRlclVuYnJlYWthYmxlTGluZXNBY3RpdmUsXG4gICAgICBkZWZlbmRlclBlbm5hbnRPZlJlbWVtYnJhbmNlQWN0aXZlLFxuICAgICAgdGFyZ2V0SGFzQ292ZXIsXG4gICAgICBpbmRpcmVjdFRhcmdldFZpc2libGUsXG4gICAgICBhdHRhY2tlckZpcmVEaXNjaXBsaW5lQWN0aXZlLFxuICAgIH0pLFxuICAgIFtcbiAgICAgIGRlZmVuZGVyVW5pdERldGFpbHMsXG4gICAgICBzZWxlY3RlZFdlYXBvbixcbiAgICAgIHNlbGVjdGVkRGVmZW5kZXJEZXRhY2htZW50LFxuICAgICAgZGVmZW5kZXJBcm1vdXJPZkNvbnRlbXB0QWN0aXZlLFxuICAgICAgZGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHRBY3RpdmUsXG4gICAgICBkZWZlbmRlclVuYnJlYWthYmxlTGluZXNBY3RpdmUsXG4gICAgICBkZWZlbmRlclBlbm5hbnRPZlJlbWVtYnJhbmNlQWN0aXZlLFxuICAgICAgdGFyZ2V0SGFzQ292ZXIsXG4gICAgICBpbmRpcmVjdFRhcmdldFZpc2libGUsXG4gICAgICBhdHRhY2tlckZpcmVEaXNjaXBsaW5lQWN0aXZlLFxuICAgIF0sXG4gIClcbiAgY29uc3Qgc3VtbWFyeVN0YXRzID0gdXNlTWVtbygoKSA9PiBidWlsZFJ1blN1bW1hcnkoc2ltdWxhdGlvblJ1bnMpLCBbc2ltdWxhdGlvblJ1bnNdKVxuICBjb25zdCBhY3RpdmVSdW4gPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoYWN0aXZlUnVuVmlldyA9PT0gJ3N1bW1hcnknKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgICByZXR1cm4gc2ltdWxhdGlvblJ1bnMuZmluZCgocnVuKSA9PiBydW4ucnVuSW5kZXggPT09IGFjdGl2ZVJ1blZpZXcpIHx8IG51bGxcbiAgfSwgW2FjdGl2ZVJ1blZpZXcsIHNpbXVsYXRpb25SdW5zXSlcbiAgY29uc3QgYmF0dGxlZmllbGRVbml0cyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IGF0dGFja2VyQmFzZU1tID0gZ2V0QmFzZURpYW1ldGVyTW0oYXR0YWNrZXJVbml0RGV0YWlscylcbiAgICBjb25zdCBkZWZlbmRlckJhc2VNbSA9IGdldEJhc2VEaWFtZXRlck1tKGRlZmVuZGVyVW5pdERldGFpbHMpXG5cbiAgICByZXR1cm4gW1xuICAgICAgYXR0YWNrZXJVbml0RGV0YWlscyA/IHtcbiAgICAgICAgaWQ6ICdhdHRhY2tlcicsXG4gICAgICAgIHJvbGU6ICdBdHRhY2tlcicsXG4gICAgICAgIG5hbWU6IGF0dGFja2VyVW5pdERldGFpbHMubmFtZSxcbiAgICAgICAgZmFjdGlvbjogYXR0YWNrZXJGYWN0aW9uLFxuICAgICAgICBiYXNlTW06IGF0dGFja2VyQmFzZU1tLFxuICAgICAgICBiYXNlSW5jaGVzOiBtbVRvSW5jaGVzKGF0dGFja2VyQmFzZU1tKSxcbiAgICAgICAgeDogMjAsXG4gICAgICAgIHk6IDUwLFxuICAgICAgfSA6IG51bGwsXG4gICAgICBkZWZlbmRlclVuaXREZXRhaWxzID8ge1xuICAgICAgICBpZDogJ2RlZmVuZGVyJyxcbiAgICAgICAgcm9sZTogJ0RlZmVuZGVyJyxcbiAgICAgICAgbmFtZTogZGVmZW5kZXJVbml0RGV0YWlscy5uYW1lLFxuICAgICAgICBmYWN0aW9uOiBkZWZlbmRlckZhY3Rpb24sXG4gICAgICAgIGJhc2VNbTogZGVmZW5kZXJCYXNlTW0sXG4gICAgICAgIGJhc2VJbmNoZXM6IG1tVG9JbmNoZXMoZGVmZW5kZXJCYXNlTW0pLFxuICAgICAgICB4OiA4MCxcbiAgICAgICAgeTogNTAsXG4gICAgICB9IDogbnVsbCxcbiAgICBdLmZpbHRlcihCb29sZWFuKVxuICB9LCBbYXR0YWNrZXJGYWN0aW9uLCBhdHRhY2tlclVuaXREZXRhaWxzLCBkZWZlbmRlckZhY3Rpb24sIGRlZmVuZGVyVW5pdERldGFpbHNdKVxuICBjb25zdCBiYXR0bGVmaWVsZFVuaXRNYXAgPSB1c2VNZW1vKFxuICAgICgpID0+IE9iamVjdC5mcm9tRW50cmllcyhiYXR0bGVmaWVsZFVuaXRzLm1hcCgodW5pdCkgPT4gW3VuaXQuaWQsIHVuaXRdKSksXG4gICAgW2JhdHRsZWZpZWxkVW5pdHNdLFxuICApXG4gIGNvbnN0IHNlbGVjdGVkQmF0dGxlZmllbGRVbml0ID0gYmF0dGxlZmllbGRVbml0TWFwW3NlbGVjdGVkQmF0dGxlZmllbGRVbml0SWRdIHx8IGJhdHRsZWZpZWxkVW5pdHNbMF0gfHwgbnVsbFxuICBjb25zdCBlbmVteUJhdHRsZWZpZWxkVW5pdCA9IHNlbGVjdGVkQmF0dGxlZmllbGRVbml0XG4gICAgPyBiYXR0bGVmaWVsZFVuaXRzLmZpbmQoKHVuaXQpID0+IHVuaXQuaWQgIT09IHNlbGVjdGVkQmF0dGxlZmllbGRVbml0LmlkKSB8fCBudWxsXG4gICAgOiBudWxsXG4gIGNvbnN0IGJhdHRsZWZpZWxkQ2VudGVyRGlzdGFuY2VJbmNoZXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIXNlbGVjdGVkQmF0dGxlZmllbGRVbml0IHx8ICFlbmVteUJhdHRsZWZpZWxkVW5pdCkge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3RlZFBvc2l0aW9uID0gYmF0dGxlZmllbGRQb3NpdGlvbnNbc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQuaWRdIHx8IHNlbGVjdGVkQmF0dGxlZmllbGRVbml0XG4gICAgY29uc3QgZW5lbXlQb3NpdGlvbiA9IGJhdHRsZWZpZWxkUG9zaXRpb25zW2VuZW15QmF0dGxlZmllbGRVbml0LmlkXSB8fCBlbmVteUJhdHRsZWZpZWxkVW5pdFxuICAgIGNvbnN0IGR4SW5jaGVzID0gTWF0aC5hYnMoZW5lbXlQb3NpdGlvbi54IC0gc2VsZWN0ZWRQb3NpdGlvbi54KSAqIEJBVFRMRUZJRUxEX1dJRFRIX0lOQ0hFUyAvIDEwMFxuICAgIGNvbnN0IGR5SW5jaGVzID0gTWF0aC5hYnMoZW5lbXlQb3NpdGlvbi55IC0gc2VsZWN0ZWRQb3NpdGlvbi55KSAqIEJBVFRMRUZJRUxEX0hFSUdIVF9JTkNIRVMgLyAxMDBcbiAgICByZXR1cm4gTWF0aC5oeXBvdChkeEluY2hlcywgZHlJbmNoZXMpXG4gIH0sIFtiYXR0bGVmaWVsZFBvc2l0aW9ucywgZW5lbXlCYXR0bGVmaWVsZFVuaXQsIHNlbGVjdGVkQmF0dGxlZmllbGRVbml0XSlcbiAgY29uc3QgYmF0dGxlZmllbGRFZGdlRGlzdGFuY2VJbmNoZXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoYmF0dGxlZmllbGRDZW50ZXJEaXN0YW5jZUluY2hlcyA9PT0gbnVsbCB8fCAhc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQgfHwgIWVuZW15QmF0dGxlZmllbGRVbml0KSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIGNvbnN0IHRvdGFsQmFzZVJhZGl1cyA9IChzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdC5iYXNlSW5jaGVzIC8gMikgKyAoZW5lbXlCYXR0bGVmaWVsZFVuaXQuYmFzZUluY2hlcyAvIDIpXG4gICAgcmV0dXJuIE1hdGgubWF4KDAsIGJhdHRsZWZpZWxkQ2VudGVyRGlzdGFuY2VJbmNoZXMgLSB0b3RhbEJhc2VSYWRpdXMpXG4gIH0sIFtiYXR0bGVmaWVsZENlbnRlckRpc3RhbmNlSW5jaGVzLCBlbmVteUJhdHRsZWZpZWxkVW5pdCwgc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXRdKVxuICBjb25zdCBzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdERldGFpbHMgPSBzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdD8uaWQgPT09ICdhdHRhY2tlcidcbiAgICA/IGF0dGFja2VyVW5pdERldGFpbHNcbiAgICA6IHNlbGVjdGVkQmF0dGxlZmllbGRVbml0Py5pZCA9PT0gJ2RlZmVuZGVyJ1xuICAgICAgPyBkZWZlbmRlclVuaXREZXRhaWxzXG4gICAgICA6IG51bGxcbiAgY29uc3QgYmF0dGxlZmllbGRJbkVuZ2FnZW1lbnRSYW5nZSA9IGJhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzICE9PSBudWxsICYmIGJhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzIDw9IDFcbiAgY29uc3Qgc2VsZWN0ZWRCYXR0bGVmaWVsZFdlYXBvblJhbmdlcyA9IHVzZU1lbW8oKCkgPT4gKFxuICAgIChzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdERldGFpbHM/LndlYXBvbnMgfHwgW10pXG4gICAgICAubWFwKCh3ZWFwb24pID0+IHtcbiAgICAgICAgY29uc3QgcmFuZ2VJbmNoZXMgPSBwYXJzZVdlYXBvblJhbmdlSW5jaGVzKHdlYXBvbi5yYW5nZSlcbiAgICAgICAgY29uc3QgaGFzSGFsZlJhbmdlUnVsZSA9IChcbiAgICAgICAgICBnZXRXZWFwb25LZXl3b3JkVmFsdWUod2VhcG9uLCAnUmFwaWQgRmlyZScpID4gMFxuICAgICAgICAgIHx8IGdldFdlYXBvbktleXdvcmRWYWx1ZSh3ZWFwb24sICdNZWx0YScpID4gMFxuICAgICAgICApXG4gICAgICAgIHJldHVybiByYW5nZUluY2hlcyA/IHtcbiAgICAgICAgICAuLi53ZWFwb24sXG4gICAgICAgICAgcmFuZ2VJbmNoZXMsXG4gICAgICAgICAgaGFzSGFsZlJhbmdlUnVsZSxcbiAgICAgICAgICBoYWxmUmFuZ2VJbmNoZXM6IHJhbmdlSW5jaGVzIC8gMixcbiAgICAgICAgICB0b3RhbERpYW1ldGVySW5jaGVzOiAocmFuZ2VJbmNoZXMgKiAyKSArIChzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdD8uYmFzZUluY2hlcyB8fCAwKSxcbiAgICAgICAgfSA6IG51bGxcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICksIFtzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdCwgc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXREZXRhaWxzXSlcbiAgY29uc3Qgc2VsZWN0ZWRCYXR0bGVmaWVsZE1lbGVlV2VhcG9ucyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gKHNlbGVjdGVkQmF0dGxlZmllbGRVbml0RGV0YWlscz8ud2VhcG9ucyB8fCBbXSkuZmlsdGVyKCh3ZWFwb24pID0+IHdlYXBvbi5yYW5nZSA9PT0gJ01lbGVlJyksXG4gICAgW3NlbGVjdGVkQmF0dGxlZmllbGRVbml0RGV0YWlsc10sXG4gIClcbiAgY29uc3Qgc2VsZWN0ZWRCYXR0bGVmaWVsZFBpc3RvbFdlYXBvbnMgPSB1c2VNZW1vKFxuICAgICgpID0+IChzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdERldGFpbHM/LndlYXBvbnMgfHwgW10pLmZpbHRlcihcbiAgICAgICh3ZWFwb24pID0+IHdlYXBvbi5yYW5nZSAhPT0gJ01lbGVlJyAmJiB3ZWFwb25IYXNSYXdLZXl3b3JkKHdlYXBvbiwgJ1Bpc3RvbCcpLFxuICAgICksXG4gICAgW3NlbGVjdGVkQmF0dGxlZmllbGRVbml0RGV0YWlsc10sXG4gIClcbiAgY29uc3QgaW5SYW5nZVdlYXBvbk5hbWVzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKGJhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzID09PSBudWxsIHx8IGJhdHRsZWZpZWxkSW5FbmdhZ2VtZW50UmFuZ2UpIHtcbiAgICAgIHJldHVybiBbXVxuICAgIH1cbiAgICByZXR1cm4gc2VsZWN0ZWRCYXR0bGVmaWVsZFdlYXBvblJhbmdlc1xuICAgICAgLmZpbHRlcigod2VhcG9uKSA9PiBiYXR0bGVmaWVsZEVkZ2VEaXN0YW5jZUluY2hlcyA8PSB3ZWFwb24ucmFuZ2VJbmNoZXMpXG4gICAgICAubWFwKCh3ZWFwb24pID0+IGZvcm1hdFdlYXBvbk5hbWUod2VhcG9uKSlcbiAgfSwgW2JhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzLCBiYXR0bGVmaWVsZEluRW5nYWdlbWVudFJhbmdlLCBzZWxlY3RlZEJhdHRsZWZpZWxkV2VhcG9uUmFuZ2VzXSlcbiAgY29uc3QgaGFsZlJhbmdlV2VhcG9uTmFtZXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoYmF0dGxlZmllbGRFZGdlRGlzdGFuY2VJbmNoZXMgPT09IG51bGwgfHwgYmF0dGxlZmllbGRJbkVuZ2FnZW1lbnRSYW5nZSkge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICAgIHJldHVybiBzZWxlY3RlZEJhdHRsZWZpZWxkV2VhcG9uUmFuZ2VzXG4gICAgICAuZmlsdGVyKCh3ZWFwb24pID0+IHdlYXBvbi5oYXNIYWxmUmFuZ2VSdWxlICYmIGJhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzIDw9IHdlYXBvbi5oYWxmUmFuZ2VJbmNoZXMpXG4gICAgICAubWFwKCh3ZWFwb24pID0+IGZvcm1hdFdlYXBvbk5hbWUod2VhcG9uKSlcbiAgfSwgW2JhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzLCBiYXR0bGVmaWVsZEluRW5nYWdlbWVudFJhbmdlLCBzZWxlY3RlZEJhdHRsZWZpZWxkV2VhcG9uUmFuZ2VzXSlcbiAgY29uc3Qgc2hvd0JhdHRsZWZpZWxkUmFuZ2VMaW5lID0gIWJhdHRsZWZpZWxkSW5FbmdhZ2VtZW50UmFuZ2UgJiYgaW5SYW5nZVdlYXBvbk5hbWVzLmxlbmd0aCA+IDAgJiYgc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQgJiYgZW5lbXlCYXR0bGVmaWVsZFVuaXRcbiAgY29uc3QgYmF0dGxlZmllbGRDb21iYXRPcHRpb25zID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKGJhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG5cbiAgICByZXR1cm4gYmF0dGxlZmllbGRVbml0cy5tYXAoKHVuaXQpID0+IHtcbiAgICAgIGNvbnN0IGF0dGFja2VyRGV0YWlscyA9IHVuaXQuaWQgPT09ICdhdHRhY2tlcicgPyBhdHRhY2tlclVuaXREZXRhaWxzIDogZGVmZW5kZXJVbml0RGV0YWlsc1xuICAgICAgY29uc3QgZGVmZW5kZXJEZXRhaWxzID0gdW5pdC5pZCA9PT0gJ2F0dGFja2VyJyA/IGRlZmVuZGVyVW5pdERldGFpbHMgOiBhdHRhY2tlclVuaXREZXRhaWxzXG4gICAgICBjb25zdCBkZWZlbmRlciA9IGJhdHRsZWZpZWxkVW5pdHMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgIT09IHVuaXQuaWQpXG4gICAgICBpZiAoIWF0dGFja2VyRGV0YWlscyB8fCAhZGVmZW5kZXJEZXRhaWxzIHx8ICFkZWZlbmRlcikge1xuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgfVxuXG4gICAgICBjb25zdCBjYW5GaXJlTm9uUGlzdG9sSW5FbmdhZ2VtZW50ID0gdW5pdEhhc0tleXdvcmQoYXR0YWNrZXJEZXRhaWxzLCAnTW9uc3RlcicpXG4gICAgICAgIHx8IHVuaXRIYXNLZXl3b3JkKGF0dGFja2VyRGV0YWlscywgJ1ZlaGljbGUnKVxuICAgICAgY29uc3QgZWxpZ2libGVXZWFwb25zID0gKGF0dGFja2VyRGV0YWlscy53ZWFwb25zIHx8IFtdKS5maWx0ZXIoKHdlYXBvbikgPT4ge1xuICAgICAgICBpZiAoYmF0dGxlZmllbGRJbkVuZ2FnZW1lbnRSYW5nZSkge1xuICAgICAgICAgIGlmICh3ZWFwb24ucmFuZ2UgPT09ICdNZWxlZScpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB3ZWFwb25IYXNSYXdLZXl3b3JkKHdlYXBvbiwgJ1Bpc3RvbCcpIHx8IGNhbkZpcmVOb25QaXN0b2xJbkVuZ2FnZW1lbnRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh3ZWFwb24ucmFuZ2UgPT09ICdNZWxlZScpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJhbmdlSW5jaGVzID0gcGFyc2VXZWFwb25SYW5nZUluY2hlcyh3ZWFwb24ucmFuZ2UpXG4gICAgICAgIHJldHVybiByYW5nZUluY2hlcyAhPT0gbnVsbCAmJiBiYXR0bGVmaWVsZEVkZ2VEaXN0YW5jZUluY2hlcyA8PSByYW5nZUluY2hlc1xuICAgICAgfSlcblxuICAgICAgaWYgKCFlbGlnaWJsZVdlYXBvbnMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkOiB1bml0LmlkLFxuICAgICAgICBhdHRhY2tlckZhY3Rpb246IHVuaXQuZmFjdGlvbixcbiAgICAgICAgYXR0YWNrZXJOYW1lOiB1bml0Lm5hbWUsXG4gICAgICAgIGF0dGFja2VyRGV0YWlscyxcbiAgICAgICAgZGVmZW5kZXJGYWN0aW9uOiBkZWZlbmRlci5mYWN0aW9uLFxuICAgICAgICBkZWZlbmRlck5hbWU6IGRlZmVuZGVyLm5hbWUsXG4gICAgICAgIGRlZmVuZGVyRGV0YWlscyxcbiAgICAgICAgZWxpZ2libGVXZWFwb25zLFxuICAgICAgfVxuICAgIH0pLmZpbHRlcihCb29sZWFuKVxuICB9LCBbXG4gICAgYXR0YWNrZXJVbml0RGV0YWlscyxcbiAgICBiYXR0bGVmaWVsZEVkZ2VEaXN0YW5jZUluY2hlcyxcbiAgICBiYXR0bGVmaWVsZEluRW5nYWdlbWVudFJhbmdlLFxuICAgIGJhdHRsZWZpZWxkVW5pdHMsXG4gICAgZGVmZW5kZXJVbml0RGV0YWlscyxcbiAgXSlcbiAgY29uc3Qgc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudCA9IGJhdHRsZWZpZWxkQ29tYmF0T3B0aW9ucy5maW5kKFxuICAgIChvcHRpb24pID0+IG9wdGlvbi5pZCA9PT0gYmF0dGxlZmllbGRDb21iYXRBdHRhY2tlcklkLFxuICApIHx8IGJhdHRsZWZpZWxkQ29tYmF0T3B0aW9uc1swXSB8fCBudWxsXG4gIGNvbnN0IGJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uT3B0aW9ucyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudD8uZWxpZ2libGVXZWFwb25zIHx8IFtdLFxuICAgIFtzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0YW50XSxcbiAgKVxuICBjb25zdCBzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uID0gYmF0dGxlZmllbGRDb21iYXRXZWFwb25PcHRpb25zLmZpbmQoXG4gICAgKHdlYXBvbikgPT4gd2VhcG9uLm5hbWUgPT09IGJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uTmFtZSxcbiAgKSB8fCBiYXR0bGVmaWVsZENvbWJhdFdlYXBvbk9wdGlvbnNbMF0gfHwgbnVsbFxuXG4gIGNvbnN0IHJlYWR5VG9TaW11bGF0ZSA9IGF0dGFja2VyRmFjdGlvbiAmJiBhdHRhY2tlclVuaXQgJiYgd2VhcG9uTmFtZSAmJiBkZWZlbmRlckZhY3Rpb24gJiYgZGVmZW5kZXJVbml0XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWNhblVzZUNvdmVyICYmIHRhcmdldEhhc0NvdmVyKSB7XG4gICAgICBzZXRUYXJnZXRIYXNDb3ZlcihmYWxzZSlcbiAgICB9XG4gIH0sIFtjYW5Vc2VDb3ZlciwgdGFyZ2V0SGFzQ292ZXJdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFjYW5Vc2VIYWxmUmFuZ2UgJiYgaW5IYWxmUmFuZ2UpIHtcbiAgICAgIHNldEluSGFsZlJhbmdlKGZhbHNlKVxuICAgIH1cbiAgfSwgW2NhblVzZUhhbGZSYW5nZSwgaW5IYWxmUmFuZ2VdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFoYXNPYXRoT2ZNb21lbnQgJiYgb2F0aE9mTW9tZW50QWN0aXZlKSB7XG4gICAgICBzZXRPYXRoT2ZNb21lbnRBY3RpdmUoZmFsc2UpXG4gICAgfVxuICB9LCBbaGFzT2F0aE9mTW9tZW50LCBvYXRoT2ZNb21lbnRBY3RpdmVdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFhdHRhY2tlckVuaGFuY2VtZW50T3B0aW9ucy5zb21lKChpdGVtKSA9PiBpdGVtLm5hbWUgPT09IGF0dGFja2VyRW5oYW5jZW1lbnROYW1lKSkge1xuICAgICAgc2V0QXR0YWNrZXJFbmhhbmNlbWVudE5hbWUoJycpXG4gICAgfVxuICB9LCBbYXR0YWNrZXJFbmhhbmNlbWVudE9wdGlvbnMsIGF0dGFja2VyRW5oYW5jZW1lbnROYW1lXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghZGVmZW5kZXJFbmhhbmNlbWVudE9wdGlvbnMuc29tZSgoaXRlbSkgPT4gaXRlbS5uYW1lID09PSBkZWZlbmRlckVuaGFuY2VtZW50TmFtZSkpIHtcbiAgICAgIHNldERlZmVuZGVyRW5oYW5jZW1lbnROYW1lKCcnKVxuICAgIH1cbiAgfSwgW2RlZmVuZGVyRW5oYW5jZW1lbnRPcHRpb25zLCBkZWZlbmRlckVuaGFuY2VtZW50TmFtZV0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWNhblVzZUF0dGFja2VyRmlyZURpc2NpcGxpbmUgJiYgYXR0YWNrZXJGaXJlRGlzY2lwbGluZUFjdGl2ZSkge1xuICAgICAgc2V0QXR0YWNrZXJGaXJlRGlzY2lwbGluZUFjdGl2ZShmYWxzZSlcbiAgICB9XG4gIH0sIFtjYW5Vc2VBdHRhY2tlckZpcmVEaXNjaXBsaW5lLCBhdHRhY2tlckZpcmVEaXNjaXBsaW5lQWN0aXZlXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghY2FuVXNlQXR0YWNrZXJNYXJrZWRGb3JEZXN0cnVjdGlvbiAmJiBhdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlKSB7XG4gICAgICBzZXRBdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlKGZhbHNlKVxuICAgIH1cbiAgfSwgW2NhblVzZUF0dGFja2VyTWFya2VkRm9yRGVzdHJ1Y3Rpb24sIGF0dGFja2VyTWFya2VkRm9yRGVzdHJ1Y3Rpb25BY3RpdmVdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFjYW5Vc2VBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5KSB7XG4gICAgICBpZiAoYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFjdGl2ZSkge1xuICAgICAgICBzZXRBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QWN0aXZlKGZhbHNlKVxuICAgICAgfVxuICAgICAgaWYgKGF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBcm15QmF0dGxlc2hvY2tlZCkge1xuICAgICAgICBzZXRBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QXJteUJhdHRsZXNob2NrZWQoZmFsc2UpXG4gICAgICB9XG4gICAgfVxuICB9LCBbY2FuVXNlQXR0YWNrZXJVbmZvcmdpdmVuRnVyeSwgYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFjdGl2ZSwgYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFybXlCYXR0bGVzaG9ja2VkXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghY2FuVXNlRGVmZW5kZXJBcm1vdXJPZkNvbnRlbXB0ICYmIGRlZmVuZGVyQXJtb3VyT2ZDb250ZW1wdEFjdGl2ZSkge1xuICAgICAgc2V0RGVmZW5kZXJBcm1vdXJPZkNvbnRlbXB0QWN0aXZlKGZhbHNlKVxuICAgIH1cbiAgfSwgW2NhblVzZURlZmVuZGVyQXJtb3VyT2ZDb250ZW1wdCwgZGVmZW5kZXJBcm1vdXJPZkNvbnRlbXB0QWN0aXZlXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghY2FuVXNlRGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHQgJiYgZGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHRBY3RpdmUpIHtcbiAgICAgIHNldERlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0QWN0aXZlKGZhbHNlKVxuICAgIH1cbiAgfSwgW2NhblVzZURlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0LCBkZWZlbmRlck92ZXJ3aGVsbWluZ09uc2xhdWdodEFjdGl2ZV0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWNhblVzZURlZmVuZGVyVW5icmVha2FibGVMaW5lcyAmJiBkZWZlbmRlclVuYnJlYWthYmxlTGluZXNBY3RpdmUpIHtcbiAgICAgIHNldERlZmVuZGVyVW5icmVha2FibGVMaW5lc0FjdGl2ZShmYWxzZSlcbiAgICB9XG4gIH0sIFtjYW5Vc2VEZWZlbmRlclVuYnJlYWthYmxlTGluZXMsIGRlZmVuZGVyVW5icmVha2FibGVMaW5lc0FjdGl2ZV0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBhY3RpdmUgPSBhdHRhY2tlckVuaGFuY2VtZW50TmFtZSA9PT0gJ1N0dWJib3JuIFRlbmFjaXR5J1xuICAgIHNldEF0dGFja2VyU3R1YmJvcm5UZW5hY2l0eUFjdGl2ZShhY3RpdmUpXG4gICAgaWYgKCFhY3RpdmUgJiYgYXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGgpIHtcbiAgICAgIHNldEF0dGFja2VyQmVsb3dTdGFydGluZ1N0cmVuZ3RoKGZhbHNlKVxuICAgIH1cbiAgfSwgW2F0dGFja2VyRW5oYW5jZW1lbnROYW1lLCBhdHRhY2tlckJlbG93U3RhcnRpbmdTdHJlbmd0aF0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBhY3RpdmUgPSBhdHRhY2tlckVuaGFuY2VtZW50TmFtZSA9PT0gJ1dlYXBvbnMgb2YgdGhlIEZpcnN0IExlZ2lvbidcbiAgICBzZXRBdHRhY2tlcldlYXBvbnNPZlRoZUZpcnN0TGVnaW9uQWN0aXZlKGFjdGl2ZSlcbiAgfSwgW2F0dGFja2VyRW5oYW5jZW1lbnROYW1lXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGFjdGl2ZSA9IGF0dGFja2VyRW5oYW5jZW1lbnROYW1lID09PSAnUGVubmFudCBvZiBSZW1lbWJyYW5jZSdcbiAgICBzZXRBdHRhY2tlclBlbm5hbnRPZlJlbWVtYnJhbmNlQWN0aXZlKGFjdGl2ZSlcbiAgfSwgW2F0dGFja2VyRW5oYW5jZW1lbnROYW1lXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGFjdGl2ZSA9IGRlZmVuZGVyRW5oYW5jZW1lbnROYW1lID09PSAnUGVubmFudCBvZiBSZW1lbWJyYW5jZSdcbiAgICBzZXREZWZlbmRlclBlbm5hbnRPZlJlbWVtYnJhbmNlQWN0aXZlKGFjdGl2ZSlcbiAgICBpZiAoIWFjdGl2ZSAmJiBkZWZlbmRlckJhdHRsZXNob2NrZWQpIHtcbiAgICAgIHNldERlZmVuZGVyQmF0dGxlc2hvY2tlZChmYWxzZSlcbiAgICB9XG4gIH0sIFtkZWZlbmRlckVuaGFuY2VtZW50TmFtZSwgZGVmZW5kZXJCYXR0bGVzaG9ja2VkXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNldFNpbXVsYXRpb25SdW5zKFtdKVxuICAgIHNldEFjdGl2ZVJ1blZpZXcoJ3N1bW1hcnknKVxuICB9LCBbXG4gICAgYXR0YWNrZXJGYWN0aW9uLFxuICAgIGF0dGFja2VyVW5pdCxcbiAgICByZXNvbHZlZEF0dGFja2VyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgYXR0YWNrZXJNb2RlbENvdW50LFxuICAgIHdlYXBvbk5hbWUsXG4gICAgZGVmZW5kZXJGYWN0aW9uLFxuICAgIGRlZmVuZGVyVW5pdCxcbiAgICByZXNvbHZlZERlZmVuZGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgZGVmZW5kZXJNb2RlbENvdW50LFxuICAgIGF0dGFjaGVkQ2hhcmFjdGVyTmFtZSxcbiAgICByZXNvbHZlZEF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgYXR0YWNoZWRDaGFyYWN0ZXJNb2RlbENvdW50LFxuICAgIGF0dGFja2VyRGV0YWNobWVudE5hbWUsXG4gICAgZGVmZW5kZXJEZXRhY2htZW50TmFtZSxcbiAgXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNldEJhdHRsZWZpZWxkUG9zaXRpb25zKHtcbiAgICAgIGF0dGFja2VyOiB7IHg6IDIwLCB5OiA1MCB9LFxuICAgICAgZGVmZW5kZXI6IHsgeDogODAsIHk6IDUwIH0sXG4gICAgfSlcbiAgfSwgW2F0dGFja2VyVW5pdERldGFpbHM/Lm5hbWUsIGRlZmVuZGVyVW5pdERldGFpbHM/Lm5hbWVdKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFiYXR0bGVmaWVsZFVuaXRNYXBbc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXRJZF0pIHtcbiAgICAgIHNldFNlbGVjdGVkQmF0dGxlZmllbGRVbml0SWQoYmF0dGxlZmllbGRVbml0c1swXT8uaWQgfHwgJycpXG4gICAgfVxuICB9LCBbYmF0dGxlZmllbGRVbml0TWFwLCBiYXR0bGVmaWVsZFVuaXRzLCBzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdElkXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYmF0dGxlZmllbGRDb21iYXRPcHRpb25zLnNvbWUoKG9wdGlvbikgPT4gb3B0aW9uLmlkID09PSBiYXR0bGVmaWVsZENvbWJhdEF0dGFja2VySWQpKSB7XG4gICAgICBzZXRCYXR0bGVmaWVsZENvbWJhdEF0dGFja2VySWQoYmF0dGxlZmllbGRDb21iYXRPcHRpb25zWzBdPy5pZCB8fCAnJylcbiAgICB9XG4gIH0sIFtiYXR0bGVmaWVsZENvbWJhdEF0dGFja2VySWQsIGJhdHRsZWZpZWxkQ29tYmF0T3B0aW9uc10pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uT3B0aW9ucy5zb21lKCh3ZWFwb24pID0+IHdlYXBvbi5uYW1lID09PSBiYXR0bGVmaWVsZENvbWJhdFdlYXBvbk5hbWUpKSB7XG4gICAgICBzZXRCYXR0bGVmaWVsZENvbWJhdFdlYXBvbk5hbWUoYmF0dGxlZmllbGRDb21iYXRXZWFwb25PcHRpb25zWzBdPy5uYW1lIHx8ICcnKVxuICAgIH1cbiAgfSwgW2JhdHRsZWZpZWxkQ29tYmF0V2VhcG9uTmFtZSwgYmF0dGxlZmllbGRDb21iYXRXZWFwb25PcHRpb25zXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghZHJhZ2dpbmdVbml0SWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVEcmFnZ2VkVW5pdFBvc2l0aW9uKGNsaWVudFgsIGNsaWVudFkpIHtcbiAgICAgIGNvbnN0IGJvYXJkID0gYmF0dGxlZmllbGRCb2FyZFJlZi5jdXJyZW50XG4gICAgICBjb25zdCB1bml0ID0gYmF0dGxlZmllbGRVbml0TWFwW2RyYWdnaW5nVW5pdElkXVxuICAgICAgaWYgKCFib2FyZCB8fCAhdW5pdCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVjdCA9IGJvYXJkLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gICAgICBjb25zdCByYWRpdXNYUGVyY2VudCA9ICgodW5pdC5iYXNlSW5jaGVzIC8gMikgLyBCQVRUTEVGSUVMRF9XSURUSF9JTkNIRVMpICogMTAwXG4gICAgICBjb25zdCByYWRpdXNZUGVyY2VudCA9ICgodW5pdC5iYXNlSW5jaGVzIC8gMikgLyBCQVRUTEVGSUVMRF9IRUlHSFRfSU5DSEVTKSAqIDEwMFxuICAgICAgY29uc3QgeFBlcmNlbnQgPSAoKGNsaWVudFggLSByZWN0LmxlZnQpIC8gcmVjdC53aWR0aCkgKiAxMDBcbiAgICAgIGNvbnN0IHlQZXJjZW50ID0gKChjbGllbnRZIC0gcmVjdC50b3ApIC8gcmVjdC5oZWlnaHQpICogMTAwXG5cbiAgICAgIHNldEJhdHRsZWZpZWxkUG9zaXRpb25zKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICBbZHJhZ2dpbmdVbml0SWRdOiB7XG4gICAgICAgICAgeDogY2xhbXAoeFBlcmNlbnQsIHJhZGl1c1hQZXJjZW50LCAxMDAgLSByYWRpdXNYUGVyY2VudCksXG4gICAgICAgICAgeTogY2xhbXAoeVBlcmNlbnQsIHJhZGl1c1lQZXJjZW50LCAxMDAgLSByYWRpdXNZUGVyY2VudCksXG4gICAgICAgIH0sXG4gICAgICB9KSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVQb2ludGVyTW92ZShldmVudCkge1xuICAgICAgdXBkYXRlRHJhZ2dlZFVuaXRQb3NpdGlvbihldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZVBvaW50ZXJVcCgpIHtcbiAgICAgIHNldERyYWdnaW5nVW5pdElkKCcnKVxuICAgIH1cblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIGhhbmRsZVBvaW50ZXJNb3ZlKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCBoYW5kbGVQb2ludGVyVXApXG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgaGFuZGxlUG9pbnRlck1vdmUpXG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgaGFuZGxlUG9pbnRlclVwKVxuICAgIH1cbiAgfSwgW2RyYWdnaW5nVW5pdElkLCBiYXR0bGVmaWVsZFVuaXRNYXBdKVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVTaW11bGF0aW9uKHBheWxvYWQsIHJ1bnNUb0V4ZWN1dGUpIHtcbiAgICB0cnkge1xuICAgICAgc2V0U2ltdWxhdGluZyh0cnVlKVxuICAgICAgc2V0RXJyb3IoJycpXG4gICAgICBzZXRTaW11bGF0aW9uUnVucyhbXSlcbiAgICAgIGNvbnN0IHNlZWRCYXNlID0gRGF0ZS5ub3coKVxuICAgICAgY29uc3QgcmVzcG9uc2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIEFycmF5LmZyb20oeyBsZW5ndGg6IHJ1bnNUb0V4ZWN1dGUgfSwgKF8sIGluZGV4KSA9PiBzaW11bGF0ZUNvbWJhdCh7XG4gICAgICAgICAgLi4ucGF5bG9hZCxcbiAgICAgICAgICBzZWVkOiBzZWVkQmFzZSArIGluZGV4LFxuICAgICAgICB9KSksXG4gICAgICApXG4gICAgICBjb25zdCBydW5zID0gcmVzcG9uc2VzLm1hcCgoZGF0YSwgaW5kZXgpID0+ICh7XG4gICAgICAgIC4uLmRhdGEsXG4gICAgICAgIHJ1bkluZGV4OiBpbmRleCArIDEsXG4gICAgICB9KSlcbiAgICAgIHNldFNpbXVsYXRpb25SdW5zKHJ1bnMpXG4gICAgICBzZXRBY3RpdmVSdW5WaWV3KCdzdW1tYXJ5JylcbiAgICB9IGNhdGNoIChyZXF1ZXN0RXJyb3IpIHtcbiAgICAgIHNldEVycm9yKGZvcm1hdEVycm9yKHJlcXVlc3RFcnJvcikpXG4gICAgICBzZXRTaW11bGF0aW9uUnVucyhbXSlcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0U2ltdWxhdGluZyhmYWxzZSlcbiAgICB9XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVTaW11bGF0ZShldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICBpZiAoIXJlYWR5VG9TaW11bGF0ZSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgcGF5bG9hZCA9IGJ1aWxkU2ltdWxhdGlvblBheWxvYWQoe1xuICAgICAgYXR0YWNrZXJGYWN0aW9uLFxuICAgICAgYXR0YWNrZXJVbml0LFxuICAgICAgYXR0YWNrZXJMb2Fkb3V0U2VsZWN0aW9uczogcmVzb2x2ZWRBdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgICAgYXR0YWNrZXJNb2RlbENvdW50LFxuICAgICAgd2VhcG9uTmFtZSxcbiAgICAgIGRlZmVuZGVyRmFjdGlvbixcbiAgICAgIGRlZmVuZGVyVW5pdCxcbiAgICAgIGRlZmVuZGVyTG9hZG91dFNlbGVjdGlvbnM6IHJlc29sdmVkRGVmZW5kZXJMb2Fkb3V0U2VsZWN0aW9ucyxcbiAgICAgIGRlZmVuZGVyTW9kZWxDb3VudCxcbiAgICAgIGF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnM6IHJlc29sdmVkQXR0YWNoZWRDaGFyYWN0ZXJMb2Fkb3V0U2VsZWN0aW9ucyxcbiAgICAgIGF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCxcbiAgICAgIHRhcmdldEhhc0NvdmVyLFxuICAgICAgYXR0YWNrZXJJbkVuZ2FnZW1lbnRSYW5nZSxcbiAgICAgIHRhcmdldEluRW5nYWdlbWVudFJhbmdlT2ZBbGxpZXMsXG4gICAgICBpbkhhbGZSYW5nZSxcbiAgICAgIG9hdGhPZk1vbWVudEFjdGl2ZSxcbiAgICAgIGNoYXJnZWRUaGlzVHVybixcbiAgICAgIHJlbWFpbmVkU3RhdGlvbmFyeSxcbiAgICAgIGluZGlyZWN0VGFyZ2V0VmlzaWJsZSxcbiAgICAgIGF0dGFjaGVkQ2hhcmFjdGVyTmFtZSxcbiAgICAgIGhhemFyZG91c092ZXJ3YXRjaENoYXJnZVBoYXNlLFxuICAgICAgaGF6YXJkb3VzQmVhcmVyQ3VycmVudFdvdW5kcyxcbiAgICAgIGF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUsXG4gICAgICBhdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlLFxuICAgICAgYXR0YWNrZXJVbmZvcmdpdmVuRnVyeUFjdGl2ZSxcbiAgICAgIGF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBcm15QmF0dGxlc2hvY2tlZCxcbiAgICAgIGF0dGFja2VyU3R1YmJvcm5UZW5hY2l0eUFjdGl2ZSxcbiAgICAgIGF0dGFja2VyV2VhcG9uc09mVGhlRmlyc3RMZWdpb25BY3RpdmUsXG4gICAgICBhdHRhY2tlclBlbm5hbnRPZlJlbWVtYnJhbmNlQWN0aXZlLFxuICAgICAgYXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGgsXG4gICAgICBhdHRhY2tlckJhdHRsZXNob2NrZWQsXG4gICAgICBkZWZlbmRlckFybW91ck9mQ29udGVtcHRBY3RpdmUsXG4gICAgICBkZWZlbmRlck92ZXJ3aGVsbWluZ09uc2xhdWdodEFjdGl2ZSxcbiAgICAgIGRlZmVuZGVyVW5icmVha2FibGVMaW5lc0FjdGl2ZSxcbiAgICAgIGRlZmVuZGVyUGVubmFudE9mUmVtZW1icmFuY2VBY3RpdmUsXG4gICAgICBkZWZlbmRlckJhdHRsZXNob2NrZWQsXG4gICAgfSlcbiAgICBhd2FpdCBleGVjdXRlU2ltdWxhdGlvbihwYXlsb2FkLCBNYXRoLm1heCgxLCBOdW1iZXIocnVuQ291bnQpIHx8IDEpKVxuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gaGFuZGxlQmF0dGxlZmllbGRTaW11bGF0ZSgpIHtcbiAgICBpZiAoIXNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRhbnQgfHwgIXNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRXZWFwb24pIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IGJhdHRsZWZpZWxkSGFsZlJhbmdlQWN0aXZlID0gYmF0dGxlZmllbGRFZGdlRGlzdGFuY2VJbmNoZXMgIT09IG51bGxcbiAgICAgICYmIHNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRXZWFwb24ucmFuZ2UgIT09ICdNZWxlZSdcbiAgICAgICYmIChcbiAgICAgICAgZ2V0V2VhcG9uS2V5d29yZFZhbHVlKHNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRXZWFwb24sICdSYXBpZCBGaXJlJykgPiAwXG4gICAgICAgIHx8IGdldFdlYXBvbktleXdvcmRWYWx1ZShzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uLCAnTWVsdGEnKSA+IDBcbiAgICAgIClcbiAgICAgICYmIGJhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzIDw9IChwYXJzZVdlYXBvblJhbmdlSW5jaGVzKHNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRXZWFwb24ucmFuZ2UpIHx8IDApIC8gMlxuXG4gICAgY29uc3QgYmF0dGxlZmllbGRBdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zID0gc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudC5pZCA9PT0gJ2F0dGFja2VyJ1xuICAgICAgPyByZXNvbHZlZEF0dGFja2VyTG9hZG91dFNlbGVjdGlvbnNcbiAgICAgIDogcmVzb2x2ZWREZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zXG4gICAgY29uc3QgYmF0dGxlZmllbGREZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zID0gc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudC5pZCA9PT0gJ2F0dGFja2VyJ1xuICAgICAgPyByZXNvbHZlZERlZmVuZGVyTG9hZG91dFNlbGVjdGlvbnNcbiAgICAgIDogcmVzb2x2ZWRBdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zXG4gICAgY29uc3QgYmF0dGxlZmllbGRBdHRhY2tlck1vZGVsQ291bnQgPSBzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0YW50LmlkID09PSAnYXR0YWNrZXInXG4gICAgICA/IChhdHRhY2tlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKGF0dGFja2VyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQpXG4gICAgICA6IChkZWZlbmRlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKGRlZmVuZGVyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQpXG4gICAgY29uc3QgYmF0dGxlZmllbGREZWZlbmRlck1vZGVsQ291bnQgPSBzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0YW50LmlkID09PSAnYXR0YWNrZXInXG4gICAgICA/IChkZWZlbmRlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKGRlZmVuZGVyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQpXG4gICAgICA6IChhdHRhY2tlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKGF0dGFja2VyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQpXG5cbiAgICBhd2FpdCBleGVjdXRlU2ltdWxhdGlvbih7XG4gICAgICBhdHRhY2tlcl9mYWN0aW9uOiBzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0YW50LmF0dGFja2VyRmFjdGlvbixcbiAgICAgIGF0dGFja2VyX3VuaXQ6IHNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRhbnQuYXR0YWNrZXJOYW1lLFxuICAgICAgYXR0YWNrZXJfbG9hZG91dDogYmF0dGxlZmllbGRBdHRhY2tlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgICAgYXR0YWNrZXJfbW9kZWxfY291bnQ6IGJhdHRsZWZpZWxkQXR0YWNrZXJNb2RlbENvdW50LFxuICAgICAgd2VhcG9uX25hbWU6IHNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRXZWFwb24ubmFtZSxcbiAgICAgIGRlZmVuZGVyX2ZhY3Rpb246IHNlbGVjdGVkQmF0dGxlZmllbGRDb21iYXRhbnQuZGVmZW5kZXJGYWN0aW9uLFxuICAgICAgZGVmZW5kZXJfdW5pdDogc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudC5kZWZlbmRlck5hbWUsXG4gICAgICBkZWZlbmRlcl9sb2Fkb3V0OiBiYXR0bGVmaWVsZERlZmVuZGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgICBkZWZlbmRlcl9tb2RlbF9jb3VudDogYmF0dGxlZmllbGREZWZlbmRlck1vZGVsQ291bnQsXG4gICAgICBhdHRhY2hlZF9jaGFyYWN0ZXJfbG9hZG91dDogcmVzb2x2ZWRBdHRhY2hlZENoYXJhY3RlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgICAgYXR0YWNoZWRfY2hhcmFjdGVyX21vZGVsX2NvdW50OiBhdHRhY2hlZENoYXJhY3Rlck1vZGVsQ291bnQgIT09ICcnID8gTnVtYmVyKGF0dGFjaGVkQ2hhcmFjdGVyTW9kZWxDb3VudCkgOiB1bmRlZmluZWQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGF0dGFja2VyX2luX2VuZ2FnZW1lbnRfcmFuZ2U6IGJhdHRsZWZpZWxkSW5FbmdhZ2VtZW50UmFuZ2UsXG4gICAgICAgIGluX2hhbGZfcmFuZ2U6IGJhdHRsZWZpZWxkSGFsZlJhbmdlQWN0aXZlLFxuICAgICAgfSxcbiAgICB9LCBNYXRoLm1heCgxLCBOdW1iZXIocnVuQ291bnQpIHx8IDEpKVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQmF0dGxlZmllbGRVbml0UG9pbnRlckRvd24odW5pdElkKSB7XG4gICAgcmV0dXJuIChldmVudCkgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgc2V0U2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXRJZCh1bml0SWQpXG4gICAgICBzZXREcmFnZ2luZ1VuaXRJZCh1bml0SWQpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYWRkVW5pdFRvQXJteUxpc3QodW5pdERldGFpbHMsIGZhY3Rpb24pIHtcbiAgICBpZiAoIXVuaXREZXRhaWxzPy5uYW1lIHx8ICFmYWN0aW9uKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCBlbnRyeUlkID0gYCR7ZmFjdGlvbn06OiR7dW5pdERldGFpbHMubmFtZX1gXG4gICAgc2V0QXJteUxpc3RFbnRyaWVzKChjdXJyZW50RW50cmllcykgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmdFbnRyeSA9IGN1cnJlbnRFbnRyaWVzLmZpbmQoKGVudHJ5KSA9PiBlbnRyeS5pZCA9PT0gZW50cnlJZClcbiAgICAgIGlmIChleGlzdGluZ0VudHJ5KSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50RW50cmllcy5tYXAoKGVudHJ5KSA9PiAoXG4gICAgICAgICAgZW50cnkuaWQgPT09IGVudHJ5SWRcbiAgICAgICAgICAgID8geyAuLi5lbnRyeSwgY291bnQ6IGVudHJ5LmNvdW50ICsgMSB9XG4gICAgICAgICAgICA6IGVudHJ5XG4gICAgICAgICkpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIC4uLmN1cnJlbnRFbnRyaWVzLFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IGVudHJ5SWQsXG4gICAgICAgICAgZmFjdGlvbixcbiAgICAgICAgICBuYW1lOiB1bml0RGV0YWlscy5uYW1lLFxuICAgICAgICAgIGNvdW50OiAxLFxuICAgICAgICAgIHN0YXRzOiB1bml0RGV0YWlscy5zdGF0cyxcbiAgICAgICAgICBrZXl3b3JkczogdW5pdERldGFpbHMua2V5d29yZHMgfHwgW10sXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUFybXlMaXN0RW50cnkoZW50cnlJZCkge1xuICAgIHNldEFybXlMaXN0RW50cmllcygoY3VycmVudEVudHJpZXMpID0+IGN1cnJlbnRFbnRyaWVzLmZpbHRlcigoZW50cnkpID0+IGVudHJ5LmlkICE9PSBlbnRyeUlkKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUFybXlMaXN0RW50cnlDb3VudChlbnRyeUlkLCBuZXh0Q291bnQpIHtcbiAgICBjb25zdCBub3JtYWxpemVkQ291bnQgPSBNYXRoLm1heCgxLCBOdW1iZXIobmV4dENvdW50KSB8fCAxKVxuICAgIHNldEFybXlMaXN0RW50cmllcygoY3VycmVudEVudHJpZXMpID0+IGN1cnJlbnRFbnRyaWVzLm1hcCgoZW50cnkpID0+IChcbiAgICAgIGVudHJ5LmlkID09PSBlbnRyeUlkXG4gICAgICAgID8geyAuLi5lbnRyeSwgY291bnQ6IG5vcm1hbGl6ZWRDb3VudCB9XG4gICAgICAgIDogZW50cnlcbiAgICApKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0T3B0aW9ucygpIHtcbiAgICBzZXRUYXJnZXRIYXNDb3Zlcihpbml0aWFsT3B0aW9ucy50YXJnZXRfaGFzX2NvdmVyKVxuICAgIHNldEF0dGFja2VySW5FbmdhZ2VtZW50UmFuZ2UoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfaW5fZW5nYWdlbWVudF9yYW5nZSlcbiAgICBzZXRUYXJnZXRJbkVuZ2FnZW1lbnRSYW5nZU9mQWxsaWVzKGluaXRpYWxPcHRpb25zLnRhcmdldF9pbl9lbmdhZ2VtZW50X3JhbmdlX29mX2FsbGllcylcbiAgICBzZXRJbkhhbGZSYW5nZShpbml0aWFsT3B0aW9ucy5pbl9oYWxmX3JhbmdlKVxuICAgIHNldE9hdGhPZk1vbWVudEFjdGl2ZShpbml0aWFsT3B0aW9ucy5vYXRoX29mX21vbWVudF9hY3RpdmUpXG4gICAgc2V0Q2hhcmdlZFRoaXNUdXJuKGluaXRpYWxPcHRpb25zLmNoYXJnZWRfdGhpc190dXJuKVxuICAgIHNldFJlbWFpbmVkU3RhdGlvbmFyeShpbml0aWFsT3B0aW9ucy5yZW1haW5lZF9zdGF0aW9uYXJ5KVxuICAgIHNldEluZGlyZWN0VGFyZ2V0VmlzaWJsZShpbml0aWFsT3B0aW9ucy5pbmRpcmVjdF90YXJnZXRfdmlzaWJsZSlcbiAgICBzZXRBdHRhY2hlZENoYXJhY3Rlck5hbWUoaW5pdGlhbE9wdGlvbnMuYXR0YWNoZWRfY2hhcmFjdGVyX25hbWUpXG4gICAgc2V0SGF6YXJkb3VzT3ZlcndhdGNoQ2hhcmdlUGhhc2UoaW5pdGlhbE9wdGlvbnMuaGF6YXJkb3VzX292ZXJ3YXRjaF9jaGFyZ2VfcGhhc2UpXG4gICAgc2V0SGF6YXJkb3VzQmVhcmVyQ3VycmVudFdvdW5kcyhpbml0aWFsT3B0aW9ucy5oYXphcmRvdXNfYmVhcmVyX2N1cnJlbnRfd291bmRzKVxuICAgIHNldEF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfZmlyZV9kaXNjaXBsaW5lX2FjdGl2ZSlcbiAgICBzZXRBdHRhY2tlck1hcmtlZEZvckRlc3RydWN0aW9uQWN0aXZlKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX21hcmtlZF9mb3JfZGVzdHJ1Y3Rpb25fYWN0aXZlKVxuICAgIHNldEF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBY3RpdmUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfdW5mb3JnaXZlbl9mdXJ5X2FjdGl2ZSlcbiAgICBzZXRBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QXJteUJhdHRsZXNob2NrZWQoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfdW5mb3JnaXZlbl9mdXJ5X2FybXlfYmF0dGxlc2hvY2tlZClcbiAgICBzZXRBdHRhY2tlclN0dWJib3JuVGVuYWNpdHlBY3RpdmUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfc3R1YmJvcm5fdGVuYWNpdHlfYWN0aXZlKVxuICAgIHNldEF0dGFja2VyV2VhcG9uc09mVGhlRmlyc3RMZWdpb25BY3RpdmUoaW5pdGlhbE9wdGlvbnMuYXR0YWNrZXJfd2VhcG9uc19vZl90aGVfZmlyc3RfbGVnaW9uX2FjdGl2ZSlcbiAgICBzZXRBdHRhY2tlclBlbm5hbnRPZlJlbWVtYnJhbmNlQWN0aXZlKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX3Blbm5hbnRfb2ZfcmVtZW1icmFuY2VfYWN0aXZlKVxuICAgIHNldEF0dGFja2VyQmVsb3dTdGFydGluZ1N0cmVuZ3RoKGluaXRpYWxPcHRpb25zLmF0dGFja2VyX2JlbG93X3N0YXJ0aW5nX3N0cmVuZ3RoKVxuICAgIHNldEF0dGFja2VyQmF0dGxlc2hvY2tlZChpbml0aWFsT3B0aW9ucy5hdHRhY2tlcl9iYXR0bGVzaG9ja2VkKVxuICAgIHNldERlZmVuZGVyQXJtb3VyT2ZDb250ZW1wdEFjdGl2ZShpbml0aWFsT3B0aW9ucy5kZWZlbmRlcl9hcm1vdXJfb2ZfY29udGVtcHRfYWN0aXZlKVxuICAgIHNldERlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0QWN0aXZlKGluaXRpYWxPcHRpb25zLmRlZmVuZGVyX292ZXJ3aGVsbWluZ19vbnNsYXVnaHRfYWN0aXZlKVxuICAgIHNldERlZmVuZGVyVW5icmVha2FibGVMaW5lc0FjdGl2ZShpbml0aWFsT3B0aW9ucy5kZWZlbmRlcl91bmJyZWFrYWJsZV9saW5lc19hY3RpdmUpXG4gICAgc2V0RGVmZW5kZXJQZW5uYW50T2ZSZW1lbWJyYW5jZUFjdGl2ZShpbml0aWFsT3B0aW9ucy5kZWZlbmRlcl9wZW5uYW50X29mX3JlbWVtYnJhbmNlX2FjdGl2ZSlcbiAgICBzZXREZWZlbmRlckJhdHRsZXNob2NrZWQoaW5pdGlhbE9wdGlvbnMuZGVmZW5kZXJfYmF0dGxlc2hvY2tlZClcbiAgICBzZXRBdHRhY2tlckVuaGFuY2VtZW50TmFtZSgnJylcbiAgICBzZXREZWZlbmRlckVuaGFuY2VtZW50TmFtZSgnJylcbiAgICBzZXRSdW5Db3VudCgnMScpXG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYXBwLXNoZWxsXCI+XG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cImhlcm8tYmFuZFwiPlxuICAgICAgICA8cCBjbGFzc05hbWU9XCJleWVicm93XCI+V2FyaGFtbWVyIDQwLDAwMCBDb21iYXQgU2ltdWxhdG9yPC9wPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImhlcm8tY29weVwiPlxuICAgICAgICAgIDxoMT5cbiAgICAgICAgICAgIHthY3RpdmVQYWdlID09PSAnY29tYmF0J1xuICAgICAgICAgICAgICA/ICdDaGVjayBVbml0IEVmZmVjdGl2ZW5lc3MnXG4gICAgICAgICAgICAgIDogYWN0aXZlUGFnZSA9PT0gJ2JhdHRsZWZpZWxkJ1xuICAgICAgICAgICAgICAgID8gJ1Bsb3QgVW5pdHMgb24gdGhlIEJhdHRsZWZpZWxkJ1xuICAgICAgICAgICAgICAgIDogJ0J1aWxkIEFybXkgTGlzdHMnfVxuICAgICAgICAgIDwvaDE+XG4gICAgICAgICAgPHA+XG4gICAgICAgICAgICB7YWN0aXZlUGFnZSA9PT0gJ2NvbWJhdCdcbiAgICAgICAgICAgICAgPyAnUGljayBhbiBhdHRhY2tlciwgYSB3ZWFwb24gcHJvZmlsZSwgYSBkZWZlbmRlciwgYW5kIHRoZSBjb21iYXQgY29udGV4dC4gQXBwbGllcyB0aGUgcnVsZXMgZW5naW5lIGFuZCByZXR1cm5zIGEgZnVsbCBjb21iYXQgbG9nLidcbiAgICAgICAgICAgICAgOiBhY3RpdmVQYWdlID09PSAnYmF0dGxlZmllbGQnXG4gICAgICAgICAgICAgICAgPyAnVGhlIHNlbGVjdGVkIHVuaXRzIGZyb20gQ29tYmF0IGFyZSBzaG93biBhcyBzY2FsZWQgYmFzZXMgb24gYSA0NCB4IDYwIGluY2ggdG9wLWRvd24gYm9hcmQuJ1xuICAgICAgICAgICAgICAgIDogJ0FybXkgbGlzdCBtYW5hZ2VtZW50IHdpbGwgbGl2ZSBoZXJlLiBUaGUgcGFnZSBzaGVsbCBpcyBpbiBwbGFjZSBzbyB0aGUgbmV4dCBwYXNzIGNhbiBkZWZpbmUgdGhlIGFjdHVhbCByb3N0ZXIgd29ya2Zsb3cuJ31cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9oZWFkZXI+XG5cbiAgICAgIDxuYXYgY2xhc3NOYW1lPVwicGFnZS1uYXZcIiBhcmlhLWxhYmVsPVwiUHJpbWFyeVwiPlxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPXtgcGFnZS1uYXYtYnV0dG9uICR7YWN0aXZlUGFnZSA9PT0gJ2FybXktbGlzdCcgPyAnYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlUGFnZSgnYXJteS1saXN0Jyl9XG4gICAgICAgID5cbiAgICAgICAgICBBcm15IExpc3RcbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9e2BwYWdlLW5hdi1idXR0b24gJHthY3RpdmVQYWdlID09PSAnY29tYmF0JyA/ICdhY3RpdmUnIDogJyd9YH1cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVQYWdlKCdjb21iYXQnKX1cbiAgICAgICAgPlxuICAgICAgICAgIENvbWJhdFxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT17YHBhZ2UtbmF2LWJ1dHRvbiAke2FjdGl2ZVBhZ2UgPT09ICdiYXR0bGVmaWVsZCcgPyAnYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlUGFnZSgnYmF0dGxlZmllbGQnKX1cbiAgICAgICAgPlxuICAgICAgICAgIEJhdHRsZWZpZWxkXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9uYXY+XG5cbiAgICAgIHthY3RpdmVQYWdlID09PSAnY29tYmF0JyA/IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8bWFpbiBjbGFzc05hbWU9XCJ3b3Jrc3BhY2UtZ3JpZFwiPlxuICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJwYW5lbCBjb250cm9sLXBhbmVsXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkaW5nXCI+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJraWNrZXJcIj5TZXR1cDwvcD5cbiAgICAgICAgICAgICAgPGgyPlNpbXVsYXRpb24gSW5wdXQ8L2gyPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJzZWNvbmRhcnktYnV0dG9uXCIgb25DbGljaz17cmVzZXRPcHRpb25zfT5cbiAgICAgICAgICAgICAgUmVzZXQgT3B0aW9uc1xuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7bG9hZGluZyA/IDxwIGNsYXNzTmFtZT1cInN0YXR1cy1saW5lXCI+TG9hZGluZyBmYWN0aW9uIGRhdGEuLi48L3A+IDogbnVsbH1cbiAgICAgICAgICB7ZXJyb3IgPyA8cCBjbGFzc05hbWU9XCJzdGF0dXMtbGluZSBlcnJvclwiPntlcnJvcn08L3A+IDogbnVsbH1cblxuICAgICAgICAgIDxmb3JtIGNsYXNzTmFtZT1cInNpbS1mb3JtXCIgb25TdWJtaXQ9e2hhbmRsZVNpbXVsYXRlfT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2x1c3RlciB0d28tdXBcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlxuICAgICAgICAgICAgICAgIDxzcGFuPkF0dGFja2luZyBGYWN0aW9uPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzZWxlY3QgdmFsdWU9e2F0dGFja2VyRmFjdGlvbn0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QXR0YWNrZXJGYWN0aW9uKGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgICAge2ZhY3Rpb25zLm1hcCgoZmFjdGlvbikgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17ZmFjdGlvbi5uYW1lfSB2YWx1ZT17ZmFjdGlvbi5uYW1lfT5cbiAgICAgICAgICAgICAgICAgICAgICB7ZmFjdGlvbi5uYW1lfVxuICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICAgIDxsYWJlbD5cbiAgICAgICAgICAgICAgICA8c3Bhbj5EZWZlbmRpbmcgRmFjdGlvbjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IHZhbHVlPXtkZWZlbmRlckZhY3Rpb259IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldERlZmVuZGVyRmFjdGlvbihldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgICAgICAgIHtmYWN0aW9ucy5tYXAoKGZhY3Rpb24pID0+IChcbiAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiBrZXk9e2ZhY3Rpb24ubmFtZX0gdmFsdWU9e2ZhY3Rpb24ubmFtZX0+XG4gICAgICAgICAgICAgICAgICAgICAge2ZhY3Rpb24ubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNsdXN0ZXIgdHdvLXVwXCI+XG4gICAgICAgICAgICAgIDxsYWJlbD5cbiAgICAgICAgICAgICAgICA8c3Bhbj5BdHRhY2tpbmcgVW5pdDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IHZhbHVlPXthdHRhY2tlclVuaXR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEF0dGFja2VyVW5pdChldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgICAgICAgIHthdHRhY2tlclVuaXRzLm1hcCgodW5pdCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17dW5pdC5uYW1lfSB2YWx1ZT17dW5pdC5uYW1lfT5cbiAgICAgICAgICAgICAgICAgICAgICB7dW5pdC5uYW1lfVxuICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICAgIDxsYWJlbD5cbiAgICAgICAgICAgICAgICA8c3Bhbj5EZWZlbmRpbmcgVW5pdDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IHZhbHVlPXtkZWZlbmRlclVuaXR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldERlZmVuZGVyVW5pdChldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgICAgICAgIHtkZWZlbmRlclVuaXRzLm1hcCgodW5pdCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17dW5pdC5uYW1lfSB2YWx1ZT17dW5pdC5uYW1lfT5cbiAgICAgICAgICAgICAgICAgICAgICB7dW5pdC5uYW1lfVxuICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2x1c3RlciB0d28tdXBcIj5cbiAgICAgICAgICAgICAge3JlbmRlck1vZGVsQ291bnRTZWxlY3RvcihcbiAgICAgICAgICAgICAgICAnQXR0YWNrZXInLFxuICAgICAgICAgICAgICAgIGF0dGFja2VyVW5pdERldGFpbHMsXG4gICAgICAgICAgICAgICAgYXR0YWNrZXJNb2RlbENvdW50LFxuICAgICAgICAgICAgICAgIHNldEF0dGFja2VyTW9kZWxDb3VudCxcbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAge3JlbmRlck1vZGVsQ291bnRTZWxlY3RvcihcbiAgICAgICAgICAgICAgICAnRGVmZW5kZXInLFxuICAgICAgICAgICAgICAgIGRlZmVuZGVyVW5pdERldGFpbHMsXG4gICAgICAgICAgICAgICAgZGVmZW5kZXJNb2RlbENvdW50LFxuICAgICAgICAgICAgICAgIHNldERlZmVuZGVyTW9kZWxDb3VudCxcbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7cmVuZGVyTG9hZG91dFNlbGVjdG9ycyhcbiAgICAgICAgICAgICAgJ0F0dGFja2VyJyxcbiAgICAgICAgICAgICAgYXR0YWNrZXJVbml0RGV0YWlscyxcbiAgICAgICAgICAgICAgYXR0YWNrZXJMb2Fkb3V0U2VsZWN0aW9ucyxcbiAgICAgICAgICAgICAgc2V0QXR0YWNrZXJMb2Fkb3V0U2VsZWN0aW9ucyxcbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIHtyZW5kZXJMb2Fkb3V0U2VsZWN0b3JzKFxuICAgICAgICAgICAgICAnRGVmZW5kZXInLFxuICAgICAgICAgICAgICBkZWZlbmRlclVuaXREZXRhaWxzLFxuICAgICAgICAgICAgICBkZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgICAgICAgICAgICBzZXREZWZlbmRlckxvYWRvdXRTZWxlY3Rpb25zLFxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgeyhhdHRhY2tlckZhY3Rpb25EZXRhaWxzPy5kZXRhY2htZW50cz8ubGVuZ3RoIHx8IGRlZmVuZGVyRmFjdGlvbkRldGFpbHM/LmRldGFjaG1lbnRzPy5sZW5ndGgpID8gKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNsdXN0ZXIgdHdvLXVwXCI+XG4gICAgICAgICAgICAgICAgPGxhYmVsIHRpdGxlPXthdHRhY2tlckRldGFjaG1lbnRUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkF0dGFja2VyIERldGFjaG1lbnQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXthdHRhY2tlckRldGFjaG1lbnRUb29sdGlwfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17YXR0YWNrZXJEZXRhY2htZW50TmFtZX1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QXR0YWNrZXJEZXRhY2htZW50TmFtZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+Tm8gZGV0YWNobWVudDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICB7KGF0dGFja2VyRmFjdGlvbkRldGFpbHM/LmRldGFjaG1lbnRzIHx8IFtdKS5tYXAoKGRldGFjaG1lbnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2RldGFjaG1lbnQubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtkZXRhY2htZW50Lm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17Zm9ybWF0RGV0YWNobWVudFRvb2x0aXAoZGV0YWNobWVudCl9XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAge2RldGFjaG1lbnQubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICAgICAgPGxhYmVsIHRpdGxlPXtkZWZlbmRlckRldGFjaG1lbnRUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkRlZmVuZGVyIERldGFjaG1lbnQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXtkZWZlbmRlckRldGFjaG1lbnRUb29sdGlwfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17ZGVmZW5kZXJEZXRhY2htZW50TmFtZX1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0RGVmZW5kZXJEZXRhY2htZW50TmFtZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+Tm8gZGV0YWNobWVudDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICB7KGRlZmVuZGVyRmFjdGlvbkRldGFpbHM/LmRldGFjaG1lbnRzIHx8IFtdKS5tYXAoKGRldGFjaG1lbnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2RldGFjaG1lbnQubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtkZXRhY2htZW50Lm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17Zm9ybWF0RGV0YWNobWVudFRvb2x0aXAoZGV0YWNobWVudCl9XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAge2RldGFjaG1lbnQubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgIDxzcGFuPldlYXBvbiBQcm9maWxlPC9zcGFuPlxuICAgICAgICAgICAgICA8c2VsZWN0IHZhbHVlPXt3ZWFwb25OYW1lfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRXZWFwb25OYW1lKGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgIHtjb21iYXRXZWFwb25PcHRpb25zLm1hcCgod2VhcG9uKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17d2VhcG9uLm5hbWV9IHZhbHVlPXt3ZWFwb24ubmFtZX0+XG4gICAgICAgICAgICAgICAgICAgIHtmb3JtYXRXZWFwb25OYW1lKHdlYXBvbil9XG4gICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgIDxzcGFuPk51bWJlciBvZiBSdW5zPC9zcGFuPlxuICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgICAgICAgICBtaW49XCIxXCJcbiAgICAgICAgICAgICAgICBtYXg9XCIxMDBcIlxuICAgICAgICAgICAgICAgIHZhbHVlPXtydW5Db3VudH1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRSdW5Db3VudChldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9sYWJlbD5cblxuICAgICAgICAgICAge3NlbGVjdGVkV2VhcG9uID8gKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIndlYXBvbi1jYXJkXCI+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPlNlbGVjdGVkIFdlYXBvbjwvcD5cbiAgICAgICAgICAgICAgICAgIDxoMz57Zm9ybWF0V2VhcG9uTmFtZShzZWxlY3RlZFdlYXBvbil9PC9oMz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICB7d2VhcG9uTmFtZSA9PT0gQUxMX1JBTkdFRF9XRUFQT05TIHx8IHdlYXBvbk5hbWUgPT09IEFMTF9NRUxFRV9XRUFQT05TID8gKFxuICAgICAgICAgICAgICAgICAgPHA+e3NlbGVjdGVkQXR0YWNrV2VhcG9ucy5tYXAoKHdlYXBvbikgPT4gZm9ybWF0V2VhcG9uTmFtZSh3ZWFwb24pKS5qb2luKCcsICcpfTwvcD5cbiAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJkYXRhc2hlZXQtc3RhdHNcIj5cbiAgICAgICAgICAgICAgICAgICAge3JlbmRlcldlYXBvblN0YXRzR3JpZChzZWxlY3RlZFdlYXBvbil9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJ1bGUtZ3JpZFwiPlxuICAgICAgICAgICAgICB7YXR0YWNrZXJFbmhhbmNlbWVudE9wdGlvbnMubGVuZ3RoID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCB0aXRsZT17YXR0YWNrZXJFbmhhbmNlbWVudFRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPHNwYW4+QXR0YWNrZXIgRW5oYW5jZW1lbnQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXthdHRhY2tlckVuaGFuY2VtZW50VG9vbHRpcH1cbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2F0dGFja2VyRW5oYW5jZW1lbnROYW1lfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRBdHRhY2tlckVuaGFuY2VtZW50TmFtZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+Tm8gZW5oYW5jZW1lbnQ8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAge2F0dGFja2VyRW5oYW5jZW1lbnRPcHRpb25zLm1hcCgoZW5oYW5jZW1lbnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2VuaGFuY2VtZW50Lm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17ZW5oYW5jZW1lbnQubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtmb3JtYXRFbmhhbmNlbWVudFRvb2x0aXAoZW5oYW5jZW1lbnQpfVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtlbmhhbmNlbWVudC5uYW1lfVxuICAgICAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHtkZWZlbmRlckVuaGFuY2VtZW50T3B0aW9ucy5sZW5ndGggPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIHRpdGxlPXtkZWZlbmRlckVuaGFuY2VtZW50VG9vbHRpcH0+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5EZWZlbmRlciBFbmhhbmNlbWVudDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3RcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2RlZmVuZGVyRW5oYW5jZW1lbnRUb29sdGlwfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17ZGVmZW5kZXJFbmhhbmNlbWVudE5hbWV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldERlZmVuZGVyRW5oYW5jZW1lbnROYW1lKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj5ObyBlbmhhbmNlbWVudDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICB7ZGVmZW5kZXJFbmhhbmNlbWVudE9wdGlvbnMubWFwKChlbmhhbmNlbWVudCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17ZW5oYW5jZW1lbnQubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtlbmhhbmNlbWVudC5uYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Zvcm1hdEVuaGFuY2VtZW50VG9vbHRpcChlbmhhbmNlbWVudCl9XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAge2VuaGFuY2VtZW50Lm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2NhblVzZUF0dGFja2VyRmlyZURpc2NpcGxpbmUgPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImNoZWNrYm94LXJvd1wiIHRpdGxlPXtmaXJlRGlzY2lwbGluZVRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2F0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEF0dGFja2VyRmlyZURpc2NpcGxpbmVBY3RpdmUoZXZlbnQudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPlVzZSBGaXJlIERpc2NpcGxpbmU8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2NhblVzZUF0dGFja2VyTWFya2VkRm9yRGVzdHJ1Y3Rpb24gPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImNoZWNrYm94LXJvd1wiIHRpdGxlPXttYXJrZWRGb3JEZXN0cnVjdGlvblRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2F0dGFja2VyTWFya2VkRm9yRGVzdHJ1Y3Rpb25BY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEF0dGFja2VyTWFya2VkRm9yRGVzdHJ1Y3Rpb25BY3RpdmUoZXZlbnQudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPlVzZSBNYXJrZWQgZm9yIERlc3RydWN0aW9uPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHtjYW5Vc2VBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5ID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17dW5mb3JnaXZlbkZ1cnlUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXthdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QWN0aXZlfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRBdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QWN0aXZlKGV2ZW50LnRhcmdldC5jaGVja2VkKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5Vc2UgVW5mb3JnaXZlbiBGdXJ5PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHthdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QWN0aXZlID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17YXR0YWNrZXJBcm15QmF0dGxlc2hvY2tUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXthdHRhY2tlclVuZm9yZ2l2ZW5GdXJ5QXJteUJhdHRsZXNob2NrZWR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEF0dGFja2VyVW5mb3JnaXZlbkZ1cnlBcm15QmF0dGxlc2hvY2tlZChldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+QXR0YWNrZXIgYXJteSBoYXMgYSBCYXR0bGUtc2hvY2tlZCBBZGVwdHVzIEFzdGFydGVzIHVuaXQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2NhblVzZURlZmVuZGVyQXJtb3VyT2ZDb250ZW1wdCA/IChcbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiY2hlY2tib3gtcm93XCIgdGl0bGU9e2FybW91ck9mQ29udGVtcHRUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXtkZWZlbmRlckFybW91ck9mQ29udGVtcHRBY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldERlZmVuZGVyQXJtb3VyT2ZDb250ZW1wdEFjdGl2ZShldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+RGVmZW5kZXIgdXNlcyBBcm1vdXIgb2YgQ29udGVtcHQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2NhblVzZURlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0ID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17b3ZlcndoZWxtaW5nT25zbGF1Z2h0VG9vbHRpcH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZD17ZGVmZW5kZXJPdmVyd2hlbG1pbmdPbnNsYXVnaHRBY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldERlZmVuZGVyT3ZlcndoZWxtaW5nT25zbGF1Z2h0QWN0aXZlKGV2ZW50LnRhcmdldC5jaGVja2VkKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5EZWZlbmRlciB1c2VzIE92ZXJ3aGVsbWluZyBPbnNsYXVnaHQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2NhblVzZURlZmVuZGVyVW5icmVha2FibGVMaW5lcyA/IChcbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiY2hlY2tib3gtcm93XCIgdGl0bGU9e3VuYnJlYWthYmxlTGluZXNUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXtkZWZlbmRlclVuYnJlYWthYmxlTGluZXNBY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldERlZmVuZGVyVW5icmVha2FibGVMaW5lc0FjdGl2ZShldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+RGVmZW5kZXIgdXNlcyBVbmJyZWFrYWJsZSBMaW5lczwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICB7Y2FuVXNlQ292ZXIgPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImNoZWNrYm94LXJvd1wiIHRpdGxlPXtjb3ZlclRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e3RhcmdldEhhc0NvdmVyfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRUYXJnZXRIYXNDb3ZlcihldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+RGVmZW5kZXIgaGFzIGNvdmVyPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHtoYXNPYXRoT2ZNb21lbnQgPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImNoZWNrYm94LXJvd1wiIHRpdGxlPXtvYXRoVG9vbHRpcH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZD17b2F0aE9mTW9tZW50QWN0aXZlfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRPYXRoT2ZNb21lbnRBY3RpdmUoZXZlbnQudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkRlZmVuZGVyIGlzIHRoZSBPYXRoIG9mIE1vbWVudCB0YXJnZXQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2NhblVzZUhhbGZSYW5nZSA/IChcbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiY2hlY2tib3gtcm93XCIgdGl0bGU9e2hhbGZSYW5nZVRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2luSGFsZlJhbmdlfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRJbkhhbGZSYW5nZShldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+VGFyZ2V0IGlzIGluIEhhbGYgUmFuZ2U8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2lzUmFuZ2VkV2VhcG9uID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17ZW5nYWdlbWVudFRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2F0dGFja2VySW5FbmdhZ2VtZW50UmFuZ2V9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEF0dGFja2VySW5FbmdhZ2VtZW50UmFuZ2UoZXZlbnQudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkF0dGFja2VyIGlzIGluIEVuZ2FnZW1lbnQgUmFuZ2U8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2hhc0hlYXZ5ID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17aGVhdnlUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXtyZW1haW5lZFN0YXRpb25hcnl9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldFJlbWFpbmVkU3RhdGlvbmFyeShldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+QXR0YWNrZXIgcmVtYWluZWQgU3RhdGlvbmFyeTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICB7aGFzQmxhc3QgPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImNoZWNrYm94LXJvd1wiIHRpdGxlPXtibGFzdFRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e3RhcmdldEluRW5nYWdlbWVudFJhbmdlT2ZBbGxpZXN9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldFRhcmdldEluRW5nYWdlbWVudFJhbmdlT2ZBbGxpZXMoZXZlbnQudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkRlZmVuZGVyIGlzIGluIEVuZ2FnZW1lbnQgUmFuZ2Ugb2YgYWxsaWVkIHVuaXRzPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHtoYXNJbmRpcmVjdEZpcmUgPyAoXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImNoZWNrYm94LXJvd1wiIHRpdGxlPXtpbmRpcmVjdFRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2luZGlyZWN0VGFyZ2V0VmlzaWJsZX1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0SW5kaXJlY3RUYXJnZXRWaXNpYmxlKGV2ZW50LnRhcmdldC5jaGVja2VkKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5BbnkgZGVmZW5kZXIgbW9kZWxzIGFyZSB2aXNpYmxlPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHtjYW5Vc2VMYW5jZSAmJiBpc01lbGVlV2VhcG9uID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17bGFuY2VUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXtjaGFyZ2VkVGhpc1R1cm59XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldENoYXJnZWRUaGlzVHVybihldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+QXR0YWNrZXIgY2hhcmdlZCB0aGlzIHR1cm48L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAge2F0dGFja2VyRW5oYW5jZW1lbnROYW1lID09PSAnU3R1YmJvcm4gVGVuYWNpdHknID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17YXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGhUb29sdGlwfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXthdHRhY2tlckJlbG93U3RhcnRpbmdTdHJlbmd0aH1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QXR0YWNrZXJCZWxvd1N0YXJ0aW5nU3RyZW5ndGgoZXZlbnQudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkF0dGFja2VyIGlzIGJlbG93IFN0YXJ0aW5nIFN0cmVuZ3RoPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgICAgICAgIHsoYXR0YWNrZXJFbmhhbmNlbWVudE5hbWUgPT09ICdTdHViYm9ybiBUZW5hY2l0eSdcbiAgICAgICAgICAgICAgICB8fCBhdHRhY2tlckVuaGFuY2VtZW50TmFtZSA9PT0gJ1dlYXBvbnMgb2YgdGhlIEZpcnN0IExlZ2lvbidcbiAgICAgICAgICAgICAgICB8fCBhdHRhY2tlckVuaGFuY2VtZW50TmFtZSA9PT0gJ1Blbm5hbnQgb2YgUmVtZW1icmFuY2UnKSA/IChcbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiY2hlY2tib3gtcm93XCIgdGl0bGU9e2F0dGFja2VyQmF0dGxlc2hvY2tlZFRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2F0dGFja2VyQmF0dGxlc2hvY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QXR0YWNrZXJCYXR0bGVzaG9ja2VkKGV2ZW50LnRhcmdldC5jaGVja2VkKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5BdHRhY2tlciBpcyBCYXR0bGUtc2hvY2tlZDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICB7ZGVmZW5kZXJFbmhhbmNlbWVudE5hbWUgPT09ICdQZW5uYW50IG9mIFJlbWVtYnJhbmNlJyA/IChcbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiY2hlY2tib3gtcm93XCIgdGl0bGU9e2RlZmVuZGVyQmF0dGxlc2hvY2tlZFRvb2x0aXB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2RlZmVuZGVyQmF0dGxlc2hvY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0RGVmZW5kZXJCYXR0bGVzaG9ja2VkKGV2ZW50LnRhcmdldC5jaGVja2VkKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5EZWZlbmRlciBpcyBCYXR0bGUtc2hvY2tlZDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICB7Y2FuVXNlUHJlY2lzaW9uID8gKFxuICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICA8bGFiZWwgdGl0bGU9e2F0dGFjaGVkQ2hhcmFjdGVyVG9vbHRpcH0+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPkF0dGFjaGVkIENoYXJhY3Rlcjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNlbGVjdFxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXthdHRhY2hlZENoYXJhY3RlclRvb2x0aXB9XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2F0dGFjaGVkQ2hhcmFjdGVyTmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRBdHRhY2hlZENoYXJhY3Rlck5hbWUoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj5ObyBhdHRhY2hlZCBjaGFyYWN0ZXI8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICB7YXR0YWNoZWRDaGFyYWN0ZXJPcHRpb25zLm1hcCgodW5pdCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiBrZXk9e3VuaXQubmFtZX0gdmFsdWU9e3VuaXQubmFtZX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHt1bml0Lm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICAgICAgICB7cmVuZGVyTG9hZG91dFNlbGVjdG9ycyhcbiAgICAgICAgICAgICAgICAgICAgJ0F0dGFjaGVkIENoYXJhY3RlcicsXG4gICAgICAgICAgICAgICAgICAgIGF0dGFjaGVkQ2hhcmFjdGVyVW5pdERldGFpbHMsXG4gICAgICAgICAgICAgICAgICAgIGF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgIHNldEF0dGFjaGVkQ2hhcmFjdGVyTG9hZG91dFNlbGVjdGlvbnMsXG4gICAgICAgICAgICAgICAgICApfVxuXG4gICAgICAgICAgICAgICAgICB7cmVuZGVyTW9kZWxDb3VudFNlbGVjdG9yKFxuICAgICAgICAgICAgICAgICAgICAnQXR0YWNoZWQgQ2hhcmFjdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgYXR0YWNoZWRDaGFyYWN0ZXJVbml0RGV0YWlscyxcbiAgICAgICAgICAgICAgICAgICAgYXR0YWNoZWRDaGFyYWN0ZXJNb2RlbENvdW50LFxuICAgICAgICAgICAgICAgICAgICBzZXRBdHRhY2hlZENoYXJhY3Rlck1vZGVsQ291bnQsXG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICB7aGFzSGF6YXJkb3VzID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJjaGVja2JveC1yb3dcIiB0aXRsZT17aGF6YXJkb3VzT3ZlcndhdGNoVG9vbHRpcH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZD17aGF6YXJkb3VzT3ZlcndhdGNoQ2hhcmdlUGhhc2V9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEhhemFyZG91c092ZXJ3YXRjaENoYXJnZVBoYXNlKGV2ZW50LnRhcmdldC5jaGVja2VkKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5Vc2VkIEZpcmUgT3ZlcndhdGNoIGluIG9wcG9uZW50IGNoYXJnZSBwaGFzZTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICB7aGFzSGF6YXJkb3VzID8gKFxuICAgICAgICAgICAgICAgIDxsYWJlbCB0aXRsZT17aGF6YXJkb3VzQmVhcmVyVG9vbHRpcH0+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5IYXphcmRvdXMgQmVhcmVyIEN1cnJlbnQgV291bmRzPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXtoYXphcmRvdXNCZWFyZXJUb29sdGlwfVxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgICAgICAgICAgICAgbWluPVwiMFwiXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlPXtoYXphcmRvdXNCZWFyZXJDdXJyZW50V291bmRzfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRIYXphcmRvdXNCZWFyZXJDdXJyZW50V291bmRzKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cInN1Ym1pdFwiIGNsYXNzTmFtZT1cInByaW1hcnktYnV0dG9uXCIgZGlzYWJsZWQ9eyFyZWFkeVRvU2ltdWxhdGUgfHwgc2ltdWxhdGluZ30+XG4gICAgICAgICAgICAgIHtzaW11bGF0aW5nID8gJ1J1bm5pbmcgU2ltdWxhdGlvbnMuLi4nIDogJ1J1biBTaW11bGF0aW9ucyd9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJwYW5lbCBkYXRhLXBhbmVsXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkaW5nXCI+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJraWNrZXJcIj5SZWZlcmVuY2U8L3A+XG4gICAgICAgICAgICAgIDxoMj5EYXRhc2hlZXRzPC9oMj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzbmFwc2hvdC1ncmlkXCI+XG4gICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJkYXRhc2hlZXQtY2FyZFwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJraWNrZXJcIj5BdHRhY2tlcjwvcD5cbiAgICAgICAgICAgICAgPGgzPnthdHRhY2tlclVuaXREZXRhaWxzPy5uYW1lIHx8ICdObyB1bml0IHNlbGVjdGVkJ308L2gzPlxuICAgICAgICAgICAgICA8cD57YXR0YWNrZXJGYWN0aW9uIHx8ICdGYWN0aW9uIG5vdCBzZXQnfTwvcD5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNlY29uZGFyeS1idXR0b24gYXJteS1saXN0LWJ1dHRvblwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gYWRkVW5pdFRvQXJteUxpc3QoYXR0YWNrZXJVbml0RGV0YWlscywgYXR0YWNrZXJGYWN0aW9uKX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17IWF0dGFja2VyVW5pdERldGFpbHMgfHwgIWF0dGFja2VyRmFjdGlvbn1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIEFkZCBUbyBBcm15IExpc3RcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGF0YXNoZWV0LXN0YXRzXCI+XG4gICAgICAgICAgICAgICAge3JlbmRlclN0YXRzR3JpZChhdHRhY2tlclVuaXREZXRhaWxzPy5zdGF0cyl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFjdGl2ZS1ydWxlc1wiPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPkFjdGl2ZSBSdWxlczwvcD5cbiAgICAgICAgICAgICAgICB7YXR0YWNrZXJBY3RpdmVSdWxlcy5sZW5ndGggPyAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFjdGl2ZS1ydWxlLWxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAge2F0dGFja2VyQWN0aXZlUnVsZXMubWFwKChydWxlKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGFydGljbGUga2V5PXtgJHtydWxlLnNvdXJjZX0tJHtydWxlLm5hbWV9YH0gY2xhc3NOYW1lPVwiYWN0aXZlLXJ1bGUtY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhY3RpdmUtcnVsZS1oZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGg0PntydWxlLm5hbWV9PC9oND5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWN0aXZlLXJ1bGUtc291cmNlXCI+e3J1bGUuc291cmNlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+e3J1bGUudGV4dH08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhY3RpdmUtcnVsZS1lbXB0eVwiPk5vIGFjdGl2ZSBydWxlcyBhZmZlY3RpbmcgdGhpcyBhdHRhY2suPC9wPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9hcnRpY2xlPlxuXG4gICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJkYXRhc2hlZXQtY2FyZFwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJraWNrZXJcIj5EZWZlbmRlcjwvcD5cbiAgICAgICAgICAgICAgPGgzPntkZWZlbmRlclVuaXREZXRhaWxzPy5uYW1lIHx8ICdObyB1bml0IHNlbGVjdGVkJ308L2gzPlxuICAgICAgICAgICAgICA8cD57ZGVmZW5kZXJGYWN0aW9uIHx8ICdGYWN0aW9uIG5vdCBzZXQnfTwvcD5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNlY29uZGFyeS1idXR0b24gYXJteS1saXN0LWJ1dHRvblwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gYWRkVW5pdFRvQXJteUxpc3QoZGVmZW5kZXJVbml0RGV0YWlscywgZGVmZW5kZXJGYWN0aW9uKX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17IWRlZmVuZGVyVW5pdERldGFpbHMgfHwgIWRlZmVuZGVyRmFjdGlvbn1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIEFkZCBUbyBBcm15IExpc3RcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGF0YXNoZWV0LXN0YXRzXCI+XG4gICAgICAgICAgICAgICAge3JlbmRlclN0YXRzR3JpZChkZWZlbmRlclVuaXREZXRhaWxzPy5zdGF0cyl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFjdGl2ZS1ydWxlc1wiPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPkFjdGl2ZSBSdWxlczwvcD5cbiAgICAgICAgICAgICAgICB7ZGVmZW5kZXJBY3RpdmVSdWxlcy5sZW5ndGggPyAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFjdGl2ZS1ydWxlLWxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAge2RlZmVuZGVyQWN0aXZlUnVsZXMubWFwKChydWxlKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGFydGljbGUga2V5PXtgJHtydWxlLnNvdXJjZX0tJHtydWxlLm5hbWV9YH0gY2xhc3NOYW1lPVwiYWN0aXZlLXJ1bGUtY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhY3RpdmUtcnVsZS1oZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGg0PntydWxlLm5hbWV9PC9oND5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWN0aXZlLXJ1bGUtc291cmNlXCI+e3J1bGUuc291cmNlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+e3J1bGUudGV4dH08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhY3RpdmUtcnVsZS1lbXB0eVwiPk5vIGFjdGl2ZSBydWxlcyBhZmZlY3RpbmcgdGhpcyBhdHRhY2suPC9wPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAge3NpbXVsYXRpb25SdW5zLmxlbmd0aCA/IChcbiAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicnVuLXRhYnNcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHJ1bi10YWIgJHthY3RpdmVSdW5WaWV3ID09PSAnc3VtbWFyeScgPyAnYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVSdW5WaWV3KCdzdW1tYXJ5Jyl9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgU3VtbWFyeVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIHtzaW11bGF0aW9uUnVucy5tYXAoKHJ1bikgPT4gKFxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBrZXk9e3J1bi5ydW5JbmRleH1cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHJ1bi10YWIgJHthY3RpdmVSdW5WaWV3ID09PSBydW4ucnVuSW5kZXggPyAnYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVJ1blZpZXcocnVuLnJ1bkluZGV4KX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgUnVuIHtydW4ucnVuSW5kZXh9XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAge2FjdGl2ZVJ1blZpZXcgPT09ICdzdW1tYXJ5JyA/IChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm91dGNvbWUtZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgPGFydGljbGUgY2xhc3NOYW1lPVwicmVzdWx0LWNhcmQgYWNjZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPlRhcmdldCBTdW1tYXJ5PC9wPlxuICAgICAgICAgICAgICAgICAgICA8aDM+e2RlZmVuZGVyVW5pdCB8fCAnRGVmZW5kZXInfTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDxwPntzdW1tYXJ5U3RhdHMudG90YWxSdW5zfSBydW5zIGNvbXBsZXRlZDwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+RGVzdHJveWVkOiB7c3VtbWFyeVN0YXRzLnRhcmdldERlc3Ryb3llZENvdW50fSAoe2Zvcm1hdFBlcmNlbnQoc3VtbWFyeVN0YXRzLnRhcmdldERlc3Ryb3llZENvdW50LCBzdW1tYXJ5U3RhdHMudG90YWxSdW5zKX0pPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5BdmcgbW9kZWxzIHJlbWFpbmluZzoge2Zvcm1hdEF2ZXJhZ2Uoc3VtbWFyeVN0YXRzLmF2ZXJhZ2VUYXJnZXRNb2RlbHNSZW1haW5pbmcpfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+QXZnIGN1cnJlbnQgbW9kZWwgd291bmRzOiB7Zm9ybWF0QXZlcmFnZShzdW1tYXJ5U3RhdHMuYXZlcmFnZVRhcmdldEN1cnJlbnRXb3VuZHMpfTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgICAgICAgICAgICAgPGFydGljbGUgY2xhc3NOYW1lPVwicmVzdWx0LWNhcmRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+SGl0IEJyZWFrZG93bjwvcD5cbiAgICAgICAgICAgICAgICAgICAgPGgzPkFjY3VyYWN5PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHA+QXR0YWNrIGluc3RhbmNlczoge3N1bW1hcnlTdGF0cy5jb21iYXQuYXR0YWNrSW5zdGFuY2VzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+SGl0cyBsYW5kZWQ6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LnN1Y2Nlc3NmdWxIaXRBdHRhY2tzICsgc3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvSGl0QXR0YWNrc30gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuc3VjY2Vzc2Z1bEhpdEF0dGFja3MgKyBzdW1tYXJ5U3RhdHMuY29tYmF0LmF1dG9IaXRBdHRhY2tzLCBzdW1tYXJ5U3RhdHMuY29tYmF0LmF0dGFja0luc3RhbmNlcyl9KTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+QXV0by1oaXRzOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvSGl0QXR0YWNrc308L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwPkNyaXRpY2FsIGhpdHM6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LmNyaXRpY2FsSGl0QXR0YWNrc30gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuY3JpdGljYWxIaXRBdHRhY2tzLCBzdW1tYXJ5U3RhdHMuY29tYmF0LmF0dGFja0luc3RhbmNlcyl9KTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+RXh0cmEgaGl0cyBnZW5lcmF0ZWQ6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LmV4dHJhSGl0c0dlbmVyYXRlZH08L3A+XG4gICAgICAgICAgICAgICAgICA8L2FydGljbGU+XG5cbiAgICAgICAgICAgICAgICAgIDxhcnRpY2xlIGNsYXNzTmFtZT1cInJlc3VsdC1jYXJkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPldvdW5kIEJyZWFrZG93bjwvcD5cbiAgICAgICAgICAgICAgICAgICAgPGgzPkNvbnZlcnNpb248L2gzPlxuICAgICAgICAgICAgICAgICAgICA8cD5Xb3VuZCByb2xscyBtYWRlOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC53b3VuZFJvbGxzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+U3VjY2Vzc2Z1bCB3b3VuZCByb2xsczoge3N1bW1hcnlTdGF0cy5jb21iYXQuc3VjY2Vzc2Z1bFdvdW5kUm9sbHN9ICh7Zm9ybWF0UGVyY2VudChzdW1tYXJ5U3RhdHMuY29tYmF0LnN1Y2Nlc3NmdWxXb3VuZFJvbGxzLCBzdW1tYXJ5U3RhdHMuY29tYmF0LndvdW5kUm9sbHMpfSk8L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwPkF1dG8td291bmRzOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvV291bmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+Q3JpdGljYWwgd291bmRzOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5jcml0aWNhbFdvdW5kc30gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuY3JpdGljYWxXb3VuZHMsIHN1bW1hcnlTdGF0cy5jb21iYXQud291bmRSb2xscyArIHN1bW1hcnlTdGF0cy5jb21iYXQuYXV0b1dvdW5kcyl9KTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+VG90YWwgd291bmRzIGNyZWF0ZWQ6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LnN1Y2Nlc3NmdWxXb3VuZFJvbGxzICsgc3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvV291bmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgICAgICAgICAgICAgPGFydGljbGUgY2xhc3NOYW1lPVwicmVzdWx0LWNhcmRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+U2F2ZSBCcmVha2Rvd248L3A+XG4gICAgICAgICAgICAgICAgICAgIDxoMz5EZWZlbnNlPC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHA+U2F2ZSBhdHRlbXB0czoge3N1bW1hcnlTdGF0cy5jb21iYXQuc2F2ZUF0dGVtcHRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+RmFpbGVkIHNhdmVzOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5zYXZlc0ZhaWxlZH0gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuc2F2ZXNGYWlsZWQsIHN1bW1hcnlTdGF0cy5jb21iYXQuc2F2ZUF0dGVtcHRzKX0pPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5QYXNzZWQgc2F2ZXM6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LnNhdmVzUGFzc2VkfSAoe2Zvcm1hdFBlcmNlbnQoc3VtbWFyeVN0YXRzLmNvbWJhdC5zYXZlc1Bhc3NlZCwgc3VtbWFyeVN0YXRzLmNvbWJhdC5zYXZlQXR0ZW1wdHMpfSk8L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwPlVuc2F2YWJsZSB3b3VuZHM6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LnVuc2F2YWJsZVdvdW5kc308L3A+XG4gICAgICAgICAgICAgICAgICA8L2FydGljbGU+XG5cbiAgICAgICAgICAgICAgICAgIDxhcnRpY2xlIGNsYXNzTmFtZT1cInJlc3VsdC1jYXJkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPlJlLXJvbGwgQnJlYWtkb3duPC9wPlxuICAgICAgICAgICAgICAgICAgICA8aDM+RWZmaWNpZW5jeTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDxwPkhpdCByZS1yb2xscyB1c2VkOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5oaXRSZXJvbGxzVXNlZH08L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwPkhpdCByZS1yb2xsIHN1Y2Nlc3M6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LmhpdFJlcm9sbFN1Y2Nlc3Nlc30gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuaGl0UmVyb2xsU3VjY2Vzc2VzLCBzdW1tYXJ5U3RhdHMuY29tYmF0LmhpdFJlcm9sbHNVc2VkKX0pPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5Xb3VuZCByZS1yb2xscyB1c2VkOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC53b3VuZFJlcm9sbHNVc2VkfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+V291bmQgcmUtcm9sbCBzdWNjZXNzOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC53b3VuZFJlcm9sbFN1Y2Nlc3Nlc30gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQud291bmRSZXJvbGxTdWNjZXNzZXMsIHN1bW1hcnlTdGF0cy5jb21iYXQud291bmRSZXJvbGxzVXNlZCl9KTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgICAgICAgICAgICAge3N1bW1hcnlTdGF0cy5hdHRhY2hlZENoYXJhY3RlclJ1bnMgPiAwID8gKFxuICAgICAgICAgICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJyZXN1bHQtY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPkF0dGFjaGVkIENoYXJhY3RlciBTdW1tYXJ5PC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMz57YXR0YWNoZWRDaGFyYWN0ZXJOYW1lIHx8ICdBdHRhY2hlZCBDaGFyYWN0ZXInfTwvaDM+XG4gICAgICAgICAgICAgICAgICAgICAgPHA+VHJhY2tlZCBpbiB7c3VtbWFyeVN0YXRzLmF0dGFjaGVkQ2hhcmFjdGVyUnVuc30gcnVuczwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8cD5EZXN0cm95ZWQ6IHtzdW1tYXJ5U3RhdHMuYXR0YWNoZWRDaGFyYWN0ZXJEZXN0cm95ZWRDb3VudH0gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5hdHRhY2hlZENoYXJhY3RlckRlc3Ryb3llZENvdW50LCBzdW1tYXJ5U3RhdHMuYXR0YWNoZWRDaGFyYWN0ZXJSdW5zKX0pPC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxwPkF2ZyBjdXJyZW50IHdvdW5kczoge2Zvcm1hdEF2ZXJhZ2Uoc3VtbWFyeVN0YXRzLmF2ZXJhZ2VBdHRhY2hlZENoYXJhY3RlcldvdW5kcyl9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2FydGljbGU+XG4gICAgICAgICAgICAgICAgICApIDogbnVsbH1cblxuICAgICAgICAgICAgICAgICAge3N1bW1hcnlTdGF0cy5oYXphcmRvdXNCZWFyZXJSdW5zID4gMCA/IChcbiAgICAgICAgICAgICAgICAgICAgPGFydGljbGUgY2xhc3NOYW1lPVwicmVzdWx0LWNhcmQgd2FybmluZ1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPkhhemFyZG91cyBTdW1tYXJ5PC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMz57YXR0YWNrZXJVbml0IHx8ICdIYXphcmRvdXMgQmVhcmVyJ308L2gzPlxuICAgICAgICAgICAgICAgICAgICAgIDxwPlRyaWdnZXJlZCBpbiB7c3VtbWFyeVN0YXRzLmhhemFyZG91c0JlYXJlclJ1bnN9IHJ1bnM8L3A+XG4gICAgICAgICAgICAgICAgICAgICAgPHA+RGVzdHJveWVkOiB7c3VtbWFyeVN0YXRzLmhhemFyZG91c0JlYXJlckRlc3Ryb3llZENvdW50fSAoe2Zvcm1hdFBlcmNlbnQoc3VtbWFyeVN0YXRzLmhhemFyZG91c0JlYXJlckRlc3Ryb3llZENvdW50LCBzdW1tYXJ5U3RhdHMuaGF6YXJkb3VzQmVhcmVyUnVucyl9KTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8cD5BdmcgY3VycmVudCB3b3VuZHM6IHtmb3JtYXRBdmVyYWdlKHN1bW1hcnlTdGF0cy5hdmVyYWdlSGF6YXJkb3VzQmVhcmVyV291bmRzKX08L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvYXJ0aWNsZT5cbiAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApIDogYWN0aXZlUnVuID8gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwib3V0Y29tZS1ncmlkXCI+XG4gICAgICAgICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJyZXN1bHQtY2FyZCBhY2NlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+UnVuIHthY3RpdmVSdW4ucnVuSW5kZXh9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8aDM+e2FjdGl2ZVJ1bi5yZXN1bHQudGFyZ2V0Lm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAge2FjdGl2ZVJ1bi5yZXN1bHQudGFyZ2V0LmRlc3Ryb3llZFxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnRGVzdHJveWVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgOiBgJHthY3RpdmVSdW4ucmVzdWx0LnRhcmdldC5tb2RlbHNfcmVtYWluaW5nfSBtb2RlbHMgcmVtYWluYH1cbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5DdXJyZW50IG1vZGVsIHdvdW5kczoge2FjdGl2ZVJ1bi5yZXN1bHQudGFyZ2V0LmN1cnJlbnRfbW9kZWxfd291bmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgICAgICAgICAgICAge2FjdGl2ZVJ1bi5yZXN1bHQuYXR0YWNoZWRfY2hhcmFjdGVyID8gKFxuICAgICAgICAgICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJyZXN1bHQtY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPkF0dGFjaGVkIENoYXJhY3RlcjwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8aDM+e2FjdGl2ZVJ1bi5yZXN1bHQuYXR0YWNoZWRfY2hhcmFjdGVyLm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgIHthY3RpdmVSdW4ucmVzdWx0LmF0dGFjaGVkX2NoYXJhY3Rlci5kZXN0cm95ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPyAnRGVzdHJveWVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICA6IGAke2FjdGl2ZVJ1bi5yZXN1bHQuYXR0YWNoZWRfY2hhcmFjdGVyLm1vZGVsc19yZW1haW5pbmd9IG1vZGVsIHJlbWFpbnNgfVxuICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8cD5DdXJyZW50IHdvdW5kczoge2FjdGl2ZVJ1bi5yZXN1bHQuYXR0YWNoZWRfY2hhcmFjdGVyLmN1cnJlbnRfbW9kZWxfd291bmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAgICAgIHthY3RpdmVSdW4ucmVzdWx0LmhhemFyZG91c19iZWFyZXIgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxhcnRpY2xlIGNsYXNzTmFtZT1cInJlc3VsdC1jYXJkIHdhcm5pbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJraWNrZXJcIj5IYXphcmRvdXMgQmVhcmVyPC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMz57YWN0aXZlUnVuLnJlc3VsdC5oYXphcmRvdXNfYmVhcmVyLm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgIHthY3RpdmVSdW4ucmVzdWx0LmhhemFyZG91c19iZWFyZXIuZGVzdHJveWVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgID8gJ0Rlc3Ryb3llZCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgOiBgJHthY3RpdmVSdW4ucmVzdWx0LmhhemFyZG91c19iZWFyZXIubW9kZWxzX3JlbWFpbmluZ30gbW9kZWwgcmVtYWluc2B9XG4gICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxwPkN1cnJlbnQgd291bmRzOiB7YWN0aXZlUnVuLnJlc3VsdC5oYXphcmRvdXNfYmVhcmVyLmN1cnJlbnRfbW9kZWxfd291bmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgPC8+XG4gICAgICAgICAgKSA6IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZW1wdHktc3RhdGVcIj5cbiAgICAgICAgICAgICAgPHA+UnVuIG9uZSBvciBtb3JlIHNpbXVsYXRpb25zIHRvIHNlZSBzdW1tYXJ5IHN0YXRpc3RpY3MgYW5kIGluZGl2aWR1YWwgY29tYmF0IGxvZ3MuPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgICAgICAgIDwvbWFpbj5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInBhbmVsIGxvZy1wYW5lbFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkaW5nXCI+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+UmVzb2x1dGlvbjwvcD5cbiAgICAgICAgICAgICAgICA8aDI+e2FjdGl2ZVJ1blZpZXcgPT09ICdzdW1tYXJ5JyA/ICdSdW4gSW5kZXgnIDogYENvbWJhdCBMb2c6IFJ1biAke2FjdGl2ZVJ1blZpZXd9YH08L2gyPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7c2ltdWxhdGlvblJ1bnMubGVuZ3RoICYmIGFjdGl2ZVJ1blZpZXcgPT09ICdzdW1tYXJ5JyA/IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzdW1tYXJ5LWluZGV4XCI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwic3VtbWFyeS1pbmRleC1jb3B5XCI+XG4gICAgICAgICAgICAgICAgICBVc2UgdGhlIHRhYnMgYWJvdmUgdG8gc3dpdGNoIGJldHdlZW4gdGhlIHN1bW1hcnkgcGFnZSBhbmQgZWFjaCBpbmRpdmlkdWFsIHJ1bi5cbiAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzdW1tYXJ5LWluZGV4LWdyaWRcIj5cbiAgICAgICAgICAgICAgICAgIHtzaW11bGF0aW9uUnVucy5tYXAoKHJ1bikgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAga2V5PXtydW4ucnVuSW5kZXh9XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic3VtbWFyeS1pbmRleC1jYXJkXCJcbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVSdW5WaWV3KHJ1bi5ydW5JbmRleCl9XG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPlJ1biB7cnVuLnJ1bkluZGV4fTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPntydW4ucmVzdWx0LnRhcmdldC5kZXN0cm95ZWQgPyAnVGFyZ2V0IGRlc3Ryb3llZCcgOiBgJHtydW4ucmVzdWx0LnRhcmdldC5tb2RlbHNfcmVtYWluaW5nfSBtb2RlbHMgcmVtYWluYH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4+Q3VycmVudCB3b3VuZHM6IHtydW4ucmVzdWx0LnRhcmdldC5jdXJyZW50X21vZGVsX3dvdW5kc308L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSA6IGFjdGl2ZVJ1bj8ucmVzdWx0Py5sb2c/Lmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgPG9sIGNsYXNzTmFtZT1cImNvbWJhdC1sb2dcIj5cbiAgICAgICAgICAgICAgICB7YWN0aXZlUnVuLnJlc3VsdC5sb2cubWFwKChsaW5lLCBpbmRleCkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGxpIGtleT17YCR7aW5kZXh9LSR7bGluZX1gfT57bGluZX08L2xpPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L29sPlxuICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJlbXB0eS1zdGF0ZSBjb21wYWN0XCI+XG4gICAgICAgICAgICAgICAgPHA+VGhlIHJ1biBpbmRleCBhbmQgY29tYmF0IGxvZ3Mgd2lsbCBhcHBlYXIgaGVyZSBhZnRlciBhIHNpbXVsYXRpb24uPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9zZWN0aW9uPlxuICAgICAgICA8Lz5cbiAgICAgICkgOiBhY3RpdmVQYWdlID09PSAnYmF0dGxlZmllbGQnID8gKFxuICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJwYW5lbCBiYXR0bGVmaWVsZC1wYW5lbFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGluZ1wiPlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+VGFibGV0b3A8L3A+XG4gICAgICAgICAgICAgIDxoMj5CYXR0bGVmaWVsZDwvaDI+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmF0dGxlZmllbGQtbWV0YVwiPlxuICAgICAgICAgICAgICA8c3Bhbj42MCZxdW90OyB4IDQ0JnF1b3Q7PC9zcGFuPlxuICAgICAgICAgICAgICA8c3Bhbj5Ub3AtRG93biBWaWV3PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJhdHRsZWZpZWxkLWJvYXJkLXNoZWxsXCI+XG4gICAgICAgICAgICA8ZGl2IHJlZj17YmF0dGxlZmllbGRCb2FyZFJlZn0gY2xhc3NOYW1lPVwiYmF0dGxlZmllbGQtYm9hcmRcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1jZW50ZXItbGluZVwiIC8+XG4gICAgICAgICAgICAgIHtzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdCAmJiAhYmF0dGxlZmllbGRJbkVuZ2FnZW1lbnRSYW5nZSA/IHNlbGVjdGVkQmF0dGxlZmllbGRXZWFwb25SYW5nZXMubWFwKCh3ZWFwb24sIGluZGV4KSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAga2V5PXtgJHtzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdC5pZH0tJHt3ZWFwb24ubmFtZX1gfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYmF0dGxlZmllbGQtcmFuZ2UtcmluZyAke2luUmFuZ2VXZWFwb25OYW1lcy5pbmNsdWRlcyhmb3JtYXRXZWFwb25OYW1lKHdlYXBvbikpID8gJ2luLXJhbmdlJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBgJHtiYXR0bGVmaWVsZFBvc2l0aW9uc1tzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdC5pZF0/LnggPz8gc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQueH0lYCxcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBgJHtiYXR0bGVmaWVsZFBvc2l0aW9uc1tzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdC5pZF0/LnkgPz8gc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQueX0lYCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGAkeyh3ZWFwb24udG90YWxEaWFtZXRlckluY2hlcyAvIEJBVFRMRUZJRUxEX1dJRFRIX0lOQ0hFUykgKiAxMDB9JWAsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogYCR7KHdlYXBvbi50b3RhbERpYW1ldGVySW5jaGVzIC8gQkFUVExFRklFTERfSEVJR0hUX0lOQ0hFUykgKiAxMDB9JWAsXG4gICAgICAgICAgICAgICAgICAgIHpJbmRleDogc2VsZWN0ZWRCYXR0bGVmaWVsZFdlYXBvblJhbmdlcy5sZW5ndGggLSBpbmRleCxcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgKSkgOiBudWxsfVxuICAgICAgICAgICAgICB7c2hvd0JhdHRsZWZpZWxkUmFuZ2VMaW5lID8gKFxuICAgICAgICAgICAgICAgIDxzdmcgY2xhc3NOYW1lPVwiYmF0dGxlZmllbGQtcmFuZ2UtbGluZS1sYXllclwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCI+XG4gICAgICAgICAgICAgICAgICA8bGluZVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1yYW5nZS1saW5lXCJcbiAgICAgICAgICAgICAgICAgICAgeDE9e2JhdHRsZWZpZWxkUG9zaXRpb25zW3NlbGVjdGVkQmF0dGxlZmllbGRVbml0LmlkXT8ueCA/PyBzZWxlY3RlZEJhdHRsZWZpZWxkVW5pdC54fVxuICAgICAgICAgICAgICAgICAgICB5MT17YmF0dGxlZmllbGRQb3NpdGlvbnNbc2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQuaWRdPy55ID8/IHNlbGVjdGVkQmF0dGxlZmllbGRVbml0Lnl9XG4gICAgICAgICAgICAgICAgICAgIHgyPXtiYXR0bGVmaWVsZFBvc2l0aW9uc1tlbmVteUJhdHRsZWZpZWxkVW5pdC5pZF0/LnggPz8gZW5lbXlCYXR0bGVmaWVsZFVuaXQueH1cbiAgICAgICAgICAgICAgICAgICAgeTI9e2JhdHRsZWZpZWxkUG9zaXRpb25zW2VuZW15QmF0dGxlZmllbGRVbml0LmlkXT8ueSA/PyBlbmVteUJhdHRsZWZpZWxkVW5pdC55fVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgIHtiYXR0bGVmaWVsZFVuaXRzLm1hcCgodW5pdCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgIGtleT17dW5pdC5pZH1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGJhdHRsZWZpZWxkLXVuaXQgYmF0dGxlZmllbGQtdW5pdC0ke3VuaXQuaWR9ICR7ZHJhZ2dpbmdVbml0SWQgPT09IHVuaXQuaWQgPyAnZHJhZ2dpbmcnIDogJyd9ICR7c2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXRJZCA9PT0gdW5pdC5pZCA/ICdzZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogYCR7YmF0dGxlZmllbGRQb3NpdGlvbnNbdW5pdC5pZF0/LnggPz8gdW5pdC54fSVgLFxuICAgICAgICAgICAgICAgICAgICB0b3A6IGAke2JhdHRsZWZpZWxkUG9zaXRpb25zW3VuaXQuaWRdPy55ID8/IHVuaXQueX0lYCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGAkeyh1bml0LmJhc2VJbmNoZXMgLyBCQVRUTEVGSUVMRF9XSURUSF9JTkNIRVMpICogMTAwfSVgLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGAkeyh1bml0LmJhc2VJbmNoZXMgLyBCQVRUTEVGSUVMRF9IRUlHSFRfSU5DSEVTKSAqIDEwMH0lYCxcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtoYW5kbGVCYXR0bGVmaWVsZFVuaXRQb2ludGVyRG93bih1bml0LmlkKX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJhdHRsZWZpZWxkLXVuaXQtZG90XCIgLz5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmF0dGxlZmllbGQtdW5pdC1sYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPnt1bml0Lm5hbWV9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPnt1bml0LnJvbGV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj57dW5pdC5iYXNlTW19bW0gYmFzZTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1yYW5nZS1zdW1tYXJ5XCI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJraWNrZXJcIj5TZWxlY3RlZCBVbml0IFJhbmdlczwvcD5cbiAgICAgICAgICAgIDxoMz57c2VsZWN0ZWRCYXR0bGVmaWVsZFVuaXQ/Lm5hbWUgfHwgJ05vIHVuaXQgc2VsZWN0ZWQnfTwvaDM+XG4gICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAge2JhdHRsZWZpZWxkRWRnZURpc3RhbmNlSW5jaGVzID09PSBudWxsXG4gICAgICAgICAgICAgICAgPyAnU2VsZWN0IGEgdW5pdCBtYXJrZXIgdG8gaW5zcGVjdCBpdHMgd2VhcG9uIHJhbmdlcy4nXG4gICAgICAgICAgICAgICAgOiBiYXR0bGVmaWVsZEluRW5nYWdlbWVudFJhbmdlXG4gICAgICAgICAgICAgICAgICA/IGBFbmVteSBkaXN0YW5jZTogJHtiYXR0bGVmaWVsZEVkZ2VEaXN0YW5jZUluY2hlcy50b0ZpeGVkKDEpfVwiLiBVbml0cyBhcmUgaW4gRW5nYWdlbWVudCBSYW5nZS5gXG4gICAgICAgICAgICAgICAgICA6IGBFbmVteSBkaXN0YW5jZTogJHtiYXR0bGVmaWVsZEVkZ2VEaXN0YW5jZUluY2hlcy50b0ZpeGVkKDEpfVwiLmB9XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICB7YmF0dGxlZmllbGRJbkVuZ2FnZW1lbnRSYW5nZSA/IChcbiAgICAgICAgICAgICAgKHNlbGVjdGVkQmF0dGxlZmllbGRNZWxlZVdlYXBvbnMubGVuZ3RoIHx8IHNlbGVjdGVkQmF0dGxlZmllbGRQaXN0b2xXZWFwb25zLmxlbmd0aCkgPyAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1yYW5nZS1saXN0XCI+XG4gICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRCYXR0bGVmaWVsZE1lbGVlV2VhcG9ucy5tYXAoKHdlYXBvbikgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgICAga2V5PXtgbWVsZWUtJHt3ZWFwb24ubmFtZX1gfVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJhdHRsZWZpZWxkLXJhbmdlLWxpc3QtaXRlbSBlbmdhZ2VkXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+e2Zvcm1hdFdlYXBvbk5hbWUod2VhcG9uKX08L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5NZWxlZTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIHtzZWxlY3RlZEJhdHRsZWZpZWxkUGlzdG9sV2VhcG9ucy5tYXAoKHdlYXBvbikgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgICAga2V5PXtgcGlzdG9sLSR7d2VhcG9uLm5hbWV9YH1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1yYW5nZS1saXN0LWl0ZW0gZW5nYWdlZCBwaXN0b2xcIlxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz57Zm9ybWF0V2VhcG9uTmFtZSh3ZWFwb24pfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPlBpc3RvbDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICA8cD5ObyBtZWxlZSBvciBwaXN0b2wgd2VhcG9ucyBhdmFpbGFibGUuPC9wPlxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApIDogc2VsZWN0ZWRCYXR0bGVmaWVsZFdlYXBvblJhbmdlcy5sZW5ndGggPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmF0dGxlZmllbGQtcmFuZ2UtbGlzdFwiPlxuICAgICAgICAgICAgICAgIHtzZWxlY3RlZEJhdHRsZWZpZWxkV2VhcG9uUmFuZ2VzLm1hcCgod2VhcG9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB3ZWFwb25JblJhbmdlID0gaW5SYW5nZVdlYXBvbk5hbWVzLmluY2x1ZGVzKGZvcm1hdFdlYXBvbk5hbWUod2VhcG9uKSlcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHdlYXBvbkluSGFsZlJhbmdlID0gaGFsZlJhbmdlV2VhcG9uTmFtZXMuaW5jbHVkZXMoZm9ybWF0V2VhcG9uTmFtZSh3ZWFwb24pKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICAgIGtleT17YHN1bW1hcnktJHt3ZWFwb24ubmFtZX1gfVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGJhdHRsZWZpZWxkLXJhbmdlLWxpc3QtaXRlbSAke3dlYXBvbkluUmFuZ2UgPyAnaW4tcmFuZ2UnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmF0dGxlZmllbGQtcmFuZ2UtbGlzdC1jb3B5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPntmb3JtYXRXZWFwb25OYW1lKHdlYXBvbil9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICB7d2VhcG9uLmhhc0hhbGZSYW5nZVJ1bGUgPyAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YGJhdHRsZWZpZWxkLWhhbGYtcmFuZ2UtYmFkZ2UgJHt3ZWFwb25JbkhhbGZSYW5nZSA/ICdhY3RpdmUnIDogJyd9YH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgSGFsZiBSYW5nZSB7d2VhcG9uLmhhbGZSYW5nZUluY2hlc31cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57d2VhcG9uLnJhbmdlSW5jaGVzfVwiPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8cD5ObyByYW5nZWQgd2VhcG9ucyB0byBkaXNwbGF5LjwvcD5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICB7IWJhdHRsZWZpZWxkSW5FbmdhZ2VtZW50UmFuZ2UgJiYgc2hvd0JhdHRsZWZpZWxkUmFuZ2VMaW5lID8gKFxuICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICBJbiByYW5nZToge2luUmFuZ2VXZWFwb25OYW1lcy5qb2luKCcsICcpfVxuICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICApIDogIWJhdHRsZWZpZWxkSW5FbmdhZ2VtZW50UmFuZ2UgJiYgYmF0dGxlZmllbGRFZGdlRGlzdGFuY2VJbmNoZXMgIT09IG51bGwgPyAoXG4gICAgICAgICAgICAgIDxwPk5vIHJhbmdlZCB3ZWFwb25zIGN1cnJlbnRseSByZWFjaCB0aGUgZW5lbXkgdW5pdC48L3A+XG4gICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgIHshYmF0dGxlZmllbGRJbkVuZ2FnZW1lbnRSYW5nZSAmJiBoYWxmUmFuZ2VXZWFwb25OYW1lcy5sZW5ndGggPyAoXG4gICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIFdpdGhpbiBoYWxmIHJhbmdlOiB7aGFsZlJhbmdlV2VhcG9uTmFtZXMuam9pbignLCAnKX1cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJhdHRsZWZpZWxkLWNvbWJhdC1wYW5lbFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYW5lbC1oZWFkaW5nXCI+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+QmF0dGxlZmllbGQgU2ltPC9wPlxuICAgICAgICAgICAgICAgIDxoMj5FbGlnaWJsZSBDb21iYXQ8L2gyPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7YmF0dGxlZmllbGRDb21iYXRPcHRpb25zLmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1jb21iYXQtZ3JpZFwiPlxuICAgICAgICAgICAgICAgIDxsYWJlbD5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPkVsaWdpYmxlIENvbWJhdGFudDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3RcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2JhdHRsZWZpZWxkQ29tYmF0QXR0YWNrZXJJZH1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QmF0dGxlZmllbGRDb21iYXRBdHRhY2tlcklkKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHtiYXR0bGVmaWVsZENvbWJhdE9wdGlvbnMubWFwKChvcHRpb24pID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17b3B0aW9uLmlkfSB2YWx1ZT17b3B0aW9uLmlkfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtvcHRpb24uYXR0YWNrZXJOYW1lfVxuICAgICAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5UYXJnZXQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17c2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudD8uZGVmZW5kZXJOYW1lIHx8ICcnfVxuICAgICAgICAgICAgICAgICAgICByZWFkT25seVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImJhdHRsZWZpZWxkLWNvbWJhdC1zcGFuXCI+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5FbGlnaWJsZSBXZWFwb24gUHJvZmlsZTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3RcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2JhdHRsZWZpZWxkQ29tYmF0V2VhcG9uTmFtZX1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QmF0dGxlZmllbGRDb21iYXRXZWFwb25OYW1lKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHtiYXR0bGVmaWVsZENvbWJhdFdlYXBvbk9wdGlvbnMubWFwKCh3ZWFwb24pID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17d2VhcG9uLm5hbWV9IHZhbHVlPXt3ZWFwb24ubmFtZX0+XG4gICAgICAgICAgICAgICAgICAgICAgICB7Zm9ybWF0V2VhcG9uTmFtZSh3ZWFwb24pfVxuICAgICAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInByaW1hcnktYnV0dG9uIGJhdHRsZWZpZWxkLWNvbWJhdC1idXR0b25cIlxuICAgICAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlQmF0dGxlZmllbGRTaW11bGF0ZX1cbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdGFudCB8fCAhc2VsZWN0ZWRCYXR0bGVmaWVsZENvbWJhdFdlYXBvbiB8fCBzaW11bGF0aW5nfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtzaW11bGF0aW5nID8gJ1J1bm5pbmcgU2ltdWxhdGlvbnMuLi4nIDogJ1J1biBCYXR0bGVmaWVsZCBTaW11bGF0aW9uJ31cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImVtcHR5LXN0YXRlIGNvbXBhY3RcIj5cbiAgICAgICAgICAgICAgICA8cD5ObyBlbGlnaWJsZSBjb21iYXRhbnRzIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9ucy48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAge3NpbXVsYXRpb25SdW5zLmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1jb21iYXQtcmVzdWx0c1wiPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPkxhdGVzdCBSZXN1bHQ8L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1jb21iYXQtcmVzdWx0LWdyaWRcIj5cbiAgICAgICAgICAgICAgICAgIDxhcnRpY2xlIGNsYXNzTmFtZT1cInJlc3VsdC1jYXJkIGFjY2VudFwiPlxuICAgICAgICAgICAgICAgICAgICA8aDM+e3NpbXVsYXRpb25SdW5zWzBdLnJlc3VsdC50YXJnZXQubmFtZX08L2gzPlxuICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICB7c3VtbWFyeVN0YXRzLnRvdGFsUnVuc30gcnVue3N1bW1hcnlTdGF0cy50b3RhbFJ1bnMgPT09IDEgPyAnJyA6ICdzJ31cbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICBEZXN0cm95ZWQ6IHtzdW1tYXJ5U3RhdHMudGFyZ2V0RGVzdHJveWVkQ291bnR9ICh7Zm9ybWF0UGVyY2VudChzdW1tYXJ5U3RhdHMudGFyZ2V0RGVzdHJveWVkQ291bnQsIHN1bW1hcnlTdGF0cy50b3RhbFJ1bnMpfSlcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgICAgPGFydGljbGUgY2xhc3NOYW1lPVwicmVzdWx0LWNhcmRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGgzPlNlbGVjdGVkIEF0dGFjazwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDxwPntzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0YW50Py5hdHRhY2tlck5hbWUgfHwgJ05vIGNvbWJhdGFudCBzZWxlY3RlZCd9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD57Zm9ybWF0V2VhcG9uTmFtZShzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0V2VhcG9uKX08L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwPntzZWxlY3RlZEJhdHRsZWZpZWxkQ29tYmF0YW50Py5kZWZlbmRlck5hbWUgfHwgJ05vIHRhcmdldCBzZWxlY3RlZCd9PC9wPlxuICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgICAgPGFydGljbGUgY2xhc3NOYW1lPVwicmVzdWx0LWNhcmRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGgzPkhpdHM8L2gzPlxuICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICBMYW5kZWQ6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LnN1Y2Nlc3NmdWxIaXRBdHRhY2tzICsgc3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvSGl0QXR0YWNrc31cbiAgICAgICAgICAgICAgICAgICAgICB7JyAnfSh7Zm9ybWF0UGVyY2VudChzdW1tYXJ5U3RhdHMuY29tYmF0LnN1Y2Nlc3NmdWxIaXRBdHRhY2tzICsgc3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvSGl0QXR0YWNrcywgc3VtbWFyeVN0YXRzLmNvbWJhdC5hdHRhY2tJbnN0YW5jZXMpfSlcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5Dcml0aWNhbDoge3N1bW1hcnlTdGF0cy5jb21iYXQuY3JpdGljYWxIaXRBdHRhY2tzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+RXh0cmEgaGl0czoge3N1bW1hcnlTdGF0cy5jb21iYXQuZXh0cmFIaXRzR2VuZXJhdGVkfTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvYXJ0aWNsZT5cbiAgICAgICAgICAgICAgICAgIDxhcnRpY2xlIGNsYXNzTmFtZT1cInJlc3VsdC1jYXJkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxoMz5Xb3VuZHM8L2gzPlxuICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICBTdWNjZXNzZnVsOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5zdWNjZXNzZnVsV291bmRSb2xscyArIHN1bW1hcnlTdGF0cy5jb21iYXQuYXV0b1dvdW5kc31cbiAgICAgICAgICAgICAgICAgICAgICB7JyAnfSh7Zm9ybWF0UGVyY2VudChzdW1tYXJ5U3RhdHMuY29tYmF0LnN1Y2Nlc3NmdWxXb3VuZFJvbGxzICsgc3VtbWFyeVN0YXRzLmNvbWJhdC5hdXRvV291bmRzLCBzdW1tYXJ5U3RhdHMuY29tYmF0LndvdW5kUm9sbHMgKyBzdW1tYXJ5U3RhdHMuY29tYmF0LmF1dG9Xb3VuZHMpfSlcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5Dcml0aWNhbDoge3N1bW1hcnlTdGF0cy5jb21iYXQuY3JpdGljYWxXb3VuZHN9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5BdXRvLXdvdW5kczoge3N1bW1hcnlTdGF0cy5jb21iYXQuYXV0b1dvdW5kc308L3A+XG4gICAgICAgICAgICAgICAgICA8L2FydGljbGU+XG4gICAgICAgICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJyZXN1bHQtY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2F2ZXM8L2gzPlxuICAgICAgICAgICAgICAgICAgICA8cD5BdHRlbXB0czoge3N1bW1hcnlTdGF0cy5jb21iYXQuc2F2ZUF0dGVtcHRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+RmFpbGVkOiB7c3VtbWFyeVN0YXRzLmNvbWJhdC5zYXZlc0ZhaWxlZH0gKHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuc2F2ZXNGYWlsZWQsIHN1bW1hcnlTdGF0cy5jb21iYXQuc2F2ZUF0dGVtcHRzKX0pPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cD5VbnNhdmFibGU6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LnVuc2F2YWJsZVdvdW5kc308L3A+XG4gICAgICAgICAgICAgICAgICA8L2FydGljbGU+XG4gICAgICAgICAgICAgICAgICA8YXJ0aWNsZSBjbGFzc05hbWU9XCJyZXN1bHQtY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICA8aDM+UmUtcm9sbHM8L2gzPlxuICAgICAgICAgICAgICAgICAgICA8cD5IaXQgcmUtcm9sbHM6IHtzdW1tYXJ5U3RhdHMuY29tYmF0LmhpdFJlcm9sbHNVc2VkfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHA+SGl0IHN1Y2Nlc3M6IHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQuaGl0UmVyb2xsU3VjY2Vzc2VzLCBzdW1tYXJ5U3RhdHMuY29tYmF0LmhpdFJlcm9sbHNVc2VkKX08L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwPldvdW5kIHN1Y2Nlc3M6IHtmb3JtYXRQZXJjZW50KHN1bW1hcnlTdGF0cy5jb21iYXQud291bmRSZXJvbGxTdWNjZXNzZXMsIHN1bW1hcnlTdGF0cy5jb21iYXQud291bmRSZXJvbGxzVXNlZCl9PC9wPlxuICAgICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiYXR0bGVmaWVsZC1sZWdlbmRcIj5cbiAgICAgICAgICAgIHtiYXR0bGVmaWVsZFVuaXRzLm1hcCgodW5pdCkgPT4gKFxuICAgICAgICAgICAgICA8YXJ0aWNsZSBrZXk9e2Ake3VuaXQuaWR9LWxlZ2VuZGB9IGNsYXNzTmFtZT1cImJhdHRsZWZpZWxkLWxlZ2VuZC1jYXJkXCI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+e3VuaXQucm9sZX08L3A+XG4gICAgICAgICAgICAgICAgPGgzPnt1bml0Lm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICA8cD57dW5pdC5mYWN0aW9uIHx8ICdGYWN0aW9uIG5vdCBzZXQnfTwvcD5cbiAgICAgICAgICAgICAgICA8cD5CYXNlOiB7dW5pdC5iYXNlTW19bW08L3A+XG4gICAgICAgICAgICAgIDwvYXJ0aWNsZT5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgICApIDogKFxuICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJwYW5lbCBwbGFjZWhvbGRlci1wYW5lbFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGFuZWwtaGVhZGluZ1wiPlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwia2lja2VyXCI+Um9zdGVyPC9wPlxuICAgICAgICAgICAgICA8aDI+QXJteSBMaXN0PC9oMj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYXJteS1saXN0LWNvdW50XCI+XG4gICAgICAgICAgICAgIHthcm15TGlzdEVudHJpZXMucmVkdWNlKCh0b3RhbCwgZW50cnkpID0+IHRvdGFsICsgZW50cnkuY291bnQsIDApfSB1bml0XG4gICAgICAgICAgICAgIHthcm15TGlzdEVudHJpZXMucmVkdWNlKCh0b3RhbCwgZW50cnkpID0+IHRvdGFsICsgZW50cnkuY291bnQsIDApID09PSAxID8gJycgOiAncyd9XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAge2FybXlMaXN0RW50cmllcy5sZW5ndGggPyAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFybXktbGlzdC1ncmlkXCI+XG4gICAgICAgICAgICAgIHthcm15TGlzdEVudHJpZXMubWFwKChlbnRyeSkgPT4gKFxuICAgICAgICAgICAgICAgIDxhcnRpY2xlIGtleT17ZW50cnkuaWR9IGNsYXNzTmFtZT1cImFybXktbGlzdC1jYXJkXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFybXktbGlzdC1jYXJkLWhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImtpY2tlclwiPntlbnRyeS5mYWN0aW9ufTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8aDM+e2VudHJ5Lm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYXJteS1saXN0LXF1YW50aXR5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZWNvbmRhcnktYnV0dG9uIGFybXktbGlzdC1xdWFudGl0eS1idXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdXBkYXRlQXJteUxpc3RFbnRyeUNvdW50KGVudHJ5LmlkLCBlbnRyeS5jb3VudCAtIDEpfVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2VudHJ5LmNvdW50IDw9IDF9XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgLVxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cIm51bWJlclwiXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW49XCIxXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFybXktbGlzdC1xdWFudGl0eS1pbnB1dFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17ZW50cnkuY291bnR9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVBcm15TGlzdEVudHJ5Q291bnQoZW50cnkuaWQsIGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNlY29uZGFyeS1idXR0b24gYXJteS1saXN0LXF1YW50aXR5LWJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB1cGRhdGVBcm15TGlzdEVudHJ5Q291bnQoZW50cnkuaWQsIGVudHJ5LmNvdW50ICsgMSl9XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJkYXRhc2hlZXQtc3RhdHNcIj5cbiAgICAgICAgICAgICAgICAgICAge3JlbmRlclN0YXRzR3JpZChlbnRyeS5zdGF0cyl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYXJteS1saXN0LWNhcmQtYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhcm15LWxpc3QtYmFkZ2VcIj54e2VudHJ5LmNvdW50fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNlY29uZGFyeS1idXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHJlbW92ZUFybXlMaXN0RW50cnkoZW50cnkuaWQpfVxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgUmVtb3ZlIEVudHJ5XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9hcnRpY2xlPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImVtcHR5LXN0YXRlXCI+XG4gICAgICAgICAgICAgIDxwPkFkZCB1bml0cyBmcm9tIHRoZSBDb21iYXQgcGFnZSBhbmQgdGhleSB3aWxsIGFwcGVhciBoZXJlLjwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICl9XG4gICAgPC9kaXY+XG4gIClcbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwXG4iXX0=
