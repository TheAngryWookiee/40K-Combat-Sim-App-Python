import json
import unittest
from pathlib import Path

from data_loader import load_factions


class UltramarinesUnitRosterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw_units = {
            unit["name"]: unit
            for unit in json.loads(Path("Ultramarines.json").read_text(encoding="utf-8"))["units"]
        }
        cls.loaded_units = load_factions()["Ultramarines"]["units"]

    def test_specific_roster_contains_only_current_existing_datasheets(self):
        self.assertEqual(
            set(self.raw_units),
            {
                "Captain Titus", "Cato Sicarius", "Chief Librarian Tigurius", "Kaius Konorius",
                "Marneus Calgar", "Victrix Honour Guard", "Wardens of Ultramar",
                "Roboute Guilliman",
            },
        )

    def test_retired_ultramarines_units_are_removed(self):
        self.assertNotIn("Marneus Calgar in Armour of Antilochus", self.loaded_units)
        self.assertNotIn("Uriel Ventris", self.loaded_units)
        self.assertNotIn("Captain Sicarius", self.loaded_units)
        self.assertIn("Cato Sicarius", self.loaded_units)

    def test_ultramarines_inherit_the_clean_general_roster(self):
        self.assertEqual(len(self.loaded_units), 78)
        self.assertIn("Intercessor Squad", self.loaded_units)
        self.assertIn("Roboute Guilliman", self.loaded_units)

    def test_updated_points_and_profiles(self):
        expected_points = {
            "Captain Titus": 115, "Cato Sicarius": 115, "Chief Librarian Tigurius": 115,
            "Kaius Konorius": 100, "Marneus Calgar": 180, "Roboute Guilliman": 415,
            "Victrix Honour Guard": 120, "Wardens of Ultramar": 115,
        }
        self.assertEqual(
            {name: unit["points"] for name, unit in self.raw_units.items()}, expected_points,
        )
        self.assertEqual(self.loaded_units["Marneus Calgar"]["toughness"], 6)
        self.assertEqual(self.loaded_units["Roboute Guilliman"]["wounds"], 16)
        self.assertEqual(self.loaded_units["Victrix Honour Guard"]["models"], 3)


if __name__ == "__main__":
    unittest.main()
