import json
import unittest
from pathlib import Path

from data_loader import load_factions


class SpaceMarineUnitRosterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw_units = json.loads(Path("Adeptus_Astartes.json").read_text(encoding="utf-8"))["units"]
        cls.units = load_factions()["Adeptus Astartes"]["units"]

    def test_general_roster_contains_only_current_units(self):
        self.assertEqual(len(self.raw_units), 70)
        self.assertEqual(len(self.units), 70)
        self.assertEqual(len({unit["name"] for unit in self.raw_units}), 70)

    def test_retired_and_legacy_units_are_removed(self):
        removed = {
            "Captain with Relic Shield", "Lieutenant in Reiver Armour", "Tactical Squad",
            "Devastator Squad", "Centurion Assault Squad", "Centurion Devastator Squad",
            "Dreadnought", "Suppressor Squad", "Predator Annihilator", "Predator Destructor",
            "Vindicator", "Whirlwind", "Razorback", "Hammerfall Bunker",
            "Stormhawk Interceptor", "Stormraven Gunship", "Stormtalon Gunship",
            "Ancient (Legacy)", "Intercessor Squad (Legacy)",
        }
        self.assertTrue(removed.isdisjoint(self.units))

    def test_eradicator_variants_are_named_explicitly(self):
        self.assertIn("Eradicator Squad with Heavy Bolters", self.units)
        self.assertIn("Eradicator Squad with Melta Rifles", self.units)
        self.assertNotIn("Eradicator Squad with Heavy Bolter", self.units)
        self.assertNotIn("Eradicator Squad", self.units)

    def test_new_mounted_units_are_present(self):
        self.assertIn("Captain on Bike", self.units)
        self.assertIn("Invader ATVs", self.units)


if __name__ == "__main__":
    unittest.main()
