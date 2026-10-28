import json
import unittest
from pathlib import Path

from data_loader import load_factions


SOURCE_DIR = Path.home() / "Downloads" / "adeptus_custodes_19_datasheets_json"
FINAL_SOURCE_DIR = Path.home() / "Downloads" / "adeptus_custodes_6_datasheets"


class CustodesDatasheetUpdateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = json.loads(Path("Adeptus_Custodes.json").read_text(encoding="utf-8"))
        cls.units = {unit["name"]: unit for unit in data["units"]}

    def test_all_supplied_datasheets_are_present(self):
        supplied = {json.loads(path.read_text(encoding="utf-8"))["name"] for path in SOURCE_DIR.glob("*.json")}
        self.assertEqual(len(supplied), 19)
        self.assertTrue(supplied.issubset(self.units))
        remaining = {json.loads(path.read_text(encoding="utf-8"))["name"].replace("Grav-tank", "Grav-Tank") for path in FINAL_SOURCE_DIR.glob("*.json")}
        self.assertEqual(len(remaining), 6)
        self.assertTrue(remaining.issubset(self.units))

    def test_obsolete_units_are_removed(self):
        removed = {"Aleya", "Valerian", "Agamatus Custodians", "Aquilon Custodians", "Custodian Guard", "Custodian Guard with Adrasite and Pyrithite Spears", "Sagittarum Custodians", "Venatari Custodians", "Venerable Contemptor Dreadnought", "Venerable Land Raider"}
        self.assertTrue(removed.isdisjoint(self.units))

    def test_new_profiles_and_points_are_normalized(self):
        self.assertEqual(self.units["Custodian Guard Sodality"]["points"], [240, 270])
        self.assertEqual(self.units["Trajann Valoris"]["stats"]["wounds"], 10)
        names = [item["name"] for item in self.units["Custodian Guard Sodality"]["weapons"]]
        self.assertIn("Guardian Spear - ranged", names)
        self.assertIn("Guardian Spear - melee", names)
        self.assertIn("Caladius Grav-Tank", self.units)
        self.assertIn("Pallas Grav-Attack", self.units)
        self.assertEqual(self.units["Pallas Grav-Attack"]["points"], [135])
        self.assertEqual(self.units["Contemptor-Achillus Dreadnought"]["points"], [230, 260])
        self.assertEqual(self.units["Telemon Heavy Dreadnought"]["stats"]["wounds"], 14)
        self.assertEqual(len(self.units), 29)

    def test_roster_loads_without_weapon_collisions(self):
        loaded = load_factions()["Adeptus Custodes"]["units"]
        for name in ("Custodian Guard Sodality", "Sentinel Guard Sodality", "Prosecutor Squad"):
            self.assertIn(name, loaded)


if __name__ == "__main__":
    unittest.main()
