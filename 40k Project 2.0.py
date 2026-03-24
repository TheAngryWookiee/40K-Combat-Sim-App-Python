# Created 09-08-22
# Edited 03-24-26
# This program is the basis for a combat sim between Warhammer units.
# Unit definitions are loaded from faction JSON files and normalized into
# the combat engine's internal format at runtime.

import json
import random
import re
from pathlib import Path

REROLL_HITS_ALL = True
REROLL_HITS_ONES = False
REROLL_WOUNDS_ALL = True
REROLL_WOUNDS_ONES = False
COVER = False
DATA_DIR = Path(__file__).parent
SPACE_MARINE_PARENT_FACTION = "Adeptus Astartes"
SPACE_MARINE_HEADING = "Imperium - Space Marines"



def die_roll():
    return random.randint(1, 6)



def d3_die_roll():
    return random.randint(1, 3)



def choose_option(prompt, options):
    while True:
        choice = input(prompt).strip()
        if choice in options:
            return choice
        print("Invalid selection. Choose one of the listed options.")



def roll_value(value):
    if isinstance(value, int):
        return value

    text = str(value).strip().lower()
    if text.isdigit():
        return int(text)
    if text == "d3":
        return d3_die_roll()
    if text == "d6":
        return die_roll()
    if text == "d6+1":
        return die_roll() + 1
    if text == "d6+2":
        return die_roll() + 2
    raise ValueError(f"Unsupported roll profile: {value}")



def parse_plus_value(value):
    match = re.fullmatch(r"\s*(\d+)\+?\s*", str(value))
    if not match:
        raise ValueError(f"Unsupported plus value: {value}")
    return int(match.group(1))



def parse_roll_profile(value):
    if isinstance(value, int):
        return value

    text = str(value).strip().lower()
    if text.isdigit():
        return int(text)
    if re.fullmatch(r"d[36](?:\+\d+)?", text):
        return text
    raise ValueError(f"Unsupported roll profile: {value}")



def parse_numeric_value(value):
    return int(str(value).strip())



def parse_ap_value(value):
    return abs(parse_numeric_value(value))



def normalize_weapon_keywords(raw_keywords):
    keywords = []
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



def normalize_weapon(weapon_data):
    keywords, anti_keyword, anti_value = normalize_weapon_keywords(
        weapon_data.get("keywords", [])
    )
    return {
        "name": weapon_data["name"],
        "range": weapon_data.get("range", ""),
        "attacks": parse_roll_profile(weapon_data.get("attacks", 0)),
        "skill": parse_plus_value(weapon_data["skill"]["value"]),
        "strength": parse_numeric_value(weapon_data.get("strength", 0)),
        "ap": parse_ap_value(weapon_data.get("armor_piercing", 0)),
        "damage": parse_roll_profile(weapon_data.get("damage", 0)),
        "keywords": keywords,
        "anti_keyword": anti_keyword,
        "anti_value": anti_value,
    }



def normalize_unit(unit_data):
    weapons = {
        str(index): normalize_weapon(weapon)
        for index, weapon in enumerate(unit_data.get("weapons", []), start=1)
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
        "weapons": weapons,
        "toughness": parse_numeric_value(stats.get("toughness", 0)),
        "wounds": parse_numeric_value(stats.get("wounds", 0)),
        "armor_save": parse_plus_value(stats.get("save", "0+")),
        "invulnerable_save": parse_plus_value(invulnerable_save) if invulnerable_save else 0,
        "models": parse_numeric_value(unit_composition.get("max_models", 1)),
        "keywords": target_keywords,
    }



def load_faction_file(data_file):
    with data_file.open(encoding="ascii") as file_handle:
        data = json.load(file_handle)

    if not isinstance(data, dict) or "faction" not in data or "units" not in data:
        return None

    faction = data.get("faction", {})
    loaded_units = data.get("units", [])
    if not loaded_units:
        raise ValueError(f"{data_file.name} does not contain any units.")

    return {
        "name": faction.get("name", data_file.stem.replace("_", " ")),
        "parent_faction": faction.get("parent_faction", ""),
        "file_name": data_file.name,
        "units": {
            str(index): normalize_unit(unit)
            for index, unit in enumerate(loaded_units, start=1)
        },
    }


