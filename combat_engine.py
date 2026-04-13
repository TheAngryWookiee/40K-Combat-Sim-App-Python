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
        self.stats: dict[str, int] = {}

    @staticmethod
    def build_empty_stats() -> dict[str, int]:
        return {
            "attack_instances": 0,
            "hit_rolls": 0,
            "auto_hit_attacks": 0,
            "successful_hit_attacks": 0,
            "failed_hit_attacks": 0,
            "critical_hit_attacks": 0,
            "extra_hits_generated": 0,
            "hit_rerolls_used": 0,
            "hit_reroll_successes": 0,
            "wound_rolls": 0,
            "auto_wounds": 0,
            "successful_wound_rolls": 0,
            "failed_wound_rolls": 0,
            "critical_wounds": 0,
            "wound_rerolls_used": 0,
            "wound_reroll_successes": 0,
            "damage_rerolls_used": 0,
            "damage_reroll_improvements": 0,
            "save_attempts": 0,
            "saves_passed": 0,
            "saves_failed": 0,
            "unsavable_wounds": 0,
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
        keyword_aliases = self.get_keyword_aliases(keyword)
        return any(
            effective_keyword in keyword_aliases
            for effective_keyword in self.get_effective_weapon_keywords(weapon, attack_context)
        )

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
        return keyword.lower() in set(unit.get("keywords", []))

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
        if weapon["range"].lower() != "melee" and attack_context.get("target_has_stealth", False):
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
            suffix = "" if sustained_hits_bonus == 1 else "s"
            self.log(f"On a critical hit the attack explodes, causing {sustained_hits_bonus} extra hit{suffix}")

        if critical_hit and self.weapon_has_keyword(weapon, "LH", attack_context):
            auto_wounds = 1
            normal_hits -= 1
            self.stats["auto_wounds"] += 1
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
        self.log(f"{target['name']} attempts a {save_type} save on {required}+")

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
        active_target = self.get_active_target_profile(target_state)
        damage = self.apply_feel_no_pain(active_target, damage)
        if damage <= 0:
            self.log(f"{active_target['name']} suffers no damage")
            return

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
            hazardous_fail_threshold = int(attack_context.get("hazardous_fail_threshold", 1))
            if hazardous_roll > hazardous_fail_threshold:
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
                {"in_half_range": False, "melee_attack_bonus": 0},
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
        weapon_bearer_count = self.get_weapon_bearer_count(attacker_unit, weapon)
        attacks_remaining = self.roll_value(weapon["attacks"]) * weapon_bearer_count
        if weapon["range"].lower() == "melee":
            attacks_remaining += attack_context.get("melee_attack_bonus", 0) * weapon_bearer_count
        rapid_fire_bonus = (
            self.get_rapid_fire_bonus(weapon, attack_context.get("in_half_range", False))
            * weapon_bearer_count
        )
        blast_bonus = self.get_blast_bonus(weapon, target_state, attack_context) * weapon_bearer_count
        attacks_remaining += rapid_fire_bonus + blast_bonus
        effective_strength = weapon["strength"]
        if weapon["range"].lower() == "melee":
            effective_strength += attack_context.get("melee_strength_bonus", 0)
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
        elif attack_context.get("ranged_damage_bonus", 0) > 0:
            self.log(f"Active ranged damage bonus: +{attack_context['ranged_damage_bonus']}")
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
        if attack_context.get("target_damage_modifier", 0) < 0:
            self.log(f"Incoming damage is reduced by {-attack_context['target_damage_modifier']}")

        for _ in range(attacks_remaining):
            if target_state["models"] <= 0:
                break

            normal_hits, auto_wounds = self.resolve_hit(unit_name, weapon, target_state["name"], attack_context)

            for _ in range(auto_wounds):
                allocation_target = self.get_precision_allocation_target(target_state, weapon, attack_context)
                if allocation_target["models"] <= 0:
                    break
                damage_target = self.get_active_target_profile(allocation_target)
                if allocation_target is not target_state:
                    self.log(
                        f"{weapon['name']} uses Precision to allocate the successful wound to {allocation_target['name']}"
                    )
                if self.resolve_save(damage_target, weapon, False, attack_context, critical_wound=False):
                    self.apply_damage(unit_name, weapon, allocation_target, "normal", attack_context)

            for _ in range(normal_hits):
                if target_state["models"] <= 0:
                    break
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
                allocation_target = self.get_precision_allocation_target(target_state, weapon, attack_context)
                damage_target = self.get_active_target_profile(allocation_target)
                if allocation_target is not target_state:
                    self.log(
                        f"{weapon['name']} uses Precision to allocate the successful wound to {allocation_target['name']}"
                    )
                damage_mode = "mortal_no_spill" if devastating_wound else "normal"
                if self.resolve_save(damage_target, weapon, devastating_wound, attack_context, critical_wound):
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

    def build_target_state(self, unit: dict[str, Any]) -> dict[str, Any]:
        target_profiles = [
            {
                **profile,
                "effects": list(profile.get("effects", [])),
                "keywords": list(profile.get("keywords", [])),
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
                "effects": list(unit.get("effects", [])),
                "feel_no_pain": self.get_lowest_effect_value(unit.get("effects", []), "feel_no_pain"),
                "has_cover": False,
                "keywords": list(unit["keywords"]),
                "profiles": target_profiles,
            }
            self.sync_target_state_profiles(target_state)
            return target_state

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
        if bool(options.get("attacker_stubborn_tenacity_active", False)) and bool(options.get("attacker_below_starting_strength", False)):
            attacker_hit_modifier += 1
            if bool(options.get("attacker_battleshocked", False)):
                attacker_outgoing_wound_modifier += 1
        if bool(options.get("defender_overwhelming_onslaught_active", False)) and weapon["range"].lower() == "melee":
            attacker_hit_modifier -= 1
        if bool(options.get("defender_stalkin_taktiks_active", False)) and weapon["range"].lower() != "melee" and self.unit_has_keyword(target_state, "infantry"):
            attacker_hit_modifier -= 1
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
        ranged_damage_bonus = 0
        if bool(options.get("attacker_weapons_of_the_first_legion_active", False)):
            weapons_of_the_first_legion_bonus = 2 if bool(options.get("attacker_battleshocked", False)) else 1
            melee_attack_bonus += weapons_of_the_first_legion_bonus
            melee_strength_bonus += weapons_of_the_first_legion_bonus
            melee_damage_bonus += weapons_of_the_first_legion_bonus
        if bool(options.get("attacker_waaagh_active", False)) and self.unit_has_waaagh(attacker_unit):
            melee_attack_bonus += 1
            melee_strength_bonus += 1
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
        if bool(options.get("defender_pennant_of_remembrance_active", False)):
            target_feel_no_pain = 4 if bool(options.get("defender_battleshocked", False)) else 6
        if (
            defender_enhancement_name == "Fenrisian Grit"
            and bool(options.get("defender_enhancement_bearer_is_single_model_unit", False))
        ):
            target_feel_no_pain = self.combine_feel_no_pain_values(target_feel_no_pain, 4)
        if (
            defender_enhancement_name == "Surly As a Squiggoth"
            and defender_has_attached_character
        ):
            effective_attack_strength = weapon["strength"] + (
                melee_strength_bonus if weapon["range"].lower() == "melee" else 0
            )
            if effective_attack_strength > int(target_state.get("toughness", 0)):
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
        hazardous_fail_threshold = 1
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
                    ]
                ],
            ),
            "attacker_hit_modifier": attacker_hit_modifier,
            "attacker_outgoing_wound_modifier": attacker_outgoing_wound_modifier,
            "attacker_ap_modifier": attacker_ap_modifier,
            "melee_attack_bonus": melee_attack_bonus,
            "melee_strength_bonus": melee_strength_bonus,
            "melee_damage_bonus": melee_damage_bonus,
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
            "sequence_state": options.get("sequence_state", {}),
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
        options = {
            **options,
            "sequence_state": self.build_sequence_state(options),
        }
        self.log_messages = []
        self.stats = self.build_empty_stats()

        target_state = self.build_target_state(defender_unit)
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

        self.resolve_unit_attack(attacker_unit, weapon, target_state, attack_context)
        hazardous_bearer_state = self.resolve_hazardous_checks(attacker_unit, weapon, attack_context)

        result = {
            "log": list(self.log_messages),
            "stats": dict(self.stats),
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

        target_state = self.build_target_state(defender_unit)
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

        self.resolve_weapon_set_attack(attacker_unit, weapons, target_state, attack_context)

        result = {
            "log": list(self.log_messages),
            "stats": dict(self.stats),
            "target": self.summarize_state(target_state),
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

            if index > 0:
                self.log(f"\n{attacker_unit['name']} joins the attack")

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
