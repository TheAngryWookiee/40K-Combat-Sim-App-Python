import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  fetchFactions,
  fetchFactionDetails,
  fetchUnitDetailsWithLoadout,
  fetchUnits,
  simulateCombat,
} from './api'

const statDisplayRows = [
  [
    ['movement', 'M', (value) => `${value}"`],
    ['toughness', 'T'],
    ['save', 'SV'],
  ],
  [
    ['wounds', 'W'],
    ['leadership', 'LD'],
    ['objective_control', 'OC'],
  ],
]

const ATTACHED_LEADER_WEAPON_PREFIX = '__attacker_leader__::'

const initialOptions = {
  target_has_cover: false,
  attacker_in_engagement_range: false,
  target_in_engagement_range_of_allies: false,
  in_half_range: false,
  oath_of_moment_active: false,
  charged_this_turn: false,
  remained_stationary: false,
  indirect_target_visible: true,
  attached_character_name: '',
  hazardous_overwatch_charge_phase: false,
  hazardous_bearer_current_wounds: '',
  attacker_fire_discipline_active: false,
  attacker_marked_for_destruction_active: false,
  attacker_unforgiven_fury_active: false,
  attacker_unforgiven_fury_army_battleshocked: false,
  attacker_stubborn_tenacity_active: false,
  attacker_weapons_of_the_first_legion_active: false,
  attacker_pennant_of_remembrance_active: false,
  attacker_below_starting_strength: false,
  attacker_battleshocked: false,
  attacker_saga_completed: false,
  attacker_elders_guidance_active: false,
  attacker_boast_achieved: false,
  attacker_hordeslayer_outnumbered: false,
  attacker_heroes_all_reroll_type: '',
  attacker_unbridled_ferocity_active: false,
  attacker_waaagh_active: false,
  defender_waaagh_active: false,
  attacker_prey_active: false,
  attacker_target_within_9: false,
  attacker_counts_as_ten_plus_models: false,
  defender_counts_as_ten_plus_models: false,
  target_below_starting_strength: false,
  target_below_half_strength: false,
  attacker_try_dat_button_effects: [],
  attacker_try_dat_button_hazardous: false,
  attacker_unbridled_carnage_active: false,
  defender_ard_as_nails_active: false,
  attacker_drag_it_down_active: false,
  defender_stalkin_taktiks_active: false,
  defender_speediest_freeks_active: false,
  attacker_blitza_fire_active: false,
  attacker_dakkastorm_active: false,
  attacker_full_throttle_active: false,
  attacker_klankin_klaws_active: false,
  attacker_klankin_klaws_pushed: false,
  attacker_dakka_dakka_dakka_active: false,
  attacker_dakka_dakka_dakka_pushed: false,
  attacker_bigger_shells_active: false,
  attacker_bigger_shells_pushed: false,
  defender_extra_gubbinz_active: false,
  attacker_competitive_streak_active: false,
  attacker_armed_to_da_teef_active: false,
  defender_hulking_brutes_active: false,
  defender_armour_of_contempt_active: false,
  defender_overwhelming_onslaught_active: false,
  defender_unbreakable_lines_active: false,
  defender_pennant_of_remembrance_active: false,
  defender_battleshocked: false,
}

const UNFORGIVEN_TASK_FORCE = 'Unforgiven Task Force'
const SAGA_OF_THE_HUNTER = 'Saga of the Hunter'
const SAGA_OF_THE_BEASTSLAYER = 'Saga of the Beastslayer'
const SAGA_OF_THE_BOLD = 'Saga of the Bold'
const WAR_HORDE = 'War Horde'
const DA_BIG_HUNT = 'Da Big Hunt'
const KULT_OF_SPEED = 'Kult of Speed'
const DREAD_MOB = 'Dread Mob'
const GREEN_TIDE = 'Green Tide'
const BULLY_BOYZ = 'Bully Boyz'
const OATH_EXCLUDED_KEYWORDS = [
  'black templars',
  'blood angels',
  'dark angels',
  'deathwatch',
  'space wolves',
]
const OATH_OF_MOMENT_RULE_TEXT = 'Select one enemy unit. Each time a model with Oath of Moment makes an attack that targets that unit, you can re-roll the Hit roll.'
const OATH_OF_MOMENT_CODEX_RIDER_TEXT = 'If you are using a Codex: Space Marines Detachment and your army does not include Black Templars, Blood Angels, Dark Angels, Deathwatch, or Space Wolves units, add 1 to the Wound roll as well.'
const BATTLEFIELD_WIDTH_INCHES = 60
const BATTLEFIELD_HEIGHT_INCHES = 44
const UNIT_BASE_DIAMETERS_MM = {
  "Lion El'Jonson": 60,
  'Logan Grimnar': 80,
}

function getDetachmentByName(factionDetails, detachmentName) {
  return factionDetails?.detachments?.find((detachment) => detachment.name === detachmentName) || null
}

function unitIsEpicHero(unit) {
  return (unit?.keywords || []).some((keyword) => String(keyword).toLowerCase() === 'epic hero')
}

function getAttackerEnhancementOptions(detachment, enhancementBearerUnit, attackerUnit, selectedWeapon, hasHazardous) {
  if (!detachment || !enhancementBearerUnit || unitIsEpicHero(enhancementBearerUnit)) {
    return []
  }

  if (detachment.name === UNFORGIVEN_TASK_FORCE) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === 'Stubborn Tenacity') {
        return true
      }
      if (enhancement.name === 'Weapons of the First Legion') {
        return selectedWeapon?.range === 'Melee'
      }
      if (enhancement.name === 'Pennant of Remembrance') {
        return hasHazardous
      }
      return false
    })
  }

  if (detachment.name === SAGA_OF_THE_HUNTER) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === 'Fenrisian Grit') {
        return hasHazardous
      }
      if (enhancement.name === 'Wolf Master') {
        return (attackerUnit?.weapons || []).some((weapon) => (
          ['teeth and claws', 'tyrnak and fenrir'].includes(String(weapon.name).toLowerCase())
        ))
      }
      return enhancement.name === 'Feral Rage' && selectedWeapon?.range === 'Melee'
    })
  }

  if (detachment.name === SAGA_OF_THE_BEASTSLAYER) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === "Elder's Guidance") {
        return selectedWeapon?.range === 'Melee' && attackerUnit?.name === 'Blood Claws'
      }
      return enhancement.name === 'Helm of the Beastslayer'
    })
  }

  if (detachment.name === SAGA_OF_THE_BOLD) {
    return (detachment.enhancements || []).filter((enhancement) => (
      (enhancement.name === "Braggart's Steel" || enhancement.name === 'Hordeslayer')
      && selectedWeapon?.range === 'Melee'
    ))
  }

  if (detachment.name === WAR_HORDE) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === "Headwoppa's Killchoppa") {
        return selectedWeapon?.range === 'Melee' && !weaponHasExtraAttacks(selectedWeapon)
      }
      return enhancement.name === 'Supa-Cybork Body'
    })
  }

  if (detachment.name === DA_BIG_HUNT) {
    if (!unitHasKeyword(enhancementBearerUnit, 'beast snagga')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Proper Killy' && selectedWeapon?.range === 'Melee',
    )
  }

  if (detachment.name === DREAD_MOB) {
    if (!unitHasKeyword(enhancementBearerUnit, 'mek')) {
      return []
    }
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === 'Gitfinder Gogglez') {
        return selectedWeapon?.range !== 'Melee'
      }
      return enhancement.name === 'Press It Fasta!'
    })
  }

  if (detachment.name === GREEN_TIDE) {
    if (!unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter((enhancement) => (
      enhancement.name === 'Ferocious Show Off'
        ? selectedWeapon?.range === 'Melee'
        : enhancement.name === 'Raucous Warcaller'
    ))
  }

  if (detachment.name === BULLY_BOYZ) {
    if (!unitHasKeyword(enhancementBearerUnit, 'warboss') || !unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter((enhancement) => (
      enhancement.name === "'Eadstompa" && selectedWeapon?.range === 'Melee'
    ))
  }

  return []
}

function getDefenderEnhancementOptions(detachment, enhancementBearerUnit) {
  if (!detachment || !enhancementBearerUnit || unitIsEpicHero(enhancementBearerUnit)) {
    return []
  }

  if (detachment.name === UNFORGIVEN_TASK_FORCE) {
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Pennant of Remembrance',
    )
  }

  if (detachment.name === SAGA_OF_THE_HUNTER) {
    return (detachment.enhancements || []).filter((enhancement) => (
      enhancement.name === 'Fenrisian Grit' && Number(enhancementBearerUnit?.model_count ?? 1) === 1
    ))
  }

  if (detachment.name === SAGA_OF_THE_BEASTSLAYER) {
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Helm of the Beastslayer',
    )
  }

  if (detachment.name === WAR_HORDE) {
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Supa-Cybork Body',
    )
  }

  if (detachment.name === DA_BIG_HUNT) {
    if (!unitHasKeyword(enhancementBearerUnit, 'beastboss on squigosaur')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Surly As a Squiggoth',
    )
  }

  if (detachment.name === DREAD_MOB) {
    if (!unitHasKeyword(enhancementBearerUnit, 'mek')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Smoky Gubbinz',
    )
  }

  if (detachment.name === GREEN_TIDE) {
    if (!unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Raucous Warcaller',
    )
  }

  if (detachment.name === BULLY_BOYZ) {
    if (!unitHasKeyword(enhancementBearerUnit, 'warboss') || !unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Da Biggest Boss',
    )
  }

  return []
}

function getAttackerStratagemOptions(detachment, unit, isRangedWeapon) {
  if (!detachment) {
    return []
  }

  return (detachment.stratagems || []).filter((stratagem) => {
    if (detachment.name === UNFORGIVEN_TASK_FORCE) {
      if (stratagem.name === 'Fire Discipline') {
        return isRangedWeapon
      }
      return stratagem.name === 'Unforgiven Fury'
    }

    if (detachment.name === SAGA_OF_THE_HUNTER) {
      return (
        stratagem.name === 'Marked for Destruction'
        && isRangedWeapon
        && !unitHasKeyword(unit, 'beasts')
      )
    }

    if (detachment.name === SAGA_OF_THE_BEASTSLAYER) {
      return stratagem.name === 'Unbridled Ferocity' && !isRangedWeapon
    }

    if (detachment.name === WAR_HORDE) {
      return stratagem.name === 'Unbridled Carnage'
    }

    if (detachment.name === DA_BIG_HUNT) {
      return stratagem.name === 'Drag It Down' && !isRangedWeapon
    }

    if (detachment.name === KULT_OF_SPEED) {
      if (stratagem.name === 'Blitza Fire' || stratagem.name === 'Dakkastorm') {
        return isRangedWeapon
      }
      return stratagem.name === 'Full Throttle!' && !isRangedWeapon
    }

    if (detachment.name === DREAD_MOB) {
      if (stratagem.name === "Klankin' Klaws") {
        return !isRangedWeapon
      }
      return isRangedWeapon && (
        stratagem.name === 'Dakka! Dakka! Dakka!' || stratagem.name === 'Bigger Shells for Bigger Gitz'
      )
    }

    if (detachment.name === GREEN_TIDE) {
      return stratagem.name === 'Competitive Streak' && !isRangedWeapon
    }

    if (detachment.name === BULLY_BOYZ) {
      return stratagem.name === 'Armed to da Teef'
    }

    return false
  })
}

function getDefenderStratagemOptions(detachment, selectedWeapon) {
  if (!detachment) {
    return []
  }

  return (detachment.stratagems || []).filter((stratagem) => {
    if (detachment.name === UNFORGIVEN_TASK_FORCE) {
      if (stratagem.name === 'Armour of Contempt') {
        return Number(selectedWeapon?.ap || 0) > 0
      }
      return stratagem.name === 'Unbreakable Lines'
    }

    if (detachment.name === SAGA_OF_THE_HUNTER) {
      return stratagem.name === 'Overwhelming Onslaught' && selectedWeapon?.range === 'Melee'
    }

    if (detachment.name === WAR_HORDE) {
      return stratagem.name === "'Ard as Nails"
    }

    if (detachment.name === DA_BIG_HUNT) {
      return stratagem.name === "Stalkin' Taktiks" && selectedWeapon?.range !== 'Melee'
    }

    if (detachment.name === KULT_OF_SPEED) {
      return stratagem.name === 'Speediest Freeks'
    }

    if (detachment.name === DREAD_MOB) {
      return stratagem.name === 'Extra Gubbinz'
    }

    if (detachment.name === BULLY_BOYZ) {
      return stratagem.name === 'Hulking Brutes'
    }

    return false
  })
}

function formatError(error) {
  if (error?.response?.data?.detail) {
    return String(error.response.data.detail)
  }
  return error?.message || 'Something went wrong.'
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
    attacker_saga_completed: state.attackerSagaCompleted,
    attacker_elders_guidance_active: state.attackerEldersGuidanceActive,
    attacker_boast_achieved: state.attackerBoastAchieved,
    attacker_hordeslayer_outnumbered: state.attackerHordeslayerOutnumbered,
    attacker_heroes_all_reroll_type: state.attackerHeroesAllRerollType || null,
    attacker_unbridled_ferocity_active: state.attackerUnbridledFerocityActive,
    attacker_waaagh_active: state.attackerWaaaghActive,
    defender_waaagh_active: state.defenderWaaaghActive,
    attacker_prey_active: state.attackerPreyActive,
    attacker_target_within_9: state.attackerTargetWithinNine,
    attacker_counts_as_ten_plus_models: state.attackerCountsAsTenPlusModels,
    defender_counts_as_ten_plus_models: state.defenderCountsAsTenPlusModels,
    target_below_starting_strength: state.targetBelowStartingStrength,
    target_below_half_strength: state.targetBelowHalfStrength,
    attacker_try_dat_button_effects: state.attackerTryDatButtonEffects || [],
    attacker_try_dat_button_hazardous: state.attackerTryDatButtonHazardous,
    attacker_unbridled_carnage_active: state.attackerUnbridledCarnageActive,
    defender_ard_as_nails_active: state.defenderArdAsNailsActive,
    attacker_drag_it_down_active: state.attackerDragItDownActive,
    defender_stalkin_taktiks_active: state.defenderStalkinTaktiksActive,
    defender_speediest_freeks_active: state.defenderSpeediestFreeksActive,
    attacker_blitza_fire_active: state.attackerBlitzaFireActive,
    attacker_dakkastorm_active: state.attackerDakkastormActive,
    attacker_full_throttle_active: state.attackerFullThrottleActive,
    attacker_klankin_klaws_active: state.attackerKlankinKlawsActive,
    attacker_klankin_klaws_pushed: state.attackerKlankinKlawsPushed,
    attacker_dakka_dakka_dakka_active: state.attackerDakkaDakkaDakkaActive,
    attacker_dakka_dakka_dakka_pushed: state.attackerDakkaDakkaDakkaPushed,
    attacker_bigger_shells_active: state.attackerBiggerShellsActive,
    attacker_bigger_shells_pushed: state.attackerBiggerShellsPushed,
    defender_extra_gubbinz_active: state.defenderExtraGubbinzActive,
    attacker_competitive_streak_active: state.attackerCompetitiveStreakActive,
    attacker_armed_to_da_teef_active: state.attackerArmedToDaTeefActive,
    defender_hulking_brutes_active: state.defenderHulkingBrutesActive,
    defender_armour_of_contempt_active: state.defenderArmourOfContemptActive,
    defender_overwhelming_onslaught_active: state.defenderOverwhelmingOnslaughtActive,
    defender_unbreakable_lines_active: state.defenderUnbreakableLinesActive,
    defender_pennant_of_remembrance_active: state.defenderPennantOfRemembranceActive,
    defender_battleshocked: state.defenderBattleshocked,
  }

  if (state.attachedCharacterName) {
    options.attached_character_name = state.attachedCharacterName
  }
  if (state.hazardousBearerCurrentWounds !== '') {
    options.hazardous_bearer_current_wounds = Number(state.hazardousBearerCurrentWounds)
  }

  return {
    attacker_faction: state.attackerFaction,
    attacker_unit: state.attackerUnit,
    attacker_detachment_name: state.attackerDetachmentName || undefined,
    attacker_enhancement_name: state.attackerEnhancementName || undefined,
    attacker_loadout: state.attackerLoadoutSelections || {},
    attacker_model_count: state.attackerModelCount !== '' ? Number(state.attackerModelCount) : undefined,
    attacker_model_counts: state.attackerModelCounts || {},
    attacker_attached_character_name: state.attackerAttachedLeaderName || undefined,
    attacker_attached_character_loadout: state.attackerAttachedLeaderLoadoutSelections || {},
    attacker_attached_character_model_count: state.attackerAttachedLeaderModelCount !== '' ? Number(state.attackerAttachedLeaderModelCount) : undefined,
    attacker_attached_character_model_counts: state.attackerAttachedLeaderModelCounts || {},
    weapon_names: state.weaponNames || [],
    defender_faction: state.defenderFaction,
    defender_unit: state.defenderUnit,
    defender_detachment_name: state.defenderDetachmentName || undefined,
    defender_enhancement_name: state.defenderEnhancementName || undefined,
    defender_loadout: state.defenderLoadoutSelections || {},
    defender_model_count: state.defenderModelCount !== '' ? Number(state.defenderModelCount) : undefined,
    defender_model_counts: state.defenderModelCounts || {},
    attached_character_loadout: state.attachedCharacterLoadoutSelections || {},
    attached_character_model_count: state.attachedCharacterModelCount !== '' ? Number(state.attachedCharacterModelCount) : undefined,
    attached_character_model_counts: state.attachedCharacterModelCounts || {},
    options,
  }
}

function formatInvulnerableSave(value) {
  const text = String(value)
  return text.endsWith('+') ? `${text}+` : `${text}++`
}

function formatRangeValue(value) {
  return String(value).replace(/\s*inches?/i, '"')
}

function formatWeaponBaseName(name) {
  return String(name).replace(/\s-\s*([a-z])/, (_, firstLetter) => ` - ${firstLetter.toUpperCase()}`)
}

function formatWeaponName(weapon) {
  if (!weapon) {
    return ''
  }
  if (weapon.label) {
    return weapon.label
  }

  const keywordText = (weapon.raw_keywords || [])
    .map((keyword) => `[${keyword}]`)
    .join(' ')

  const formattedName = formatWeaponBaseName(weapon.name)
  return keywordText ? `${formattedName} ${keywordText}` : formattedName
}

function weaponHasExtraAttacks(weapon) {
  return (weapon?.raw_keywords || []).includes('Extra Attacks')
}

function buildWeaponSelectionProfile(selectedWeapons, selectedLabels = []) {
  if (!selectedWeapons.length) {
    return null
  }
  if (selectedWeapons.length === 1) {
    return {
      ...selectedWeapons[0],
      label: selectedLabels[0] || selectedWeapons[0].label || null,
    }
  }

  const rawKeywordSet = new Set()
  const keywordSet = new Set()
  let maximumAp = 0
  for (const weapon of selectedWeapons) {
    for (const keyword of weapon.raw_keywords || []) {
      rawKeywordSet.add(keyword)
    }
    for (const keyword of weapon.keywords || []) {
      keywordSet.add(keyword)
    }
    maximumAp = Math.max(maximumAp, Number(weapon.ap || 0))
  }
  const allMelee = selectedWeapons.every((weapon) => weapon.range === 'Melee')
  const allRanged = selectedWeapons.every((weapon) => weapon.range !== 'Melee')

  return {
    name: '__selected_weapons__',
    label: allMelee ? 'Selected Melee Weapons' : allRanged ? 'Selected Ranged Weapons' : 'Selected Weapons',
    range: allMelee ? 'Melee' : allRanged ? 'Ranged' : 'Mixed',
    ap: maximumAp,
    ap_display: maximumAp > 0 ? `-${maximumAp}` : '0',
    raw_keywords: Array.from(rawKeywordSet),
    keywords: Array.from(keywordSet),
  }
}

function buildAttachedLeaderWeaponId(weaponName) {
  return `${ATTACHED_LEADER_WEAPON_PREFIX}${weaponName}`
}

function unitHasOathOfMoment(unit) {
  return (unit?.abilities || []).some((ability) => {
    const name = String(ability.name || '').toLowerCase()
    const rulesText = String(ability.rules_text || '').toLowerCase()
    return name.includes('oath of moment') || rulesText.includes('oath of moment')
  })
}

function unitHasWaaagh(unit) {
  return (unit?.abilities || []).some((ability) => {
    const name = String(ability.name || '').toLowerCase()
    const rulesText = String(ability.rules_text || '').toLowerCase()
    return name.includes('waaagh!') || rulesText.includes('waaagh!')
  })
}

function unitGetsOathWoundBonus(unit) {
  const combinedKeywords = [
    ...(unit?.keywords || []),
    ...(unit?.faction_keywords || []),
  ].map((keyword) => String(keyword).toLowerCase())

  return !OATH_EXCLUDED_KEYWORDS.some((keyword) => combinedKeywords.includes(keyword))
}

function getDetachmentEntry(detachment, collectionName, entryName) {
  const collection = detachment?.[collectionName]
  if (!collection) {
    return null
  }
  if (Array.isArray(collection)) {
    return collection.find((entry) => entry.name === entryName) || null
  }
  if (typeof collection === 'object') {
    if (!entryName || collection.name === entryName) {
      return collection
    }
  }
  return null
}

function getUnitAbility(unit, matcher) {
  return (unit?.abilities || []).find((ability) => matcher(ability))
    || (unit?.wargear_abilities || []).find((ability) => matcher(ability))
    || null
}

function buildTooltip(...sections) {
  return sections
    .map((section) => String(section || '').trim())
    .filter(Boolean)
    .join('\n\n')
}

function formatDetachmentTooltip(detachment) {
  if (!detachment) {
    return 'No detachment selected.'
  }

  const restrictionText = String(detachment.restrictions || '').trim()
  return buildTooltip(
    detachment.rule?.name ? `${detachment.rule.name}: ${detachment.rule.rules_text || ''}` : '',
    restrictionText ? `Restrictions: ${restrictionText}` : '',
  ) || detachment.name
}

function formatEnhancementTooltip(enhancement) {
  if (!enhancement) {
    return 'No enhancement selected.'
  }

  const restrictionText = Array.isArray(enhancement.restrictions)
    ? enhancement.restrictions.join(' ')
    : String(enhancement.restrictions || '')

  return buildTooltip(
    enhancement.rules_text,
    restrictionText ? `Restrictions: ${restrictionText}` : '',
  ) || enhancement.name
}

function formatStratagemTooltip(stratagem) {
  if (!stratagem) {
    return ''
  }

  return buildTooltip(
    stratagem.type ? `${stratagem.type} Stratagem` : '',
    stratagem.timing ? `When: ${stratagem.timing}` : '',
    stratagem.target ? `Target: ${stratagem.target}` : '',
    stratagem.effect ? `Effect: ${stratagem.effect}` : '',
  ) || stratagem.name
}

