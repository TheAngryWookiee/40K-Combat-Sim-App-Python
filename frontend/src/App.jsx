import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  fetchFactions,
  fetchFactionDetails,
  fetchUnitDetails,
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
  attacker_unforgiven_fury_active: false,
  attacker_unforgiven_fury_army_battleshocked: false,
  attacker_stubborn_tenacity_active: false,
  attacker_weapons_of_the_first_legion_active: false,
  attacker_pennant_of_remembrance_active: false,
  attacker_below_starting_strength: false,
  attacker_battleshocked: false,
  defender_armour_of_contempt_active: false,
  defender_unbreakable_lines_active: false,
  defender_pennant_of_remembrance_active: false,
  defender_battleshocked: false,
}

const UNFORGIVEN_TASK_FORCE = 'Unforgiven Task Force'
const OATH_EXCLUDED_KEYWORDS = [
  'black templars',
  'blood angels',
  'dark angels',
  'deathwatch',
  'space wolves',
]
const OATH_OF_MOMENT_RULE_TEXT = 'Select one enemy unit. Each time a model with Oath of Moment makes an attack that targets that unit, you can re-roll the Hit roll.'
const OATH_OF_MOMENT_CODEX_RIDER_TEXT = 'If you are using a Codex: Space Marines Detachment and your army does not include Black Templars, Blood Angels, Dark Angels, Deathwatch, or Space Wolves units, add 1 to the Wound roll as well.'

function getDetachmentByName(factionDetails, detachmentName) {
  return factionDetails?.detachments?.find((detachment) => detachment.name === detachmentName) || null
}

