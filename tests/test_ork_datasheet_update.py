import json
import unittest
from pathlib import Path

from data_loader import load_factions


SOURCE_DIR = Path.home() / "Downloads" / "orks_20_datasheets_json"
SECOND_SOURCE_DIR = Path.home() / "Downloads" / "orks_datasheets_batch_20_new"
FINAL_SOURCE_DIR = Path.home() / "Downloads" / "orks_datasheets_batch_15"


class OrkDatasheetUpdateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = json.loads(Path("Orks.json").read_text(encoding="utf-8"))
        cls.units = {unit["name"]: unit for unit in data["units"]}

    def test_every_supplied_datasheet_is_present(self):
        supplied = {
            json.loads(path.read_text(encoding="utf-8"))["name"]
            for path in SOURCE_DIR.glob("*.json")
        }
        self.assertEqual(len(supplied), 20)
        self.assertTrue(supplied.issubset(self.units))

        second_batch = {
            json.loads(path.read_text(encoding="utf-8"))["name"]
            for path in SECOND_SOURCE_DIR.glob("*.json")
        }
        self.assertEqual(len(second_batch), 20)
        self.assertTrue(second_batch.issubset(self.units))

        final_batch = {
            "Wartrakka" if name == "Wartrakks" else name.replace("’", "'")
            for path in FINAL_SOURCE_DIR.glob("*.json")
            for name in [json.loads(path.read_text(encoding="utf-8"))["name"]]
        }
        self.assertEqual(len(final_batch), 15)
        self.assertTrue(final_batch.issubset(self.units))

    def test_obsolete_units_and_legacy_duplicates_are_removed(self):
        removed = {
            "Painboy (Legacy)", "Weirdboy (Legacy)", "Boyz (Legacy)",
            "Gretchin (Legacy)", "Wurrboy", "Burna Boyz", "Lootas",
            "Kustom Boosta-blasta", "Shokkjump Dragsta", "Megatrakk Scrapjet",
            "Boomdakka Snazzwagon",
        }
        self.assertTrue(removed.isdisjoint(self.units))

    def test_new_character_values_are_normalized(self):
        self.assertEqual(self.units["Warboss"]["stats"]["toughness"], 6)
        self.assertEqual(self.units["Warboss"]["points"], [100])
        self.assertEqual(self.units["Nazdreg"]["points"], [165])
        self.assertEqual(self.units["Wazdakka Gutsmek"]["stats"]["movement"], 14)
        self.assertIn("Wartrakka", self.units)
        self.assertIn("Rukkatrukk Squigbuggies", self.units)
        self.assertEqual(self.units["Breaka Boyz"]["points"], [120, 130])
        self.assertEqual(self.units["Gargantuan Squiggoth"]["stats"]["wounds"], 30)
        self.assertEqual(self.units["Trukk"]["points"], [60, 70])
        self.assertEqual(self.units["Gunwagon"]["points"], [150, 160])
        self.assertEqual(self.units["Warbuggies"]["unit_composition"], {"min_models": 1, "max_models": 2})
        self.assertEqual(self.units["Wartrakka"]["points"], [70, 130])

    def test_updated_roster_loads(self):
        loaded = load_factions()["Orks"]["units"]
        for name in ("Nazdreg", "Wazdakka Gutsmek", "Warboss"):
            self.assertIn(name, loaded)


if __name__ == "__main__":
    unittest.main()
