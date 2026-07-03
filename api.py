from __future__ import annotations

from copy import deepcopy
from functools import lru_cache
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from combat_engine import CombatSimulationError, CombatSimulator
from data_loader import (
    DATA_DIR,
    GAME_HEADING,
    apply_unit_loadout,
    get_faction,
    get_unit,
    list_faction_summaries,
    list_unit_summaries,
    load_factions,
    serialize_unit,
)

ALL_RANGED_WEAPONS = "__all_ranged__"
ALL_MELEE_WEAPONS = "__all_melee__"
ATTACHED_LEADER_WEAPON_PREFIX = "__attacker_leader__::"


class SimulationOptions(BaseModel):
    target_has_cover: bool = False
    attacker_in_engagement_range: bool = False
    target_in_engagement_range_of_allies: bool = False
    target_engaged_monster_vehicle: bool = False
    in_half_range: bool = False
    attacker_eligible_model_count: int | None = Field(default=None, ge=0)
    defender_current_model_count: int | None = Field(default=None, ge=0)
    oath_of_moment_active: bool = False
    charged_this_turn: bool = False
    remained_stationary: bool = False
    indirect_target_visible: bool = True
    plunging_fire_active: bool = False
    attached_character_name: str | None = None
    hazardous_overwatch_charge_phase: bool = False
    hazardous_bearer_current_wounds: int | None = Field(default=None, ge=0)
    hazardous_bearer_feel_no_pain: int | None = Field(default=None, ge=2, le=6)
    attacker_fire_discipline_active: bool = False
    attacker_marked_for_destruction_active: bool = False
    attacker_unforgiven_fury_active: bool = False
    attacker_unforgiven_fury_army_battleshocked: bool = False
    attacker_stubborn_tenacity_active: bool = False
    attacker_weapons_of_the_first_legion_active: bool = False
    attacker_pennant_of_remembrance_active: bool = False
    attacker_below_starting_strength: bool = False
    attacker_battleshocked: bool = False
    attacker_saga_completed: bool = False
    attacker_elders_guidance_active: bool = False
    attacker_boast_achieved: bool = False
    attacker_hordeslayer_outnumbered: bool = False
    attacker_heroes_all_reroll_type: str | None = None
    attacker_unbridled_ferocity_active: bool = False
    attacker_waaagh_active: bool = False
    defender_waaagh_active: bool = False
    attacker_prey_active: bool = False
    attacker_target_within_9: bool = False
    attacker_counts_as_ten_plus_models: bool = False
    defender_counts_as_ten_plus_models: bool = False
    target_below_starting_strength: bool = False
    target_below_half_strength: bool = False
    attacker_try_dat_button_effects: list[str] = Field(default_factory=list)
    attacker_try_dat_button_hazardous: bool = False
    attacker_unbridled_carnage_active: bool = False
    defender_ard_as_nails_active: bool = False
    attacker_drag_it_down_active: bool = False
    defender_stalkin_taktiks_active: bool = False
    defender_speediest_freeks_active: bool = False
    attacker_blitza_fire_active: bool = False
    attacker_dakkastorm_active: bool = False
    attacker_full_throttle_active: bool = False
    attacker_klankin_klaws_active: bool = False
    attacker_klankin_klaws_pushed: bool = False
    attacker_dakka_dakka_dakka_active: bool = False
    attacker_dakka_dakka_dakka_pushed: bool = False
    attacker_bigger_shells_active: bool = False
    attacker_bigger_shells_pushed: bool = False
    defender_extra_gubbinz_active: bool = False
    attacker_competitive_streak_active: bool = False
    attacker_armed_to_da_teef_active: bool = False
    defender_hulking_brutes_active: bool = False
    defender_armour_of_contempt_active: bool = False
    defender_overwhelming_onslaught_active: bool = False
    defender_unbreakable_lines_active: bool = False
    defender_pennant_of_remembrance_active: bool = False
    defender_battleshocked: bool = False


class SimulationRequest(BaseModel):
    attacker_faction: str
    attacker_unit: str
    attacker_detachment_name: str | None = None
    attacker_enhancement_name: str | None = None
    attacker_loadout: dict[str, Any] = Field(default_factory=dict)
    attacker_model_count: int | None = Field(default=None, ge=1)
    attacker_model_counts: dict[str, int] = Field(default_factory=dict)
    attacker_attached_character_name: str | None = None
    attacker_attached_character_loadout: dict[str, Any] = Field(default_factory=dict)
    attacker_attached_character_model_count: int | None = Field(default=None, ge=1)
    attacker_attached_character_model_counts: dict[str, int] = Field(default_factory=dict)
    weapon_name: str | None = None
    weapon_names: list[str] = Field(default_factory=list)
    defender_faction: str
    defender_unit: str
    defender_detachment_name: str | None = None
    defender_enhancement_name: str | None = None
    defender_loadout: dict[str, Any] = Field(default_factory=dict)
    defender_model_count: int | None = Field(default=None, ge=1)
    defender_model_counts: dict[str, int] = Field(default_factory=dict)
    attached_character_loadout: dict[str, Any] = Field(default_factory=dict)
    attached_character_model_count: int | None = Field(default=None, ge=1)
    attached_character_model_counts: dict[str, int] = Field(default_factory=dict)
    options: SimulationOptions = Field(default_factory=SimulationOptions)
    seed: int | None = None