function getAttackerEnhancementOptions(detachment, selectedWeapon, hasHazardous) {
  if (!detachment || detachment.name !== UNFORGIVEN_TASK_FORCE) {
    return []
  }

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

function getDefenderEnhancementOptions(detachment) {
  if (!detachment || detachment.name !== UNFORGIVEN_TASK_FORCE) {
    return []
  }

  return (detachment.enhancements || []).filter(
    (enhancement) => enhancement.name === 'Pennant of Remembrance',
  )
}

function getAttackerStratagemOptions(detachment, isRangedWeapon) {
  if (!detachment || detachment.name !== UNFORGIVEN_TASK_FORCE) {
    return []
  }

  return (detachment.stratagems || []).filter((stratagem) => {
    if (stratagem.name === 'Fire Discipline') {
      return isRangedWeapon
    }
    return stratagem.name === 'Unforgiven Fury'
  })
}

function getDefenderStratagemOptions(detachment, selectedWeapon) {
  if (!detachment || detachment.name !== UNFORGIVEN_TASK_FORCE) {
    return []
  }

  return (detachment.stratagems || []).filter((stratagem) => {
    if (stratagem.name === 'Armour of Contempt') {
      return Number(selectedWeapon?.ap || 0) > 0
    }
    return stratagem.name === 'Unbreakable Lines'
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
    attacker_fire_discipline_active: state.attackerFireDisciplineActive,
    attacker_unforgiven_fury_active: state.attackerUnforgivenFuryActive,
    attacker_unforgiven_fury_army_battleshocked: state.attackerUnforgivenFuryArmyBattleshocked,
    attacker_stubborn_tenacity_active: state.attackerStubbornTenacityActive,
    attacker_weapons_of_the_first_legion_active: state.attackerWeaponsOfTheFirstLegionActive,
    attacker_pennant_of_remembrance_active: state.attackerPennantOfRemembranceActive,
    attacker_below_starting_strength: state.attackerBelowStartingStrength,
    attacker_battleshocked: state.attackerBattleshocked,
    defender_armour_of_contempt_active: state.defenderArmourOfContemptActive,
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
    weapon_name: state.weaponName,
    defender_faction: state.defenderFaction,
    defender_unit: state.defenderUnit,
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
  return String(name).replace(/-\s*([a-z])/, (_, firstLetter) => `- ${firstLetter.toUpperCase()}`)
}

function formatWeaponName(weapon) {
  if (!weapon) {
    return ''
  }

  const keywordText = (weapon.raw_keywords || [])
    .map((keyword) => `[${keyword}]`)
    .join(' ')

  const formattedName = formatWeaponBaseName(weapon.name)
  return keywordText ? `${formattedName} ${keywordText}` : formattedName
}

function unitHasOathOfMoment(unit) {
  return (unit?.abilities || []).some((ability) => {
    const name = String(ability.name || '').toLowerCase()
    const rulesText = String(ability.rules_text || '').toLowerCase()
    return name.includes('oath of moment') || rulesText.includes('oath of moment')
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
  return detachment?.[collectionName]?.find((entry) => entry.name === entryName) || null
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
  selectedWeapon,
  oathOfMomentActive,
  attackerDetachment,
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
  hasHazardous,
}) {
  const rules = [
    ...getRelevantUnitRules(attackerUnitDetails, 'attacker', hasHazardous),
  ]

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
  defenderArmourOfContemptActive,
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
  const [simulationRuns, setSimulationRuns] = useState([])
  const [activeRunView, setActiveRunView] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')

  const [attackerFaction, setAttackerFaction] = useState('')
  const [attackerUnit, setAttackerUnit] = useState('')
  const [weaponName, setWeaponName] = useState('')
  const [defenderFaction, setDefenderFaction] = useState('')
  const [defenderUnit, setDefenderUnit] = useState('')
  const [attachedCharacterName, setAttachedCharacterName] = useState('')
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
  const [attackerUnforgivenFuryActive, setAttackerUnforgivenFuryActive] = useState(initialOptions.attacker_unforgiven_fury_active)
  const [attackerUnforgivenFuryArmyBattleshocked, setAttackerUnforgivenFuryArmyBattleshocked] = useState(initialOptions.attacker_unforgiven_fury_army_battleshocked)
  const [attackerStubbornTenacityActive, setAttackerStubbornTenacityActive] = useState(initialOptions.attacker_stubborn_tenacity_active)
  const [attackerWeaponsOfTheFirstLegionActive, setAttackerWeaponsOfTheFirstLegionActive] = useState(initialOptions.attacker_weapons_of_the_first_legion_active)
  const [attackerPennantOfRemembranceActive, setAttackerPennantOfRemembranceActive] = useState(initialOptions.attacker_pennant_of_remembrance_active)
  const [attackerBelowStartingStrength, setAttackerBelowStartingStrength] = useState(initialOptions.attacker_below_starting_strength)
  const [attackerBattleshocked, setAttackerBattleshocked] = useState(initialOptions.attacker_battleshocked)
  const [defenderArmourOfContemptActive, setDefenderArmourOfContemptActive] = useState(initialOptions.defender_armour_of_contempt_active)
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
    setWeaponName('')

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
    if (!attackerFaction || !attackerUnit || !attackerUnits.some((unit) => unit.name === attackerUnit)) {
      return
    }

    let active = true

    async function loadAttackerUnitDetails() {
      try {
        const data = await fetchUnitDetails(attackerFaction, attackerUnit)
        if (!active) {
          return
        }
        setAttackerUnitDetails(data)
        setWeaponName((currentWeapon) => (
          data.weapons?.some((weapon) => weapon.name === currentWeapon)
            ? currentWeapon
            : data.weapons?.[0]?.name || ''
        ))
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
  }, [attackerFaction, attackerUnit, attackerUnits])

  useEffect(() => {
    if (!defenderFaction || !defenderUnit || !defenderUnits.some((unit) => unit.name === defenderUnit)) {
      return
    }

    let active = true

    async function loadDefenderUnitDetails() {
      try {
        const data = await fetchUnitDetails(defenderFaction, defenderUnit)
        if (!active) {
          return
        }
        setDefenderUnitDetails(data)
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
  }, [defenderFaction, defenderUnit, defenderUnits])

  const selectedWeapon = useMemo(() => {
    return attackerUnitDetails?.weapons?.find((weapon) => weapon.name === weaponName) || null
  }, [attackerUnitDetails, weaponName])

  const selectedAttackerDetachment = useMemo(
    () => getDetachmentByName(attackerFactionDetails, attackerDetachmentName),
    [attackerFactionDetails, attackerDetachmentName],
  )

  const selectedDefenderDetachment = useMemo(
    () => getDetachmentByName(defenderFactionDetails, defenderDetachmentName),
    [defenderFactionDetails, defenderDetachmentName],
  )

  const weaponKeywords = selectedWeapon?.keywords || []
  const isRangedWeapon = selectedWeapon ? selectedWeapon.range !== 'Melee' : false
  const isMeleeWeapon = selectedWeapon ? selectedWeapon.range === 'Melee' : false
  const hasHeavy = weaponKeywords.includes('Heavy')
  const hasBlast = weaponKeywords.includes('Blast')
  const hasIndirectFire = weaponKeywords.includes('Indirect Fire')
  const hasHazardous = weaponKeywords.includes('Hazardous')
  const canUsePrecision = weaponKeywords.includes('Precision')
  const canUseLance = weaponKeywords.includes('Lance')
  const canUseCover = isRangedWeapon
  const canUseHalfRange = isRangedWeapon && (
    getWeaponKeywordValue(selectedWeapon, 'Rapid Fire') > 0
    || getWeaponKeywordValue(selectedWeapon, 'Melta') > 0
  )
  const hasOathOfMoment = unitHasOathOfMoment(attackerUnitDetails)
  const attackerEnhancementOptions = useMemo(
    () => getAttackerEnhancementOptions(selectedAttackerDetachment, selectedWeapon, hasHazardous),
    [selectedAttackerDetachment, selectedWeapon, hasHazardous],
  )
  const defenderEnhancementOptions = useMemo(
    () => getDefenderEnhancementOptions(selectedDefenderDetachment),
    [selectedDefenderDetachment],
  )
  const attackerStratagemOptions = useMemo(
    () => getAttackerStratagemOptions(selectedAttackerDetachment, isRangedWeapon),
    [selectedAttackerDetachment, isRangedWeapon],
  )
  const defenderStratagemOptions = useMemo(
    () => getDefenderStratagemOptions(selectedDefenderDetachment, selectedWeapon),
    [selectedDefenderDetachment, selectedWeapon],
  )

  const canUseAttackerFireDiscipline = attackerStratagemOptions.some((item) => item.name === 'Fire Discipline')
  const canUseAttackerUnforgivenFury = attackerStratagemOptions.some((item) => item.name === 'Unforgiven Fury')
  const canUseDefenderArmourOfContempt = defenderStratagemOptions.some((item) => item.name === 'Armour of Contempt')
  const canUseDefenderUnbreakableLines = defenderStratagemOptions.some((item) => item.name === 'Unbreakable Lines')
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
  const unforgivenFuryEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unforgiven Fury'),
    [selectedAttackerDetachment],
  )
  const armourOfContemptEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Armour of Contempt'),
    [selectedDefenderDetachment],
  )
  const unbreakableLinesEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Unbreakable Lines'),
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
  const rapidFireValue = getWeaponKeywordValue(selectedWeapon, 'Rapid Fire')
  const meltaValue = getWeaponKeywordValue(selectedWeapon, 'Melta')
  const attackerDetachmentTooltip = formatDetachmentTooltip(selectedAttackerDetachment)
  const defenderDetachmentTooltip = formatDetachmentTooltip(selectedDefenderDetachment)
  const attackerEnhancementTooltip = formatEnhancementTooltip(selectedAttackerEnhancement)
  const defenderEnhancementTooltip = formatEnhancementTooltip(selectedDefenderEnhancement)
  const fireDisciplineTooltip = formatStratagemTooltip(fireDisciplineEntry)
  const unforgivenFuryTooltip = formatStratagemTooltip(unforgivenFuryEntry)
  const armourOfContemptTooltip = formatStratagemTooltip(armourOfContemptEntry)
  const unbreakableLinesTooltip = formatStratagemTooltip(unbreakableLinesEntry)
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
  const defenderBattleshockedTooltip = defenderEnhancementTooltip
  const attachedCharacterTooltip = 'Precision: successful wounds from this attack can be allocated to the attached Character first.'
  const hazardousOverwatchTooltip = 'If this Hazardous weapon was used for Fire Overwatch in the opponent charge phase, the self-inflicted mortal wounds are allocated after the charging unit ends its charge move.'
  const hazardousBearerTooltip = 'Set the current wounds on the Hazardous bearer so self-damage is allocated against the correct model state.'
  const attackerActiveRules = useMemo(
    () => buildAttackerActiveRules({
      attackerUnitDetails,
      selectedWeapon,
      oathOfMomentActive,
      attackerDetachment: selectedAttackerDetachment,
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
      hasHazardous,
    }),
    [
      attackerUnitDetails,
      selectedWeapon,
      oathOfMomentActive,
      selectedAttackerDetachment,
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
      hasHazardous,
    ],
  )
  const defenderActiveRules = useMemo(
    () => buildDefenderActiveRules({
      defenderUnitDetails,
      selectedWeapon,
      defenderDetachment: selectedDefenderDetachment,
      defenderArmourOfContemptActive,
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
      defenderArmourOfContemptActive,
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

  const readyToSimulate = attackerFaction && attackerUnit && weaponName && defenderFaction && defenderUnit

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
    if (!canUseDefenderArmourOfContempt && defenderArmourOfContemptActive) {
      setDefenderArmourOfContemptActive(false)
    }
  }, [canUseDefenderArmourOfContempt, defenderArmourOfContemptActive])

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
    weaponName,
    defenderFaction,
    defenderUnit,
    attackerDetachmentName,
    defenderDetachmentName,
  ])

  async function handleSimulate(event) {
    event.preventDefault()
    if (!readyToSimulate) {
      return
    }

    try {
      setSimulating(true)
      setError('')
      setSimulationRuns([])
      const payload = buildSimulationPayload({
        attackerFaction,
        attackerUnit,
        weaponName,
        defenderFaction,
        defenderUnit,
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
        attackerUnforgivenFuryActive,
        attackerUnforgivenFuryArmyBattleshocked,
        attackerStubbornTenacityActive,
        attackerWeaponsOfTheFirstLegionActive,
        attackerPennantOfRemembranceActive,
        attackerBelowStartingStrength,
        attackerBattleshocked,
        defenderArmourOfContemptActive,
        defenderUnbreakableLinesActive,
        defenderPennantOfRemembranceActive,
        defenderBattleshocked,
      })
      const runsToExecute = Math.max(1, Number(runCount) || 1)
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
    setAttackerUnforgivenFuryActive(initialOptions.attacker_unforgiven_fury_active)
    setAttackerUnforgivenFuryArmyBattleshocked(initialOptions.attacker_unforgiven_fury_army_battleshocked)
    setAttackerStubbornTenacityActive(initialOptions.attacker_stubborn_tenacity_active)
    setAttackerWeaponsOfTheFirstLegionActive(initialOptions.attacker_weapons_of_the_first_legion_active)
    setAttackerPennantOfRemembranceActive(initialOptions.attacker_pennant_of_remembrance_active)
    setAttackerBelowStartingStrength(initialOptions.attacker_below_starting_strength)
    setAttackerBattleshocked(initialOptions.attacker_battleshocked)
    setDefenderArmourOfContemptActive(initialOptions.defender_armour_of_contempt_active)
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
          <h1>Check Unit Effectiveness</h1>
          <p>
            Pick an attacker, a weapon profile, a defender, and the combat context.
            Applies the rules engine and returns a full combat log.
          </p>
        </div>
      </header>

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

            <label>
              <span>Weapon Profile</span>
              <select value={weaponName} onChange={(event) => setWeaponName(event.target.value)}>
                {attackerUnitDetails?.weapons?.map((weapon) => (
                  <option key={weapon.name} value={weapon.name}>
                    {formatWeaponName(weapon)}
                  </option>
                ))}
              </select>
            </label>

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
                  <p className="kicker">Selected Weapon</p>
                  <h3>{formatWeaponName(selectedWeapon)}</h3>
                </div>
                <div className="datasheet-stats">
                  {renderWeaponStatsGrid(selectedWeapon)}
                </div>
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

              {hasBlast ? (
                <label className="checkbox-row" title={blastTooltip}>
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
                <label title={attachedCharacterTooltip}>
                  <span>Attached Character</span>
                  <select
                    title={attachedCharacterTooltip}
                    value={attachedCharacterName}
                    onChange={(event) => setAttachedCharacterName(event.target.value)}
                  >
                    <option value="">No attached character</option>
                    {defenderUnits.map((unit) => (
                      <option key={unit.name} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
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
              <h2>Datasheet Snapshot</h2>
            </div>
          </div>

          <div className="snapshot-grid">
            <article className="datasheet-card">
              <p className="kicker">Attacker</p>
              <h3>{attackerUnitDetails?.name || 'No unit selected'}</h3>
              <p>{attackerFaction || 'Faction not set'}</p>
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
          <ol className="combat-log">
            {activeRun.result.log.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : (
          <div className="empty-state compact">
            <p>The run index and combat logs will appear here after a simulation.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
