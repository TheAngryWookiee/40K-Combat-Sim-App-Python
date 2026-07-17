from __future__ import annotations

import random
import re
import math
from typing import Any


class CombatSimulationError(ValueError):
    pass


TURN_STRUCTURE_11TH_EDITION = [
    {
        "id": "start_of_turn",
        "sequence": 1,
        "name": "Start of Turn Step",
        "kind": "step",
        "summary": "Rules that are triggered at the start of a turn are resolved now.",
        "primary_rules": [
            "Resolve all rules that trigger at the start of the turn.",
        ],
        "available_actions": [],
    },
    {
        "id": "command",
        "sequence": 2,
        "name": "Command Phase",
        "kind": "phase",
        "summary": "You marshal strategic resources and check your units' morale.",
        "primary_rules": [
            "Start of Command Phase: resolve rules triggered at the start of the Command phase.",
            "Gain Core CP: both players gain 1 Command Point.",
            "Battle-shock: the active player makes one battle-shock roll for each unit that is battle-shocked or at or below half-strength.",
            "Command Abilities: resolve other Command phase rules, excluding start triggers, core CP gain, and battle-shock rolls.",
            "End of Command Phase: resolve rules triggered at the end of the Command phase, then mission rules.",
        ],
        "available_actions": ["gain_core_cp", "battle_shock_roll", "leadership_roll", "command_abilities"],
        "sub_steps": [
            {
                "id": "start_of_command_phase",
                "sequence": 1,
                "name": "Start of Command Phase",
                "rule_ref": "08.01",
                "summary": "Rules that are triggered at the start of the Command phase are resolved now.",
            },
            {
                "id": "gain_core_cp",
                "sequence": 2,
                "name": "Gain Core CP",
                "rule_ref": "08.02",
                "summary": "Both players gain 1 Command Point (CP).",
                "cp_gained_by_each_player": 1,
            },
            {
                "id": "battle_shock",
                "sequence": 3,
                "name": "Battle-shock",
                "rule_ref": "08.03",
                "summary": "The active player makes one battle-shock roll for each unit that is currently battle-shocked or at or below half-strength.",
            },
            {
                "id": "command_abilities",
                "sequence": 4,
                "name": "Command Abilities",
                "rule_ref": "08.04",
                "summary": "Command phase rules are resolved now, excluding start triggers, core CP gain and battle-shock rolls.",
            },
            {
                "id": "end_of_command_phase",
                "sequence": 5,
                "name": "End of Command Phase",
                "rule_ref": "08.05",
                "summary": "Resolve end-of-Command-phase rules first, then mission rules triggered at this point.",
            },
        ],
    },
    {
        "id": "movement",
        "sequence": 3,
        "name": "Movement Phase",
        "kind": "phase",
        "summary": "Your units move across the battlefield and strategic reserves arrive.",
        "primary_rules": [
            "Start of Movement Phase: resolve rules triggered at the start of the Movement phase.",
            "Move Units: the active player moves units one at a time until every unit selected to move has resolved a move.",
            "End of Movement Phase: resolve rules triggered at the end of the Movement phase.",
        ],
        "available_actions": ["model_move", "unit_setup", "unit_coherency", "unit_engagement", "hazard_rolls", "battle_shock_roll"],
        "sub_steps": [
            {
                "id": "start_of_movement_phase",
                "sequence": 1,
                "name": "Start of Movement Phase",
                "rule_ref": "09.01",
                "summary": "Rules that are triggered at the start of the Movement phase are resolved now.",
            },
            {
                "id": "move_units",
                "sequence": 2,
                "name": "Move Units",
                "rule_ref": "09.02",
                "summary": "Select one friendly unit that has not been selected to move this phase, then select one eligible move type and resolve it.",
            },
            {
                "id": "end_of_movement_phase",
                "sequence": 3,
                "name": "End of Movement Phase",
                "rule_ref": "09.03",
                "summary": "Rules that are triggered at the end of the Movement phase are resolved now.",
            },
        ],
        "move_types": [
            {
                "id": "remain_stationary",
                "name": "Remain Stationary",
                "rule_ref": "09.04",
                "maximum_distance": "-",
                "eligible_if": "Any unit.",
                "effect": "No models are moved. Units that remain stationary do not trigger rules that are triggered when a unit starts or ends a move.",
                "after_moving": [],
                "selected_to_move": True,
            },
            {
                "id": "normal",
                "name": "Normal Move",
                "rule_ref": "09.05",
                "maximum_distance": "M",
                "eligible_if": "Your unit is on the battlefield and unengaged.",
                "effect": "Your unit moves as described in Moving.",
                "after_moving": ["Your unit must be unengaged."],
                "requires_unengaged_before": True,
                "requires_unengaged_after": True,
            },
            {
                "id": "advance",
                "name": "Advance Move",
                "rule_ref": "09.06",
                "maximum_distance": "M + Advance roll",
                "eligible_if": "Your unit is on the battlefield and unengaged.",
                "effect": "Your unit moves as described in Moving.",
                "before_moving": ["Make an advance roll by rolling one D6."],
                "after_moving": [
                    "Your unit must be unengaged.",
                    "Until the end of the turn, unless otherwise stated, your unit is not eligible to declare a charge or start an action.",
                ],
                "requires_unengaged_before": True,
                "requires_unengaged_after": True,
                "advance_roll_required": True,
                "eligible_to_charge_after": False,
                "eligible_to_start_action_after": False,
            },
            {
                "id": "fall_back",
                "name": "Fall-back Move",
                "rule_ref": "09.07",
                "maximum_distance": "M",
                "eligible_if": "Your unit is engaged.",
                "effect": "Your unit moves as described in Moving.",
                "before_moving": [
                    "Select fall-back mode.",
                    "Ordered Retreat can only be selected if the unit is not battle-shocked.",
                    "Desperate Escape requires a hazard roll for each model in the unit.",
                ],
                "while_moving": ["Desperate Escape: each model that is moved can be moved through enemy models."],
                "after_moving": [
                    "Your unit must be unengaged.",
                    "Until the end of the turn, unless otherwise stated, your unit is not eligible to shoot, declare a charge or start an action.",
                    "Desperate Escape: if your unit is not battle-shocked, you must make a battle-shock roll.",
                ],
                "requires_engaged_before": True,
                "requires_unengaged_after": True,
                "eligible_to_shoot_after": False,
                "eligible_to_charge_after": False,
                "eligible_to_start_action_after": False,
                "modes": [
                    {
                        "id": "ordered_retreat",
                        "name": "Ordered Retreat",
                        "eligible_if": "The unit is not battle-shocked.",
                    },
                    {
                        "id": "desperate_escape",
                        "name": "Desperate Escape",
                        "hazard_rolls_per_model": 1,
                        "can_move_through_enemy_models": True,
                    },
                ],
            },
        ],
    },
    {
        "id": "shooting",
        "sequence": 4,
        "name": "Shooting Phase",
        "kind": "phase",
        "summary": "Your units make attacks with their ranged weapons.",
        "primary_rules": [
            "Start of Shooting Phase: resolve rules triggered at the start of the Shooting phase.",
            "Shoot: the active player shoots with eligible units one at a time until every selected unit has resolved its attacks.",
            "End of Shooting Phase: resolve rules triggered at the end of the Shooting phase.",
        ],
        "available_actions": ["shooting_type", "weapon_selection", "weapon_targets", "attack_resolution", "visibility"],
        "sub_steps": [
            {
                "id": "start_of_shooting_phase",
                "sequence": 1,
                "name": "Start of Shooting Phase",
                "rule_ref": "10.01",
                "summary": "Rules that are triggered at the start of the Shooting phase are resolved now.",
            },
            {
                "id": "shoot",
                "sequence": 2,
                "name": "Shoot",
                "rule_ref": "10.02",
                "summary": "Select one friendly unit that is eligible to shoot and has not been selected to shoot this phase, then select an eligible shooting type and resolve it.",
            },
            {
                "id": "end_of_shooting_phase",
                "sequence": 3,
                "name": "End of Shooting Phase",
                "rule_ref": "10.03",
                "summary": "Rules that are triggered at the end of the Shooting phase are resolved now.",
            },
        ],
        "shooting_types": [
            {
                "id": "normal",
                "name": "Normal Shooting",
                "rule_ref": "10.04",
                "eligible_if": "Your unit is unengaged and did not make an Advance move this turn.",
                "effect": "Your unit shoots as described in Making Attacks.",
                "after_shooting": ["Until the end of the phase, your unit is not eligible to start an action."],
                "requires_unengaged": True,
                "requires_not_advanced": True,
                "eligible_to_start_action_after": False,
            },
            {
                "id": "assault",
                "name": "Assault Shooting",
                "rule_ref": "10.05",
                "eligible_if": "Your unit is unengaged, made an Advance move this turn, and has one or more [ASSAULT] weapons.",
                "effect": "Your unit shoots as described in Making Attacks.",
                "while_shooting": ["You can only select [ASSAULT] weapons to make attacks with."],
                "after_shooting": ["Until the end of the phase, your unit is not eligible to start an action."],
                "requires_unengaged": True,
                "requires_advanced": True,
                "requires_assault_weapons": True,
                "eligible_to_start_action_after": False,
            },
            {
                "id": "close_quarters",
                "name": "Close-quarters Shooting",
                "rule_ref": "10.06",
                "eligible_if": "Your unit is engaged, did not make an Advance move this turn, and has one or more [CLOSE-QUARTERS] weapons or is a MONSTER/VEHICLE unit.",
                "effect": "Your unit shoots as described in Making Attacks.",
                "while_shooting": [
                    "Models in your unit can target enemy units your unit is engaged with.",
                    "MONSTER/VEHICLE models can attack with each ranged weapon that does not have [CLOSE-QUARTERS] and does not have [BLAST], and can still attack with [CLOSE-QUARTERS] weapons if a [BLAST] weapon cannot target a unit.",
                    "Non-MONSTER/Non-VEHICLE models can only select [CLOSE-QUARTERS] weapons and can only target enemy units your unit is engaged with.",
                ],
                "after_shooting": ["Until the end of the phase, your unit is not eligible to start an action."],
                "requires_engaged": True,
                "requires_not_advanced": True,
                "requires_close_quarters_or_monster_vehicle": True,
                "eligible_to_start_action_after": False,
            },
            {
                "id": "indirect",
                "name": "Indirect Shooting",
                "rule_ref": "10.07",
                "eligible_if": "Your unit is unengaged, did not make an Advance move this turn, and has one or more [INDIRECT FIRE] weapons.",
                "effect": "Your unit shoots as described in Making Attacks.",
                "while_shooting": [
                    "[INDIRECT FIRE] weapons can target units that are not visible to the attacking model.",
                    "Each time an [INDIRECT FIRE] weapon attacks, the target has the benefit of cover, hit rolls cannot be re-rolled, and unmodified hit rolls of 1-5 fail unless your unit remained stationary and the target is visible to one or more friendly units.",
                ],
                "after_shooting": ["Until the end of the phase, your unit is not eligible to start an action."],
                "requires_unengaged": True,
                "requires_not_advanced": True,
                "requires_indirect_fire_weapons": True,
                "eligible_to_start_action_after": False,
            },
        ],
    },
    {
        "id": "charge",
        "sequence": 5,
        "name": "Charge Phase",
        "kind": "phase",
        "summary": "Your units make charge moves to engage the enemy.",
        "primary_rules": [
            "Start of Charge Phase: resolve rules triggered at the start of the Charge phase.",
            "Charge: the active player resolves charges with eligible units one at a time.",
            "End of Charge Phase: resolve rules triggered at the end of the Charge phase.",
        ],
        "available_actions": ["charge_roll", "model_move", "unit_engagement", "hazard_rolls"],
        "sub_steps": [
            {
                "id": "start_of_charge_phase",
                "sequence": 1,
                "name": "Start of Charge Phase",
                "rule_ref": "11.01",
                "summary": "Rules that are triggered at the start of the Charge phase are resolved now.",
            },
            {
                "id": "charge",
                "sequence": 2,
                "name": "Charge",
                "rule_ref": "11.02",
                "summary": "Select one eligible friendly unit that has not declared a charge this phase, roll 2D6, then make a charge move if the result is sufficient.",
            },
            {
                "id": "end_of_charge_phase",
                "sequence": 3,
                "name": "End of Charge Phase",
                "rule_ref": "11.03",
                "summary": "Rules that are triggered at the end of the Charge phase are resolved now.",
            },
        ],
        "charge_rules": {
            "eligible_if": [
                "The unit is on the battlefield.",
                "The unit is within 12\" of one or more enemy units.",
                "The unit is not engaged.",
                "The unit did not make an Advance or Fall-back move this turn.",
                "The unit has not declared a charge this phase.",
            ],
            "roll": "Roll 2D6; the result is the maximum distance for the charge move.",
            "success": "The charge succeeds if that move can end within Engagement Range of every target selected for the charge.",
            "failed_charge": "If the charge roll is insufficient, the unit does not make a charge move and counts as having charged.",
            "charge_move": {
                "rule_ref": "11.04",
                "maximum_distance": "Charge roll.",
                "eligible_if": "Your unit declared a charge this phase.",
                "effect": "Your unit moves as described in Moving.",
                "before_moving": [
                    "Select one or more enemy units that are within 12\" of your unit and within the maximum distance of this move.",
                    "Each selected enemy unit is a charge target until the end of this move.",
                ],
                "while_moving": [
                    "Each model must end its move closer to one or more charge targets.",
                    "Each model that can end its move within 1\" of one or more charge targets must do so.",
                    "Each model that can end its move engaged with one or more charge targets must do so.",
                ],
                "after_moving": [
                    "Your unit must be engaged with all of the charge targets.",
                    "Your unit cannot be engaged with one or more enemy units that are not charge targets.",
                    "Until the end of the turn, each model in your unit has the Fights First ability.",
                ],
                "fights_first_after": True,
            },
        },
    },
    {
        "id": "fight",
        "sequence": 6,
        "name": "Fight Phase",
        "kind": "phase",
        "summary": "Both players' units make attacks with their melee weapons.",
        "primary_rules": [
            "Start of Fight Phase: resolve rules triggered at the start of the Fight phase.",
            "Pile In: both players make pile-in moves with eligible units, starting with the player whose turn it is.",
            "Fight: combatants make melee attacks.",
            "Consolidate: eligible units make consolidation moves.",
            "End of Fight Phase: resolve rules triggered at the end of the Fight phase.",
        ],
        "available_actions": ["pile_in", "fight_type", "consolidate", "weapon_selection", "weapon_targets", "attack_resolution", "mortal_wounds"],
        "sub_steps": [
            {
                "id": "start_of_fight_phase",
                "sequence": 1,
                "name": "Start of Fight Phase",
                "rule_ref": "12.01",
                "summary": "Rules that are triggered at the start of the Fight phase are resolved now.",
            },
            {
                "id": "pile_in",
                "sequence": 2,
                "name": "Pile In",
                "rule_ref": "12.02",
                "summary": "Both players make pile-in moves with all eligible units they choose to move, starting with the player whose turn it is.",
            },
            {
                "id": "fight",
                "sequence": 3,
                "name": "Fight",
                "rule_ref": None,
                "summary": "Combatants make melee attacks.",
            },
            {
                "id": "consolidate",
                "sequence": 4,
                "name": "Consolidate",
                "rule_ref": "12.07",
                "summary": "Both players make consolidation moves with all eligible units they choose to move, starting with the player whose turn it is.",
            },
            {
                "id": "end_of_fight_phase",
                "sequence": 5,
                "name": "End of Fight Phase",
                "rule_ref": "12.09",
                "summary": "Rules that are triggered at the end of the Fight phase are resolved now.",
            },
        ],
        "fight_rules": {
            "consolidate_move": {
                "rule_ref": "12.08",
                "maximum_distance": "3\"",
                "eligible_if": "It is the Fight phase and your unit was eligible to fight this phase.",
                "effect": "Your unit moves as described in Moving.",
                "before_moving": [
                    "Ongoing Consolidation: if your unit is engaged, select this mode and every enemy unit it is engaged with.",
                    "Engaging Consolidation: otherwise, if your unit is within 3\" of one or more enemy units, select this mode and one or more of those enemy units.",
                    "Objective Consolidation: otherwise, if your unit is within 3\" of one or more objectives, select this mode and one of those objectives.",
                ],
                "while_moving": [
                    "Ongoing Consolidation: models in base-contact with enemy models cannot move. Each moved model must end closer to the closest selected enemy unit and engaged with it if possible.",
                    "Engaging Consolidation: each moved model must end closer to the closest selected enemy unit and engaged with it if possible.",
                    "Objective Consolidation: each moved model must end within range of the selected objective if possible, or closer to it if not.",
                ],
                "after_moving": [
                    "Ongoing Consolidation: each model that started engaged with an enemy unit must still be engaged with that unit.",
                    "Engaging Consolidation: your unit must be engaged with all selected enemy units. If one or more enemy units engaged with your unit have not been selected to fight this phase, your opponent must select each of those units one at a time when each is selected to fight.",
                    "Objective Consolidation: your unit must be within range of the selected objective.",
                ],
                "modes": [
                    {"id": "ongoing", "name": "Ongoing Consolidation"},
                    {"id": "engaging", "name": "Engaging Consolidation"},
                    {"id": "objective", "name": "Objective Consolidation"},
                ],
            },
            "fight": {
                "rule_ref": "12.04",
                "eligible_if": [
                    "The unit has not already been selected to fight this phase.",
                    "The unit is engaged, was engaged at the start of this step, or made a charge move this turn.",
                ],
                "sequence": [
                    "Resolve Fights First Combats: starting with the player whose turn it is, players alternate selecting one eligible friendly Fights First unit.",
                    "Resolve Remaining Combats: starting with the player who just moved, players alternate selecting one eligible friendly unit.",
                    "After resolving a fight in Remaining Combats, return to Fights First if any Fights First units are eligible.",
                ],
            },
            "fight_types": [
                {
                    "id": "normal",
                    "name": "Normal Fight",
                    "rule_ref": "12.05",
                    "eligible_if": "Your unit is engaged.",
                    "effect": "Your unit fights as described in Making Attacks.",
                    "requires_engaged": True,
                },
                {
                    "id": "overrun",
                    "name": "Overrun Fight",
                    "rule_ref": "12.06",
                    "eligible_if": "Your unit is unengaged, or was unengaged at the start of the Fight step but became engaged during the Fight phase.",
                    "effect": "Your unit can make one additional pile-in move, then fights as described in Making Attacks.",
                    "allows_additional_pile_in": True,
                },
            ],
            "pile_in_move": {
                "rule_ref": "12.03",
                "maximum_distance": "3\"",
                "eligible_if": [
                    "It is the Fight phase.",
                    "The unit is engaged, made a charge move this turn, or was selected to make an Overwatching fight this phase.",
                ],
                "effect": "Your unit moves as described in Moving.",
                "before_moving": [
                    "If your unit is engaged, select every enemy unit it is engaged with as pile-in targets.",
                    "Otherwise, select one or more enemy units within 5\" of your unit as pile-in targets.",
                ],
                "while_moving": [
                    "Models in base-contact with one or more enemy models cannot be moved.",
                    "Each model that is moved must end its move closer to the closest pile-in target, and engaged with it if possible.",
                ],
                "after_moving": [
                    "Your unit must be engaged.",
                    "Each model that started this move engaged with an enemy unit must still be engaged with that enemy unit.",
                ],
            },
        },
    },
    {
        "id": "end_of_turn",
        "sequence": 7,
        "name": "End of Turn Step",
        "kind": "step",
        "summary": "Rules that are triggered at the end of a turn are resolved now, in the following order.",
        "primary_rules": [
            "First resolve rules triggered at this point other than mission rules.",
            "Then resolve mission rules triggered at this point.",
            "Units not in coherency must remove models until they regain coherency.",
        ],
        "available_actions": ["regain_coherency"],
    },
]