class UnitRulesRequest(BaseModel):
    faction: str
    unit: str
    loadout: dict[str, Any] = Field(default_factory=dict)
    model_count: int | None = Field(default=None, ge=1)
    model_counts: dict[str, int] = Field(default_factory=dict)
    seed: int | None = None


class BattlefieldPoint(BaseModel):
    x: float
    y: float


class BattlefieldModel(BaseModel):
    id: str | None = None
    x: float
    y: float
    z: float = 0
    base_diameter: float


class ModelState(BaseModel):
    id: str | None = None
    name: str | None = None
    wounds: int = Field(gt=0)
    current_wounds: int | None = Field(default=None, ge=0)
    keywords: list[str] = Field(default_factory=list)
    is_character: bool = False


class VisibilityRequest(BaseModel):
    observing_model: BattlefieldModel
    observed_model: BattlefieldModel
    blocking_models: list[BattlefieldModel] = Field(default_factory=list)
    line_width: float = Field(default=1 / 25.4, gt=0)
    sample_count: int = Field(default=16, ge=4, le=64)


class MortalWoundsRequest(BaseModel):
    models: list[ModelState]
    mortal_wounds: int = Field(ge=0)


class HazardRollRequest(BaseModel):
    unit: dict[str, Any]
    roll_count: int = Field(ge=0)
    fail_threshold: int = Field(default=2, ge=1, le=6)


class CommandPhaseRequest(BaseModel):
    faction: str | None = None
    unit: str | None = None
    loadout: dict[str, Any] = Field(default_factory=dict)
    model_count: int | None = Field(default=None, ge=1)
    model_counts: dict[str, int] = Field(default_factory=dict)
    current_model_count: int | None = Field(default=None, ge=0)
    starting_model_count: int | None = Field(default=None, ge=1)
    current_wounds: int | None = Field(default=None, ge=0)
    starting_wounds: int | None = Field(default=None, ge=1)
    unit_battle_shocked: bool = False
    active_player_cp: int = Field(default=0, ge=0)
    opponent_cp: int = Field(default=0, ge=0)
    resolve_battle_shock: bool = False
    seed: int | None = None


class ModelMoveRequest(BaseModel):
    start: BattlefieldPoint
    end: BattlefieldPoint
    base_diameter: float = Field(gt=0)
    maximum_distance: float = Field(ge=0)
    battlefield_width: float = Field(gt=0)
    battlefield_height: float = Field(gt=0)
    enemy_models: list[BattlefieldModel] = Field(default_factory=list)
    friendly_models: list[BattlefieldModel] = Field(default_factory=list)
    move_type: str = "normal"
    advance_roll: int = Field(default=0, ge=0, le=6)
    unit_engaged_before: bool = False
    unit_battle_shocked: bool = False
    fall_back_mode: str | None = None


class UnitSetupRequest(BaseModel):
    models: list[BattlefieldModel]
    enemy_models: list[BattlefieldModel] = Field(default_factory=list)
    battlefield_width: float = Field(gt=0)
    battlefield_height: float = Field(gt=0)
    other_requirements_met: bool = True


class UnitCoherencyRequest(BaseModel):
    models: list[BattlefieldModel]


class UnitEngagementRequest(BaseModel):
    models: list[BattlefieldModel]
    enemy_models: list[BattlefieldModel] = Field(default_factory=list)


class WeaponSelectionRulesRequest(BaseModel):
    faction: str
    unit: str
    attack_mode: str
    weapon_names: list[str] = Field(default_factory=list)
    loadout: dict[str, Any] = Field(default_factory=dict)
    model_count: int | None = Field(default=None, ge=1)
    model_counts: dict[str, int] = Field(default_factory=dict)
    strict_single_model: bool = False


class ShootingTypeRequest(BaseModel):
    shooting_type: str = "normal"
    unit_on_battlefield: bool = True
    selected_to_shoot_this_phase: bool = False
    unit_engaged: bool = False
    advanced_this_turn: bool = False
    has_assault_weapons: bool = False
    has_close_quarters_weapons: bool = False
    has_indirect_fire_weapons: bool = False
    unit_is_monster_vehicle: bool = False
    remained_stationary: bool = False
    target_visible_to_friendly_unit: bool = False


class ChargeRequest(BaseModel):
    distance_to_enemy: float = Field(ge=0)
    charge_target_distances: list[float] = Field(default_factory=list)
    unit_on_battlefield: bool = True
    declared_charge_this_phase: bool = False
    unit_engaged: bool = False
    advanced_this_turn: bool = False
    fell_back_this_turn: bool = False
    target_count: int = Field(default=1, ge=0)
    attempted_charge_move: bool = True
    all_models_ended_closer: bool = True
    models_within_one_if_possible: bool = True
    models_engaged_if_possible: bool = True
    all_charge_targets_engaged_after: bool = True
    engaged_with_non_charge_targets_after: bool = False
    seed: int | None = None


