import { BLOOD_TITHE_COSTS, IDOLS_OF_KHORNE } from './worldEatersBattle'

export default function WorldEatersArmyPanel({ side, detachment, state, turn, phase, ownTurn, onActivate }) {
  const daemonkin = detachment === 'KHORNE DAEMONKIN'
  const cult = detachment === 'CULT OF BLOOD'
  if (!daemonkin && !cult) return null
  const options = daemonkin ? Object.keys(BLOOD_TITHE_COSTS) : IDOLS_OF_KHORNE
  return <div className="battlefield-stratagem-panel">
    <p><strong>{side === 'attacker' ? 'Attacker' : 'Defender'} — {detachment}</strong></p>
    {daemonkin ? <p>Blood Tithe: {state.bloodTithe} BTP. Active: {state.titheAbilities.join(', ') || 'None'}.</p>
      : <p>Active Idol: {state.idol && turn < state.idolTurn + 2 ? state.idol : 'None'}.</p>}
    <p>Choose at the start of {cult ? 'your ' : 'the '}Command phase.</p>
    {options.map((name) => <button key={name} type="button" className="secondary-button"
      disabled={phase !== 'command' || (daemonkin
        ? state.titheAbilities.includes(name) || state.titheCommand === turn || state.bloodTithe < BLOOD_TITHE_COSTS[name]
        : !ownTurn || state.usedIdols.includes(name) || state.idolTurn === turn)}
      onClick={() => onActivate(side, name)}>
      {name}{daemonkin ? ` (${BLOOD_TITHE_COSTS[name]} BTP)` : state.usedIdols.includes(name) ? ' (used)' : ''}
    </button>)}
  </div>
}
