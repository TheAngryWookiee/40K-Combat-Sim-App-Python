from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from combat_engine import CombatSimulationError, CombatSimulator
from data_loader import (
    DATA_DIR,
    SPACE_MARINE_HEADING,
    get_faction,
    get_unit,
    list_faction_summaries,
    list_unit_summaries,
    load_space_marine_factions,
    serialize_unit,
)


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
    attacker_unforgiven_fury_active: bool = False
    attacker_unforgiven_fury_army_battleshocked: bool = False
    attacker_stubborn_tenacity_active: bool = False
    attacker_weapons_of_the_first_legion_active: bool = False
    attacker_pennant_of_remembrance_active: bool = False
    attacker_below_starting_strength: bool = False
    attacker_battleshocked: bool = False
    defender_armour_of_contempt_active: bool = False
    defender_unbreakable_lines_active: bool = False
    defender_pennant_of_remembrance_active: bool = False
    defender_battleshocked: bool = False


class SimulationRequest(BaseModel):
    attacker_faction: str
    attacker_unit: str
    weapon_name: str
    defender_faction: str
    defender_unit: str
    options: SimulationOptions = Field(default_factory=SimulationOptions)
    seed: int | None = None


@lru_cache(maxsize=1)
def get_factions() -> dict[str, dict]:
    return load_space_marine_factions(DATA_DIR)


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
        "group": SPACE_MARINE_HEADING,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/factions")
def list_factions() -> dict[str, object]:
    factions = get_factions()
    return {
        "group": SPACE_MARINE_HEADING,
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
def get_unit_details(faction_name: str, unit_name: str) -> dict[str, object]:
    factions = get_factions()
    try:
        unit = get_unit(factions, faction_name, unit_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return serialize_unit(unit)


@app.post("/simulate")
def simulate(request: SimulationRequest) -> dict[str, object]:
    factions = get_factions()

    try:
        attacker_unit = get_unit(factions, request.attacker_faction, request.attacker_unit)
        defender_unit = get_unit(factions, request.defender_faction, request.defender_unit)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    weapon = attacker_unit["weapons"].get(request.weapon_name)
    if weapon is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown weapon '{request.weapon_name}' for unit '{request.attacker_unit}'",
        )

    attached_character_unit = None
    if request.options.attached_character_name:
        try:
            attached_character_unit = get_unit(
                factions,
                request.defender_faction,
                request.options.attached_character_name,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    simulator = CombatSimulator(seed=request.seed)
    try:
        result = simulator.simulate(
            attacker_unit,
            weapon,
            defender_unit,
            options=request.options.model_dump(),
            attached_character_unit=attached_character_unit,
        )
    except CombatSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "attacker": {
            "faction": request.attacker_faction,
            "unit": request.attacker_unit,
            "weapon": request.weapon_name,
        },
        "defender": {
            "faction": request.defender_faction,
            "unit": request.defender_unit,
            "attached_character": request.options.attached_character_name,
        },
        "result": result,
    }
