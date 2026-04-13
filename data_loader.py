from __future__ import annotations

from copy import deepcopy
import json
import re
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent
SPACE_MARINE_PARENT_FACTION = "Adeptus Astartes"
SPACE_MARINE_HEADING = "Imperium - Space Marines"
GAME_HEADING = "Warhammer 40,000"


def parse_plus_value(value: Any) -> int:
    text = str(value).strip()
    if text.lower() == "n/a":
        return 0
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
    if re.fullmatch(r"(?:\d+)?d[36](?:\+\d+)?", text):
        return text
    raise ValueError(f"Unsupported roll profile: {value}")



def parse_numeric_value(value: Any) -> int:
    return int(str(value).strip())



def parse_ap_value(value: Any) -> int:
    return abs(parse_numeric_value(value))



def get_default_unit_model_count(unit_composition: dict[str, Any]) -> int:
    if "min_models" in unit_composition:
        return parse_numeric_value(unit_composition.get("min_models", 1))
    return parse_numeric_value(unit_composition.get("max_models", 1))



def resolve_unit_model_count(
    unit_data: dict[str, Any],
    requested_model_count: int | None = None,
) -> int:
    unit_composition = unit_data.get("unit_composition", {})
    minimum_models = get_default_unit_model_count(unit_composition)
    maximum_models = parse_numeric_value(unit_composition.get("max_models", minimum_models))

    if requested_model_count is None:
        return minimum_models

    model_count = int(requested_model_count)
    if model_count < minimum_models or model_count > maximum_models:
        raise ValueError(
            f"Requested model count {model_count} is outside the valid range {minimum_models}-{maximum_models} for unit '{unit_data['name']}'"
        )
    return model_count



def normalize_wargear_name(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value).strip().lower())


def get_display_model_name(value: Any) -> str:
    return re.sub(r"\s*-\s*Epic Hero\s*$", "", str(value).strip(), flags=re.IGNORECASE)



def resolve_model_counts_by_name(
    unit_data: dict[str, Any],
    selected_model_count: int | None = None,
    requested_model_counts: dict[str, int] | None = None,
) -> dict[str, int]:
    model_entries = unit_data.get("models_data", [])
    if not model_entries:
        return {}

    assigned_counts: dict[str, int] = {}
    minimum_counts_by_name: dict[str, int] = {}
    maximum_counts_by_name: dict[str, int] = {}
    minimum_total = 0
    maximum_total = 0

    for model in model_entries:
        model_name = str(model.get("name", "")).strip()
        count_data = model.get("count", {})
        minimum_count = parse_numeric_value(count_data.get("min", 0))
        maximum_count = parse_numeric_value(count_data.get("max", minimum_count))
        minimum_counts_by_name[model_name] = minimum_count
        maximum_counts_by_name[model_name] = maximum_count
        assigned_counts[model_name] = minimum_count
        minimum_total += minimum_count
        maximum_total += maximum_count

    if requested_model_counts:
        unknown_model_names = set(requested_model_counts) - set(assigned_counts)
        if unknown_model_names:
            unknown_model_name = sorted(unknown_model_names)[0]
            raise ValueError(
                f"Unknown model count selection '{unknown_model_name}' on unit '{unit_data['name']}'"
            )

        explicit_counts: dict[str, int] = {}
        for model_name in assigned_counts:
            requested_count = requested_model_counts.get(model_name)
            if requested_count is None:
                explicit_counts[model_name] = minimum_counts_by_name[model_name]
                continue

            model_count = int(requested_count)
            minimum_count = minimum_counts_by_name[model_name]
            maximum_count = maximum_counts_by_name[model_name]
            if model_count < minimum_count or model_count > maximum_count:
                raise ValueError(
                    f"Requested model count {model_count} for '{model_name}' is outside the valid range "
                    f"{minimum_count}-{maximum_count} on unit '{unit_data['name']}'"
                )
            explicit_counts[model_name] = model_count

        explicit_total = sum(explicit_counts.values())
        if explicit_total < minimum_total or explicit_total > maximum_total:
            raise ValueError(
                f"Requested model breakdown total {explicit_total} is outside the supported model breakdown range "
                f"{minimum_total}-{maximum_total} for unit '{unit_data['name']}'"
            )
        return explicit_counts

    if selected_model_count is None:
        selected_model_count = minimum_total

    if selected_model_count < minimum_total or selected_model_count > maximum_total:
        raise ValueError(
            f"Requested model count {selected_model_count} is outside the supported model breakdown range "
            f"{minimum_total}-{maximum_total} for unit '{unit_data['name']}'"
        )

    remaining_models = selected_model_count - minimum_total
    for model in model_entries:
        if remaining_models <= 0:
            break
        model_name = str(model.get("name", "")).strip()
        count_data = model.get("count", {})
        minimum_count = parse_numeric_value(count_data.get("min", 0))
        maximum_count = parse_numeric_value(count_data.get("max", minimum_count))
        additional_capacity = max(0, maximum_count - minimum_count)
        additional_models = min(remaining_models, additional_capacity)
        assigned_counts[model_name] += additional_models
        remaining_models -= additional_models

    return assigned_counts