def load_space_marine_factions(data_dir):
    factions = []

    for data_file in sorted(data_dir.glob("*.json")):
        faction_entry = load_faction_file(data_file)
        if faction_entry is None:
            continue
        if faction_entry["parent_faction"] != SPACE_MARINE_PARENT_FACTION:
            continue
        factions.append(faction_entry)

    if not factions:
        raise ValueError("No Space Marine faction files were found.")

    return {
        str(index): faction_entry
        for index, faction_entry in enumerate(factions, start=1)
    }


def print_option_list(options, label_key):
    for option, entry in options.items():
        print(f"{option}. {entry[label_key]}")


def select_unit_from_faction(factions, side_label):
    print(f"\n{side_label} Faction: {SPACE_MARINE_HEADING}")
    print_option_list(factions, "name")
    faction_choice = choose_option(f"\nWhich faction will the {side_label.lower()} use? ", factions)
    faction = factions[faction_choice]

    print(f"\nSelect a {side_label.lower()} unit from {faction['name']}")
    print_option_list(faction["units"], "name")
    unit_choice = choose_option(f"\nWhich unit will be the {side_label.lower()}? ", faction["units"])
    unit = faction["units"][unit_choice]
    return faction, unit



def get_to_wound_threshold(strength, toughness):
    if strength >= toughness * 2:
        return 2
    if strength > toughness:
        return 3
    if strength == toughness:
        return 4
    if strength * 2 <= toughness:
        return 6
    return 5



def maybe_reroll_hit(hit_roll, skill, unit_name):
    if hit_roll >= skill:
        return hit_roll
    if REROLL_HITS_ALL:
        new_roll = die_roll()
        print(f"{unit_name} re-rolled the failed hit into a {new_roll} to hit")
        return new_roll
    if REROLL_HITS_ONES and hit_roll == 1:
        new_roll = die_roll()
        print(f"{unit_name} re-rolled the 1 into a {new_roll} to hit")
        return new_roll
    return hit_roll



def maybe_reroll_wound(wound_roll, to_wound, unit_name):
    if wound_roll >= to_wound:
        return wound_roll
    if REROLL_WOUNDS_ALL:
        new_roll = die_roll()
        print(f"{unit_name} re-rolled the failed wound into a {new_roll} to wound")
        return new_roll
    if REROLL_WOUNDS_ONES and wound_roll == 1:
        new_roll = die_roll()
        print(f"{unit_name} re-rolled the 1 into a {new_roll} to wound")
        return new_roll
    return wound_roll



def resolve_hit(unit_name, weapon, target_name):
    hit_roll = die_roll()
    print(f"{unit_name} rolls a {hit_roll} to hit")
    hit_roll = maybe_reroll_hit(hit_roll, weapon["skill"], unit_name)

    if hit_roll < weapon["skill"]:
        print(f"{unit_name} failed to hit")
        return 0, 0

    critical_hit = hit_roll == 6
    normal_hits = 1
    auto_wounds = 0

    if critical_hit and "SH1" in weapon["keywords"]:
        normal_hits += 1
        print("On a 6 the attack explodes, causing 1 extra hit")

    if critical_hit and "LH" in weapon["keywords"]:
        auto_wounds = 1
        normal_hits -= 1
        print(f"On a 6 {unit_name} automatically wounds {target_name} due to Lethal Hits")

    return normal_hits, auto_wounds



def apply_anti_rule(wound_roll, weapon, target):
    anti_keyword = weapon.get("anti_keyword")
    anti_value = weapon.get("anti_value", 0)
    if not anti_keyword or anti_keyword not in target["keywords"]:
        return wound_roll
    if wound_roll >= anti_value:
        print("The wound roll becomes a critical wound due to Anti")
        return 6
    return wound_roll



def resolve_wound(unit_name, weapon, target, to_wound):
    wound_roll = die_roll()
    print(f"{unit_name} rolls a {wound_roll} to wound")
    wound_roll = apply_anti_rule(wound_roll, weapon, target)

    if wound_roll < to_wound:
        wound_roll = maybe_reroll_wound(wound_roll, to_wound, unit_name)
        wound_roll = apply_anti_rule(wound_roll, weapon, target)

    if wound_roll < to_wound:
        print(f"{unit_name} failed to wound")
        return False, False

    devastating_wound = wound_roll == 6 and "DW" in weapon["keywords"]
    if devastating_wound:
        print(f"On a 6 {unit_name} scores a Devastating Wound")

    return True, devastating_wound



