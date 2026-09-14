const normalize = (value) => String(value || '').toLowerCase()
const has = (unit, keyword) => [...(unit?.keywords || []), ...(unit?.faction_keywords || [])]
  .some((entry) => normalize(entry) === keyword)
const worldEater = (unit) => has(unit, 'world eaters')
const cultist = (unit) => has(unit, 'jakhals') || has(unit, 'goremongers')
const character = (unit) => worldEater(unit) && has(unit, 'character') && !has(unit, 'epic hero')
const possessed = (unit) => worldEater(unit) && has(unit, 'possessed')
const abilityNames = (unit) => [...(unit?.abilities || []), ...(unit?.wargear_abilities || [])].map((a) => normalize(a.name))

export function worldEatersUnitAbilitySupported(name, { sourceUnit: unit, side, phaseId, targetUnit, allowOutOfPhaseAbilities, chargedThisTurn }) {
  if (!worldEater(unit) && !has(unit, 'blood legions')) return null
  if (name === 'airborne predator' && has(unit, 'heldrake')) return false
  if (name === 'devoted to destruction' && has(unit, 'helbrute')) return false
  if (['swooping predator', 'bloody stampede'].includes(name)) return side === 'attacker' && Boolean(allowOutOfPhaseAbilities)
    && abilityNames(unit).includes(name) && (name !== 'bloody stampede' || Boolean(chargedThisTurn))
  if (['damaged', 'possessed lord', 'bloody fury', 'furious onslaught', 'blood-hungry annihilator'].includes(name)) {
    if (side !== 'attacker' || !abilityNames(unit).includes(name)) return false
    if (name === 'damaged') return true
    if (name === 'possessed lord') return phaseId === 'fight'
    return phaseId === 'shooting' && (name !== 'blood-hungry annihilator' || has(targetUnit, 'monster') || has(targetUnit, 'vehicle'))
  }
  if (['beacons of rage (aura)', 'driven by ultimate rage (aura)'].includes(name)) return side === 'attacker' && phaseId === 'fight' && worldEater(unit)
  if (['daemon lord of khorne (aura)', 'rage embodied (aura)'].includes(name)) return side === 'attacker' && phaseId === 'fight' && has(unit, 'blood legions')
  return null
}

export function getWorldEatersAuraChoices(unit) {
  const names = worldEater(unit) ? ['Beacons of Rage (Aura)', 'Driven by Ultimate Rage (Aura)']
    : has(unit, 'blood legions') ? ['Daemon Lord of Khorne (Aura)', 'Rage Embodied (Aura)'] : []
  const texts = {
    'Beacons of Rage (Aura)': 'Within 6" of friendly Eightbound: melee attacks against non-MONSTER/non-VEHICLE units gain +1 to Hit and, against Below Half-strength targets, +1 to Wound.',
    'Driven by Ultimate Rage (Aura)': 'Within 6" of friendly Angron: ignore negative Weapon Skill and Hit modifiers for melee attacks.',
    'Daemon Lord of Khorne (Aura)': 'Within 6" of a friendly Bloodthirster: BLOOD LEGIONS melee attacks gain +1 to Hit.',
    'Rage Embodied (Aura)': 'Within 6" of friendly Skarbrand: BLOOD LEGIONS melee weapons gain +1 Attacks.',
  }
  return names.map((name) => ({ name, rules_text: texts[name] }))
}
const directTargetStratagems = new Set([
  'hack and slash', 'frenzied resilience', 'fail not the blood god',
  'fail not the blood god - within idol range', 'in the shadow of brass idols',
  'in the shadow of brass idols - within idol range', 'daemonic resistance',
  'daemonic strength', 'apoplectic clarity', 'focused ferocity', 'a trophy for the throne',
  'wrath beyond reason', 'scorn the witch', 'aspire to infamy',
])

export const WORLD_EATERS_DETACHMENTS = new Set([
  'berzerker warband', 'cult of blood', 'khorne daemonkin', 'possessed slaughterband',
  'goretrack onslaught', 'brazen engines', 'butchers of khorne', 'vessels of wrath',
])

export function getWorldEatersEnhancements(detachment, unit, side, weapon) {
  if (!WORLD_EATERS_DETACHMENTS.has(normalize(detachment?.name))) return null
  if (!unit || has(unit, 'epic hero')) return []
  const melee = weapon?.range === 'Melee'
  const supported = {
    'berzerker glaive': () => side === 'attacker' && worldEater(unit) && melee,
    'helm of brazen ire': () => side === 'defender' && worldEater(unit),
    'brazen form': () => side === 'defender' && worldEater(unit) && has(unit, 'monster'),
    'blood-forged armour': () => side === 'defender' && (worldEater(unit) || has(unit, 'blood legions')),
    'blade of endless bloodshed': () => side === 'attacker' && worldEater(unit) && melee,
    'frenzied focus': () => side === 'attacker' && worldEater(unit) && has(unit, 'daemon'),
    'talons of butchery': () => side === 'attacker' && has(unit, 'maulerfiend') && melee,
    'murder-forged entity': () => side === 'attacker' && worldEater(unit) && has(unit, 'vehicle'),
    'gore-stained veterans': () => side === 'attacker' && has(unit, 'terminator squad') && melee,
    'archslaughterer': () => side === 'attacker' && worldEater(unit) && melee,
  }
  return (detachment.enhancements || []).filter((entry) => supported[normalize(entry.name)]?.())
}