def resolve_weapon_bearer_counts(
    unit_data: dict[str, Any],
    model_counts_by_name: dict[str, int],
) -> dict[str, int]:
    bearer_counts: dict[str, int] = {}

    for model in unit_data.get("models_data", []):
        model_name = str(model.get("name", "")).strip()
        model_count = model_counts_by_name.get(model_name, 0)
        if model_count <= 0:
            continue

        for wargear_item in model.get("default_wargear", []):
            normalized_name = normalize_wargear_name(wargear_item)
            if not normalized_name:
                continue
            bearer_counts[normalized_name] = bearer_counts.get(normalized_name, 0) + model_count

    return bearer_counts



def build_target_profiles(
    unit_data: dict[str, Any],
    model_counts_by_name: dict[str, int],
) -> list[dict[str, Any]]:
    target_profiles: list[dict[str, Any]] = []
    base_stats = dict(unit_data.get("stats", {}))
    unit_effects = extract_unit_effects(unit_data)
    unit_keywords = list(unit_data.get("keywords", []))

    for model in unit_data.get("models_data", []):
        model_name = str(model.get("name", "")).strip()
        model_count = int(model_counts_by_name.get(model_name, 0))
        if model_count <= 0:
            continue

        stats_override = model.get("stats_override", {})
        profile_stats = dict(base_stats)
        profile_stats.update(stats_override)
        if stats_override and "invulnerable_save" not in stats_override:
            default_wargear = {
                normalize_wargear_name(wargear_item)
                for wargear_item in model.get("default_wargear", [])
            }
            if "storm shield" not in default_wargear and "blizzard shield" not in default_wargear:
                profile_stats["invulnerable_save"] = None
        invulnerable_save = profile_stats.get("invulnerable_save", "")
        target_profiles.append({
            "name": get_display_model_name(model_name),
            "models": model_count,
            "toughness": parse_numeric_value(profile_stats.get("toughness", 0)),
            "wounds": parse_numeric_value(profile_stats.get("wounds", 0)),
            "current_wounds": parse_numeric_value(profile_stats.get("wounds", 0)),
            "armor_save": parse_plus_value(profile_stats.get("save", "0+")),
            "invulnerable_save": parse_plus_value(invulnerable_save) if invulnerable_save else 0,
            "effects": list(unit_effects),
            "feel_no_pain": get_lowest_effect_value(unit_effects, "feel_no_pain"),
            "has_cover": False,
            "keywords": list(unit_keywords),
        })

    return target_profiles



def normalize_weapon_keywords(raw_keywords: list[Any]) -> tuple[list[str], list[dict[str, Any]], str | None, int]:
    keywords: list[str] = []
    anti_rules: list[dict[str, Any]] = []
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
            anti_rules.append({
                "keyword": anti_keyword,
                "value": anti_value,
            })

    return keywords, anti_rules, anti_keyword, anti_value



