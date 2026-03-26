import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  fetchFactions,
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
  const [attackerUnitDetails, setAttackerUnitDetails] = useState(null)
  const [defenderUnitDetails, setDefenderUnitDetails] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')

  const [attackerFaction, setAttackerFaction] = useState('')
  const [attackerUnit, setAttackerUnit] = useState('')
  const [weaponName, setWeaponName] = useState('')
  const [defenderFaction, setDefenderFaction] = useState('')
  const [defenderUnit, setDefenderUnit] = useState('')
  const [attachedCharacterName, setAttachedCharacterName] = useState('')

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
  const hasOathOfMoment = unitHasOathOfMoment(attackerUnitDetails)

  const readyToSimulate = attackerFaction && attackerUnit && weaponName && defenderFaction && defenderUnit

  useEffect(() => {
    if (!canUseCover && targetHasCover) {
      setTargetHasCover(false)
    }
  }, [canUseCover, targetHasCover])

  useEffect(() => {
    if (!hasOathOfMoment && oathOfMomentActive) {
      setOathOfMomentActive(false)
    }
  }, [hasOathOfMoment, oathOfMomentActive])

  async function handleSimulate(event) {
    event.preventDefault()
    if (!readyToSimulate) {
      return
    }

    try {
      setSimulating(true)
      setError('')
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
      })
      const data = await simulateCombat(payload)
      setResult(data)
    } catch (requestError) {
      setError(formatError(requestError))
      setResult(null)
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
  }

  return (
    <div className="app-shell">
      <header className="hero-band">
        <p className="eyebrow">Warhammer 40,000 Combat Simulator</p>
        <div className="hero-copy">
          <h1>Resolve attacks without digging through five rules sections.</h1>
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
              {canUseCover ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={targetHasCover}
                    onChange={(event) => setTargetHasCover(event.target.checked)}
                  />
                  <span>Defender has cover</span>
                </label>
              ) : null}

              {hasOathOfMoment ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={oathOfMomentActive}
                    onChange={(event) => setOathOfMomentActive(event.target.checked)}
                  />
                  <span>Defender is the Oath of Moment target</span>
                </label>
              ) : null}

              {isRangedWeapon ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={inHalfRange}
                    onChange={(event) => setInHalfRange(event.target.checked)}
                  />
                  <span>Target is in Half Range</span>
                </label>
              ) : null}

              {isRangedWeapon ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={attackerInEngagementRange}
                    onChange={(event) => setAttackerInEngagementRange(event.target.checked)}
                  />
                  <span>Attacker is in Engagement Range</span>
                </label>
              ) : null}

              {hasHeavy ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={remainedStationary}
                    onChange={(event) => setRemainedStationary(event.target.checked)}
                  />
                  <span>Attacker remained Stationary</span>
                </label>
              ) : null}

              {hasBlast ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={targetInEngagementRangeOfAllies}
                    onChange={(event) => setTargetInEngagementRangeOfAllies(event.target.checked)}
                  />
                  <span>Defender is in Engagement Range of allied units</span>
                </label>
              ) : null}

              {hasIndirectFire ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={indirectTargetVisible}
                    onChange={(event) => setIndirectTargetVisible(event.target.checked)}
                  />
                  <span>Any defender models are visible</span>
                </label>
              ) : null}

              {canUseLance && isMeleeWeapon ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={chargedThisTurn}
                    onChange={(event) => setChargedThisTurn(event.target.checked)}
                  />
                  <span>Attacker charged this turn</span>
                </label>
              ) : null}

              {canUsePrecision ? (
                <label>
                  <span>Attached Character</span>
                  <select
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
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={hazardousOverwatchChargePhase}
                    onChange={(event) => setHazardousOverwatchChargePhase(event.target.checked)}
                  />
                  <span>Used Fire Overwatch in opponent charge phase</span>
                </label>
              ) : null}

              {hasHazardous ? (
                <label>
                  <span>Hazardous Bearer Current Wounds</span>
                  <input
                    type="number"
                    min="0"
                    value={hazardousBearerCurrentWounds}
                    onChange={(event) => setHazardousBearerCurrentWounds(event.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <button type="submit" className="primary-button" disabled={!readyToSimulate || simulating}>
              {simulating ? 'Resolving Combat...' : 'Simulate Attack'}
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
            </article>

            <article className="datasheet-card">
              <p className="kicker">Defender</p>
              <h3>{defenderUnitDetails?.name || 'No unit selected'}</h3>
              <p>{defenderFaction || 'Faction not set'}</p>
              <div className="datasheet-stats">
                {renderStatsGrid(defenderUnitDetails?.stats)}
              </div>
            </article>
          </div>

          {result ? (
            <div className="outcome-grid">
              <article className="result-card accent">
                <p className="kicker">Outcome</p>
                <h3>{result.result.target.name}</h3>
                <p>
                  {result.result.target.destroyed
                    ? 'Destroyed'
                    : `${result.result.target.models_remaining} models remain`}
                </p>
                <p>Current model wounds: {result.result.target.current_model_wounds}</p>
              </article>

              {result.result.attached_character ? (
                <article className="result-card">
                  <p className="kicker">Attached Character</p>
                  <h3>{result.result.attached_character.name}</h3>
                  <p>
                    {result.result.attached_character.destroyed
                      ? 'Destroyed'
                      : `${result.result.attached_character.models_remaining} model remains`}
                  </p>
                  <p>Current wounds: {result.result.attached_character.current_model_wounds}</p>
                </article>
              ) : null}

              {result.result.hazardous_bearer ? (
                <article className="result-card warning">
                  <p className="kicker">Hazardous Bearer</p>
                  <h3>{result.result.hazardous_bearer.name}</h3>
                  <p>
                    {result.result.hazardous_bearer.destroyed
                      ? 'Destroyed'
                      : `${result.result.hazardous_bearer.models_remaining} model remains`}
                  </p>
                  <p>Current wounds: {result.result.hazardous_bearer.current_model_wounds}</p>
                </article>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <p>Run a simulation to see combat results and the full rules trace.</p>
            </div>
          )}
        </section>
      </main>

      <section className="panel log-panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">Resolution</p>
            <h2>Combat Log</h2>
          </div>
        </div>

        {result?.result?.log?.length ? (
          <ol className="combat-log">
            {result.result.log.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : (
          <div className="empty-state compact">
            <p>The combat log will appear here after a simulation.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