function getBaseDiameterMm(unit) {
  return UNIT_BASE_DIAMETERS_MM[unit?.name] || 40
}

function mmToInches(value) {
  return value / 25.4
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function parseWeaponRangeInches(range) {
  const match = String(range || '').match(/(\d+(\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function unitHasKeyword(unit, keyword) {
  const normalizedKeyword = String(keyword).toLowerCase()
  return [...(unit?.keywords || []), ...(unit?.faction_keywords || [])]
    .some((entry) => String(entry).toLowerCase() === normalizedKeyword)
}

function parsePlusValue(value) {
  const match = String(value || '').match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function weaponHasRawKeyword(weapon, keyword) {
  return (weapon?.raw_keywords || []).some(
    (rawKeyword) => String(rawKeyword).toLowerCase() === keyword.toLowerCase(),
  )
}

function getWeaponKeywordValue(weapon, keywordPrefix) {
  const matchingKeyword = (weapon?.raw_keywords || []).find((rawKeyword) => (
    new RegExp(`^${keywordPrefix}\\s+(\\d+)`, 'i').test(String(rawKeyword))
  ))
  if (!matchingKeyword) {
    return 0
  }
  const match = String(matchingKeyword).match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function getResolvedLoadoutSelections(unitDetails, loadoutSelections) {
  return {
    ...(unitDetails?.selected_loadout || {}),
    ...(loadoutSelections || {}),
  }
}

function getLoadoutGroupPoolCount(unitDetails, group) {
  if (!group?.target_model) {
    return Number(unitDetails?.model_count ?? 0)
  }
  return Number(unitDetails?.model_counts_by_name?.[group.target_model] ?? 0)
}

function getLoadoutGroupMaxTotal(unitDetails, group) {
  const poolCount = getLoadoutGroupPoolCount(unitDetails, group)
  let maximumTotal = poolCount
  if (group?.max_total_count !== undefined && group?.max_total_count !== null) {
    maximumTotal = Math.min(maximumTotal, Number(group.max_total_count) || 0)
  }
  if (group?.max_total_per_models !== undefined && group?.max_total_per_models !== null) {
    const divisor = Number(group.max_total_per_models) || 1
    maximumTotal = Math.min(maximumTotal, Math.floor(poolCount / Math.max(1, divisor)))
  }
  return Math.max(0, maximumTotal)
}

function getLoadoutOptionMaxCount(unitDetails, group, option) {
  const poolCount = getLoadoutGroupPoolCount(unitDetails, group)
  let maximumCount = poolCount
  if (option?.max_count !== undefined && option?.max_count !== null) {
    maximumCount = Math.min(maximumCount, Number(option.max_count) || 0)
  }
  if (option?.max_count_per_models !== undefined && option?.max_count_per_models !== null) {
    const divisor = Number(option.max_count_per_models) || 1
    maximumCount = Math.min(maximumCount, Math.floor(poolCount / Math.max(1, divisor)))
  }
  return Math.max(0, maximumCount)
}

function getLoadoutSelectionValue(unitDetails, loadoutSelections, group) {
  const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections)
  return (
    resolvedSelections[group.id]
    || group.default_option_id
    || group.options?.[0]?.id
    || ''
  )
}

function getLoadoutCountSelectionValue(unitDetails, loadoutSelections, group, optionId) {
  const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections)
  const groupSelection = resolvedSelections[group.id]
  if (!groupSelection || typeof groupSelection !== 'object') {
    return '0'
  }
  const value = groupSelection[optionId]
  return value === undefined || value === null ? '0' : String(value)
}

function getCombatWeaponOptions(unitDetails, attachedLeaderUnitDetails = null) {
  const unitWeapons = (unitDetails?.weapons || []).filter((weapon) => !weaponHasExtraAttacks(weapon))
  const leaderWeapons = (attachedLeaderUnitDetails?.weapons || []).filter((weapon) => !weaponHasExtraAttacks(weapon))
  return [
    ...unitWeapons,
    ...leaderWeapons.map((weapon) => ({
      ...weapon,
      name: buildAttachedLeaderWeaponId(weapon.name),
      label: `${attachedLeaderUnitDetails.name}: ${formatWeaponName(weapon)}`,
    })),
  ]
}

function getSelectedAttackEntries(unitDetails, attachedLeaderUnitDetails, weaponNames) {
  const entries = []
  const unitWeapons = unitDetails?.weapons || []
  const leaderWeapons = attachedLeaderUnitDetails?.weapons || []
  const requestedWeaponNames = Array.isArray(weaponNames) ? weaponNames : []
  const seenEntryKeys = new Set()

  for (const weaponName of requestedWeaponNames) {
    if (weaponName.startsWith(ATTACHED_LEADER_WEAPON_PREFIX)) {
      const leaderWeaponName = weaponName.slice(ATTACHED_LEADER_WEAPON_PREFIX.length)
      const leaderWeapon = leaderWeapons.find((weapon) => weapon.name === leaderWeaponName)
      if (!leaderWeapon) {
        continue
      }
      const entryKey = `leader::${leaderWeapon.name}`
      if (seenEntryKeys.has(entryKey)) {
        continue
      }
      seenEntryKeys.add(entryKey)
      entries.push({
        owner: 'leader',
        ownerName: attachedLeaderUnitDetails?.name || '',
        label: `${attachedLeaderUnitDetails?.name || 'Attached Leader'}: ${formatWeaponName(leaderWeapon)}`,
        weapon: leaderWeapon,
      })
      continue
    }

    const unitWeapon = unitWeapons.find((weapon) => weapon.name === weaponName)
    if (!unitWeapon) {
      continue
    }
    const entryKey = `unit::${unitWeapon.name}`
    if (seenEntryKeys.has(entryKey)) {
      continue
    }
    seenEntryKeys.add(entryKey)
    entries.push({
      owner: 'unit',
      ownerName: unitDetails?.name || '',
      label: formatWeaponName(unitWeapon),
      weapon: unitWeapon,
    })
  }

  return entries
}

function formatLoadoutOptionLabel(option) {
  const description = String(option?.description || '').trim()
  return description ? `${option.label} (${description})` : option.label
}

function getUnitModelCountValue(unitDetails, modelCount) {
  if (modelCount !== '' && modelCount !== null && modelCount !== undefined) {
    return String(modelCount)
  }
  if (unitDetails?.model_count !== undefined && unitDetails?.model_count !== null) {
    return String(unitDetails.model_count)
  }
  if (unitDetails?.unit_composition?.min_models !== undefined) {
    return String(unitDetails.unit_composition.min_models)
  }
  return '1'
}

function getModelEntryBounds(model) {
  const minimumCount = Number(model?.count?.min ?? 0)
  const maximumCount = Number(model?.count?.max ?? minimumCount)
  return {
    minimumCount,
    maximumCount,
  }
}

function unitUsesModelBreakdownSelectors(unitDetails) {
  const variableEntries = (unitDetails?.models || []).filter((model) => {
    const { minimumCount, maximumCount } = getModelEntryBounds(model)
    return maximumCount > minimumCount
  })
  return variableEntries.length > 1
}

function getResolvedModelCountSelections(unitDetails, modelCounts) {
  return {
    ...(unitDetails?.model_counts_by_name || {}),
    ...(modelCounts || {}),
  }
}

function areModelCountSelectionsEqual(left, right) {
  const leftEntries = Object.entries(left || {}).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  const rightEntries = Object.entries(right || {}).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  if (leftEntries.length !== rightEntries.length) {
    return false
  }
  return leftEntries.every(([leftKey, leftValue], index) => (
    leftKey === rightEntries[index][0] && Number(leftValue) === Number(rightEntries[index][1])
  ))
}

function getUnitModelCountBounds(unitDetails) {
  const minimumModels = Number(unitDetails?.unit_composition?.min_models ?? 1)
  const maximumModels = Number(unitDetails?.unit_composition?.max_models ?? minimumModels)
  return {
    minimumModels,
    maximumModels,
  }
}

function getModelEntryControlBounds(unitDetails, model, modelCounts) {
  const { minimumModels, maximumModels } = getUnitModelCountBounds(unitDetails)
  const { minimumCount, maximumCount } = getModelEntryBounds(model)
  const resolvedCounts = getResolvedModelCountSelections(unitDetails, modelCounts)
  const currentCount = Number(
    resolvedCounts[model.name]
    ?? unitDetails?.model_counts_by_name?.[model.name]
    ?? minimumCount,
  )

  const otherModelTotal = (unitDetails?.models || []).reduce((sum, entry) => {
    if (entry.name === model.name) {
      return sum
    }
    const fallbackMinimum = Number(entry?.count?.min ?? 0)
    return sum + Number(
      resolvedCounts[entry.name]
      ?? unitDetails?.model_counts_by_name?.[entry.name]
      ?? fallbackMinimum,
    )
  }, 0)

  return {
    currentCount,
    minimumCount: Math.max(minimumCount, minimumModels - otherModelTotal),
    maximumCount: Math.min(maximumCount, maximumModels - otherModelTotal),
  }
}

function defenderGetsCoverBenefit({
  selectedWeapon,
  defenderUnitDetails,
  targetHasCover,
  indirectTargetVisible,
  attackerFireDisciplineActive,
}) {
  if (!selectedWeapon || selectedWeapon.range === 'Melee') {
    return false
  }

  const hasIndirectNoVisibility = weaponHasRawKeyword(selectedWeapon, 'Indirect Fire') && !indirectTargetVisible
  const hasCoverSource = targetHasCover || hasIndirectNoVisibility
  if (!hasCoverSource) {
    return false
  }

  const ignoresCover = weaponHasRawKeyword(selectedWeapon, 'Ignores Cover') || attackerFireDisciplineActive
  if (ignoresCover) {
    return false
  }

  const armorSave = parsePlusValue(defenderUnitDetails?.stats?.save)
  const effectiveAp = Number(selectedWeapon?.ap || 0)
  return !(effectiveAp === 0 && armorSave > 0 && armorSave <= 3)
}

function average(values) {
  if (!values.length) {
    return 0
  }
  return values.reduce((total, value) => total + value, 0) / values.length
}

function formatAverage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatPercent(value, total) {
  if (!total) {
    return '0%'
  }
  return `${((value / total) * 100).toFixed(1)}%`
}

function sumBy(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0)
}

function buildRunSummary(runs) {
  const totalRuns = runs.length
  const targets = runs.map((run) => run.result.target)
  const combatStats = runs.map((run) => run.result.stats || {})
  const attachedCharacters = runs
    .map((run) => run.result.attached_character)
    .filter(Boolean)
  const hazardousBearers = runs
    .map((run) => run.result.hazardous_bearer)
    .filter(Boolean)

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
      unsavableWounds: sumBy(combatStats, (stat) => stat.unsavable_wounds || 0),
    },
  }
}

function getRelevantUnitRules(unit, role, hasHazardousWeapon) {
  const relevantEffectTypes = role === 'attacker'
    ? new Set(['outgoing_wound_modifier', ...(hasHazardousWeapon ? ['feel_no_pain'] : [])])
    : new Set(['incoming_wound_modifier', 'feel_no_pain'])

  const ruleCollections = [...(unit?.abilities || []), ...(unit?.wargear_abilities || [])]

  return ruleCollections
    .filter((rule) => (rule.effects || []).some((effect) => relevantEffectTypes.has(effect.type)))
    .map((rule) => ({
      name: rule.name,
      source: 'Datasheet Ability',
      text: rule.rules_text,
    }))
}

function buildAttackerActiveRules({
  attackerUnitDetails,
  attackerPackageIsCharacterUnit,
  attackerPackageModelCount,
  defenderPackageModelCount,
  defenderUnitDetails,
  selectedWeapon,
  selectedAttackWeapons,
  oathOfMomentActive,
  attackerDetachment,
  attackerEnhancementName,
  attackerSagaCompleted,
  attackerEldersGuidanceActive,
  attackerBoastAchieved,
  attackerHordeslayerOutnumbered,
  attackerHeroesAllRerollType,
  attackerMarkedForDestructionActive,
  attackerFireDisciplineActive,
  attackerUnforgivenFuryActive,
  attackerUnbridledFerocityActive,
  attackerStubbornTenacityActive,
  attackerWeaponsOfTheFirstLegionActive,
  attackerPennantOfRemembranceActive,
  attackerBelowStartingStrength,
  inHalfRange,
  remainedStationary,
  chargedThisTurn,
  indirectTargetVisible,
  attackerInEngagementRange,
  targetInEngagementRangeOfAllies,
  hasHazardous,
}) {
  const rules = [
    ...getRelevantUnitRules(attackerUnitDetails, 'attacker', hasHazardous),
  ]
  const defenderKeywordSet = new Set((defenderUnitDetails?.keywords || []).map((keyword) => String(keyword).toLowerCase()))
  const packsQuarryActive = attackerDetachment?.name === SAGA_OF_THE_HUNTER
    && selectedWeapon?.range === 'Melee'
    && (
      targetInEngagementRangeOfAllies
      || attackerPackageModelCount > defenderPackageModelCount
    )
  const legendarySlayersActive = attackerDetachment?.name === SAGA_OF_THE_BEASTSLAYER
    && (
      attackerSagaCompleted
      || defenderKeywordSet.has('character')
      || defenderKeywordSet.has('monster')
      || defenderKeywordSet.has('vehicle')
    )
  const heroesAllActive = attackerDetachment?.name === SAGA_OF_THE_BOLD
    && (
      attackerSagaCompleted
      || attackerPackageIsCharacterUnit
    )
  const wolfMasterActive = attackerEnhancementName === 'Wolf Master'
    && selectedAttackWeapons.some((weapon) => (
      ['teeth and claws', 'tyrnak and fenrir'].includes(String(weapon.name).toLowerCase())
    ))

  if (oathOfMomentActive && unitHasOathOfMoment(attackerUnitDetails)) {
    const woundBonusText = unitGetsOathWoundBonus(attackerUnitDetails)
      ? ' Re-roll Hit rolls against the selected target, and this attack also gets +1 to the Wound roll.'
      : ' Re-roll Hit rolls against the selected target.'
    rules.unshift({
      name: 'Oath of Moment',
      source: 'Army Rule',
      text: `This unit is attacking its Oath of Moment target.${woundBonusText}`,
    })
  }

  if (packsQuarryActive) {
    rules.push({
      name: "Pack's Quarry",
      source: `${attackerDetachment.name} Rule`,
      text: attackerSagaCompleted
        ? 'This melee attack gets +1 to Hit and +1 to Wound because the target is outnumbered or already engaged by allied Adeptus Astartes units, and the Saga is completed.'
        : 'This melee attack gets +1 to Hit because the target is outnumbered or already engaged by allied Adeptus Astartes units.',
    })
  }

  if (legendarySlayersActive) {
    rules.push({
      name: 'Legendary Slayers',
      source: `${attackerDetachment.name} Rule`,
      text: 'This attack has Lethal Hits because it is targeting a Character, Monster, or Vehicle unit, or because the Saga is completed.',
    })
  }

  if (heroesAllActive) {
    const rerollText = attackerSagaCompleted
      ? 'This unit can re-roll one Hit roll, one Wound roll, and one Damage roll while resolving this attack sequence.'
      : `This Character unit can re-roll one ${attackerHeroesAllRerollType || 'chosen'} roll while resolving this attack sequence.`
    rules.push({
      name: 'Heroes All',
      source: `${attackerDetachment.name} Rule`,
      text: rerollText,
    })
  }

  if (attackerFireDisciplineActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Fire Discipline')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerMarkedForDestructionActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Marked for Destruction')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerUnbridledFerocityActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Unbridled Ferocity')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerUnforgivenFuryActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Unforgiven Fury')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerStubbornTenacityActive && attackerBelowStartingStrength) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Stubborn Tenacity')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (attackerWeaponsOfTheFirstLegionActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Weapons of the First Legion')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (attackerPennantOfRemembranceActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Pennant of Remembrance')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (attackerEnhancementName === 'Fenrisian Grit' && hasHazardous) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Fenrisian Grit')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: 'The bearer has Feel No Pain 4+, so failed Hazardous checks use that protection.',
      })
    }
  }

  if (wolfMasterActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Wolf Master')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: 'Selected Teeth and Claws or Tyrnak and Fenrir attacks gain Lethal Hits.',
      })
    }
  }

  if (attackerEnhancementName === 'Feral Rage' && selectedWeapon?.range === 'Melee') {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Feral Rage')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: chargedThisTurn
          ? 'The bearer gets +2 melee Attacks this turn because it charged.'
          : 'The bearer gets +1 melee Attack.',
      })
    }
  }

  if (attackerEnhancementName === "Elder's Guidance" && attackerEldersGuidanceActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', "Elder's Guidance")
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: 'Blood Claws melee weapons improve their AP by 1 for this phase.',
      })
    }
  }

  if (attackerEnhancementName === "Braggart's Steel" && selectedWeapon?.range === 'Melee') {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', "Braggart's Steel")
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: attackerBoastAchieved
          ? 'The bearer gets +2 Strength and +1 Damage on melee weapons because its unit has achieved a Boast.'
          : 'The bearer gets +2 Strength on melee weapons.',
      })
    }
  }

  if (
    attackerEnhancementName === 'Hordeslayer'
    && selectedWeapon?.range === 'Melee'
    && attackerHordeslayerOutnumbered
  ) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Hordeslayer')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: attackerBoastAchieved
          ? 'The bearer gets +3 melee Attacks because it is outnumbered and its unit has achieved a Boast.'
          : 'The bearer gets +2 melee Attacks because it is outnumbered.',
      })
    }
  }

  if (selectedWeapon && inHalfRange) {
    const rapidFireValue = getWeaponKeywordValue(selectedWeapon, 'Rapid Fire')
    if (rapidFireValue > 0) {
      rules.push({
        name: `Rapid Fire ${rapidFireValue}`,
        source: 'Weapon Rule',
        text: `This weapon is in half range, so it gains ${rapidFireValue} additional attack${rapidFireValue === 1 ? '' : 's'}.`,
      })
    }

    const meltaValue = getWeaponKeywordValue(selectedWeapon, 'Melta')
    if (meltaValue > 0) {
      rules.push({
        name: `Melta ${meltaValue}`,
        source: 'Weapon Rule',
        text: `This weapon is in half range, so each unsaved attack gets +${meltaValue} damage.`,
      })
    }
  }

  if (selectedWeapon && remainedStationary) {
    const hasHeavyRule = weaponHasRawKeyword(selectedWeapon, 'Heavy') || attackerFireDisciplineActive
    if (hasHeavyRule && selectedWeapon.range !== 'Melee') {
      rules.push({
        name: 'Heavy',
        source: 'Weapon Rule',
        text: 'This unit remained Stationary, so this attack gets +1 to the Hit roll.',
      })
    }
  }

  if (selectedWeapon && chargedThisTurn && weaponHasRawKeyword(selectedWeapon, 'Lance')) {
    rules.push({
      name: 'Lance',
      source: 'Weapon Rule',
      text: 'This unit charged this turn, so this attack gets +1 to the Wound roll.',
    })
  }

  if (selectedWeapon && attackerInEngagementRange && weaponHasRawKeyword(selectedWeapon, 'Pistol')) {
    rules.push({
      name: 'Pistol',
      source: 'Weapon Rule',
      text: 'This unit is in Engagement Range, but this ranged attack is still legal because the selected weapon is a Pistol.',
    })
  }

  if (selectedWeapon && weaponHasRawKeyword(selectedWeapon, 'Indirect Fire') && !indirectTargetVisible) {
    rules.push({
      name: 'Indirect Fire',
      source: 'Weapon Rule',
      text: 'This attack is being made without visibility, so it takes -1 to Hit and unmodified hit rolls of 1-3 fail.',
    })
  }

  return rules
}

