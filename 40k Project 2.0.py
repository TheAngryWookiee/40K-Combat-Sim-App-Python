from __future__ import annotations

from combat_engine import CombatSimulationError, CombatSimulator
from data_loader import (
    SPACE_MARINE_HEADING,
    load_space_marine_factions,
)


# Created 09-08-22
# Refactored 03-25-26
# This CLI is now a thin wrapper over the shared combat engine.


def choose_option(prompt: str, options: dict[str, object]) -> str:
    while True:
        choice = input(prompt).strip()
        if choice in options:
            return choice
        print("Invalid selection. Choose one of the listed options.")



def choose_yes_no(prompt: str) -> bool:
    while True:
        choice = input(prompt).strip().lower()
        if choice in {"y", "yes", "1", "true"}:
            return True
        if choice in {"n", "no", "0", "false", ""}:
            return False
        print("Enter yes or no.")



def choose_non_negative_int(prompt: str) -> int:
    while True:
        choice = input(prompt).strip()
        if choice.isdigit():
            return int(choice)
        print("Enter a whole number greater than or equal to 0.")



def print_option_list(options: dict[str, dict], label_key: str) -> None:
    for option, entry in options.items():
        print(f"{option}. {entry[label_key]}")



def build_numbered_options(items: list[dict], label_key: str) -> dict[str, dict]:
    return {str(index): item for index, item in enumerate(items, start=1)}



def select_faction(factions: dict[str, dict], side_label: str) -> dict:
    numbered_factions = build_numbered_options(
        sorted(factions.values(), key=lambda item: item["name"]),
        "name",
    )
    print(f"\n{side_label} Faction: {SPACE_MARINE_HEADING}")
    print_option_list(numbered_factions, "name")
    faction_choice = choose_option(f"\nWhich faction will the {side_label.lower()} use? ", numbered_factions)
    return numbered_factions[faction_choice]



def select_unit(faction: dict, side_label: str) -> dict:
    numbered_units = build_numbered_options(
        sorted(faction["units"].values(), key=lambda item: item["name"]),
        "name",
    )
    print(f"\nSelect a {side_label.lower()} unit from {faction['name']}")
    print_option_list(numbered_units, "name")
    unit_choice = choose_option(f"\nWhich unit will be the {side_label.lower()}? ", numbered_units)
    return numbered_units[unit_choice]



def select_weapon(simulator: CombatSimulator, unit: dict) -> dict:
    selectable_weapons = build_numbered_options(simulator.get_selectable_weapons(unit), "name")
    print(f"\nSelect a weapon profile for {unit['name']}")
    print_option_list(selectable_weapons, "name")
    weapon_choice = choose_option("\nHow will this unit strike? ", selectable_weapons)
    return selectable_weapons[weapon_choice]



def main() -> None:
    try:
        factions = load_space_marine_factions()
    except (FileNotFoundError, KeyError, ValueError) as exc:
        print(f"Failed to load unit data: {exc}")
        return

    simulator = CombatSimulator()

    print("\nWarhammer Combat Sim")
    attacking_faction = select_faction(factions, "Attacker")
    attacking_unit = select_unit(attacking_faction, "Attacker")
    weapon = select_weapon(simulator, attacking_unit)

    defending_faction = select_faction(factions, "Defender")
    defending_unit = select_unit(defending_faction, "Defender")

    options: dict[str, object] = {
        "target_has_cover": choose_yes_no(f"\nDoes {defending_unit['name']} have cover? "),
        "attacker_in_engagement_range": False,
        "target_in_engagement_range_of_allies": False,
        "distance_to_target": None,
        "charged_this_turn": False,
        "remained_stationary": False,
        "indirect_target_visible": True,
        "attached_character_name": None,
        "hazardous_overwatch_charge_phase": False,
        "hazardous_bearer_current_wounds": None,
    }

    attached_character_unit = None
    if simulator.attack_sequence_has_keyword(attacking_unit, weapon, "Precision"):
        if choose_yes_no(f"\nIs {defending_unit['name']} an Attached Unit with an attached Character? "):
            attached_character_unit = select_unit(defending_faction, "Attached Character")
            options["attached_character_name"] = attached_character_unit["name"]

    if simulator.attack_sequence_has_keyword(attacking_unit, weapon, "Hazardous"):
        if choose_yes_no(
            f"\nHas the selected Hazardous bearer in {attacking_unit['name']} already lost wounds? "
        ):
            options["hazardous_bearer_current_wounds"] = choose_non_negative_int(
                f"\nHow many wounds does the selected Hazardous bearer in {attacking_unit['name']} currently have left? "
            )

    if weapon["range"].lower() != "melee":
        if simulator.attack_sequence_has_keyword(attacking_unit, weapon, "Hazardous"):
            options["hazardous_overwatch_charge_phase"] = choose_yes_no(
                f"\nWas {attacking_unit['name']} using Fire Overwatch in the opponent's Charge phase? "
            )
        if "Heavy" in weapon["keywords"]:
            options["remained_stationary"] = choose_yes_no(
                f"\nDid {attacking_unit['name']} remain Stationary this turn? "
            )
        options["attacker_in_engagement_range"] = choose_yes_no(
            f"\nIs {attacking_unit['name']} within Engagement Range of {defending_unit['name']}? "
        )
        if "Blast" in weapon["keywords"]:
            options["target_in_engagement_range_of_allies"] = choose_yes_no(
                f"\nIs {defending_unit['name']} within Engagement Range of allied units? "
            )
        if "Indirect Fire" in weapon["keywords"]:
            options["indirect_target_visible"] = choose_yes_no(
                f"\nAre any models in {defending_unit['name']} visible to {attacking_unit['name']}? "
            )
        options["distance_to_target"] = choose_non_negative_int(
            f"\nHow many inches away is {defending_unit['name']} from {attacking_unit['name']}? "
        )
    elif simulator.attack_sequence_has_keyword(attacking_unit, weapon, "Lance"):
        options["charged_this_turn"] = choose_yes_no(
            f"\nDid {attacking_unit['name']} make a charge move this turn? "
        )

    try:
        result = simulator.simulate(
            attacking_unit,
            weapon,
            defending_unit,
            options=options,
            attached_character_unit=attached_character_unit,
        )
    except CombatSimulationError as exc:
        print(exc)
        return

    print()
    for line in result["log"]:
        print(line)

    print()
    print(result["target"])
    if result["attached_character"] is not None:
        print(result["attached_character"])
    if result["hazardous_bearer"] is not None:
        print(result["hazardous_bearer"])


if __name__ == "__main__":
    main()
