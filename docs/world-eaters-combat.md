# World Eaters combat support

Select a detachment and eligible enhancement, then use **Activated Abilities**
for conditional effects. Battlefield combat has separate attacker and defender
ability controls. Relentless Rage applies automatically when **Charged this
turn** is enabled; eligible enhancement stat bonuses apply on selection.

| Detachment | Combat effects connected |
| --- | --- |
| Berzerker Warband | Relentless Rage, Berzerker Glaive, Helm of Brazen Ire, Hack and Slash, Frenzied Resilience |
| Cult of Blood | Infinite Rage and Blessed Blood auras, Brazen Form, Bloody Vengeance, Shadow of Brass Idols, Fail Not the Blood God |
| Khorne Daemonkin | Enraged Abjuration, Daemonic Rage, Boon of Blood, Blood-forged Armour's Save, Blade of Endless Bloodshed's melee bonuses, Daemonic Fury, Blessing of Burning Blood |
| Possessed Slaughterband | Frenzied Focus, Daemonic Resistance, Daemonic Strength |
| Goretrack Onslaught | Rush to the Fray's LANCE after disembarking |
| Brazen Engines | Talons of Butchery, Apoplectic Clarity, Murder-forged Entity's DAEMON eligibility for that Stratagem |
| Butchers of Khorne | Gore-stained Veterans, Focused Ferocity, A Trophy for the Throne, Wrath Beyond Reason |
| Vessels of Wrath | Wrath of Khorne's exclusive Cleave/AP choices, Archslaughterer's combat Blessings, Scorn the Witch, Aspire to Infamy |

Aura range, the enemy marked by Bloody Vengeance, and prior activation of Blood
Tithe abilities are explicit user selections. Enhanced Stratagem variants state
their prerequisites and replace the corresponding basic selection. LANCE still
requires a charge. Directly targeted Stratagems are disabled for Battle-shocked
units. Character-only attacks and bearer-only defences do not transfer to
bodyguard models.

Blood Tithe generation/spending, CP spending through these combat selections,
once-per-battle tracking, movement/charge bonuses, deployment, objective control,
resurrection, fight-on-death and fight-order effects are not automated by this
integration. Entries with additional unsupported effects retain
`implemented: false`; their supported portions have an `implementation_note` or
separate implemented options. The original supplied rule text is preserved.

`World_Eaters.json` includes all thirty supplied unit datasheets. The combat
regression tests use synthetic units to isolate effects and attached-model allocation.

Validation:

```powershell
python -m unittest discover -s tests -v
node --test frontend/src/lib/worldEaters.test.js
npm --prefix frontend run build
```