function buildDefenderActiveRules({
  defenderUnitDetails,
  selectedWeapon,
  defenderDetachment,
  defenderEnhancementName,
  defenderArmourOfContemptActive,
  defenderOverwhelmingOnslaughtActive,
  defenderUnbreakableLinesActive,
  defenderPennantOfRemembranceActive,
  targetHasCover,
  indirectTargetVisible,
  attackerFireDisciplineActive,
}) {
  const rules = [
    ...getRelevantUnitRules(defenderUnitDetails, 'defender', false),
  ]

  if (defenderArmourOfContemptActive) {
    const stratagem = getDetachmentEntry(defenderDetachment, 'stratagems', 'Armour of Contempt')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${defenderDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (defenderOverwhelmingOnslaughtActive) {
    const stratagem = getDetachmentEntry(defenderDetachment, 'stratagems', 'Overwhelming Onslaught')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${defenderDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (defenderUnbreakableLinesActive) {
    const stratagem = getDetachmentEntry(defenderDetachment, 'stratagems', 'Unbreakable Lines')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${defenderDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (defenderPennantOfRemembranceActive) {
    const enhancement = getDetachmentEntry(defenderDetachment, 'enhancements', 'Pennant of Remembrance')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${defenderDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (defenderEnhancementName === 'Fenrisian Grit') {
    const enhancement = getDetachmentEntry(defenderDetachment, 'enhancements', 'Fenrisian Grit')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${defenderDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (defenderEnhancementName === 'Helm of the Beastslayer') {
    const enhancement = getDetachmentEntry(defenderDetachment, 'enhancements', 'Helm of the Beastslayer')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${defenderDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (defenderGetsCoverBenefit({
    selectedWeapon,
    defenderUnitDetails,
    targetHasCover,
    indirectTargetVisible,
    attackerFireDisciplineActive,
  })) {
    rules.push({
      name: 'Cover',
      source: 'Terrain Rule',
      text: 'This target gets +1 to its armor save against this ranged attack.',
    })
  }

  return rules
}

function renderStatsGrid(stats) {
  return statDisplayRows.map((row, index) => (
    <div key={index} className="stat-row">
      {row.map(([key, label, formatValue]) => {
        const value = stats?.[key]
        if (value === undefined || value === null || value === '') {
          return null
        }

        if (key === 'save' && stats?.invulnerable_save) {
          return (
            <div key={key} className="stat-chip stat-chip-save">
              <span className="stat-label stat-label-save">{label}</span>
              <strong className="stat-value stat-value-save">
                {formatValue ? formatValue(value) : String(value)}
              </strong>
              <strong className="stat-value stat-value-invuln">
                {formatInvulnerableSave(stats.invulnerable_save)}
              </strong>
            </div>
          )
        }

        return (
          <div key={key} className="stat-chip">
            <span className="stat-label">{label}</span>
            <strong className="stat-value">
              {formatValue ? formatValue(value) : String(value)}
            </strong>
          </div>
        )
      })}
    </div>
  ))
}

function renderWeaponStatsGrid(weapon) {
  if (!weapon) {
    return null
  }

  const topRow = [
    ['Range', formatRangeValue(weapon.range)],
    ['A', String(weapon.attacks)],
    [weapon.skill_type || 'BS', weapon.skill_display],
  ]

  const bottomRow = [
    ['S', String(weapon.strength)],
    ['AP', weapon.ap_display],
    ['D', weapon.damage_display],
  ]

  return [topRow, bottomRow].map((row, index) => (
    <div key={index} className="stat-row">
      {row.map(([label, value]) => (
        <div key={label} className="stat-chip">
          <span className="stat-label">{label}</span>
          <strong className="stat-value">{value}</strong>
        </div>
      ))}
    </div>
  ))
}

function App() {
  const [factions, setFactions] = useState([])
  const [attackerUnits, setAttackerUnits] = useState([])
  const [defenderUnits, setDefenderUnits] = useState([])
  const [attackerFactionDetails, setAttackerFactionDetails] = useState(null)
  const [defenderFactionDetails, setDefenderFactionDetails] = useState(null)
  const [attackerUnitDetails, setAttackerUnitDetails] = useState(null)
  const [defenderUnitDetails, setDefenderUnitDetails] = useState(null)
  const [attackerAttachedLeaderUnitDetails, setAttackerAttachedLeaderUnitDetails] = useState(null)
  const [attachedCharacterUnitDetails, setAttachedCharacterUnitDetails] = useState(null)
  const [simulationRuns, setSimulationRuns] = useState([])
  const [activeRunView, setActiveRunView] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('combat')
  const [armyListEntries, setArmyListEntries] = useState([])
  const [battlefieldPositions, setBattlefieldPositions] = useState({
    attacker: { x: 20, y: 50 },
    defender: { x: 80, y: 50 },
  })
  const [draggingUnitId, setDraggingUnitId] = useState('')
  const [selectedBattlefieldUnitId, setSelectedBattlefieldUnitId] = useState('attacker')
  const [battlefieldCombatAttackerId, setBattlefieldCombatAttackerId] = useState('')
  const [battlefieldCombatWeaponNames, setBattlefieldCombatWeaponNames] = useState([])
  const battlefieldBoardRef = useRef(null)

  const [attackerFaction, setAttackerFaction] = useState('')
  const [attackerUnit, setAttackerUnit] = useState('')
  const [attackerLoadoutSelections, setAttackerLoadoutSelections] = useState({})
  const [attackerModelCount, setAttackerModelCount] = useState('')
  const [attackerModelCounts, setAttackerModelCounts] = useState({})
  const [weaponNames, setWeaponNames] = useState([])
  const [attackerAttachedLeaderName, setAttackerAttachedLeaderName] = useState('')
  const [attackerAttachedLeaderLoadoutSelections, setAttackerAttachedLeaderLoadoutSelections] = useState({})
  const [attackerAttachedLeaderModelCount, setAttackerAttachedLeaderModelCount] = useState('')
  const [attackerAttachedLeaderModelCounts, setAttackerAttachedLeaderModelCounts] = useState({})
  const [defenderFaction, setDefenderFaction] = useState('')
  const [defenderUnit, setDefenderUnit] = useState('')
  const [defenderLoadoutSelections, setDefenderLoadoutSelections] = useState({})
  const [defenderModelCount, setDefenderModelCount] = useState('')
  const [defenderModelCounts, setDefenderModelCounts] = useState({})
  const [attachedCharacterName, setAttachedCharacterName] = useState('')
  const [attachedCharacterLoadoutSelections, setAttachedCharacterLoadoutSelections] = useState({})
  const [attachedCharacterModelCount, setAttachedCharacterModelCount] = useState('')
  const [attachedCharacterModelCounts, setAttachedCharacterModelCounts] = useState({})
  const [attackerDetachmentName, setAttackerDetachmentName] = useState('')
  const [defenderDetachmentName, setDefenderDetachmentName] = useState('')
  const [attackerEnhancementName, setAttackerEnhancementName] = useState('')
  const [defenderEnhancementName, setDefenderEnhancementName] = useState('')
  const [runCount, setRunCount] = useState('1')

  const [targetHasCover, setTargetHasCover] = useState(initialOptions.target_has_cover)
  const [attackerInEngagementRange, setAttackerInEngagementRange] = useState(initialOptions.attacker_in_engagement_range)
  const [targetInEngagementRangeOfAllies, setTargetInEngagementRangeOfAllies] = useState(initialOptions.target_in_engagement_range_of_allies)
  const [inHalfRange, setInHalfRange] = useState(initialOptions.in_half_range)
  const [oathOfMomentActive, setOathOfMomentActive] = useState(initialOptions.oath_of_moment_active)
  const [chargedThisTurn, setChargedThisTurn] = useState(initialOptions.charged_this_turn)
  const [remainedStationary, setRemainedStationary] = useState(initialOptions.remained_stationary)
  const [indirectTargetVisible, setIndirectTargetVisible] = useState(initialOptions.indirect_target_visible)
  const [hazardousOverwatchChargePhase, setHazardousOverwatchChargePhase] = useState(initialOptions.hazardous_overwatch_charge_phase)
  const [hazardousBearerCurrentWounds, setHazardousBearerCurrentWounds] = useState(initialOptions.hazardous_bearer_current_wounds)
  const [attackerFireDisciplineActive, setAttackerFireDisciplineActive] = useState(initialOptions.attacker_fire_discipline_active)
  const [attackerMarkedForDestructionActive, setAttackerMarkedForDestructionActive] = useState(initialOptions.attacker_marked_for_destruction_active)
  const [attackerUnforgivenFuryActive, setAttackerUnforgivenFuryActive] = useState(initialOptions.attacker_unforgiven_fury_active)
  const [attackerUnforgivenFuryArmyBattleshocked, setAttackerUnforgivenFuryArmyBattleshocked] = useState(initialOptions.attacker_unforgiven_fury_army_battleshocked)
  const [attackerStubbornTenacityActive, setAttackerStubbornTenacityActive] = useState(initialOptions.attacker_stubborn_tenacity_active)
  const [attackerWeaponsOfTheFirstLegionActive, setAttackerWeaponsOfTheFirstLegionActive] = useState(initialOptions.attacker_weapons_of_the_first_legion_active)
  const [attackerPennantOfRemembranceActive, setAttackerPennantOfRemembranceActive] = useState(initialOptions.attacker_pennant_of_remembrance_active)
  const [attackerBelowStartingStrength, setAttackerBelowStartingStrength] = useState(initialOptions.attacker_below_starting_strength)
  const [attackerBattleshocked, setAttackerBattleshocked] = useState(initialOptions.attacker_battleshocked)
  const [attackerSagaCompleted, setAttackerSagaCompleted] = useState(initialOptions.attacker_saga_completed)
  const [attackerEldersGuidanceActive, setAttackerEldersGuidanceActive] = useState(initialOptions.attacker_elders_guidance_active)
  const [attackerBoastAchieved, setAttackerBoastAchieved] = useState(initialOptions.attacker_boast_achieved)
  const [attackerHordeslayerOutnumbered, setAttackerHordeslayerOutnumbered] = useState(initialOptions.attacker_hordeslayer_outnumbered)
  const [attackerHeroesAllRerollType, setAttackerHeroesAllRerollType] = useState(initialOptions.attacker_heroes_all_reroll_type)
  const [attackerUnbridledFerocityActive, setAttackerUnbridledFerocityActive] = useState(initialOptions.attacker_unbridled_ferocity_active)
  const [attackerWaaaghActive, setAttackerWaaaghActive] = useState(initialOptions.attacker_waaagh_active)
  const [defenderWaaaghActive, setDefenderWaaaghActive] = useState(initialOptions.defender_waaagh_active)
  const [attackerPreyActive, setAttackerPreyActive] = useState(initialOptions.attacker_prey_active)
  const [attackerTargetWithinNine, setAttackerTargetWithinNine] = useState(initialOptions.attacker_target_within_9)
  const [attackerCountsAsTenPlusModels, setAttackerCountsAsTenPlusModels] = useState(initialOptions.attacker_counts_as_ten_plus_models)
  const [defenderCountsAsTenPlusModels, setDefenderCountsAsTenPlusModels] = useState(initialOptions.defender_counts_as_ten_plus_models)
  const [targetBelowStartingStrength, setTargetBelowStartingStrength] = useState(initialOptions.target_below_starting_strength)
  const [targetBelowHalfStrength, setTargetBelowHalfStrength] = useState(initialOptions.target_below_half_strength)
  const [attackerTryDatButtonEffects, setAttackerTryDatButtonEffects] = useState(initialOptions.attacker_try_dat_button_effects)
  const [attackerTryDatButtonHazardous, setAttackerTryDatButtonHazardous] = useState(initialOptions.attacker_try_dat_button_hazardous)
  const [attackerUnbridledCarnageActive, setAttackerUnbridledCarnageActive] = useState(initialOptions.attacker_unbridled_carnage_active)
  const [defenderArdAsNailsActive, setDefenderArdAsNailsActive] = useState(initialOptions.defender_ard_as_nails_active)
  const [attackerDragItDownActive, setAttackerDragItDownActive] = useState(initialOptions.attacker_drag_it_down_active)
  const [defenderStalkinTaktiksActive, setDefenderStalkinTaktiksActive] = useState(initialOptions.defender_stalkin_taktiks_active)
  const [defenderSpeediestFreeksActive, setDefenderSpeediestFreeksActive] = useState(initialOptions.defender_speediest_freeks_active)
  const [attackerBlitzaFireActive, setAttackerBlitzaFireActive] = useState(initialOptions.attacker_blitza_fire_active)
  const [attackerDakkastormActive, setAttackerDakkastormActive] = useState(initialOptions.attacker_dakkastorm_active)
  const [attackerFullThrottleActive, setAttackerFullThrottleActive] = useState(initialOptions.attacker_full_throttle_active)
  const [attackerKlankinKlawsActive, setAttackerKlankinKlawsActive] = useState(initialOptions.attacker_klankin_klaws_active)
  const [attackerKlankinKlawsPushed, setAttackerKlankinKlawsPushed] = useState(initialOptions.attacker_klankin_klaws_pushed)
  const [attackerDakkaDakkaDakkaActive, setAttackerDakkaDakkaDakkaActive] = useState(initialOptions.attacker_dakka_dakka_dakka_active)
  const [attackerDakkaDakkaDakkaPushed, setAttackerDakkaDakkaDakkaPushed] = useState(initialOptions.attacker_dakka_dakka_dakka_pushed)
  const [attackerBiggerShellsActive, setAttackerBiggerShellsActive] = useState(initialOptions.attacker_bigger_shells_active)
  const [attackerBiggerShellsPushed, setAttackerBiggerShellsPushed] = useState(initialOptions.attacker_bigger_shells_pushed)
  const [defenderExtraGubbinzActive, setDefenderExtraGubbinzActive] = useState(initialOptions.defender_extra_gubbinz_active)
  const [attackerCompetitiveStreakActive, setAttackerCompetitiveStreakActive] = useState(initialOptions.attacker_competitive_streak_active)
  const [attackerArmedToDaTeefActive, setAttackerArmedToDaTeefActive] = useState(initialOptions.attacker_armed_to_da_teef_active)
  const [defenderHulkingBrutesActive, setDefenderHulkingBrutesActive] = useState(initialOptions.defender_hulking_brutes_active)
  const [defenderArmourOfContemptActive, setDefenderArmourOfContemptActive] = useState(initialOptions.defender_armour_of_contempt_active)
  const [defenderOverwhelmingOnslaughtActive, setDefenderOverwhelmingOnslaughtActive] = useState(initialOptions.defender_overwhelming_onslaught_active)
  const [defenderUnbreakableLinesActive, setDefenderUnbreakableLinesActive] = useState(initialOptions.defender_unbreakable_lines_active)
  const [defenderPennantOfRemembranceActive, setDefenderPennantOfRemembranceActive] = useState(initialOptions.defender_pennant_of_remembrance_active)
  const [defenderBattleshocked, setDefenderBattleshocked] = useState(initialOptions.defender_battleshocked)

  useEffect(() => {
    async function loadFactions() {
      try {
        setLoading(true)
        const data = await fetchFactions()
        const items = data.items || []
        setFactions(items)
        if (items[0]) {
          setAttackerFaction(items[0].name)
          setDefenderFaction(items[0].name)
        }
      } catch (requestError) {
        setError(formatError(requestError))
      } finally {
        setLoading(false)
      }
    }

    loadFactions()
  }, [])

  useEffect(() => {
    if (!attackerFaction) {
      return
    }

    let active = true
    setAttackerUnitDetails(null)
    setWeaponNames([])

    async function loadAttackerUnits() {
      try {
        const data = await fetchUnits(attackerFaction)
        if (!active) {
          return
        }
        const items = data.items || []
        setAttackerUnits(items)
        setAttackerUnit((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerUnits()

    return () => {
      active = false
    }
  }, [attackerFaction])

  useEffect(() => {
    if (!attackerFaction) {
      return
    }

    let active = true

    async function loadAttackerFactionDetails() {
      try {
        const data = await fetchFactionDetails(attackerFaction)
        if (!active) {
          return
        }
        setAttackerFactionDetails(data)
        setAttackerDetachmentName((currentDetachment) => (
          data.detachments?.some((detachment) => detachment.name === currentDetachment)
            ? currentDetachment
            : data.detachments?.[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerFactionDetails()

    return () => {
      active = false
    }
  }, [attackerFaction])

  useEffect(() => {
    if (!defenderFaction) {
      return
    }

    let active = true
    setDefenderUnitDetails(null)
    setAttachedCharacterName('')

    async function loadDefenderUnits() {
      try {
        const data = await fetchUnits(defenderFaction)
        if (!active) {
          return
        }
        const items = data.items || []
        setDefenderUnits(items)
        setDefenderUnit((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadDefenderUnits()

    return () => {
      active = false
    }
  }, [defenderFaction])

  useEffect(() => {
    if (!defenderFaction) {
      return
    }

    let active = true

    async function loadDefenderFactionDetails() {
      try {
        const data = await fetchFactionDetails(defenderFaction)
        if (!active) {
          return
        }
        setDefenderFactionDetails(data)
        setDefenderDetachmentName((currentDetachment) => (
          data.detachments?.some((detachment) => detachment.name === currentDetachment)
            ? currentDetachment
            : data.detachments?.[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadDefenderFactionDetails()

    return () => {
      active = false
    }
  }, [defenderFaction])

  useEffect(() => {
    setAttackerLoadoutSelections({})
    setAttackerModelCount('')
    setAttackerModelCounts({})
    setAttackerAttachedLeaderName('')
  }, [attackerFaction, attackerUnit])

  useEffect(() => {
    setDefenderLoadoutSelections({})
    setDefenderModelCount('')
    setDefenderModelCounts({})
  }, [defenderFaction, defenderUnit])

  useEffect(() => {
    setAttackerAttachedLeaderLoadoutSelections({})
    setAttackerAttachedLeaderModelCount('')
    setAttackerAttachedLeaderModelCounts({})
    setAttackerAttachedLeaderUnitDetails(null)
  }, [attackerAttachedLeaderName])

  useEffect(() => {
    setAttachedCharacterLoadoutSelections({})
    setAttachedCharacterModelCount('')
    setAttachedCharacterModelCounts({})
    setAttachedCharacterUnitDetails(null)
  }, [attachedCharacterName])

  useEffect(() => {
    if (!attackerFaction || !attackerUnit || !attackerUnits.some((unit) => unit.name === attackerUnit)) {
      return
    }

    let active = true

    async function loadAttackerUnitDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          attackerFaction,
          attackerUnit,
          attackerLoadoutSelections,
          attackerModelCount,
          attackerModelCounts,
        )
        if (!active) {
          return
        }
        setAttackerUnitDetails(data)
        setAttackerModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setAttackerModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerUnitDetails()

    return () => {
      active = false
    }
  }, [attackerFaction, attackerLoadoutSelections, attackerModelCount, attackerModelCounts, attackerUnit, attackerUnits])

  const attackerAttachedLeaderOptions = useMemo(() => {
    if (!attackerUnit || !attackerFactionDetails?.units?.length) {
      return []
    }
    return attackerFactionDetails.units.filter((unit) => {
      const canLead = unit.leader?.can_lead || []
      return unit.name !== attackerUnit && canLead.includes(attackerUnit)
    })
  }, [attackerFactionDetails, attackerUnit])

  useEffect(() => {
    if (
      !attackerAttachedLeaderName
      || !attackerFaction
      || !attackerAttachedLeaderOptions.some((unit) => unit.name === attackerAttachedLeaderName)
    ) {
      return
    }

    let active = true

    async function loadAttackerAttachedLeaderDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          attackerFaction,
          attackerAttachedLeaderName,
          attackerAttachedLeaderLoadoutSelections,
          attackerAttachedLeaderModelCount,
          attackerAttachedLeaderModelCounts,
        )
        if (!active) {
          return
        }
        setAttackerAttachedLeaderUnitDetails(data)
        setAttackerAttachedLeaderModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setAttackerAttachedLeaderModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerAttachedLeaderDetails()

    return () => {
      active = false
    }
  }, [
    attackerAttachedLeaderLoadoutSelections,
    attackerAttachedLeaderModelCount,
    attackerAttachedLeaderModelCounts,
    attackerAttachedLeaderName,
    attackerAttachedLeaderOptions,
    attackerFaction,
  ])

  useEffect(() => {
    if (!defenderFaction || !defenderUnit || !defenderUnits.some((unit) => unit.name === defenderUnit)) {
      return
    }

    let active = true

    async function loadDefenderUnitDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          defenderFaction,
          defenderUnit,
          defenderLoadoutSelections,
          defenderModelCount,
          defenderModelCounts,
        )
        if (!active) {
          return
        }
        setDefenderUnitDetails(data)
        setDefenderModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setDefenderModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadDefenderUnitDetails()

    return () => {
      active = false
    }
  }, [defenderFaction, defenderLoadoutSelections, defenderModelCount, defenderModelCounts, defenderUnit, defenderUnits])

  const combatWeaponOptions = useMemo(
    () => getCombatWeaponOptions(attackerUnitDetails, attackerAttachedLeaderUnitDetails),
    [attackerAttachedLeaderUnitDetails, attackerUnitDetails],
  )
  const selectedCombatWeaponOptions = useMemo(
    () => combatWeaponOptions.filter((weapon) => weaponNames.includes(weapon.name)),
    [combatWeaponOptions, weaponNames],
  )
  const selectedAttackEntries = useMemo(
    () => getSelectedAttackEntries(attackerUnitDetails, attackerAttachedLeaderUnitDetails, weaponNames),
    [attackerAttachedLeaderUnitDetails, attackerUnitDetails, weaponNames],
  )
  const selectedAttackWeapons = useMemo(
    () => selectedAttackEntries.map((entry) => entry.weapon),
    [selectedAttackEntries],
  )
  const selectedAttackWeaponLabels = useMemo(
    () => selectedAttackEntries.map((entry) => entry.label),
    [selectedAttackEntries],
  )
  const selectedWeapon = useMemo(
    () => buildWeaponSelectionProfile(
      selectedAttackWeapons,
      selectedCombatWeaponOptions.map((weapon) => formatWeaponName(weapon)),
    ),
    [selectedAttackWeapons, selectedCombatWeaponOptions],
  )
  const attackerPackageIsCharacterUnit = unitHasKeyword(attackerUnitDetails, 'character') || unitHasKeyword(attackerAttachedLeaderUnitDetails, 'character')
  const attackerPackageModelCount = Number(attackerUnitDetails?.model_count ?? 0) + Number(attackerAttachedLeaderUnitDetails?.model_count ?? 0)
  const defenderPackageModelCount = Number(defenderUnitDetails?.model_count ?? 0) + Number(attachedCharacterUnitDetails?.model_count ?? 0)
  const isRangedWeapon = selectedAttackWeapons.some((weapon) => weapon.range !== 'Melee')
  const isMeleeWeapon = selectedAttackWeapons.some((weapon) => weapon.range === 'Melee')
  const hasHeavy = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Heavy'))
  const hasBlast = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Blast'))
  const hasIndirectFire = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Indirect Fire'))
  const hasHazardous = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Hazardous'))
  const canUsePrecision = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Precision'))
  const canUseLance = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Lance'))

  useEffect(() => {
    if (!combatWeaponOptions.length) {
      if (weaponNames.length) {
        setWeaponNames([])
      }
      return
    }
    const validWeaponNames = weaponNames.filter((weaponName) => combatWeaponOptions.some((weapon) => weapon.name === weaponName))
    if (validWeaponNames.length === weaponNames.length && validWeaponNames.length > 0) {
      return
    }
    if (validWeaponNames.length > 0) {
      setWeaponNames(validWeaponNames)
      return
    }
    setWeaponNames([combatWeaponOptions[0].name])
  }, [combatWeaponOptions, weaponNames])

  const attachedCharacterOptions = useMemo(() => {
    if (!defenderUnit || !defenderFactionDetails?.units?.length) {
      return []
    }
    return defenderFactionDetails.units.filter((unit) => {
      const canLead = unit.leader?.can_lead || []
      return unit.name !== defenderUnit && canLead.includes(defenderUnit)
    })
  }, [defenderFactionDetails, defenderUnit])

  useEffect(() => {
    const attackerLeaderStillValid = attackerAttachedLeaderOptions.some((unit) => unit.name === attackerAttachedLeaderName)
    if (!attackerAttachedLeaderName || attackerLeaderStillValid) {
      return
    }
    setAttackerAttachedLeaderName('')
    if (attackerAttachedLeaderUnitDetails) {
      setAttackerAttachedLeaderUnitDetails(null)
    }
    if (Object.keys(attackerAttachedLeaderLoadoutSelections).length) {
      setAttackerAttachedLeaderLoadoutSelections({})
    }
    if (attackerAttachedLeaderModelCount !== '') {
      setAttackerAttachedLeaderModelCount('')
    }
    if (Object.keys(attackerAttachedLeaderModelCounts).length) {
      setAttackerAttachedLeaderModelCounts({})
    }
  }, [
    attackerAttachedLeaderLoadoutSelections,
    attackerAttachedLeaderModelCount,
    attackerAttachedLeaderModelCounts,
    attackerAttachedLeaderName,
    attackerAttachedLeaderOptions,
    attackerAttachedLeaderUnitDetails,
  ])

  useEffect(() => {
    if (
      !canUsePrecision
      || !attachedCharacterName
      || !defenderFaction
      || !attachedCharacterOptions.some((unit) => unit.name === attachedCharacterName)
    ) {
      return
    }

    let active = true

    async function loadAttachedCharacterUnitDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          defenderFaction,
          attachedCharacterName,
          attachedCharacterLoadoutSelections,
          attachedCharacterModelCount,
          attachedCharacterModelCounts,
        )
        if (!active) {
          return
        }
        setAttachedCharacterUnitDetails(data)
        setAttachedCharacterModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setAttachedCharacterModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttachedCharacterUnitDetails()

    return () => {
      active = false
    }
  }, [
    attachedCharacterLoadoutSelections,
    attachedCharacterModelCount,
    attachedCharacterModelCounts,
    attachedCharacterName,
    attachedCharacterOptions,
    canUsePrecision,
    defenderFaction,
  ])

  const selectedAttackerDetachment = useMemo(
    () => getDetachmentByName(attackerFactionDetails, attackerDetachmentName),
    [attackerFactionDetails, attackerDetachmentName],
  )

  const selectedDefenderDetachment = useMemo(
    () => getDetachmentByName(defenderFactionDetails, defenderDetachmentName),
    [defenderFactionDetails, defenderDetachmentName],
  )
  const resolvedAttackerLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(attackerUnitDetails, attackerLoadoutSelections),
    [attackerLoadoutSelections, attackerUnitDetails],
  )
  const resolvedAttackerModelCounts = useMemo(
    () => getResolvedModelCountSelections(attackerUnitDetails, attackerModelCounts),
    [attackerModelCounts, attackerUnitDetails],
  )
  const resolvedAttackerAttachedLeaderLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(attackerAttachedLeaderUnitDetails, attackerAttachedLeaderLoadoutSelections),
    [attackerAttachedLeaderLoadoutSelections, attackerAttachedLeaderUnitDetails],
  )
  const resolvedAttackerAttachedLeaderModelCounts = useMemo(
    () => getResolvedModelCountSelections(attackerAttachedLeaderUnitDetails, attackerAttachedLeaderModelCounts),
    [attackerAttachedLeaderModelCounts, attackerAttachedLeaderUnitDetails],
  )
  const resolvedDefenderLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(defenderUnitDetails, defenderLoadoutSelections),
    [defenderLoadoutSelections, defenderUnitDetails],
  )
  const resolvedDefenderModelCounts = useMemo(
    () => getResolvedModelCountSelections(defenderUnitDetails, defenderModelCounts),
    [defenderModelCounts, defenderUnitDetails],
  )
  const resolvedAttachedCharacterLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(attachedCharacterUnitDetails, attachedCharacterLoadoutSelections),
    [attachedCharacterLoadoutSelections, attachedCharacterUnitDetails],
  )
  const resolvedAttachedCharacterModelCounts = useMemo(
    () => getResolvedModelCountSelections(attachedCharacterUnitDetails, attachedCharacterModelCounts),
    [attachedCharacterModelCounts, attachedCharacterUnitDetails],
  )
  const canUseCover = isRangedWeapon
  const canUseHalfRange = isRangedWeapon && (
    selectedAttackWeapons.some((weapon) => getWeaponKeywordValue(weapon, 'Rapid Fire') > 0)
    || selectedAttackWeapons.some((weapon) => getWeaponKeywordValue(weapon, 'Melta') > 0)
  )
  const hasOathOfMoment = unitHasOathOfMoment(attackerUnitDetails)
  const attackerEnhancementBearerUnit = attackerAttachedLeaderUnitDetails || attackerUnitDetails
  const defenderEnhancementBearerUnit = attachedCharacterUnitDetails || defenderUnitDetails
  const attackerEnhancementOptions = useMemo(
    () => getAttackerEnhancementOptions(
      selectedAttackerDetachment,
      attackerEnhancementBearerUnit,
      attackerUnitDetails,
      selectedWeapon,
      hasHazardous,
    ),
    [selectedAttackerDetachment, attackerEnhancementBearerUnit, attackerUnitDetails, selectedWeapon, hasHazardous],
  )
  const defenderEnhancementOptions = useMemo(
    () => getDefenderEnhancementOptions(selectedDefenderDetachment, defenderEnhancementBearerUnit),
    [selectedDefenderDetachment, defenderEnhancementBearerUnit],
  )
  const attackerStratagemOptions = useMemo(
    () => getAttackerStratagemOptions(selectedAttackerDetachment, attackerUnitDetails, isRangedWeapon),
    [selectedAttackerDetachment, attackerUnitDetails, isRangedWeapon],
  )
  const defenderStratagemOptions = useMemo(
    () => getDefenderStratagemOptions(selectedDefenderDetachment, selectedWeapon),
    [selectedDefenderDetachment, selectedWeapon],
  )

  const canUseAttackerFireDiscipline = attackerStratagemOptions.some((item) => item.name === 'Fire Discipline')
  const canUseAttackerMarkedForDestruction = attackerStratagemOptions.some((item) => item.name === 'Marked for Destruction')
  const canUseAttackerUnforgivenFury = attackerStratagemOptions.some((item) => item.name === 'Unforgiven Fury')
  const canUseAttackerUnbridledFerocity = attackerStratagemOptions.some((item) => item.name === 'Unbridled Ferocity')
  const canUseAttackerUnbridledCarnage = attackerStratagemOptions.some((item) => item.name === 'Unbridled Carnage')
  const canUseAttackerDragItDown = attackerStratagemOptions.some((item) => item.name === 'Drag It Down')
  const canUseAttackerBlitzaFire = attackerStratagemOptions.some((item) => item.name === 'Blitza Fire')
  const canUseAttackerDakkastorm = attackerStratagemOptions.some((item) => item.name === 'Dakkastorm')
  const canUseAttackerFullThrottle = attackerStratagemOptions.some((item) => item.name === 'Full Throttle!')
  const canUseAttackerKlankinKlaws = attackerStratagemOptions.some((item) => item.name === "Klankin' Klaws")
  const canUseAttackerDakkaDakkaDakka = attackerStratagemOptions.some((item) => item.name === 'Dakka! Dakka! Dakka!')
  const canUseAttackerBiggerShells = attackerStratagemOptions.some((item) => item.name === 'Bigger Shells for Bigger Gitz')
  const canUseAttackerCompetitiveStreak = attackerStratagemOptions.some((item) => item.name === 'Competitive Streak')
  const canUseAttackerArmedToDaTeef = attackerStratagemOptions.some((item) => item.name === 'Armed to da Teef')
  const canUseDefenderArmourOfContempt = defenderStratagemOptions.some((item) => item.name === 'Armour of Contempt')
  const canUseDefenderOverwhelmingOnslaught = defenderStratagemOptions.some((item) => item.name === 'Overwhelming Onslaught')
  const canUseDefenderUnbreakableLines = defenderStratagemOptions.some((item) => item.name === 'Unbreakable Lines')
  const canUseDefenderArdAsNails = defenderStratagemOptions.some((item) => item.name === "'Ard as Nails")
  const canUseDefenderStalkinTaktiks = defenderStratagemOptions.some((item) => item.name === "Stalkin' Taktiks")
  const canUseDefenderSpeediestFreeks = defenderStratagemOptions.some((item) => item.name === 'Speediest Freeks')
  const canUseDefenderExtraGubbinz = defenderStratagemOptions.some((item) => item.name === 'Extra Gubbinz')
  const canUseDefenderHulkingBrutes = defenderStratagemOptions.some((item) => item.name === 'Hulking Brutes')
  const canUseAttackerWaaagh = unitHasWaaagh(attackerUnitDetails) || unitHasWaaagh(attackerAttachedLeaderUnitDetails)
  const canUseDefenderWaaagh = unitHasWaaagh(defenderUnitDetails) || unitHasWaaagh(attachedCharacterUnitDetails)
  const canUseAttackerPrey = selectedAttackerDetachment?.name === DA_BIG_HUNT
  const canUseTargetWithinNine = selectedAttackerDetachment?.name === KULT_OF_SPEED && (canUseAttackerBlitzaFire || canUseAttackerDakkastorm)
  const canUseTargetBelowStartingStrength = attackerEnhancementName === "'Eadstompa"
  const canUseTargetBelowHalfStrength = attackerEnhancementName === "'Eadstompa"
  const canUseAttackerCountsAsTenPlus = selectedAttackerDetachment?.name === GREEN_TIDE && attackerPackageModelCount < 10
  const canUseDefenderCountsAsTenPlus = selectedDefenderDetachment?.name === GREEN_TIDE && defenderPackageModelCount < 10
  const canUseTryDatButton = selectedAttackerDetachment?.name === DREAD_MOB && (
    unitHasKeyword(attackerUnitDetails, 'mek')
    || unitHasKeyword(attackerUnitDetails, 'walker')
    || (
      unitHasKeyword(attackerUnitDetails, 'vehicle')
      && (unitHasKeyword(attackerUnitDetails, 'gretchin') || unitHasKeyword(attackerUnitDetails, 'grots'))
    )
  )
  const canUseSagaCompleted = [SAGA_OF_THE_HUNTER, SAGA_OF_THE_BEASTSLAYER, SAGA_OF_THE_BOLD].includes(selectedAttackerDetachment?.name || '')
  const canUseHeroesAllRerollType = selectedAttackerDetachment?.name === SAGA_OF_THE_BOLD && !attackerSagaCompleted && attackerPackageIsCharacterUnit
  const canUseEldersGuidance = attackerEnhancementName === "Elder's Guidance" && isMeleeWeapon && attackerUnitDetails?.name === 'Blood Claws'
  const canUseBoastAchieved = attackerEnhancementName === "Braggart's Steel" || attackerEnhancementName === 'Hordeslayer'
  const canUseHordeslayerOutnumbered = attackerEnhancementName === 'Hordeslayer'
  const canUseTargetInEngagementRangeOfAllies = hasBlast || (selectedAttackerDetachment?.name === SAGA_OF_THE_HUNTER && isMeleeWeapon)
  const selectedAttackerEnhancement = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'enhancements', attackerEnhancementName),
    [selectedAttackerDetachment, attackerEnhancementName],
  )
  const selectedDefenderEnhancement = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'enhancements', defenderEnhancementName),
    [selectedDefenderDetachment, defenderEnhancementName],
  )
  const fireDisciplineEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Fire Discipline'),
    [selectedAttackerDetachment],
  )
  const markedForDestructionEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Marked for Destruction'),
    [selectedAttackerDetachment],
  )
  const unforgivenFuryEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unforgiven Fury'),
    [selectedAttackerDetachment],
  )
  const unbridledFerocityEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unbridled Ferocity'),
    [selectedAttackerDetachment],
  )
  const unbridledCarnageEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unbridled Carnage'),
    [selectedAttackerDetachment],
  )
  const dragItDownEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Drag It Down'),
    [selectedAttackerDetachment],
  )
  const blitzaFireEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Blitza Fire'),
    [selectedAttackerDetachment],
  )
  const dakkastormEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Dakkastorm'),
    [selectedAttackerDetachment],
  )
  const fullThrottleEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Full Throttle!'),
    [selectedAttackerDetachment],
  )
  const klankinKlawsEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', "Klankin' Klaws"),
    [selectedAttackerDetachment],
  )
  const dakkaDakkaDakkaEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Dakka! Dakka! Dakka!'),
    [selectedAttackerDetachment],
  )
  const biggerShellsEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Bigger Shells for Bigger Gitz'),
    [selectedAttackerDetachment],
  )
  const competitiveStreakEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Competitive Streak'),
    [selectedAttackerDetachment],
  )
  const armedToDaTeefEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Armed to da Teef'),
    [selectedAttackerDetachment],
  )
  const armourOfContemptEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Armour of Contempt'),
    [selectedDefenderDetachment],
  )
  const overwhelmingOnslaughtEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Overwhelming Onslaught'),
    [selectedDefenderDetachment],
  )
  const unbreakableLinesEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Unbreakable Lines'),
    [selectedDefenderDetachment],
  )
  const ardAsNailsEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', "'Ard as Nails"),
    [selectedDefenderDetachment],
  )
  const stalkinTaktiksEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', "Stalkin' Taktiks"),
    [selectedDefenderDetachment],
  )
  const speediestFreeksEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Speediest Freeks'),
    [selectedDefenderDetachment],
  )
  const extraGubbinzEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Extra Gubbinz'),
    [selectedDefenderDetachment],
  )
  const hulkingBrutesEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Hulking Brutes'),
    [selectedDefenderDetachment],
  )
  const oathAbility = useMemo(
    () => getUnitAbility(attackerUnitDetails, (ability) => {
      const name = String(ability.name || '').toLowerCase()
      const rulesText = String(ability.rules_text || '').toLowerCase()
      return name.includes('oath of moment') || rulesText.includes('oath of moment')
    }),
    [attackerUnitDetails],
  )
  const rapidFireValue = selectedAttackWeapons.reduce(
    (maximumValue, weapon) => Math.max(maximumValue, getWeaponKeywordValue(weapon, 'Rapid Fire')),
    0,
  )
  const meltaValue = selectedAttackWeapons.reduce(
    (maximumValue, weapon) => Math.max(maximumValue, getWeaponKeywordValue(weapon, 'Melta')),
    0,
  )
  const attackerDetachmentTooltip = formatDetachmentTooltip(selectedAttackerDetachment)
  const defenderDetachmentTooltip = formatDetachmentTooltip(selectedDefenderDetachment)
  const attackerEnhancementTooltip = formatEnhancementTooltip(selectedAttackerEnhancement)
  const defenderEnhancementTooltip = formatEnhancementTooltip(selectedDefenderEnhancement)
  const fireDisciplineTooltip = formatStratagemTooltip(fireDisciplineEntry)
  const markedForDestructionTooltip = formatStratagemTooltip(markedForDestructionEntry)
  const unforgivenFuryTooltip = formatStratagemTooltip(unforgivenFuryEntry)
  const unbridledFerocityTooltip = formatStratagemTooltip(unbridledFerocityEntry)
  const unbridledCarnageTooltip = formatStratagemTooltip(unbridledCarnageEntry)
  const dragItDownTooltip = formatStratagemTooltip(dragItDownEntry)
  const blitzaFireTooltip = formatStratagemTooltip(blitzaFireEntry)
  const dakkastormTooltip = formatStratagemTooltip(dakkastormEntry)
  const fullThrottleTooltip = formatStratagemTooltip(fullThrottleEntry)
  const klankinKlawsTooltip = formatStratagemTooltip(klankinKlawsEntry)
  const dakkaDakkaDakkaTooltip = formatStratagemTooltip(dakkaDakkaDakkaEntry)
  const biggerShellsTooltip = formatStratagemTooltip(biggerShellsEntry)
  const competitiveStreakTooltip = formatStratagemTooltip(competitiveStreakEntry)
  const armedToDaTeefTooltip = formatStratagemTooltip(armedToDaTeefEntry)
  const armourOfContemptTooltip = formatStratagemTooltip(armourOfContemptEntry)
  const overwhelmingOnslaughtTooltip = formatStratagemTooltip(overwhelmingOnslaughtEntry)
  const unbreakableLinesTooltip = formatStratagemTooltip(unbreakableLinesEntry)
  const ardAsNailsTooltip = formatStratagemTooltip(ardAsNailsEntry)
  const stalkinTaktiksTooltip = formatStratagemTooltip(stalkinTaktiksEntry)
  const speediestFreeksTooltip = formatStratagemTooltip(speediestFreeksEntry)
  const extraGubbinzTooltip = formatStratagemTooltip(extraGubbinzEntry)
  const hulkingBrutesTooltip = formatStratagemTooltip(hulkingBrutesEntry)
  const oathTooltip = buildTooltip(
    OATH_OF_MOMENT_RULE_TEXT,
    unitGetsOathWoundBonus(attackerUnitDetails)
      ? OATH_OF_MOMENT_CODEX_RIDER_TEXT
      : '',
    oathAbility?.rules_text && oathAbility.rules_text !== 'Oath of Moment'
      ? `Datasheet entry: ${oathAbility.rules_text}`
      : '',
  )
  const halfRangeTooltip = buildTooltip(
    rapidFireValue > 0
      ? `Rapid Fire ${rapidFireValue}: if the target is in half range, this weapon gains ${rapidFireValue} additional attack${rapidFireValue === 1 ? '' : 's'}.`
      : '',
    meltaValue > 0
      ? `Melta ${meltaValue}: if the target is in half range, each unsaved attack gets +${meltaValue} damage.`
      : '',
  )
  const coverTooltip = 'Benefit of Cover improves the armor save by 1 against ranged attacks. It does not improve invulnerable saves and does not help a 3+ or better save against AP 0.'
  const engagementTooltip = weaponHasRawKeyword(selectedWeapon, 'Pistol')
    ? 'Pistol: this ranged attack can still be made while the attacker is in Engagement Range, but it must target an enemy unit within Engagement Range.'
    : 'Non-Pistol ranged weapons are usually not allowed while the attacker is in Engagement Range unless the attacker is a Monster or Vehicle.'
  const heavyTooltip = 'Heavy: if the unit remained Stationary, add 1 to the Hit roll for this attack.'
  const blastTooltip = 'Blast: this weapon cannot target a unit that is within Engagement Range of allied units.'
  const packsQuarryTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', "Pack's Quarry")?.rules_text || ''
  const targetInEngagementTooltip = hasBlast && selectedAttackerDetachment?.name === SAGA_OF_THE_HUNTER && isMeleeWeapon
    ? buildTooltip(blastTooltip, packsQuarryTooltip)
    : selectedAttackerDetachment?.name === SAGA_OF_THE_HUNTER && isMeleeWeapon
      ? packsQuarryTooltip
      : blastTooltip

  function renderLoadoutSelectors(sideLabel, unitDetails, loadoutSelections, setLoadoutSelections) {
    if (!unitDetails?.loadout_options?.length) {
      return null
    }

    return (
      <div className="cluster two-up">
        {unitDetails.loadout_options.map((group) => {
          if (group.selection_type === 'count') {
            const maximumTotal = getLoadoutGroupMaxTotal(unitDetails, group)
            const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections)
            const currentGroupSelection = resolvedSelections[group.id] && typeof resolvedSelections[group.id] === 'object'
              ? resolvedSelections[group.id]
              : {}
            const currentTotal = Object.values(currentGroupSelection).reduce(
              (sum, value) => sum + (Number(value) || 0),
              0,
            )

            return (
              <div key={`${sideLabel}-${group.id}`}>
                <span>{`${sideLabel} ${group.label}`}</span>
                {(group.options || []).map((option) => {
                  const maximumCount = getLoadoutOptionMaxCount(unitDetails, group, option)
                  const currentValue = Number(getLoadoutCountSelectionValue(unitDetails, loadoutSelections, group, option.id)) || 0
                  const remainingAllowance = Math.max(0, maximumTotal - (currentTotal - currentValue))
                  const inputMaximum = Math.min(maximumCount, remainingAllowance)

                  return (
                    <label key={`${sideLabel}-${group.id}-${option.id}`}>
                      <span>{formatLoadoutOptionLabel(option)}</span>
                      <input
                        type="number"
                        min="0"
                        max={String(inputMaximum)}
                        value={String(currentValue)}
                        onChange={(event) => {
                          const nextValue = Math.max(
                            0,
                            Math.min(
                              inputMaximum,
                              Number(event.target.value) || 0,
                            ),
                          )
                          setLoadoutSelections((currentSelections) => {
                            const existingGroupSelection = currentSelections[group.id]
                              && typeof currentSelections[group.id] === 'object'
                              ? currentSelections[group.id]
                              : currentGroupSelection
                            const nextGroupSelection = {
                              ...existingGroupSelection,
                              [option.id]: nextValue,
                            }
                            if (nextValue <= 0) {
                              delete nextGroupSelection[option.id]
                            }
                            return {
                              ...currentSelections,
                              [group.id]: nextGroupSelection,
                            }
                          })
                        }}
                      />
                    </label>
                  )
                })}
              </div>
            )
          }

          return (
            <label key={`${sideLabel}-${group.id}`}>
              <span>{`${sideLabel} ${group.label}`}</span>
              <select
                value={getLoadoutSelectionValue(unitDetails, loadoutSelections, group)}
                onChange={(event) => {
                  const nextOptionId = event.target.value
                  setLoadoutSelections((currentSelections) => ({
                    ...currentSelections,
                    [group.id]: nextOptionId,
                  }))
                }}
              >
                {(group.options || []).map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    title={formatLoadoutOptionLabel(option)}
                  >
                    {formatLoadoutOptionLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>
    )
  }

  function renderCountStepper(label, value, minimum, maximum, onChange) {
    return (
      <label className="stepper-field">
        <span>{label}</span>
        <div className="stepper-control">
          <button
            type="button"
            className="stepper-button"
            onClick={() => onChange(Math.max(minimum, value - 1))}
            disabled={value <= minimum}
          >
            -
          </button>
          <input
            type="number"
            min={String(minimum)}
            max={String(maximum)}
            step="1"
            value={String(value)}
            onChange={(event) => {
              const nextValue = Math.max(
                minimum,
                Math.min(maximum, Number(event.target.value) || minimum),
              )
              onChange(nextValue)
            }}
          />
          <button
            type="button"
            className="stepper-button"
            onClick={() => onChange(Math.min(maximum, value + 1))}
            disabled={value >= maximum}
          >
            +
          </button>
        </div>
      </label>
    )
  }

  function renderModelCountSelector(
    sideLabel,
    unitDetails,
    modelCount,
    setModelCount,
    modelCounts,
    setModelCounts,
  ) {
    if (!unitDetails) {
      return null
    }

    if (unitUsesModelBreakdownSelectors(unitDetails)) {
      return (
        <div className="cluster two-up">
          {(unitDetails.models || []).map((model) => {
            const { currentCount, minimumCount, maximumCount } = getModelEntryControlBounds(
              unitDetails,
              model,
              modelCounts,
            )
            return (
              <div key={`${sideLabel}-${model.name}`}>
                {renderCountStepper(
                  model.name,
                  currentCount,
                  minimumCount,
                  maximumCount,
                  (nextValue) => {
                    setModelCounts((currentModelCounts) => ({
                      ...currentModelCounts,
                      [model.name]: nextValue,
                    }))
                  },
                )}
              </div>
            )
          })}
        </div>
      )
    }

    const { minimumModels, maximumModels } = getUnitModelCountBounds(unitDetails)
    if (maximumModels <= minimumModels) {
      return null
    }

    return renderCountStepper(
      `${sideLabel} Squad Size`,
      Number(getUnitModelCountValue(unitDetails, modelCount)),
      minimumModels,
      maximumModels,
      (nextValue) => setModelCount(String(nextValue)),
    )
  }

  useEffect(() => {
    const attachedCharacterStillValid = attachedCharacterOptions.some((unit) => unit.name === attachedCharacterName)
    if (canUsePrecision && (!attachedCharacterName || attachedCharacterStillValid)) {
      return
    }
    if (attachedCharacterName && (!canUsePrecision || !attachedCharacterStillValid)) {
      setAttachedCharacterName('')
    }
    if (attachedCharacterUnitDetails) {
      setAttachedCharacterUnitDetails(null)
    }
    if (Object.keys(attachedCharacterLoadoutSelections).length) {
      setAttachedCharacterLoadoutSelections({})
    }
    if (attachedCharacterModelCount !== '') {
      setAttachedCharacterModelCount('')
    }
    if (Object.keys(attachedCharacterModelCounts).length) {
      setAttachedCharacterModelCounts({})
    }
  }, [
    attachedCharacterLoadoutSelections,
    attachedCharacterModelCount,
    attachedCharacterModelCounts,
    attachedCharacterName,
    attachedCharacterOptions,
    attachedCharacterUnitDetails,
    canUsePrecision,
  ])
  const indirectTooltip = 'Indirect Fire: if no defender models are visible, the attack takes -1 to Hit, hit rolls of 1-3 always fail, and the defender gets the benefit of cover.'
  const lanceTooltip = 'Lance: if the bearer made a charge move this turn, add 1 to the Wound roll for this attack.'
  const attackerArmyBattleshockTooltip = 'Unforgiven Fury: if one or more Adeptus Astartes units from your army are Battle-shocked, successful unmodified Hit rolls of 5+ score a Critical Hit until the end of the phase.'
  const attackerBelowStartingStrengthTooltip = attackerEnhancementTooltip
  const attackerBattleshockedTooltip = buildTooltip(
    attackerEnhancementName === 'Weapons of the First Legion'
      ? 'Weapons of the First Legion improves further while the bearer is Battle-shocked.'
      : '',
    attackerEnhancementName === 'Pennant of Remembrance'
      ? 'Pennant of Remembrance improves Feel No Pain while the bearer is Battle-shocked.'
      : '',
    attackerEnhancementName === 'Stubborn Tenacity'
      ? 'Stubborn Tenacity can add an additional +1 to Wound while the bearer is Battle-shocked and below Starting Strength.'
      : '',
  )
  const attackerSagaCompletedTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule')?.saga?.rules_text || 'Apply the completed Saga bonuses for this detachment.'
  const attackerEldersGuidanceTooltip = attackerEnhancementTooltip
  const attackerBoastAchievedTooltip = attackerEnhancementTooltip
  const attackerHordeslayerOutnumberedTooltip = attackerEnhancementTooltip
  const attackerWaaaghTooltip = attackerFactionDetails?.army_rules?.find((rule) => rule.name === 'Waaagh!')?.rules_text || ''
  const defenderWaaaghTooltip = defenderFactionDetails?.army_rules?.find((rule) => rule.name === 'Waaagh!')?.rules_text || ''
  const attackerPreyTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', 'Da Hunt Is On')?.rules_text || ''
  const attackerTargetWithinNineTooltip = buildTooltip(
    blitzaFireTooltip,
    dakkastormTooltip,
  )
  const attackerCountsAsTenTooltip = buildTooltip(
    getDetachmentEntry(selectedAttackerDetachment, 'enhancements', 'Raucous Warcaller')?.rules_text || '',
    getDetachmentEntry(selectedAttackerDetachment, 'stratagems', "Braggin' Rights")?.effect || '',
  )
  const defenderCountsAsTenTooltip = buildTooltip(
    getDetachmentEntry(selectedDefenderDetachment, 'enhancements', 'Raucous Warcaller')?.rules_text || '',
    getDetachmentEntry(selectedDefenderDetachment, 'stratagems', "Braggin' Rights")?.effect || '',
  )
  const targetBelowStartingStrengthTooltip = attackerEnhancementTooltip
  const targetBelowHalfStrengthTooltip = attackerEnhancementTooltip
  const tryDatButtonTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', 'Try Dat Button!')?.rules_text || ''
  const heroesAllRerollTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', 'Heroes All')?.rules_text || ''
  const defenderBattleshockedTooltip = defenderEnhancementTooltip
  const attachedCharacterTooltip = 'Precision: successful wounds from this attack can be allocated to the attached Character first.'
  const hazardousOverwatchTooltip = 'If this Hazardous weapon was used for Fire Overwatch in the opponent charge phase, the self-inflicted mortal wounds are allocated after the charging unit ends its charge move.'
  const hazardousBearerTooltip = 'Set the current wounds on the Hazardous bearer so self-damage is allocated against the correct model state.'
  const attackerActiveRules = useMemo(
    () => buildAttackerActiveRules({
      attackerUnitDetails,
      attackerPackageIsCharacterUnit,
      attackerPackageModelCount,
      defenderPackageModelCount,
      defenderUnitDetails,
      selectedWeapon,
      selectedAttackWeapons,
      oathOfMomentActive,
      attackerDetachment: selectedAttackerDetachment,
      attackerEnhancementName,
      attackerSagaCompleted,
      attackerEldersGuidanceActive,
      attackerBoastAchieved,
      attackerHordeslayerOutnumbered,
      attackerHeroesAllRerollType,
      attackerMarkedForDestructionActive,
      attackerFireDisciplineActive,
      attackerUnforgivenFuryActive,
      attackerUnbridledFerocityActive,
      attackerStubbornTenacityActive,
      attackerWeaponsOfTheFirstLegionActive,
      attackerPennantOfRemembranceActive,
      attackerBelowStartingStrength,
      inHalfRange,
      remainedStationary,
      chargedThisTurn,
      indirectTargetVisible,
      attackerInEngagementRange,
      targetInEngagementRangeOfAllies,
      hasHazardous,
    }),
    [
      attackerUnitDetails,
      attackerPackageIsCharacterUnit,
      attackerPackageModelCount,
      defenderPackageModelCount,
      defenderUnitDetails,
      selectedWeapon,
      selectedAttackWeapons,
      oathOfMomentActive,
      selectedAttackerDetachment,
      attackerEnhancementName,
      attackerSagaCompleted,
      attackerEldersGuidanceActive,
      attackerBoastAchieved,
      attackerHordeslayerOutnumbered,
      attackerHeroesAllRerollType,
      attackerMarkedForDestructionActive,
      attackerFireDisciplineActive,
      attackerUnforgivenFuryActive,
      attackerUnbridledFerocityActive,
      attackerStubbornTenacityActive,
      attackerWeaponsOfTheFirstLegionActive,
      attackerPennantOfRemembranceActive,
      attackerBelowStartingStrength,
      inHalfRange,
      remainedStationary,
      chargedThisTurn,
      indirectTargetVisible,
      attackerInEngagementRange,
      targetInEngagementRangeOfAllies,
      hasHazardous,
    ],
  )
  const defenderActiveRules = useMemo(
    () => buildDefenderActiveRules({
      defenderUnitDetails,
      selectedWeapon,
      defenderDetachment: selectedDefenderDetachment,
      defenderEnhancementName,
      defenderArmourOfContemptActive,
      defenderOverwhelmingOnslaughtActive,
      defenderUnbreakableLinesActive,
      defenderPennantOfRemembranceActive,
      targetHasCover,
      indirectTargetVisible,
      attackerFireDisciplineActive,
    }),
    [
      defenderUnitDetails,
      selectedWeapon,
      selectedDefenderDetachment,
      defenderEnhancementName,
      defenderArmourOfContemptActive,
      defenderOverwhelmingOnslaughtActive,
      defenderUnbreakableLinesActive,
      defenderPennantOfRemembranceActive,
      targetHasCover,
      indirectTargetVisible,
      attackerFireDisciplineActive,
    ],
  )
  const summaryStats = useMemo(() => buildRunSummary(simulationRuns), [simulationRuns])
  const activeRun = useMemo(() => {
    if (activeRunView === 'summary') {
      return null
    }
    return simulationRuns.find((run) => run.runIndex === activeRunView) || null
  }, [activeRunView, simulationRuns])
  const battlefieldUnits = useMemo(() => {
    const attackerBaseMm = getBaseDiameterMm(attackerUnitDetails)
    const defenderBaseMm = getBaseDiameterMm(defenderUnitDetails)

    return [
      attackerUnitDetails ? {
        id: 'attacker',
        role: 'Attacker',
        name: attackerUnitDetails.name,
        faction: attackerFaction,
        baseMm: attackerBaseMm,
        baseInches: mmToInches(attackerBaseMm),
        x: 20,
        y: 50,
      } : null,
      defenderUnitDetails ? {
        id: 'defender',
        role: 'Defender',
        name: defenderUnitDetails.name,
        faction: defenderFaction,
        baseMm: defenderBaseMm,
        baseInches: mmToInches(defenderBaseMm),
        x: 80,
        y: 50,
      } : null,
    ].filter(Boolean)
  }, [attackerFaction, attackerUnitDetails, defenderFaction, defenderUnitDetails])
  const battlefieldUnitMap = useMemo(
    () => Object.fromEntries(battlefieldUnits.map((unit) => [unit.id, unit])),
    [battlefieldUnits],
  )
  const selectedBattlefieldUnit = battlefieldUnitMap[selectedBattlefieldUnitId] || battlefieldUnits[0] || null
  const enemyBattlefieldUnit = selectedBattlefieldUnit
    ? battlefieldUnits.find((unit) => unit.id !== selectedBattlefieldUnit.id) || null
    : null
  const battlefieldCenterDistanceInches = useMemo(() => {
    if (!selectedBattlefieldUnit || !enemyBattlefieldUnit) {
      return null
    }

    const selectedPosition = battlefieldPositions[selectedBattlefieldUnit.id] || selectedBattlefieldUnit
    const enemyPosition = battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit
    const dxInches = Math.abs(enemyPosition.x - selectedPosition.x) * BATTLEFIELD_WIDTH_INCHES / 100
    const dyInches = Math.abs(enemyPosition.y - selectedPosition.y) * BATTLEFIELD_HEIGHT_INCHES / 100
    return Math.hypot(dxInches, dyInches)
  }, [battlefieldPositions, enemyBattlefieldUnit, selectedBattlefieldUnit])
  const battlefieldEdgeDistanceInches = useMemo(() => {
    if (battlefieldCenterDistanceInches === null || !selectedBattlefieldUnit || !enemyBattlefieldUnit) {
      return null
    }

    const totalBaseRadius = (selectedBattlefieldUnit.baseInches / 2) + (enemyBattlefieldUnit.baseInches / 2)
    return Math.max(0, battlefieldCenterDistanceInches - totalBaseRadius)
  }, [battlefieldCenterDistanceInches, enemyBattlefieldUnit, selectedBattlefieldUnit])
  const selectedBattlefieldUnitDetails = selectedBattlefieldUnit?.id === 'attacker'
    ? attackerUnitDetails
    : selectedBattlefieldUnit?.id === 'defender'
      ? defenderUnitDetails
      : null
  const battlefieldInEngagementRange = battlefieldEdgeDistanceInches !== null && battlefieldEdgeDistanceInches <= 1
  const selectedBattlefieldWeaponRanges = useMemo(() => (
    (selectedBattlefieldUnitDetails?.weapons || [])
      .map((weapon) => {
        const rangeInches = parseWeaponRangeInches(weapon.range)
        const hasHalfRangeRule = (
          getWeaponKeywordValue(weapon, 'Rapid Fire') > 0
          || getWeaponKeywordValue(weapon, 'Melta') > 0
        )
        return rangeInches ? {
          ...weapon,
          rangeInches,
          hasHalfRangeRule,
          halfRangeInches: rangeInches / 2,
          totalDiameterInches: (rangeInches * 2) + (selectedBattlefieldUnit?.baseInches || 0),
        } : null
      })
      .filter(Boolean)
  ), [selectedBattlefieldUnit, selectedBattlefieldUnitDetails])
  const selectedBattlefieldMeleeWeapons = useMemo(
    () => (selectedBattlefieldUnitDetails?.weapons || []).filter((weapon) => weapon.range === 'Melee'),
    [selectedBattlefieldUnitDetails],
  )
  const selectedBattlefieldPistolWeapons = useMemo(
    () => (selectedBattlefieldUnitDetails?.weapons || []).filter(
      (weapon) => weapon.range !== 'Melee' && weaponHasRawKeyword(weapon, 'Pistol'),
    ),
    [selectedBattlefieldUnitDetails],
  )
  const inRangeWeaponNames = useMemo(() => {
    if (battlefieldEdgeDistanceInches === null || battlefieldInEngagementRange) {
      return []
    }
    return selectedBattlefieldWeaponRanges
      .filter((weapon) => battlefieldEdgeDistanceInches <= weapon.rangeInches)
      .map((weapon) => formatWeaponName(weapon))
  }, [battlefieldEdgeDistanceInches, battlefieldInEngagementRange, selectedBattlefieldWeaponRanges])
  const halfRangeWeaponNames = useMemo(() => {
    if (battlefieldEdgeDistanceInches === null || battlefieldInEngagementRange) {
      return []
    }
    return selectedBattlefieldWeaponRanges
      .filter((weapon) => weapon.hasHalfRangeRule && battlefieldEdgeDistanceInches <= weapon.halfRangeInches)
      .map((weapon) => formatWeaponName(weapon))
  }, [battlefieldEdgeDistanceInches, battlefieldInEngagementRange, selectedBattlefieldWeaponRanges])
  const showBattlefieldRangeLine = !battlefieldInEngagementRange && inRangeWeaponNames.length > 0 && selectedBattlefieldUnit && enemyBattlefieldUnit
  const battlefieldCombatOptions = useMemo(() => {
    if (battlefieldEdgeDistanceInches === null) {
      return []
    }

    return battlefieldUnits.map((unit) => {
      const attackerDetails = unit.id === 'attacker' ? attackerUnitDetails : defenderUnitDetails
      const attackerLeaderDetails = unit.id === 'attacker' ? attackerAttachedLeaderUnitDetails : null
      const defenderDetails = unit.id === 'attacker' ? defenderUnitDetails : attackerUnitDetails
      const defender = battlefieldUnits.find((candidate) => candidate.id !== unit.id)
      if (!attackerDetails || !defenderDetails || !defender) {
        return null
      }

      const attackWeapons = getCombatWeaponOptions(attackerDetails, attackerLeaderDetails)

      const canFireNonPistolInEngagement = unitHasKeyword(attackerDetails, 'Monster')
        || unitHasKeyword(attackerDetails, 'Vehicle')
      const eligibleWeapons = attackWeapons.filter((weapon) => {
        if (battlefieldInEngagementRange) {
          if (weapon.range === 'Melee') {
            return true
          }
          return weaponHasRawKeyword(weapon, 'Pistol') || canFireNonPistolInEngagement
        }

        if (weapon.range === 'Melee') {
          return false
        }

        const rangeInches = parseWeaponRangeInches(weapon.range)
        return rangeInches !== null && battlefieldEdgeDistanceInches <= rangeInches
      })

      if (!eligibleWeapons.length) {
        return null
      }

      return {
        id: unit.id,
        attackerFaction: unit.faction,
        attackerName: unit.name,
        attackerDetails,
        defenderFaction: defender.faction,
        defenderName: defender.name,
        defenderDetails,
        eligibleWeapons,
      }
    }).filter(Boolean)
  }, [
    attackerAttachedLeaderUnitDetails,
    attackerUnitDetails,
    battlefieldEdgeDistanceInches,
    battlefieldInEngagementRange,
    battlefieldUnits,
    defenderUnitDetails,
  ])
  const selectedBattlefieldCombatant = battlefieldCombatOptions.find(
    (option) => option.id === battlefieldCombatAttackerId,
  ) || battlefieldCombatOptions[0] || null
  const battlefieldCombatWeaponOptions = useMemo(
    () => selectedBattlefieldCombatant?.eligibleWeapons || [],
    [selectedBattlefieldCombatant],
  )
  const selectedBattlefieldCombatWeapons = useMemo(
    () => battlefieldCombatWeaponOptions.filter((weapon) => battlefieldCombatWeaponNames.includes(weapon.name)),
    [battlefieldCombatWeaponNames, battlefieldCombatWeaponOptions],
  )
  const selectedBattlefieldCombatWeaponLabels = useMemo(
    () => selectedBattlefieldCombatWeapons.map((weapon) => formatWeaponName(weapon)),
    [selectedBattlefieldCombatWeapons],
  )

  const readyToSimulate = attackerFaction && attackerUnit && weaponNames.length > 0 && defenderFaction && defenderUnit

  useEffect(() => {
    if (!canUseCover && targetHasCover) {
      setTargetHasCover(false)
    }
  }, [canUseCover, targetHasCover])

  useEffect(() => {
    if (!canUseHalfRange && inHalfRange) {
      setInHalfRange(false)
    }
  }, [canUseHalfRange, inHalfRange])

  useEffect(() => {
    if (!hasOathOfMoment && oathOfMomentActive) {
      setOathOfMomentActive(false)
    }
  }, [hasOathOfMoment, oathOfMomentActive])

  useEffect(() => {
    if (!attackerEnhancementOptions.some((item) => item.name === attackerEnhancementName)) {
      setAttackerEnhancementName('')
    }
  }, [attackerEnhancementOptions, attackerEnhancementName])

  useEffect(() => {
    if (!defenderEnhancementOptions.some((item) => item.name === defenderEnhancementName)) {
      setDefenderEnhancementName('')
    }
  }, [defenderEnhancementOptions, defenderEnhancementName])

  useEffect(() => {
    if (!canUseAttackerFireDiscipline && attackerFireDisciplineActive) {
      setAttackerFireDisciplineActive(false)
    }
  }, [canUseAttackerFireDiscipline, attackerFireDisciplineActive])

  useEffect(() => {
    if (!canUseAttackerMarkedForDestruction && attackerMarkedForDestructionActive) {
      setAttackerMarkedForDestructionActive(false)
    }
  }, [canUseAttackerMarkedForDestruction, attackerMarkedForDestructionActive])

  useEffect(() => {
    if (!canUseAttackerUnforgivenFury) {
      if (attackerUnforgivenFuryActive) {
        setAttackerUnforgivenFuryActive(false)
      }
      if (attackerUnforgivenFuryArmyBattleshocked) {
        setAttackerUnforgivenFuryArmyBattleshocked(false)
      }
    }
  }, [canUseAttackerUnforgivenFury, attackerUnforgivenFuryActive, attackerUnforgivenFuryArmyBattleshocked])

  useEffect(() => {
    if (!canUseAttackerUnbridledFerocity && attackerUnbridledFerocityActive) {
      setAttackerUnbridledFerocityActive(false)
    }
  }, [canUseAttackerUnbridledFerocity, attackerUnbridledFerocityActive])

  useEffect(() => {
    if (!canUseDefenderArmourOfContempt && defenderArmourOfContemptActive) {
      setDefenderArmourOfContemptActive(false)
    }
  }, [canUseDefenderArmourOfContempt, defenderArmourOfContemptActive])

  useEffect(() => {
    if (!canUseDefenderOverwhelmingOnslaught && defenderOverwhelmingOnslaughtActive) {
      setDefenderOverwhelmingOnslaughtActive(false)
    }
  }, [canUseDefenderOverwhelmingOnslaught, defenderOverwhelmingOnslaughtActive])

  useEffect(() => {
    if (!canUseDefenderUnbreakableLines && defenderUnbreakableLinesActive) {
      setDefenderUnbreakableLinesActive(false)
    }
  }, [canUseDefenderUnbreakableLines, defenderUnbreakableLinesActive])

  useEffect(() => {
    const active = attackerEnhancementName === 'Stubborn Tenacity'
    setAttackerStubbornTenacityActive(active)
    if (!active && attackerBelowStartingStrength) {
      setAttackerBelowStartingStrength(false)
    }
  }, [attackerEnhancementName, attackerBelowStartingStrength])

  useEffect(() => {
    const active = attackerEnhancementName === 'Weapons of the First Legion'
    setAttackerWeaponsOfTheFirstLegionActive(active)
  }, [attackerEnhancementName])

  useEffect(() => {
    const active = attackerEnhancementName === 'Pennant of Remembrance'
    setAttackerPennantOfRemembranceActive(active)
  }, [attackerEnhancementName])

  useEffect(() => {
    if (!canUseSagaCompleted && attackerSagaCompleted) {
      setAttackerSagaCompleted(false)
    }
  }, [canUseSagaCompleted, attackerSagaCompleted])

  useEffect(() => {
    if (!canUseAttackerWaaagh && attackerWaaaghActive) {
      setAttackerWaaaghActive(false)
    }
    if (!canUseDefenderWaaagh && defenderWaaaghActive) {
      setDefenderWaaaghActive(false)
    }
    if (!canUseAttackerPrey && attackerPreyActive) {
      setAttackerPreyActive(false)
    }
    if (!canUseTargetWithinNine && attackerTargetWithinNine) {
      setAttackerTargetWithinNine(false)
    }
    if (!canUseAttackerCountsAsTenPlus && attackerCountsAsTenPlusModels) {
      setAttackerCountsAsTenPlusModels(false)
    }
    if (!canUseDefenderCountsAsTenPlus && defenderCountsAsTenPlusModels) {
      setDefenderCountsAsTenPlusModels(false)
    }
    if (!canUseTargetBelowStartingStrength && targetBelowStartingStrength) {
      setTargetBelowStartingStrength(false)
    }
    if (!canUseTargetBelowHalfStrength && targetBelowHalfStrength) {
      setTargetBelowHalfStrength(false)
    }
    if (!canUseTryDatButton) {
      if (attackerTryDatButtonEffects.length) {
        setAttackerTryDatButtonEffects([])
      }
      if (attackerTryDatButtonHazardous) {
        setAttackerTryDatButtonHazardous(false)
      }
    }
    if (!canUseAttackerUnbridledCarnage && attackerUnbridledCarnageActive) {
      setAttackerUnbridledCarnageActive(false)
    }
    if (!canUseDefenderArdAsNails && defenderArdAsNailsActive) {
      setDefenderArdAsNailsActive(false)
    }
    if (!canUseAttackerDragItDown && attackerDragItDownActive) {
      setAttackerDragItDownActive(false)
    }
    if (!canUseDefenderStalkinTaktiks && defenderStalkinTaktiksActive) {
      setDefenderStalkinTaktiksActive(false)
    }
    if (!canUseDefenderSpeediestFreeks && defenderSpeediestFreeksActive) {
      setDefenderSpeediestFreeksActive(false)
    }
    if (!canUseAttackerBlitzaFire && attackerBlitzaFireActive) {
      setAttackerBlitzaFireActive(false)
    }
    if (!canUseAttackerDakkastorm && attackerDakkastormActive) {
      setAttackerDakkastormActive(false)
    }
    if (!canUseAttackerFullThrottle && attackerFullThrottleActive) {
      setAttackerFullThrottleActive(false)
    }
    if (!canUseAttackerKlankinKlaws) {
      if (attackerKlankinKlawsActive) {
        setAttackerKlankinKlawsActive(false)
      }
      if (attackerKlankinKlawsPushed) {
        setAttackerKlankinKlawsPushed(false)
      }
    } else if (!attackerKlankinKlawsActive && attackerKlankinKlawsPushed) {
      setAttackerKlankinKlawsPushed(false)
    }
    if (!canUseAttackerDakkaDakkaDakka) {
      if (attackerDakkaDakkaDakkaActive) {
        setAttackerDakkaDakkaDakkaActive(false)
      }
      if (attackerDakkaDakkaDakkaPushed) {
        setAttackerDakkaDakkaDakkaPushed(false)
      }
    } else if (!attackerDakkaDakkaDakkaActive && attackerDakkaDakkaDakkaPushed) {
      setAttackerDakkaDakkaDakkaPushed(false)
    }
    if (!canUseAttackerBiggerShells) {
      if (attackerBiggerShellsActive) {
        setAttackerBiggerShellsActive(false)
      }
      if (attackerBiggerShellsPushed) {
        setAttackerBiggerShellsPushed(false)
      }
    } else if (!attackerBiggerShellsActive && attackerBiggerShellsPushed) {
      setAttackerBiggerShellsPushed(false)
    }
    if (!canUseDefenderExtraGubbinz && defenderExtraGubbinzActive) {
      setDefenderExtraGubbinzActive(false)
    }
    if (!canUseAttackerCompetitiveStreak && attackerCompetitiveStreakActive) {
      setAttackerCompetitiveStreakActive(false)
    }
    if (!canUseAttackerArmedToDaTeef && attackerArmedToDaTeefActive) {
      setAttackerArmedToDaTeefActive(false)
    }
    if (!canUseDefenderHulkingBrutes && defenderHulkingBrutesActive) {
      setDefenderHulkingBrutesActive(false)
    }
  }, [
    attackerArmedToDaTeefActive,
    attackerBiggerShellsActive,
    attackerBiggerShellsPushed,
    attackerBlitzaFireActive,
    attackerCompetitiveStreakActive,
    attackerCountsAsTenPlusModels,
    attackerDakkastormActive,
    attackerDakkaDakkaDakkaActive,
    attackerDakkaDakkaDakkaPushed,
    attackerDragItDownActive,
    attackerFullThrottleActive,
    attackerKlankinKlawsActive,
    attackerKlankinKlawsPushed,
    attackerPreyActive,
    attackerTargetWithinNine,
    attackerTryDatButtonEffects,
    attackerTryDatButtonHazardous,
    attackerUnbridledCarnageActive,
    attackerWaaaghActive,
    canUseAttackerArmedToDaTeef,
    canUseAttackerBiggerShells,
    canUseAttackerBlitzaFire,
    canUseAttackerCompetitiveStreak,
    canUseAttackerCountsAsTenPlus,
    canUseAttackerDakkastorm,
    canUseAttackerDakkaDakkaDakka,
    canUseAttackerDragItDown,
    canUseAttackerFullThrottle,
    canUseAttackerKlankinKlaws,
    canUseAttackerPrey,
    canUseAttackerUnbridledCarnage,
    canUseAttackerWaaagh,
    canUseDefenderArdAsNails,
    canUseDefenderCountsAsTenPlus,
    canUseDefenderExtraGubbinz,
    canUseDefenderHulkingBrutes,
    canUseDefenderSpeediestFreeks,
    canUseDefenderStalkinTaktiks,
    canUseDefenderWaaagh,
    canUseTargetBelowHalfStrength,
    canUseTargetBelowStartingStrength,
    canUseTargetWithinNine,
    canUseTryDatButton,
    defenderArdAsNailsActive,
    defenderCountsAsTenPlusModels,
    defenderExtraGubbinzActive,
    defenderHulkingBrutesActive,
    defenderSpeediestFreeksActive,
    defenderStalkinTaktiksActive,
    defenderWaaaghActive,
    targetBelowHalfStrength,
    targetBelowStartingStrength,
  ])

  useEffect(() => {
    if (targetBelowHalfStrength && !targetBelowStartingStrength) {
      setTargetBelowStartingStrength(true)
    }
  }, [targetBelowHalfStrength, targetBelowStartingStrength])

  useEffect(() => {
    if (!canUseEldersGuidance && attackerEldersGuidanceActive) {
      setAttackerEldersGuidanceActive(false)
    }
  }, [canUseEldersGuidance, attackerEldersGuidanceActive])

  useEffect(() => {
    if (!canUseBoastAchieved && attackerBoastAchieved) {
      setAttackerBoastAchieved(false)
    }
  }, [canUseBoastAchieved, attackerBoastAchieved])

  useEffect(() => {
    if (!canUseHordeslayerOutnumbered && attackerHordeslayerOutnumbered) {
      setAttackerHordeslayerOutnumbered(false)
    }
  }, [canUseHordeslayerOutnumbered, attackerHordeslayerOutnumbered])

  useEffect(() => {
    if (!canUseHeroesAllRerollType && attackerHeroesAllRerollType) {
      setAttackerHeroesAllRerollType('')
    }
  }, [canUseHeroesAllRerollType, attackerHeroesAllRerollType])

  useEffect(() => {
    const active = defenderEnhancementName === 'Pennant of Remembrance'
    setDefenderPennantOfRemembranceActive(active)
    if (!active && defenderBattleshocked) {
      setDefenderBattleshocked(false)
    }
  }, [defenderEnhancementName, defenderBattleshocked])

  useEffect(() => {
    setSimulationRuns([])
    setActiveRunView('summary')
  }, [
    attackerFaction,
    attackerUnit,
    resolvedAttackerLoadoutSelections,
    attackerModelCount,
    resolvedAttackerModelCounts,
    attackerAttachedLeaderName,
    resolvedAttackerAttachedLeaderLoadoutSelections,
    attackerAttachedLeaderModelCount,
    resolvedAttackerAttachedLeaderModelCounts,
    weaponNames,
    defenderFaction,
    defenderUnit,
    resolvedDefenderLoadoutSelections,
    defenderModelCount,
    resolvedDefenderModelCounts,
    attachedCharacterName,
    resolvedAttachedCharacterLoadoutSelections,
    attachedCharacterModelCount,
    resolvedAttachedCharacterModelCounts,
    attackerDetachmentName,
    defenderDetachmentName,
  ])

  useEffect(() => {
    setBattlefieldPositions({
      attacker: { x: 20, y: 50 },
      defender: { x: 80, y: 50 },
    })
  }, [attackerUnitDetails?.name, defenderUnitDetails?.name])

  useEffect(() => {
    if (!battlefieldUnitMap[selectedBattlefieldUnitId]) {
      setSelectedBattlefieldUnitId(battlefieldUnits[0]?.id || '')
    }
  }, [battlefieldUnitMap, battlefieldUnits, selectedBattlefieldUnitId])

  useEffect(() => {
    if (!battlefieldCombatOptions.some((option) => option.id === battlefieldCombatAttackerId)) {
      setBattlefieldCombatAttackerId(battlefieldCombatOptions[0]?.id || '')
    }
  }, [battlefieldCombatAttackerId, battlefieldCombatOptions])

  useEffect(() => {
    if (!battlefieldCombatWeaponOptions.length) {
      if (battlefieldCombatWeaponNames.length) {
        setBattlefieldCombatWeaponNames([])
      }
      return
    }

    const validWeaponNames = battlefieldCombatWeaponNames.filter((weaponName) => (
      battlefieldCombatWeaponOptions.some((weapon) => weapon.name === weaponName)
    ))
    if (validWeaponNames.length === battlefieldCombatWeaponNames.length && validWeaponNames.length > 0) {
      return
    }
    if (validWeaponNames.length > 0) {
      setBattlefieldCombatWeaponNames(validWeaponNames)
      return
    }
    setBattlefieldCombatWeaponNames([battlefieldCombatWeaponOptions[0].name])
  }, [battlefieldCombatWeaponNames, battlefieldCombatWeaponOptions])

  useEffect(() => {
    if (!draggingUnitId) {
      return undefined
    }

    function updateDraggedUnitPosition(clientX, clientY) {
      const board = battlefieldBoardRef.current
      const unit = battlefieldUnitMap[draggingUnitId]
      if (!board || !unit) {
        return
      }

      const rect = board.getBoundingClientRect()
      const radiusXPercent = ((unit.baseInches / 2) / BATTLEFIELD_WIDTH_INCHES) * 100
      const radiusYPercent = ((unit.baseInches / 2) / BATTLEFIELD_HEIGHT_INCHES) * 100
      const xPercent = ((clientX - rect.left) / rect.width) * 100
      const yPercent = ((clientY - rect.top) / rect.height) * 100

      setBattlefieldPositions((current) => ({
        ...current,
        [draggingUnitId]: {
          x: clamp(xPercent, radiusXPercent, 100 - radiusXPercent),
          y: clamp(yPercent, radiusYPercent, 100 - radiusYPercent),
        },
      }))
    }

    function handlePointerMove(event) {
      updateDraggedUnitPosition(event.clientX, event.clientY)
    }

    function handlePointerUp() {
      setDraggingUnitId('')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingUnitId, battlefieldUnitMap])

  async function executeSimulation(payload, runsToExecute) {
    try {
      setSimulating(true)
      setError('')
      setSimulationRuns([])
      const seedBase = Date.now()
      const responses = await Promise.all(
        Array.from({ length: runsToExecute }, (_, index) => simulateCombat({
          ...payload,
          seed: seedBase + index,
        })),
      )
      const runs = responses.map((data, index) => ({
        ...data,
        runIndex: index + 1,
      }))
      setSimulationRuns(runs)
      setActiveRunView('summary')
    } catch (requestError) {
      setError(formatError(requestError))
      setSimulationRuns([])
    } finally {
      setSimulating(false)
    }
  }

  async function handleSimulate(event) {
    event.preventDefault()
    if (!readyToSimulate) {
      return
    }

    const payload = buildSimulationPayload({
      attackerFaction,
      attackerUnit,
      attackerDetachmentName,
      defenderDetachmentName,
      attackerEnhancementName,
      defenderEnhancementName,
      attackerLoadoutSelections: resolvedAttackerLoadoutSelections,
      attackerModelCount,
      attackerModelCounts: resolvedAttackerModelCounts,
      attackerAttachedLeaderName,
      attackerAttachedLeaderLoadoutSelections: resolvedAttackerAttachedLeaderLoadoutSelections,
      attackerAttachedLeaderModelCount,
      attackerAttachedLeaderModelCounts: resolvedAttackerAttachedLeaderModelCounts,
      weaponNames,
      defenderFaction,
      defenderUnit,
      defenderLoadoutSelections: resolvedDefenderLoadoutSelections,
      defenderModelCount,
      defenderModelCounts: resolvedDefenderModelCounts,
      attachedCharacterLoadoutSelections: resolvedAttachedCharacterLoadoutSelections,
      attachedCharacterModelCount,
      attachedCharacterModelCounts: resolvedAttachedCharacterModelCounts,
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
      attackerSagaCompleted,
      attackerEldersGuidanceActive,
      attackerBoastAchieved,
      attackerHordeslayerOutnumbered,
      attackerHeroesAllRerollType,
      attackerUnbridledFerocityActive,
      defenderArmourOfContemptActive,
      defenderOverwhelmingOnslaughtActive,
      defenderUnbreakableLinesActive,
      defenderPennantOfRemembranceActive,
      defenderBattleshocked,
    })
    await executeSimulation(payload, Math.max(1, Number(runCount) || 1))
  }

  async function handleBattlefieldSimulate() {
    if (!selectedBattlefieldCombatant || !selectedBattlefieldCombatWeapons.length) {
      return
    }

    const battlefieldHalfRangeActive = battlefieldEdgeDistanceInches !== null
      && selectedBattlefieldCombatWeapons.some((weapon) => (
        weapon.range !== 'Melee'
        && (
          getWeaponKeywordValue(weapon, 'Rapid Fire') > 0
          || getWeaponKeywordValue(weapon, 'Melta') > 0
        )
        && battlefieldEdgeDistanceInches <= (parseWeaponRangeInches(weapon.range) || 0) / 2
      ))

    const battlefieldAttackerLoadoutSelections = selectedBattlefieldCombatant.id === 'attacker'
      ? resolvedAttackerLoadoutSelections
      : resolvedDefenderLoadoutSelections
    const battlefieldDefenderLoadoutSelections = selectedBattlefieldCombatant.id === 'attacker'
      ? resolvedDefenderLoadoutSelections
      : resolvedAttackerLoadoutSelections
    const battlefieldAttackerModelCounts = selectedBattlefieldCombatant.id === 'attacker'
      ? resolvedAttackerModelCounts
      : resolvedDefenderModelCounts
    const battlefieldDefenderModelCounts = selectedBattlefieldCombatant.id === 'attacker'
      ? resolvedDefenderModelCounts
      : resolvedAttackerModelCounts
    const battlefieldAttackerModelCount = selectedBattlefieldCombatant.id === 'attacker'
      ? (attackerModelCount !== '' ? Number(attackerModelCount) : undefined)
      : (defenderModelCount !== '' ? Number(defenderModelCount) : undefined)
    const battlefieldDefenderModelCount = selectedBattlefieldCombatant.id === 'attacker'
      ? (defenderModelCount !== '' ? Number(defenderModelCount) : undefined)
      : (attackerModelCount !== '' ? Number(attackerModelCount) : undefined)

    await executeSimulation({
      attacker_faction: selectedBattlefieldCombatant.attackerFaction,
      attacker_unit: selectedBattlefieldCombatant.attackerName,
      attacker_loadout: battlefieldAttackerLoadoutSelections,
      attacker_model_count: battlefieldAttackerModelCount,
      attacker_model_counts: battlefieldAttackerModelCounts,
      attacker_attached_character_name: selectedBattlefieldCombatant.id === 'attacker'
        ? attackerAttachedLeaderName || undefined
        : undefined,
      attacker_attached_character_loadout: selectedBattlefieldCombatant.id === 'attacker'
        ? resolvedAttackerAttachedLeaderLoadoutSelections
        : {},
      attacker_attached_character_model_count: selectedBattlefieldCombatant.id === 'attacker' && attackerAttachedLeaderModelCount !== ''
        ? Number(attackerAttachedLeaderModelCount)
        : undefined,
      attacker_attached_character_model_counts: selectedBattlefieldCombatant.id === 'attacker'
        ? resolvedAttackerAttachedLeaderModelCounts
        : {},
      weapon_names: battlefieldCombatWeaponNames,
      defender_faction: selectedBattlefieldCombatant.defenderFaction,
      defender_unit: selectedBattlefieldCombatant.defenderName,
      defender_loadout: battlefieldDefenderLoadoutSelections,
      defender_model_count: battlefieldDefenderModelCount,
      defender_model_counts: battlefieldDefenderModelCounts,
      attached_character_loadout: resolvedAttachedCharacterLoadoutSelections,
      attached_character_model_count: attachedCharacterModelCount !== '' ? Number(attachedCharacterModelCount) : undefined,
      attached_character_model_counts: resolvedAttachedCharacterModelCounts,
      options: {
        attacker_in_engagement_range: battlefieldInEngagementRange,
        in_half_range: battlefieldHalfRangeActive,
      },
    }, Math.max(1, Number(runCount) || 1))
  }

  function handleBattlefieldUnitPointerDown(unitId) {
    return (event) => {
      event.preventDefault()
      setSelectedBattlefieldUnitId(unitId)
      setDraggingUnitId(unitId)
    }
  }

  function addUnitToArmyList(unitDetails, faction) {
    if (!unitDetails?.name || !faction) {
      return
    }

    const entryId = `${faction}::${unitDetails.name}`
    setArmyListEntries((currentEntries) => {
      const existingEntry = currentEntries.find((entry) => entry.id === entryId)
      if (existingEntry) {
        return currentEntries.map((entry) => (
          entry.id === entryId
            ? { ...entry, count: entry.count + 1 }
            : entry
        ))
      }

      return [
        ...currentEntries,
        {
          id: entryId,
          faction,
          name: unitDetails.name,
          count: 1,
          stats: unitDetails.stats,
          keywords: unitDetails.keywords || [],
        },
      ]
    })
  }

  function removeArmyListEntry(entryId) {
    setArmyListEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId))
  }

  function updateArmyListEntryCount(entryId, nextCount) {
    const normalizedCount = Math.max(1, Number(nextCount) || 1)
    setArmyListEntries((currentEntries) => currentEntries.map((entry) => (
      entry.id === entryId
        ? { ...entry, count: normalizedCount }
        : entry
    )))
  }

  function resetOptions() {
    setTargetHasCover(initialOptions.target_has_cover)
    setAttackerInEngagementRange(initialOptions.attacker_in_engagement_range)
    setTargetInEngagementRangeOfAllies(initialOptions.target_in_engagement_range_of_allies)
    setInHalfRange(initialOptions.in_half_range)
    setOathOfMomentActive(initialOptions.oath_of_moment_active)
    setChargedThisTurn(initialOptions.charged_this_turn)
    setRemainedStationary(initialOptions.remained_stationary)
    setIndirectTargetVisible(initialOptions.indirect_target_visible)
    setAttachedCharacterName(initialOptions.attached_character_name)
    setHazardousOverwatchChargePhase(initialOptions.hazardous_overwatch_charge_phase)
    setHazardousBearerCurrentWounds(initialOptions.hazardous_bearer_current_wounds)
    setAttackerFireDisciplineActive(initialOptions.attacker_fire_discipline_active)
    setAttackerMarkedForDestructionActive(initialOptions.attacker_marked_for_destruction_active)
    setAttackerUnforgivenFuryActive(initialOptions.attacker_unforgiven_fury_active)
    setAttackerUnforgivenFuryArmyBattleshocked(initialOptions.attacker_unforgiven_fury_army_battleshocked)
    setAttackerStubbornTenacityActive(initialOptions.attacker_stubborn_tenacity_active)
    setAttackerWeaponsOfTheFirstLegionActive(initialOptions.attacker_weapons_of_the_first_legion_active)
    setAttackerPennantOfRemembranceActive(initialOptions.attacker_pennant_of_remembrance_active)
    setAttackerBelowStartingStrength(initialOptions.attacker_below_starting_strength)
    setAttackerBattleshocked(initialOptions.attacker_battleshocked)
    setAttackerSagaCompleted(initialOptions.attacker_saga_completed)
    setAttackerEldersGuidanceActive(initialOptions.attacker_elders_guidance_active)
    setAttackerBoastAchieved(initialOptions.attacker_boast_achieved)
    setAttackerHordeslayerOutnumbered(initialOptions.attacker_hordeslayer_outnumbered)
    setAttackerHeroesAllRerollType(initialOptions.attacker_heroes_all_reroll_type)
    setAttackerUnbridledFerocityActive(initialOptions.attacker_unbridled_ferocity_active)
    setDefenderArmourOfContemptActive(initialOptions.defender_armour_of_contempt_active)
    setDefenderOverwhelmingOnslaughtActive(initialOptions.defender_overwhelming_onslaught_active)
    setDefenderUnbreakableLinesActive(initialOptions.defender_unbreakable_lines_active)
    setDefenderPennantOfRemembranceActive(initialOptions.defender_pennant_of_remembrance_active)
    setDefenderBattleshocked(initialOptions.defender_battleshocked)
    setAttackerEnhancementName('')
    setDefenderEnhancementName('')
    setRunCount('1')
  }

  return (
    <div className="app-shell">
      <header className="hero-band">
        <p className="eyebrow">Warhammer 40,000 Combat Simulator</p>
        <div className="hero-copy">
          <h1>
            {activePage === 'combat'
              ? 'Check Unit Effectiveness'
              : activePage === 'battlefield'
                ? 'Plot Units on the Battlefield'
                : 'Build Army Lists'}
          </h1>
          <p>
            {activePage === 'combat'
              ? 'Pick an attacker, a weapon profile, a defender, and the combat context. Applies the rules engine and returns a full combat log.'
              : activePage === 'battlefield'
                ? 'The selected units from Combat are shown as scaled bases on a 44 x 60 inch top-down board.'
                : 'Army list management will live here. The page shell is in place so the next pass can define the actual roster workflow.'}
          </p>
        </div>
      </header>

      <nav className="page-nav" aria-label="Primary">
        <button
          type="button"
          className={`page-nav-button ${activePage === 'army-list' ? 'active' : ''}`}
          onClick={() => setActivePage('army-list')}
        >
          Army List
        </button>
        <button
          type="button"
          className={`page-nav-button ${activePage === 'combat' ? 'active' : ''}`}
          onClick={() => setActivePage('combat')}
        >
          Combat
        </button>
        <button
          type="button"
          className={`page-nav-button ${activePage === 'battlefield' ? 'active' : ''}`}
          onClick={() => setActivePage('battlefield')}
        >
          Battlefield
        </button>
      </nav>

      {activePage === 'combat' ? (
        <>
          <main className="workspace-grid">
        <section className="panel control-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Setup</p>
              <h2>Simulation Input</h2>
            </div>
            <button type="button" className="secondary-button" onClick={resetOptions}>
              Reset Options
            </button>
          </div>

          {loading ? <p className="status-line">Loading faction data...</p> : null}
          {error ? <p className="status-line error">{error}</p> : null}

          <form className="sim-form" onSubmit={handleSimulate}>
            <div className="cluster two-up">
              <label>
                <span>Attacking Faction</span>
                <select value={attackerFaction} onChange={(event) => setAttackerFaction(event.target.value)}>
                  {factions.map((faction) => (
                    <option key={faction.name} value={faction.name}>
                      {faction.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Defending Faction</span>
                <select value={defenderFaction} onChange={(event) => setDefenderFaction(event.target.value)}>
                  {factions.map((faction) => (
                    <option key={faction.name} value={faction.name}>
                      {faction.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cluster two-up">
              <label>
                <span>Attacking Unit</span>
                <select value={attackerUnit} onChange={(event) => setAttackerUnit(event.target.value)}>
                  {attackerUnits.map((unit) => (
                    <option key={unit.name} value={unit.name}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Defending Unit</span>
                <select value={defenderUnit} onChange={(event) => setDefenderUnit(event.target.value)}>
                  {defenderUnits.map((unit) => (
                    <option key={unit.name} value={unit.name}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cluster two-up">
              {renderModelCountSelector(
                'Attacker',
                attackerUnitDetails,
                attackerModelCount,
                setAttackerModelCount,
                attackerModelCounts,
                setAttackerModelCounts,
              )}
              {renderModelCountSelector(
                'Defender',
                defenderUnitDetails,
                defenderModelCount,
                setDefenderModelCount,
                defenderModelCounts,
                setDefenderModelCounts,
              )}
            </div>

            {renderLoadoutSelectors(
              'Attacker',
              attackerUnitDetails,
              attackerLoadoutSelections,
              setAttackerLoadoutSelections,
            )}

            {attackerAttachedLeaderOptions.length ? (
              <>
                <label>
                  <span>Attacker Attached Leader</span>
                  <select
                    value={attackerAttachedLeaderName}
                    onChange={(event) => setAttackerAttachedLeaderName(event.target.value)}
                  >
                    <option value="">No attached leader</option>
                    {attackerAttachedLeaderOptions.map((unit) => (
                      <option key={unit.name} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>

                {renderLoadoutSelectors(
                  'Attacker Leader',
                  attackerAttachedLeaderUnitDetails,
                  attackerAttachedLeaderLoadoutSelections,
                  setAttackerAttachedLeaderLoadoutSelections,
                )}

                {renderModelCountSelector(
                  'Attacker Leader',
                  attackerAttachedLeaderUnitDetails,
                  attackerAttachedLeaderModelCount,
                  setAttackerAttachedLeaderModelCount,
                  attackerAttachedLeaderModelCounts,
                  setAttackerAttachedLeaderModelCounts,
                )}
              </>
            ) : null}

            {renderLoadoutSelectors(
              'Defender',
              defenderUnitDetails,
              defenderLoadoutSelections,
              setDefenderLoadoutSelections,
            )}

            {(attackerFactionDetails?.detachments?.length || defenderFactionDetails?.detachments?.length) ? (
              <div className="cluster two-up">
                <label title={attackerDetachmentTooltip}>
                  <span>Attacker Detachment</span>
                  <select
                    title={attackerDetachmentTooltip}
                    value={attackerDetachmentName}
                    onChange={(event) => setAttackerDetachmentName(event.target.value)}
                  >
                    <option value="">No detachment</option>
                    {(attackerFactionDetails?.detachments || []).map((detachment) => (
                      <option
                        key={detachment.name}
                        value={detachment.name}
                        title={formatDetachmentTooltip(detachment)}
                      >
                        {detachment.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label title={defenderDetachmentTooltip}>
                  <span>Defender Detachment</span>
                  <select
                    title={defenderDetachmentTooltip}
                    value={defenderDetachmentName}
                    onChange={(event) => setDefenderDetachmentName(event.target.value)}
                  >
                    <option value="">No detachment</option>
                    {(defenderFactionDetails?.detachments || []).map((detachment) => (
                      <option
                        key={detachment.name}
                        value={detachment.name}
                        title={formatDetachmentTooltip(detachment)}
                      >
                        {detachment.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <div className="weapon-selection-panel">
              <div className="weapon-selection-header">
                <span>Weapon Profiles</span>
                <span>{weaponNames.length} selected</span>
              </div>
              <div className="weapon-selection-grid">
                {combatWeaponOptions.map((weapon) => {
                  const checked = weaponNames.includes(weapon.name)
                  return (
                    <label key={weapon.name} className="checkbox-row weapon-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setWeaponNames((currentWeaponNames) => (
                            event.target.checked
                              ? [...currentWeaponNames, weapon.name]
                              : currentWeaponNames.filter((name) => name !== weapon.name)
                          ))
                        }}
                      />
                      <span>{formatWeaponName(weapon)}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <label>
              <span>Number of Runs</span>
              <input
                type="number"
                min="1"
                max="100"
                value={runCount}
                onChange={(event) => setRunCount(event.target.value)}
              />
            </label>

            {selectedWeapon ? (
              <div className="weapon-card">
                <div>
                  <p className="kicker">Selected Weapons</p>
                  <h3>{formatWeaponName(selectedWeapon)}</h3>
                </div>
                {selectedAttackWeapons.length > 1 ? (
                  <p>{selectedAttackWeaponLabels.join(', ')}</p>
                ) : (
                  <div className="datasheet-stats">
                    {renderWeaponStatsGrid(selectedWeapon)}
                  </div>
                )}
              </div>
            ) : null}

            <div className="rule-grid">
              {attackerEnhancementOptions.length ? (
                <label title={attackerEnhancementTooltip}>
                  <span>Attacker Enhancement</span>
                  <select
                    title={attackerEnhancementTooltip}
                    value={attackerEnhancementName}
                    onChange={(event) => setAttackerEnhancementName(event.target.value)}
                  >
                    <option value="">No enhancement</option>
                    {attackerEnhancementOptions.map((enhancement) => (
                      <option
                        key={enhancement.name}
                        value={enhancement.name}
                        title={formatEnhancementTooltip(enhancement)}
                      >
                        {enhancement.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {defenderEnhancementOptions.length ? (
                <label title={defenderEnhancementTooltip}>
                  <span>Defender Enhancement</span>
                  <select
                    title={defenderEnhancementTooltip}
                    value={defenderEnhancementName}
                    onChange={(event) => setDefenderEnhancementName(event.target.value)}
                  >
                    <option value="">No enhancement</option>
                    {defenderEnhancementOptions.map((enhancement) => (
                      <option
                        key={enhancement.name}
                        value={enhancement.name}
                        title={formatEnhancementTooltip(enhancement)}
                      >
                        {enhancement.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {canUseAttackerFireDiscipline ? (
                <label className="checkbox-row" title={fireDisciplineTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerFireDisciplineActive}
                    onChange={(event) => setAttackerFireDisciplineActive(event.target.checked)}
                  />
                  <span>Use Fire Discipline</span>
                </label>
              ) : null}

              {canUseAttackerMarkedForDestruction ? (
                <label className="checkbox-row" title={markedForDestructionTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerMarkedForDestructionActive}
                    onChange={(event) => setAttackerMarkedForDestructionActive(event.target.checked)}
                  />
                  <span>Use Marked for Destruction</span>
                </label>
              ) : null}

              {canUseAttackerUnbridledFerocity ? (
                <label className="checkbox-row" title={unbridledFerocityTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnbridledFerocityActive}
                    onChange={(event) => setAttackerUnbridledFerocityActive(event.target.checked)}
                  />
                  <span>Use Unbridled Ferocity</span>
                </label>
              ) : null}

              {canUseAttackerUnforgivenFury ? (
                <label className="checkbox-row" title={unforgivenFuryTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnforgivenFuryActive}
                    onChange={(event) => setAttackerUnforgivenFuryActive(event.target.checked)}
                  />
                  <span>Use Unforgiven Fury</span>
                </label>
              ) : null}

              {attackerUnforgivenFuryActive ? (
                <label className="checkbox-row" title={attackerArmyBattleshockTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnforgivenFuryArmyBattleshocked}
                    onChange={(event) => setAttackerUnforgivenFuryArmyBattleshocked(event.target.checked)}
                  />
                  <span>Attacker army has a Battle-shocked Adeptus Astartes unit</span>
                </label>
              ) : null}

              {canUseDefenderArmourOfContempt ? (
                <label className="checkbox-row" title={armourOfContemptTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderArmourOfContemptActive}
                    onChange={(event) => setDefenderArmourOfContemptActive(event.target.checked)}
                  />
                  <span>Defender uses Armour of Contempt</span>
                </label>
              ) : null}

              {canUseDefenderOverwhelmingOnslaught ? (
                <label className="checkbox-row" title={overwhelmingOnslaughtTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderOverwhelmingOnslaughtActive}
                    onChange={(event) => setDefenderOverwhelmingOnslaughtActive(event.target.checked)}
                  />
                  <span>Defender uses Overwhelming Onslaught</span>
                </label>
              ) : null}

              {canUseDefenderUnbreakableLines ? (
                <label className="checkbox-row" title={unbreakableLinesTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderUnbreakableLinesActive}
                    onChange={(event) => setDefenderUnbreakableLinesActive(event.target.checked)}
                  />
                  <span>Defender uses Unbreakable Lines</span>
                </label>
              ) : null}

              {canUseCover ? (
                <label className="checkbox-row" title={coverTooltip}>
                  <input
                    type="checkbox"
                    checked={targetHasCover}
                    onChange={(event) => setTargetHasCover(event.target.checked)}
                  />
                  <span>Defender has cover</span>
                </label>
              ) : null}

              {hasOathOfMoment ? (
                <label className="checkbox-row" title={oathTooltip}>
                  <input
                    type="checkbox"
                    checked={oathOfMomentActive}
                    onChange={(event) => setOathOfMomentActive(event.target.checked)}
                  />
                  <span>Defender is the Oath of Moment target</span>
                </label>
              ) : null}

              {canUseHalfRange ? (
                <label className="checkbox-row" title={halfRangeTooltip}>
                  <input
                    type="checkbox"
                    checked={inHalfRange}
                    onChange={(event) => setInHalfRange(event.target.checked)}
                  />
                  <span>Target is in Half Range</span>
                </label>
              ) : null}

              {canUseSagaCompleted ? (
                <label className="checkbox-row" title={attackerSagaCompletedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerSagaCompleted}
                    onChange={(event) => setAttackerSagaCompleted(event.target.checked)}
                  />
                  <span>Attacker Saga is completed</span>
                </label>
              ) : null}

              {canUseAttackerWaaagh ? (
                <label className="checkbox-row" title={attackerWaaaghTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerWaaaghActive}
                    onChange={(event) => setAttackerWaaaghActive(event.target.checked)}
                  />
                  <span>Waaagh! is active for the attacker</span>
                </label>
              ) : null}

              {canUseDefenderWaaagh ? (
                <label className="checkbox-row" title={defenderWaaaghTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderWaaaghActive}
                    onChange={(event) => setDefenderWaaaghActive(event.target.checked)}
                  />
                  <span>Waaagh! is active for the defender</span>
                </label>
              ) : null}

              {canUseAttackerPrey ? (
                <label className="checkbox-row" title={attackerPreyTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerPreyActive}
                    onChange={(event) => setAttackerPreyActive(event.target.checked)}
                  />
                  <span>Defender is the attacker's Prey</span>
                </label>
              ) : null}

              {canUseTargetWithinNine ? (
                <label className="checkbox-row" title={attackerTargetWithinNineTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerTargetWithinNine}
                    onChange={(event) => setAttackerTargetWithinNine(event.target.checked)}
                  />
                  <span>Defender is within 9"</span>
                </label>
              ) : null}

              {canUseAttackerCountsAsTenPlus ? (
                <label className="checkbox-row" title={attackerCountsAsTenTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerCountsAsTenPlusModels}
                    onChange={(event) => setAttackerCountsAsTenPlusModels(event.target.checked)}
                  />
                  <span>Attacker counts as 10+ models</span>
                </label>
              ) : null}

              {canUseDefenderCountsAsTenPlus ? (
                <label className="checkbox-row" title={defenderCountsAsTenTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderCountsAsTenPlusModels}
                    onChange={(event) => setDefenderCountsAsTenPlusModels(event.target.checked)}
                  />
                  <span>Defender counts as 10+ models</span>
                </label>
              ) : null}

              {canUseTargetBelowStartingStrength ? (
                <label className="checkbox-row" title={targetBelowStartingStrengthTooltip}>
                  <input
                    type="checkbox"
                    checked={targetBelowStartingStrength}
                    onChange={(event) => setTargetBelowStartingStrength(event.target.checked)}
                  />
                  <span>Defender is below Starting Strength</span>
                </label>
              ) : null}

              {canUseTargetBelowHalfStrength ? (
                <label className="checkbox-row" title={targetBelowHalfStrengthTooltip}>
                  <input
                    type="checkbox"
                    checked={targetBelowHalfStrength}
                    onChange={(event) => setTargetBelowHalfStrength(event.target.checked)}
                  />
                  <span>Defender is Below Half-strength</span>
                </label>
              ) : null}

              {canUseTryDatButton ? (
                <div title={tryDatButtonTooltip}>
                  <span>Try Dat Button! Effects</span>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonEffects.includes('sustained_hits_1')}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setAttackerTryDatButtonEffects((currentEffects) => (
                          checked
                            ? [...new Set([...currentEffects, 'sustained_hits_1'])]
                            : currentEffects.filter((effect) => effect !== 'sustained_hits_1')
                        ))
                      }}
                    />
                    <span>Sustained Hits 1</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonEffects.includes('lethal_hits')}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setAttackerTryDatButtonEffects((currentEffects) => (
                          checked
                            ? [...new Set([...currentEffects, 'lethal_hits'])]
                            : currentEffects.filter((effect) => effect !== 'lethal_hits')
                        ))
                      }}
                    />
                    <span>Lethal Hits</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonEffects.includes('critical_wound_ap_2')}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setAttackerTryDatButtonEffects((currentEffects) => (
                          checked
                            ? [...new Set([...currentEffects, 'critical_wound_ap_2'])]
                            : currentEffects.filter((effect) => effect !== 'critical_wound_ap_2')
                        ))
                      }}
                    />
                    <span>Critical Wounds improve AP by 2</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonHazardous}
                      onChange={(event) => setAttackerTryDatButtonHazardous(event.target.checked)}
                    />
                    <span>Button effect was chosen manually and adds Hazardous</span>
                  </label>
                </div>
              ) : null}

              {isRangedWeapon ? (
                <label className="checkbox-row" title={engagementTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerInEngagementRange}
                    onChange={(event) => setAttackerInEngagementRange(event.target.checked)}
                  />
                  <span>Attacker is in Engagement Range</span>
                </label>
              ) : null}

              {hasHeavy ? (
                <label className="checkbox-row" title={heavyTooltip}>
                  <input
                    type="checkbox"
                    checked={remainedStationary}
                    onChange={(event) => setRemainedStationary(event.target.checked)}
                  />
                  <span>Attacker remained Stationary</span>
                </label>
              ) : null}

              {canUseTargetInEngagementRangeOfAllies ? (
                <label className="checkbox-row" title={targetInEngagementTooltip}>
                  <input
                    type="checkbox"
                    checked={targetInEngagementRangeOfAllies}
                    onChange={(event) => setTargetInEngagementRangeOfAllies(event.target.checked)}
                  />
                  <span>Defender is in Engagement Range of allied units</span>
                </label>
              ) : null}

              {hasIndirectFire ? (
                <label className="checkbox-row" title={indirectTooltip}>
                  <input
                    type="checkbox"
                    checked={indirectTargetVisible}
                    onChange={(event) => setIndirectTargetVisible(event.target.checked)}
                  />
                  <span>Any defender models are visible</span>
                </label>
              ) : null}

              {canUseLance && isMeleeWeapon ? (
                <label className="checkbox-row" title={lanceTooltip}>
                  <input
                    type="checkbox"
                    checked={chargedThisTurn}
                    onChange={(event) => setChargedThisTurn(event.target.checked)}
                  />
                  <span>Attacker charged this turn</span>
                </label>
              ) : null}

              {canUseEldersGuidance ? (
                <label className="checkbox-row" title={attackerEldersGuidanceTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerEldersGuidanceActive}
                    onChange={(event) => setAttackerEldersGuidanceActive(event.target.checked)}
                  />
                  <span>Use Elder's Guidance</span>
                </label>
              ) : null}

              {canUseAttackerUnbridledCarnage ? (
                <label className="checkbox-row" title={unbridledCarnageTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnbridledCarnageActive}
                    onChange={(event) => setAttackerUnbridledCarnageActive(event.target.checked)}
                  />
                  <span>Use Unbridled Carnage</span>
                </label>
              ) : null}

              {canUseDefenderArdAsNails ? (
                <label className="checkbox-row" title={ardAsNailsTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderArdAsNailsActive}
                    onChange={(event) => setDefenderArdAsNailsActive(event.target.checked)}
                  />
                  <span>Defender uses 'Ard as Nails</span>
                </label>
              ) : null}

              {canUseAttackerDragItDown ? (
                <label className="checkbox-row" title={dragItDownTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerDragItDownActive}
                    onChange={(event) => setAttackerDragItDownActive(event.target.checked)}
                  />
                  <span>Use Drag It Down</span>
                </label>
              ) : null}

              {canUseDefenderStalkinTaktiks ? (
                <label className="checkbox-row" title={stalkinTaktiksTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderStalkinTaktiksActive}
                    onChange={(event) => setDefenderStalkinTaktiksActive(event.target.checked)}
                  />
                  <span>Defender uses Stalkin' Taktiks</span>
                </label>
              ) : null}

              {canUseDefenderSpeediestFreeks ? (
                <label className="checkbox-row" title={speediestFreeksTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderSpeediestFreeksActive}
                    onChange={(event) => setDefenderSpeediestFreeksActive(event.target.checked)}
                  />
                  <span>Defender uses Speediest Freeks</span>
                </label>
              ) : null}

              {canUseAttackerBlitzaFire ? (
                <label className="checkbox-row" title={blitzaFireTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBlitzaFireActive}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setAttackerBlitzaFireActive(checked)
                      if (checked) {
                        setAttackerDakkastormActive(false)
                      }
                    }}
                  />
                  <span>Use Blitza Fire</span>
                </label>
              ) : null}

              {canUseAttackerDakkastorm ? (
                <label className="checkbox-row" title={dakkastormTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerDakkastormActive}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setAttackerDakkastormActive(checked)
                      if (checked) {
                        setAttackerBlitzaFireActive(false)
                      }
                    }}
                  />
                  <span>Use Dakkastorm</span>
                </label>
              ) : null}

              {canUseAttackerFullThrottle ? (
                <label className="checkbox-row" title={fullThrottleTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerFullThrottleActive}
                    onChange={(event) => setAttackerFullThrottleActive(event.target.checked)}
                  />
                  <span>Use Full Throttle!</span>
                </label>
              ) : null}

              {canUseAttackerKlankinKlaws ? (
                <>
                  <label className="checkbox-row" title={klankinKlawsTooltip}>
                    <input
                      type="checkbox"
                      checked={attackerKlankinKlawsActive}
                      onChange={(event) => setAttackerKlankinKlawsActive(event.target.checked)}
                    />
                    <span>Use Klankin' Klaws</span>
                  </label>
                  {attackerKlankinKlawsActive ? (
                    <label className="checkbox-row" title={klankinKlawsTooltip}>
                      <input
                        type="checkbox"
                        checked={attackerKlankinKlawsPushed}
                        onChange={(event) => setAttackerKlankinKlawsPushed(event.target.checked)}
                      />
                      <span>Push Klankin' Klaws</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {canUseAttackerDakkaDakkaDakka ? (
                <>
                  <label className="checkbox-row" title={dakkaDakkaDakkaTooltip}>
                    <input
                      type="checkbox"
                      checked={attackerDakkaDakkaDakkaActive}
                      onChange={(event) => setAttackerDakkaDakkaDakkaActive(event.target.checked)}
                    />
                    <span>Use Dakka! Dakka! Dakka!</span>
                  </label>
                  {attackerDakkaDakkaDakkaActive ? (
                    <label className="checkbox-row" title={dakkaDakkaDakkaTooltip}>
                      <input
                        type="checkbox"
                        checked={attackerDakkaDakkaDakkaPushed}
                        onChange={(event) => setAttackerDakkaDakkaDakkaPushed(event.target.checked)}
                      />
                      <span>Push Dakka! Dakka! Dakka!</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {canUseAttackerBiggerShells ? (
                <>
                  <label className="checkbox-row" title={biggerShellsTooltip}>
                    <input
                      type="checkbox"
                      checked={attackerBiggerShellsActive}
                      onChange={(event) => setAttackerBiggerShellsActive(event.target.checked)}
                    />
                    <span>Use Bigger Shells for Bigger Gitz</span>
                  </label>
                  {attackerBiggerShellsActive ? (
                    <label className="checkbox-row" title={biggerShellsTooltip}>
                      <input
                        type="checkbox"
                        checked={attackerBiggerShellsPushed}
                        onChange={(event) => setAttackerBiggerShellsPushed(event.target.checked)}
                      />
                      <span>Push Bigger Shells for Bigger Gitz</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {canUseDefenderExtraGubbinz ? (
                <label className="checkbox-row" title={extraGubbinzTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderExtraGubbinzActive}
                    onChange={(event) => setDefenderExtraGubbinzActive(event.target.checked)}
                  />
                  <span>Defender uses Extra Gubbinz</span>
                </label>
              ) : null}

              {canUseAttackerCompetitiveStreak ? (
                <label className="checkbox-row" title={competitiveStreakTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerCompetitiveStreakActive}
                    onChange={(event) => setAttackerCompetitiveStreakActive(event.target.checked)}
                  />
                  <span>Use Competitive Streak</span>
                </label>
              ) : null}

              {canUseAttackerArmedToDaTeef ? (
                <label className="checkbox-row" title={armedToDaTeefTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerArmedToDaTeefActive}
                    onChange={(event) => setAttackerArmedToDaTeefActive(event.target.checked)}
                  />
                  <span>Use Armed to da Teef</span>
                </label>
              ) : null}

              {canUseDefenderHulkingBrutes ? (
                <label className="checkbox-row" title={hulkingBrutesTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderHulkingBrutesActive}
                    onChange={(event) => setDefenderHulkingBrutesActive(event.target.checked)}
                  />
                  <span>Defender uses Hulking Brutes</span>
                </label>
              ) : null}

              {canUseBoastAchieved ? (
                <label className="checkbox-row" title={attackerBoastAchievedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBoastAchieved}
                    onChange={(event) => setAttackerBoastAchieved(event.target.checked)}
                  />
                  <span>Bearer's unit achieved a Boast</span>
                </label>
              ) : null}

              {canUseHordeslayerOutnumbered ? (
                <label className="checkbox-row" title={attackerHordeslayerOutnumberedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerHordeslayerOutnumbered}
                    onChange={(event) => setAttackerHordeslayerOutnumbered(event.target.checked)}
                  />
                  <span>More enemy than friendly models are within 6"</span>
                </label>
              ) : null}

              {canUseHeroesAllRerollType ? (
                <label title={heroesAllRerollTooltip}>
                  <span>Heroes All Reroll</span>
                  <select
                    title={heroesAllRerollTooltip}
                    value={attackerHeroesAllRerollType}
                    onChange={(event) => setAttackerHeroesAllRerollType(event.target.value)}
                  >
                    <option value="">Select reroll</option>
                    <option value="hit">Hit roll</option>
                    <option value="wound">Wound roll</option>
                    <option value="damage">Damage roll</option>
                  </select>
                </label>
              ) : null}

              {attackerEnhancementName === 'Stubborn Tenacity' ? (
                <label className="checkbox-row" title={attackerBelowStartingStrengthTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBelowStartingStrength}
                    onChange={(event) => setAttackerBelowStartingStrength(event.target.checked)}
                  />
                  <span>Attacker is below Starting Strength</span>
                </label>
              ) : null}

              {(attackerEnhancementName === 'Stubborn Tenacity'
                || attackerEnhancementName === 'Weapons of the First Legion'
                || attackerEnhancementName === 'Pennant of Remembrance') ? (
                <label className="checkbox-row" title={attackerBattleshockedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBattleshocked}
                    onChange={(event) => setAttackerBattleshocked(event.target.checked)}
                  />
                  <span>Attacker is Battle-shocked</span>
                </label>
              ) : null}

              {defenderEnhancementName === 'Pennant of Remembrance' ? (
                <label className="checkbox-row" title={defenderBattleshockedTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderBattleshocked}
                    onChange={(event) => setDefenderBattleshocked(event.target.checked)}
                  />
                  <span>Defender is Battle-shocked</span>
                </label>
              ) : null}

              {canUsePrecision ? (
                <>
                  <label title={attachedCharacterTooltip}>
                    <span>Attached Character</span>
                    <select
                      title={attachedCharacterTooltip}
                      value={attachedCharacterName}
                      onChange={(event) => setAttachedCharacterName(event.target.value)}
                    >
                      <option value="">No attached character</option>
                      {attachedCharacterOptions.map((unit) => (
                        <option key={unit.name} value={unit.name}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {renderLoadoutSelectors(
                    'Attached Character',
                    attachedCharacterUnitDetails,
                    attachedCharacterLoadoutSelections,
                    setAttachedCharacterLoadoutSelections,
                  )}

                  {renderModelCountSelector(
                    'Attached Character',
                    attachedCharacterUnitDetails,
                    attachedCharacterModelCount,
                    setAttachedCharacterModelCount,
                    attachedCharacterModelCounts,
                    setAttachedCharacterModelCounts,
                  )}
                </>
              ) : null}

              {hasHazardous ? (
                <label className="checkbox-row" title={hazardousOverwatchTooltip}>
                  <input
                    type="checkbox"
                    checked={hazardousOverwatchChargePhase}
                    onChange={(event) => setHazardousOverwatchChargePhase(event.target.checked)}
                  />
                  <span>Used Fire Overwatch in opponent charge phase</span>
                </label>
              ) : null}

              {hasHazardous ? (
                <label title={hazardousBearerTooltip}>
                  <span>Hazardous Bearer Current Wounds</span>
                  <input
                    title={hazardousBearerTooltip}
                    type="number"
                    min="0"
                    value={hazardousBearerCurrentWounds}
                    onChange={(event) => setHazardousBearerCurrentWounds(event.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <button type="submit" className="primary-button" disabled={!readyToSimulate || simulating}>
              {simulating ? 'Running Simulations...' : 'Run Simulations'}
            </button>
          </form>
        </section>

        <section className="panel data-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Reference</p>
              <h2>Datasheets</h2>
            </div>
          </div>

          <div className="snapshot-grid">
            <article className="datasheet-card">
              <p className="kicker">Attacker</p>
              <h3>{attackerUnitDetails?.name || 'No unit selected'}</h3>
              <p>{attackerFaction || 'Faction not set'}</p>
              <button
                type="button"
                className="secondary-button army-list-button"
                onClick={() => addUnitToArmyList(attackerUnitDetails, attackerFaction)}
                disabled={!attackerUnitDetails || !attackerFaction}
              >
                Add To Army List
              </button>
              <div className="datasheet-stats">
                {renderStatsGrid(attackerUnitDetails?.stats)}
              </div>
              <div className="active-rules">
                <p className="kicker">Active Rules</p>
                {attackerActiveRules.length ? (
                  <div className="active-rule-list">
                    {attackerActiveRules.map((rule) => (
                      <article key={`${rule.source}-${rule.name}`} className="active-rule-card">
                        <div className="active-rule-header">
                          <h4>{rule.name}</h4>
                          <span className="active-rule-source">{rule.source}</span>
                        </div>
                        <p>{rule.text}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="active-rule-empty">No active rules affecting this attack.</p>
                )}
              </div>
            </article>

            <article className="datasheet-card">
              <p className="kicker">Defender</p>
              <h3>{defenderUnitDetails?.name || 'No unit selected'}</h3>
              <p>{defenderFaction || 'Faction not set'}</p>
              <button
                type="button"
                className="secondary-button army-list-button"
                onClick={() => addUnitToArmyList(defenderUnitDetails, defenderFaction)}
                disabled={!defenderUnitDetails || !defenderFaction}
              >
                Add To Army List
              </button>
              <div className="datasheet-stats">
                {renderStatsGrid(defenderUnitDetails?.stats)}
              </div>
              <div className="active-rules">
                <p className="kicker">Active Rules</p>
                {defenderActiveRules.length ? (
                  <div className="active-rule-list">
                    {defenderActiveRules.map((rule) => (
                      <article key={`${rule.source}-${rule.name}`} className="active-rule-card">
                        <div className="active-rule-header">
                          <h4>{rule.name}</h4>
                          <span className="active-rule-source">{rule.source}</span>
                        </div>
                        <p>{rule.text}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="active-rule-empty">No active rules affecting this attack.</p>
                )}
              </div>
            </article>
          </div>

          {simulationRuns.length ? (
            <>
              <div className="run-tabs">
                <button
                  type="button"
                  className={`run-tab ${activeRunView === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveRunView('summary')}
                >
                  Summary
                </button>
                {simulationRuns.map((run) => (
                  <button
                    key={run.runIndex}
                    type="button"
                    className={`run-tab ${activeRunView === run.runIndex ? 'active' : ''}`}
                    onClick={() => setActiveRunView(run.runIndex)}
                  >
                    Run {run.runIndex}
                  </button>
                ))}
              </div>

              {activeRunView === 'summary' ? (
                <div className="outcome-grid">
                  <article className="result-card accent">
                    <p className="kicker">Target Summary</p>
                    <h3>{defenderUnit || 'Defender'}</h3>
                    <p>{summaryStats.totalRuns} runs completed</p>
                    <p>Destroyed: {summaryStats.targetDestroyedCount} ({formatPercent(summaryStats.targetDestroyedCount, summaryStats.totalRuns)})</p>
                    <p>Avg models remaining: {formatAverage(summaryStats.averageTargetModelsRemaining)}</p>
                    <p>Avg current model wounds: {formatAverage(summaryStats.averageTargetCurrentWounds)}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Hit Breakdown</p>
                    <h3>Accuracy</h3>
                    <p>Attack instances: {summaryStats.combat.attackInstances}</p>
                    <p>Hits landed: {summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks} ({formatPercent(summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks, summaryStats.combat.attackInstances)})</p>
                    <p>Auto-hits: {summaryStats.combat.autoHitAttacks}</p>
                    <p>Critical hits: {summaryStats.combat.criticalHitAttacks} ({formatPercent(summaryStats.combat.criticalHitAttacks, summaryStats.combat.attackInstances)})</p>
                    <p>Extra hits generated: {summaryStats.combat.extraHitsGenerated}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Wound Breakdown</p>
                    <h3>Conversion</h3>
                    <p>Wound rolls made: {summaryStats.combat.woundRolls}</p>
                    <p>Successful wound rolls: {summaryStats.combat.successfulWoundRolls} ({formatPercent(summaryStats.combat.successfulWoundRolls, summaryStats.combat.woundRolls)})</p>
                    <p>Auto-wounds: {summaryStats.combat.autoWounds}</p>
                    <p>Critical wounds: {summaryStats.combat.criticalWounds} ({formatPercent(summaryStats.combat.criticalWounds, summaryStats.combat.woundRolls + summaryStats.combat.autoWounds)})</p>
                    <p>Total wounds created: {summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Save Breakdown</p>
                    <h3>Defense</h3>
                    <p>Save attempts: {summaryStats.combat.saveAttempts}</p>
                    <p>Failed saves: {summaryStats.combat.savesFailed} ({formatPercent(summaryStats.combat.savesFailed, summaryStats.combat.saveAttempts)})</p>
                    <p>Passed saves: {summaryStats.combat.savesPassed} ({formatPercent(summaryStats.combat.savesPassed, summaryStats.combat.saveAttempts)})</p>
                    <p>Unsavable wounds: {summaryStats.combat.unsavableWounds}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Re-roll Breakdown</p>
                    <h3>Efficiency</h3>
                    <p>Hit re-rolls used: {summaryStats.combat.hitRerollsUsed}</p>
                    <p>Hit re-roll success: {summaryStats.combat.hitRerollSuccesses} ({formatPercent(summaryStats.combat.hitRerollSuccesses, summaryStats.combat.hitRerollsUsed)})</p>
                    <p>Wound re-rolls used: {summaryStats.combat.woundRerollsUsed}</p>
                    <p>Wound re-roll success: {summaryStats.combat.woundRerollSuccesses} ({formatPercent(summaryStats.combat.woundRerollSuccesses, summaryStats.combat.woundRerollsUsed)})</p>
                  </article>

                  {summaryStats.attachedCharacterRuns > 0 ? (
                    <article className="result-card">
                      <p className="kicker">Attached Character Summary</p>
                      <h3>{attachedCharacterName || 'Attached Character'}</h3>
                      <p>Tracked in {summaryStats.attachedCharacterRuns} runs</p>
                      <p>Destroyed: {summaryStats.attachedCharacterDestroyedCount} ({formatPercent(summaryStats.attachedCharacterDestroyedCount, summaryStats.attachedCharacterRuns)})</p>
                      <p>Avg current wounds: {formatAverage(summaryStats.averageAttachedCharacterWounds)}</p>
                    </article>
                  ) : null}

                  {summaryStats.hazardousBearerRuns > 0 ? (
                    <article className="result-card warning">
                      <p className="kicker">Hazardous Summary</p>
                      <h3>{attackerUnit || 'Hazardous Bearer'}</h3>
                      <p>Triggered in {summaryStats.hazardousBearerRuns} runs</p>
                      <p>Destroyed: {summaryStats.hazardousBearerDestroyedCount} ({formatPercent(summaryStats.hazardousBearerDestroyedCount, summaryStats.hazardousBearerRuns)})</p>
                      <p>Avg current wounds: {formatAverage(summaryStats.averageHazardousBearerWounds)}</p>
                    </article>
                  ) : null}
                </div>
              ) : activeRun ? (
                <div className="outcome-grid">
                  <article className="result-card accent">
                    <p className="kicker">Run {activeRun.runIndex}</p>
                    <h3>{activeRun.result.target.name}</h3>
                    <p>
                      {activeRun.result.target.destroyed
                        ? 'Destroyed'
                        : `${activeRun.result.target.models_remaining} models remain`}
                    </p>
                    <p>Current model wounds: {activeRun.result.target.current_model_wounds}</p>
                  </article>

                  {activeRun.result.attached_character ? (
                    <article className="result-card">
                      <p className="kicker">Attached Character</p>
                      <h3>{activeRun.result.attached_character.name}</h3>
                      <p>
                        {activeRun.result.attached_character.destroyed
                          ? 'Destroyed'
                          : `${activeRun.result.attached_character.models_remaining} model remains`}
                      </p>
                      <p>Current wounds: {activeRun.result.attached_character.current_model_wounds}</p>
                    </article>
                  ) : null}

                  {activeRun.result.hazardous_bearer ? (
                    <article className="result-card warning">
                      <p className="kicker">Hazardous Bearer</p>
                      <h3>{activeRun.result.hazardous_bearer.name}</h3>
                      <p>
                        {activeRun.result.hazardous_bearer.destroyed
                          ? 'Destroyed'
                          : `${activeRun.result.hazardous_bearer.models_remaining} model remains`}
                      </p>
                      <p>Current wounds: {activeRun.result.hazardous_bearer.current_model_wounds}</p>
                    </article>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <p>Run one or more simulations to see summary statistics and individual combat logs.</p>
            </div>
          )}
        </section>
          </main>

          <section className="panel log-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Resolution</p>
                <h2>{activeRunView === 'summary' ? 'Run Index' : `Combat Log: Run ${activeRunView}`}</h2>
              </div>
            </div>

            {simulationRuns.length && activeRunView === 'summary' ? (
              <div className="summary-index">
                <p className="summary-index-copy">
                  Use the tabs above to switch between the summary page and each individual run.
                </p>
                <div className="summary-index-grid">
                  {simulationRuns.map((run) => (
                    <button
                      key={run.runIndex}
                      type="button"
                      className="summary-index-card"
                      onClick={() => setActiveRunView(run.runIndex)}
                    >
                      <strong>Run {run.runIndex}</strong>
                      <span>{run.result.target.destroyed ? 'Target destroyed' : `${run.result.target.models_remaining} models remain`}</span>
                      <span>Current wounds: {run.result.target.current_model_wounds}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeRun?.result?.log?.length ? (
              <ul className="combat-log">
                {activeRun.result.log.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <div className="empty-state compact">
                <p>The run index and combat logs will appear here after a simulation.</p>
              </div>
            )}
          </section>
        </>
      ) : activePage === 'battlefield' ? (
        <section className="panel battlefield-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Tabletop</p>
              <h2>Battlefield</h2>
            </div>
            <div className="battlefield-meta">
              <span>60&quot; x 44&quot;</span>
              <span>Top-Down View</span>
            </div>
          </div>

          <div className="battlefield-board-shell">
            <div ref={battlefieldBoardRef} className="battlefield-board">
              <div className="battlefield-center-line" />
              {selectedBattlefieldUnit && !battlefieldInEngagementRange ? selectedBattlefieldWeaponRanges.map((weapon, index) => (
                <div
                  key={`${selectedBattlefieldUnit.id}-${weapon.name}`}
                  className={`battlefield-range-ring ${inRangeWeaponNames.includes(formatWeaponName(weapon)) ? 'in-range' : ''}`}
                  style={{
                    left: `${battlefieldPositions[selectedBattlefieldUnit.id]?.x ?? selectedBattlefieldUnit.x}%`,
                    top: `${battlefieldPositions[selectedBattlefieldUnit.id]?.y ?? selectedBattlefieldUnit.y}%`,
                    width: `${(weapon.totalDiameterInches / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                    height: `${(weapon.totalDiameterInches / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                    zIndex: selectedBattlefieldWeaponRanges.length - index,
                  }}
                />
              )) : null}
              {showBattlefieldRangeLine ? (
                <svg className="battlefield-range-line-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line
                    className="battlefield-range-line"
                    x1={battlefieldPositions[selectedBattlefieldUnit.id]?.x ?? selectedBattlefieldUnit.x}
                    y1={battlefieldPositions[selectedBattlefieldUnit.id]?.y ?? selectedBattlefieldUnit.y}
                    x2={battlefieldPositions[enemyBattlefieldUnit.id]?.x ?? enemyBattlefieldUnit.x}
                    y2={battlefieldPositions[enemyBattlefieldUnit.id]?.y ?? enemyBattlefieldUnit.y}
                  />
                </svg>
              ) : null}
              {battlefieldUnits.map((unit) => (
                <div
                  key={unit.id}
                  className={`battlefield-unit battlefield-unit-${unit.id} ${draggingUnitId === unit.id ? 'dragging' : ''} ${selectedBattlefieldUnitId === unit.id ? 'selected' : ''}`}
                  style={{
                    left: `${battlefieldPositions[unit.id]?.x ?? unit.x}%`,
                    top: `${battlefieldPositions[unit.id]?.y ?? unit.y}%`,
                    width: `${(unit.baseInches / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                    height: `${(unit.baseInches / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                  }}
                  onPointerDown={handleBattlefieldUnitPointerDown(unit.id)}
                >
                  <div className="battlefield-unit-dot" />
                  <div className="battlefield-unit-label">
                    <strong>{unit.name}</strong>
                    <span>{unit.role}</span>
                    <span>{unit.baseMm}mm base</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="battlefield-range-summary">
            <p className="kicker">Selected Unit Ranges</p>
            <h3>{selectedBattlefieldUnit?.name || 'No unit selected'}</h3>
            <p>
              {battlefieldEdgeDistanceInches === null
                ? 'Select a unit marker to inspect its weapon ranges.'
                : battlefieldInEngagementRange
                  ? `Enemy distance: ${battlefieldEdgeDistanceInches.toFixed(1)}". Units are in Engagement Range.`
                  : `Enemy distance: ${battlefieldEdgeDistanceInches.toFixed(1)}".`}
            </p>
            {battlefieldInEngagementRange ? (
              (selectedBattlefieldMeleeWeapons.length || selectedBattlefieldPistolWeapons.length) ? (
                <div className="battlefield-range-list">
                  {selectedBattlefieldMeleeWeapons.map((weapon) => (
                    <div
                      key={`melee-${weapon.name}`}
                      className="battlefield-range-list-item engaged"
                    >
                      <strong>{formatWeaponName(weapon)}</strong>
                      <span>Melee</span>
                    </div>
                  ))}
                  {selectedBattlefieldPistolWeapons.map((weapon) => (
                    <div
                      key={`pistol-${weapon.name}`}
                      className="battlefield-range-list-item engaged pistol"
                    >
                      <strong>{formatWeaponName(weapon)}</strong>
                      <span>Pistol</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No melee or pistol weapons available.</p>
              )
            ) : selectedBattlefieldWeaponRanges.length ? (
              <div className="battlefield-range-list">
                {selectedBattlefieldWeaponRanges.map((weapon) => {
                  const weaponInRange = inRangeWeaponNames.includes(formatWeaponName(weapon))
                  const weaponInHalfRange = halfRangeWeaponNames.includes(formatWeaponName(weapon))
                  return (
                    <div
                      key={`summary-${weapon.name}`}
                      className={`battlefield-range-list-item ${weaponInRange ? 'in-range' : ''}`}
                    >
                      <div className="battlefield-range-list-copy">
                        <strong>{formatWeaponName(weapon)}</strong>
                        {weapon.hasHalfRangeRule ? (
                          <span className={`battlefield-half-range-badge ${weaponInHalfRange ? 'active' : ''}`}>
                            Half Range {weapon.halfRangeInches}"
                          </span>
                        ) : null}
                      </div>
                      <span>{weapon.rangeInches}"</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p>No ranged weapons to display.</p>
            )}
            {!battlefieldInEngagementRange && showBattlefieldRangeLine ? (
              <p>
                In range: {inRangeWeaponNames.join(', ')}
              </p>
            ) : !battlefieldInEngagementRange && battlefieldEdgeDistanceInches !== null ? (
              <p>No ranged weapons currently reach the enemy unit.</p>
            ) : null}
            {!battlefieldInEngagementRange && halfRangeWeaponNames.length ? (
              <p>
                Within half range: {halfRangeWeaponNames.join(', ')}
              </p>
            ) : null}
          </div>

          <div className="battlefield-combat-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Battlefield Sim</p>
                <h2>Eligible Combat</h2>
              </div>
            </div>

            {battlefieldCombatOptions.length ? (
              <div className="battlefield-combat-grid">
                <label>
                  <span>Eligible Combatant</span>
                  <select
                    value={battlefieldCombatAttackerId}
                    onChange={(event) => setBattlefieldCombatAttackerId(event.target.value)}
                  >
                    {battlefieldCombatOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.attackerName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Target</span>
                  <input
                    type="text"
                    value={selectedBattlefieldCombatant?.defenderName || ''}
                    readOnly
                  />
                </label>

                <div className="battlefield-combat-span">
                  <span>Eligible Weapon Profiles</span>
                </div>

                <div className="weapon-selection-panel battlefield-combat-span">
                  <div className="weapon-selection-header">
                    <span>Battlefield Weapons</span>
                    <span>{battlefieldCombatWeaponNames.length} selected</span>
                  </div>
                  <div className="weapon-selection-grid">
                    {battlefieldCombatWeaponOptions.map((weapon) => {
                      const checked = battlefieldCombatWeaponNames.includes(weapon.name)
                      return (
                        <label key={weapon.name} className="checkbox-row weapon-checkbox">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setBattlefieldCombatWeaponNames((currentWeaponNames) => (
                                event.target.checked
                                  ? [...currentWeaponNames, weapon.name]
                                  : currentWeaponNames.filter((name) => name !== weapon.name)
                              ))
                            }}
                          />
                          <span>{formatWeaponName(weapon)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button battlefield-combat-button"
                  onClick={handleBattlefieldSimulate}
                  disabled={!selectedBattlefieldCombatant || !selectedBattlefieldCombatWeapons.length || simulating}
                >
                  {simulating ? 'Running Simulations...' : 'Run Battlefield Simulation'}
                </button>
              </div>
            ) : (
              <div className="empty-state compact">
                <p>No eligible combatants at the current positions.</p>
              </div>
            )}

            {simulationRuns.length ? (
              <div className="battlefield-combat-results">
                <p className="kicker">Latest Result</p>
                <div className="battlefield-combat-result-grid">
                  <article className="result-card accent">
                    <h3>{simulationRuns[0].result.target.name}</h3>
                    <p>
                      {summaryStats.totalRuns} run{summaryStats.totalRuns === 1 ? '' : 's'}
                    </p>
                    <p>
                      Destroyed: {summaryStats.targetDestroyedCount} ({formatPercent(summaryStats.targetDestroyedCount, summaryStats.totalRuns)})
                    </p>
                  </article>
                  <article className="result-card">
                    <h3>Selected Attack</h3>
                    <p>{selectedBattlefieldCombatant?.attackerName || 'No combatant selected'}</p>
                    <p>{selectedBattlefieldCombatWeaponLabels.join(', ') || 'No weapons selected'}</p>
                    <p>{selectedBattlefieldCombatant?.defenderName || 'No target selected'}</p>
                  </article>
                  <article className="result-card">
                    <h3>Hits</h3>
                    <p>
                      Landed: {summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks}
                      {' '}({formatPercent(summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks, summaryStats.combat.attackInstances)})
                    </p>
                    <p>Critical: {summaryStats.combat.criticalHitAttacks}</p>
                    <p>Extra hits: {summaryStats.combat.extraHitsGenerated}</p>
                  </article>
                  <article className="result-card">
                    <h3>Wounds</h3>
                    <p>
                      Successful: {summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds}
                      {' '}({formatPercent(summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds, summaryStats.combat.woundRolls + summaryStats.combat.autoWounds)})
                    </p>
                    <p>Critical: {summaryStats.combat.criticalWounds}</p>
                    <p>Auto-wounds: {summaryStats.combat.autoWounds}</p>
                  </article>
                  <article className="result-card">
                    <h3>Saves</h3>
                    <p>Attempts: {summaryStats.combat.saveAttempts}</p>
                    <p>Failed: {summaryStats.combat.savesFailed} ({formatPercent(summaryStats.combat.savesFailed, summaryStats.combat.saveAttempts)})</p>
                    <p>Unsavable: {summaryStats.combat.unsavableWounds}</p>
                  </article>
                  <article className="result-card">
                    <h3>Re-rolls</h3>
                    <p>Hit re-rolls: {summaryStats.combat.hitRerollsUsed}</p>
                    <p>Hit success: {formatPercent(summaryStats.combat.hitRerollSuccesses, summaryStats.combat.hitRerollsUsed)}</p>
                    <p>Wound success: {formatPercent(summaryStats.combat.woundRerollSuccesses, summaryStats.combat.woundRerollsUsed)}</p>
                  </article>
                </div>
              </div>
            ) : null}
          </div>

          <div className="battlefield-legend">
            {battlefieldUnits.map((unit) => (
              <article key={`${unit.id}-legend`} className="battlefield-legend-card">
                <p className="kicker">{unit.role}</p>
                <h3>{unit.name}</h3>
                <p>{unit.faction || 'Faction not set'}</p>
                <p>Base: {unit.baseMm}mm</p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel placeholder-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Roster</p>
              <h2>Army List</h2>
            </div>
            <p className="army-list-count">
              {armyListEntries.reduce((total, entry) => total + entry.count, 0)} unit
              {armyListEntries.reduce((total, entry) => total + entry.count, 0) === 1 ? '' : 's'}
            </p>
          </div>
          {armyListEntries.length ? (
            <div className="army-list-grid">
              {armyListEntries.map((entry) => (
                <article key={entry.id} className="army-list-card">
                  <div className="army-list-card-header">
                    <div>
                      <p className="kicker">{entry.faction}</p>
                      <h3>{entry.name}</h3>
                    </div>
                    <div className="army-list-quantity">
                      <button
                        type="button"
                        className="secondary-button army-list-quantity-button"
                        onClick={() => updateArmyListEntryCount(entry.id, entry.count - 1)}
                        disabled={entry.count <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="army-list-quantity-input"
                        value={entry.count}
                        onChange={(event) => updateArmyListEntryCount(entry.id, event.target.value)}
                      />
                      <button
                        type="button"
                        className="secondary-button army-list-quantity-button"
                        onClick={() => updateArmyListEntryCount(entry.id, entry.count + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="datasheet-stats">
                    {renderStatsGrid(entry.stats)}
                  </div>
                  <div className="army-list-card-actions">
                    <span className="army-list-badge">x{entry.count}</span>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => removeArmyListEntry(entry.id)}
                    >
                      Remove Entry
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Add units from the Combat page and they will appear here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
