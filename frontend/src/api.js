import axios from 'axios'

const defaultBaseUrl = import.meta.env.DEV ? 'http://127.0.0.1:8010' : '/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultBaseUrl,
  timeout: 15000,
})

export async function fetchFactions() {
  const response = await api.get('/factions')
  return response.data
}

export async function fetchFactionDetails(factionName) {
  const response = await api.get(`/factions/${encodeURIComponent(factionName)}`)
  return response.data
}

export async function fetchUnits(factionName) {
  const response = await api.get(`/factions/${encodeURIComponent(factionName)}/units`)
  return response.data
}

export async function fetchUnitDetails(factionName, unitName) {
  return fetchUnitDetailsWithLoadout(factionName, unitName, {}, null)
}

export async function fetchUnitDetailsWithLoadout(
  factionName,
  unitName,
  loadoutSelections = {},
  modelCount = null,
  modelCounts = {},
) {
  const params = {}
  if (Object.keys(loadoutSelections).length) {
    params.loadout = JSON.stringify(loadoutSelections)
  }
  if (modelCount !== null && modelCount !== undefined && modelCount !== '') {
    params.model_count = Number(modelCount)
  }
  if (modelCounts && Object.keys(modelCounts).length) {
    params.model_counts = JSON.stringify(modelCounts)
  }

  const response = await api.get(
    `/factions/${encodeURIComponent(factionName)}/units/${encodeURIComponent(unitName)}`,
    { params: Object.keys(params).length ? params : undefined },
  )
  return response.data
}

export async function simulateCombat(payload) {
  const response = await api.post('/simulate', payload)
  return response.data
}

export async function fetchTurnStructure() {
  const response = await api.get('/rules/turn-structure')
  return response.data
}

export async function resolveCommandPhase(payload) {
  const response = await api.post('/rules/command-phase', payload)
  return response.data
}

export async function rollLeadership(payload) {
  const response = await api.post('/rules/leadership-roll', payload)
  return response.data
}

export async function rollBattleShock(payload) {
  const response = await api.post('/rules/battle-shock-roll', payload)
  return response.data
}

export async function validateModelMove(payload) {
  const response = await api.post('/rules/model-move', payload)
  return response.data
}

export async function validateUnitSetup(payload) {
  const response = await api.post('/rules/unit-setup', payload)
  return response.data
}

export async function validateUnitCoherency(payload) {
  const response = await api.post('/rules/unit-coherency', payload)
  return response.data
}

export async function validateUnitEngagement(payload) {
  const response = await api.post('/rules/unit-engagement', payload)
  return response.data
}

export async function regainUnitCoherency(payload) {
  const response = await api.post('/rules/regain-coherency', payload)
  return response.data
}

export async function validateWeaponSelection(payload) {
  const response = await api.post('/rules/weapon-selection', payload)
  return response.data
}

export async function validateShootingType(payload) {
  const response = await api.post('/rules/shooting-type', payload)
  return response.data
}

export async function resolveCharge(payload) {
  const response = await api.post('/rules/charge', payload)
  return response.data
}

export async function validatePileIn(payload) {
  const response = await api.post('/rules/pile-in', payload)
  return response.data
}

export async function validateFightType(payload) {
  const response = await api.post('/rules/fight-type', payload)
  return response.data
}

export async function validateConsolidate(payload) {
  const response = await api.post('/rules/consolidate', payload)
  return response.data
}

export async function validateWeaponTargets(payload) {
  const response = await api.post('/rules/weapon-targets', payload)
  return response.data
}

export async function buildAttackResolutionPlan(payload) {
  const response = await api.post('/rules/attack-resolution', payload)
  return response.data
}

export async function checkVisibility(payload) {
  const response = await api.post('/rules/visibility', payload)
  return response.data
}

export async function resolveMortalWounds(payload) {
  const response = await api.post('/rules/mortal-wounds', payload)
  return response.data
}

export async function makeHazardRolls(payload) {
  const response = await api.post('/rules/hazard-rolls', payload)
  return response.data
}
