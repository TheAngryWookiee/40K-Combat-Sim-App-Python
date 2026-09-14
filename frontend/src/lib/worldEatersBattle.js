const lower = (value) => String(value || '').toLowerCase()
export const hasKeyword = (unit, name) => [...(unit?.keywords || []), ...(unit?.faction_keywords || [])].some((k) => lower(k) === lower(name))
export const hasAbility = (unit, name) => [...(unit?.abilities || []), ...(unit?.wargear_abilities || [])].some((a) => lower(a.name) === lower(name))
const isWorldEater = (unit) => hasKeyword(unit, 'world eaters')

export function activeWorldEatersEffects(effects, unitId, turn, phase) {
  return effects.filter((effect) => effect.unitId === unitId && turn < effect.expiresTurn
    && (!effect.phase || (effect.turn === turn && effect.phase === phase)))
}

export const BLOOD_TITHE_COSTS = { 'ENRAGED ABJURATION': 2, 'DAEMONIC RAGE': 3, 'BOON OF BLOOD': 4, 'MIGHT OF KHORNE': 5 }
export const IDOLS_OF_KHORNE = ['IDOL OF INFINITE RAGE (AURA)', 'IDOL OF BURNING WRATH (AURA)', 'IDOL OF BLESSED BLOOD (AURA)']
export const createWorldEatersArmy = () => ({ bloodTithe: 0, bloodshed: 0, titheAbilities: [], titheCommand: null, usedIdols: [], idol: null, idolTurn: null, events: [] })

export function activateWorldEatersArmyRule(state, name, turn, phase, ownTurn) {
  if (phase !== 'command') throw new Error('Activate this rule at the start of the Command phase.')
  if (name in BLOOD_TITHE_COSTS) {
    if (state.titheAbilities.includes(name)) throw new Error('This Blood Tithe ability is already active.')
    if (state.titheCommand === turn) throw new Error('Only one Blood Tithe ability can be activated at the start of this Command phase.')
    if (state.bloodTithe < BLOOD_TITHE_COSTS[name]) throw new Error('Not enough Blood Tithe points.')
    return { ...state, bloodTithe: state.bloodTithe - BLOOD_TITHE_COSTS[name], titheAbilities: [...state.titheAbilities, name], titheCommand: turn }
  }
  if (!IDOLS_OF_KHORNE.includes(name) || !ownTurn) throw new Error('Select an Idol at the start of your Command phase.')
  if (state.idolTurn === turn) throw new Error('An Idol was already selected this Command phase.')
  if (state.usedIdols.includes(name)) throw new Error('This Idol has already been used this battle.')
  return { ...state, idol: name, idolTurn: turn, usedIdols: [...state.usedIdols, name] }
}

export function recordWorldEatersKill(state, { eventId, unit, detachment, bloodTitheRoll }) {
  if (state.events.includes(eventId)) return state
  const eligible = isWorldEater(unit) || hasKeyword(unit, 'blood legions')
  return { ...state,
    events: [...state.events, eventId],
    bloodTithe: state.bloodTithe + (eligible && lower(detachment) === 'khorne daemonkin' && bloodTitheRoll >= 3 ? 1 : 0),
    bloodshed: state.bloodshed + (hasAbility(unit, 'Icon of Khorne') ? 1 : 0),
  }
}

export function worldEatersArmyAura(unit, allies, state, turn) {
  if (!state.idol || state.idolTurn === null || turn >= state.idolTurn + 2
    || !(hasKeyword(unit, 'jakhals') || hasKeyword(unit, 'goremongers'))) return []
  const inRange = allies.some(({ unit: source, gap }) => isWorldEater(source)
    && (hasKeyword(source, 'monster') || hasKeyword(source, 'titanic'))
    && gap <= (hasKeyword(source, 'titanic') ? 9 : 6) + (source.worldEatersEffects?.chosenOfTheBloodGod ? 3 : 0))
  return inRange ? [state.idol] : []
}

export function canWorldEaterAdvanceAndCharge(unit) {
  return hasAbility(unit, 'Murderlust') || hasAbility(unit, 'To Slake its Rage')
    || Boolean(unit?.worldEatersEffects?.advanceCharge)
}

export function worldEatersSurgeAfterShooting(unit, detachment, enhancement, casualties, d6) {
  if (casualties <= 0) return null
  if (hasAbility(unit, 'Blood Surge')) return { name: 'Blood Surge', distance: d6 + 2 }
  if (lower(detachment) === 'possessed slaughterband' && isWorldEater(unit) && hasKeyword(unit, 'possessed')) {
    return { name: 'Brazen Fury', distance: lower(enhancement) === 'malicious vigour' ? 6 : d6 }
  }
  return null
}