class PileInRequest(BaseModel):
    start_distance_to_closest_target: float = Field(ge=0)
    end_distance_to_closest_target: float = Field(ge=0)
    distance_moved: float = Field(ge=0)
    is_fight_phase: bool = True
    unit_engaged: bool = False
    made_charge_move_this_turn: bool = False
    selected_to_make_overwatching_fight: bool = False
    pile_in_target_within_5: bool = False
    model_in_base_contact: bool = False
    model_moved: bool = True
    model_ended_engaged_if_possible: bool = True
    unit_engaged_after: bool = True
    started_engaged_enemy_still_engaged: bool = True


class FightTypeRequest(BaseModel):
    fight_type: str = "normal"
    selected_to_fight_this_phase: bool = False
    unit_engaged: bool = False
    unit_was_engaged_at_start_of_fight_step: bool = False
    made_charge_move_this_turn: bool = False
    became_engaged_during_fight_phase: bool = False
    has_fights_first: bool = False
    resolving_fights_first: bool = False
    resolving_remaining_combats: bool = True


class ConsolidateRequest(BaseModel):
    consolidation_mode: str
    distance_moved: float = Field(ge=0)
    is_fight_phase: bool = True
    eligible_to_fight_this_phase: bool = False
    unit_engaged: bool = False
    enemy_unit_within_3: bool = False
    objective_within_3: bool = False
    selected_enemy_units_count: int = Field(default=0, ge=0)
    selected_objective: bool = False
    model_in_base_contact: bool = False
    model_moved: bool = True
    moved_model_ended_closer_to_selected_enemy: bool = True
    moved_model_ended_engaged_if_possible: bool = True
    moved_model_ended_within_objective_if_possible: bool = True
    moved_model_ended_closer_to_objective: bool = True
    started_engaged_enemy_still_engaged: bool = True
    all_selected_enemy_units_engaged_after: bool = True
    engaged_enemy_units_unselected_to_fight: bool = False
    selected_objective_in_range_after: bool = True


class WeaponTargetRulesRequest(BaseModel):
    weapon: dict[str, Any]
    attack_mode: str
    targets: list[dict[str, Any]] = Field(default_factory=list)
    target_selected: bool = True


class AttackResolutionAssignment(BaseModel):
    weapon: dict[str, Any]
    attack_mode: str
    target_id: str | None = None
    target_name: str | None = None
    target_selected: bool = True
    declared_attacks: int | None = Field(default=None, ge=0)
    applicable_rules: list[str] = Field(default_factory=list)


class AttackResolutionPlanRequest(BaseModel):
    weapon_targets: list[AttackResolutionAssignment]


ATTACKER_STRATAGEM_OPTION_KEYS = {
    "attacker_fire_discipline_active",
    "attacker_marked_for_destruction_active",
    "attacker_unforgiven_fury_active",
    "attacker_unbridled_ferocity_active",
    "attacker_unbridled_carnage_active",
    "attacker_drag_it_down_active",
    "attacker_blitza_fire_active",
    "attacker_dakkastorm_active",
    "attacker_full_throttle_active",
    "attacker_klankin_klaws_active",
    "attacker_klankin_klaws_pushed",
    "attacker_dakka_dakka_dakka_active",
    "attacker_dakka_dakka_dakka_pushed",
    "attacker_bigger_shells_active",
    "attacker_bigger_shells_pushed",
    "attacker_competitive_streak_active",
    "attacker_armed_to_da_teef_active",
}

DEFENDER_STRATAGEM_OPTION_KEYS = {
    "defender_ard_as_nails_active",
    "defender_stalkin_taktiks_active",
    "defender_speediest_freeks_active",
    "defender_extra_gubbinz_active",
    "defender_hulking_brutes_active",
    "defender_armour_of_contempt_active",
    "defender_overwhelming_onslaught_active",
    "defender_unbreakable_lines_active",
}


@lru_cache(maxsize=1)
def get_factions() -> dict[str, dict]:
    return load_factions(DATA_DIR)


def parse_loadout_query(loadout: str | None) -> dict[str, Any]:
    if not loadout:
        return {}

    try:
        parsed = json.loads(loadout)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid loadout query payload.") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="Loadout query payload must be an object.")

    return {
        str(group_id): option_value
        for group_id, option_value in parsed.items()
    }


def parse_model_counts_query(model_counts: str | None) -> dict[str, int]:
    if not model_counts:
        return {}

    try:
        parsed = json.loads(model_counts)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid model_counts query payload.") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="model_counts query payload must be an object.")

    try:
        return {
            str(model_name): int(model_count)
            for model_name, model_count in parsed.items()
        }
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="model_counts query payload must map model names to integers.") from exc


def unit_can_lead_target(leader_unit: dict[str, object], target_unit_name: str) -> bool:
    leader_data = leader_unit.get("leader")
    if not isinstance(leader_data, dict):
        return False
    can_lead = leader_data.get("can_lead")
    if not isinstance(can_lead, list):
        return False
    return target_unit_name in can_lead


def unit_has_keyword(unit: dict[str, object], keyword: str) -> bool:
    keyword_lower = keyword.lower()
    return any(str(item).lower() == keyword_lower for item in unit.get("keywords", []))