def resolve_save(target, weapon, devastating_wound):
    if devastating_wound:
        print(f"{target['name']} cannot make a save against the Devastating Wound")
        return True

    armor_required = target["armor_save"] + weapon["ap"]
    if COVER:
        armor_required = max(2, armor_required - 1)
        print("The target gets +1 to its armor save due to cover")

    available_saves = []
    if armor_required <= 6:
        available_saves.append((armor_required, "armor"))
    if target["invulnerable_save"] > 0:
        available_saves.append((target["invulnerable_save"], "invulnerable"))

    if not available_saves:
        print(f"{target['name']} does not get a save")
        return True

    required, save_type = min(available_saves, key=lambda item: item[0])
    save_roll = die_roll()
    print(f"{target['name']} attempts a {save_type} save on {required}+")

    if save_roll >= required:
        print(f"{target['name']} passes the save with a {save_roll}")
        return False

    print(f"{target['name']} fails the save with a {save_roll}")
    return True



def roll_damage(weapon):
    return roll_value(weapon["damage"])



def apply_damage(unit_name, weapon, target_state, devastating_wound):
    damage = roll_damage(weapon)
    target_state["current_wounds"] -= damage

    if devastating_wound:
        print(f"{unit_name} deals {damage} damage as a Devastating Wound")
    else:
        print(f"{unit_name} deals {damage} damage to {target_state['name']}")

    if target_state["current_wounds"] > 0:
        print(
            f"{target_state['name']} survives with {target_state['current_wounds']} wounds remaining"
        )
        return

    target_state["models"] -= 1
    if target_state["models"] <= 0:
        target_state["current_wounds"] = 0
        print(f"{target_state['name']} has been destroyed")
        return

    target_state["current_wounds"] = target_state["wounds"]
    print(f"One {target_state['name']} model is destroyed")
    print(f"There are {target_state['models']} models left in the unit")



def attack(unit_name, weapon, target_state):
    attacks_remaining = roll_value(weapon["attacks"])
    to_wound = get_to_wound_threshold(weapon["strength"], target_state["toughness"])

    print(f"\n{unit_name} attacks with {weapon['name']}")
    print(f"Attacks: {attacks_remaining}")
    print(f"Needs {weapon['skill']}+ to hit")
    print(f"Needs {to_wound}+ to wound")

    for _ in range(attacks_remaining):
        if target_state["models"] <= 0:
            break

        normal_hits, auto_wounds = resolve_hit(unit_name, weapon, target_state["name"])

        for _ in range(auto_wounds):
            if target_state["models"] <= 0:
                break
            if resolve_save(target_state, weapon, False):
                apply_damage(unit_name, weapon, target_state, False)

        for _ in range(normal_hits):
            if target_state["models"] <= 0:
                break
            wound_succeeds, devastating_wound = resolve_wound(
                unit_name,
                weapon,
                target_state,
                to_wound,
            )
            if not wound_succeeds:
                continue
            if resolve_save(target_state, weapon, devastating_wound):
                apply_damage(unit_name, weapon, target_state, devastating_wound)



def build_target_state(unit):
    return {
        "name": unit["name"],
        "toughness": unit["toughness"],
        "wounds": unit["wounds"],
        "current_wounds": unit["wounds"],
        "armor_save": unit["armor_save"],
        "invulnerable_save": unit["invulnerable_save"],
        "models": unit["models"],
        "keywords": list(unit["keywords"]),
    }



def main():
    try:
        factions = load_space_marine_factions(DATA_DIR)
    except (FileNotFoundError, json.JSONDecodeError, KeyError, ValueError) as exc:
        print(f"Failed to load unit data: {exc}")
        return

    print("\nWarhammer Combat Sim")
    _, attacking_unit = select_unit_from_faction(factions, "Attacker")
    unit_name = attacking_unit["name"]

    print(f"\nSelect a weapon profile for {unit_name}")
    for option, weapon in attacking_unit["weapons"].items():
        print(f"{option}. {weapon['name']}")

    weapon_choice = choose_option("\nHow will this unit strike? ", attacking_unit["weapons"])
    weapon = attacking_unit["weapons"][weapon_choice]

    _, defending_unit = select_unit_from_faction(factions, "Defender")
    target_state = build_target_state(defending_unit)

    attack(unit_name, weapon, target_state)

    if target_state["models"] <= 0:
        print(f"The {target_state['name']} have been destroyed")
    else:
        print(
            f"The {target_state['name']} survived with {target_state['models']} models left "
            f"and {target_state['current_wounds']} wounds on the current model"
        )


if __name__ == "__main__":
    main()
