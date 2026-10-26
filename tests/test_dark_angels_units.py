import json
import unittest
from pathlib import Path

from data_loader import load_factions


EXPECTED_UNITS = {
    "Asmodai",
    "Azrael",
    "Belial",
    "Deathwing Knights",
    "Deathwing Terminator Squad",
    "Ezekiel",
    "Inner Circle Companions",
    "Land Speeder Vengeance",
    "Lazarus",
    "Lion El'Jonson",
    "Nephilim Jetfighter",
    "Ravenwing Black Knights",
    "Ravenwing Command Squad",
    "Ravenwing Darkshroud",
    "Ravenwing Dark Talon",
    "Sammael",
}


class DarkAngelsUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Dark_Angels.json").read_text(encoding="utf-8"))
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Dark Angels"]["units"]

    def test_updated_specific_roster(self):
        self.assertEqual(set(self.raw_units), EXPECTED_UNITS)
        self.assertIn("Intercessor Squad", self.loaded_units)

    def test_profiles_and_compositions(self):
        knights = self.loaded_units["Deathwing Knights"]
        vengeance = self.loaded_units["Land Speeder Vengeance"]

        self.assertEqual(knights["toughness"], 6)
        self.assertEqual(knights["models"], 5)
        self.assertEqual(knights["weapons"]["Great Weapon of the Unforgiven"]["damage"], 2)
        self.assertEqual(vengeance["toughness"], 9)
        self.assertEqual(vengeance["weapons"]["Plasma Storm Battery - Supercharge"]["strength"], 10)

    def test_combat_doctrines_and_derived_wings(self):
        knights = self.loaded_units["Deathwing Knights"]
        vengeance = self.loaded_units["Land Speeder Vengeance"]

        self.assertTrue(any(
            ability["name"] == "Faction" and ability["rules_text"] == "Combat Doctrines"
            for ability in knights["abilities"]
        ))
        self.assertIn("deathwing", knights["keywords"])
        self.assertIn("ravenwing", vengeance["keywords"])


if __name__ == "__main__":
    unittest.main()
