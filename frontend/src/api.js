import axios from 'axios'

const defaultBaseUrl = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api'

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
