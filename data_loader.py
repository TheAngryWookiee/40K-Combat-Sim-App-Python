from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent
SPACE_MARINE_PARENT_FACTION = "Adeptus Astartes"
SPACE_MARINE_HEADING = "Imperium - Space Marines"


def parse_plus_value(value: Any) -> int:
    match = re.fullmatch(r"\s*(\d+)\+?\s*", str(value))
    if not match:
        raise ValueError(f"Unsupported plus value: {value}")
    return int(match.group(1))



def parse_roll_profile(value: Any) -> int | str:
    if isinstance(value, int):
        return value

    text = str(value).strip().lower()
    if text.isdigit():
        return int(text)
    if re.fullmatch(r"d[36](?:\+\d+)?", text):
        return text
    raise ValueError(f"Unsupported roll profile: {value}")



def parse_numeric_value(value: Any) -> int:
    return int(str(value).strip())



def parse_ap_value(value: Any) -> int:
    return abs(parse_numeric_value(value))



def normalize_weapon_keywords(raw_keywords: list[Any]) -> tuple[list[str], str | None, int]:
    keywords: list[str] = []
    anti_keyword = None
    anti_value = 0

    for raw_keyword in raw_keywords:
        keyword = str(raw_keyword).strip()
        lowered = keyword.lower()

        if lowered == "lethal hits":
            keywords.append("LH")
        elif lowered == "sustained hits 1":
            keywords.append("SH1")
        elif lowered == "devastating wounds":
            keywords.append("DW")
        else:
            keywords.append(keyword)

        anti_match = re.fullmatch(r"anti[- ](.+?)\s+(\d+)\+", keyword, re.IGNORECASE)
        if anti_match:
            anti_keyword = anti_match.group(1).strip().lower()
            anti_value = int(anti_match.group(2))

    return keywords, anti_keyword, anti_value



def normalize_weapon(weapon_data: dict[str, Any]) -> dict[str, Any]:
    keywords, anti_keyword, anti_value = normalize_weapon_keywords(
        weapon_data.get("keywords", [])
    )
    return {
        "name": weapon_data["name"],
        "range": weapon_data.get("range", ""),
        "attacks": parse_roll_profile(weapon_data.get("attacks", 0)),
        "skill_type": weapon_data.get("skill", {}).get("type", ""),
        "skill": parse_plus_value(weapon_data["skill"]["value"]),
        "skill_display": weapon_data["skill"]["value"],
        "strength": parse_numeric_value(weapon_data.get("strength", 0)),
        "ap": parse_ap_value(weapon_data.get("armor_piercing", 0)),
        "ap_display": str(weapon_data.get("armor_piercing", 0)),
        "damage": parse_roll_profile(weapon_data.get("damage", 0)),
        "damage_display": str(weapon_data.get("damage", 0)),
        "keywords": keywords,
        "raw_keywords": [str(keyword) for keyword in weapon_data.get("keywords", [])],
        "anti_keyword": anti_keyword,
        "anti_value": anti_value,
    }



def extract_unit_effects(unit_data: dict[str, Any]) -> list[dict[str, Any]]:
    effects: list[dict[str, Any]] = []
    for ability in unit_data.get("abilities", []):
        effects.extend(ability.get("effects", []))
    for ability in unit_data.get("wargear_abilities", []):
        effects.extend(ability.get("effects", []))
    return effects



def normalize_unit(unit_data: dict[str, Any], faction_name: str) -> dict[str, Any]:
    weapons = {
        weapon["name"]: normalize_weapon(weapon)
        for weapon in unit_data.get("weapons", [])
    }
    stats = unit_data.get("stats", {})
    unit_composition = unit_data.get("unit_composition", {})
    invulnerable_save = stats.get("invulnerable_save", "")
    target_keywords = [
        keyword.lower()
        for keyword in (
            unit_data.get("keywords", []) + unit_data.get("faction_keywords", [])
        )
    ]
    return {
        "name": unit_data["name"],
        "faction_name": faction_name,
        "unit_composition": unit_composition,
        "models_data": unit_data.get("models", []),
        "faction_keywords": unit_data.get("faction_keywords", []),
        "keywords": target_keywords,
        "display_keywords": unit_data.get("keywords", []),
        "abilities": unit_data.get("abilities", []),
        "selectable_abilities": unit_data.get("selectable_abilities", []),
        "wargear_abilities": unit_data.get("wargear_abilities", []),
        "leader": unit_data.get("leader", {}),
        "wargear_options": unit_data.get("wargear_options", []),
        "stats": stats,
        "weapons": weapons,
        "effects": extract_unit_effects(unit_data),
        "toughness": parse_numeric_value(stats.get("toughness", 0)),
        "wounds": parse_numeric_value(stats.get("wounds", 0)),
        "armor_save": parse_plus_value(stats.get("save", "0+")),
        "invulnerable_save": parse_plus_value(invulnerable_save) if invulnerable_save else 0,
        "models": parse_numeric_value(unit_composition.get("max_models", 1)),
    }