export function worldEatersMoveThrough(unit, enemy, moveType) {
  if (!isWorldEater(unit)) return false
  if (unit.worldEatersEffects?.fireRiders && ['normal', 'advance', 'fall_back', 'charge'].includes(moveType)) return true
  return ['normal', 'advance', 'fall_back'].includes(moveType) && !hasKeyword(enemy, 'titanic')
    && (hasAbility(unit, 'Scuttling Walker') || hasAbility(unit, 'Super-heavy War Engine'))
}

export function worldEatersTransportCost(transport, passenger, count) {
  const models = Number(count ?? passenger?.modelCount ?? passenger?.model_count ?? 1)
  if (!isWorldEater(transport)) return models
  if (!isWorldEater(passenger) || !hasKeyword(passenger, 'infantry')) return Infinity
  const bulky = hasKeyword(passenger, 'possessed') || hasKeyword(passenger, 'terminator') || hasKeyword(passenger, 'terminator squad')
  if (hasKeyword(transport, 'rhino')) return bulky ? Infinity : models
  if (hasKeyword(transport, 'land raider')) return models * (bulky ? 2 : 1)
  return models
}

export function worldEatersChargeBonus(unit, enemies = [], effects = {}) {
  let bonus = 0
  if (hasAbility(unit, 'Instrument of Chaos')) bonus += 1
  if (effects.unbridledBloodlust) bonus += 1
  if (effects.battleLust && effects.unbridledBloodlust) bonus += 1
  if (effects.rushToTheFray || effects.gatewaysToGlory) bonus += 1
  if (effects.burningBloodIdol) bonus += 1
  if (hasAbility(unit, 'The Scent of Blood')) {
    const nearby = enemies.filter((enemy) => enemy.gap <= 9)
    if (nearby.some((enemy) => enemy.belowHalf)) bonus += 2
    else if (nearby.some((enemy) => enemy.belowStarting)) bonus += 1
  }
  return bonus
}

export function worldEatersAutomaticCombatAbilities({ unit, target, phase, currentWounds, closest = false, closestMonsterVehicle = false, gap = Infinity, allies = [] }) {
  const active = []
  if (!isWorldEater(unit) && !hasKeyword(unit, 'blood legions')) return active
  if (hasAbility(unit, 'Damaged') && currentWounds > 0 && currentWounds <= (hasKeyword(unit, 'skarbrand') ? 7 : 6)) active.push('Damaged')
  if (phase === 'shooting') {
    if (hasAbility(unit, 'Bloody Fury') && closest) active.push('Bloody Fury')
    if (hasAbility(unit, 'Furious Onslaught') && closest && gap <= 18) active.push('Furious Onslaught')
    if (hasAbility(unit, 'Blood-hungry Annihilator') && closestMonsterVehicle && gap <= 18
      && (hasKeyword(target, 'monster') || hasKeyword(target, 'vehicle'))) active.push('Blood-hungry Annihilator')
  }
  if (phase === 'fight') {
    for (const { unit: source, gap: range } of allies) {
      if (range > 6) continue
      for (const name of isWorldEater(unit) ? ['Beacons of Rage (Aura)', 'Driven by Ultimate Rage (Aura)']
        : ['Daemon Lord of Khorne (Aura)', 'Rage Embodied (Aura)']) {
        if (hasAbility(source, name)) active.push(name)
      }
    }
  }
  return [...new Set(active)]
}

export function worldEatersStratagemError(name, unit, phase, ownTurn) {
  const key = lower(name)
  const requirements = {
    'apoplectic frenzy': [isWorldEater(unit) && hasKeyword(unit, 'khorne berzerkers'), phase === 'movement' && ownTurn],
    'trail of destruction': [hasKeyword(unit, 'daemon') && hasKeyword(unit, 'vehicle'), phase === 'movement' && ownTurn],
    'focused ferocity': [hasKeyword(unit, 'terminator squad'), phase === 'fight'],
    'a trophy for the throne': [hasKeyword(unit, 'terminator squad'), phase === 'fight'],
    'wrath beyond reason': [hasKeyword(unit, 'terminator squad'), phase === 'shooting' && !ownTurn],
    'frenzied resilience': [isWorldEater(unit), phase === 'fight'],
    'hack and slash': [isWorldEater(unit), phase === 'fight'],
    'daemonic resistance': [isWorldEater(unit) && hasKeyword(unit, 'possessed'), phase === 'shooting' || phase === 'fight'],
    'daemonic strength': [hasKeyword(unit, 'eightbound') || hasKeyword(unit, 'exalted eightbound'), phase === 'fight'],
  }[key]
  if (!requirements) return ''
  return !requirements[0] ? 'This unit does not meet the World Eaters stratagem target requirements.'
    : !requirements[1] ? 'This World Eaters stratagem cannot be used in the current phase.' : ''
}
