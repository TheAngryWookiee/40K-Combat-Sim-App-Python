# Combat Rule Coverage Audit

This is a conservative static audit. A rule is `wired` when it has structured effects or its exact name is referenced by the loader, engine, or combat UI. Generic parsers can make some unresolved rows false positives; each row still requires a behavioral test before being marked complete.

## Summary

- Combat-relevant rules scanned: 1665
- Wired: 1214
- Declared implemented without execution evidence: 135
- Missing or unset without execution evidence: 316

## Unresolved By Faction

| Faction | Candidates |
| --- | ---: |
| Adepta Sororitas | 45 |
| World Eaters | 43 |
| Adeptus Astartes | 42 |
| Astra Militarum | 41 |
| Aeldari | 37 |
| Orks | 23 |
| Adeptus Mechanicus | 20 |
| Blood Angels | 20 |
| Chaos Space Marines | 20 |
| Dark Angels | 17 |
| Death Guard | 16 |
| T'au Empire | 15 |
| Grey Knights | 13 |
| Tyranids | 12 |
| Chaos Daemons | 9 |
| Leagues of Votann | 9 |
| Space Wolves | 9 |
| Adeptus Custodes | 8 |
| Necrons | 8 |
| Thousand Sons | 8 |
| Black Templars | 6 |
| Deathwatch | 5 |
| Drukhari | 4 |
| Emperor's Children | 4 |
| Salamanders | 4 |
| Chaos Knights | 3 |
| Genestealer Cults | 2 |
| Imperial Fists | 2 |
| Imperial Knights | 2 |
| Ultramarines | 2 |
| Iron Hands | 1 |
| White Scars | 1 |

## Unresolved Rules

