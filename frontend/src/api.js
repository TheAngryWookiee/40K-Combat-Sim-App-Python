import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
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
  const response = await api.get(
    `/factions/${encodeURIComponent(factionName)}/units/${encodeURIComponent(unitName)}`,
  )
  return response.data
}

export async function simulateCombat(payload) {
  const response = await api.post('/simulate', payload)
  return response.data
}
