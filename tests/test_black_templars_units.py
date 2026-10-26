import json
import unittest
from pathlib import Path

from data_loader import load_factions


EXPECTED_UNITS = {
    "Castellan",
    "Chaplain Grimaldus",
    "Crusade Ancient",
    "Crusader Squad",
    "Emperor's Champion",
    "Execrator",
    "Gladiator Lancer",
    "Gladiator Reaper",
    "Gladiator Valiant",
    "High Marshal Helbrecht",
    "Impulsor",
    "Marshal",
    "Repulsor",
    "Repulsor Executioner",
    "Sword Brethren Squad",
}


class BlackTemplarsUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.faction = load_factions()["Black Templars"]
        cls.units = cls.faction["units"]
        cls.raw_units = {
            unit["name"]: unit
            for unit in json.loads(Path("Black_Templars.json").read_text(encoding="utf-8"))["units"]
        }

    def test_updated_roster_is_available(self):
        self.assertEqual(set(self.raw_units), EXPECTED_UNITS)
        self.assertIn("Intercessor Squad", self.units)

    def test_profiles_and_compositions_are_normalized(self):
        castellan = self.units["Castellan"]
        crusaders = self.units["Crusader Squad"]
        sword_brethren = self.units["Sword Brethren Squad"]

        self.assertEqual(castellan["toughness"], 5)
        self.assertEqual(castellan["weapons"]["Combi-weapon - Purgatus"]["damage"], 2)
        self.assertEqual(crusaders["unit_composition"]["min_models"], 10)
        self.assertEqual(crusaders["unit_composition"]["max_models"], 20)
        self.assertEqual(sword_brethren["unit_composition"]["min_models"], 4)
        self.assertEqual(sword_brethren["unit_composition"]["max_models"], 10)

    def test_rules_relationships_and_transport_are_preserved(self):
        castellan = self.units["Castellan"]
        impulsor = self.units["Impulsor"]

        self.assertTrue(any(
            ability["name"] == "Faction" and ability["rules_text"] == "Combat Doctrines"
            for ability in castellan["abilities"]
        ))
        self.assertIn("Sword Brethren Squad", castellan["support"]["can_support"])
        self.assertIn("transport capacity", impulsor["transport"].lower())


if __name__ == "__main__":
    unittest.main()
