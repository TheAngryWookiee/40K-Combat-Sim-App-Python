import json
import unittest
from pathlib import Path

from data_loader import load_factions


EXPECTED_UNITS = {
    "Astorath",
    "Baal Predator",
    "Blood Angels Captain",
    "Chief Librarian Mephiston",
    "Commander Dante",
    "Death Company Captain",
    "Death Company Captain with Jump Pack",
    "Death Company Dreadnought",
    "Death Company Marines",
    "Death Company Marines with Jump Packs",
    "Lemartes",
    "Sanguinary Guard",
    "Sanguinary Priest",
    "The Sanguinor",
}


class BloodAngelsUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Blood_Angels.json").read_text(encoding="utf-8"))
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Blood Angels"]["units"]

    def test_updated_specific_roster(self):
        self.assertEqual(set(self.raw_units), EXPECTED_UNITS)
        self.assertNotIn("Death Company Marines with Bolt Rifles", self.loaded_units)
        self.assertIn("Intercessor Squad", self.loaded_units)

    def test_profiles_and_squad_sizes(self):
        astorath = self.loaded_units["Astorath"]
        marines = self.loaded_units["Death Company Marines"]
        guard = self.loaded_units["Sanguinary Guard"]

        self.assertEqual(astorath["toughness"], 5)
        self.assertEqual(astorath["weapons"]["The Executioner's Axe"]["damage"], 2)
        self.assertEqual(marines["unit_composition"]["min_models"], 5)
        self.assertEqual(marines["unit_composition"]["max_models"], 10)
        self.assertGreaterEqual(guard["unit_composition"]["max_models"], guard["unit_composition"]["min_models"])

    def test_army_rule_and_leader_relationships(self):
        astorath = self.loaded_units["Astorath"]
        self.assertTrue(any(
            ability["name"] == "Faction" and ability["rules_text"] == "Combat Doctrines"
            for ability in astorath["abilities"]
        ))
        self.assertIn("Death Company Marines With Jump Packs", astorath["leader"]["can_lead"])


if __name__ == "__main__":
    unittest.main()
