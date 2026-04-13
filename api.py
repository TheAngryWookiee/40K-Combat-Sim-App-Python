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
    in_half_range: bool = False
    oath_of_moment_active: bool = False
    charged_this_turn: bool = False
    remained_stationary: bool = False
    indirect_target_visible: bool = True
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

    simulation_options = request.options.model_dump()
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