// Each selection represents an effect already activated for this combat. Range,
// resource expenditure and prior-turn triggers are stated in the rule tooltip.
export function worldEatersAbilitySupported(name, context) {
  if (context.sourceBattleshocked && directTargetStratagems.has(name)) return false
  const { detachment, sourceUnit: unit, units = [], side, phaseId, chargedThisTurn, selectedEnhancementName } = context
  const detachmentName = normalize(detachment?.name)
  const attack = side === 'attacker'
  const fight = phaseId === 'fight'
  const shooting = phaseId === 'shooting'
  const packageCharacter = units.some(character) && !units.some((entry) => has(entry, 'epic hero'))
  switch (detachmentName) {
    case 'berzerker warband':
      return worldEater(unit) && fight && (attack
        ? name === 'hack and slash' && Boolean(chargedThisTurn)
        : name === 'frenzied resilience')
    case 'cult of blood':
      if (!cultist(unit)) return false
      return attack
        ? ['idol of infinite rage (aura)', 'bloody vengeance'].includes(name)
          || (fight && ['fail not the blood god', 'fail not the blood god - within idol range'].includes(name))
        : ['idol of blessed blood (aura)', 'in the shadow of brass idols', 'in the shadow of brass idols - within idol range'].includes(name)
    case 'khorne daemonkin':
      if (attack) {
        return fight && ((name === 'daemonic rage' && has(unit, 'blood legions'))
          || (worldEater(unit) && ['daemonic fury', 'daemonic fury - daemonic rage active'].includes(name)))
      }
      return (name === 'enraged abjuration' && (worldEater(unit) || has(unit, 'blood legions')))
        || (name === 'boon of blood' && has(unit, 'blood legions'))
        || (worldEater(unit) && ['blessing of burning blood', 'blessing of burning blood - boon of blood active'].includes(name))
    case 'possessed slaughterband':
      return possessed(unit) && (attack
        ? fight && name === 'daemonic strength' && (has(unit, 'eightbound') || has(unit, 'exalted eightbound'))
        : name === 'daemonic resistance')
    case 'goretrack onslaught':
      return attack && fight && worldEater(unit) && name === 'rush to the fray - disembarked this turn'
    case 'brazen engines':
      return attack && name === 'apoplectic clarity' && has(unit, 'vehicle')
        && (has(unit, 'daemon') || (worldEater(unit) && normalize(selectedEnhancementName) === 'murder-forged entity'))
    case 'butchers of khorne':
      return has(unit, 'terminator squad') && (attack
        ? fight && ['focused ferocity', 'a trophy for the throne'].includes(name)
        : shooting && name === 'wrath beyond reason')
    case 'vessels of wrath':
      if (attack) {
        return fight && ((packageCharacter && ['wrath of khorne - cleave', 'wrath of khorne - armour penetration', 'aspire to infamy'].includes(name))
          || (worldEater(unit) && name === 'archslaughterer - combat blessings' && normalize(selectedEnhancementName) === 'archslaughterer'))
      }
      return packageCharacter && name === 'scorn the witch'
    default:
      return false
  }
}

const exclusiveGroups = [
  ['WRATH OF KHORNE - CLEAVE', 'WRATH OF KHORNE - ARMOUR PENETRATION'],
  ['FAIL NOT THE BLOOD GOD', 'FAIL NOT THE BLOOD GOD - WITHIN IDOL RANGE'],
  ['IN THE SHADOW OF BRASS IDOLS', 'IN THE SHADOW OF BRASS IDOLS - WITHIN IDOL RANGE'],
  ['DAEMONIC FURY', 'DAEMONIC FURY - DAEMONIC RAGE ACTIVE'],
  ['BLESSING OF BURNING BLOOD', 'BLESSING OF BURNING BLOOD - BOON OF BLOOD ACTIVE'],
]

export function toggleCombatAbility(current, name, checked) {
  if (!checked) return current.filter((entry) => entry !== name)
  const group = exclusiveGroups.find((entries) => entries.includes(name)) || []
  return [...new Set([...current.filter((entry) => !group.includes(entry)), name])]
}
