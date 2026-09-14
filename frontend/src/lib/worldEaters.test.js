import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getWorldEatersEnhancements, worldEatersAbilitySupported, toggleCombatAbility } from './worldEaters.js'

const data = JSON.parse(readFileSync(new URL('../../../World_Eaters.json', import.meta.url), 'utf8'))
const detachments = Object.fromEntries(data.faction.detachments.map((entry) => [entry.name, entry]))
const unit = (...keywords) => ({ keywords, faction_keywords: ['WORLD EATERS'] })
const melee = { range: 'Melee' }
const ranged = { range: '24"' }
const context = (detachment, sourceUnit, side = 'attacker', phaseId = 'fight') => ({
  detachment: detachments[detachment], sourceUnit, units: [sourceUnit], side, phaseId,
})

test('enhancements respect bearer keywords, phase and Epic Heroes', () => {
  const lord = unit('CHARACTER')
  assert.deepEqual(getWorldEatersEnhancements(detachments['BERZERKER WARBAND'], lord, 'attacker', melee).map((e) => e.name), ['BERZERKER GLAIVE'])
  assert.deepEqual(getWorldEatersEnhancements(detachments['BERZERKER WARBAND'], lord, 'attacker', ranged), [])
  assert.deepEqual(getWorldEatersEnhancements(detachments['BERZERKER WARBAND'], unit('CHARACTER', 'EPIC HERO'), 'defender'), [])
  assert.equal(getWorldEatersEnhancements({ name: 'Other' }, lord, 'attacker', melee), null)
  assert.deepEqual(getWorldEatersEnhancements(detachments['BUTCHERS OF KHORNE'], unit('TERMINATOR SQUAD'), 'attacker', melee).map((e) => e.name), ['GORE-STAINED VETERANS'])
  assert.deepEqual(getWorldEatersEnhancements(detachments['CULT OF BLOOD'], lord, 'defender'), [])
})

test('Berzerker controls require charge and the correct side', () => {
  const c = context('BERZERKER WARBAND', unit('INFANTRY'))
  assert.equal(worldEatersAbilitySupported('hack and slash', c), false)
  assert.equal(worldEatersAbilitySupported('hack and slash', { ...c, chargedThisTurn: true }), true)
  assert.equal(worldEatersAbilitySupported('frenzied resilience', c), false)
  assert.equal(worldEatersAbilitySupported('frenzied resilience', { ...c, side: 'defender' }), true)
})

test('all eight detachments expose their supported conditional effects', () => {
  const cases = [
    ['BERZERKER WARBAND', 'frenzied resilience', unit(), 'defender'],
    ['CULT OF BLOOD', 'idol of infinite rage (aura)', unit('JAKHALS')],
    ['KHORNE DAEMONKIN', 'daemonic rage', unit('BLOOD LEGIONS')],
    ['POSSESSED SLAUGHTERBAND', 'daemonic strength', unit('POSSESSED', 'EXALTED EIGHTBOUND')],
    ['GORETRACK ONSLAUGHT', 'rush to the fray - disembarked this turn', unit()],
    ['BRAZEN ENGINES', 'apoplectic clarity', unit('DAEMON', 'VEHICLE')],
    ['BUTCHERS OF KHORNE', 'focused ferocity', unit('TERMINATOR SQUAD')],
    ['VESSELS OF WRATH', 'wrath of khorne - cleave', unit('CHARACTER')],
  ]
  for (const [detachment, name, sourceUnit, side] of cases) {
    assert.equal(worldEatersAbilitySupported(name, context(detachment, sourceUnit, side)), true, name)
  }
})

test('cultist auras and defensive stratagems reject invalid recipients and phases', () => {
  assert.equal(worldEatersAbilitySupported('idol of infinite rage (aura)', context('CULT OF BLOOD', unit('MONSTER'))), false)
  assert.equal(worldEatersAbilitySupported('wrath beyond reason', context('BUTCHERS OF KHORNE', unit('TERMINATOR SQUAD'), 'defender')), false)
  assert.equal(worldEatersAbilitySupported('wrath beyond reason', context('BUTCHERS OF KHORNE', unit('TERMINATOR SQUAD'), 'defender', 'shooting')), true)
  assert.equal(worldEatersAbilitySupported('daemonic resistance', context('POSSESSED SLAUGHTERBAND', unit('INFANTRY'), 'defender')), false)
})

test('character rules appear for attached characters but exclude Epic Hero units', () => {
  const c = context('VESSELS OF WRATH', unit('INFANTRY'))
  assert.equal(worldEatersAbilitySupported('aspire to infamy', c), false)
  assert.equal(worldEatersAbilitySupported('aspire to infamy', { ...c, units: [c.sourceUnit, unit('CHARACTER')] }), true)
  assert.equal(worldEatersAbilitySupported('aspire to infamy', { ...c, units: [c.sourceUnit, unit('CHARACTER', 'EPIC HERO')] }), false)
})

test('conditional alternatives replace each other without clearing unrelated abilities', () => {
  const first = ['MARTIAL EXCELLENCE', 'WRATH OF KHORNE - CLEAVE']
  const second = toggleCombatAbility(first, 'WRATH OF KHORNE - ARMOUR PENETRATION', true)
  assert.deepEqual(second, ['MARTIAL EXCELLENCE', 'WRATH OF KHORNE - ARMOUR PENETRATION'])
  assert.deepEqual(toggleCombatAbility(second, 'WRATH OF KHORNE - ARMOUR PENETRATION', false), ['MARTIAL EXCELLENCE'])
  assert.deepEqual(toggleCombatAbility(['FAIL NOT THE BLOOD GOD'], 'FAIL NOT THE BLOOD GOD - WITHIN IDOL RANGE', true), ['FAIL NOT THE BLOOD GOD - WITHIN IDOL RANGE'])
})
