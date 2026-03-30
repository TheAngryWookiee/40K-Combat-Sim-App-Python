from __future__ import annotations

import random
import re
from typing import Any


class CombatSimulationError(ValueError):
    pass


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
        if text == "d3":
            return self.d3_die_roll()
        if text == "d6":
            return self.die_roll()
        if text == "d6+1":
            return self.die_roll() + 1
        if text == "d6+2":
            return self.die_roll() + 2
        raise CombatSimulationError(f"Unsupported roll profile: {value}")

    @staticmethod
    def combine_feel_no_pain_values(current_value: int, new_value: int) -> int:
        if current_value <= 0:
            return new_value
        if new_value <= 0:
            return current_value
        return min(current_value, new_value)

    def weapon_has_keyword(
        self,
        weapon: dict[str, Any],
        keyword: str,
        attack_context: dict[str, Any] | None = None,
    ) -> bool:
        if keyword in weapon["keywords"]:
            return True
        if attack_context is None:
            return False
        return keyword in attack_context.get("temporary_weapon_keywords", set())

    def get_keyword_value(self, weapon: dict[str, Any], keyword_prefix: str) -> int:
        for keyword in weapon["keywords"]:
            match = re.fullmatch(rf"{re.escape(keyword_prefix)}\s+(\d+)", str(keyword), re.IGNORECASE)
            if match:
                return int(match.group(1))
        return 0

    def get_sustained_hits_bonus(self, weapon: dict[str, Any]) -> int:
        if "SH1" in weapon["keywords"]:
            return 1
        return self.get_keyword_value(weapon, "Sustained Hits")

    def get_used_hazardous_weapons(
        self,
        attacker_unit: dict[str, Any],
        selected_weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        used_weapons: list[dict[str, Any]] = []
        if self.weapon_has_keyword(selected_weapon, "Hazardous", attack_context):
            used_weapons.append(selected_weapon)

        if selected_weapon["range"].lower() != "melee":
            return used_weapons

        for weapon in self.get_extra_attack_weapons(attacker_unit):
            if self.weapon_has_keyword(weapon, "Hazardous", attack_context):
                used_weapons.append(weapon)

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
        return target_state["models"] // 5

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

        if self.is_pistol_weapon(weapon, attack_context):
            return

        if self.is_monster_or_vehicle(attacker_unit):
            return

        raise CombatSimulationError(
            f"{attacker_unit['name']} cannot fire {weapon['name']} while in Engagement Range because it is not a Pistol."
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

    @staticmethod
    def maybe_reroll_wound(wound_roll: int, to_wound: int, unit_name: str) -> int:
        return wound_roll

    def apply_wound_reroll(
        self,
        wound_roll: int,
        to_wound: int,
        unit_name: str,
        weapon: dict[str, Any],
    ) -> int:
        rerolled_wound = self.maybe_reroll_wound(wound_roll, to_wound, unit_name)
        if rerolled_wound != wound_roll:
            return rerolled_wound

        if wound_roll < to_wound and self.weapon_has_keyword(weapon, "Twin-Linked"):
            new_roll = self.die_roll()
            self.log(
                f"{unit_name} re-rolled the failed wound with Twin-Linked into a {new_roll} to wound"
            )
            return new_roll

        return wound_roll

    def resolve_hit(
        self,
        unit_name: str,
        weapon: dict[str, Any],
        target_name: str,
        attack_context: dict[str, Any],
    ) -> tuple[int, int]:
        if self.weapon_has_keyword(weapon, "Torrent", attack_context):
            self.log(f"{weapon['name']} automatically hits {target_name} because it has Torrent")
            return 1, 0

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
            self.log(f"{unit_name} fails to hit because Indirect Fire with no visibility fails on 1-3")
            return 0, 0

        if modified_hit_roll < weapon["skill"] and attack_context.get("oath_of_moment_active", False):
            reroll_hit = self.die_roll()
            self.log(f"{unit_name} re-rolls the failed hit with Oath of Moment into a {reroll_hit}")
            hit_roll = reroll_hit
            modified_hit_roll = hit_roll + hit_modifier
            if (
                attack_context.get("indirect_no_visibility", False)
                and self.weapon_has_keyword(weapon, "Indirect Fire", attack_context)
                and hit_roll <= 3
            ):
                self.log(f"{unit_name} fails to hit because Indirect Fire with no visibility fails on 1-3")
                return 0, 0

        if modified_hit_roll < weapon["skill"]:
            self.log(f"{unit_name} failed to hit")
            return 0, 0

        critical_hit = hit_roll >= attack_context.get("critical_hit_threshold", 6)
        normal_hits = 1
        auto_wounds = 0

        sustained_hits_bonus = self.get_sustained_hits_bonus(weapon)
        if critical_hit and sustained_hits_bonus > 0:
            normal_hits += sustained_hits_bonus
            suffix = "" if sustained_hits_bonus == 1 else "s"
            self.log(f"On a 6 the attack explodes, causing {sustained_hits_bonus} extra hit{suffix}")

        if critical_hit and self.weapon_has_keyword(weapon, "LH", attack_context):
            auto_wounds = 1
            normal_hits -= 1
            self.log(f"On a critical hit {unit_name} automatically wounds {target_name} due to Lethal Hits")

        return normal_hits, auto_wounds

    def apply_anti_rule(self, wound_roll: int, weapon: dict[str, Any], target: dict[str, Any]) -> int:
        anti_keyword = weapon.get("anti_keyword")
        anti_value = weapon.get("anti_value", 0)
        if not anti_keyword or anti_keyword not in target["keywords"]:
            return wound_roll
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
    ) -> tuple[bool, bool]:
        wound_roll = self.die_roll()
        self.log(f"{unit_name} rolls a {wound_roll} to wound")
        wound_roll = self.apply_anti_rule(wound_roll, weapon, target)

        if wound_roll < to_wound:
            wound_roll = self.apply_wound_reroll(wound_roll, to_wound, unit_name, weapon)
            wound_roll = self.apply_anti_rule(wound_roll, weapon, target)

        if wound_roll < to_wound:
            self.log(f"{unit_name} failed to wound")
            return False, False

        devastating_wound = wound_roll == 6 and self.weapon_has_keyword(weapon, "DW", attack_context)
        if devastating_wound:
            self.log(f"On a 6 {unit_name} scores a critical wound with Devastating Wounds")

        return True, devastating_wound

    def resolve_save(
        self,
        target: dict[str, Any],
        weapon: dict[str, Any],
        no_save_allowed: bool,
        attack_context: dict[str, Any],
    ) -> bool:
        if no_save_allowed:
            self.log(f"{target['name']} cannot make a save against this attack")
            return True

        effective_ap = max(0, weapon["ap"] + attack_context.get("target_ap_modifier", 0))
        if attack_context.get("target_ap_modifier", 0) < 0 and weapon["ap"] > 0:
            self.log("Armour of Contempt worsens the attack's Armour Penetration by 1")

        armor_required = target["armor_save"] + effective_ap
        if (
            (target["has_cover"] or attack_context.get("indirect_cover", False))
            and weapon["range"].lower() != "melee"
            and not self.weapon_has_keyword(weapon, "Ignores Cover", attack_context)
            and not (effective_ap == 0 and target["armor_save"] <= 3)
        ):
            armor_required = max(2, armor_required - 1)
            self.log("The target gets +1 to its armor save due to cover")
        elif (
            target["has_cover"] or attack_context.get("indirect_cover", False)
        ) and self.weapon_has_keyword(weapon, "Ignores Cover", attack_context):
            self.log(f"{weapon['name']} ignores the benefits of cover")

        available_saves: list[tuple[int, str]] = []
        if armor_required <= 6:
            available_saves.append((armor_required, "armor"))
        if target["invulnerable_save"] > 0:
            available_saves.append((target["invulnerable_save"], "invulnerable"))

        if not available_saves:
            self.log(f"{target['name']} does not get a save")
            return True

        required, save_type = min(available_saves, key=lambda item: item[0])
        save_roll = self.die_roll()
        self.log(f"{target['name']} attempts a {save_type} save on {required}+")

        if save_roll >= required:
            self.log(f"{target['name']} passes the save with a {save_roll}")
            return False

        self.log(f"{target['name']} fails the save with a {save_roll}")
        return True

    def roll_damage(self, weapon: dict[str, Any], attack_context: dict[str, Any]) -> tuple[int, int]:
        damage = self.roll_value(weapon["damage"])
        if weapon["range"].lower() == "melee":
            damage += attack_context.get("melee_weapon_bonus", 0)
        melta_bonus = self.get_melta_bonus(weapon, attack_context.get("in_half_range", False))
        if melta_bonus > 0:
            damage += melta_bonus
        return damage, melta_bonus

    def apply_temporary_target_modifiers(
        self,
        target_state: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> None:
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
        self.log(
            f"{target_state['name']} rolls Feel No Pain {feel_no_pain}+ for {damage} wounds: "
            f"{', '.join(str(roll) for roll in rolls)}"
        )
        if ignored_wounds > 0:
            self.log(f"{target_state['name']} ignores {ignored_wounds} wounds with Feel No Pain")
        else:
            self.log(f"{target_state['name']} ignores no wounds with Feel No Pain")
        return remaining_damage

    def allocate_normal_damage(self, target_state: dict[str, Any], damage: int) -> None:
        damage = self.apply_feel_no_pain(target_state, damage)
        if damage <= 0:
            self.log(f"{target_state['name']} suffers no damage")
            return

        target_state["current_wounds"] -= damage

        if target_state["current_wounds"] > 0:
            self.log(
                f"{target_state['name']} survives with {target_state['current_wounds']} wounds remaining"
            )
            return

        target_state["models"] -= 1
        if target_state["models"] <= 0:
            target_state["current_wounds"] = 0
            self.log(f"{target_state['name']} has been destroyed")
            return

        target_state["current_wounds"] = target_state["wounds"]
        self.log(f"One {target_state['name']} model is destroyed")
        self.log(f"There are {target_state['models']} models left in the unit")

    def allocate_spillover_mortal_wounds(self, target_state: dict[str, Any], damage: int) -> None:
        damage = self.apply_feel_no_pain(target_state, damage)
        if damage <= 0:
            self.log(f"{target_state['name']} suffers no mortal wounds")
            return

        remaining_damage = damage

        while remaining_damage > 0 and target_state["models"] > 0:
            wounds_to_allocate = min(target_state["current_wounds"], remaining_damage)
            target_state["current_wounds"] -= wounds_to_allocate
            remaining_damage -= wounds_to_allocate

            if target_state["current_wounds"] > 0:
                self.log(
                    f"{target_state['name']} survives with {target_state['current_wounds']} wounds remaining"
                )
                return

            target_state["models"] -= 1
            if target_state["models"] <= 0:
                target_state["current_wounds"] = 0
                self.log(f"{target_state['name']} has been destroyed")
                return

            self.log(f"One {target_state['name']} model is destroyed")
            self.log(f"There are {target_state['models']} models left in the unit")
            target_state["current_wounds"] = target_state["wounds"]

    def apply_damage(
        self,
        unit_name: str,
        weapon: dict[str, Any],
        target_state: dict[str, Any],
        damage_mode: str,
        attack_context: dict[str, Any],
    ) -> None:
        damage, melta_bonus = self.roll_damage(weapon, attack_context)

        if damage_mode == "mortal":
            self.log(f"{unit_name} inflicts {damage} mortal wounds on {target_state['name']}")
        elif damage_mode == "mortal_no_spill":
            self.log(f"{unit_name} inflicts {damage} mortal wounds on {target_state['name']}")
            self.log("Excess mortal wound damage is lost for this attack")
        else:
            self.log(f"{unit_name} deals {damage} damage to {target_state['name']}")
        if melta_bonus > 0:
            self.log(f"Melta adds {melta_bonus} damage at this range")

        if damage_mode == "mortal":
            self.allocate_spillover_mortal_wounds(target_state, damage)
            return

        self.allocate_normal_damage(target_state, damage)

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

    def resolve_hazardous_checks(
        self,
        attacker_unit: dict[str, Any],
        selected_weapon: dict[str, Any],
        attack_context: dict[str, Any],
    ) -> dict[str, Any] | None:
        hazardous_weapons = self.get_used_hazardous_weapons(attacker_unit, selected_weapon, attack_context)
        if not hazardous_weapons:
            return None

        hazardous_bearer_state = None
        for weapon in hazardous_weapons:
            hazardous_roll = self.die_roll()
            self.log(f"\nHazardous check for {weapon['name']}: {hazardous_roll}")
            if hazardous_roll != 1:
                self.log(f"{weapon['name']} passes its Hazardous check")
                continue

            self.log(f"{weapon['name']} fails its Hazardous check")
            if attack_context.get("hazardous_overwatch_charge_phase", False):
                self.log(
                    "These Hazardous mortal wounds are allocated after the charging unit ends its charge move"
                )

            if hazardous_bearer_state is None or hazardous_bearer_state["models"] <= 0:
                hazardous_bearer_state = self.configure_hazardous_bearer_state(attacker_unit, attack_context)

            self.apply_damage(
                attacker_unit["name"],
                {"name": weapon["name"], "damage": 3, "keywords": [], "range": "Melee", "ap": 0},
                hazardous_bearer_state,
                "mortal_no_spill",
                {"in_half_range": False, "melee_weapon_bonus": 0},
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
        attacks_remaining = self.roll_value(weapon["attacks"])
        if weapon["range"].lower() == "melee":
            attacks_remaining += attack_context.get("melee_weapon_bonus", 0)
        rapid_fire_bonus = self.get_rapid_fire_bonus(weapon, attack_context.get("in_half_range", False))
        blast_bonus = self.get_blast_bonus(weapon, target_state, attack_context)
        attacks_remaining += rapid_fire_bonus + blast_bonus
        effective_strength = weapon["strength"]
        if weapon["range"].lower() == "melee":
            effective_strength += attack_context.get("melee_weapon_bonus", 0)
        base_to_wound = self.get_to_wound_threshold(effective_strength, target_state["toughness"])
        wound_roll_modifier = self.get_wound_roll_modifier(attacker_unit, target_state, attack_context)
        wound_roll_modifier += self.get_weapon_wound_bonus(weapon, attack_context)
        to_wound = self.clamp_target_number(base_to_wound - wound_roll_modifier)

        self.log(f"\n{unit_name} attacks with {weapon['name']}")
        self.log(f"Attacks: {attacks_remaining}")
        if attack_context.get("melee_weapon_bonus", 0) > 0 and weapon["range"].lower() == "melee":
            self.log(
                f"Detachment enhancement adds +{attack_context['melee_weapon_bonus']} Attacks, Strength and Damage"
            )
        if rapid_fire_bonus > 0:
            self.log(f"Rapid Fire adds {rapid_fire_bonus} attacks at this range")
        if blast_bonus > 0:
            self.log(f"Blast adds {blast_bonus} attacks based on target unit size")
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

        for _ in range(attacks_remaining):
            if target_state["models"] <= 0:
                break

            normal_hits, auto_wounds = self.resolve_hit(unit_name, weapon, target_state["name"], attack_context)

            for _ in range(auto_wounds):
                allocation_target = self.get_precision_allocation_target(target_state, weapon, attack_context)
                if allocation_target["models"] <= 0:
                    break
                if allocation_target is not target_state:
                    self.log(
                        f"{weapon['name']} uses Precision to allocate the successful wound to {allocation_target['name']}"
                    )
                if self.resolve_save(allocation_target, weapon, False, attack_context):
                    self.apply_damage(unit_name, weapon, allocation_target, "normal", attack_context)

            for _ in range(normal_hits):
                if target_state["models"] <= 0:
                    break
                wound_succeeds, devastating_wound = self.resolve_wound(
                    unit_name,
                    weapon,
                    target_state,
                    to_wound,
                    attack_context,
                )
                if not wound_succeeds:
                    continue
                allocation_target = self.get_precision_allocation_target(target_state, weapon, attack_context)
                if allocation_target is not target_state:
                    self.log(
                        f"{weapon['name']} uses Precision to allocate the successful wound to {allocation_target['name']}"
                    )
                damage_mode = "mortal_no_spill" if devastating_wound else "normal"
                if self.resolve_save(allocation_target, weapon, devastating_wound, attack_context):
                    self.apply_damage(unit_name, weapon, allocation_target, damage_mode, attack_context)

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

    def build_target_state(self, unit: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": unit["name"],
            "toughness": unit["toughness"],
            "wounds": unit["wounds"],
            "current_wounds": unit["wounds"],
            "armor_save": unit["armor_save"],
            "invulnerable_save": unit["invulnerable_save"],
            "models": unit["models"],
            "effects": list(unit.get("effects", [])),
            "feel_no_pain": self.get_lowest_effect_value(unit.get("effects", []), "feel_no_pain"),
            "has_cover": False,
            "keywords": list(unit["keywords"]),
        }

    @staticmethod
    def summarize_state(target_state: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": target_state["name"],
            "models_remaining": target_state["models"],
            "current_model_wounds": target_state["current_wounds"],
            "destroyed": target_state["models"] <= 0,
        }

    def build_attack_context(
        self,
        attacker_unit: dict[str, Any],
        weapon: dict[str, Any],
        options: dict[str, Any],
        attached_character_unit: dict[str, Any] | None,
        target_has_cover: bool,
    ) -> dict[str, Any]:
        indirect_target_visible = options.get("indirect_target_visible", True)

        temporary_weapon_keywords: set[str] = set()
        if bool(options.get("attacker_fire_discipline_active", False)) and weapon["range"].lower() != "melee":
            temporary_weapon_keywords.update({"Heavy", "Ignores Cover", "Assault"})
        if bool(options.get("attacker_unforgiven_fury_active", False)):
            temporary_weapon_keywords.add("LH")

        attacker_hit_modifier = 0
        attacker_outgoing_wound_modifier = 0
        if bool(options.get("attacker_stubborn_tenacity_active", False)) and bool(options.get("attacker_below_starting_strength", False)):
            attacker_hit_modifier += 1
            if bool(options.get("attacker_battleshocked", False)):
                attacker_outgoing_wound_modifier += 1

        melee_weapon_bonus = 0
        if bool(options.get("attacker_weapons_of_the_first_legion_active", False)):
            melee_weapon_bonus = 2 if bool(options.get("attacker_battleshocked", False)) else 1

        attacker_feel_no_pain = 0
        if bool(options.get("attacker_pennant_of_remembrance_active", False)):
            attacker_feel_no_pain = 4 if bool(options.get("attacker_battleshocked", False)) else 6

        target_incoming_wound_modifier = -1 if bool(options.get("defender_unbreakable_lines_active", False)) else 0
        target_ap_modifier = -1 if bool(options.get("defender_armour_of_contempt_active", False)) else 0
        target_feel_no_pain = 0
        if bool(options.get("defender_pennant_of_remembrance_active", False)):
            target_feel_no_pain = 4 if bool(options.get("defender_battleshocked", False)) else 6

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
            "oath_of_moment_active": bool(options.get("oath_of_moment_active", False))
            and self.unit_has_oath_of_moment(attacker_unit),
            "oath_of_moment_wound_bonus": 0,
            "temporary_weapon_keywords": temporary_weapon_keywords,
            "critical_hit_threshold": (
                5
                if bool(options.get("attacker_unforgiven_fury_active", False))
                and bool(options.get("attacker_unforgiven_fury_army_battleshocked", False))
                else 6
            ),
            "attacker_hit_modifier": attacker_hit_modifier,
            "attacker_outgoing_wound_modifier": attacker_outgoing_wound_modifier,
            "melee_weapon_bonus": melee_weapon_bonus,
            "target_incoming_wound_modifier": target_incoming_wound_modifier,
            "target_ap_modifier": target_ap_modifier,
            "target_feel_no_pain": target_feel_no_pain,
        }
        if attack_context["oath_of_moment_active"] and self.unit_gets_oath_wound_bonus(attacker_unit):
            attack_context["oath_of_moment_wound_bonus"] = 1
        if attached_character_unit is not None:
            precision_target = self.build_target_state(attached_character_unit)
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
        self.log_messages = []

        target_state = self.build_target_state(defender_unit)
        target_has_cover = bool(options.get("target_has_cover", False))
        target_state["has_cover"] = target_has_cover
        attack_context = self.build_attack_context(
            attacker_unit,
            weapon,
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

        self.resolve_unit_attack(attacker_unit, weapon, target_state, attack_context)
        hazardous_bearer_state = self.resolve_hazardous_checks(attacker_unit, weapon, attack_context)

        result = {
            "log": list(self.log_messages),
            "target": self.summarize_state(target_state),
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