def normalize_weapon(weapon_data: dict[str, Any]) -> dict[str, Any]:
    keywords, anti_rules, anti_keyword, anti_value = normalize_weapon_keywords(
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
        "anti_rules": anti_rules,
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



def get_lowest_effect_value(effects: list[dict[str, Any]], effect_type: str) -> int:
    matching_values = [
        effect.get("value", 0)
        for effect in effects
        if effect.get("type") == effect_type and effect.get("value", 0) > 0
    ]
    if not matching_values:
        return 0
    return min(matching_values)



def get_loadout_group_pool_count(
    group: dict[str, Any],
    selected_model_count: int,
    model_counts_by_name: dict[str, int],
) -> int:
    target_model_name = str(group.get("target_model", "")).strip()
    if target_model_name:
        return int(model_counts_by_name.get(target_model_name, 0))
    return selected_model_count



def get_loadout_group_max_total(
    group: dict[str, Any],
    selected_model_count: int,
    model_counts_by_name: dict[str, int],
) -> int:
    pool_count = get_loadout_group_pool_count(group, selected_model_count, model_counts_by_name)
    maximum_total = pool_count
    if group.get("max_total_count") is not None:
        maximum_total = min(maximum_total, parse_numeric_value(group.get("max_total_count", pool_count)))
    if group.get("max_total_per_models") is not None:
        divisor = parse_numeric_value(group.get("max_total_per_models", 1))
        maximum_total = min(maximum_total, pool_count // max(1, divisor))
    return maximum_total



def get_loadout_option_max_count(
    group: dict[str, Any],
    option: dict[str, Any],
    selected_model_count: int,
    model_counts_by_name: dict[str, int],
) -> int:
    maximum_count = get_loadout_group_pool_count(group, selected_model_count, model_counts_by_name)
    if option.get("max_count") is not None:
        maximum_count = min(maximum_count, parse_numeric_value(option.get("max_count", maximum_count)))
    if option.get("max_count_per_models") is not None:
        divisor = parse_numeric_value(option.get("max_count_per_models", 1))
        maximum_count = min(maximum_count, maximum_count // max(1, divisor))
    return maximum_count



def get_default_loadout_selection(
    unit_data: dict[str, Any],
    selected_model_count: int,
    model_counts_by_name: dict[str, int],
) -> dict[str, Any]:
    selections: dict[str, Any] = {}

    for group in unit_data.get("loadout_options", []):
        group_id = str(group.get("id", "")).strip()
        options = group.get("options", [])
        if not group_id or not options:
            continue

        if str(group.get("selection_type", "")).strip().lower() == "count":
            default_counts: dict[str, int] = {}
            for option in options:
                option_id = str(option.get("id", "")).strip()
                if not option_id:
                    continue
                default_count = option.get("default_count")
                if default_count is None:
                    continue
                resolved_default_count = parse_numeric_value(default_count)
                maximum_count = get_loadout_option_max_count(
                    group,
                    option,
                    selected_model_count,
                    model_counts_by_name,
                )
                if resolved_default_count > 0 and resolved_default_count <= maximum_count:
                    default_counts[option_id] = resolved_default_count
            selections[group_id] = default_counts
            continue

        default_option_id = str(
            group.get("default_option_id", options[0].get("id", ""))
        ).strip()
        if default_option_id:
            selections[group_id] = default_option_id

    return selections



def resolve_loadout_selection(
    unit_data: dict[str, Any],
    requested_selection: dict[str, Any] | None = None,
    selected_model_count: int | None = None,
    model_counts_by_name: dict[str, int] | None = None,
) -> dict[str, Any]:
    requested_selection = requested_selection or {}
    selected_model_count = selected_model_count or get_default_unit_model_count(
        unit_data.get("unit_composition", {})
    )
    model_counts_by_name = model_counts_by_name or resolve_model_counts_by_name(
        unit_data,
        selected_model_count,
    )
    resolved_selection = get_default_loadout_selection(
        unit_data,
        selected_model_count,
        model_counts_by_name,
    )
    valid_group_ids: set[str] = set()

    for group in unit_data.get("loadout_options", []):
        group_id = str(group.get("id", "")).strip()
        options = group.get("options", [])
        if not group_id or not options:
            continue

        valid_group_ids.add(group_id)
        valid_option_ids = {
            str(option.get("id", "")).strip(): option
            for option in options
            if str(option.get("id", "")).strip()
        }

        selection_type = str(group.get("selection_type", "")).strip().lower()
        if selection_type == "count":
            requested_counts = requested_selection.get(group_id, resolved_selection.get(group_id, {}))
            if requested_counts is None:
                requested_counts = {}
            if not isinstance(requested_counts, dict):
                raise ValueError(
                    f"Loadout group '{group_id}' on unit '{unit_data['name']}' expects an object of option counts."
                )

            unknown_option_ids = set(requested_counts) - set(valid_option_ids)
            if unknown_option_ids:
                unknown_option_id = sorted(unknown_option_ids)[0]
                raise ValueError(
                    f"Unknown loadout option '{unknown_option_id}' for group '{group_id}' on unit '{unit_data['name']}'"
                )

            resolved_counts: dict[str, int] = {}
            total_selected = 0
            for option_id, option in valid_option_ids.items():
                requested_count = requested_counts.get(option_id, resolved_selection.get(group_id, {}).get(option_id, 0))
                resolved_count = parse_numeric_value(requested_count) if requested_count not in (None, "") else 0
                if resolved_count < 0:
                    raise ValueError(
                        f"Loadout option '{option_id}' for group '{group_id}' on unit '{unit_data['name']}' cannot be negative."
                    )
                maximum_count = get_loadout_option_max_count(
                    group,
                    option,
                    selected_model_count,
                    model_counts_by_name,
                )
                if resolved_count > maximum_count:
                    raise ValueError(
                        f"Loadout option '{option_id}' for group '{group_id}' on unit '{unit_data['name']}' exceeds its maximum count of {maximum_count}."
                    )
                if resolved_count > 0:
                    resolved_counts[option_id] = resolved_count
                    total_selected += resolved_count

            maximum_total = get_loadout_group_max_total(
                group,
                selected_model_count,
                model_counts_by_name,
            )
            if total_selected > maximum_total:
                raise ValueError(
                    f"Loadout group '{group_id}' on unit '{unit_data['name']}' exceeds its maximum total selection count of {maximum_total}."
                )
            resolved_selection[group_id] = resolved_counts
            continue

        if group_id not in requested_selection:
            continue

        requested_option_id = str(requested_selection[group_id]).strip()
        if requested_option_id not in valid_option_ids:
            raise ValueError(
                f"Unknown loadout option '{requested_option_id}' for group '{group_id}' on unit '{unit_data['name']}'"
            )
        resolved_selection[group_id] = requested_option_id

    unknown_group_ids = set(requested_selection) - valid_group_ids
    if unknown_group_ids:
        unknown_group = sorted(unknown_group_ids)[0]
        raise ValueError(f"Unknown loadout group '{unknown_group}' on unit '{unit_data['name']}'")

    return resolved_selection



def apply_unit_loadout(
    unit_data: dict[str, Any],
    requested_selection: dict[str, str] | None = None,
    requested_model_count: int | None = None,
    requested_model_counts: dict[str, int] | None = None,
) -> dict[str, Any]:
    resolved_unit = deepcopy(unit_data)
    loadout_groups = resolved_unit.get("loadout_options", [])
    if requested_model_counts:
        model_counts_by_name = resolve_model_counts_by_name(
            resolved_unit,
            requested_model_counts=requested_model_counts,
        )
        selected_model_count = sum(model_counts_by_name.values())
    else:
        selected_model_count = resolve_unit_model_count(
            resolved_unit,
            requested_model_count,
        )
        model_counts_by_name = resolve_model_counts_by_name(
            resolved_unit,
            selected_model_count,
        )
    selected_loadout = resolve_loadout_selection(
        resolved_unit,
        requested_selection,
        selected_model_count,
        model_counts_by_name,
    )
    resolved_unit["selected_loadout"] = selected_loadout
    resolved_unit["selected_model_count"] = selected_model_count

    conditional_weapon_names: set[str] = set()
    conditional_wargear_ability_names: set[str] = set()
    selected_weapon_names: set[str] = set()
    selected_wargear_ability_names: set[str] = set()

    for group in loadout_groups:
        for option in group.get("options", []):
            conditional_weapon_names.update(
                str(weapon_name)
                for weapon_name in option.get("enabled_weapons", [])
            )
            conditional_wargear_ability_names.update(
                str(ability_name)
                for ability_name in option.get("enabled_wargear_abilities", [])
            )

    models_by_name = {
        str(model.get("name", "")).strip(): model
        for model in resolved_unit.get("models_data", [])
        if str(model.get("name", "")).strip()
    }

    for group in loadout_groups:
        group_id = str(group.get("id", "")).strip()
        selection_type = str(group.get("selection_type", "")).strip().lower()
        if selection_type == "count":
            selected_option_counts = selected_loadout.get(group_id, {})
            if not isinstance(selected_option_counts, dict):
                continue
            for option in group.get("options", []):
                option_id = str(option.get("id", "")).strip()
                selected_count = int(selected_option_counts.get(option_id, 0))
                if selected_count <= 0:
                    continue
                selected_weapon_names.update(
                    str(weapon_name)
                    for weapon_name in option.get("enabled_weapons", [])
                )
                selected_wargear_ability_names.update(
                    str(ability_name)
                    for ability_name in option.get("enabled_wargear_abilities", [])
                )
            continue

        selected_option_id = selected_loadout.get(group_id, "")
        selected_option = next(
            (
                option
                for option in group.get("options", [])
                if str(option.get("id", "")).strip() == selected_option_id
            ),
            None,
        )
        if selected_option is None:
            continue

        selected_weapon_names.update(
            str(weapon_name)
            for weapon_name in selected_option.get("enabled_weapons", [])
        )
        selected_wargear_ability_names.update(
            str(ability_name)
            for ability_name in selected_option.get("enabled_wargear_abilities", [])
        )

        for stat_name, stat_value in selected_option.get("stat_overrides", {}).items():
            resolved_unit["stats"][stat_name] = stat_value

        target_model_name = str(group.get("target_model", "")).strip()
        if target_model_name:
            model = models_by_name.get(target_model_name)
            if model is not None:
                default_wargear = list(model.get("default_wargear", []))
                remove_wargear = {
                    str(item)
                    for item in selected_option.get("remove_wargear", [])
                }
                add_wargear = [
                    str(item)
                    for item in selected_option.get("add_wargear", [])
                ]
                if remove_wargear:
                    default_wargear = [
                        wargear_item
                        for wargear_item in default_wargear
                        if wargear_item not in remove_wargear
                    ]
                for wargear_item in add_wargear:
                    if wargear_item not in default_wargear:
                        default_wargear.append(wargear_item)
                model["default_wargear"] = default_wargear

    resolved_unit["model_counts_by_name"] = model_counts_by_name
    weapon_bearer_counts = resolve_weapon_bearer_counts(
        resolved_unit,
        model_counts_by_name,
    )
    for group in loadout_groups:
        if str(group.get("selection_type", "")).strip().lower() != "count":
            continue
        selected_option_counts = selected_loadout.get(str(group.get("id", "")).strip(), {})
        if not isinstance(selected_option_counts, dict):
            continue
        for option in group.get("options", []):
            option_id = str(option.get("id", "")).strip()
            selected_count = int(selected_option_counts.get(option_id, 0))
            if selected_count <= 0:
                continue
            for weapon_name, change in option.get("weapon_bearer_changes", {}).items():
                normalized_weapon_name = normalize_wargear_name(weapon_name)
                current_count = weapon_bearer_counts.get(normalized_weapon_name, 0)
                weapon_bearer_counts[normalized_weapon_name] = max(
                    0,
                    current_count + (int(change) * selected_count),
                )
    resolved_unit["weapon_bearer_counts"] = weapon_bearer_counts
    resolved_unit["target_profiles"] = build_target_profiles(
        resolved_unit,
        model_counts_by_name,
    )

    resolved_unit["weapons"] = {
        weapon_name: weapon
        for weapon_name, weapon in resolved_unit.get("weapons", {}).items()
        if (
            (weapon_name not in conditional_weapon_names or weapon_name in selected_weapon_names)
            and max(
                weapon_bearer_counts.get(normalize_wargear_name(weapon_name), 0),
                weapon_bearer_counts.get(normalize_wargear_name(weapon_name).split(" - ", 1)[0], 0),
            ) > 0
            or (
                weapon_name not in conditional_weapon_names
                and normalize_wargear_name(weapon_name) not in weapon_bearer_counts
                and normalize_wargear_name(weapon_name).split(" - ", 1)[0] not in weapon_bearer_counts
            )
        )
    }
    resolved_unit["wargear_abilities"] = [
        ability
        for ability in resolved_unit.get("wargear_abilities", [])
        if ability.get("name") not in conditional_wargear_ability_names
        or ability.get("name") in selected_wargear_ability_names
    ]

    stats = resolved_unit.get("stats", {})
    invulnerable_save = stats.get("invulnerable_save", "")
    resolved_unit["effects"] = extract_unit_effects(resolved_unit)
    resolved_unit["toughness"] = parse_numeric_value(stats.get("toughness", 0))
    resolved_unit["wounds"] = parse_numeric_value(stats.get("wounds", 0))
    resolved_unit["armor_save"] = parse_plus_value(stats.get("save", "0+"))
    resolved_unit["invulnerable_save"] = (
        parse_plus_value(invulnerable_save) if invulnerable_save else 0
    )
    resolved_unit["models"] = selected_model_count

    return resolved_unit



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
        "loadout_options": unit_data.get("loadout_options", []),
        "stats": stats,
        "weapons": weapons,
        "effects": extract_unit_effects(unit_data),
        "toughness": parse_numeric_value(stats.get("toughness", 0)),
        "wounds": parse_numeric_value(stats.get("wounds", 0)),
        "armor_save": parse_plus_value(stats.get("save", "0+")),
        "invulnerable_save": parse_plus_value(invulnerable_save) if invulnerable_save else 0,
        "models": get_default_unit_model_count(unit_composition),
    }



def load_faction_file(data_file: Path) -> dict[str, Any] | None:
    with data_file.open(encoding="utf-8") as file_handle:
        data = json.load(file_handle)

    if not isinstance(data, dict) or "faction" not in data or "units" not in data:
        return None

    faction = data.get("faction", {})
    faction_name = faction.get("name", data_file.stem.replace("_", " "))
    loaded_units = data.get("units", [])

    units = {
        unit["name"]: normalize_unit(unit, faction_name)
        for unit in loaded_units
    }

    return {
        "name": faction_name,
        "parent_faction": faction.get("parent_faction", ""),
        "file_name": data_file.name,
        "army_rules": faction.get("army_rules", []),
        "chapter_rules": faction.get("chapter_rules", []),
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
            "name": resolved_unit["name"],
            "faction_name": resolved_unit["faction_name"],
            "keywords": resolved_unit["display_keywords"],
            "faction_keywords": resolved_unit["faction_keywords"],
            "leader": resolved_unit["leader"],
            "stats": resolved_unit["stats"],
            "weapons": [weapon["name"] for weapon in resolved_unit["weapons"].values()],
        }
        for resolved_unit in (
            apply_unit_loadout(unit)
            for unit in sorted(faction["units"].values(), key=lambda item: item["name"])
        )
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
        "loadout_options": unit.get("loadout_options", []),
        "selected_loadout": unit.get("selected_loadout", {}),
        "model_count": unit.get("models", 1),
        "model_counts_by_name": unit.get("model_counts_by_name", {}),
        "target_profiles": unit.get("target_profiles", []),
        "stats": unit["stats"],
        "weapons": list(unit["weapons"].values()),
        "effects": unit["effects"],
    }
