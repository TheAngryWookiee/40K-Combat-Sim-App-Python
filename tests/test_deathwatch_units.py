import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


EXPECTED_UNITS = {
    "Deathwatch Terminator Squad",
    "Deathwatch Veterans",
    "Decimus Kill Team",
    "Fortis Kill Team",
    "Indomitor Kill Team",
    "Spectrus Kill Team",
    "Talonstrike Kill Team",
    "Watch Captain Artemis",
    "Watch Master",
}


class DeathwatchUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Deathwatch.json").read_text(encoding="utf-8"))
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Deathwatch"]["units"]

    def context(self, unit_name, weapon_name, target_keywords=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units[unit_name])
        weapon = attacker["weapons"][weapon_name]
        target = {
            "name": "Target",
            "keywords": target_keywords or ["infantry"],
            "models": 5,
            "toughness": 5,
            "wounds": 2,
            "armor_save": 3,
            "invulnerable_save": 0,
            "effects": [],
            "abilities": [],
            "weapons": {},
        }
        return engine.build_attack_context(
            attacker,
            weapon,
            engine.build_target_state(target),
            options,
            None,
            False,
        )

    def test_updated_specific_roster(self):
        self.assertEqual(set(self.raw_units), EXPECTED_UNITS)
        self.assertIn("Intercessor Squad", self.loaded_units)

    def test_profiles_costs_and_leaders(self):
        terminators = self.loaded_units["Deathwatch Terminator Squad"]
        master = self.raw_units["Watch Master"]

        self.assertEqual(terminators["toughness"], 6)
        self.assertEqual(terminators["models"], 5)
        self.assertEqual(terminators["weapons"]["Storm Bolter"]["strength"], 5)
        self.assertEqual(self.raw_units["Deathwatch Veterans"]["unit_costs"][1]["points"], 220)
        self.assertEqual(
            master["leader"], ["Deathwatch Veterans", "Decimus Kill Team", "Fortis Kill Team"],
        )

    def test_kill_team_keywords_and_combat_doctrines(self):
        for name in EXPECTED_UNITS:
            unit = self.loaded_units[name]
            self.assertTrue(any(
                ability["name"] == "Faction" and ability["rules_text"] == "Combat Doctrines"
                for ability in unit["abilities"]
            ))
        self.assertIn("kill team", self.loaded_units["Fortis Kill Team"]["keywords"])

    def test_death_to_the_alien_and_tactical_instinct(self):
        alien = self.context("Deathwatch Veterans", "Boltgun", ["xenos", "infantry"])
        imperium = self.context("Deathwatch Veterans", "Boltgun", ["imperium", "infantry"])
        artemis = self.context("Watch Captain Artemis", "Hellfire Extremis")

        self.assertTrue(alien["reroll_all_hit_rolls"])
        self.assertTrue(imperium["reroll_hit_rolls_of_1"])
        self.assertFalse(imperium["reroll_all_hit_rolls"])
        self.assertIn("SH1", artemis["temporary_weapon_keywords"])

    def test_kill_team_doctrines(self):
        fortis = self.context(
            "Fortis Kill Team", "Deathwatch Bolt Rifle", target_below_half_strength=True,
        )
        indomitor = self.context(
            "Indomitor Kill Team", "Deathwatch Heavy Bolt Rifle",
            attacker_target_closest_eligible=True,
        )
        talonstrike = self.context(
            "Talonstrike Kill Team", "Heavy Bolt Pistol",
            attacker_set_up_on_battlefield_this_turn=True,
        )

        self.assertEqual(fortis["attacker_hit_modifier"], 1)
        self.assertEqual(fortis["attacker_outgoing_wound_modifier"], 1)
        self.assertEqual(indomitor["ranged_strength_bonus"], 1)
        self.assertEqual(talonstrike["attacker_ap_modifier"], 1)


if __name__ == "__main__":
    unittest.main()