class CombatSimulator:
    OATH_EXCLUDED_KEYWORDS = {
        "black templars",
        "blood angels",
        "dark angels",
        "deathwatch",
        "space wolves",
    }

    def __init__(self, seed: int | None = None) -> None:
        self.rng = random.Random(seed)
        self.log_messages: list[str] = []
        self.stats: dict[str, int] = {}

    @staticmethod
    def build_empty_stats() -> dict[str, int]:
        return {
            "attack_instances": 0,
            "gathered_attack_dice": 0,
            "hit_rolls": 0,
            "auto_hit_attacks": 0,
            "successful_hit_attacks": 0,
            "failed_hit_attacks": 0,
            "critical_hit_attacks": 0,
            "extra_hits_generated": 0,
            "sustained_hits_generated": 0,
            "lethal_hits_triggered": 0,
            "torrent_hits": 0,
            "hit_pool": 0,
            "hit_rerolls_used": 0,
            "hit_reroll_successes": 0,
            "wound_rolls": 0,
            "auto_wounds": 0,
            "successful_wound_rolls": 0,
            "failed_wound_rolls": 0,
            "critical_wounds": 0,
            "devastating_wounds_triggered": 0,
            "wound_pool": 0,
            "wound_rerolls_used": 0,
            "wound_reroll_successes": 0,
            "damage_rerolls_used": 0,
            "damage_reroll_improvements": 0,
            "damage_pool": 0,
            "damage_inflicted": 0,
            "devastating_damage": 0,
            "mortal_damage": 0,
            "mortal_damage_sources": {},
            "feel_no_pain_rolls": 0,
            "feel_no_pain_successes": 0,
            "feel_no_pain_damage_prevented": 0,
            "save_attempts": 0,
            "saves_passed": 0,
            "saves_failed": 0,
            "unsavable_wounds": 0,
        }

    def record_mortal_damage(self, source: str, damage: int) -> None:
        mortal_damage = max(0, int(damage))
        if mortal_damage <= 0:
            return
        self.stats["mortal_damage"] += mortal_damage
        mortal_sources = self.stats.setdefault("mortal_damage_sources", {})
        mortal_sources[source] = mortal_sources.get(source, 0) + mortal_damage

    @staticmethod
    def get_turn_structure() -> dict[str, Any]:
        phases = [
            {
                **phase,
                "primary_rules": list(phase["primary_rules"]),
                "available_actions": list(phase["available_actions"]),
                "sub_steps": [
                    {**sub_step}
                    for sub_step in phase.get("sub_steps", [])
                ],
                "move_types": [
                    {
                        **move_type,
                        "before_moving": list(move_type.get("before_moving", [])),
                        "while_moving": list(move_type.get("while_moving", [])),
                        "after_moving": list(move_type.get("after_moving", [])),
                        "modes": [
                            {**mode}
                            for mode in move_type.get("modes", [])
                        ],
                    }
                    for move_type in phase.get("move_types", [])
                ],
                "shooting_types": [
                    {
                        **shooting_type,
                        "while_shooting": list(shooting_type.get("while_shooting", [])),
                        "after_shooting": list(shooting_type.get("after_shooting", [])),
                    }
                    for shooting_type in phase.get("shooting_types", [])
                ],
                "charge_rules": {
                    **phase.get("charge_rules", {}),
                    "eligible_if": list(phase.get("charge_rules", {}).get("eligible_if", [])),
                } if phase.get("charge_rules") else None,
                "fight_rules": {
                    "fight": {
                        **phase.get("fight_rules", {}).get("fight", {}),
                        "eligible_if": list(phase.get("fight_rules", {}).get("fight", {}).get("eligible_if", [])),
                        "sequence": list(phase.get("fight_rules", {}).get("fight", {}).get("sequence", [])),
                    },
                    "fight_types": [
                        {**fight_type}
                        for fight_type in phase.get("fight_rules", {}).get("fight_types", [])
                    ],
                    "consolidate_move": {
                        **phase.get("fight_rules", {}).get("consolidate_move", {}),
                        "before_moving": list(phase.get("fight_rules", {}).get("consolidate_move", {}).get("before_moving", [])),
                        "while_moving": list(phase.get("fight_rules", {}).get("consolidate_move", {}).get("while_moving", [])),
                        "after_moving": list(phase.get("fight_rules", {}).get("consolidate_move", {}).get("after_moving", [])),
                        "modes": [
                            {**mode}
                            for mode in phase.get("fight_rules", {}).get("consolidate_move", {}).get("modes", [])
                        ],
                    },
                    "pile_in_move": {
                        **phase.get("fight_rules", {}).get("pile_in_move", {}),
                        "eligible_if": list(phase.get("fight_rules", {}).get("pile_in_move", {}).get("eligible_if", [])),
                        "before_moving": list(phase.get("fight_rules", {}).get("pile_in_move", {}).get("before_moving", [])),
                        "while_moving": list(phase.get("fight_rules", {}).get("pile_in_move", {}).get("while_moving", [])),
                        "after_moving": list(phase.get("fight_rules", {}).get("pile_in_move", {}).get("after_moving", [])),
                    },
                } if phase.get("fight_rules") else None,
            }
            for phase in TURN_STRUCTURE_11TH_EDITION
        ]
        return {
            "edition": "11th",
            "turn_sequence": phases,
            "first_phase_id": phases[0]["id"],
            "last_phase_id": phases[-1]["id"],
        }

    def log(self, message: str) -> None:
        self.log_messages.append(message)

    def die_roll(self) -> int:
        return self.rng.randint(1, 6)

    def d3_die_roll(self) -> int:
        return self.rng.randint(1, 3)

    def roll_value(self, value: int | str) -> int:
        if isinstance(value, int):
            return value

        text = str(value).strip().lower()
        if text.isdigit():
            return int(text)

        match = re.fullmatch(r"(\d+)?d([36])(?:\+(\d+))?", text)
        if match:
            dice_count = int(match.group(1) or "1")
            die_sides = int(match.group(2))
            modifier = int(match.group(3) or "0")
            roll = 0
            for _ in range(dice_count):
                roll += self.d3_die_roll() if die_sides == 3 else self.die_roll()
            return roll + modifier

        raise CombatSimulationError(f"Unsupported roll profile: {value}")

    @staticmethod
    def get_distance_inches(start: dict[str, Any], end: dict[str, Any]) -> float:
        return math.hypot(float(end["x"]) - float(start["x"]), float(end["y"]) - float(start["y"]))

    @staticmethod
    def get_base_radius_inches(model: dict[str, Any]) -> float:
        return float(model.get("base_diameter", model.get("baseInches", 0))) / 2

    @staticmethod
    def get_point_on_base(
        model: dict[str, Any],
        angle_radians: float,
        inset_inches: float = 0,
    ) -> dict[str, float]:
        radius = max(0.0, CombatSimulator.get_base_radius_inches(model) - inset_inches)
        return {
            "x": float(model["x"]) + math.cos(angle_radians) * radius,
            "y": float(model["y"]) + math.sin(angle_radians) * radius,
            "z": float(model.get("z", 0)),
        }

    @classmethod
    def line_intersects_model_base(
        cls,
        line_start: dict[str, Any],
        line_end: dict[str, Any],
        model: dict[str, Any],
        line_width: float = 1 / 25.4,
    ) -> bool:
        clearance = cls.get_segment_point_distance_inches(line_start, line_end, model)
        return clearance < cls.get_base_radius_inches(model) + (line_width / 2) - 1e-9

    @classmethod
    def line_of_sight_exists(
        cls,
        observing_model: dict[str, Any],
        observed_model: dict[str, Any],
        blocking_models: list[dict[str, Any]] | None = None,
        line_width: float = 1 / 25.4,
        sample_count: int = 16,
    ) -> dict[str, Any]:
        blockers = blocking_models or []
        sample_angles = [
            (2 * math.pi * index) / max(1, sample_count)
            for index in range(max(1, sample_count))
        ]
        sample_angles.append(0)

        checked_lines = 0
        clear_lines = 0
        blocked_lines = 0
        for start_angle in sample_angles:
            line_start = cls.get_point_on_base(observing_model, start_angle, line_width / 2)
            for end_angle in sample_angles:
                checked_lines += 1
                line_end = cls.get_point_on_base(observed_model, end_angle, line_width / 2)
                if any(
                    cls.line_intersects_model_base(line_start, line_end, blocker, line_width)
                    for blocker in blockers
                ):
                    blocked_lines += 1
                    continue
                clear_lines += 1

        return {
            "visible": clear_lines > 0,
            "fully_visible": checked_lines > 0 and blocked_lines == 0,
            "checked_lines": checked_lines,
            "clear_lines": clear_lines,
            "blocked_lines": blocked_lines,
            "line_width": line_width,
            "terrain_rules_not_applied": True,
        }

    @staticmethod
    def get_vertical_distance_inches(start: dict[str, Any], end: dict[str, Any]) -> float:
        return abs(float(end.get("z", 0)) - float(start.get("z", 0)))

    @classmethod
    def models_are_within_range(
        cls,
        model: dict[str, Any],
        other_model: dict[str, Any],
        horizontal_range: float,
        vertical_range: float,
    ) -> bool:
        model_radius = float(model.get("base_diameter", 0)) / 2
        other_model_radius = float(other_model.get("base_diameter", 0)) / 2
        horizontal_gap = max(0.0, cls.get_distance_inches(model, other_model) - model_radius - other_model_radius)
        return (
            horizontal_gap <= float(horizontal_range) + 1e-9
            and cls.get_vertical_distance_inches(model, other_model) <= float(vertical_range) + 1e-9
        )

    @classmethod
    def model_is_within_battlefield(
        cls,
        model: dict[str, Any],
        battlefield_width: float,
        battlefield_height: float,
    ) -> bool:
        base_radius = float(model.get("base_diameter", 0)) / 2
        model_x = float(model["x"])
        model_y = float(model["y"])
        return (
            model_x - base_radius >= 0
            and model_x + base_radius <= float(battlefield_width)
            and model_y - base_radius >= 0
            and model_y + base_radius <= float(battlefield_height)
        )

    @classmethod
    def get_engaged_model_indexes(
        cls,
        models: list[dict[str, Any]],
        enemy_models: list[dict[str, Any]],
    ) -> list[int]:
        engaged_indexes: list[int] = []
        for index, model in enumerate(models):
            if any(cls.models_are_within_range(model, enemy_model, 2, 5) for enemy_model in enemy_models):
                engaged_indexes.append(index)
        return engaged_indexes

    @classmethod
    def validate_unit_coherency(cls, models: list[dict[str, Any]]) -> dict[str, Any]:
        if len(models) <= 1:
            return {
                "valid": True,
                "violations": [],
                "model_results": [
                    {
                        "index": index,
                        "within_2_and_5_of_another": True,
                        "within_9_and_5_of_all_others": True,
                    }
                    for index, _ in enumerate(models)
                ],
            }

        model_results: list[dict[str, Any]] = []
        violating_indexes: list[int] = []
        for index, model in enumerate(models):
            other_models = [
                other_model
                for other_index, other_model in enumerate(models)
                if other_index != index
            ]
            near_another = any(cls.models_are_within_range(model, other_model, 2, 5) for other_model in other_models)
            near_all = all(cls.models_are_within_range(model, other_model, 9, 5) for other_model in other_models)
            if not near_another or not near_all:
                violating_indexes.append(index)
            model_results.append({
                "index": index,
                "within_2_and_5_of_another": near_another,
                "within_9_and_5_of_all_others": near_all,
            })

        violations: list[str] = []
        if any(not result["within_2_and_5_of_another"] for result in model_results):
            violations.append("not_within_2_horizontal_5_vertical_of_another_model")
        if any(not result["within_9_and_5_of_all_others"] for result in model_results):
            violations.append("not_within_9_horizontal_5_vertical_of_every_model")

        return {
            "valid": not violations,
            "violations": violations,
            "violating_model_indexes": violating_indexes,
            "model_results": model_results,
        }

    @classmethod
    def validate_unit_engagement(
        cls,
        models: list[dict[str, Any]],
        enemy_models: list[dict[str, Any]],
    ) -> dict[str, Any]:
        engaged_model_indexes = cls.get_engaged_model_indexes(models, enemy_models)
        return {
            "engaged": bool(engaged_model_indexes),
            "unengaged": not engaged_model_indexes,
            "engaged_model_indexes": engaged_model_indexes,
        }

    @classmethod
    def validate_unit_setup(
        cls,
        models: list[dict[str, Any]],
        enemy_models: list[dict[str, Any]],
        battlefield_width: float,
        battlefield_height: float,
        other_requirements_met: bool = True,
    ) -> dict[str, Any]:
        coherency = cls.validate_unit_coherency(models)
        engagement = cls.validate_unit_engagement(models, enemy_models)
        off_battlefield_indexes = [
            index
            for index, model in enumerate(models)
            if not cls.model_is_within_battlefield(model, battlefield_width, battlefield_height)
        ]

        violations: list[str] = []
        if not models:
            violations.append("no_models")
        if off_battlefield_indexes:
            violations.append("models_outside_battlefield")
        if not coherency["valid"]:
            violations.append("unit_not_in_coherency")
        if not engagement["unengaged"]:
            violations.append("unit_engaged")
        if not other_requirements_met:
            violations.append("other_requirements_not_met")

        return {
            "valid": not violations,
            "can_set_up": not violations,
            "violations": violations,
            "coherency": coherency,
            "engagement": engagement,
            "off_battlefield_model_indexes": off_battlefield_indexes,
            "return_to_original_position": bool(violations),
        }

    @classmethod
    def get_regain_coherency_removals(cls, models: list[dict[str, Any]]) -> dict[str, Any]:
        remaining_models = list(models)
        removed_models: list[dict[str, Any]] = []
        removed_indexes: list[int] = []
        original_indexes = list(range(len(models)))

        while len(remaining_models) > 1:
            coherency = cls.validate_unit_coherency(remaining_models)
            if coherency["valid"]:
                break

            violating_indexes = coherency.get("violating_model_indexes", [])
            remove_index = violating_indexes[0] if violating_indexes else len(remaining_models) - 1
            removed_models.append(remaining_models.pop(remove_index))
            removed_indexes.append(original_indexes.pop(remove_index))

        return {
            "coherent": cls.validate_unit_coherency(remaining_models)["valid"],
            "remaining_models": remaining_models,
            "removed_models": removed_models,
            "removed_model_indexes": removed_indexes,
            "removed_models_are_destroyed": True,
            "triggers_destroyed_rules": False,
        }

    @staticmethod
    def get_segment_point_distance_inches(
        segment_start: dict[str, Any],
        segment_end: dict[str, Any],
        point: dict[str, Any],
    ) -> float:
        start_x = float(segment_start["x"])
        start_y = float(segment_start["y"])
        end_x = float(segment_end["x"])
        end_y = float(segment_end["y"])
        point_x = float(point["x"])
        point_y = float(point["y"])
        dx = end_x - start_x
        dy = end_y - start_y
        segment_length_squared = (dx * dx) + (dy * dy)
        if segment_length_squared <= 0:
            return math.hypot(point_x - start_x, point_y - start_y)

        projection = ((point_x - start_x) * dx + (point_y - start_y) * dy) / segment_length_squared
        projection = max(0.0, min(1.0, projection))
        closest_x = start_x + projection * dx
        closest_y = start_y + projection * dy
        return math.hypot(point_x - closest_x, point_y - closest_y)

    @classmethod
    def validate_model_move(
        cls,
        start: dict[str, Any],
        end: dict[str, Any],
        base_diameter: float,
        maximum_distance: float,
        battlefield_width: float,
        battlefield_height: float,
        enemy_models: list[dict[str, Any]] | None = None,
        friendly_models: list[dict[str, Any]] | None = None,
        move_type: str = "normal",
        advance_roll: int = 0,
        unit_engaged_before: bool = False,
        unit_battle_shocked: bool = False,
        fall_back_mode: str | None = None,
    ) -> dict[str, Any]:
        del friendly_models
        normalized_move_type = str(move_type or "normal").strip().lower().replace("-", "_").replace(" ", "_")
        normalized_fall_back_mode = str(fall_back_mode or "").strip().lower().replace("-", "_").replace(" ", "_")
        base_radius = float(base_diameter) / 2
        distance_moved = cls.get_distance_inches(start, end)
        effective_maximum_distance = float(maximum_distance)
        if normalized_move_type == "advance":
            effective_maximum_distance += int(advance_roll or 0)
        elif normalized_move_type == "remain_stationary":
            effective_maximum_distance = 0

        violations: list[str] = []

        if distance_moved > effective_maximum_distance + 1e-9:
            violations.append("maximum_distance")

        if normalized_move_type == "remain_stationary" and distance_moved > 1e-9:
            violations.append("remain_stationary_moved")

        if normalized_move_type in {"normal", "advance"} and unit_engaged_before:
            violations.append("must_be_unengaged_before")

        if normalized_move_type == "fall_back" and not unit_engaged_before:
            violations.append("must_be_engaged_before")

        if normalized_move_type == "fall_back" and normalized_fall_back_mode == "ordered_retreat" and unit_battle_shocked:
            violations.append("ordered_retreat_requires_not_battle_shocked")

        end_x = float(end["x"])
        end_y = float(end["y"])
        if (
            end_x - base_radius < 0
            or end_x + base_radius > float(battlefield_width)
            or end_y - base_radius < 0
            or end_y + base_radius > float(battlefield_height)
        ):
            violations.append("battlefield_edge")

        can_move_through_enemy_models = (
            normalized_move_type == "fall_back"
            and normalized_fall_back_mode == "desperate_escape"
        )
        for enemy_model in enemy_models or []:
            enemy_position = enemy_model.get("position", enemy_model)
            enemy_radius = float(enemy_model.get("base_diameter", 0)) / 2
            minimum_clearance = base_radius + enemy_radius
            path_clearance = cls.get_segment_point_distance_inches(start, end, enemy_position)
            end_clearance = cls.get_distance_inches(end, enemy_position)
            path_crosses_enemy = path_clearance < minimum_clearance - 1e-9
            ends_on_enemy = end_clearance < minimum_clearance - 1e-9
            if (path_crosses_enemy and not can_move_through_enemy_models) or ends_on_enemy:
                violations.append("enemy_model")
                break

        return {
            "valid": not violations,
            "move_type": normalized_move_type,
            "fall_back_mode": normalized_fall_back_mode or None,
            "distance_moved": distance_moved,
            "maximum_distance": effective_maximum_distance,
            "rotation_counts_toward_distance": False,
            "can_move_through_friendly_models": True,
            "can_move_through_enemy_models": can_move_through_enemy_models,
            "violations": violations,
            "selected_to_move": True,
            "eligible_to_shoot_after": normalized_move_type not in {"fall_back"},
            "eligible_to_charge_after": normalized_move_type not in {"advance", "fall_back"},
            "eligible_to_start_action_after": normalized_move_type not in {"advance", "fall_back"},
            "hazard_rolls_per_model": 1 if (
                normalized_move_type == "fall_back"
                and normalized_fall_back_mode == "desperate_escape"
            ) else 0,
            "battle_shock_roll_after": (
                normalized_move_type == "fall_back"
                and normalized_fall_back_mode == "desperate_escape"
                and not unit_battle_shocked
            ),
            "after_moving": {
                "unit_coherency_required": True,
                "terrain_surface_clearance_required": True,
                "stated_conditions_required": True,
            },
        }

    @staticmethod
    def parse_leadership_characteristic(value: Any) -> int:
        text = str(value).strip()
        match = re.fullmatch(r"(\d+)\+?", text)
        if not match:
            raise CombatSimulationError(f"Unsupported Leadership characteristic: {value}")
        return int(match.group(1))

    @classmethod
    def get_leadership_characteristics(cls, unit: dict[str, Any]) -> list[int]:
        leadership_values: list[int] = []

        for profile in unit.get("target_profiles", []):
            if int(profile.get("models", 0)) <= 0:
                continue
            leadership = profile.get("leadership")
            if leadership is not None and leadership != "":
                leadership_values.append(cls.parse_leadership_characteristic(leadership))

        if not leadership_values:
            stats = unit.get("stats", {})
            leadership = stats.get("leadership")
            if leadership is not None and leadership != "":
                leadership_values.append(cls.parse_leadership_characteristic(leadership))

        if not leadership_values:
            raise CombatSimulationError(f"Unit '{unit.get('name', 'Unknown')}' has no Leadership characteristic.")

        return sorted(set(leadership_values))

    def make_leadership_roll(self, unit: dict[str, Any]) -> dict[str, Any]:
        dice = [self.die_roll(), self.die_roll()]
        total = sum(dice)
        leadership_values = self.get_leadership_characteristics(unit)
        return {
            "unit": unit.get("name", "Unknown"),
            "dice": dice,
            "total": total,
            "leadership_values": leadership_values,
            "success": any(total >= leadership for leadership in leadership_values),
        }

    def make_battle_shock_roll(self, unit: dict[str, Any]) -> dict[str, Any]:
        leadership_roll = self.make_leadership_roll(unit)
        battle_shocked = not bool(leadership_roll["success"])
        return {
            **leadership_roll,
            "battle_shocked": battle_shocked,
            "effects": self.get_battle_shock_effects(battle_shocked),
        }

    @staticmethod
    def get_unit_model_count(unit: dict[str, Any]) -> int:
        if unit.get("models") is not None:
            return max(0, int(unit.get("models", 0)))
        profile_count = sum(
            max(0, int(profile.get("models", 0)))
            for profile in unit.get("target_profiles", [])
        )
        return profile_count if profile_count > 0 else 1

    @staticmethod
    def get_unit_starting_model_count(unit: dict[str, Any]) -> int:
        for key in ("starting_models", "starting_model_count", "original_models"):
            if unit.get(key) is not None:
                return max(1, int(unit[key]))
        if unit.get("model_count") is not None:
            return max(1, int(unit["model_count"]))
        return max(1, CombatSimulator.get_unit_model_count(unit))

    @staticmethod
    def get_unit_remaining_wounds(unit: dict[str, Any]) -> int:
        for key in ("current_wounds", "remaining_wounds", "wounds_remaining"):
            if unit.get(key) is not None:
                return max(0, int(unit[key]))
        target_profiles = unit.get("target_profiles", [])
        if target_profiles:
            return sum(max(0, int(profile.get("current_wounds", profile.get("wounds", 0)))) for profile in target_profiles)
        return max(0, int(unit.get("wounds", 1)))

    @staticmethod
    def get_unit_starting_wounds(unit: dict[str, Any]) -> int:
        for key in ("starting_wounds", "wounds", "max_wounds"):
            if unit.get(key) is not None:
                return max(1, int(unit[key]))
        target_profiles = unit.get("target_profiles", [])
        if target_profiles:
            return max(1, sum(max(0, int(profile.get("wounds", profile.get("current_wounds", 0)))) for profile in target_profiles))
        return 1

    @classmethod
    def get_unit_strength_status(cls, unit: dict[str, Any]) -> dict[str, Any]:
        current_models = cls.get_unit_model_count(unit)
        starting_models = cls.get_unit_starting_model_count(unit)
        current_wounds = cls.get_unit_remaining_wounds(unit)
        starting_wounds = cls.get_unit_starting_wounds(unit)

        if starting_models <= 1:
            below_starting_strength = current_wounds < starting_wounds
            at_half_strength = current_wounds * 2 <= starting_wounds
            below_half_strength = current_wounds * 2 < starting_wounds
            basis = "wounds"
        else:
            below_starting_strength = current_models < starting_models
            at_half_strength = current_models * 2 <= starting_models
            below_half_strength = current_models * 2 < starting_models
            basis = "models"

        return {
            "basis": basis,
            "current_models": current_models,
            "starting_models": starting_models,
            "current_wounds": current_wounds,
            "starting_wounds": starting_wounds,
            "below_starting_strength": below_starting_strength,
            "at_half_strength": at_half_strength,
            "below_half_strength": below_half_strength,
            "at_or_below_half_strength": at_half_strength,
        }

    @classmethod
    def unit_is_at_or_below_half_strength(cls, unit: dict[str, Any]) -> bool:
        return bool(cls.get_unit_strength_status(unit)["at_or_below_half_strength"])

    @classmethod
    def command_phase_battle_shock_required(cls, unit: dict[str, Any]) -> bool:
        return bool(unit.get("battle_shocked", False)) or cls.unit_is_at_or_below_half_strength(unit)

    def resolve_command_phase(
        self,
        unit: dict[str, Any] | None = None,
        *,
        active_player_cp: int = 0,
        opponent_cp: int = 0,
        make_battle_shock_roll: bool = False,
    ) -> dict[str, Any]:
        active_player_cp_after = int(active_player_cp) + 1
        opponent_cp_after = int(opponent_cp) + 1
        result: dict[str, Any] = {
            "phase": "command",
            "steps": [
                {**sub_step}
                for phase in TURN_STRUCTURE_11TH_EDITION
                if phase["id"] == "command"
                for sub_step in phase.get("sub_steps", [])
            ],
            "command_points": {
                "active_player_before": int(active_player_cp),
                "opponent_before": int(opponent_cp),
                "active_player_after": active_player_cp_after,
                "opponent_after": opponent_cp_after,
                "gained_by_each_player": 1,
            },
        }

        if unit is None:
            result["battle_shock"] = {
                "unit_provided": False,
                "required": False,
            }
            return result

        started_battle_shocked = bool(unit.get("battle_shocked", False))
        strength_status = self.get_unit_strength_status(unit)
        at_or_below_half_strength = strength_status["at_or_below_half_strength"]
        required = started_battle_shocked or at_or_below_half_strength
        battle_shock: dict[str, Any] = {
            "unit_provided": True,
            "unit": unit.get("name", "Unknown"),
            "required": required,
            "started_battle_shocked": started_battle_shocked,
            "at_or_below_half_strength": at_or_below_half_strength,
            "current_models": strength_status["current_models"],
            "starting_models": strength_status["starting_models"],
            "current_wounds": strength_status["current_wounds"],
            "starting_wounds": strength_status["starting_wounds"],
            "strength_status": strength_status,
        }

        if required and make_battle_shock_roll:
            roll_result = self.make_battle_shock_roll(unit)
            self.apply_battle_shock_state(unit, bool(roll_result["battle_shocked"]))
            battle_shock["roll"] = roll_result
            battle_shock["unit_state"] = {
                "battle_shocked": unit["battle_shocked"],
                "objective_control": unit.get("stats", {}).get("objective_control"),
                "can_be_targeted_by_stratagems": unit["can_be_targeted_by_stratagems"],
                "eligible_to_start_action": unit["eligible_to_start_action"],
                "action_can_be_completed": unit["action_can_be_completed"],
            }
            if started_battle_shocked and not bool(roll_result["battle_shocked"]):
                battle_shock["recovered_from_battle_shock"] = True

        result["battle_shock"] = battle_shock
        return result

    @staticmethod
    def unit_has_ranged_weapon(unit: dict[str, Any]) -> bool:
        return any(str(weapon.get("range", "")).lower() != "melee" for weapon in unit.get("weapons", []))

    @staticmethod
    def unit_has_melee_weapon(unit: dict[str, Any]) -> bool:
        return any(str(weapon.get("range", "")).lower() == "melee" for weapon in unit.get("weapons", []))

    @staticmethod
    def validate_shooting_type(
        shooting_type: str,
        *,
        unit_on_battlefield: bool = True,
        selected_to_shoot_this_phase: bool = False,
        unit_engaged: bool = False,
        advanced_this_turn: bool = False,
        has_assault_weapons: bool = False,
        has_close_quarters_weapons: bool = False,
        has_indirect_fire_weapons: bool = False,
        unit_is_monster_vehicle: bool = False,
        remained_stationary: bool = False,
        target_visible_to_friendly_unit: bool = False,
    ) -> dict[str, Any]:
        normalized_shooting_type = str(shooting_type or "normal").strip().lower().replace("-", "_").replace(" ", "_")
        if normalized_shooting_type == "normal_shooting":
            normalized_shooting_type = "normal"

        violations: list[str] = []
        if not unit_on_battlefield:
            violations.append("unit_not_on_battlefield")
        if selected_to_shoot_this_phase:
            violations.append("already_selected_to_shoot")

        details_pending = False
        if normalized_shooting_type == "normal":
            if unit_engaged:
                violations.append("must_be_unengaged")
            if advanced_this_turn:
                violations.append("advanced_this_turn")
        elif normalized_shooting_type == "assault":
            if unit_engaged:
                violations.append("must_be_unengaged")
            if not advanced_this_turn:
                violations.append("must_have_advanced_this_turn")
            if not has_assault_weapons:
                violations.append("requires_assault_weapons")
        elif normalized_shooting_type == "close_quarters":
            if not unit_engaged:
                violations.append("must_be_engaged")
            if advanced_this_turn:
                violations.append("advanced_this_turn")
            if not has_close_quarters_weapons and not unit_is_monster_vehicle:
                violations.append("requires_close_quarters_or_monster_vehicle")
        elif normalized_shooting_type == "indirect":
            if unit_engaged:
                violations.append("must_be_unengaged")
            if advanced_this_turn:
                violations.append("advanced_this_turn")
            if not has_indirect_fire_weapons:
                violations.append("requires_indirect_fire_weapons")
        else:
            violations.append("unknown_shooting_type")

        indirect_restrictions_apply = (
            normalized_shooting_type == "indirect"
            and not (remained_stationary and target_visible_to_friendly_unit)
        )

        return {
            "shooting_type": normalized_shooting_type,
            "eligible": not violations,
            "selected_to_shoot": not violations,
            "violations": violations,
            "details_pending": details_pending,
            "eligible_to_start_action_after": False if normalized_shooting_type in {
                "normal",
                "assault",
                "close_quarters",
                "indirect",
            } and not violations else None,
            "after_shooting": {
                "not_eligible_to_start_action_until_end_of_phase": normalized_shooting_type in {
                    "normal",
                    "assault",
                    "close_quarters",
                    "indirect",
                } and not violations,
            },
            "while_shooting": {
                "assault_weapons_only": normalized_shooting_type == "assault" and not violations,
                "can_target_engaged_units": normalized_shooting_type == "close_quarters" and not violations,
                "non_monster_vehicle_close_quarters_weapons_only": (
                    normalized_shooting_type == "close_quarters"
                    and not unit_is_monster_vehicle
                    and not violations
                ),
                "indirect_can_target_non_visible_units": normalized_shooting_type == "indirect" and not violations,
                "indirect_target_has_cover": indirect_restrictions_apply and not violations,
                "indirect_hit_rolls_cannot_be_rerolled": indirect_restrictions_apply and not violations,
                "indirect_unmodified_hit_rolls_1_to_5_fail": indirect_restrictions_apply and not violations,
            },
        }

    def resolve_charge(
        self,
        *,
        distance_to_enemy: float,
        charge_target_distances: list[float] | None = None,
        unit_on_battlefield: bool = True,
        declared_charge_this_phase: bool = False,
        unit_engaged: bool = False,
        advanced_this_turn: bool = False,
        fell_back_this_turn: bool = False,
        target_count: int = 1,
        attempted_charge_move: bool = True,
        all_models_ended_closer: bool = True,
        models_within_one_if_possible: bool = True,
        models_engaged_if_possible: bool = True,
        all_charge_targets_engaged_after: bool = True,
        engaged_with_non_charge_targets_after: bool = False,
    ) -> dict[str, Any]:
        target_distances = [
            float(distance)
            for distance in (charge_target_distances or [distance_to_enemy])
        ]
        distance = min(target_distances) if target_distances else float(distance_to_enemy)
        selected_target_count = int(target_count) if target_count is not None else len(target_distances)
        selected_target_count = max(selected_target_count, len(target_distances))
        violations: list[str] = []
        if not unit_on_battlefield:
            violations.append("unit_not_on_battlefield")
        if declared_charge_this_phase:
            violations.append("already_declared_charge")
        if not target_distances or min(target_distances) > 12 + 1e-9:
            violations.append("no_enemy_within_12")
        if unit_engaged:
            violations.append("unit_engaged")
        if advanced_this_turn:
            violations.append("advanced_this_turn")
        if fell_back_this_turn:
            violations.append("fell_back_this_turn")
        if selected_target_count < 1:
            violations.append("no_charge_targets")
        for target_distance in target_distances:
            if target_distance > 12 + 1e-9:
                violations.append("charge_target_not_within_12")
                break

        eligible = not violations
        required_distances = [max(0.0, target_distance - 2) for target_distance in target_distances]
        required_distance = max(required_distances) if required_distances else max(0.0, distance - 2)
        dice = [self.die_roll(), self.die_roll()]
        total = sum(dice)
        charge_successful = eligible and total + 1e-9 >= required_distance
        charge_move_violations: list[str] = []
        if charge_successful and attempted_charge_move:
            if not all_models_ended_closer:
                charge_move_violations.append("models_must_end_closer_to_charge_targets")
            if not models_within_one_if_possible:
                charge_move_violations.append("models_must_end_within_1_if_possible")
            if not models_engaged_if_possible:
                charge_move_violations.append("models_must_end_engaged_if_possible")
            if not all_charge_targets_engaged_after:
                charge_move_violations.append("must_engage_all_charge_targets")
            if engaged_with_non_charge_targets_after:
                charge_move_violations.append("cannot_engage_non_charge_targets")
        charge_move_successful = charge_successful and not charge_move_violations
        return {
            "eligible": eligible,
            "declares_charge": eligible,
            "violations": violations,
            "dice": dice,
            "total": total,
            "maximum_charge_distance": total,
            "distance_to_enemy": distance,
            "charge_target_distances": target_distances,
            "required_distance_to_engagement_range": required_distance,
            "required_distances_to_engagement_range": required_distances,
            "engagement_range": {"horizontal": 2, "vertical": 5},
            "charge_successful": charge_successful,
            "can_make_charge_move": charge_successful and not charge_move_violations,
            "charged_this_turn": eligible,
            "failed_charge": eligible and (not charge_successful or bool(charge_move_violations)),
            "charge_move": {
                "attempted": bool(attempted_charge_move) and charge_successful,
                "successful": charge_move_successful,
                "violations": charge_move_violations,
                "must_end_closer_to_charge_targets": True,
                "must_end_within_1_if_possible": True,
                "must_end_engaged_if_possible": True,
                "must_engage_all_charge_targets": True,
                "cannot_engage_non_charge_targets": True,
                "fights_first_until_end_of_turn": charge_move_successful,
            },
        }

    @staticmethod
    def validate_pile_in_move(
        *,
        start_distance_to_closest_target: float,
        end_distance_to_closest_target: float,
        distance_moved: float,
        is_fight_phase: bool = True,
        unit_engaged: bool = False,
        made_charge_move_this_turn: bool = False,
        selected_to_make_overwatching_fight: bool = False,
        pile_in_target_within_5: bool = False,
        model_in_base_contact: bool = False,
        model_moved: bool = True,
        model_ended_engaged_if_possible: bool = True,
        unit_engaged_after: bool = True,
        started_engaged_enemy_still_engaged: bool = True,
    ) -> dict[str, Any]:
        violations: list[str] = []
        eligible_reason = None
        if not is_fight_phase:
            violations.append("not_fight_phase")
        if unit_engaged:
            eligible_reason = "unit_engaged"
        elif made_charge_move_this_turn:
            eligible_reason = "made_charge_move"
        elif selected_to_make_overwatching_fight:
            eligible_reason = "overwatching_fight"
        else:
            violations.append("not_eligible_to_pile_in")

        if not unit_engaged and not pile_in_target_within_5:
            violations.append("pile_in_target_not_within_5")
        if distance_moved > 3 + 1e-9:
            violations.append("maximum_distance")
        if model_in_base_contact and model_moved:
            violations.append("base_contact_model_cannot_move")
        if model_moved and end_distance_to_closest_target >= start_distance_to_closest_target - 1e-9:
            violations.append("must_end_closer_to_closest_pile_in_target")
        if not model_ended_engaged_if_possible:
            violations.append("must_end_engaged_if_possible")
        if not unit_engaged_after:
            violations.append("unit_must_be_engaged_after")
        if unit_engaged and not started_engaged_enemy_still_engaged:
            violations.append("started_engaged_enemy_must_remain_engaged")

        return {
            "eligible": "not_fight_phase" not in violations and "not_eligible_to_pile_in" not in violations,
            "eligible_reason": eligible_reason,
            "valid": not violations,
            "violations": violations,
            "maximum_distance": 3,
            "distance_moved": float(distance_moved),
            "before_moving": {
                "pile_in_targets": "all_engaged_enemy_units" if unit_engaged else "enemy_units_within_5",
            },
            "while_moving": {
                "base_contact_models_can_move": False,
                "must_end_closer_to_closest_pile_in_target": True,
                "must_end_engaged_if_possible": True,
            },
            "after_moving": {
                "unit_must_be_engaged": True,
                "started_engaged_enemy_must_remain_engaged": unit_engaged,
            },
        }

    @staticmethod
    def validate_fight_type(
        fight_type: str,
        *,
        selected_to_fight_this_phase: bool = False,
        unit_engaged: bool = False,
        unit_was_engaged_at_start_of_fight_step: bool = False,
        made_charge_move_this_turn: bool = False,
        became_engaged_during_fight_phase: bool = False,
        has_fights_first: bool = False,
        resolving_fights_first: bool = False,
        resolving_remaining_combats: bool = True,
    ) -> dict[str, Any]:
        normalized_fight_type = str(fight_type or "normal").strip().lower().replace("-", "_").replace(" ", "_")
        if normalized_fight_type == "normal_fight":
            normalized_fight_type = "normal"
        if normalized_fight_type == "overrun_fight":
            normalized_fight_type = "overrun"

        violations: list[str] = []
        if selected_to_fight_this_phase:
            violations.append("already_selected_to_fight")

        eligible_to_fight = (
            unit_engaged
            or unit_was_engaged_at_start_of_fight_step
            or made_charge_move_this_turn
        )
        if not eligible_to_fight:
            violations.append("not_eligible_to_fight")

        if normalized_fight_type == "normal":
            if not unit_engaged:
                violations.append("normal_fight_requires_engaged")
        elif normalized_fight_type == "overrun":
            overrun_eligible = (not unit_engaged) or (
                not unit_was_engaged_at_start_of_fight_step
                and became_engaged_during_fight_phase
            )
            if not overrun_eligible:
                violations.append("overrun_requires_unengaged_or_newly_engaged")
        else:
            violations.append("unknown_fight_type")

        if has_fights_first and resolving_remaining_combats:
            phase_priority = "fights_first"
        elif resolving_fights_first:
            phase_priority = "fights_first"
        else:
            phase_priority = "remaining_combats"

        return {
            "fight_type": normalized_fight_type,
            "eligible_to_fight": eligible_to_fight and "already_selected_to_fight" not in violations,
            "eligible": not violations,
            "selected_to_fight": not violations,
            "violations": violations,
            "phase_priority": phase_priority,
            "has_fights_first": bool(has_fights_first),
            "allows_additional_pile_in": normalized_fight_type == "overrun" and not violations,
            "sequence": {
                "resolve_fights_first_first": True,
                "players_alternate_in_fights_first": True,
                "players_alternate_in_remaining_combats": True,
                "return_to_fights_first_if_new_units_become_eligible": True,
            },
        }

    @staticmethod
    def validate_consolidate_move(
        *,
        consolidation_mode: str,
        distance_moved: float,
        is_fight_phase: bool = True,
        eligible_to_fight_this_phase: bool = False,
        unit_engaged: bool = False,
        enemy_unit_within_3: bool = False,
        objective_within_3: bool = False,
        selected_enemy_units_count: int = 0,
        selected_objective: bool = False,
        model_in_base_contact: bool = False,
        model_moved: bool = True,
        moved_model_ended_closer_to_selected_enemy: bool = True,
        moved_model_ended_engaged_if_possible: bool = True,
        moved_model_ended_within_objective_if_possible: bool = True,
        moved_model_ended_closer_to_objective: bool = True,
        started_engaged_enemy_still_engaged: bool = True,
        all_selected_enemy_units_engaged_after: bool = True,
        engaged_enemy_units_unselected_to_fight: bool = False,
        selected_objective_in_range_after: bool = True,
    ) -> dict[str, Any]:
        mode = str(consolidation_mode or "").strip().lower().replace("-", "_").replace(" ", "_")
        violations: list[str] = []
        if not is_fight_phase:
            violations.append("not_fight_phase")
        if not eligible_to_fight_this_phase:
            violations.append("unit_was_not_eligible_to_fight")
        if distance_moved > 3 + 1e-9:
            violations.append("maximum_distance")

        if unit_engaged and mode != "ongoing":
            violations.append("must_select_ongoing_consolidation")
        elif not unit_engaged and enemy_unit_within_3 and mode != "engaging":
            violations.append("must_select_engaging_consolidation")
        elif not unit_engaged and not enemy_unit_within_3 and objective_within_3 and mode != "objective":
            violations.append("must_select_objective_consolidation")
        elif not unit_engaged and not enemy_unit_within_3 and not objective_within_3:
            violations.append("no_consolidation_mode_available")

        if mode == "ongoing":
            if not unit_engaged:
                violations.append("ongoing_requires_engaged")
            if selected_enemy_units_count < 1:
                violations.append("no_selected_enemy_units")
            if model_in_base_contact and model_moved:
                violations.append("base_contact_model_cannot_move")
            if not moved_model_ended_closer_to_selected_enemy:
                violations.append("must_end_closer_to_selected_enemy")
            if not moved_model_ended_engaged_if_possible:
                violations.append("must_end_engaged_if_possible")
            if not started_engaged_enemy_still_engaged:
                violations.append("started_engaged_enemy_must_remain_engaged")
        elif mode == "engaging":
            if unit_engaged:
                violations.append("engaging_requires_unengaged")
            if not enemy_unit_within_3:
                violations.append("engaging_requires_enemy_within_3")
            if selected_enemy_units_count < 1:
                violations.append("no_selected_enemy_units")
            if not moved_model_ended_closer_to_selected_enemy:
                violations.append("must_end_closer_to_selected_enemy")
            if not moved_model_ended_engaged_if_possible:
                violations.append("must_end_engaged_if_possible")
            if not all_selected_enemy_units_engaged_after:
                violations.append("must_engage_all_selected_enemy_units")
        elif mode == "objective":
            if unit_engaged:
                violations.append("objective_requires_unengaged")
            if enemy_unit_within_3:
                violations.append("objective_unavailable_if_enemy_within_3")
            if not objective_within_3:
                violations.append("objective_requires_objective_within_3")
            if not selected_objective:
                violations.append("no_selected_objective")
            if not moved_model_ended_within_objective_if_possible:
                violations.append("must_end_within_objective_if_possible")
            if not moved_model_ended_closer_to_objective:
                violations.append("must_end_closer_to_objective")
            if not selected_objective_in_range_after:
                violations.append("must_end_within_selected_objective")
        else:
            violations.append("unknown_consolidation_mode")

        return {
            "consolidation_mode": mode,
            "eligible": is_fight_phase and eligible_to_fight_this_phase,
            "valid": not violations,
            "violations": violations,
            "maximum_distance": 3,
            "distance_moved": float(distance_moved),
            "opponent_must_select_newly_engaged_units": (
                mode == "engaging"
                and bool(engaged_enemy_units_unselected_to_fight)
                and "must_engage_all_selected_enemy_units" not in violations
            ),
            "before_moving": {
                "selects_engaged_enemy_units": mode == "ongoing",
                "selects_enemy_units_within_3": mode == "engaging",
                "selects_objective_within_3": mode == "objective",
            },
            "while_moving": {
                "base_contact_models_can_move": False if mode == "ongoing" else None,
                "must_end_closer_to_selected_enemy": mode in {"ongoing", "engaging"},
                "must_end_engaged_if_possible": mode in {"ongoing", "engaging"},
                "must_end_within_or_closer_to_objective": mode == "objective",
            },
            "after_moving": {
                "started_engaged_enemy_must_remain_engaged": mode == "ongoing",
                "must_engage_all_selected_enemy_units": mode == "engaging",
                "must_be_within_selected_objective": mode == "objective",
            },
        }

    @staticmethod
    def get_battle_shock_effects(battle_shocked: bool) -> dict[str, Any]:
        return {
            "objective_control": "-" if battle_shocked else None,
            "can_be_targeted_by_stratagems": not battle_shocked,
            "eligible_to_start_action": not battle_shocked,
            "action_can_be_completed": not battle_shocked,
        }

    @classmethod
    def apply_battle_shock_state(cls, unit: dict[str, Any], battle_shocked: bool) -> dict[str, Any]:
        unit["battle_shocked"] = bool(battle_shocked)
        unit["can_be_targeted_by_stratagems"] = not battle_shocked
        unit["eligible_to_start_action"] = not battle_shocked
        unit["action_can_be_completed"] = not battle_shocked

        stats = unit.get("stats")
        if isinstance(stats, dict) and "_original_objective_control" not in stats:
            stats["_original_objective_control"] = stats.get("objective_control")
        for profile in unit.get("target_profiles", []):
            if "_original_objective_control" not in profile:
                profile["_original_objective_control"] = profile.get("objective_control")

        if not battle_shocked:
            if isinstance(stats, dict):
                stats["objective_control"] = stats.get("_original_objective_control", stats.get("objective_control"))
            for profile in unit.get("target_profiles", []):
                profile["objective_control"] = profile.get(
                    "_original_objective_control",
                    profile.get("objective_control"),
                )
            return unit

        if isinstance(stats, dict):
            stats["objective_control"] = "-"

        for profile in unit.get("target_profiles", []):
            profile["objective_control"] = "-"

        return unit

    @staticmethod
    def combine_feel_no_pain_values(current_value: int, new_value: int) -> int:
        if current_value <= 0:
            return new_value
        if new_value <= 0:
            return current_value
        return min(current_value, new_value)

    @staticmethod
    def combine_invulnerable_save_values(current_value: int, new_value: int) -> int:
        if current_value <= 0:
            return new_value
        if new_value <= 0:
            return current_value
        return min(current_value, new_value)

    @staticmethod
    def get_keyword_aliases(keyword: str) -> set[str]:
        normalized_keyword = str(keyword)
        alias_map = {
            "LH": {"LH", "Lethal Hits"},
            "DW": {"DW", "Devastating Wounds"},
            "SH1": {"SH1", "Sustained Hits 1"},
            "CLOSE-QUARTERS": {"CLOSE-QUARTERS", "Close-Quarters", "[CLOSE-QUARTERS]", "Pistol"},
            "Pistol": {"Pistol", "CLOSE-QUARTERS", "Close-Quarters", "[CLOSE-QUARTERS]"},
        }
        return alias_map.get(normalized_keyword, {normalized_keyword})

    def get_effective_weapon_keywords(
        self,
        weapon: dict[str, Any],
        attack_context: dict[str, Any] | None = None,
    ) -> list[str]:
        effective_keywords = list(weapon["keywords"])
        if attack_context is None:
            return effective_keywords

        effective_keywords.extend(attack_context.get("temporary_weapon_keywords", set()))

        if weapon["range"].lower() == "melee":
            effective_keywords.extend(attack_context.get("temporary_melee_weapon_keywords", set()))
        else:
            effective_keywords.extend(attack_context.get("temporary_ranged_weapon_keywords", set()))

        temporary_keywords_by_weapon_name = attack_context.get(
            "temporary_weapon_keywords_by_weapon_name",
            {},
        )
        normalized_weapon_name = self.normalize_wargear_name(weapon["name"])
        base_weapon_name = normalized_weapon_name.split(" - ", 1)[0]
        effective_keywords.extend(temporary_keywords_by_weapon_name.get(normalized_weapon_name, set()))
        effective_keywords.extend(temporary_keywords_by_weapon_name.get(base_weapon_name, set()))
        return effective_keywords

    def weapon_has_keyword(
        self,
        weapon: dict[str, Any],
        keyword: str,
        attack_context: dict[str, Any] | None = None,
    ) -> bool:
        keyword_aliases = {alias.lower() for alias in self.get_keyword_aliases(keyword)}
        for effective_keyword in self.get_effective_weapon_keywords(weapon, attack_context):
            normalized_keyword = str(effective_keyword).lower()
            if normalized_keyword in keyword_aliases:
                return True
            if any(normalized_keyword.startswith(f"{alias} ") for alias in keyword_aliases):
                return True
        return False

    def get_keyword_value(
        self,
        weapon: dict[str, Any],
        keyword_prefix: str,
        attack_context: dict[str, Any] | None = None,
    ) -> int:
        for keyword in self.get_effective_weapon_keywords(weapon, attack_context):
            match = re.fullmatch(rf"{re.escape(keyword_prefix)}\s+(\d+)", str(keyword), re.IGNORECASE)
            if match:
                return int(match.group(1))
        return 0

    @staticmethod
    def unit_has_keyword(unit: dict[str, Any], keyword: str) -> bool:
        normalized_keyword = keyword.lower()
        return any(str(unit_keyword).lower() == normalized_keyword for unit_keyword in unit.get("keywords", []))

    @staticmethod
    def get_roll_bounds(value: int | str) -> tuple[int, int]:
        if isinstance(value, int):
            return value, value

        text = str(value).strip().lower()
        if text.isdigit():
            numeric_value = int(text)
            return numeric_value, numeric_value

        match = re.fullmatch(r"(\d+)?d([36])(?:\+(\d+))?", text)
        if not match:
            return 0, 0

        dice_count = int(match.group(1) or "1")
        die_sides = int(match.group(2))
        modifier = int(match.group(3) or "0")
        return dice_count + modifier, (dice_count * die_sides) + modifier

    def get_sustained_hits_bonus(
        self,
        weapon: dict[str, Any],
        attack_context: dict[str, Any] | None = None,
    ) -> int:
        if self.weapon_has_keyword(weapon, "SH1", attack_context):
            return 1
        return self.get_keyword_value(weapon, "Sustained Hits", attack_context)

    @staticmethod
    def normalize_wargear_name(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value).strip().lower())

    def get_weapon_bearer_count(self, unit: dict[str, Any], weapon: dict[str, Any]) -> int:
        bearer_counts = unit.get("weapon_bearer_counts", {})
        if not bearer_counts:
            return max(1, int(unit.get("models", 1)))

        normalized_weapon_name = self.normalize_wargear_name(weapon["name"])
        base_weapon_name = normalized_weapon_name.split(" - ", 1)[0]
        bearer_count = max(
            int(bearer_counts.get(normalized_weapon_name, 0)),
            int(bearer_counts.get(base_weapon_name, 0)),
        )
        if bearer_count > 0:
            return bearer_count
        if int(unit.get("models", 1)) == 1:
            return 1
        return 1

    def get_used_hazardous_weapons(
        self,
        attacker_unit: dict[str, Any],
        selected_weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        used_weapons: list[dict[str, Any]] = []
        if self.weapon_has_keyword(selected_weapon, "Hazardous", attack_context):
            used_weapons.extend(
                selected_weapon
                for _ in range(self.get_weapon_bearer_count(attacker_unit, selected_weapon))
            )

        if selected_weapon["range"].lower() != "melee":
            return used_weapons

        for weapon in self.get_extra_attack_weapons(attacker_unit):
            if self.weapon_has_keyword(weapon, "Hazardous", attack_context):
                used_weapons.extend(
                    weapon
                    for _ in range(self.get_weapon_bearer_count(attacker_unit, weapon))
                )

        return used_weapons

    def attack_sequence_has_keyword(
        self,
        unit: dict[str, Any],
        selected_weapon: dict[str, Any],
        keyword: str,
        attack_context: dict[str, Any] | None = None,
    ) -> bool:
        if self.weapon_has_keyword(selected_weapon, keyword, attack_context):
            return True
        if selected_weapon["range"].lower() != "melee":
            return False
        return any(
            self.weapon_has_keyword(weapon, keyword, attack_context)
            for weapon in self.get_extra_attack_weapons(unit)
        )

    @staticmethod
    def get_effect_total(effects: list[dict[str, Any]], effect_type: str) -> int:
        return sum(
            effect.get("value", 0)
            for effect in effects
            if effect.get("type") == effect_type
        )

    @staticmethod
    def get_lowest_effect_value(effects: list[dict[str, Any]], effect_type: str) -> int:
        matching_values = [
            effect.get("value", 0)
            for effect in effects
            if effect.get("type") == effect_type and effect.get("value", 0) > 0
        ]
        if not matching_values:
            return 0
        return min(matching_values)

    @staticmethod
    def get_target_profile_sort_key(profile: dict[str, Any]) -> tuple[int, int, int]:
        effective_save = (
            profile["invulnerable_save"]
            if profile.get("invulnerable_save", 0) > 0
            else profile.get("armor_save", 7)
        )
        return (
            int(profile.get("wounds", 0)),
            int(profile.get("toughness", 0)),
            -int(effective_save),
        )

    def get_active_target_profile(self, target_state: dict[str, Any]) -> dict[str, Any]:
        profiles = target_state.get("profiles", [])
        for profile in profiles:
            if profile.get("models", 0) > 0:
                return profile
        return target_state

    def sync_target_state_profiles(self, target_state: dict[str, Any]) -> None:
        profiles = target_state.get("profiles", [])
        if not profiles:
            return

        target_state["models"] = sum(max(0, int(profile.get("models", 0))) for profile in profiles)
        active_profile = self.get_active_target_profile(target_state)
        if active_profile is target_state:
            target_state["current_wounds"] = 0
            target_state["toughness"] = 0
            target_state["wounds"] = 0
            target_state["armor_save"] = 0
            target_state["invulnerable_save"] = 0
            target_state["feel_no_pain"] = 0
            target_state["active_profile_name"] = ""
            return

        target_state["current_wounds"] = active_profile["current_wounds"]
        target_state["toughness"] = active_profile["toughness"]
        target_state["wounds"] = active_profile["wounds"]
        target_state["armor_save"] = active_profile["armor_save"]
        target_state["invulnerable_save"] = active_profile["invulnerable_save"]
        target_state["feel_no_pain"] = active_profile.get("feel_no_pain", 0)
        target_state["active_profile_name"] = active_profile["name"]
        if target_state.get("uses_attached_bodyguard_toughness", False):
            target_state["toughness"] = max(
                int(profile.get("toughness", 0))
                for profile in profiles
                if profile.get("models", 0) > 0
            )

    def get_precision_allocation_target(
        self,
        target_state: dict[str, Any],
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> dict[str, Any]:
        precision_target = attack_context.get("precision_target")
        if not self.weapon_has_keyword(weapon, "Precision"):
            return target_state
        if precision_target is None:
            return target_state
        if precision_target["models"] <= 0:
            return target_state
        return precision_target

    @staticmethod
    def unit_has_oath_of_moment(unit: dict[str, Any]) -> bool:
        for ability in unit.get("abilities", []):
            name = str(ability.get("name", "")).lower()
            rules_text = str(ability.get("rules_text", "")).lower()
            if "oath of moment" in name or "oath of moment" in rules_text:
                return True
        return False

    @staticmethod
    def unit_has_waaagh(unit: dict[str, Any]) -> bool:
        for ability in unit.get("abilities", []):
            name = str(ability.get("name", "")).lower()
            rules_text = str(ability.get("rules_text", "")).lower()
            if "waaagh!" in name or "waaagh!" in rules_text:
                return True
        return False

    @staticmethod
    def unit_has_ability(unit: dict[str, Any], ability_name: str) -> bool:
        normalized_ability_name = ability_name.lower()
        for ability_group in ("abilities", "wargear_abilities", "selectable_abilities"):
            for ability in unit.get(ability_group, []):
                name = str(ability.get("name", "")).lower()
                if normalized_ability_name in name:
                    return True
        return False

    @staticmethod
    def unit_ability_name_set(unit: dict[str, Any]) -> set[str]:
        names: set[str] = set()
        for ability_group in ("abilities", "wargear_abilities", "selectable_abilities"):
            for ability in unit.get(ability_group, []):
                name = str(ability.get("name", "")).strip().lower()
                if name:
                    names.add(name)
        return names

    @staticmethod
    def ability_names_include(ability_names: set[str], ability_name: str) -> bool:
        normalized_ability_name = ability_name.lower()
        return any(normalized_ability_name in name for name in ability_names)

    def unit_or_attached_has_ability(
        self,
        unit: dict[str, Any],
        attached_ability_names: set[str],
        ability_name: str,
    ) -> bool:
        normalized_ability_name = ability_name.lower()
        if self.unit_has_ability(unit, normalized_ability_name):
            return True
        return self.ability_names_include(attached_ability_names, normalized_ability_name)

    @staticmethod
    def weapon_base_name(weapon: dict[str, Any]) -> str:
        return CombatSimulator.normalize_wargear_name(weapon["name"]).split(" - ", 1)[-1]

    def unit_has_multiple_melee_weapons(self, unit: dict[str, Any]) -> bool:
        melee_weapons = [
            weapon
            for weapon in unit.get("weapons", {}).values()
            if str(weapon.get("range", "")).lower() == "melee"
        ]
        return len(melee_weapons) >= 2

    def target_state_has_ability(self, target_state: dict[str, Any], ability_name: str) -> bool:
        normalized_ability_name = ability_name.lower()
        for ability_name_value in target_state.get("ability_names", []):
            if normalized_ability_name in str(ability_name_value).lower():
                return True
        for profile in target_state.get("profiles", []):
            for ability_name_value in profile.get("ability_names", []):
                if normalized_ability_name in str(ability_name_value).lower():
                    return True
        return False

    def unit_gets_oath_wound_bonus(self, unit: dict[str, Any]) -> bool:
        unit_keywords = set(unit.get("keywords", []))
        return not any(keyword in unit_keywords for keyword in self.OATH_EXCLUDED_KEYWORDS)

    @staticmethod
    def get_to_wound_threshold(strength: int, toughness: int) -> int:
        if strength >= toughness * 2:
            return 2
        if strength > toughness:
            return 3
        if strength == toughness:
            return 4
        if strength * 2 <= toughness:
            return 6
        return 5

    @staticmethod
    def clamp_target_number(value: int) -> int:
        return max(2, min(6, value))

    def get_wound_roll_modifier(
        self,
        attacker_unit: dict[str, Any],
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> int:
        return (
            self.get_effect_total(attacker_unit.get("effects", []), "outgoing_wound_modifier")
            + self.get_effect_total(target_state.get("effects", []), "incoming_wound_modifier")
            + attack_context.get("attacker_outgoing_wound_modifier", 0)
            + attack_context.get("target_incoming_wound_modifier", 0)
            + attack_context.get("oath_of_moment_wound_bonus", 0)
        )

    def get_weapon_wound_bonus(
        self,
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> int:
        bonus = 0
        if attack_context.get("charged_this_turn", False) and self.weapon_has_keyword(weapon, "Lance", attack_context):
            bonus += 1
        return bonus

    @staticmethod
    def is_extra_attacks_weapon(weapon: dict[str, Any]) -> bool:
        return "Extra Attacks" in weapon["keywords"]

    @staticmethod
    def is_melee_weapon(weapon: dict[str, Any]) -> bool:
        return str(weapon.get("range", "")).lower() == "melee"

    @classmethod
    def is_ranged_weapon(cls, weapon: dict[str, Any]) -> bool:
        return not cls.is_melee_weapon(weapon)

    def get_selectable_weapons(self, unit: dict[str, Any]) -> list[dict[str, Any]]:
        return [
            weapon for weapon in unit["weapons"].values()
            if not self.is_extra_attacks_weapon(weapon)
        ]

    def get_extra_attack_weapons(self, unit: dict[str, Any]) -> list[dict[str, Any]]:
        return [
            weapon for weapon in unit["weapons"].values()
            if self.is_extra_attacks_weapon(weapon)
        ]

    def is_pistol_weapon(self, weapon: dict[str, Any], attack_context: dict[str, Any] | None = None) -> bool:
        return self.weapon_has_keyword(weapon, "Pistol", attack_context)

    def is_close_quarters_weapon(
        self,
        weapon: dict[str, Any],
        attack_context: dict[str, Any] | None = None,
    ) -> bool:
        return self.weapon_has_keyword(weapon, "CLOSE-QUARTERS", attack_context)

    @classmethod
    def get_weapons_for_attack_mode(
        cls,
        weapons: list[dict[str, Any]],
        attack_mode: str,
        include_extra_attacks: bool = False,
    ) -> list[dict[str, Any]]:
        normalized_mode = str(attack_mode).strip().lower()
        if normalized_mode == "shooting":
            return [weapon for weapon in weapons if cls.is_ranged_weapon(weapon)]
        if normalized_mode == "fighting":
            return [
                weapon
                for weapon in weapons
                if cls.is_melee_weapon(weapon)
                and (include_extra_attacks or not cls.is_extra_attacks_weapon(weapon))
            ]
        raise CombatSimulationError(f"Unsupported attack mode: {attack_mode}")

    @classmethod
    def validate_weapon_selection(
        cls,
        available_weapons: list[dict[str, Any]],
        selected_weapons: list[dict[str, Any]],
        attack_mode: str,
        strict_single_model: bool = False,
    ) -> dict[str, Any]:
        normalized_mode = str(attack_mode).strip().lower()
        valid_weapons = cls.get_weapons_for_attack_mode(available_weapons, normalized_mode)
        valid_weapon_names = {str(weapon.get("name", "")) for weapon in valid_weapons}
        selected_weapon_names = [str(weapon.get("name", "")) for weapon in selected_weapons]
        invalid_selected_weapon_names = [
            weapon_name
            for weapon_name in selected_weapon_names
            if weapon_name not in valid_weapon_names
        ]
        violations: list[str] = []

        if normalized_mode == "shooting":
            if not valid_weapons:
                violations.append("model_has_no_ranged_weapons")
            if invalid_selected_weapon_names:
                violations.append("selected_non_ranged_weapon")
        elif normalized_mode == "fighting":
            if not valid_weapons:
                violations.append("model_has_no_melee_weapons")
            if not selected_weapons:
                violations.append("must_select_one_melee_weapon")
            if invalid_selected_weapon_names:
                violations.append("selected_non_melee_weapon")
            if strict_single_model and len(selected_weapons) != 1:
                violations.append("must_select_exactly_one_melee_weapon")
        else:
            violations.append("unsupported_attack_mode")

        return {
            "valid": not violations,
            "attack_mode": normalized_mode,
            "violations": violations,
            "selected_weapon_names": selected_weapon_names,
            "invalid_selected_weapon_names": invalid_selected_weapon_names,
            "available_weapon_names": [weapon["name"] for weapon in valid_weapons],
            "model_can_make_attacks": bool(valid_weapons) and not invalid_selected_weapon_names,
            "selected_weapons_make_attacks": not violations and bool(selected_weapons),
        }

    @classmethod
    def weapon_has_close_quarters_keyword(cls, weapon: dict[str, Any]) -> bool:
        return any(
            str(keyword).strip().lower() in {"pistol", "close-quarters", "[close-quarters]"}
            for keyword in weapon.get("raw_keywords", weapon.get("keywords", []))
        )

    @classmethod
    def validate_weapon_targets(
        cls,
        weapon: dict[str, Any],
        attack_mode: str,
        targets: list[dict[str, Any]],
        target_selected: bool = True,
    ) -> dict[str, Any]:
        normalized_mode = str(attack_mode).strip().lower()
        violations: list[str] = []

        if normalized_mode == "shooting":
            if not target_selected or not targets:
                return {
                    "valid": True,
                    "attack_mode": normalized_mode,
                    "weapon_name": weapon.get("name", ""),
                    "selected_target_count": 0,
                    "violations": [],
                    "weapon_makes_attacks": False,
                }

            target = targets[0]
            if not bool(target.get("visible", False)):
                violations.append("target_not_visible")
            if not bool(target.get("within_range", False)):
                violations.append("target_not_within_range")
            if (
                bool(target.get("engaged", False))
                and not bool(target.get("engaged_target_allowed", False))
                and not cls.weapon_has_close_quarters_keyword(weapon)
            ):
                violations.append("target_engaged")
            if len(targets) > 1:
                violations.append("ranged_weapon_selects_more_than_one_target")

        elif normalized_mode == "fighting":
            if not targets:
                violations.append("no_melee_targets_selected")
            _, attacks_maximum = cls.get_roll_bounds(weapon.get("attacks", 0))
            if len(targets) > attacks_maximum:
                violations.append("too_many_melee_targets_for_attacks_characteristic")
            if any(not bool(target.get("engaged", False)) for target in targets):
                violations.append("melee_target_not_engaged")
        else:
            violations.append("unsupported_attack_mode")

        return {
            "valid": not violations,
            "attack_mode": normalized_mode,
            "weapon_name": weapon.get("name", ""),
            "selected_target_count": len(targets),
            "violations": violations,
            "weapon_makes_attacks": not violations,
        }

    @classmethod
    def get_identical_attack_key(
        cls,
        weapon: dict[str, Any],
        applicable_rules: list[str] | None = None,
    ) -> tuple[Any, ...]:
        return (
            str(weapon.get("skill_type", "")),
            int(weapon.get("skill", 0)),
            int(weapon.get("strength", 0)),
            int(weapon.get("ap", 0)),
            str(weapon.get("damage", "")),
            tuple(sorted(str(keyword) for keyword in weapon.get("keywords", []))),
            tuple(sorted(str(rule) for rule in applicable_rules or [])),
        )

    @classmethod
    def get_attack_dice_count_bounds(
        cls,
        weapon: dict[str, Any],
        declared_attacks: int | None = None,
    ) -> tuple[int, int]:
        if declared_attacks is not None:
            attack_count = int(declared_attacks)
            return attack_count, attack_count
        minimum_attacks, maximum_attacks = cls.get_roll_bounds(weapon.get("attacks", 0))
        selected_model_count = weapon.get("selected_model_count")
        if selected_model_count is None:
            return minimum_attacks, maximum_attacks
        model_count = max(0, int(selected_model_count))
        return minimum_attacks * model_count, maximum_attacks * model_count

    @classmethod
    def build_attack_resolution_plan(
        cls,
        weapon_targets: list[dict[str, Any]],
    ) -> dict[str, Any]:
        target_order: list[str] = []
        unresolved_by_target: dict[str, list[dict[str, Any]]] = {}
        skipped_weapons: list[dict[str, Any]] = []
        violations: list[str] = []
        melee_splits_by_weapon_name: dict[str, list[dict[str, Any]]] = {}

        for index, weapon_target in enumerate(weapon_targets):
            weapon = weapon_target.get("weapon", {})
            attack_mode = str(weapon_target.get("attack_mode", "")).strip().lower()
            target_id = str(weapon_target.get("target_id", "") or "")
            target_name = str(weapon_target.get("target_name", target_id) or target_id)
            target_selected = bool(weapon_target.get("target_selected", bool(target_id)))
            declared_attacks = weapon_target.get("declared_attacks")

            if attack_mode == "shooting" and not target_selected:
                skipped_weapons.append({
                    "weapon_name": weapon.get("name", ""),
                    "reason": "no_ranged_target_selected",
                })
                continue

            if not target_id:
                violations.append("target_required")
                skipped_weapons.append({
                    "weapon_name": weapon.get("name", ""),
                    "reason": "target_required",
                })
                continue

            if attack_mode == "fighting" and declared_attacks is not None and int(declared_attacks) < 1:
                violations.append("melee_split_requires_at_least_one_attack_per_target")

            entry = {
                "index": index,
                "weapon": weapon,
                "weapon_name": weapon.get("name", ""),
                "attack_mode": attack_mode,
                "target_id": target_id,
                "target_name": target_name,
                "declared_attacks": int(declared_attacks) if declared_attacks is not None else None,
                "applicable_rules": list(weapon_target.get("applicable_rules", [])),
                "identical_attack_key": cls.get_identical_attack_key(
                    weapon,
                    list(weapon_target.get("applicable_rules", [])),
                ),
            }
            if attack_mode == "fighting":
                melee_splits_by_weapon_name.setdefault(str(weapon.get("name", "")), []).append(entry)
            if target_id not in unresolved_by_target:
                target_order.append(target_id)
                unresolved_by_target[target_id] = []
            unresolved_by_target[target_id].append(entry)

        for split_entries in melee_splits_by_weapon_name.values():
            target_ids = {entry["target_id"] for entry in split_entries}
            if len(target_ids) <= 1:
                continue

            if any(entry["declared_attacks"] is None for entry in split_entries):
                violations.append("melee_split_requires_declared_attacks")
                continue

            if any(int(entry["declared_attacks"] or 0) < 1 for entry in split_entries):
                violations.append("melee_split_requires_at_least_one_attack_per_target")

            _, attacks_maximum = cls.get_roll_bounds(split_entries[0]["weapon"].get("attacks", 0))
            declared_total = sum(int(entry["declared_attacks"] or 0) for entry in split_entries)
            if declared_total > attacks_maximum:
                violations.append("melee_split_declares_more_attacks_than_characteristic")

        steps: list[dict[str, Any]] = []
        used_entry_indexes: set[int] = set()
        for target_id in target_order:
            target_entries = unresolved_by_target[target_id]
            while True:
                unresolved_entries = [
                    entry
                    for entry in target_entries
                    if entry["index"] not in used_entry_indexes
                ]
                if not unresolved_entries:
                    break

                selected_entry = unresolved_entries[0]
                identical_entries = [
                    entry
                    for entry in unresolved_entries
                    if entry["identical_attack_key"] == selected_entry["identical_attack_key"]
                ]
                gathered_minimum = 0
                gathered_maximum = 0
                gathered_weapons: list[dict[str, Any]] = []
                for entry in identical_entries:
                    minimum_attacks, maximum_attacks = cls.get_attack_dice_count_bounds(
                        entry["weapon"],
                        entry["declared_attacks"],
                    )
                    gathered_minimum += minimum_attacks
                    gathered_maximum += maximum_attacks
                    gathered_weapons.append({
                        "weapon_name": entry["weapon_name"],
                        "attack_mode": entry["attack_mode"],
                        "declared_attacks": entry["declared_attacks"],
                        "attack_dice_minimum": minimum_attacks,
                        "attack_dice_maximum": maximum_attacks,
                    })
                    used_entry_indexes.add(entry["index"])

                steps.append({
                    "select_enemy_unit": {
                        "target_id": target_id,
                        "target_name": selected_entry["target_name"],
                    },
                    "gather_attack_dice": {
                        "selected_weapon_name": selected_entry["weapon_name"],
                        "identical_weapon_count": len(identical_entries),
                        "attack_dice_minimum": gathered_minimum,
                        "attack_dice_maximum": gathered_maximum,
                        "weapons": gathered_weapons,
                    },
                    "resolve_attack_dice": True,
                })

        return {
            "valid": not violations,
            "violations": violations,
            "steps": steps,
            "skipped_weapons": skipped_weapons,
            "sequence_complete": len(used_entry_indexes) == sum(len(entries) for entries in unresolved_by_target.values()),
        }

    @staticmethod
    def is_monster_or_vehicle(unit: dict[str, Any]) -> bool:
        return "monster" in unit["keywords"] or "vehicle" in unit["keywords"]

    @staticmethod
    def parse_weapon_range(range_value: str) -> int | None:
        text = str(range_value).strip().lower()
        if text == "melee":
            return None

        match = re.search(r"(\d+)", text)
        if not match:
            return None
        return int(match.group(1))

    def get_rapid_fire_bonus(self, weapon: dict[str, Any], in_half_range: bool) -> int:
        weapon_range = self.parse_weapon_range(weapon["range"])
        if weapon_range is None or not in_half_range:
            return 0

        for keyword in weapon["keywords"]:
            match = re.fullmatch(r"Rapid Fire (\d+)", str(keyword), re.IGNORECASE)
            if match:
                return int(match.group(1))
        return 0

    def get_blast_bonus(
        self,
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        attack_context: dict[str, Any] | None = None,
    ) -> int:
        if not self.weapon_has_keyword(weapon, "Blast", attack_context):
            return 0
        blast_value = self.get_keyword_value(weapon, "Blast", attack_context)
        return (target_state["models"] // 5) * max(1, blast_value)

    def get_cleave_bonus(
        self,
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        attack_context: dict[str, Any] | None = None,
    ) -> int:
        cleave_value = self.get_keyword_value(weapon, "Cleave", attack_context)
        if cleave_value <= 0:
            return 0
        return (target_state["models"] // 5) * cleave_value

    def get_melta_bonus(self, weapon: dict[str, Any], in_half_range: bool) -> int:
        weapon_range = self.parse_weapon_range(weapon["range"])
        if weapon_range is None or not in_half_range:
            return 0
        return self.get_keyword_value(weapon, "Melta")

    def get_hit_roll_modifier(self, weapon: dict[str, Any], attack_context: dict[str, Any]) -> int:
        modifier = attack_context.get("attacker_hit_modifier", 0)
        if attack_context.get("remained_stationary", False) and self.weapon_has_keyword(weapon, "Heavy", attack_context):
            modifier += 1
        if attack_context.get("indirect_no_visibility", False) and self.weapon_has_keyword(weapon, "Indirect Fire", attack_context):
            modifier -= 1
        if weapon["range"].lower() != "melee" and attack_context.get("target_has_stealth", False):
            modifier -= 1
        if (
            weapon["range"].lower() != "melee"
            and attack_context.get("target_engaged_monster_vehicle", False)
            and not (
                attack_context.get("attacker_in_engagement_range", False)
                and self.is_close_quarters_weapon(weapon, attack_context)
            )
        ):
            modifier -= 1
        return modifier

    def validate_ranged_attack_context(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
        if weapon["range"].lower() == "melee":
            return

        if not attack_context.get("attacker_in_engagement_range", False):
            return

        if self.is_close_quarters_weapon(weapon, attack_context):
            return

        if self.is_monster_or_vehicle(attacker_unit):
            return

        raise CombatSimulationError(
            f"{attacker_unit['name']} cannot fire {weapon['name']} while in Engagement Range because it is not a Close-Quarters weapon."
        )

    def validate_blast_target_context(
        self,
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
        target_name: str,
    ) -> None:
        if not self.weapon_has_keyword(weapon, "Blast", attack_context):
            return
        if not attack_context.get("target_in_engagement_range_of_allies", False):
            return
        raise CombatSimulationError(
            f"{weapon['name']} cannot target {target_name} because Blast cannot be used into Engagement Range."
        )

    def maybe_reroll_wound(
        self,
        wound_roll: int,
        to_wound: int,
        unit_name: str,
        attack_context: dict[str, Any],
    ) -> tuple[int, bool]:
        if wound_roll < to_wound and attack_context.get("reroll_all_wound_rolls", False):
            new_roll = self.die_roll()
            self.log(f"{unit_name} re-rolls the failed wound into a {new_roll}")
            return new_roll, True
        if wound_roll == 1 and attack_context.get("reroll_wound_rolls_of_1", False):
            new_roll = self.die_roll()
            self.log(f"{unit_name} re-rolls the wound roll of 1 into a {new_roll}")
            return new_roll, True
        return wound_roll, False

    def apply_wound_reroll(
        self,
        wound_roll: int,
        to_wound: int,
        unit_name: str,
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> tuple[int, bool]:
        rerolled_wound, reroll_used = self.maybe_reroll_wound(wound_roll, to_wound, unit_name, attack_context)
        if rerolled_wound != wound_roll:
            self.stats["wound_rerolls_used"] += 1
            if rerolled_wound >= to_wound:
                self.stats["wound_reroll_successes"] += 1
            return rerolled_wound, True

        if wound_roll < to_wound and self.weapon_has_keyword(weapon, "Twin-Linked"):
            new_roll = self.die_roll()
            self.stats["wound_rerolls_used"] += 1
            if new_roll >= to_wound:
                self.stats["wound_reroll_successes"] += 1
            self.log(
                f"{unit_name} re-rolled the failed wound with Twin-Linked into a {new_roll} to wound"
            )
            return new_roll, True

        return wound_roll, reroll_used

    def resolve_hit(
        self,
        unit_name: str,
        weapon: dict[str, Any],
        target_name: str,
        attack_context: dict[str, Any],
    ) -> tuple[int, int]:
        self.stats["attack_instances"] += 1
        if self.weapon_has_keyword(weapon, "Torrent", attack_context):
            self.stats["auto_hit_attacks"] += 1
            self.stats["successful_hit_attacks"] += 1
            self.stats["torrent_hits"] += 1
            self.log(f"{weapon['name']} automatically hits {target_name} because it has Torrent")
            return 1, 0

        self.stats["hit_rolls"] += 1
        hit_roll = self.die_roll()
        self.log(f"{unit_name} rolls a {hit_roll} to hit")
        hit_modifier = self.get_hit_roll_modifier(weapon, attack_context)
        modified_hit_roll = hit_roll + hit_modifier
        if hit_modifier != 0:
            self.log(f"Hit roll modifier applied: {hit_modifier:+d}")

        if (
            attack_context.get("indirect_no_visibility", False)
            and self.weapon_has_keyword(weapon, "Indirect Fire", attack_context)
            and hit_roll <= 3
        ):
            self.stats["failed_hit_attacks"] += 1
            self.log(f"{unit_name} fails to hit because Indirect Fire with no visibility fails on 1-3")
            return 0, 0

        if (
            modified_hit_roll < weapon["skill"]
            and attack_context.get("reroll_all_hit_rolls", False)
        ):
            self.stats["hit_rerolls_used"] += 1
            reroll_hit = self.die_roll()
            self.log(f"{unit_name} re-rolls the failed hit into a {reroll_hit}")
            hit_roll = reroll_hit
            modified_hit_roll = hit_roll + hit_modifier
            if modified_hit_roll >= weapon["skill"]:
                self.stats["hit_reroll_successes"] += 1

        if (
            modified_hit_roll < weapon["skill"]
            and hit_roll == 1
            and attack_context.get("reroll_hit_rolls_of_1", False)
        ):
            self.stats["hit_rerolls_used"] += 1
            reroll_hit = self.die_roll()
            self.log(f"{unit_name} re-rolls the hit roll of 1 into a {reroll_hit}")
            hit_roll = reroll_hit
            modified_hit_roll = hit_roll + hit_modifier
            if modified_hit_roll >= weapon["skill"]:
                self.stats["hit_reroll_successes"] += 1

        if modified_hit_roll < weapon["skill"] and attack_context.get("oath_of_moment_active", False):
            self.stats["hit_rerolls_used"] += 1
            reroll_hit = self.die_roll()
            self.log(f"{unit_name} re-rolls the failed hit with Oath of Moment into a {reroll_hit}")
            hit_roll = reroll_hit
            modified_hit_roll = hit_roll + hit_modifier
            if (
                attack_context.get("indirect_no_visibility", False)
                and self.weapon_has_keyword(weapon, "Indirect Fire", attack_context)
                and hit_roll <= 3
            ):
                self.stats["failed_hit_attacks"] += 1
                self.log(f"{unit_name} fails to hit because Indirect Fire with no visibility fails on 1-3")
                return 0, 0
            if modified_hit_roll >= weapon["skill"]:
                self.stats["hit_reroll_successes"] += 1

        if modified_hit_roll < weapon["skill"]:
            sequence_state = attack_context.get("sequence_state", {})
            remaining_hit_rerolls = int(sequence_state.get("remaining_hit_rerolls", 0))
            if remaining_hit_rerolls > 0:
                self.stats["hit_rerolls_used"] += 1
                reroll_hit = self.die_roll()
                sequence_state["remaining_hit_rerolls"] = remaining_hit_rerolls - 1
                self.log(f"{unit_name} uses Heroes All to re-roll the failed hit into a {reroll_hit}")
                hit_roll = reroll_hit
                modified_hit_roll = hit_roll + hit_modifier
                if modified_hit_roll >= weapon["skill"]:
                    self.stats["hit_reroll_successes"] += 1

        if modified_hit_roll < weapon["skill"]:
            self.stats["failed_hit_attacks"] += 1
            self.log(f"{unit_name} failed to hit")
            return 0, 0

        critical_hit = hit_roll >= attack_context.get("critical_hit_threshold", 6)
        self.stats["successful_hit_attacks"] += 1
        if critical_hit:
            self.stats["critical_hit_attacks"] += 1
        normal_hits = 1
        auto_wounds = 0

        sustained_hits_bonus = self.get_sustained_hits_bonus(weapon, attack_context)
        if critical_hit and sustained_hits_bonus > 0:
            normal_hits += sustained_hits_bonus
            self.stats["extra_hits_generated"] += sustained_hits_bonus
            self.stats["sustained_hits_generated"] += sustained_hits_bonus
            suffix = "" if sustained_hits_bonus == 1 else "s"
            self.log(f"On a critical hit the attack explodes, causing {sustained_hits_bonus} extra hit{suffix}")

        if critical_hit and self.weapon_has_keyword(weapon, "LH", attack_context):
            auto_wounds = 1
            normal_hits -= 1
            self.stats["auto_wounds"] += 1
            self.stats["lethal_hits_triggered"] += 1
            self.log(f"On a critical hit {unit_name} automatically wounds {target_name} due to Lethal Hits")

        return normal_hits, auto_wounds

    def apply_anti_rule(self, wound_roll: int, weapon: dict[str, Any], target: dict[str, Any]) -> int:
        anti_rules = weapon.get("anti_rules") or []
        if not anti_rules:
            anti_keyword = weapon.get("anti_keyword")
            anti_value = weapon.get("anti_value", 0)
            if anti_keyword:
                anti_rules = [{"keyword": anti_keyword, "value": anti_value}]

        for anti_rule in anti_rules:
            anti_keyword = anti_rule.get("keyword")
            anti_value = anti_rule.get("value", 0)
            if not anti_keyword or anti_keyword not in target["keywords"]:
                continue
            if wound_roll >= anti_value:
                self.log("The wound roll becomes a critical wound due to Anti")
                return 6
        return wound_roll

    def resolve_wound(
        self,
        unit_name: str,
        weapon: dict[str, Any],
        target: dict[str, Any],
        to_wound: int,
        attack_context: dict[str, Any],
    ) -> tuple[bool, bool, bool]:
        self.stats["wound_rolls"] += 1
        wound_roll = self.die_roll()
        self.log(f"{unit_name} rolls a {wound_roll} to wound")
        wound_roll = self.apply_anti_rule(wound_roll, weapon, target)

        if wound_roll < to_wound:
            wound_roll, reroll_used = self.apply_wound_reroll(
                wound_roll,
                to_wound,
                unit_name,
                weapon,
                attack_context,
            )
            wound_roll = self.apply_anti_rule(wound_roll, weapon, target)
            if wound_roll < to_wound and not reroll_used:
                sequence_state = attack_context.get("sequence_state", {})
                remaining_wound_rerolls = int(sequence_state.get("remaining_wound_rerolls", 0))
                if remaining_wound_rerolls > 0:
                    new_roll = self.die_roll()
                    sequence_state["remaining_wound_rerolls"] = remaining_wound_rerolls - 1
                    self.stats["wound_rerolls_used"] += 1
                    self.log(f"{unit_name} uses Heroes All to re-roll the failed wound into a {new_roll}")
                    wound_roll = self.apply_anti_rule(new_roll, weapon, target)
                    if wound_roll >= to_wound:
                        self.stats["wound_reroll_successes"] += 1

        if wound_roll < to_wound:
            self.stats["failed_wound_rolls"] += 1
            self.log(f"{unit_name} failed to wound")
            return False, False, False

        critical_wound = wound_roll == 6
        devastating_wound = critical_wound and self.weapon_has_keyword(weapon, "DW", attack_context)
        self.stats["successful_wound_rolls"] += 1
        if critical_wound:
            self.stats["critical_wounds"] += 1
        if devastating_wound:
            self.stats["devastating_wounds_triggered"] += 1
            self.log(f"On a 6 {unit_name} scores a critical wound with Devastating Wounds")

        return True, devastating_wound, critical_wound

    def resolve_save(
        self,
        target: dict[str, Any],
        weapon: dict[str, Any],
        no_save_allowed: bool,
        attack_context: dict[str, Any],
        critical_wound: bool = False,
    ) -> bool:
        if no_save_allowed:
            self.stats["unsavable_wounds"] += 1
            self.log(f"{target['name']} cannot make a save against this attack")
            return True

        effective_ap = max(
            0,
            weapon["ap"]
            + attack_context.get("attacker_ap_modifier", 0)
            + attack_context.get("target_ap_modifier", 0),
        )
        if critical_wound and attack_context.get("critical_wound_ap_modifier", 0) > 0:
            effective_ap += attack_context["critical_wound_ap_modifier"]
            self.log(
                f"Critical wound improves the attack's Armour Penetration by {attack_context['critical_wound_ap_modifier']}"
            )
        if attack_context.get("attacker_ap_modifier", 0) > 0:
            self.log(f"The attack improves its Armour Penetration by {attack_context['attacker_ap_modifier']}")
        if attack_context.get("target_ap_modifier", 0) < 0 and weapon["ap"] > 0:
            self.log(
                f"Defensive rules worsen the attack's Armour Penetration by {-attack_context['target_ap_modifier']}"
            )

        armor_required = target["armor_save"] + effective_ap
        has_cover_source = (
            target["has_cover"]
            or attack_context.get("indirect_cover", False)
            or attack_context.get("target_has_bonus_cover", False)
        )
        if (
            has_cover_source
            and weapon["range"].lower() != "melee"
            and not self.weapon_has_keyword(weapon, "Ignores Cover", attack_context)
            and not (effective_ap == 0 and target["armor_save"] <= 3)
        ):
            armor_required = max(2, armor_required - 1)
            self.log("The target gets +1 to its armor save due to cover")
        elif has_cover_source and self.weapon_has_keyword(weapon, "Ignores Cover", attack_context):
            self.log(f"{weapon['name']} ignores the benefits of cover")

        available_saves: list[tuple[int, str]] = []
        if armor_required <= 6:
            available_saves.append((armor_required, "armor"))
        if target["invulnerable_save"] > 0:
            available_saves.append((target["invulnerable_save"], "invulnerable"))

        if not available_saves:
            self.stats["unsavable_wounds"] += 1
            self.log(f"{target['name']} does not get a save")
            return True

        required, save_type = min(available_saves, key=lambda item: item[0])
        self.stats["save_attempts"] += 1
        save_roll = self.die_roll()
        self.log(f"{target['name']} attempts an {save_type} save on {required}+")

        if save_roll == 1 and attack_context.get("reroll_save_rolls_of_1", False):
            reroll_save = self.die_roll()
            self.log(f"{target['name']} re-rolls the saving throw of 1 into a {reroll_save}")
            save_roll = reroll_save

        if save_roll >= required:
            self.stats["saves_passed"] += 1
            self.log(f"{target['name']} passes the save with a {save_roll}")
            return False

        self.stats["saves_failed"] += 1
        self.log(f"{target['name']} fails the save with a {save_roll}")
        return True

    def roll_damage(self, weapon: dict[str, Any], attack_context: dict[str, Any]) -> tuple[int, int]:
        base_damage = self.roll_value(weapon["damage"])
        minimum_damage, maximum_damage = self.get_roll_bounds(weapon["damage"])
        sequence_state = attack_context.get("sequence_state", {})
        remaining_damage_rerolls = int(sequence_state.get("remaining_damage_rerolls", 0))
        if (
            remaining_damage_rerolls > 0
            and maximum_damage > minimum_damage
            and base_damage == minimum_damage
        ):
            rerolled_damage = self.roll_value(weapon["damage"])
            sequence_state["remaining_damage_rerolls"] = remaining_damage_rerolls - 1
            self.stats["damage_rerolls_used"] += 1
            self.log(f"Heroes All re-rolls the damage roll from {base_damage} into {rerolled_damage}")
            if rerolled_damage > base_damage:
                self.stats["damage_reroll_improvements"] += 1
            base_damage = rerolled_damage

        damage = base_damage
        if weapon["range"].lower() == "melee":
            damage += attack_context.get("melee_damage_bonus", 0)
        else:
            damage += attack_context.get("ranged_damage_bonus", 0)
        melta_bonus = self.get_melta_bonus(weapon, attack_context.get("in_half_range", False))
        if melta_bonus > 0:
            damage += melta_bonus
        damage_modifier = attack_context.get("target_damage_modifier", 0)
        if damage_modifier != 0 and damage > 0:
            damage = max(1, damage + damage_modifier)
        return damage, melta_bonus

    def apply_temporary_target_modifiers(
        self,
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
        profiles = target_state.get("profiles", [])
        if profiles:
            for profile in profiles:
                if attack_context.get("target_invulnerable_save", 0) > 0:
                    profile["invulnerable_save"] = self.combine_invulnerable_save_values(
                        int(profile.get("invulnerable_save", 0)),
                        int(attack_context["target_invulnerable_save"]),
                    )
                profile["feel_no_pain"] = self.combine_feel_no_pain_values(
                    profile.get("feel_no_pain", 0),
                    attack_context.get("target_feel_no_pain", 0),
                )
            self.sync_target_state_profiles(target_state)
            return

        if attack_context.get("target_invulnerable_save", 0) > 0:
            target_state["invulnerable_save"] = self.combine_invulnerable_save_values(
                int(target_state.get("invulnerable_save", 0)),
                int(attack_context["target_invulnerable_save"]),
            )
        target_state["feel_no_pain"] = self.combine_feel_no_pain_values(
            target_state.get("feel_no_pain", 0),
            attack_context.get("target_feel_no_pain", 0),
        )

    def apply_feel_no_pain(self, target_state: dict[str, Any], damage: int) -> int:
        feel_no_pain = target_state.get("feel_no_pain", 0)
        if feel_no_pain <= 0 or damage <= 0:
            return damage

        rolls = [self.die_roll() for _ in range(damage)]
        ignored_wounds = sum(1 for roll in rolls if roll >= feel_no_pain)
        remaining_damage = damage - ignored_wounds
        self.stats["feel_no_pain_rolls"] += len(rolls)
        self.stats["feel_no_pain_successes"] += ignored_wounds
        self.stats["feel_no_pain_damage_prevented"] += ignored_wounds
        self.log(
            f"{target_state['name']} rolls Feel No Pain {feel_no_pain}+ for {damage} damage: "
            f"{', '.join(str(roll) for roll in rolls)}"
        )
        if ignored_wounds > 0:
            self.log(f"{target_state['name']} ignores {ignored_wounds} damage with Feel No Pain")
        else:
            self.log(f"{target_state['name']} ignores no damage with Feel No Pain")
        return remaining_damage

    @staticmethod
    def model_is_character(model: dict[str, Any]) -> bool:
        return any(
            str(keyword).lower() == "character"
            for keyword in model.get("keywords", [])
        ) or bool(model.get("is_character", False))

    @staticmethod
    def model_remaining_wounds(model: dict[str, Any]) -> int:
        return int(model.get("current_wounds", model.get("wounds", 1)))

    @staticmethod
    def model_starting_wounds(model: dict[str, Any]) -> int:
        return int(model.get("wounds", model.get("current_wounds", 1)))

    @classmethod
    def select_model_for_mortal_wound(cls, models: list[dict[str, Any]]) -> int | None:
        alive_models = [
            (index, model)
            for index, model in enumerate(models)
            if cls.model_remaining_wounds(model) > 0
        ]
        if not alive_models:
            return None

        for require_character, require_wounded in (
            (False, True),
            (False, False),
            (True, True),
            (True, False),
        ):
            for index, model in alive_models:
                is_character = cls.model_is_character(model)
                is_wounded = cls.model_remaining_wounds(model) < cls.model_starting_wounds(model)
                if is_character == require_character and (is_wounded or not require_wounded):
                    return index

        return alive_models[0][0]

    @classmethod
    def resolve_mortal_wounds_on_models(
        cls,
        models: list[dict[str, Any]],
        mortal_wounds: int,
    ) -> dict[str, Any]:
        resolved_models = [
            {
                **model,
                "current_wounds": cls.model_remaining_wounds(model),
                "wounds": cls.model_starting_wounds(model),
                "feel_no_pain": max(0, int(model.get("feel_no_pain", 0) or 0)),
            }
            for model in models
        ]
        allocation_log: list[dict[str, Any]] = []
        destroyed_model_indexes: list[int] = []
        unresolved_mortal_wounds = 0
        ignored_mortal_wounds = 0

        for mortal_wound_index in range(max(0, int(mortal_wounds))):
            selected_index = cls.select_model_for_mortal_wound(resolved_models)
            if selected_index is None:
                unresolved_mortal_wounds = int(mortal_wounds) - mortal_wound_index
                break

            selected_model = resolved_models[selected_index]
            feel_no_pain = max(0, int(selected_model.get("feel_no_pain", 0) or 0))
            feel_no_pain_roll = random.randint(1, 6) if feel_no_pain > 0 else None
            ignored = feel_no_pain_roll is not None and feel_no_pain_roll >= feel_no_pain
            destroyed = False

            if ignored:
                ignored_mortal_wounds += 1
            else:
                selected_model["current_wounds"] = cls.model_remaining_wounds(selected_model) - 1
                destroyed = selected_model["current_wounds"] <= 0
                if destroyed:
                    selected_model["current_wounds"] = 0
                    destroyed_model_indexes.append(selected_index)

            allocation_log.append({
                "model_index": selected_index,
                "model_id": selected_model.get("id"),
                "model_name": selected_model.get("name", f"Model {selected_index + 1}"),
                "feel_no_pain": feel_no_pain,
                "feel_no_pain_roll": feel_no_pain_roll,
                "ignored": ignored,
                "remaining_wounds": selected_model["current_wounds"],
                "destroyed": destroyed,
            })

        return {
            "models": resolved_models,
            "mortal_wounds": max(0, int(mortal_wounds)),
            "allocated_mortal_wounds": len(allocation_log),
            "ignored_mortal_wounds": ignored_mortal_wounds,
            "unresolved_mortal_wounds": unresolved_mortal_wounds,
            "destroyed_model_indexes": destroyed_model_indexes,
            "allocation_log": allocation_log,
            "unit_destroyed": all(cls.model_remaining_wounds(model) <= 0 for model in resolved_models),
            "destroyed_models_trigger_rules": False,
        }

    def allocate_normal_damage(self, target_state: dict[str, Any], damage: int) -> None:
        active_target = self.get_active_target_profile(target_state)
        damage = self.apply_feel_no_pain(active_target, damage)
        if damage <= 0:
            self.log(f"{active_target['name']} suffers no damage")
            return

        self.stats["damage_inflicted"] += min(active_target["current_wounds"], damage)
        active_target["current_wounds"] -= damage

        if active_target["current_wounds"] > 0:
            self.sync_target_state_profiles(target_state)
            self.log(
                f"{active_target['name']} survives with {active_target['current_wounds']} wounds remaining"
            )
            return

        active_target["models"] -= 1
        if active_target["models"] <= 0:
            active_target["current_wounds"] = 0
        else:
            active_target["current_wounds"] = active_target["wounds"]

        self.sync_target_state_profiles(target_state)
        if target_state["models"] <= 0:
            self.log(f"{active_target['name']} has been destroyed")
            return

        self.log(f"One {active_target['name']} model is destroyed")
        self.log(f"There are {target_state['models']} models left in the unit")

    def allocate_spillover_mortal_wounds(self, target_state: dict[str, Any], damage: int) -> None:
        active_target = self.get_active_target_profile(target_state)
        damage = self.apply_feel_no_pain(active_target, damage)
        if damage <= 0:
            self.log(f"{active_target['name']} suffers no mortal wounds")
            return

        remaining_damage = damage

        while remaining_damage > 0 and target_state["models"] > 0:
            active_target = self.get_active_target_profile(target_state)
            wounds_to_allocate = min(active_target["current_wounds"], remaining_damage)
            self.stats["damage_inflicted"] += wounds_to_allocate
            active_target["current_wounds"] -= wounds_to_allocate
            remaining_damage -= wounds_to_allocate

            if active_target["current_wounds"] > 0:
                self.sync_target_state_profiles(target_state)
                self.log(
                    f"{active_target['name']} survives with {active_target['current_wounds']} wounds remaining"
                )
                return

            active_target["models"] -= 1
            if active_target["models"] <= 0:
                active_target["current_wounds"] = 0
            else:
                active_target["current_wounds"] = active_target["wounds"]

            self.sync_target_state_profiles(target_state)
            if target_state["models"] <= 0:
                self.log(f"{active_target['name']} has been destroyed")
                return

            self.log(f"One {active_target['name']} model is destroyed")
            self.log(f"There are {target_state['models']} models left in the unit")

    def apply_damage(
        self,
        unit_name: str,
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        damage_mode: str,
        attack_context: dict[str, Any],
    ) -> None:
        damage, melta_bonus = self.roll_damage(weapon, attack_context)
        self.apply_damage_amount(
            unit_name,
            weapon,
            target_state,
            damage_mode,
            attack_context,
            damage,
            melta_bonus,
        )

    def apply_damage_amount(
        self,
        unit_name: str,
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        damage_mode: str,
        attack_context: dict[str, Any],
        damage: int,
        melta_bonus: int = 0,
    ) -> None:
        active_target = self.get_active_target_profile(target_state)
        target_name = active_target["name"] if active_target is not target_state else target_state["name"]

        if damage_mode == "mortal":
            self.log(f"{unit_name} inflicts {damage} mortal wounds on {target_name}")
        elif damage_mode == "mortal_no_spill":
            self.log(f"{unit_name} inflicts {damage} mortal wounds on {target_name}")
            self.log("Excess mortal wound damage is lost for this attack")
        else:
            self.log(f"{unit_name} deals {damage} damage to {target_name}")
        if melta_bonus > 0:
            self.log(f"Melta adds {melta_bonus} damage at this range")

        if damage_mode == "mortal":
            self.allocate_spillover_mortal_wounds(target_state, damage)
            return

        self.allocate_normal_damage(target_state, damage)

    def resolve_pre_attack_active_abilities(
        self,
        attacker_unit: dict[str, Any],
        reference_weapon: dict[str, Any],
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
        active_ability_names = set(attack_context.get("attacker_active_ability_names", set()))

        if (
            "exhortation of rage" in active_ability_names
            and reference_weapon["range"].lower() == "melee"
            and target_state["models"] > 0
        ):
            self.log(f"\n{attacker_unit['name']} activates Exhortation of Rage")
            roll = self.die_roll()
            self.log(f"Exhortation of Rage roll: {roll}")
            if roll >= 6:
                mortal_wounds = 3
            elif roll >= 4:
                mortal_wounds = self.roll_value("D3")
            else:
                mortal_wounds = 0

            if mortal_wounds > 0:
                self.log(f"Exhortation of Rage inflicts {mortal_wounds} mortal wounds")
                self.stats["damage_pool"] += mortal_wounds
                self.record_mortal_damage("Exhortation of Rage", mortal_wounds)
                self.allocate_spillover_mortal_wounds(target_state, mortal_wounds)
            else:
                self.log("Exhortation of Rage inflicts no mortal wounds")

    def configure_hazardous_bearer_state(
        self,
        attacking_unit: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> dict[str, Any]:
        max_wounds = attacking_unit.get("wounds", 1)
        current_wounds = attack_context.get("hazardous_bearer_current_wounds")
        if current_wounds is None:
            current_wounds = max_wounds
        current_wounds = max(0, min(max_wounds, current_wounds))

        attacker_fnp = self.combine_feel_no_pain_values(
            self.get_lowest_effect_value(attacking_unit.get("effects", []), "feel_no_pain"),
            attack_context.get("attacker_feel_no_pain", 0),
        )

        return {
            "name": f"{attacking_unit['name']} Hazardous bearer",
            "wounds": max_wounds,
            "current_wounds": current_wounds,
            "models": 1,
            "feel_no_pain": attack_context.get(
                "hazardous_bearer_feel_no_pain",
                attacker_fnp,
            ),
            "armor_save": 0,
            "invulnerable_save": 0,
            "has_cover": False,
            "effects": [],
            "keywords": list(attacking_unit.get("keywords", [])),
            "toughness": attacking_unit.get("toughness", 0),
        }

    @staticmethod
    def unit_is_all_monster_or_vehicle(unit: dict[str, Any]) -> bool:
        unit_keywords = set(unit.get("keywords", []))
        return "monster" in unit_keywords or "vehicle" in unit_keywords

    def make_hazard_rolls(
        self,
        unit: dict[str, Any],
        roll_count: int,
        fail_threshold: int = 2,
    ) -> dict[str, Any]:
        rolls = [self.die_roll() for _ in range(max(0, int(roll_count)))]
        failed_rolls = [roll for roll in rolls if roll <= int(fail_threshold)]
        mortal_wounds_per_failure = 3 if self.unit_is_all_monster_or_vehicle(unit) else 1
        return {
            "rolls": rolls,
            "failed_rolls": failed_rolls,
            "fail_threshold": int(fail_threshold),
            "failures": len(failed_rolls),
            "mortal_wounds_per_failure": mortal_wounds_per_failure,
            "mortal_wounds": len(failed_rolls) * mortal_wounds_per_failure,
            "all_rolls_made_simultaneously": True,
        }

    def resolve_hazardous_checks(
        self,
        attacker_unit: dict[str, Any],
        selected_weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> dict[str, Any] | None:
        hazardous_weapons = self.get_used_hazardous_weapons(attacker_unit, selected_weapon, attack_context)
        if not hazardous_weapons:
            return None

        hazardous_fail_threshold = int(attack_context.get("hazardous_fail_threshold", 2))
        hazard_result = self.make_hazard_rolls(
            attacker_unit,
            len(hazardous_weapons),
            hazardous_fail_threshold,
        )
        self.log(
            f"\nHazard rolls for {attacker_unit['name']}: "
            f"{', '.join(str(roll) for roll in hazard_result['rolls'])}"
        )
        if hazard_result["failures"] <= 0:
            self.log(f"{attacker_unit['name']} passes all hazard rolls")
            return None

        self.log(
            f"{attacker_unit['name']} fails {hazard_result['failures']} hazard roll"
            f"{'' if hazard_result['failures'] == 1 else 's'} and suffers "
            f"{hazard_result['mortal_wounds']} mortal wound"
            f"{'' if hazard_result['mortal_wounds'] == 1 else 's'}"
        )
        if attack_context.get("hazardous_overwatch_charge_phase", False):
            self.log(
                "These Hazardous mortal wounds are allocated after the charging unit ends its charge move"
            )

        hazardous_bearer_state = self.configure_hazardous_bearer_state(attacker_unit, attack_context)
        mortal_wounds = self.apply_feel_no_pain(hazardous_bearer_state, hazard_result["mortal_wounds"])
        hazardous_bearer_state["current_wounds"] -= mortal_wounds
        if hazardous_bearer_state["current_wounds"] <= 0:
            hazardous_bearer_state["models"] = 0
            hazardous_bearer_state["current_wounds"] = 0
            self.log(f"{hazardous_bearer_state['name']} has been destroyed by hazard rolls")
        else:
            self.log(
                f"{hazardous_bearer_state['name']} survives with "
                f"{hazardous_bearer_state['current_wounds']} wounds remaining"
            )

        return hazardous_bearer_state

    def attack(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
        unit_name = attacker_unit["name"]
        weapon_bearer_count = self.get_effective_weapon_bearer_count(attacker_unit, weapon, attack_context)
        attacks_remaining = self.roll_value(weapon["attacks"]) * weapon_bearer_count
        if weapon["range"].lower() == "melee":
            attacks_remaining += attack_context.get("melee_attack_bonus", 0) * weapon_bearer_count
        else:
            attacks_remaining += attack_context.get("ranged_attack_bonus", 0) * weapon_bearer_count
        rapid_fire_bonus = (
            self.get_rapid_fire_bonus(weapon, attack_context.get("in_half_range", False))
            * weapon_bearer_count
        )
        blast_bonus = self.get_blast_bonus(weapon, target_state, attack_context) * weapon_bearer_count
        cleave_bonus = self.get_cleave_bonus(weapon, target_state, attack_context) * weapon_bearer_count
        attacks_remaining += rapid_fire_bonus + blast_bonus + cleave_bonus
        effective_strength = weapon["strength"]
        if weapon["range"].lower() == "melee":
            effective_strength += attack_context.get("melee_strength_bonus", 0)
        else:
            effective_strength += attack_context.get("ranged_strength_bonus", 0)
        active_target = self.get_active_target_profile(target_state)
        base_to_wound = self.get_to_wound_threshold(effective_strength, active_target["toughness"])
        wound_roll_modifier = self.get_wound_roll_modifier(attacker_unit, active_target, attack_context)
        wound_roll_modifier += self.get_weapon_wound_bonus(weapon, attack_context)
        to_wound = self.clamp_target_number(base_to_wound - wound_roll_modifier)

        self.log(f"\n{unit_name} attacks with {weapon['name']}")
        if weapon_bearer_count > 1:
            self.log(f"{weapon_bearer_count} models are making attacks with this weapon profile")
        self.log(f"Attacks: {attacks_remaining}")
        if weapon["range"].lower() == "melee":
            melee_attack_bonus = attack_context.get("melee_attack_bonus", 0)
            melee_strength_bonus = attack_context.get("melee_strength_bonus", 0)
            melee_damage_bonus = attack_context.get("melee_damage_bonus", 0)
            if melee_attack_bonus > 0:
                self.log(f"Active melee attack bonus: +{melee_attack_bonus}")
            if melee_strength_bonus > 0:
                self.log(f"Active melee strength bonus: +{melee_strength_bonus}")
            if melee_damage_bonus > 0:
                self.log(f"Active melee damage bonus: +{melee_damage_bonus}")
        else:
            if attack_context.get("ranged_strength_bonus", 0) > 0:
                self.log(f"Active ranged strength bonus: +{attack_context['ranged_strength_bonus']}")
            if attack_context.get("ranged_attack_bonus", 0) > 0:
                self.log(f"Active ranged attack bonus: +{attack_context['ranged_attack_bonus']}")
            if attack_context.get("ranged_damage_bonus", 0) > 0:
                self.log(f"Active ranged damage bonus: +{attack_context['ranged_damage_bonus']}")
        if rapid_fire_bonus > 0:
            self.log(f"Rapid Fire adds {rapid_fire_bonus} attacks at this range")
        if blast_bonus > 0:
            self.log(f"Blast adds {blast_bonus} attacks based on target unit size")
        if cleave_bonus > 0:
            self.log(f"Cleave adds {cleave_bonus} attacks based on target unit size")
        self.stats["gathered_attack_dice"] += attacks_remaining
        if attack_context.get("oath_of_moment_active", False):
            self.log("Oath of Moment is active against this target")
        if attack_context.get("oath_of_moment_wound_bonus", 0) > 0:
            self.log("Oath of Moment adds +1 to wound for this attack")
        if attack_context.get("critical_hit_threshold", 6) < 6:
            self.log(f"Critical hits are scored on {attack_context['critical_hit_threshold']}+ for this attack")
        self.log(f"Needs {weapon['skill']}+ to hit")
        self.log(f"Needs {to_wound}+ to wound")
        active_hit_modifier = self.get_hit_roll_modifier(weapon, attack_context)
        if active_hit_modifier != 0:
            self.log(f"Active hit roll modifier: {active_hit_modifier:+d}")
        if wound_roll_modifier != 0:
            self.log(f"Active wound roll modifier: {wound_roll_modifier:+d}")
        if attack_context.get("target_damage_modifier", 0) < 0:
            self.log(f"Incoming damage is reduced by {-attack_context['target_damage_modifier']}")

        normal_hit_pool = 0
        auto_wound_pool = 0
        pending_mortal_wounds = 0
        for _ in range(attacks_remaining):
            normal_hits, auto_wounds = self.resolve_hit(unit_name, weapon, target_state["name"], attack_context)
            normal_hit_pool += normal_hits
            auto_wound_pool += auto_wounds

        if normal_hit_pool or auto_wound_pool:
            self.stats["hit_pool"] += normal_hit_pool + auto_wound_pool
            self.log(
                f"{unit_name} batches {normal_hit_pool} hit"
                f"{'' if normal_hit_pool == 1 else 's'}"
                f"{f' and {auto_wound_pool} auto-wound' if auto_wound_pool else ''}"
                f"{'' if auto_wound_pool == 1 else ('s' if auto_wound_pool else '')}"
                " into the wound step"
            )

        wound_events: list[dict[str, Any]] = [
            {
                "critical_wound": False,
                "devastating_wound": False,
                "source": "auto_wound",
            }
            for _ in range(auto_wound_pool)
        ]
        for _ in range(normal_hit_pool):
            current_target = self.get_active_target_profile(target_state)
            current_base_to_wound = self.get_to_wound_threshold(effective_strength, current_target["toughness"])
            current_wound_roll_modifier = self.get_wound_roll_modifier(attacker_unit, current_target, attack_context)
            current_wound_roll_modifier += self.get_weapon_wound_bonus(weapon, attack_context)
            current_to_wound = self.clamp_target_number(current_base_to_wound - current_wound_roll_modifier)
            wound_succeeds, devastating_wound, critical_wound = self.resolve_wound(
                unit_name,
                weapon,
                current_target,
                current_to_wound,
                attack_context,
            )
            if not wound_succeeds:
                continue
            wound_events.append({
                "critical_wound": critical_wound,
                "devastating_wound": devastating_wound,
                "source": "wound_roll",
            })
        self.stats["wound_pool"] += len(wound_events)

        normal_damage_events: list[dict[str, Any]] = []
        for wound_event in wound_events:
            allocation_target = self.get_precision_allocation_target(target_state, weapon, attack_context)
            damage_target = self.get_active_target_profile(allocation_target)
            if allocation_target is not target_state:
                self.log(
                    f"{weapon['name']} uses Precision to allocate the successful wound to {allocation_target['name']}"
                )
            if (
                wound_event["critical_wound"]
                and self.ability_names_include(self.unit_ability_name_set(attacker_unit), "dok's sawy arrgh")
                and self.weapon_base_name(weapon) == "'urty syringe"
                and not self.unit_has_keyword(damage_target, "vehicle")
            ):
                extra_mortal_wounds = self.roll_value("D6")
                pending_mortal_wounds += extra_mortal_wounds
                self.stats["damage_pool"] += extra_mortal_wounds
                self.record_mortal_damage("Dok's Sawy Arrgh", extra_mortal_wounds)
                self.log(
                    f"Dok's Sawy Arrgh adds {extra_mortal_wounds} mortal wound"
                    f"{'' if extra_mortal_wounds == 1 else 's'} on a critical wound"
                )
            if wound_event["devastating_wound"]:
                mortal_damage, melta_bonus = self.roll_damage(weapon, attack_context)
                self.stats["damage_pool"] += mortal_damage
                self.stats["devastating_damage"] += mortal_damage
                self.record_mortal_damage("Devastating Wounds", mortal_damage)
                if melta_bonus > 0:
                    self.log(f"Melta adds {melta_bonus} damage at this range")
                pending_mortal_wounds += mortal_damage
                self.log(
                    f"{weapon['name']} will inflict {mortal_damage} mortal wound"
                    f"{'' if mortal_damage == 1 else 's'} after normal damage is resolved"
                )
                continue
            if self.resolve_save(damage_target, weapon, False, attack_context, wound_event["critical_wound"]):
                damage, melta_bonus = self.roll_damage(weapon, attack_context)
                self.stats["damage_pool"] += damage
                normal_damage_events.append({
                    "allocation_target": allocation_target,
                    "damage_mode": "normal",
                    "damage": damage,
                    "melta_bonus": melta_bonus,
                })

        if normal_damage_events:
            self.log(
                f"{unit_name} allocates {len(normal_damage_events)} unsaved wound"
                f"{'' if len(normal_damage_events) == 1 else 's'} after batch rolling"
            )
        for damage_event in normal_damage_events:
            if target_state["models"] <= 0:
                break
            self.apply_damage_amount(
                unit_name,
                weapon,
                damage_event["allocation_target"],
                damage_event["damage_mode"],
                attack_context,
                damage_event["damage"],
                damage_event["melta_bonus"],
            )

        if pending_mortal_wounds > 0 and target_state["models"] > 0:
            self.log(
                f"{unit_name} resolves {pending_mortal_wounds} pending mortal wound"
                f"{'' if pending_mortal_wounds == 1 else 's'} after normal damage"
            )
            self.allocate_spillover_mortal_wounds(target_state, pending_mortal_wounds)

    def get_effective_weapon_bearer_count(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> int:
        selected_model_count = weapon.get("selected_model_count")
        if selected_model_count is not None:
            weapon_bearer_count = max(0, int(selected_model_count))
        else:
            weapon_bearer_count = self.get_weapon_bearer_count(attacker_unit, weapon)
        eligible_model_count = attack_context.get("attacker_eligible_model_count")
        if eligible_model_count is not None:
            weapon_bearer_count = min(weapon_bearer_count, max(0, int(eligible_model_count)))
        return weapon_bearer_count

    def get_planned_weapon(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> dict[str, Any]:
        planned_weapon = dict(weapon)
        planned_weapon["selected_model_count"] = self.get_effective_weapon_bearer_count(
            attacker_unit,
            weapon,
            attack_context,
        )
        return planned_weapon

    def resolve_unit_attack(
        self,
        attacker_unit: dict[str, Any],
        selected_weapon: dict[str, Any],
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
        self.attack(attacker_unit, selected_weapon, target_state, attack_context)

        if selected_weapon["range"].lower() != "melee":
            return

        for weapon in self.get_extra_attack_weapons(attacker_unit):
            if target_state["models"] <= 0:
                break
            self.log(f"\n{attacker_unit['name']} also makes attacks with {weapon['name']}")
            self.attack(attacker_unit, weapon, target_state, attack_context)

    def resolve_weapon_set_attack(
        self,
        attacker_unit: dict[str, Any],
        selected_weapons: list[dict[str, Any]],
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
        melee_selected = False
        for weapon in selected_weapons:
            if target_state["models"] <= 0:
                break
            if weapon["range"].lower() == "melee":
                melee_selected = True
            self.attack(attacker_unit, weapon, target_state, attack_context)

        if not melee_selected:
            return

        for weapon in self.get_extra_attack_weapons(attacker_unit):
            if target_state["models"] <= 0:
                break
            self.log(f"\n{attacker_unit['name']} also makes attacks with {weapon['name']}")
            self.attack(attacker_unit, weapon, target_state, attack_context)

    def build_target_state(self, unit: dict[str, Any], use_highest_bodyguard_toughness: bool = False) -> dict[str, Any]:
        target_profiles = [
            {
                **profile,
                "starting_models": max(0, int(profile.get("models", 0))),
                "effects": list(profile.get("effects", [])),
                "keywords": list(profile.get("keywords", [])),
                "ability_names": sorted(self.unit_ability_name_set(unit)),
            }
            for profile in unit.get("target_profiles", [])
            if profile.get("models", 0) > 0
        ]
        if target_profiles:
            target_profiles.sort(key=self.get_target_profile_sort_key)
            target_state = {
                "name": unit["name"],
                "toughness": unit["toughness"],
                "wounds": unit["wounds"],
                "current_wounds": unit["wounds"],
                "armor_save": unit["armor_save"],
                "invulnerable_save": unit["invulnerable_save"],
                "models": sum(profile["models"] for profile in target_profiles),
                "starting_models": self.get_unit_starting_model_count(unit),
                "effects": list(unit.get("effects", [])),
                "feel_no_pain": self.get_lowest_effect_value(unit.get("effects", []), "feel_no_pain"),
                "has_cover": False,
                "keywords": list(unit["keywords"]),
                "ability_names": sorted(self.unit_ability_name_set(unit)),
                "profiles": target_profiles,
            }
            if use_highest_bodyguard_toughness:
                target_state["uses_attached_bodyguard_toughness"] = True
            self.sync_target_state_profiles(target_state)
            if use_highest_bodyguard_toughness:
                target_state["toughness"] = max(
                    int(profile.get("toughness", 0))
                    for profile in target_profiles
                    if profile.get("models", 0) > 0
                )
            return target_state

        return {
            "name": unit["name"],
            "toughness": unit["toughness"],
            "wounds": unit["wounds"],
            "current_wounds": unit["wounds"],
            "armor_save": unit["armor_save"],
            "invulnerable_save": unit["invulnerable_save"],
            "models": unit["models"],
            "starting_models": self.get_unit_starting_model_count(unit),
            "effects": list(unit.get("effects", [])),
            "feel_no_pain": self.get_lowest_effect_value(unit.get("effects", []), "feel_no_pain"),
            "has_cover": False,
            "keywords": list(unit["keywords"]),
            "ability_names": sorted(self.unit_ability_name_set(unit)),
        }

    @staticmethod
    def summarize_state(target_state: dict[str, Any]) -> dict[str, Any]:
        starting_models = max(0, int(target_state.get("starting_models", target_state["models"])))
        models_remaining = max(0, int(target_state["models"]))
        if target_state.get("profiles"):
            current_total_wounds = sum(
                (
                    max(0, int(profile.get("current_wounds", 0)))
                    + max(0, int(profile.get("models", 0)) - 1) * max(0, int(profile.get("wounds", 0)))
                )
                if int(profile.get("models", 0)) > 0
                else 0
                for profile in target_state["profiles"]
            )
            starting_total_wounds = sum(
                max(0, int(profile.get("starting_models", profile.get("models", 0)))) * max(0, int(profile.get("wounds", 0)))
                for profile in target_state["profiles"]
            )
            if starting_total_wounds <= 0 and starting_models > 0:
                starting_total_wounds = starting_models * max(0, int(target_state.get("wounds", 0)))
        else:
            current_total_wounds = (
                max(0, int(target_state.get("current_wounds", 0)))
                + max(0, models_remaining - 1) * max(0, int(target_state.get("wounds", 0)))
            ) if models_remaining > 0 else 0
            starting_total_wounds = max(0, starting_models) * max(0, int(target_state.get("wounds", 0)))
        return {
            "name": target_state["name"],
            "starting_models": starting_models,
            "starting_total_wounds": starting_total_wounds,
            "models_remaining": models_remaining,
            "models_destroyed": max(0, starting_models - models_remaining),
            "current_model_wounds": target_state["current_wounds"],
            "current_total_wounds": current_total_wounds,
            "destroyed": target_state["models"] <= 0,
        }

    def build_sequence_state(
        self,
        options: dict[str, Any],
    ) -> dict[str, int]:
        attacker_detachment_name = str(options.get("attacker_detachment_name", "") or "")
        if attacker_detachment_name != "Saga of the Bold":
            return {
                "remaining_hit_rerolls": 0,
                "remaining_wound_rerolls": 0,
                "remaining_damage_rerolls": 0,
            }

        if bool(options.get("attacker_saga_completed", False)):
            return {
                "remaining_hit_rerolls": 1,
                "remaining_wound_rerolls": 1,
                "remaining_damage_rerolls": 1,
            }

        if not bool(options.get("attacker_package_is_character_unit", False)):
            return {
                "remaining_hit_rerolls": 0,
                "remaining_wound_rerolls": 0,
                "remaining_damage_rerolls": 0,
            }

        reroll_type = str(options.get("attacker_heroes_all_reroll_type", "") or "").lower()
        return {
            "remaining_hit_rerolls": 1 if reroll_type == "hit" else 0,
            "remaining_wound_rerolls": 1 if reroll_type == "wound" else 0,
            "remaining_damage_rerolls": 1 if reroll_type == "damage" else 0,
        }

    def build_attack_context(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        options: dict[str, Any],
        attached_character_unit: dict[str, Any] | None,
        target_has_cover: bool,
    ) -> dict[str, Any]:
        indirect_target_visible = options.get("indirect_target_visible", True)
        attacker_detachment_name = str(options.get("attacker_detachment_name", "") or "")
        defender_detachment_name = str(options.get("defender_detachment_name", "") or "")
        attacker_enhancement_name = str(options.get("attacker_enhancement_name", "") or "")
        defender_enhancement_name = str(options.get("defender_enhancement_name", "") or "")
        attacker_enhancement_bearer_name = str(options.get("attacker_enhancement_bearer_name", "") or "")
        attacker_has_attached_character = bool(options.get("attacker_has_attached_character", False))
        defender_has_attached_character = bool(options.get("defender_has_attached_character", False))
        attacker_package_model_count = int(options.get("attacker_package_model_count", attacker_unit.get("models", 0)))
        defender_package_model_count = int(options.get("defender_package_model_count", target_state.get("models", 0)))
        attacker_counts_as_ten_plus = bool(options.get("attacker_counts_as_ten_plus_models", False)) or attacker_package_model_count >= 10
        defender_counts_as_ten_plus = bool(options.get("defender_counts_as_ten_plus_models", False)) or defender_package_model_count >= 10
        attacker_active_ability_names = {
            str(name).lower()
            for name in options.get("attacker_active_ability_names", [])
        }
        attacker_attached_ability_names = {
            str(name).lower()
            for name in options.get("attacker_attached_ability_names", [])
        }
        attacker_ability_names = self.unit_ability_name_set(attacker_unit)
        attacker_or_attached_ability_names = attacker_ability_names | attacker_attached_ability_names

        temporary_weapon_keywords: set[str] = set()
        temporary_melee_weapon_keywords: set[str] = set()
        temporary_ranged_weapon_keywords: set[str] = set()
        temporary_weapon_keywords_by_weapon_name: dict[str, set[str]] = {}

        def add_keywords_to_matching_weapons(
            keywords_to_add: set[str],
            predicate: Any,
        ) -> None:
            if not keywords_to_add:
                return
            for candidate_weapon in attacker_unit["weapons"].values():
                if not predicate(candidate_weapon):
                    continue
                weapon_name = self.normalize_wargear_name(candidate_weapon["name"]).split(" - ", 1)[0]
                temporary_weapon_keywords_by_weapon_name.setdefault(weapon_name, set()).update(keywords_to_add)
        if bool(options.get("attacker_fire_discipline_active", False)):
            add_keywords_to_matching_weapons(
                {"Heavy", "Ignores Cover", "Assault"},
                lambda candidate_weapon: candidate_weapon["range"].lower() != "melee",
            )
        if bool(options.get("attacker_unforgiven_fury_active", False)):
            temporary_weapon_keywords.add("LH")
        if (
            "finest hour" in attacker_active_ability_names
            and self.unit_has_ability(attacker_unit, "Finest Hour")
        ):
            temporary_melee_weapon_keywords.add("DW")
        if "headhunters" in attacker_active_ability_names:
            temporary_weapon_keywords.update({"DW", "Precision"})
        if (
            bool(options.get("charged_this_turn", False))
            and weapon["range"].lower() == "melee"
            and self.unit_has_ability(attacker_unit, "Vanguard Assault")
        ):
            temporary_melee_weapon_keywords.add("LH")
        if (
            "overlapping detonations" in attacker_active_ability_names
            and not self.unit_has_keyword(target_state, "monster")
            and not self.unit_has_keyword(target_state, "vehicle")
        ):
            add_keywords_to_matching_weapons(
                {"Blast"},
                lambda candidate_weapon: (
                    candidate_weapon["range"].lower() != "melee"
                    and self.normalize_wargear_name(candidate_weapon["name"]).split(" - ", 1)[0] == "heavy bolter"
                ),
            )
        if (
            attacker_detachment_name == "Saga of the Beastslayer"
            and (
                bool(options.get("attacker_saga_completed", False))
                or any(
                    keyword in set(target_state.get("keywords", []))
                    for keyword in {"character", "monster", "vehicle"}
                )
            )
        ):
            temporary_weapon_keywords.add("LH")
        if attacker_enhancement_name == "Wolf Master":
            for weapon_name in ("teeth and claws", "tyrnak and fenrir"):
                temporary_weapon_keywords_by_weapon_name.setdefault(weapon_name, set()).add("LH")
        if attacker_detachment_name == "War Horde":
            add_keywords_to_matching_weapons(
                {"SH1"},
                lambda candidate_weapon: candidate_weapon["range"].lower() == "melee",
            )
        if (
            attacker_detachment_name == "Dread Mob"
            and options.get("attacker_try_dat_button_effects")
        ):
            button_effect_map = {
                "sustained_hits_1": {"SH1"},
                "lethal_hits": {"LH"},
            }
            applied_button_keywords = set()
            for button_effect in options.get("attacker_try_dat_button_effects", []):
                applied_button_keywords.update(button_effect_map.get(str(button_effect), set()))
            if applied_button_keywords:
                add_keywords_to_matching_weapons(
                    applied_button_keywords,
                    lambda candidate_weapon: candidate_weapon["range"].lower() == weapon["range"].lower(),
                )
        if (
            attacker_enhancement_name == "Headwoppa's Killchoppa"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            add_keywords_to_matching_weapons(
                {"DW"},
                lambda candidate_weapon: (
                    candidate_weapon["range"].lower() == "melee"
                    and not self.is_extra_attacks_weapon(candidate_weapon)
                ),
            )
        if attacker_enhancement_name == "Gitfinder Gogglez":
            add_keywords_to_matching_weapons(
                {"Ignores Cover"},
                lambda candidate_weapon: candidate_weapon["range"].lower() != "melee",
            )
        if bool(options.get("attacker_drag_it_down_active", False)):
            add_keywords_to_matching_weapons(
                {"SH1"},
                lambda candidate_weapon: candidate_weapon["range"].lower() == "melee",
            )
        if bool(options.get("attacker_blitza_fire_active", False)):
            add_keywords_to_matching_weapons(
                {"LH"},
                lambda candidate_weapon: candidate_weapon["range"].lower() != "melee",
            )
        if bool(options.get("attacker_dakkastorm_active", False)):
            add_keywords_to_matching_weapons(
                (
                    {"Sustained Hits 2"}
                    if bool(options.get("attacker_target_within_9", False))
                    else {"SH1"}
                ),
                lambda candidate_weapon: candidate_weapon["range"].lower() != "melee",
            )
        if (
            attacker_detachment_name == "Dread Mob"
            and bool(options.get("attacker_try_dat_button_hazardous", False))
        ):
            add_keywords_to_matching_weapons(
                {"Hazardous"},
                lambda candidate_weapon: candidate_weapon["range"].lower() == weapon["range"].lower(),
            )
        if bool(options.get("attacker_klankin_klaws_pushed", False)):
            add_keywords_to_matching_weapons(
                {"Hazardous"},
                lambda candidate_weapon: candidate_weapon["range"].lower() == "melee",
            )
        if bool(options.get("attacker_dakka_dakka_dakka_pushed", False)):
            add_keywords_to_matching_weapons(
                {"Hazardous"},
                lambda candidate_weapon: candidate_weapon["range"].lower() != "melee",
            )
        if bool(options.get("attacker_bigger_shells_pushed", False)):
            add_keywords_to_matching_weapons(
                {"Hazardous"},
                lambda candidate_weapon: candidate_weapon["range"].lower() != "melee",
            )

        attacker_hit_modifier = 0
        attacker_outgoing_wound_modifier = 0
        attacker_ap_modifier = 0
        reroll_hit_rolls_of_1 = False
        reroll_all_hit_rolls = False
        reroll_wound_rolls_of_1 = False
        reroll_all_wound_rolls = False
        current_weapon_base_name = self.weapon_base_name(weapon)
        if bool(options.get("attacker_stubborn_tenacity_active", False)) and bool(options.get("attacker_below_starting_strength", False)):
            attacker_hit_modifier += 1
            if bool(options.get("attacker_battleshocked", False)):
                attacker_outgoing_wound_modifier += 1
        if weapon["range"].lower() == "melee":
            if self.ability_names_include(attacker_or_attached_ability_names, "litany of hate"):
                attacker_outgoing_wound_modifier += 1
            if (
                self.ability_names_include(attacker_or_attached_ability_names, "might is right")
                or self.ability_names_include(attacker_or_attached_ability_names, "oathbound")
            ):
                attacker_hit_modifier += 1
            if self.ability_names_include(attacker_or_attached_ability_names, "prophet of da great waaagh"):
                attacker_hit_modifier += 1
                attacker_outgoing_wound_modifier += 1
            if (
                self.ability_names_include(attacker_or_attached_ability_names, "war howl")
                and str(options.get("attacker_primary_unit_name", "")) == "Blood Claws"
            ):
                reroll_all_wound_rolls = True
            if (
                self.ability_names_include(attacker_ability_names, "champion of the kingsguard")
                and self.unit_has_keyword(target_state, "character")
            ):
                reroll_all_hit_rolls = True
                reroll_all_wound_rolls = True
            if self.ability_names_include(attacker_ability_names, "death totem"):
                reroll_hit_rolls_of_1 = True
        if self.ability_names_include(attacker_or_attached_ability_names, "tempered ferocity"):
            temporary_weapon_keywords.add("SH1")
        if self.ability_names_include(attacker_ability_names, "cunning hunters"):
            if bool(options.get("defender_on_objective", False)):
                reroll_all_wound_rolls = True
            else:
                reroll_wound_rolls_of_1 = True
        if bool(options.get("defender_overwhelming_onslaught_active", False)) and weapon["range"].lower() == "melee":
            attacker_hit_modifier -= 1
        if bool(options.get("defender_stalkin_taktiks_active", False)) and weapon["range"].lower() != "melee" and self.unit_has_keyword(target_state, "infantry"):
            attacker_hit_modifier -= 1
        if (
            bool(options.get("plunging_fire_active", False))
            and weapon["range"].lower() != "melee"
            and not self.unit_has_keyword(attacker_unit, "aircraft")
            and not self.unit_has_keyword(target_state, "aircraft")
        ):
            attacker_hit_modifier += 1
        if bool(options.get("attacker_unbridled_ferocity_active", False)) and weapon["range"].lower() == "melee":
            attacker_outgoing_wound_modifier += 1
        if bool(options.get("attacker_full_throttle_active", False)) and weapon["range"].lower() == "melee":
            attacker_outgoing_wound_modifier += 1
        if (
            attacker_detachment_name == "Saga of the Hunter"
            and weapon["range"].lower() == "melee"
            and (
                bool(options.get("target_in_engagement_range_of_allies", False))
                or attacker_package_model_count > defender_package_model_count
            )
        ):
            attacker_hit_modifier += 1
            if bool(options.get("attacker_saga_completed", False)):
                attacker_outgoing_wound_modifier += 1
        if (
            attacker_detachment_name == "Da Big Hunt"
            and bool(options.get("attacker_prey_active", False))
            and self.unit_has_keyword(attacker_unit, "beast snagga")
        ):
            attacker_ap_modifier += 1
        if (
            bool(options.get("attacker_bigger_shells_active", False))
            and weapon["range"].lower() != "melee"
            and (
                self.unit_has_keyword(target_state, "monster")
                or self.unit_has_keyword(target_state, "vehicle")
            )
        ):
            attacker_outgoing_wound_modifier += 1
        if bool(options.get("attacker_armed_to_da_teef_active", False)):
            if bool(options.get("attacker_waaagh_active", False)):
                reroll_all_hit_rolls = True
            else:
                reroll_hit_rolls_of_1 = True
        if bool(options.get("attacker_dakka_dakka_dakka_active", False)) and weapon["range"].lower() != "melee":
            if bool(options.get("attacker_dakka_dakka_dakka_pushed", False)):
                reroll_all_hit_rolls = True
            else:
                reroll_hit_rolls_of_1 = True
        if (
            attacker_enhancement_name == "'Eadstompa"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            if bool(options.get("target_below_half_strength", False)):
                reroll_all_wound_rolls = True
            elif bool(options.get("target_below_starting_strength", False)):
                reroll_wound_rolls_of_1 = True

        melee_attack_bonus = 0
        melee_strength_bonus = 0
        melee_damage_bonus = 0
        ranged_strength_bonus = 0
        ranged_damage_bonus = 0
        ranged_attack_bonus = 0
        weapon_base_name = current_weapon_base_name
        if (
            "hail of bullets" in attacker_active_ability_names
            and weapon["range"].lower() != "melee"
            and weapon_base_name == "bolt rifle"
        ):
            ranged_attack_bonus += 2
        if (
            self.ability_names_include(attacker_ability_names, "waaagh energy")
            and weapon_base_name == "'eadbanger"
        ):
            model_count_bonus = attacker_package_model_count // 5
            ranged_strength_bonus += model_count_bonus
            ranged_damage_bonus += model_count_bonus
            if attacker_package_model_count >= 10:
                temporary_weapon_keywords_by_weapon_name.setdefault(weapon_base_name, set()).add("Blast")
        if (
            self.ability_names_include(attacker_ability_names, "battle-lust")
            and bool(options.get("charged_this_turn", False))
            and weapon_base_name == "frostfang"
        ):
            melee_attack_bonus += 2
        if bool(options.get("attacker_weapons_of_the_first_legion_active", False)):
            weapons_of_the_first_legion_bonus = 2 if bool(options.get("attacker_battleshocked", False)) else 1
            melee_attack_bonus += weapons_of_the_first_legion_bonus
            melee_strength_bonus += weapons_of_the_first_legion_bonus
            melee_damage_bonus += weapons_of_the_first_legion_bonus
        if bool(options.get("attacker_waaagh_active", False)) and self.unit_has_waaagh(attacker_unit):
            melee_attack_bonus += 1
            melee_strength_bonus += 1
        if (
            "finest hour" in attacker_active_ability_names
            and self.unit_has_ability(attacker_unit, "Finest Hour")
            and weapon["range"].lower() == "melee"
        ):
            melee_attack_bonus += 3
        if (
            "da biggest and da best" in attacker_active_ability_names
            and bool(options.get("attacker_waaagh_active", False))
            and weapon["range"].lower() == "melee"
        ):
            melee_attack_bonus += 4
        if (
            attacker_enhancement_name == "Feral Rage"
            and weapon["range"].lower() == "melee"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            melee_attack_bonus += 1
            if bool(options.get("charged_this_turn", False)):
                melee_attack_bonus += 1
        if (
            attacker_enhancement_name == "Braggart's Steel"
            and weapon["range"].lower() == "melee"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            melee_strength_bonus += 2
            if bool(options.get("attacker_boast_achieved", False)):
                melee_damage_bonus += 1
        if (
            attacker_enhancement_name == "Hordeslayer"
            and weapon["range"].lower() == "melee"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
            and bool(options.get("attacker_hordeslayer_outnumbered", False))
        ):
            melee_attack_bonus += 3 if bool(options.get("attacker_boast_achieved", False)) else 2
        if (
            attacker_enhancement_name == "Elder's Guidance"
            and bool(options.get("attacker_elders_guidance_active", False))
            and weapon["range"].lower() == "melee"
            and str(options.get("attacker_primary_unit_name", "")) == "Blood Claws"
        ):
            attacker_ap_modifier += 1
        if (
            attacker_enhancement_name == "Proper Killy"
            and weapon["range"].lower() == "melee"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            melee_damage_bonus += 1
        if (
            attacker_enhancement_name == "Ferocious Show Off"
            and weapon["range"].lower() == "melee"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            melee_strength_bonus += 3 if attacker_counts_as_ten_plus else 1
        if bool(options.get("attacker_klankin_klaws_active", False)) and weapon["range"].lower() == "melee":
            melee_strength_bonus += 2
            if bool(options.get("attacker_klankin_klaws_pushed", False)):
                melee_damage_bonus += 1
        if (
            bool(options.get("attacker_bigger_shells_active", False))
            and bool(options.get("attacker_bigger_shells_pushed", False))
            and weapon["range"].lower() != "melee"
            and (
                self.unit_has_keyword(target_state, "monster")
                or self.unit_has_keyword(target_state, "vehicle")
            )
        ):
            ranged_damage_bonus += 1
        if (
            self.ability_names_include(attacker_ability_names, "dead brutal")
            and bool(options.get("attacker_waaagh_active", False))
            and weapon_base_name == "'uge choppa"
        ):
            melee_damage_bonus += 1
        if (
            self.ability_names_include(attacker_ability_names, "thunderous charge")
            and bool(options.get("charged_this_turn", False))
            and weapon["range"].lower() == "melee"
            and weapon_base_name == "wolf guard weapon"
        ):
            melee_damage_bonus += 1
        if (
            self.ability_names_include(attacker_ability_names, "violent fury")
            and weapon["range"].lower() == "melee"
            and self.unit_has_multiple_melee_weapons(attacker_unit)
        ):
            temporary_weapon_keywords.add("Twin-linked")

        attacker_feel_no_pain = 0
        if bool(options.get("attacker_pennant_of_remembrance_active", False)):
            attacker_feel_no_pain = 4 if bool(options.get("attacker_battleshocked", False)) else 6
        if (
            attacker_enhancement_name == "Fenrisian Grit"
            and attacker_unit["name"] == attacker_enhancement_bearer_name
        ):
            attacker_feel_no_pain = self.combine_feel_no_pain_values(attacker_feel_no_pain, 4)

        target_incoming_wound_modifier = 0
        if bool(options.get("defender_unbreakable_lines_active", False)):
            target_incoming_wound_modifier -= 1
        if bool(options.get("defender_ard_as_nails_active", False)):
            target_incoming_wound_modifier -= 1
        if self.target_state_has_ability(target_state, "the emperor's shield"):
            target_incoming_wound_modifier -= 1
        effective_attack_strength_for_defense = weapon["strength"] + (
            melee_strength_bonus
            if weapon["range"].lower() == "melee"
            else ranged_strength_bonus
        )
        if (
            (
                self.target_state_has_ability(target_state, "legendary tenacity")
                or self.target_state_has_ability(target_state, "rugged resilience")
            )
            and effective_attack_strength_for_defense > int(target_state.get("toughness", 0))
        ):
            target_incoming_wound_modifier -= 1
        if (
            defender_enhancement_name == "Helm of the Beastslayer"
            and (
                self.unit_has_keyword(attacker_unit, "character")
                or self.unit_has_keyword(attacker_unit, "monster")
                or self.unit_has_keyword(attacker_unit, "vehicle")
            )
        ):
            attacker_ap_modifier += 1
        target_ap_modifier = -1 if bool(options.get("defender_armour_of_contempt_active", False)) else 0
        if bool(options.get("defender_hulking_brutes_active", False)):
            target_ap_modifier -= 1
        target_feel_no_pain = 0
        if (
            bool(options.get("defender_on_objective", False))
            and (
                self.unit_has_keyword(target_state, "Ancient")
                or self.target_state_has_ability(target_state, "Astartes Banner")
            )
        ):
            target_feel_no_pain = self.combine_feel_no_pain_values(target_feel_no_pain, 4)
        if bool(options.get("defender_pennant_of_remembrance_active", False)):
            target_feel_no_pain = 4 if bool(options.get("defender_battleshocked", False)) else 6
        if (
            defender_enhancement_name == "Fenrisian Grit"
            and bool(options.get("defender_enhancement_bearer_is_single_model_unit", False))
        ):
            target_feel_no_pain = self.combine_feel_no_pain_values(target_feel_no_pain, 4)
        if (
            self.target_state_has_ability(target_state, "Psychic Hood")
            and self.weapon_has_keyword(weapon, "Psychic")
        ):
            target_feel_no_pain = self.combine_feel_no_pain_values(target_feel_no_pain, 4)
        if (
            defender_enhancement_name == "Surly As a Squiggoth"
            and defender_has_attached_character
        ):
            if effective_attack_strength_for_defense > int(target_state.get("toughness", 0)):
                target_incoming_wound_modifier -= 1

        target_invulnerable_save = 0
        if bool(options.get("defender_waaagh_active", False)):
            target_invulnerable_save = self.combine_invulnerable_save_values(target_invulnerable_save, 5)
        if (
            defender_detachment_name == "Green Tide"
            and self.unit_has_keyword(target_state, "boyz")
        ):
            target_invulnerable_save = self.combine_invulnerable_save_values(target_invulnerable_save, 5)
        if bool(options.get("defender_speediest_freeks_active", False)):
            speediest_freeks_save = 5
            if self.unit_has_keyword(target_state, "vehicle") and int(target_state.get("toughness", 0)) <= 8:
                speediest_freeks_save = 4
            target_invulnerable_save = self.combine_invulnerable_save_values(target_invulnerable_save, speediest_freeks_save)

        reroll_save_rolls_of_1 = (
            defender_detachment_name == "Green Tide"
            and defender_counts_as_ten_plus
        )

        target_damage_modifier = -1 if bool(options.get("defender_extra_gubbinz_active", False)) else 0
        critical_wound_ap_modifier = 0
        if (
            attacker_detachment_name == "Dread Mob"
            and "critical_wound_ap_2" in {
                str(effect)
                for effect in options.get("attacker_try_dat_button_effects", [])
            }
        ):
            critical_wound_ap_modifier += 2

        target_has_stealth = False
        if bool(options.get("defender_stalkin_taktiks_active", False)) and weapon["range"].lower() != "melee":
            target_has_stealth = self.unit_has_keyword(target_state, "infantry")
        if defender_enhancement_name == "Smoky Gubbinz" and weapon["range"].lower() != "melee":
            target_has_stealth = True

        button_hazardous_active = (
            attacker_detachment_name == "Dread Mob"
            and bool(options.get("attacker_try_dat_button_hazardous", False))
        )
        additional_hazardous_source_active = (
            (weapon["range"].lower() == "melee" and bool(options.get("attacker_klankin_klaws_pushed", False)))
            or (weapon["range"].lower() != "melee" and bool(options.get("attacker_dakka_dakka_dakka_pushed", False)))
            or (weapon["range"].lower() != "melee" and bool(options.get("attacker_bigger_shells_pushed", False)))
        )
        hazardous_fail_threshold = 2
        if button_hazardous_active and (
            self.weapon_has_keyword(weapon, "Hazardous")
            or additional_hazardous_source_active
        ):
            hazardous_fail_threshold = 2
        elif additional_hazardous_source_active and self.weapon_has_keyword(weapon, "Hazardous"):
            hazardous_fail_threshold = 2

        attack_context = {
            "in_half_range": bool(options.get("in_half_range", False)),
            "charged_this_turn": bool(options.get("charged_this_turn", False)),
            "remained_stationary": bool(options.get("remained_stationary", False)),
            "hazardous_overwatch_charge_phase": bool(options.get("hazardous_overwatch_charge_phase", False)),
            "hazardous_bearer_current_wounds": options.get("hazardous_bearer_current_wounds"),
            "hazardous_bearer_feel_no_pain": options.get("hazardous_bearer_feel_no_pain"),
            "attacker_feel_no_pain": attacker_feel_no_pain,
            "indirect_no_visibility": self.weapon_has_keyword(weapon, "Indirect Fire") and not indirect_target_visible,
            "indirect_cover": self.weapon_has_keyword(weapon, "Indirect Fire") and not indirect_target_visible,
            "precision_target": None,
            "attacker_in_engagement_range": bool(options.get("attacker_in_engagement_range", False)),
            "target_in_engagement_range_of_allies": bool(options.get("target_in_engagement_range_of_allies", False)),
            "target_engaged_monster_vehicle": bool(options.get("target_engaged_monster_vehicle", False)),
            "attacker_eligible_model_count": options.get("attacker_eligible_model_count"),
            "oath_of_moment_active": bool(options.get("oath_of_moment_active", False))
            and self.unit_has_oath_of_moment(attacker_unit),
            "oath_of_moment_wound_bonus": 0,
            "temporary_weapon_keywords": temporary_weapon_keywords,
            "temporary_melee_weapon_keywords": temporary_melee_weapon_keywords,
            "temporary_ranged_weapon_keywords": temporary_ranged_weapon_keywords,
            "temporary_weapon_keywords_by_weapon_name": temporary_weapon_keywords_by_weapon_name,
            "reroll_hit_rolls_of_1": reroll_hit_rolls_of_1,
            "reroll_all_hit_rolls": reroll_all_hit_rolls,
            "reroll_wound_rolls_of_1": (
                reroll_wound_rolls_of_1
                or (
                    bool(options.get("attacker_marked_for_destruction_active", False))
                    and weapon["range"].lower() != "melee"
                )
                or (
                    bool(options.get("attacker_competitive_streak_active", False))
                    and weapon["range"].lower() == "melee"
                )
            ),
            "reroll_all_wound_rolls": (
                reroll_all_wound_rolls
                or (
                    bool(options.get("attacker_competitive_streak_active", False))
                    and weapon["range"].lower() == "melee"
                    and attacker_counts_as_ten_plus
                )
            ),
            "reroll_save_rolls_of_1": reroll_save_rolls_of_1,
            "critical_hit_threshold": min(
                6,
                *[
                    threshold
                    for threshold in [
                        5 if bool(options.get("attacker_unforgiven_fury_active", False))
                        and bool(options.get("attacker_unforgiven_fury_army_battleshocked", False)) else 6,
                        5 if bool(options.get("attacker_unbridled_carnage_active", False)) else 6,
                        5 if bool(options.get("attacker_drag_it_down_active", False))
                        and bool(options.get("attacker_prey_active", False)) else 6,
                        5 if bool(options.get("attacker_blitza_fire_active", False))
                        and bool(options.get("attacker_target_within_9", False)) else 6,
                        5 if self.ability_names_include(attacker_or_attached_ability_names, "prophet of da great waaagh")
                        and bool(options.get("attacker_waaagh_active", False))
                        and weapon["range"].lower() == "melee" else 6,
                    ]
                ],
            ),
            "attacker_hit_modifier": attacker_hit_modifier,
            "attacker_outgoing_wound_modifier": attacker_outgoing_wound_modifier,
            "attacker_ap_modifier": attacker_ap_modifier,
            "melee_attack_bonus": melee_attack_bonus,
            "melee_strength_bonus": melee_strength_bonus,
            "melee_damage_bonus": melee_damage_bonus,
            "ranged_strength_bonus": ranged_strength_bonus,
            "ranged_attack_bonus": ranged_attack_bonus,
            "ranged_damage_bonus": ranged_damage_bonus,
            "target_incoming_wound_modifier": target_incoming_wound_modifier,
            "target_ap_modifier": target_ap_modifier,
            "target_invulnerable_save": target_invulnerable_save,
            "target_feel_no_pain": target_feel_no_pain,
            "target_has_bonus_cover": bool(options.get("defender_stalkin_taktiks_active", False)) and weapon["range"].lower() != "melee",
            "target_has_stealth": target_has_stealth,
            "target_damage_modifier": target_damage_modifier,
            "critical_wound_ap_modifier": critical_wound_ap_modifier,
            "hazardous_fail_threshold": hazardous_fail_threshold,
            "attacker_active_ability_names": attacker_active_ability_names,
            "sequence_state": options.get("sequence_state", {}),
        }
        if attack_context["oath_of_moment_active"] and self.unit_gets_oath_wound_bonus(attacker_unit):
            attack_context["oath_of_moment_wound_bonus"] = 1
        if attached_character_unit is not None:
            precision_target = self.build_target_state(attached_character_unit)
            precision_target["keywords"] = sorted({
                *precision_target.get("keywords", []),
                *target_state.get("keywords", []),
            }, key=str.lower)
            precision_target["has_cover"] = target_has_cover
            self.apply_temporary_target_modifiers(precision_target, attack_context)
            attack_context["precision_target"] = precision_target
        return attack_context

    def validate_simulation_request(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        defender_unit: dict[str, Any],
        attack_context: dict[str, Any],
        attached_character_unit: dict[str, Any] | None,
    ) -> None:
        self.validate_ranged_attack_context(attacker_unit, weapon, attack_context)
        self.validate_blast_target_context(weapon, attack_context, defender_unit["name"])
        if weapon["range"].lower() == "melee":
            if self.unit_has_keyword(defender_unit, "aircraft") and not self.unit_has_keyword(attacker_unit, "fly"):
                raise CombatSimulationError("Only Flying units can select Aircraft units as melee targets.")
            if self.unit_has_keyword(attacker_unit, "aircraft") and not self.unit_has_keyword(defender_unit, "fly"):
                raise CombatSimulationError("Aircraft units can only make melee attacks that target Flying units.")
        if attached_character_unit is not None and not self.attack_sequence_has_keyword(attacker_unit, weapon, "Precision", attack_context):
            raise CombatSimulationError("Attached character selection is only valid for attacks that can use Precision.")

    def simulate(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        defender_unit: dict[str, Any],
        options: dict[str, Any] | None = None,
        attached_character_unit: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        options = options or {}
        options = {
            **options,
            "sequence_state": self.build_sequence_state(options),
        }
        self.log_messages = []
        self.stats = self.build_empty_stats()

        target_state = self.build_target_state(
            defender_unit,
            use_highest_bodyguard_toughness=bool(options.get("defender_has_attached_character", False)),
        )
        target_has_cover = bool(options.get("target_has_cover", False))
        target_state["has_cover"] = target_has_cover
        attack_context = self.build_attack_context(
            attacker_unit,
            weapon,
            target_state,
            options,
            attached_character_unit,
            target_has_cover,
        )
        self.apply_temporary_target_modifiers(target_state, attack_context)

        self.validate_simulation_request(
            attacker_unit,
            weapon,
            defender_unit,
            attack_context,
            attached_character_unit,
        )

        self.resolve_pre_attack_active_abilities(attacker_unit, weapon, target_state, attack_context)
        self.resolve_unit_attack(attacker_unit, weapon, target_state, attack_context)
        hazardous_bearer_state = self.resolve_hazardous_checks(attacker_unit, weapon, attack_context)

        result = {
            "log": list(self.log_messages),
            "stats": dict(self.stats),
            "target": self.summarize_state(target_state),
            "attack_resolution_plan": self.build_attack_resolution_plan([
                {
                    "weapon": self.get_planned_weapon(attacker_unit, weapon, attack_context),
                    "attack_mode": "fighting" if weapon["range"].lower() == "melee" else "shooting",
                    "target_id": defender_unit["name"],
                    "target_name": defender_unit["name"],
                },
            ]),
            "attached_character": (
                self.summarize_state(attack_context["precision_target"])
                if attack_context["precision_target"] is not None
                else None
            ),
            "hazardous_bearer": (
                self.summarize_state(hazardous_bearer_state)
                if hazardous_bearer_state is not None
                else None
            ),
            "context": {
                "in_half_range": attack_context.get("in_half_range", False),
                "charged_this_turn": attack_context.get("charged_this_turn", False),
                "remained_stationary": attack_context.get("remained_stationary", False),
                "indirect_no_visibility": attack_context.get("indirect_no_visibility", False),
                "attacker_in_engagement_range": attack_context.get("attacker_in_engagement_range", False),
                "target_has_cover": target_has_cover,
            },
        }
        return result

    def simulate_weapon_set(
        self,
        attacker_unit: dict[str, Any],
        weapons: list[dict[str, Any]],
        defender_unit: dict[str, Any],
        options: dict[str, Any] | None = None,
        attached_character_unit: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not weapons:
            raise CombatSimulationError("At least one weapon is required to run a weapon-set simulation.")

        options = options or {}
        options = {
            **options,
            "sequence_state": self.build_sequence_state(options),
        }
        self.log_messages = []
        self.stats = self.build_empty_stats()

        target_state = self.build_target_state(
            defender_unit,
            use_highest_bodyguard_toughness=bool(options.get("defender_has_attached_character", False)),
        )
        target_has_cover = bool(options.get("target_has_cover", False))
        target_state["has_cover"] = target_has_cover
        reference_weapon = weapons[0]
        attack_context = self.build_attack_context(
            attacker_unit,
            reference_weapon,
            target_state,
            options,
            attached_character_unit,
            target_has_cover,
        )
        self.apply_temporary_target_modifiers(target_state, attack_context)

        self.validate_simulation_request(
            attacker_unit,
            reference_weapon,
            defender_unit,
            attack_context,
            attached_character_unit,
        )

        self.resolve_pre_attack_active_abilities(attacker_unit, reference_weapon, target_state, attack_context)
        self.resolve_weapon_set_attack(attacker_unit, weapons, target_state, attack_context)

        result = {
            "log": list(self.log_messages),
            "stats": dict(self.stats),
            "target": self.summarize_state(target_state),
            "attack_resolution_plan": self.build_attack_resolution_plan([
                {
                    "weapon": self.get_planned_weapon(
                        attacker_unit,
                        weapon,
                        {"attacker_eligible_model_count": options.get("attacker_eligible_model_count")},
                    ),
                    "attack_mode": "fighting" if weapon["range"].lower() == "melee" else "shooting",
                    "target_id": defender_unit["name"],
                    "target_name": defender_unit["name"],
                }
                for weapon in weapons
            ]),
            "attached_character": (
                self.summarize_state(attack_context["precision_target"])
                if attack_context["precision_target"] is not None
                else None
            ),
            "hazardous_bearer": None,
            "context": {
                "in_half_range": attack_context.get("in_half_range", False),
                "oath_of_moment_active": attack_context.get("oath_of_moment_active", False),
                "charged_this_turn": attack_context.get("charged_this_turn", False),
                "target_has_cover": target_has_cover,
                "weapons": [weapon["name"] for weapon in weapons],
            },
        }
        return result

    def simulate_attack_sequence(
        self,
        attack_entries: list[dict[str, Any]],
        defender_unit: dict[str, Any],
        options: dict[str, Any] | None = None,
        attached_character_unit: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not attack_entries:
            raise CombatSimulationError("At least one attack entry is required to run a simulation.")

        options = options or {}
        options = {
            **options,
            "sequence_state": self.build_sequence_state(options),
        }
        self.log_messages = []
        self.stats = self.build_empty_stats()

        target_state = self.build_target_state(defender_unit)
        target_has_cover = bool(options.get("target_has_cover", False))
        target_state["has_cover"] = target_has_cover

        reference_entry = attack_entries[0]
        reference_weapon = reference_entry["weapons"][0]
        reference_context = self.build_attack_context(
            reference_entry["attacker_unit"],
            reference_weapon,
            target_state,
            options,
            None,
            target_has_cover,
        )
        self.apply_temporary_target_modifiers(target_state, reference_context)

        precision_target = None
        if attached_character_unit is not None:
            precision_target = self.build_target_state(attached_character_unit)
            precision_target["keywords"] = sorted({
                *precision_target.get("keywords", []),
                *target_state.get("keywords", []),
            }, key=str.lower)
            precision_target["has_cover"] = target_has_cover
            self.apply_temporary_target_modifiers(precision_target, reference_context)
            if not any(
                self.attack_sequence_has_keyword(
                    entry["attacker_unit"],
                    entry["weapons"][0],
                    "Precision",
                    self.build_attack_context(
                        entry["attacker_unit"],
                        entry["weapons"][0],
                        target_state,
                        options,
                        None,
                        target_has_cover,
                    ),
                )
                for entry in attack_entries
            ):
                raise CombatSimulationError(
                    "Attached character selection is only valid for attacks that can use Precision."
                )

        hazardous_bearers: list[dict[str, Any]] = []

        for index, entry in enumerate(attack_entries):
            attacker_unit = entry["attacker_unit"]
            weapons = entry["weapons"]
            if not weapons:
                continue

            reference_weapon = weapons[0]
            attack_context = self.build_attack_context(
                attacker_unit,
                reference_weapon,
                target_state,
                options,
                None,
                target_has_cover,
            )
            attack_context["precision_target"] = precision_target

            self.validate_ranged_attack_context(attacker_unit, reference_weapon, attack_context)
            self.validate_blast_target_context(reference_weapon, attack_context, defender_unit["name"])
            if reference_weapon["range"].lower() == "melee":
                if self.unit_has_keyword(defender_unit, "aircraft") and not self.unit_has_keyword(attacker_unit, "fly"):
                    raise CombatSimulationError("Only Flying units can select Aircraft units as melee targets.")
                if self.unit_has_keyword(attacker_unit, "aircraft") and not self.unit_has_keyword(defender_unit, "fly"):
                    raise CombatSimulationError("Aircraft units can only make melee attacks that target Flying units.")

            if index > 0:
                self.log(f"\n{attacker_unit['name']} attacks")

            self.resolve_pre_attack_active_abilities(attacker_unit, reference_weapon, target_state, attack_context)
            if len(weapons) == 1:
                self.resolve_unit_attack(attacker_unit, weapons[0], target_state, attack_context)
                hazardous_bearer_state = self.resolve_hazardous_checks(
                    attacker_unit,
                    weapons[0],
                    attack_context,
                )
            else:
                self.resolve_weapon_set_attack(attacker_unit, weapons, target_state, attack_context)
                hazardous_bearer_state = None

            if hazardous_bearer_state is not None:
                hazardous_bearers.append(
                    {
                        "unit": attacker_unit["name"],
                        **self.summarize_state(hazardous_bearer_state),
                    }
                )

        return {
            "log": list(self.log_messages),
            "stats": dict(self.stats),
            "target": self.summarize_state(target_state),
            "attack_resolution_plan": self.build_attack_resolution_plan([
                {
                    "weapon": self.get_planned_weapon(
                        entry["attacker_unit"],
                        weapon,
                        {"attacker_eligible_model_count": options.get("attacker_eligible_model_count")},
                    ),
                    "attack_mode": "fighting" if weapon["range"].lower() == "melee" else "shooting",
                    "target_id": defender_unit["name"],
                    "target_name": defender_unit["name"],
                }
                for entry in attack_entries
                for weapon in entry["weapons"]
            ]),
            "attached_character": (
                self.summarize_state(precision_target)
                if precision_target is not None
                else None
            ),
            "hazardous_bearer": (
                hazardous_bearers[0]
                if len(hazardous_bearers) == 1
                else None
            ),
            "hazardous_bearers": hazardous_bearers,
            "context": {
                "in_half_range": bool(options.get("in_half_range", False)),
                "oath_of_moment_active": bool(options.get("oath_of_moment_active", False)),
                "charged_this_turn": bool(options.get("charged_this_turn", False)),
                "target_has_cover": target_has_cover,
                "attackers": [
                    {
                        "unit": entry["attacker_unit"]["name"],
                        "weapons": [weapon["name"] for weapon in entry["weapons"]],
                    }
                    for entry in attack_entries
                ],
            },
        }