def load_faction_file(data_file: Path) -> dict[str, Any] | None:
    with data_file.open(encoding="utf-8") as file_handle:
        data = json.load(file_handle)

    if not isinstance(data, dict) or "faction" not in data or "units" not in data:
        return None

    faction = data.get("faction", {})
    faction_name = faction.get("name", data_file.stem.replace("_", " "))
    loaded_units = data.get("units", [])
    if not loaded_units:
        raise ValueError(f"{data_file.name} does not contain any units.")

    units = {
        unit["name"]: normalize_unit(unit, faction_name)
        for unit in loaded_units
    }

    return {
        "name": faction_name,
        "parent_faction": faction.get("parent_faction", ""),
        "file_name": data_file.name,
        "detachments": faction.get("detachments", []),
        "inherits": faction.get("inherits", {}),
        "derived_keywords": faction.get("derived_keywords", []),
        "units": units,
    }



def load_factions(data_dir: Path = DATA_DIR, parent_faction: str | None = None) -> dict[str, dict[str, Any]]:
    factions: dict[str, dict[str, Any]] = {}

    for data_file in sorted(data_dir.glob("*.json")):
        faction_entry = load_faction_file(data_file)
        if faction_entry is None:
            continue
        if parent_faction and faction_entry["parent_faction"] != parent_faction:
            continue
        factions[faction_entry["name"]] = faction_entry

    if not factions:
        if parent_faction:
            raise ValueError(f"No faction files were found for parent faction: {parent_faction}")
        raise ValueError("No faction files were found.")

    return factions



def load_space_marine_factions(data_dir: Path = DATA_DIR) -> dict[str, dict[str, Any]]:
    return load_factions(data_dir, parent_faction=SPACE_MARINE_PARENT_FACTION)



def get_faction(factions: dict[str, dict[str, Any]], faction_name: str) -> dict[str, Any]:
    try:
        return factions[faction_name]
    except KeyError as exc:
        raise KeyError(f"Unknown faction: {faction_name}") from exc



def get_unit(factions: dict[str, dict[str, Any]], faction_name: str, unit_name: str) -> dict[str, Any]:
    faction = get_faction(factions, faction_name)
    try:
        return faction["units"][unit_name]
    except KeyError as exc:
        raise KeyError(f"Unknown unit '{unit_name}' in faction '{faction_name}'") from exc



def list_faction_summaries(factions: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "name": faction["name"],
            "parent_faction": faction["parent_faction"],
            "unit_count": len(faction["units"]),
            "file_name": faction["file_name"],
        }
        for faction in sorted(factions.values(), key=lambda item: item["name"])
    ]



def list_unit_summaries(faction: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "name": unit["name"],
            "faction_name": unit["faction_name"],
            "keywords": unit["display_keywords"],
            "faction_keywords": unit["faction_keywords"],
            "stats": unit["stats"],
            "weapons": [weapon["name"] for weapon in unit["weapons"].values()],
        }
        for unit in sorted(faction["units"].values(), key=lambda item: item["name"])
    ]



def serialize_unit(unit: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": unit["name"],
        "faction_name": unit["faction_name"],
        "unit_composition": unit["unit_composition"],
        "models": unit["models_data"],
        "faction_keywords": unit["faction_keywords"],
        "keywords": unit["display_keywords"],
        "abilities": unit["abilities"],
        "selectable_abilities": unit["selectable_abilities"],
        "wargear_abilities": unit["wargear_abilities"],
        "leader": unit["leader"],
        "wargear_options": unit["wargear_options"],
        "stats": unit["stats"],
        "weapons": list(unit["weapons"].values()),
        "effects": unit["effects"],
    }
