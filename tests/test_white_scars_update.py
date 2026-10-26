import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class WhiteScarsUpdateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("White_Scars.json").read_text(encoding="utf-8"))
        cls.detachment = raw["faction"]["detachments"][0]
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.units = load_factions()["White Scars"]["units"]

    def context(self, unit_name, weapon_name, target_keywords=None, active=(), **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.units[unit_name])
        profile = attacker["weapons"][weapon_name]
        target = {
            "name": "Target", "keywords": target_keywords or ["infantry"], "models": 1,
            "toughness": 5, "wounds": 5, "armor_save": 3, "invulnerable_save": 0,
            "effects": [], "abilities": [], "weapons": {},
        }
        return engine.build_attack_context(
            attacker, profile, engine.build_target_state(target),
            {"attacker_detachment_name": "Spearpoint Task Force",
             "attacker_active_ability_names": list(active), **options}, None, False,
        )

    def test_payload_and_roster(self):
        self.assertEqual(self.detachment["detachment_points"], 2)
        self.assertEqual(self.detachment["rule"]["name"], "Storm-swift Onslaught")
        self.assertEqual(len(self.detachment["enhancements"]), 4)
        self.assertEqual(len(self.detachment["stratagems"]), 6)
        self.assertEqual(set(self.raw_units), {"Kor'sarro Khan", "Suboden Khan"})
        self.assertEqual(self.raw_units["Kor'sarro Khan"]["points"], 80)
        self.assertEqual(self.raw_units["Suboden Khan"]["points"], 105)
        self.assertEqual(self.units["Kor'sarro Khan"]["toughness"], 5)
        self.assertEqual(self.units["Suboden Khan"]["toughness"], 6)

    def test_character_rules(self):
        trophy = self.context("Kor'sarro Khan", "Moonfang", ["character", "infantry"])
        khan_ranged = self.context("Kor'sarro Khan", "Anzuq")
        khan_melee = self.context("Kor'sarro Khan", "Moonfang")
        self.assertTrue(trophy["reroll_hit_rolls_of_1"])
        self.assertTrue(trophy["reroll_wound_rolls_of_1"])
        self.assertIn("Assault", khan_ranged["temporary_ranged_weapon_keywords"])
        self.assertIn("Lance", khan_melee["temporary_weapon_keywords_by_weapon_name"]["moonfang"])

    def test_suboden_conditional_power_sword(self):
        infantry = self.context("Suboden Khan", "Power sword")
        vehicle = self.context("Suboden Khan", "Power sword", ["vehicle"])
        self.assertIn("SH1", infantry["temporary_melee_weapon_keywords"])
        self.assertNotIn("SH1", vehicle["temporary_melee_weapon_keywords"])

    def test_enhancements(self):
        eye = self.context(
            "Kor'sarro Khan", "Anzuq", attacker_enhancement_name="Hunter's Eye",
            attacker_enhancement_bearer_name="Kor'sarro Khan",
        )
        standard = self.context(
            "Kor'sarro Khan", "Moonfang", attacker_enhancement_name="Spearpoint Paragon",
            attacker_enhancement_bearer_name="Kor'sarro Khan",
        )
        charged = self.context(
            "Kor'sarro Khan", "Moonfang", attacker_enhancement_name="Spearpoint Paragon",
            attacker_enhancement_bearer_name="Kor'sarro Khan", charged_this_turn=True,
        )
        self.assertIn("Ignores Cover", eye["temporary_weapon_keywords_by_weapon_name"]["anzuq"])
        self.assertIn("SH1", eye["temporary_weapon_keywords_by_weapon_name"]["anzuq"])
        self.assertEqual((standard["melee_strength_bonus"], standard["attacker_ap_modifier"]), (1, 1))
        self.assertEqual((charged["melee_strength_bonus"], charged["attacker_ap_modifier"]), (2, 2))

    def test_stratagem_combat_effects(self):
        mobile = self.context("Kor'sarro Khan", "Anzuq", active=["Mobile Lethality"])
        mounted = self.context("Suboden Khan", "Stormtooth", active=["Spear Thrust and Sabre Swing"])
        self.assertIn("Assault", mobile["temporary_ranged_weapon_keywords"])
        self.assertIn("LH", mounted["temporary_melee_weapon_keywords"])
        self.assertIn("Lance", mounted["temporary_melee_weapon_keywords"])

        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.units["Intercessor Squad"])
        profile = next(weapon for weapon in attacker["weapons"].values() if weapon["range"] != "Melee")
        target = engine.build_target_state(copy.deepcopy(self.units["Suboden Khan"]))
        evasive = engine.build_attack_context(
            attacker, profile, target, {"defender_active_ability_names": ["Evasive Manoeuvres"]}, None, False,
        )
        self.assertEqual(evasive["target_incoming_wound_modifier"], -1)


if __name__ == "__main__":
    unittest.main()
