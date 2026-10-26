import json
import unittest
from pathlib import Path

from data_loader import load_factions


EXPECTED_UNITS = {
    "Arjac Rockfist", "Bjorn the Fell-Handed", "Blood Claws", "Fenrisian Wolves",
    "Grey Hunters", "Iron Priest", "Logan Grimnar", "Murderfang", "Njal Stormcaller",
    "Ragnar Blackmane", "Thunderwolf Cavalry", "Ulrik the Slayer", "Venerable Dreadnought",
    "Wolf Guard Battle Leader", "Wolf Guard Headtakers", "Wolf Guard Terminators",
    "Wolf Priest", "Wolf Scouts", "Wulfen", "Wulfen with Storm Shields", "Wulfen Dreadnought",
}


class SpaceWolvesUnitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = json.loads(Path("Space_Wolves.json").read_text(encoding="utf-8"))
        cls.units = {unit["name"]: unit for unit in cls.raw["units"]}

    def test_current_roster_is_present(self):
        self.assertEqual(set(self.units), EXPECTED_UNITS)
        self.assertIn("Wolf Scouts", load_factions()["Space Wolves"]["units"])

    def test_updated_character_profiles_and_leaders(self):
        arjac = self.units["Arjac Rockfist"]
        self.assertEqual(arjac["stats"]["toughness"], 6)
        self.assertEqual(arjac["unit_costs"], [105])
        self.assertEqual(
            arjac["leader"]["can_lead"],
            ["Terminator Assault Squad", "Terminator Squad", "Wolf Guard Terminators"],
        )
        self.assertEqual(
            {ability["name"] for ability in arjac["abilities"]},
            {"Core", "Faction", "Champion of the Kingsguard", "Anvil of Endurance"},
        )

    def test_updated_pack_profiles_and_costs(self):
        self.assertEqual(self.units["Blood Claws"]["stats"]["toughness"], 5)
        self.assertEqual(self.units["Blood Claws"]["unit_costs"], [150, 290])
        self.assertEqual(self.units["Thunderwolf Cavalry"]["stats"]["wounds"], 4)
        self.assertEqual(self.units["Wolf Guard Terminators"]["unit_costs"], [180, 365, 220, 405])

    def test_wolf_scouts_are_normalized_and_flag_incomplete_source_profiles(self):
        scouts = self.units["Wolf Scouts"]
        self.assertEqual(scouts["unit_composition"], {"min_models": 6, "max_models": 12})
        self.assertEqual(scouts["stats"]["movement"], 8)
        self.assertEqual(len(scouts["weapons"]), 11)
        pending = {weapon["name"] for weapon in scouts["weapons"] if weapon.get("profile_pending_verification")}
        self.assertEqual(pending, {"Thunderclap", "Runic stave"})

    def test_wulfen_dreadnought_uses_supplied_complete_profile(self):
        dreadnought = self.units["Wulfen Dreadnought"]
        self.assertEqual(dreadnought["stats"]["movement"], 9)
        self.assertEqual(len(dreadnought["weapons"]), 5)
        self.assertEqual(
            {ability["name"] for ability in dreadnought["abilities"]},
            {"Core", "Faction", "Violent Fury", "Bestial Rage", "Blizzard Shield"},
        )


if __name__ == "__main__":
    unittest.main()
