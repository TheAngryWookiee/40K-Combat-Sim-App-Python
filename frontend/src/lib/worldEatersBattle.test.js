import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeWorldEatersEffects, canWorldEaterAdvanceAndCharge, worldEatersTransportCost, worldEatersMoveThrough, worldEatersChargeBonus, worldEatersAutomaticCombatAbilities, createWorldEatersArmy, activateWorldEatersArmyRule, recordWorldEatersKill, worldEatersArmyAura } from './worldEatersBattle.js'

const data = JSON.parse(readFileSync(new URL('../../../World_Eaters.json', import.meta.url), 'utf8'))
const units = Object.fromEntries(data.units.map((unit) => [unit.name, unit]))

test('World Eaters transport capacity and prohibited passengers', () => {
  assert.equal(worldEatersTransportCost(units['Chaos Rhino'], units['Khorne Berzerkers'], 10), 10)
  assert.equal(worldEatersTransportCost(units['Chaos Rhino'], units.Eightbound, 3), Infinity)
  assert.equal(worldEatersTransportCost(units['Chaos Rhino'], units['Chaos Terminators'], 5), Infinity)
  assert.equal(worldEatersTransportCost(units['Chaos Land Raider'], units['Chaos Terminators'], 5), 10)
  assert.equal(worldEatersTransportCost(units['Chaos Land Raider'], units.Bloodletters, 10), Infinity)
})

test('native and temporary movement permissions expire', () => {
  assert.equal(canWorldEaterAdvanceAndCharge(units['Chaos Spawn']), true)
  assert.equal(canWorldEaterAdvanceAndCharge(units.Skarbrand), true)
  assert.equal(canWorldEaterAdvanceAndCharge(units.Eightbound), false)
  assert.equal(worldEatersMoveThrough(units.Defiler, units.Angron, 'normal'), true)
  assert.equal(worldEatersMoveThrough(units.Defiler, units['Khorne Lord of Skulls'], 'normal'), false)
  assert.equal(worldEatersMoveThrough(units.Defiler, units.Angron, 'charge'), false)
  const effects = [{ unitId: 'a', turn: 2, expiresTurn: 4, traits: { suppressed: true } }, { unitId: 'a', turn: 2, phase: 'fight', expiresTurn: 3 }]
  assert.equal(activeWorldEatersEffects(effects, 'a', 2, 'fight').length, 2)
  assert.equal(activeWorldEatersEffects(effects, 'a', 3, 'command').length, 1)
  assert.equal(activeWorldEatersEffects(effects, 'a', 4, 'command').length, 0)
})

test('charge bonuses use real wargear and Scent of Blood range', () => {
  assert.equal(worldEatersChargeBonus(units.Bloodletters), 1)
  assert.equal(worldEatersChargeBonus(units.Maulerfiend, [{ gap: 9, belowHalf: true, belowStarting: true }]), 2)
  assert.equal(worldEatersChargeBonus(units.Maulerfiend, [{ gap: 9.1, belowHalf: true }]), 0)
  assert.equal(worldEatersChargeBonus(units['Khorne Berzerkers'], [], { rushToTheFray: true, burningBloodIdol: true }), 2)
})

test('automatic ranged rules require range and correct closest target', () => {
  const c = { unit: units.Forgefiend, target: units.Bloodletters, phase: 'shooting', closest: true, gap: 18 }
  assert.deepEqual(worldEatersAutomaticCombatAbilities(c), ['Furious Onslaught'])
  assert.deepEqual(worldEatersAutomaticCombatAbilities({ ...c, gap: 18.1 }), [])
  assert.deepEqual(worldEatersAutomaticCombatAbilities({ ...c, closest: false }), [])
  assert.deepEqual(worldEatersAutomaticCombatAbilities({ ...c, unit: units['Chaos Predator Annihilator'], target: units.Angron, closest: false, closestMonsterVehicle: true }), ['Blood-hungry Annihilator'])
})

test('auras require friendly source and measured range; damaged profiles use wounds', () => {
  const c = { unit: units.Bloodletters, phase: 'fight', allies: [{ unit: units.Bloodthirster, gap: 6 }] }
  assert.deepEqual(worldEatersAutomaticCombatAbilities(c), ['Daemon Lord of Khorne (Aura)'])
  assert.deepEqual(worldEatersAutomaticCombatAbilities({ ...c, allies: [{ unit: units.Bloodthirster, gap: 6.1 }] }), [])
  assert.deepEqual(worldEatersAutomaticCombatAbilities({ unit: units.Angron, phase: 'fight', currentWounds: 7 }), [])
  assert.deepEqual(worldEatersAutomaticCombatAbilities({ unit: units.Angron, phase: 'fight', currentWounds: 6 }), ['Damaged'])
})

test('Blood Tithe generation, costs, duplicate kill protection and persistent unlocks', () => {
  let state = createWorldEatersArmy()
  const event = { eventId: 'kill1', unit: units['Khorne Berzerkers'], detachment: 'KHORNE DAEMONKIN', bloodTitheRoll: 3 }
  state = recordWorldEatersKill(state, event)
  assert.equal(state.bloodTithe, 1)
  assert.equal(state.bloodshed, 1)
  assert.equal(recordWorldEatersKill(state, event), state)
  assert.throws(() => activateWorldEatersArmyRule(state, 'ENRAGED ABJURATION', 2, 'command', true), /Not enough/)
  state = recordWorldEatersKill(state, { ...event, eventId: 'kill2' })
  state = activateWorldEatersArmyRule(state, 'ENRAGED ABJURATION', 2, 'command', true)
  assert.equal(state.bloodTithe, 0)
  assert.deepEqual(state.titheAbilities, ['ENRAGED ABJURATION'])
  assert.throws(() => activateWorldEatersArmyRule({ ...state, bloodTithe: 10 }, 'DAEMONIC RAGE', 2, 'command', true), /Only one/)
  assert.throws(() => activateWorldEatersArmyRule(state, 'ENRAGED ABJURATION', 3, 'command', false), /already active/)
})

test('Idols respect once-per-battle use, command timing, expiry and titanic range', () => {
  const name = 'IDOL OF INFINITE RAGE (AURA)'
  const state = activateWorldEatersArmyRule(createWorldEatersArmy(), name, 2, 'command', true)
  assert.throws(() => activateWorldEatersArmyRule(state, name, 4, 'command', true), /already been used/)
  assert.throws(() => activateWorldEatersArmyRule(createWorldEatersArmy(), name, 2, 'fight', true), /Command phase/)
  assert.deepEqual(worldEatersArmyAura(units.Jakhals, [{ unit: units['Khorne Lord of Skulls'], gap: 9 }], state, 3), [name])
  assert.deepEqual(worldEatersArmyAura(units.Jakhals, [{ unit: units.Angron, gap: 9 }], state, 3), [])
  assert.deepEqual(worldEatersArmyAura(units.Jakhals, [{ unit: units.Angron, gap: 6 }], state, 4), [])
})