def apply_attached_unit_keywords(bodyguard_unit: dict[str, Any], leader_unit: dict[str, Any] | None) -> None:
    if leader_unit is None:
        return

    combined_keywords = {
        str(keyword)
        for keyword in bodyguard_unit.get("keywords", [])
    }
    combined_keywords.update(str(keyword) for keyword in leader_unit.get("keywords", []))
    bodyguard_unit["keywords"] = sorted(combined_keywords, key=str.lower)
    bodyguard_unit["attached_component_keywords"] = {
        "bodyguard": list(bodyguard_unit.get("display_keywords", bodyguard_unit.get("keywords", []))),
        "leader_support": list(leader_unit.get("display_keywords", leader_unit.get("keywords", []))),
    }


def apply_feel_no_pain_to_unit(unit: dict[str, Any], value: int) -> None:
    effect = {"type": "feel_no_pain", "value": value}
    unit_effects = list(unit.get("effects", []))
    unit_effects.append(effect)
    unit["effects"] = unit_effects
    unit["feel_no_pain"] = CombatSimulator.get_lowest_effect_value(unit_effects, "feel_no_pain")

    for profile in unit.get("target_profiles", []):
        profile_effects = list(profile.get("effects", []))
        profile_effects.append(effect)
        profile["effects"] = profile_effects
        profile["feel_no_pain"] = CombatSimulator.combine_feel_no_pain_values(
            int(profile.get("feel_no_pain", 0)),
            value,
        )


def apply_bonus_wounds_to_unit(unit: dict[str, Any], bonus_wounds: int) -> None:
    unit["wounds"] = int(unit.get("wounds", 0)) + bonus_wounds
    unit["current_wounds"] = int(unit.get("current_wounds", unit["wounds"])) + bonus_wounds

    stats = unit.get("stats")
    if isinstance(stats, dict):
        stats["wounds"] = int(stats.get("wounds", 0)) + bonus_wounds

    for profile in unit.get("target_profiles", []):
        profile["wounds"] = int(profile.get("wounds", 0)) + bonus_wounds
        profile["current_wounds"] = int(profile.get("current_wounds", profile["wounds"])) + bonus_wounds


def apply_simulation_enhancement_modifiers(unit: dict[str, Any], enhancement_name: str | None) -> None:
    if not enhancement_name:
        return

    if enhancement_name == "Supa-Cybork Body":
        apply_feel_no_pain_to_unit(unit, 4)
        return

    if enhancement_name == "Da Biggest Boss":
        apply_bonus_wounds_to_unit(unit, 2)


def load_requested_unit(request: UnitRulesRequest) -> dict[str, Any]:
    factions = get_factions()
    try:
        return deepcopy(apply_unit_loadout(
            get_unit(factions, request.faction, request.unit),
            request.loadout,
            request.model_count,
            request.model_counts,
        ))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def load_weapon_selection_unit(request: WeaponSelectionRulesRequest) -> dict[str, Any]:
    factions = get_factions()
    try:
        return deepcopy(apply_unit_loadout(
            get_unit(factions, request.faction, request.unit),
            request.loadout,
            request.model_count,
            request.model_counts,
        ))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def apply_battle_shock_option_restrictions(options: dict[str, Any]) -> dict[str, Any]:
    restricted_options = dict(options)
    if bool(restricted_options.get("attacker_battleshocked", False)):
        for option_key in ATTACKER_STRATAGEM_OPTION_KEYS:
            restricted_options[option_key] = False

    if bool(restricted_options.get("defender_battleshocked", False)):
        for option_key in DEFENDER_STRATAGEM_OPTION_KEYS:
            restricted_options[option_key] = False

    return restricted_options


def resolve_requested_weapons(attacker_unit: dict[str, Any], weapon_name: str) -> list[dict[str, Any]]:
    weapons = list(attacker_unit["weapons"].values())
    if weapon_name == ALL_RANGED_WEAPONS:
        return [
            weapon
            for weapon in weapons
            if weapon["range"].lower() != "melee"
        ]
    if weapon_name == ALL_MELEE_WEAPONS:
        return [
            weapon
            for weapon in weapons
            if weapon["range"].lower() == "melee" and not CombatSimulator.is_extra_attacks_weapon(weapon)
        ]

    selected_weapon = attacker_unit["weapons"].get(weapon_name)
    if selected_weapon is None:
        return []
    return [selected_weapon]


def build_attack_entry(
    attacker_unit: dict[str, Any],
    weapons: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "attacker_unit": attacker_unit,
        "weapons": weapons,
    }