| Faction | Source | Rule | Classification | Status | Flag |
| --- | --- | --- | --- | --- | --- |
| Adepta Sororitas | Army Rule | Acts of Faith | automatic | declared_only | True |
| Adepta Sororitas | Hallowed Martyrs / Enhancement | Through Suffering, Strength | automatic | missing | False |
| Adepta Sororitas | Hallowed Martyrs / Enhancement | Mantle of Ophelia | automatic | missing | False |
| Adepta Sororitas | Hallowed Martyrs / Stratagem | Righteous Vengeance | activated | missing | False |
| Adepta Sororitas | Penitent Host / Enhancement | Refrain of Enduring Faith | automatic | missing | False |
| Adepta Sororitas | Army of Faith / Enhancement | Triptych of the Macharian Crusade | automatic | missing | False |
| Adepta Sororitas | Army of Faith / Stratagem | Shield of Faith | activated | missing | False |
| Adepta Sororitas | Army of Faith / Stratagem | Light of the Emperor | activated | missing | False |
| Adepta Sororitas | Champions of Faith / Enhancement | Triptych of Judgement | automatic | missing | False |
| Adepta Sororitas | Champions of Faith / Enhancement | Eyes of the Oracle | automatic | missing | False |
| Adepta Sororitas | Champions of Faith / Stratagem | Shield of Denial | activated | missing | False |
| Adepta Sororitas | Champions of Faith / Stratagem | Bastion of Faith | activated | missing | False |
| Adepta Sororitas | Sacred Champions / Stratagem | Unflinching Determination | activated | missing | False |
| Adepta Sororitas | Aestred Thurga and Agathae Dolan / Ability | Auto-Tapestry of the Emperor’s Judgement | automatic | missing | None |
| Adepta Sororitas | Canoness / Ability | The Emperor's Grace | activated | missing | None |
| Adepta Sororitas | Canoness / Wargear Ability | Null Rod | automatic | missing | None |
| Adepta Sororitas | Canoness / Wargear Ability | Rod of Office | automatic | missing | None |
| Adepta Sororitas | Canoness with Jump Pack / Ability | Divine Deliverance | activated | missing | None |
| Adepta Sororitas | Intransia Fraye / Ability | Judged for Execution | activated | missing | None |
| Adepta Sororitas | Junith Eruita / Ability | The Pulpit of Saint Holline's Basilica | automatic | missing | None |
| Adepta Sororitas | Morvenn Vahl / Ability | Abbess Sanctorum | automatic | missing | None |
| Adepta Sororitas | Morvenn Vahl / Ability | Righteous Repugnance | automatic | missing | None |
| Adepta Sororitas | Saint Celestine / Ability | Lifewards | automatic | missing | None |
| Adepta Sororitas | Triumph of Saint Katherine / Ability | Damaged (1-6 Wounds Remaining) | automatic | missing | None |
| Adepta Sororitas | Triumph of Saint Katherine / Selectable Ability | Simulacrum of the Argent Shroud (Aura) | activated | missing | None |
| Adepta Sororitas | Triumph of Saint Katherine / Selectable Ability | Icon of the Valorous Heart (Aura) | activated | missing | None |
| Adepta Sororitas | Triumph of Saint Katherine / Selectable Ability | Petals of the Bloody Rose (Aura) | activated | missing | None |
| Adepta Sororitas | Arco-flagellants / Ability | Extremis Trigger Word | activated | missing | None |
| Adepta Sororitas | Celestian Insidiants / Ability | Rituale Nullificatus | automatic | missing | None |
| Adepta Sororitas | Celestian Insidiants / Ability | Virtue of Intolerance | automatic | missing | None |
| Adepta Sororitas | Celestian Sacresants / Ability | Sworn Protectors | automatic | missing | None |
| Adepta Sororitas | Hospitaller / Ability | Medicus Ministorum | automatic | missing | None |
| Adepta Sororitas | Imagifier / Ability | Standards of Holy Martyrs | automatic | missing | None |
| Adepta Sororitas | Ministorum Priest / Ability | Righteous Smiting | automatic | missing | None |
| Adepta Sororitas | Ministorum Priest / Ability | Zealot | activated | missing | None |
| Adepta Sororitas | Palatine / Ability | Fury of the Righteous | automatic | missing | None |
| Adepta Sororitas | Palatine / Ability | Rapturous Blows | automatic | missing | None |
| Adepta Sororitas | Castigator / Ability | Rites of Castigation | activated | missing | None |
| Adepta Sororitas | Mortifiers / Wargear Ability | Anchorite Sarcophagus | automatic | missing | None |
| Adepta Sororitas | Paragon Warsuits / Ability | Righteous Paragons | automatic | missing | None |
| Adepta Sororitas | Repentia Squad / Ability | Overseer of Redemption | automatic | missing | None |
| Adepta Sororitas | Retributor Squad / Ability | Storm of Retribution | automatic | missing | None |
| Adepta Sororitas | Sanctifiers / Ability | Ministorum Sermon | automatic | missing | None |
| Adepta Sororitas | Sisters Novitiate Squad / Ability | Impetuous Fervour | automatic | missing | None |
| Adepta Sororitas | Zephyrim Squad / Ability | Embedded Prophecy | activated | missing | None |
| Adeptus Astartes | Phobos Shadow Force / Enhancement | Venator Omni-auspex | automatic | missing | False |
| Adeptus Astartes | Gravis Siege Force / Detachment Rule | Indomitable Defence | automatic | missing | False |
| Adeptus Astartes | Gravis Siege Force / Stratagem | Annihilating Force | activated | missing | False |
| Adeptus Astartes | Stormlance Task Force / Stratagem | Hurtling Targets | activated | missing | False |
| Adeptus Astartes | Ironstorm Spearhead / Detachment Rule | Ironstorm Auto-targeters | automatic | missing | False |
| Adeptus Astartes | Ironstorm Spearhead / Enhancement | Redoubtable Machine Spirit | automatic | missing | False |
| Adeptus Astartes | Ironstorm Spearhead / Stratagem | Layered Ceramite | activated | missing | False |
| Adeptus Astartes | Ironstorm Spearhead / Stratagem | Might of the Machine Spirit | activated | missing | False |
| Adeptus Astartes | Ironstorm Spearhead / Stratagem | Headhunter Doctrine | activated | missing | False |
| Adeptus Astartes | Intercessor Squad / Ability | Bolter Discipline | automatic | missing | None |
| Adeptus Astartes | Vanguard Veteran Squad with Jump Packs / Ability | Combat Shield | automatic | missing | None |
| Adeptus Astartes | Captain / Ability | Finest Hour (Once per battle, per unit) | activated | missing | None |
| Adeptus Astartes | Chaplain in Terminator Armour / Ability | Recitation of Faith | automatic | missing | None |
| Adeptus Astartes | Techmarine / Ability | Blessings of the Omnissiah | automatic | missing | None |
| Adeptus Astartes | Ancient in Terminator Armour / Ability | Never Shall the Standard Fall | automatic | missing | None |
| Adeptus Astartes | Apothecary Biologis / Ability | Vivispectral Analysis | automatic | missing | None |
| Adeptus Astartes | Bladeguard Ancient / Ability | Deeds of Legend | automatic | missing | None |
| Adeptus Astartes | Incursor Squad / Ability | Divinator-class Auspexes | activated | missing | None |
| Adeptus Astartes | Infernus Squad / Ability | Driven from Cover | automatic | missing | None |
| Adeptus Astartes | Sternguard Veteran Squad / Ability | Veteran Marksmen | automatic | missing | None |
| Adeptus Astartes | Ballistus Dreadnought / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Brutalis Dreadnought / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Inceptor Squad / Ability | Meteoric Descent | automatic | missing | None |
| Adeptus Astartes | Invictor Tactical Warsuit / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Outrider Squad / Ability | Full-throttle Assault | automatic | missing | None |
| Adeptus Astartes | Redemptor Dreadnought / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Storm Speeder Hailstrike / Ability | Hailstrike | automatic | missing | None |
| Adeptus Astartes | Storm Speeder Hammerstrike / Ability | Hammerstrike | automatic | missing | None |
| Adeptus Astartes | Storm Speeder Thunderstrike / Ability | Shattered Defences | automatic | missing | None |
| Adeptus Astartes | Terminator Assault Squad / Ability | Terminator Assault | automatic | missing | None |
| Adeptus Astartes | Eliminator Squad / Ability | Special-issue Optics and Ammunition | automatic | missing | None |
| Adeptus Astartes | Firestrike Servo-turrets / Ability | Sentinel Protocols | activated | missing | None |
| Adeptus Astartes | Gladiator Lancer / Ability | Aquilon Optics | automatic | missing | None |
| Adeptus Astartes | Gladiator Lancer / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Gladiator Reaper / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Gladiator Valiant / Ability | Damaged: 1-4 Wounds Remaining | automatic | missing | None |
| Adeptus Astartes | Land Raider / Ability | Power of the Machine Spirit | automatic | missing | None |
| Adeptus Astartes | Land Raider Crusader / Ability | Fury of the Machine Spirit | automatic | missing | None |
| Adeptus Astartes | Land Raider Redeemer / Ability | Wrath of the Machine Spirit | automatic | missing | None |
| Adeptus Astartes | Astraeus / Ability | Suppression Fire | automatic | missing | None |
| Adeptus Astartes | Invader ATVs / Ability | Aggressive Reconnaissance | automatic | missing | None |
| Adeptus Astartes | Captain on Bike / Ability | Into the Fray | automatic | missing | None |
| Adeptus Custodes | Auric Champions / Detachment Rule | Assemblage of Might | automatic | declared_only | True |
| Adeptus Custodes | Lions of the Emperor / Stratagem | Vigil Unending | activated | declared_only | True |
| Adeptus Custodes | Might of the Moritoi / Detachment Rule | Moritoi Ancients | automatic | declared_only | True |
| Adeptus Custodes | Might of the Moritoi / Stratagem | Unceasing Onslaught | activated | missing | False |
| Adeptus Custodes | Null Maiden Vigil / Stratagem | Anathema Blademastery | activated | declared_only | True |
| Adeptus Custodes | Null Maiden Vigil / Stratagem | Psy-chaff Volley | activated | declared_only | True |
| Adeptus Custodes | Null Maiden Vigil / Stratagem | Purgation Sweep | activated | declared_only | True |
| Adeptus Custodes | Trajann Valoris / Ability | Moment Shackle (Once per battle, per army) | activated | missing | False |
| Adeptus Mechanicus | Data-psalm Conclave / Stratagem | Incantation of the Iron Soul | activated | declared_only | True |
| Adeptus Mechanicus | Explorator Maniple / Enhancement | Artisan | activated | declared_only | True |
| Adeptus Mechanicus | Cohort Cybernetica / Stratagem | Machine Superiority | activated | declared_only | True |
| Adeptus Mechanicus | Eradication Cohort / Detachment Rule | Murderous Imperative | automatic | declared_only | True |
| Adeptus Mechanicus | Haloscreed Battle Clade / Enhancement | Sanctified Ordnance | automatic | declared_only | True |
| Adeptus Mechanicus | Lords of the Forge / Detachment Rule | War-form Mantles | activated | declared_only | True |
| Adeptus Mechanicus | Lords of the Forge / Enhancement | TL-449 | automatic | declared_only | True |
| Adeptus Mechanicus | Luminen Auto-choir / Detachment Rule | Cyber-static Canticles | automatic | declared_only | True |
| Adeptus Mechanicus | Belisarius Cawl / Ability | Invocation of Machine Vengeance | automatic | declared_only | True |
| Adeptus Mechanicus | Cybernetica Datasmith / Ability | Protector Protocol | automatic | declared_only | True |
| Adeptus Mechanicus | Cybernetica Datasmith / Ability | Conqueror Protocol | automatic | declared_only | True |
| Adeptus Mechanicus | Skitarii Marshal / Ability | Control Edict | automatic | declared_only | True |
| Adeptus Mechanicus | Sydonian Skatros / Ability | Achillan Eye | automatic | declared_only | True |
| Adeptus Mechanicus | Tech-Priest Dominus / Ability | Lord of the Machine Cult | automatic | declared_only | True |
| Adeptus Mechanicus | Tech-Priest Enginseer / Ability | Vengeance for the Omnissiah! | automatic | declared_only | True |
| Adeptus Mechanicus | Kataphron Destroyers / Ability | Sentinel Directives | automatic | declared_only | True |
| Adeptus Mechanicus | Pteraxii Sterylizors / Ability | Searing Conflagration | automatic | declared_only | True |
| Adeptus Mechanicus | Kastelan Robots / Ability | Robotic Bodyguard | automatic | declared_only | True |
| Adeptus Mechanicus | Onager Dunecrawler / Ability | Emanatus Force Field (Aura) | automatic | declared_only | True |
| Adeptus Mechanicus | Sydonian Dragoons with Radium Jezzails / Ability | Focused Hunters | automatic | declared_only | True |
| Aeldari | Spirit Conclave / Enhancement | Stave of Kurnous | automatic | missing | False |
| Aeldari | Spirit Conclave / Stratagem | Seer's Eye | activated | missing | False |
| Aeldari | Guardian Battlehost / Enhancement | Protector of the Paths | activated | missing | False |
| Aeldari | Guardian Battlehost / Enhancement | Breath of Vaul | automatic | missing | False |
| Aeldari | Ghosts of the Webway / Enhancement | Murder's Jest | automatic | missing | False |
| Aeldari | Seer Council / Enhancement | Runes of Warding | automatic | missing | False |
| Aeldari | Aspect Host / Detachment Rule | Path of the Warrior | activated | missing | False |
| Aeldari | Aspect Host / Stratagem | Warrior Focus | activated | missing | False |
| Aeldari | Aspect Host / Stratagem | Doom Inescapable | activated | missing | False |
| Aeldari | Aspect Host / Stratagem | Preternatural Precision | activated | missing | False |
| Aeldari | Baharroth / Ability | Cry of the Wind | automatic | missing | False |
| Aeldari | The Visarch / Ability | Yvraine's Champion | automatic | missing | False |
| Aeldari | Death Jester / Ability | Cruel Amusement | automatic | missing | False |
| Aeldari | Farseer / Ability | Branching Fates (Psychic) | activated | missing | False |
| Aeldari | Farseer Skyrunner / Ability | Branching Fates (Psychic) | activated | missing | False |
| Aeldari | Farseer Skyrunner / Ability | Misfortune (Psychic) | activated | missing | False |
| Aeldari | Ynnari Archon / Ability | Shadow Field | automatic | missing | False |
| Aeldari | Corsair Voidreavers / Ability | Mistshield | automatic | missing | False |
| Aeldari | Corsair Voidscarred / Ability | Channeller Stones | activated | missing | False |
| Aeldari | Corsair Voidscarred / Ability | Mistshield | automatic | missing | False |
| Aeldari | D-Cannon Platform / Ability | Structural Collapse | automatic | missing | False |
| Aeldari | Dark Reapers / Ability | Inescapable Accuracy | automatic | missing | False |
| Aeldari | Dark Reapers / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Dire Avengers / Ability | Shimmershield | automatic | missing | False |
| Aeldari | Dire Avengers / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Fire Dragons / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Howling Banshees / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Striking Scorpions / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Swooping Hawks / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Troupe / Ability | Dance of Death | activated | missing | False |
| Aeldari | Vibro Cannon Platform / Ability | Sonic Destruction | automatic | missing | False |
| Aeldari | Warp Spiders / Ability | Aspect Shrine Token | activated | missing | False |
| Aeldari | Wraithblades / Ability | Forceshield | automatic | missing | False |
| Aeldari | Shining Spears / Ability | Shimmershield | automatic | missing | False |
| Aeldari | Wraithknight / Ability | Scattershield | automatic | missing | False |
| Aeldari | Wraithknight with Ghostglaive / Ability | Scattershield | automatic | missing | False |
| Aeldari | Fire Prism / Ability | Linked Fire | automatic | missing | False |
| Astra Militarum | Combined Arms / Detachment Rule | Born Soldiers | automatic | declared_only | True |
| Astra Militarum | Grizzled Company / Detachment Rule | Ruthless Discipline | automatic | declared_only | True |
| Astra Militarum | Steel Hammer / Detachment Rule | Ceaseless Cannonade | automatic | declared_only | True |
| Astra Militarum | Lord Marshal Dreir / Ability | Feel No Pain 6+ | automatic | missing | None |
| Astra Militarum | Nork Deddog / Ability | Feel No Pain 5+ | automatic | missing | None |
| Astra Militarum | Nork Deddog / Ability | Ogryn Bodyguard | automatic | missing | False |
| Astra Militarum | Krieg Command Squad / Wargear Ability | Alchemy Counteragents | automatic | missing | False |
| Astra Militarum | Leman Russ Commander / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Ogryn Bodyguard / Ability | Feel No Pain 6+ | automatic | missing | None |
| Astra Militarum | Ogryn Bodyguard / Ability | Ogryn Bodyguard | automatic | missing | False |
| Astra Militarum | Primaris Psyker / Ability | Malign Wardings (Psychic) | automatic | missing | False |
| Astra Militarum | Rogal Dorn Commander / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Avenger Strike Fighter / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Basilisk / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Deathstrike / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Manticore / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Wyvern / Ability | Damaged | automatic | missing | None |
| Astra Militarum | Bullgryn Squad / Ability | Feel No Pain 6+ | automatic | missing | None |
| Astra Militarum | Cadian Heavy Weapons Squad / Ability | Covering Fire | automatic | missing | False |
| Astra Militarum | Catachan Heavy Weapons Squad / Ability | Bring it Down! | automatic | missing | False |
| Astra Militarum | Ogryn Squad / Ability | Feel No Pain 6+ | automatic | missing | None |
| Astra Militarum | Tempestus Aquilons / Ability | Precision Drop | automatic | missing | False |
| Astra Militarum | Baneblade / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Banehammer / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Banesword / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Doomhammer / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Hellhammer / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Shadowsword / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Stormlord / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Stormsword / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Valkyrie / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Hellhound / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Hydra / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Battle Tank / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Demolisher / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Eradicator / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Executioner / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Exterminator / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Punisher / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Leman Russ Vanquisher / Ability | Special Rule | automatic | missing | None |
| Astra Militarum | Rogal Dorn Battle Tank / Ability | Special Rule | automatic | missing | None |
| Black Templars | Marshal's Household / Detachment Rule | Faith-fuelled Resolve | automatic | declared_only | True |
| Black Templars | Castellan / Ability | Vehement Aggression | activated | missing | False |
| Black Templars | Chaplain Grimaldus / Ability | Water from the Stoup of Exudation | automatic | missing | False |
| Black Templars | Emperor's Champion / Ability | Armour of Faith | automatic | missing | False |
| Black Templars | Gladiator Lancer / Ability | Aquilon Optics | automatic | missing | False |
| Black Templars | Marshal / Ability | Pious Fervour | activated | missing | False |
| Blood Angels | Angelic Inheritors / Detachment Rule | Legacy of the Angel | automatic | declared_only | True |
| Blood Angels | Angelic Inheritors / Stratagem | Focused Fury | activated | missing | False |
| Blood Angels | Angelic Inheritors / Stratagem | Strike Now for Glory | activated | missing | False |
| Blood Angels | Encarmine Speartip / Enhancement | Shadow of Abomination | activated | missing | False |
| Blood Angels | Encarmine Speartip / Enhancement | Angelic Executioner | automatic | missing | False |
| Blood Angels | Wrath of the Doomed / Enhancement | On the Archtraitor's Bridge | automatic | missing | False |
| Blood Angels | Wrath of the Doomed / Stratagem | Death Begets Vengeance | activated | missing | False |
| Blood Angels | Astorath / Ability | Mass of Doom | automatic | missing | False |
| Blood Angels | Blood Angels Captain / Ability | Finest Hour (Once per battle, per unit) | activated | missing | False |
| Blood Angels | Death Company Captain / Ability | Black Rage | automatic | missing | False |
| Blood Angels | Death Company Captain with Jump Pack / Ability | Black Rage | automatic | missing | False |
| Blood Angels | Death Company Captain with Jump Pack / Ability | Lost to Fury | automatic | missing | False |
| Blood Angels | Death Company Dreadnought / Ability | Black Rage | automatic | missing | False |
| Blood Angels | Death Company Marines / Ability | An Honourable Death in Combat | automatic | missing | False |
| Blood Angels | Death Company Marines / Ability | Black Rage | automatic | missing | False |
| Blood Angels | Death Company Marines with Jump Packs / Ability | Black Rage | automatic | missing | False |
| Blood Angels | Lemartes / Ability | Fury Unbound | automatic | missing | False |
| Blood Angels | Lemartes / Ability | Guardian of the Lost | automatic | missing | False |
| Blood Angels | Sanguinary Guard / Ability | Heirs of Azkaellon | automatic | missing | False |
| Blood Angels | Sanguinary Guard / Ability | Angelic Visage | automatic | missing | False |
| Chaos Daemons | Army Rule | Daemonic Manifestation | automatic | declared_only | True |
| Chaos Daemons | Scintillating Legion / Detachment Rule | Fates in Flux | automatic | missing | False |
| Chaos Daemons | Warptide / Detachment Rule | Shudderlink | automatic | declared_only | True |
| Chaos Daemons | Contorted Epitome / Ability | Swallow Energy (Psychic) | automatic | declared_only | True |
| Chaos Daemons | Infernal Enrapturess / Ability | Discordant Disruption (Aura) | automatic | missing | False |
| Chaos Daemons | Spoilpox Scrivener / Ability | Keep Counting! | automatic | declared_only | True |
| Chaos Daemons | Daemon Prince of Chaos with Wings / Ability | Harbinger of Death | activated | declared_only | True |
| Chaos Daemons | Fluxmaster / Ability | Altered Reality (Psychic) | activated | missing | False |
| Chaos Daemons | Lord of Change / Ability | Master of Magicks (Psychic) | activated | declared_only | True |
| Chaos Knights | Infernal Lance / Detachment Rule | Malefic Surge | activated | declared_only | True |
| Chaos Knights | Hunting Warpack / Enhancement | Soul-spoor Auspicator | automatic | missing | False |
| Chaos Knights | Knight Despoiler / Ability | Seething Hatred | automatic | declared_only | True |
| Chaos Space Marines | Army Rule | Dark Pacts | activated | declared_only | True |
| Chaos Space Marines | Veterans of the Long War / Enhancement | Mark of Legend | activated | declared_only | True |
| Chaos Space Marines | Fellhammer Siege-Host / Detachment Rule | Iron Fortitude | automatic | declared_only | True |
| Chaos Space Marines | Pactbound Zealots / Detachment Rule | Marks of Chaos | automatic | declared_only | True |
| Chaos Space Marines | Chaos Cult / Stratagem | Chosen for Glory | activated | declared_only | True |
| Chaos Space Marines | Chaos Cult / Stratagem | Selfless Demise | activated | missing | False |
| Chaos Space Marines | Chaos Cult / Stratagem | Infernal Sacrifice | activated | declared_only | True |
| Chaos Space Marines | Chaos Cult / Stratagem | Crazed Focus | activated | declared_only | True |
| Chaos Space Marines | Chaos Cult / Stratagem | Mortal Thralls | activated | missing | False |
| Chaos Space Marines | Soulforged Warpack / Detachment Rule | Debt to the Soul Forge | automatic | declared_only | True |
| Chaos Space Marines | Soulforged Warpack / Stratagem | Glut of Souls | activated | missing | False |
| Chaos Space Marines | Creations of Bile / Detachment Rule | Experimental Augmentations | automatic | declared_only | True |
| Chaos Space Marines | Nightmare Hunt / Detachment Rule | Terror Made Manifest | automatic | declared_only | True |
| Chaos Space Marines | Huron's Marauders / Detachment Rule | Tyrannical Motivation | activated | declared_only | True |
| Chaos Space Marines | Huron's Marauders / Stratagem | Hardened Killers | activated | declared_only | True |
| Chaos Space Marines | Renegade Warband / Stratagem | Never Outgunned | activated | declared_only | True |
| Chaos Space Marines | Cult of the Arkifane / Detachment Rule | Soulforge Boons | automatic | declared_only | True |
| Chaos Space Marines | Cabal of Chaos / Detachment Rule | Empyric Wellspring | automatic | declared_only | True |
| Chaos Space Marines | Devotees of Destruction / Detachment Rule | Rain of Ruin | automatic | declared_only | True |
| Chaos Space Marines | Devotees of Destruction / Stratagem | Undying Hatred | activated | declared_only | True |
| Dark Angels | Darkflight Pursuit / Detachment Rule | Black-winged Vigilance | automatic | declared_only | True |
| Dark Angels | Inner Circle Task Force / Detachment Rule | Vowed Target | automatic | missing | False |
| Dark Angels | Inner Circle Task Force / Enhancement | Champion of the Deathwing | automatic | missing | False |
| Dark Angels | Wrath of the Rock / Stratagem | Inescapable Justice | activated | missing | False |
| Dark Angels | Asmodai / Ability | Exemplar of Hate | automatic | missing | False |
| Dark Angels | Azrael / Ability | Supreme Grand Master | automatic | missing | False |
| Dark Angels | Azrael / Ability | The Lion Helm | automatic | missing | False |
| Dark Angels | Belial / Ability | Grand Master of the Deathwing | automatic | missing | False |
| Dark Angels | Deathwing Knights / Ability | Inner Circle | automatic | missing | False |
| Dark Angels | Ezekiel / Ability | Book of Salvation | automatic | missing | False |
| Dark Angels | Inner Circle Companions / Ability | Enmity for the Unworthy | automatic | missing | False |
| Dark Angels | Lazarus / Ability | The Spiritshield Helm | automatic | missing | False |
| Dark Angels | Lion El'Jonson / Ability | The Watchers | automatic | missing | False |
| Dark Angels | Lion El'Jonson / Ability | Martial Exemplar | automatic | missing | False |
| Dark Angels | Lion El'Jonson / Ability | No Hiding from the Watchers | automatic | missing | False |
| Dark Angels | Nephilim Jetfighter / Ability | Lightning-fast Manoeuvres | automatic | missing | False |
| Dark Angels | Ravenwing Black Knights / Ability | Knights of Caliban | automatic | missing | False |
| Death Guard | Tallyband Summoners / Enhancement | Tome of Bounteous Blessings | automatic | missing | False |
| Death Guard | Shamblerot Vectorium / Stratagem | Shambling Wall | activated | missing | False |
| Death Guard | Biologus Putrifier / Ability | Foul Infusion | automatic | missing | False |
| Death Guard | Lord of Contagion / Ability | Vector of Disease | automatic | missing | False |
| Death Guard | Lord of Virulence / Ability | Virulent Aura | automatic | missing | False |
| Death Guard | Lord of Virulence / Ability | Blight Bombardment | automatic | missing | False |
| Death Guard | Malignant Plaguecaster / Ability | Gift of Contagion (Psychic) | automatic | missing | False |
| Death Guard | Plague Surgeon / Ability | Inflamed Infections | automatic | missing | False |
| Death Guard | Rotigus / Ability | Virulent Blessing (Psychic) | automatic | missing | False |
| Death Guard | Tallyman / Ability | Malicious Calculations | automatic | missing | False |
| Death Guard | Typhus / Ability | The Destroyer Hive | automatic | missing | False |
| Death Guard | Blightlord Terminators / Ability | Blistering Fusillade | automatic | missing | False |
| Death Guard | Deathshroud Terminators / Ability | Silent Bodyguard | automatic | missing | False |
| Death Guard | Chaos Predator Destructor / Ability | Hail of Corrosive Disease | activated | missing | False |
| Death Guard | Helbrute / Ability | Diseased Malice | automatic | missing | False |
| Death Guard | Helbrute / Ability | Froth-spattered Frenzy | automatic | missing | False |
| Deathwatch | Black Spear Task Force / Enhancement | The Thief of Secrets | automatic | missing | False |
| Deathwatch | Black Spear Task Force / Enhancement | Osseus Key (Aura) | automatic | missing | False |
| Deathwatch | Watch Master / Ability | Strategic Knowledge | automatic | missing | False |
| Deathwatch | Watch Master / Ability | Watch Master | automatic | missing | False |
| Deathwatch | Watch Master / Ability | Purgatus Quarry | automatic | missing | False |
| Drukhari | Spectacle of Spite / Detachment Rule | Combat Drugs | activated | declared_only | True |
| Drukhari | Kabalite Cartel / Enhancement | Leechbite Plate | automatic | missing | False |
| Drukhari | Kabalite Cartel / Stratagem | Double-Cross | activated | missing | False |
| Drukhari | Reaper's Wager / Detachment Rule | Callous Competition | automatic | declared_only | True |
| Emperor's Children | Peerless Bladesmen / Detachment Rule | Exquisite Swordsmanship | automatic | declared_only | True |
| Emperor's Children | Rapid Evisceration / Detachment Rule | Mechanised Murder | automatic | missing | False |
| Emperor's Children | Coterie of the Conceited / Detachment Rule | Pledges to the Dark Prince | automatic | declared_only | True |
| Emperor's Children | Coterie of the Conceited / Enhancement | Pledge of Unholy Fortune | activated | missing | False |
| Genestealer Cults | Xenocreed Congregation / Detachment Rule | Unquestioning Fanaticism | automatic | missing | False |
| Genestealer Cults | Brood Brother Auxilia / Enhancement | Firepoint Commander | automatic | missing | False |
| Grey Knights | Hallowed Conclave / Enhancement | Nemesis Rounds | automatic | declared_only | True |
| Grey Knights | Banishers / Detachment Rule | Channelled Force | activated | declared_only | True |
| Grey Knights | Sanctic Spearhead / Stratagem | Truesilver Will | activated | declared_only | True |
| Grey Knights | Argent Assault / Detachment Rule | Dauntless Champions | automatic | declared_only | True |
| Grey Knights | Fires of Purgation / Enhancement | Precognicient Volleys | automatic | declared_only | True |
| Grey Knights | Brother-Captain / Ability | Hammerhand (Psychic) | automatic | declared_only | True |
| Grey Knights | Brother-Captain / Ability | Eye of Judgement (Psychic) | automatic | declared_only | True |
| Grey Knights | Brotherhood Terminator Squad / Ability | Force Edge (Psychic) | automatic | declared_only | True |
| Grey Knights | Castellan Crowe / Ability | Champion of the Order of Purifiers (Psychic) | automatic | declared_only | True |
| Grey Knights | Castellan Crowe / Ability | Foresight (Psychic) | automatic | declared_only | True |
| Grey Knights | Grand Master in Nemesis Dreadknight / Ability | Surge of Wrath (Psychic) | automatic | declared_only | True |
| Grey Knights | Grand Master Voldus / Ability | Sanctuary (Psychic) | automatic | declared_only | True |
| Grey Knights | Paladin Squad / Ability | Attuned Onslaught (Psychic) | automatic | declared_only | True |
| Imperial Fists | Ceramite Sentinels / Detachment Rule | Adaptive Defence | automatic | declared_only | True |
| Imperial Fists | Ceramite Sentinels / Stratagem | Stand to the End | activated | missing | False |
| Imperial Knights | Skitarii Marshal / Ability | Control Edict | automatic | declared_only | True |
| Imperial Knights | Tech-Priest Dominus / Ability | Lord of the Machine Cult | automatic | declared_only | True |
| Iron Hands | Iron Father Feirros / Ability | Master of the Forge | automatic | missing | False |
| Leagues of Votann | Brandfast Oathband / Enhancement | Precursive Judgement | automatic | missing | False |
| Leagues of Votann | Hearthfyre Arsenal / Stratagem | Preventative Purge | activated | missing | False |
| Leagues of Votann | Berek Stornbröw / Ability | Feel No Pain 4+ | automatic | declared_only | True |
| Leagues of Votann | Hearthkyn Warriors / Ability | Feel No Pain 6+ | automatic | declared_only | True |
| Leagues of Votann | Ûthar the Destined / Ability | Ancestral Fortune | activated | missing | False |
| Leagues of Votann | Cthonian Beserks / Ability | Feel No Pain 4+ | automatic | declared_only | True |
| Leagues of Votann | Ironkin Steeljacks with Heavy Volkanite Disintegrators / Ability | Purge Response | automatic | missing | False |
| Leagues of Votann | Ironkin Steeljacks with Heavy Volkanite Disintegrators / Ability | Preymark Crest | automatic | missing | False |
| Leagues of Votann | Ironkin Steeljacks with Melee Weapons / Ability | Preymark Crest | automatic | missing | False |
| Necrons | Army Rule | Reanimation Protocols | automatic | missing | False |
| Necrons | Hypercrypt Legion / Stratagem | Cosmic Precision | activated | missing | False |
| Necrons | Hexmark Destroyer / Ability | Inescapable Death | activated | missing | False |
| Necrons | Doom Scythe / Ability | Atavistic Instigation | automatic | declared_only | True |
| Necrons | Immortals / Ability | Implacable Eradication | automatic | declared_only | True |
| Necrons | Skorpekh Destroyers / Ability | Whirling Onslaught | automatic | declared_only | True |
| Necrons | Canoptek Doomstalker / Ability | Sentinel Construct | automatic | missing | False |
| Necrons | Lokhust Destroyers / Ability | Hard-wired for Destruction | automatic | declared_only | True |
| Orks | Army Rule | Special Move Types | automatic | missing | False |
| Orks | Green Tide / Detachment Rule | Mob-handed Brutality | automatic | declared_only | True |
| Orks | Bully Boyz / Detachment Rule | Displays of Savagery | automatic | declared_only | True |
| Orks | Runt Swarm / Stratagem | Grot Shields | activated | missing | False |
| Orks | Shoota Boyz / Enhancement | Targetin' Squigs | automatic | declared_only | True |
| Orks | Shoota Boyz / Stratagem | Glowin' Dakka | activated | declared_only | True |
| Orks | Shoota Boyz / Stratagem | Never Enough Dakka | activated | declared_only | True |
| Orks | Taktikal Brigade / Enhancement | Throat-slittas | automatic | declared_only | True |
| Orks | Wreckas / Detachment Rule | Wreckin' and Lootin' | automatic | missing | False |
| Orks | Wreckas / Stratagem | Drive-by Bustin' | activated | missing | False |
| Orks | Madcap Meks / Detachment Rule | Unpredictable Genius | automatic | missing | False |
| Orks | Madcap Meks / Enhancement | Temperamental Shokka | automatic | missing | False |
| Orks | Madcap Meks / Stratagem | Vindictive Artillerists | activated | declared_only | True |
| Orks | Dread Mob / Enhancement | Dreadherder | automatic | missing | False |
| Orks | Kult of Speed / Detachment Rule | Adrenaline Junkies | automatic | missing | False |
| Orks | Flyboyz / Detachment Rule | Skyborne Loons | automatic | declared_only | True |
| Orks | Flyboyz / Stratagem | Long, Uncontrolled Bursts | activated | declared_only | True |
| Orks | Brute Bosses / Enhancement | Blitzboss | automatic | missing | False |
| Orks | Brute Bosses / Enhancement | Da Gobshot Thunderbuss | automatic | missing | False |
| Orks | Wurrband / Detachment Rule | Powers of da Waaagh! | automatic | declared_only | True |
| Orks | Wurrband / Enhancement | Da Krunch | automatic | missing | False |
| Orks | Beastboss / Ability | Dodge Dis | automatic | missing | None |
| Orks | Gargantuan Squiggoth / Ability | Walking Bastion | automatic | missing | None |
| Salamanders | Forgefather's Seekers / Detachment Rule | Vulkan's Quest | activated | declared_only | True |
| Salamanders | Forgefather's Seekers / Enhancement | Forged in Battle | automatic | missing | False |
| Salamanders | Forgefather's Seekers / Stratagem | Forged in Fire | activated | missing | False |
| Salamanders | Vulkan He'stan / Ability | Seeker of the Unfound | automatic | missing | False |
| Space Wolves | Champions of Fenris / Stratagem | Champion's Guidance | activated | missing | False |
| Space Wolves | Saga of the Great Wolf / Detachment Rule | Master of Wolves | automatic | declared_only | True |
| Space Wolves | Saga of the Great Wolf / Stratagem | Wolf Totems | activated | missing | False |
| Space Wolves | Saga of the Great Wolf / Stratagem | Fangs of the Pack | activated | missing | False |
| Space Wolves | Njal Stormcaller / Ability | Tempest’s Wrath | automatic | missing | None |
| Space Wolves | Ulrik the Slayer / Ability | Slayer’s Oath | automatic | missing | None |
| Space Wolves | Iron Priest / Ability | Judgement of the Omnissiah | automatic | missing | None |
| Space Wolves | Wulfen with Storm Shields / Ability | Hammer Blow | automatic | missing | None |
| Space Wolves | Wolf Scouts / Ability | Deadly Stalkers | automatic | missing | None |
| T'au Empire | Army Rule | For the Greater Good | activated | declared_only | True |
| T'au Empire | Kauyon / Detachment Rule | Patient Hunter | automatic | declared_only | True |
| T'au Empire | Kauyon / Enhancement | Precision Of The Patient Hunter | automatic | declared_only | True |
| T'au Empire | Kauyon / Stratagem | Coordinate To Engage | activated | declared_only | True |
| T'au Empire | Mont'ka / Detachment Rule | Killing Blow | automatic | declared_only | True |
| T'au Empire | Retaliation Cadre / Detachment Rule | Bonded Heroes | automatic | declared_only | True |
| T'au Empire | Retaliation Cadre / Enhancement | Prototype Weapon System | automatic | declared_only | True |
| T'au Empire | Retaliation Cadre / Stratagem | The Arro'Kon Protocol | activated | declared_only | True |
| T'au Empire | Experimental Prototype Cadre / Stratagem | Experimental Ammunition | activated | missing | False |
| T'au Empire | Ethereal / Ability | Failure Is Not An Option | automatic | declared_only | True |
| T'au Empire | Kroot Flesh Shaper / Ability | Rites of Feasting | automatic | declared_only | True |
| T'au Empire | Kroot Farstalkers / Ability | Pech’ra | automatic | declared_only | True |
| T'au Empire | Hammerhead Gunship / Ability | Targeting Array | automatic | missing | False |
| T'au Empire | Sky Ray Gunship / Ability | Targeting Array | automatic | missing | False |
| T'au Empire | Broadside Battlesuits / Ability | Advanced Armour | automatic | missing | False |
| Thousand Sons | Grand Coven / Detachment Rule | Kindred Sorcery | activated | missing | False |
| Thousand Sons | Changehost of Deceit / Detachment Rule | Infernal Pacts | automatic | missing | False |
| Thousand Sons | Warpmeld Pact / Enhancement | Warpmeld Dagger | automatic | missing | False |
| Thousand Sons | Warpmeld Pact / Enhancement | Flowing Flesh | automatic | declared_only | True |
| Thousand Sons | Warpforged Cabal / Stratagem | Malevolent Animus | activated | missing | False |
| Thousand Sons | Hexwarp Thrallband / Enhancement | Empowered Manifestation | automatic | missing | False |
| Thousand Sons | Infernal Master / Ability | Glimpse of Eternity (Psychic) | activated | missing | False |
| Thousand Sons | Lord of Change / Ability | Master of Magicks (Psychic) | automatic | missing | False |
| Tyranids | Invasion Fleet / Stratagem | Rapid Regeneration | activated | missing | False |
| Tyranids | Neurolictor / Ability | Psychological Saboteur (Aura) | automatic | missing | None |
| Tyranids | Neurotyrant / Ability | Node Lash (Psychic) | automatic | missing | None |
| Tyranids | Norn Emissary / Ability | Unnatural Resilience | automatic | missing | None |
| Tyranids | Old One Eye / Ability | Feel No Pain 5+ | automatic | missing | None |
| Tyranids | Tyranid Warriors with Melee Bio-weapons / Ability | Adaptive Instincts | activated | missing | False |
| Tyranids | Zoanthropes / Ability | Warp Field (Aura, Psychic) | automatic | missing | None |
| Tyranids | Psychophage / Ability | Feel No Pain 5+ | automatic | missing | None |
| Tyranids | Psychophage / Ability | Bio-stimulus (Aura) | automatic | missing | None |
| Tyranids | Tervigon / Ability | Brood Progenitor (Aura, Psychic) | automatic | missing | None |
| Tyranids | Tyrant Guard / Ability | Guardian Organism | automatic | missing | None |
| Tyranids | The Red Terror / Ability | Swallow Whole | automatic | missing | False |
| Ultramarines | Chief Librarian Tigurius / Ability | Hood of Hellfire (Psychic) | automatic | missing | False |
| Ultramarines | Kaius Konorius / Ability | Veteran Bodyguard | automatic | missing | False |
| White Scars | Kor'sarro Khan / Ability | For the Khan! | automatic | declared_only | True |
| World Eaters | Berzerker Warband / Detachment Rule | Relentless Rage | automatic | declared_only | True |
| World Eaters | Berzerker Warband / Enhancement | Berzerker Glaive | automatic | declared_only | True |
| World Eaters | Berzerker Warband / Enhancement | Helm of Brazen Ire | automatic | declared_only | True |
| World Eaters | Berzerker Warband / Stratagem | Hack and Slash | activated | declared_only | True |
| World Eaters | Berzerker Warband / Stratagem | Frenzied Resilience | activated | declared_only | True |
| World Eaters | Cult of Blood / Additional Rule | Idol of Infinite Rage (Aura) | automatic | declared_only | True |
| World Eaters | Cult of Blood / Additional Rule | Idol of Blessed Blood (Aura) | automatic | declared_only | True |
| World Eaters | Cult of Blood / Enhancement | Brazen Form | automatic | declared_only | True |
| World Eaters | Cult of Blood / Stratagem | Bloody Vengeance | activated | declared_only | True |
| World Eaters | Cult of Blood / Stratagem | In the Shadow of Brass Idols | activated | declared_only | True |
| World Eaters | Cult of Blood / Stratagem | Fail Not the Blood God | activated | declared_only | True |
| World Eaters | Khorne Daemonkin / Additional Rule | Enraged Abjuration | automatic | declared_only | True |
| World Eaters | Khorne Daemonkin / Additional Rule | Boon of Blood | automatic | declared_only | True |
| World Eaters | Khorne Daemonkin / Enhancement | Blood-Forged Armour | automatic | missing | False |
| World Eaters | Khorne Daemonkin / Enhancement | Blade of Endless Bloodshed | automatic | missing | False |
| World Eaters | Khorne Daemonkin / Stratagem | Daemonic Fury | activated | declared_only | True |
| World Eaters | Khorne Daemonkin / Stratagem | Blessing of Burning Blood | activated | declared_only | True |
| World Eaters | Possessed Slaughterband / Enhancement | Frenzied Focus | automatic | declared_only | True |
| World Eaters | Possessed Slaughterband / Stratagem | Daemonic Resistance | activated | declared_only | True |
| World Eaters | Possessed Slaughterband / Stratagem | Daemonic Strength | activated | declared_only | True |
| World Eaters | Goretrack Onslaught / Enhancement | Unleash Hell | activated | missing | False |
| World Eaters | Brazen Engines / Stratagem | Apoplectic Clarity | activated | declared_only | True |
| World Eaters | Butchers of Khorne / Enhancement | Gore-Stained Veterans | automatic | declared_only | True |
| World Eaters | Butchers of Khorne / Stratagem | Focused Ferocity | activated | declared_only | True |
| World Eaters | Butchers of Khorne / Stratagem | A Trophy for the Throne | activated | declared_only | True |
| World Eaters | Vessels of Wrath / Detachment Rule | Wrath of Khorne | automatic | declared_only | True |
| World Eaters | Vessels of Wrath / Stratagem | Scorn the Witch | activated | declared_only | True |
| World Eaters | Vessels of Wrath / Stratagem | Aspire to Infamy | activated | declared_only | True |
| World Eaters | Angron / Ability | Driven by Ultimate Rage (Aura) | automatic | missing | False |
| World Eaters | Angron / Ability | Damaged | automatic | missing | False |
| World Eaters | Bloodthirster / Ability | Damaged | automatic | missing | False |
| World Eaters | Daemon Prince of Khorne / Ability | Devastating Assault | automatic | missing | False |
| World Eaters | Khârn the Betrayer / Ability | Legendary Killer | automatic | missing | False |
| World Eaters | Master of Executions / Ability | A Worthy Skull | automatic | missing | False |
| World Eaters | Skarbrand / Ability | Rage Embodied (Aura) | automatic | missing | False |
| World Eaters | Skarbrand / Ability | Damaged | automatic | missing | False |
| World Eaters | Slaughterbound / Ability | Possessed Lord | activated | missing | False |
| World Eaters | Chaos Terminators / Ability | Bloody Fury | activated | missing | False |
| World Eaters | Eightbound / Ability | Beacons of Rage (Aura) | automatic | missing | False |
| World Eaters | Exalted Eightbound / Ability | Rend and Tear | automatic | missing | False |
| World Eaters | Chaos Predator Annihilator / Ability | Blood-hungry Annihilator | automatic | missing | False |
| World Eaters | Forgefiend / Ability | Furious Onslaught | automatic | missing | False |
| World Eaters | Maulerfiend / Ability | Savage Exaltation | automatic | missing | False |
