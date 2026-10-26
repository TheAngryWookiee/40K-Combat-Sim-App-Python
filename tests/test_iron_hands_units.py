import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class IronHandsUnitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Iron_Hands.json").read_text(encoding="utf-8"))
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Iron Hands"]["units"]

    def context(self, unit_name, weapon_name, target_keywords=None, doctrine=""):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units[unit_name])
        profile = attacker["weapons"][weapon_name]
        target = {
            "name": "Target", "keywords": target_keywords or ["infantry"], "models": 1,
            "toughness": 5, "wounds": 5, "armor_save": 3, "invulnerable_save": 0,
            "effects": [], "abilities": [], "weapons": {},
        }
        return engine.build_attack_context(
            attacker, profile, engine.build_target_state(target),
            {"attacker_combat_doctrine": doctrine}, None, False,
        )

    def test_updated_specific_roster(self):
        self.assertEqual(set(self.raw_units), {"Caanok Var", "Iron Father Feirros"})
        self.assertIn("Intercessor Squad", self.loaded_units)

    def test_profiles_points_and_army_rules(self):
        caanok = self.raw_units["Caanok Var"]
        feirros = self.raw_units["Iron Father Feirros"]

        self.assertEqual(caanok["points"], 100)
        self.assertEqual([weapon["name"] for weapon in caanok["weapons"]], ["Storm bolter", "Axiom"])
        self.assertEqual(caanok["weapons"][1]["armor_piercing"], "-3")
        self.assertEqual(feirros["points"], 85)
        for unit in (caanok, feirros):
            rules = [ability["rules_text"] for ability in unit["abilities"]]
            self.assertIn("Combat Doctrines", rules)
            self.assertIn("Transhuman Strategist", rules)

    def test_cold_and_calculating(self):
        standard = self.context("Caanok Var", "Storm bolter")
        tactical = self.context("Caanok Var", "Storm bolter", doctrine="tactical")
        vehicle = self.context("Caanok Var", "Storm bolter", ["vehicle"])

        self.assertIn("SH1", standard["temporary_weapon_keywords"])
        self.assertNotIn("LH", standard["temporary_weapon_keywords"])
        self.assertIn("SH1", tactical["temporary_weapon_keywords"])
        self.assertIn("LH", tactical["temporary_weapon_keywords"])
        self.assertNotIn("SH1", vehicle["temporary_weapon_keywords"])

    def test_rites_of_tempering_reduces_high_strength_wounds(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units["Intercessor Squad"])
        profile = next(iter(attacker["weapons"].values()))
        profile["strength"] = 10
        target = engine.build_target_state(copy.deepcopy(self.loaded_units["Iron Father Feirros"]))
        context = engine.build_attack_context(attacker, profile, target, {}, None, False)

        self.assertEqual(context["target_incoming_wound_modifier"], -1)
        self.assertEqual(target["feel_no_pain"], 5)


if __name__ == "__main__":
    unittest.main()
