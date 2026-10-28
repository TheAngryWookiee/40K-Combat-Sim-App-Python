import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator


def ork_unit(name="Orks Unit"):
    return {
        "name": name, "keywords": ["orks", "infantry"], "models": 1,
        "toughness": 5, "wounds": 2, "armor_save": 6, "invulnerable_save": 0,
        "effects": [], "abilities": [{"name": "Faction", "rules_text": "Waaagh!"}],
        "weapons": {},
    }


def weapon(melee=False):
    return {
        "name": "Choppa" if melee else "Slugga", "range": "Melee" if melee else '12"',
        "attacks": 4, "skill": 3, "strength": 5, "ap": -1, "damage": 1,
        "keywords": [], "raw_keywords": [],
    }


class OrksArmyRuleTests(unittest.TestCase):
    def context(self, profile, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = ork_unit()
        attacker["weapons"] = {profile["name"]: profile}
        target = engine.build_target_state(copy.deepcopy(ork_unit("Target")))
        return engine.build_attack_context(attacker, profile, target, options, None, False)

    def test_new_army_rule_payload_replaces_old_waaagh(self):
        rules = json.loads(Path("Orks.json").read_text(encoding="utf-8"))["faction"]["army_rules"]
        self.assertEqual(
            [rule["name"] for rule in rules],
            ["Waaagh!", "Da Boss", "Unstable Energies", "Special Move Types"],
        )
        self.assertIn("riled up", rules[0]["rules_text"])
        self.assertIn("[ASSAULT]", rules[0]["rules_text"])
        self.assertNotIn("Add 1 to the Strength and Attacks", rules[0]["rules_text"])

    def test_new_ork_detachment_catalog(self):
        detachments = json.loads(Path("Orks.json").read_text(encoding="utf-8"))["faction"]["detachments"]
        self.assertEqual(len(detachments), 14)
        self.assertEqual([detachment["name"] for detachment in detachments], ["Green Tide", "Bully Boyz", "Runt Swarm", "Shoota Boyz", "Taktikal Brigade", "Wreckas", "Da Big Hunt", "Madcap Meks", "Dread Mob", "Blitz Brigade", "Kult of Speed", "Flyboyz", "Brute Bosses", "Wurrband"])
        self.assertTrue(all(detachment["detachment_points"] == 1 for detachment in detachments))

    def test_waaagh_grants_assault_without_old_melee_bonuses(self):
        ranged = self.context(weapon(), attacker_waaagh_active=True)
        melee = self.context(weapon(melee=True), attacker_waaagh_active=True)
        self.assertIn("Assault", ranged["temporary_ranged_weapon_keywords"])
        self.assertEqual(melee["melee_attack_bonus"], 0)
        self.assertEqual(melee["melee_strength_bonus"], 0)

    def test_riled_up_defender_has_five_plus_invulnerable_save(self):
        context = self.context(weapon(), defender_waaagh_active=True)
        self.assertEqual(context["target_invulnerable_save"], 5)

    def test_da_big_hunt_adds_ap_against_vehicles(self):
        options = {
            "attacker_detachment_name": "Da Big Hunt",
        }
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = ork_unit()
        attacker["keywords"].append("beast snagga")
        profile = weapon(melee=True)
        attacker["weapons"] = {profile["name"]: profile}
        target = ork_unit("Target")
        target["keywords"].append("vehicle")
        context = engine.build_attack_context(attacker, profile, engine.build_target_state(target), options, None, False)
        self.assertEqual(context["attacker_ap_modifier"], 1)

    def test_green_tide_charge_rules_add_keywords(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = ork_unit("Boyz")
        attacker["keywords"].append("boyz")
        profile = weapon(melee=True)
        attacker["weapons"] = {profile["name"]: profile}
        context = engine.build_attack_context(attacker, profile, engine.build_target_state(ork_unit("Target")), {"attacker_detachment_name": "Green Tide", "charged_this_turn": True}, None, False)
        applied = context["temporary_weapon_keywords_by_weapon_name"]["choppa"]
        self.assertIn("SH1", applied)
        self.assertIn("LH: non-MONSTER/VEHICLE", applied)

    def test_new_warboss_charge_profile_is_applied(self):
        attacker = ork_unit("Warboss")
        attacker["abilities"].append({"name": "Might Is Right", "rules_text": ""})
        profile = weapon(melee=True)
        attacker["weapons"] = {profile["name"]: profile}
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        context = engine.build_attack_context(attacker, profile, engine.build_target_state(ork_unit("Target")), {"charged_this_turn": True}, None, False)
        self.assertEqual(context["melee_attack_bonus"], 3)
        self.assertEqual(context["melee_strength_bonus"], 2)

    def test_speediest_freeks_uses_hit_floor_not_invulnerable_save(self):
        context = self.context(weapon(), defender_speediest_freeks_active=True)
        self.assertTrue(context["unmodified_hit_rolls_1_to_3_fail"])
        self.assertNotEqual(context["target_invulnerable_save"], 5)


if __name__ == "__main__":
    unittest.main()