def resolve_requested_attack_entries(
    attacker_unit: dict[str, Any],
    weapon_names: list[str],
    attacker_attached_character_unit: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    attack_entries_by_unit: dict[str, dict[str, Any]] = {}
    unit_order: list[str] = []

    def add_weapons_for_unit(source_unit: dict[str, Any], weapons: list[dict[str, Any]]) -> None:
        if not weapons:
            return
        unit_name = str(source_unit["name"])
        if unit_name not in attack_entries_by_unit:
            attack_entries_by_unit[unit_name] = build_attack_entry(source_unit, [])
            unit_order.append(unit_name)
        entry = attack_entries_by_unit[unit_name]
        existing_weapon_names = {weapon["name"] for weapon in entry["weapons"]}
        for weapon in weapons:
            if weapon["name"] in existing_weapon_names:
                continue
            entry["weapons"].append(weapon)
            existing_weapon_names.add(weapon["name"])

    for weapon_name in weapon_names:
        if weapon_name == ALL_RANGED_WEAPONS:
            add_weapons_for_unit(
                attacker_unit,
                resolve_requested_weapons(attacker_unit, ALL_RANGED_WEAPONS),
            )
            if attacker_attached_character_unit is not None:
                add_weapons_for_unit(
                    attacker_attached_character_unit,
                    resolve_requested_weapons(attacker_attached_character_unit, ALL_RANGED_WEAPONS),
                )
            continue

        if weapon_name == ALL_MELEE_WEAPONS:
            add_weapons_for_unit(
                attacker_unit,
                resolve_requested_weapons(attacker_unit, ALL_MELEE_WEAPONS),
            )
            if attacker_attached_character_unit is not None:
                add_weapons_for_unit(
                    attacker_attached_character_unit,
                    resolve_requested_weapons(attacker_attached_character_unit, ALL_MELEE_WEAPONS),
                )
            continue

        if weapon_name.startswith(ATTACHED_LEADER_WEAPON_PREFIX):
            if attacker_attached_character_unit is None:
                return []
            leader_weapon_name = weapon_name.removeprefix(ATTACHED_LEADER_WEAPON_PREFIX)
            leader_weapons = resolve_requested_weapons(attacker_attached_character_unit, leader_weapon_name)
            if not leader_weapons:
                return []
            add_weapons_for_unit(attacker_attached_character_unit, leader_weapons)
            continue

        attacker_weapons = resolve_requested_weapons(attacker_unit, weapon_name)
        if not attacker_weapons:
            return []
        add_weapons_for_unit(attacker_unit, attacker_weapons)

    return [
        attack_entries_by_unit[unit_name]
        for unit_name in unit_order
        if attack_entries_by_unit[unit_name]["weapons"]
    ]


app = FastAPI(title="40K Combat Sim API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "40K Combat Sim API",
        "group": GAME_HEADING,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/rules/turn-structure")
def get_turn_structure() -> dict[str, object]:
    return CombatSimulator.get_turn_structure()


@app.post("/rules/command-phase")
def resolve_command_phase(request: CommandPhaseRequest) -> dict[str, object]:
    requested_unit: dict[str, Any] | None = None
    if request.faction and request.unit:
        requested_unit = load_requested_unit(UnitRulesRequest(
            faction=request.faction,
            unit=request.unit,
            loadout=request.loadout,
            model_count=request.model_count,
            model_counts=request.model_counts,
            seed=request.seed,
        ))
        requested_unit["battle_shocked"] = request.unit_battle_shocked
        if request.current_model_count is not None:
            requested_unit["models"] = request.current_model_count
        if request.starting_model_count is not None:
            requested_unit["starting_models"] = request.starting_model_count
        if request.current_wounds is not None:
            requested_unit["current_wounds"] = request.current_wounds
        if request.starting_wounds is not None:
            requested_unit["starting_wounds"] = request.starting_wounds
    elif any([request.faction, request.unit]):
        raise HTTPException(status_code=400, detail="Both faction and unit are required when resolving a unit in the Command phase.")

    simulator = CombatSimulator(seed=request.seed)
    try:
        return simulator.resolve_command_phase(
            requested_unit,
            active_player_cp=request.active_player_cp,
            opponent_cp=request.opponent_cp,
            make_battle_shock_roll=request.resolve_battle_shock,
        )
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/factions")
def list_factions() -> dict[str, object]:
    factions = get_factions()
    return {
        "group": GAME_HEADING,
        "items": list_faction_summaries(factions),
    }


@app.get("/factions/{faction_name}")
def get_faction_details(faction_name: str) -> dict[str, object]:
    factions = get_factions()
    try:
        faction = get_faction(factions, faction_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "name": faction["name"],
        "parent_faction": faction["parent_faction"],
        "army_rules": faction.get("army_rules", []),
        "chapter_rules": faction.get("chapter_rules", []),
        "detachments": faction["detachments"],
        "inherits": faction["inherits"],
        "derived_keywords": faction["derived_keywords"],
        "units": list_unit_summaries(faction),
    }


@app.get("/factions/{faction_name}/units")
def get_units(faction_name: str) -> dict[str, object]:
    factions = get_factions()
    try:
        faction = get_faction(factions, faction_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "faction": faction_name,
        "items": list_unit_summaries(faction),
    }


@app.get("/factions/{faction_name}/units/{unit_name}")
def get_unit_details(
    faction_name: str,
    unit_name: str,
    loadout: str | None = None,
    model_count: int | None = None,
    model_counts: str | None = None,
) -> dict[str, object]:
    factions = get_factions()
    try:
        base_unit = get_unit(factions, faction_name, unit_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    try:
        unit = apply_unit_loadout(
            base_unit,
            parse_loadout_query(loadout),
            model_count,
            parse_model_counts_query(model_counts),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return serialize_unit(unit)


@app.post("/rules/leadership-roll")
def make_leadership_roll(request: UnitRulesRequest) -> dict[str, object]:
    unit = load_requested_unit(request)
    simulator = CombatSimulator(seed=request.seed)
    try:
        return simulator.make_leadership_roll(unit)
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/rules/battle-shock-roll")
def make_battle_shock_roll(request: UnitRulesRequest) -> dict[str, object]:
    unit = load_requested_unit(request)
    simulator = CombatSimulator(seed=request.seed)
    try:
        roll_result = simulator.make_battle_shock_roll(unit)
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    CombatSimulator.apply_battle_shock_state(unit, bool(roll_result["battle_shocked"]))
    return {
        **roll_result,
        "unit_state": {
            "battle_shocked": unit["battle_shocked"],
            "objective_control": unit.get("stats", {}).get("objective_control"),
            "can_be_targeted_by_stratagems": unit["can_be_targeted_by_stratagems"],
            "eligible_to_start_action": unit["eligible_to_start_action"],
            "action_can_be_completed": unit["action_can_be_completed"],
        },
    }


@app.post("/rules/model-move")
def validate_model_move(request: ModelMoveRequest) -> dict[str, object]:
    return CombatSimulator.validate_model_move(
        request.start.model_dump(),
        request.end.model_dump(),
        request.base_diameter,
        request.maximum_distance,
        request.battlefield_width,
        request.battlefield_height,
        [enemy_model.model_dump() for enemy_model in request.enemy_models],
        [friendly_model.model_dump() for friendly_model in request.friendly_models],
        request.move_type,
        request.advance_roll,
        request.unit_engaged_before,
        request.unit_battle_shocked,
        request.fall_back_mode,
    )


@app.post("/rules/unit-setup")
def validate_unit_setup(request: UnitSetupRequest) -> dict[str, object]:
    return CombatSimulator.validate_unit_setup(
        [model.model_dump() for model in request.models],
        [enemy_model.model_dump() for enemy_model in request.enemy_models],
        request.battlefield_width,
        request.battlefield_height,
        request.other_requirements_met,
    )


@app.post("/rules/unit-coherency")
def validate_unit_coherency(request: UnitCoherencyRequest) -> dict[str, object]:
    return CombatSimulator.validate_unit_coherency(
        [model.model_dump() for model in request.models],
    )


@app.post("/rules/unit-engagement")
def validate_unit_engagement(request: UnitEngagementRequest) -> dict[str, object]:
    return CombatSimulator.validate_unit_engagement(
        [model.model_dump() for model in request.models],
        [enemy_model.model_dump() for enemy_model in request.enemy_models],
    )


@app.post("/rules/regain-coherency")
def regain_unit_coherency(request: UnitCoherencyRequest) -> dict[str, object]:
    return CombatSimulator.get_regain_coherency_removals(
        [model.model_dump() for model in request.models],
    )


@app.post("/rules/weapon-selection")
def validate_weapon_selection(request: WeaponSelectionRulesRequest) -> dict[str, object]:
    unit = load_weapon_selection_unit(request)
    available_weapons = list(unit.get("weapons", {}).values())
    selected_weapons = []
    unknown_weapon_names: list[str] = []

    for weapon_name in request.weapon_names:
        resolved_weapons = resolve_requested_weapons(unit, weapon_name)
        if not resolved_weapons:
            unknown_weapon_names.append(weapon_name)
            continue
        selected_weapons.extend(resolved_weapons)

    result = CombatSimulator.validate_weapon_selection(
        available_weapons,
        selected_weapons,
        request.attack_mode,
        request.strict_single_model,
    )
    if unknown_weapon_names:
        result["valid"] = False
        result.setdefault("violations", []).append("unknown_weapon")
        result["unknown_weapon_names"] = unknown_weapon_names
    return result


@app.post("/rules/shooting-type")
def validate_shooting_type(request: ShootingTypeRequest) -> dict[str, object]:
    return CombatSimulator.validate_shooting_type(
        request.shooting_type,
        unit_on_battlefield=request.unit_on_battlefield,
        selected_to_shoot_this_phase=request.selected_to_shoot_this_phase,
        unit_engaged=request.unit_engaged,
        advanced_this_turn=request.advanced_this_turn,
        has_assault_weapons=request.has_assault_weapons,
        has_close_quarters_weapons=request.has_close_quarters_weapons,
        has_indirect_fire_weapons=request.has_indirect_fire_weapons,
        unit_is_monster_vehicle=request.unit_is_monster_vehicle,
        remained_stationary=request.remained_stationary,
        target_visible_to_friendly_unit=request.target_visible_to_friendly_unit,
    )


@app.post("/rules/charge")
def resolve_charge(request: ChargeRequest) -> dict[str, object]:
    simulator = CombatSimulator(seed=request.seed)
    return simulator.resolve_charge(
        distance_to_enemy=request.distance_to_enemy,
        charge_target_distances=request.charge_target_distances or None,
        unit_on_battlefield=request.unit_on_battlefield,
        declared_charge_this_phase=request.declared_charge_this_phase,
        unit_engaged=request.unit_engaged,
        advanced_this_turn=request.advanced_this_turn,
        fell_back_this_turn=request.fell_back_this_turn,
        target_count=request.target_count,
        attempted_charge_move=request.attempted_charge_move,
        all_models_ended_closer=request.all_models_ended_closer,
        models_within_one_if_possible=request.models_within_one_if_possible,
        models_engaged_if_possible=request.models_engaged_if_possible,
        all_charge_targets_engaged_after=request.all_charge_targets_engaged_after,
        engaged_with_non_charge_targets_after=request.engaged_with_non_charge_targets_after,
    )


@app.post("/rules/pile-in")
def validate_pile_in(request: PileInRequest) -> dict[str, object]:
    return CombatSimulator.validate_pile_in_move(
        start_distance_to_closest_target=request.start_distance_to_closest_target,
        end_distance_to_closest_target=request.end_distance_to_closest_target,
        distance_moved=request.distance_moved,
        is_fight_phase=request.is_fight_phase,
        unit_engaged=request.unit_engaged,
        made_charge_move_this_turn=request.made_charge_move_this_turn,
        selected_to_make_overwatching_fight=request.selected_to_make_overwatching_fight,
        pile_in_target_within_5=request.pile_in_target_within_5,
        model_in_base_contact=request.model_in_base_contact,
        model_moved=request.model_moved,
        model_ended_engaged_if_possible=request.model_ended_engaged_if_possible,
        unit_engaged_after=request.unit_engaged_after,
        started_engaged_enemy_still_engaged=request.started_engaged_enemy_still_engaged,
    )


@app.post("/rules/fight-type")
def validate_fight_type(request: FightTypeRequest) -> dict[str, object]:
    return CombatSimulator.validate_fight_type(
        request.fight_type,
        selected_to_fight_this_phase=request.selected_to_fight_this_phase,
        unit_engaged=request.unit_engaged,
        unit_was_engaged_at_start_of_fight_step=request.unit_was_engaged_at_start_of_fight_step,
        made_charge_move_this_turn=request.made_charge_move_this_turn,
        became_engaged_during_fight_phase=request.became_engaged_during_fight_phase,
        has_fights_first=request.has_fights_first,
        resolving_fights_first=request.resolving_fights_first,
        resolving_remaining_combats=request.resolving_remaining_combats,
    )


@app.post("/rules/consolidate")
def validate_consolidate(request: ConsolidateRequest) -> dict[str, object]:
    return CombatSimulator.validate_consolidate_move(
        consolidation_mode=request.consolidation_mode,
        distance_moved=request.distance_moved,
        is_fight_phase=request.is_fight_phase,
        eligible_to_fight_this_phase=request.eligible_to_fight_this_phase,
        unit_engaged=request.unit_engaged,
        enemy_unit_within_3=request.enemy_unit_within_3,
        objective_within_3=request.objective_within_3,
        selected_enemy_units_count=request.selected_enemy_units_count,
        selected_objective=request.selected_objective,
        model_in_base_contact=request.model_in_base_contact,
        model_moved=request.model_moved,
        moved_model_ended_closer_to_selected_enemy=request.moved_model_ended_closer_to_selected_enemy,
        moved_model_ended_engaged_if_possible=request.moved_model_ended_engaged_if_possible,
        moved_model_ended_within_objective_if_possible=request.moved_model_ended_within_objective_if_possible,
        moved_model_ended_closer_to_objective=request.moved_model_ended_closer_to_objective,
        started_engaged_enemy_still_engaged=request.started_engaged_enemy_still_engaged,
        all_selected_enemy_units_engaged_after=request.all_selected_enemy_units_engaged_after,
        engaged_enemy_units_unselected_to_fight=request.engaged_enemy_units_unselected_to_fight,
        selected_objective_in_range_after=request.selected_objective_in_range_after,
    )


@app.post("/rules/weapon-targets")
def validate_weapon_targets(request: WeaponTargetRulesRequest) -> dict[str, object]:
    try:
        return CombatSimulator.validate_weapon_targets(
            request.weapon,
            request.attack_mode,
            request.targets,
            request.target_selected,
        )
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/rules/attack-resolution")
def build_attack_resolution_plan(request: AttackResolutionPlanRequest) -> dict[str, object]:
    try:
        return CombatSimulator.build_attack_resolution_plan([
            assignment.model_dump()
            for assignment in request.weapon_targets
        ])
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/rules/visibility")
def check_visibility(request: VisibilityRequest) -> dict[str, object]:
    return CombatSimulator.line_of_sight_exists(
        request.observing_model.model_dump(),
        request.observed_model.model_dump(),
        [blocking_model.model_dump() for blocking_model in request.blocking_models],
        request.line_width,
        request.sample_count,
    )


@app.post("/rules/mortal-wounds")
def resolve_mortal_wounds(request: MortalWoundsRequest) -> dict[str, object]:
    return CombatSimulator.resolve_mortal_wounds_on_models(
        [model.model_dump() for model in request.models],
        request.mortal_wounds,
    )


@app.post("/rules/hazard-rolls")
def make_hazard_rolls(request: HazardRollRequest) -> dict[str, object]:
    simulator = CombatSimulator()
    return simulator.make_hazard_rolls(
        request.unit,
        request.roll_count,
        request.fail_threshold,
    )


@app.post("/simulate")
def simulate(request: SimulationRequest) -> dict[str, object]:
    factions = get_factions()

    try:
        attacker_unit = deepcopy(apply_unit_loadout(
            get_unit(factions, request.attacker_faction, request.attacker_unit),
            request.attacker_loadout,
            request.attacker_model_count,
            request.attacker_model_counts,
        ))
        defender_unit = deepcopy(apply_unit_loadout(
            get_unit(factions, request.defender_faction, request.defender_unit),
            request.defender_loadout,
            request.defender_model_count,
            request.defender_model_counts,
        ))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if request.options.defender_current_model_count is not None:
        current_defender_models = max(0, int(request.options.defender_current_model_count))
        defender_unit["models"] = current_defender_models
        if defender_unit.get("target_profiles"):
            remaining_models = current_defender_models
            for profile in defender_unit["target_profiles"]:
                profile_models = max(0, int(profile.get("models", 0)))
                next_models = min(profile_models, remaining_models)
                profile["models"] = next_models
                remaining_models -= next_models

    attacker_attached_character_unit = None
    if request.attacker_attached_character_name:
        try:
            attacker_attached_character_unit = deepcopy(apply_unit_loadout(
                get_unit(
                    factions,
                    request.attacker_faction,
                    request.attacker_attached_character_name,
                ),
                request.attacker_attached_character_loadout,
                request.attacker_attached_character_model_count,
                request.attacker_attached_character_model_counts,
            ))
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not unit_can_lead_target(attacker_attached_character_unit, attacker_unit["name"]):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unit '{request.attacker_attached_character_name}' cannot be attached to "
                    f"'{request.attacker_unit}'."
                ),
            )

    apply_attached_unit_keywords(attacker_unit, attacker_attached_character_unit)

    requested_weapon_names = list(request.weapon_names)
    if not requested_weapon_names and request.weapon_name:
        requested_weapon_names = [request.weapon_name]

    attack_entries = resolve_requested_attack_entries(
        attacker_unit,
        requested_weapon_names,
        attacker_attached_character_unit,
    )
    if not attack_entries:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown weapon selection for unit '{request.attacker_unit}'",
        )

    attached_character_unit = None
    if request.options.attached_character_name:
        try:
            attached_character_unit = deepcopy(apply_unit_loadout(
                get_unit(
                    factions,
                    request.defender_faction,
                    request.options.attached_character_name,
                ),
                request.attached_character_loadout,
                request.attached_character_model_count,
                request.attached_character_model_counts,
            ))
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not unit_can_lead_target(attached_character_unit, defender_unit["name"]):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unit '{request.options.attached_character_name}' cannot be attached to "
                    f"'{request.defender_unit}'."
                ),
            )

    apply_attached_unit_keywords(defender_unit, attached_character_unit)

    attacker_enhancement_bearer_unit = (
        attacker_attached_character_unit
        if attacker_attached_character_unit is not None
        else attacker_unit
    )
    apply_simulation_enhancement_modifiers(
        attacker_enhancement_bearer_unit,
        request.attacker_enhancement_name,
    )

    defender_enhancement_bearer_unit = (
        attached_character_unit
        if attached_character_unit is not None
        else defender_unit
    )
    apply_simulation_enhancement_modifiers(
        defender_enhancement_bearer_unit,
        request.defender_enhancement_name,
    )

    simulation_options = apply_battle_shock_option_restrictions(request.options.model_dump())
    simulation_options.update({
        "attacker_detachment_name": request.attacker_detachment_name,
        "attacker_enhancement_name": request.attacker_enhancement_name,
        "attacker_enhancement_bearer_name": (
            attacker_enhancement_bearer_unit["name"]
        ),
        "attacker_primary_unit_name": attacker_unit["name"],
        "attacker_has_attached_character": attacker_attached_character_unit is not None,
        "attacker_package_model_count": (
            int(attacker_unit.get("models", 0))
            + int(attacker_attached_character_unit.get("models", 0))
            if attacker_attached_character_unit is not None
            else int(attacker_unit.get("models", 0))
        ),
        "attacker_package_is_character_unit": (
            unit_has_keyword(attacker_unit, "character")
            or attacker_attached_character_unit is not None
        ),
        "defender_detachment_name": request.defender_detachment_name,
        "defender_enhancement_name": request.defender_enhancement_name,
        "defender_enhancement_bearer_name": (
            defender_enhancement_bearer_unit["name"]
        ),
        "defender_package_model_count": (
            int(defender_unit.get("models", 0))
            + int(attached_character_unit.get("models", 0))
            if attached_character_unit is not None
            else int(defender_unit.get("models", 0))
        ),
        "defender_enhancement_bearer_is_single_model_unit": (
            int(attached_character_unit.get("models", 1)) == 1
            if attached_character_unit is not None
            else int(defender_unit.get("models", 1)) == 1
        ),
        "defender_has_attached_character": attached_character_unit is not None,
    })

    simulator = CombatSimulator(seed=request.seed)
    try:
        result = simulator.simulate_attack_sequence(
            attack_entries,
            defender_unit,
            options=simulation_options,
            attached_character_unit=attached_character_unit,
        )
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "attacker": {
            "faction": request.attacker_faction,
            "unit": request.attacker_unit,
            "attached_character": request.attacker_attached_character_name,
            "weapon": request.weapon_name,
            "weapon_names": requested_weapon_names,
            "weapons": [
                {
                    "unit": entry["attacker_unit"]["name"],
                    "weapons": [weapon["name"] for weapon in entry["weapons"]],
                }
                for entry in attack_entries
            ],
        },
        "defender": {
            "faction": request.defender_faction,
            "unit": request.defender_unit,
            "attached_character": request.options.attached_character_name,
        },
        "result": result,
    }
