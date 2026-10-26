import json
import unittest
from pathlib import Path

from data_loader import load_factions


BATCH_DIRS = (
    Path.home() / "Downloads" / "space_marines_16_datasheets_json",
    Path.home() / "Downloads" / "space_marines_19_datasheets_json",
    Path.home() / "Downloads" / "space_marines_20_datasheets_json",
)


class SpaceMarineDatasheetBatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = json.loads(Path("Adeptus_Astartes.json").read_text(encoding="utf-8"))
        cls.units = {unit["name"]: unit for unit in data["units"]}
        cls.loaded = load_factions()["Adeptus Astartes"]["units"]

    def test_every_supplied_datasheet_is_present(self):
        supplied_names = set()
        for directory in BATCH_DIRS:
            for path in directory.glob("*.json"):
                supplied_names.add(json.loads(path.read_text(encoding="utf-8"))["name"])
        self.assertTrue(supplied_names.issubset(self.units))
        self.assertEqual(len(supplied_names), 55)

    def test_new_units_and_renamed_eradicator_load(self):
        for name in ("Invader ATVs", "Captain on Bike", "Eradicator Squad with Heavy Bolters"):
            with self.subTest(unit=name):
                self.assertIn(name, self.loaded)
        self.assertNotIn("Eradicator Squad with Heavy Bolter", self.loaded)

    def test_normalized_batch_profiles_replace_old_values(self):
        astraeus = self.units["Astraeus"]
        self.assertEqual(astraeus["stats"]["toughness"], 12)
        self.assertEqual(astraeus["stats"]["invulnerable_save"], "5+")
        self.assertEqual(len(astraeus["weapons"]), 9)

        atvs = self.units["Invader ATVs"]
        self.assertEqual(atvs["stats"]["wounds"], 8)
        self.assertEqual(len(atvs["weapons"]), 5)

    def test_character_batch_is_normalized_without_losing_melee_profiles(self):
        captain = self.units["Captain"]
        self.assertEqual(captain["stats"]["toughness"], 5)
        self.assertEqual(captain["points"], [90])
        self.assertIn("Strategic Acumen", {ability["name"] for ability in captain["abilities"]})
        self.assertIn("Master-crafted power weapon", {weapon["name"] for weapon in captain["weapons"]})

        ancient = self.units["Ancient"]
        self.assertEqual(ancient["stats"]["objective_control"], 2)
        self.assertEqual(ancient["support"]["can_support"], [
            "Assault Intercessor Squad", "Desolation Squad", "Hellblaster Squad",
            "Infernus Squad", "Intercessor Squad", "Sternguard Veteran Squad",
        ])

    def test_final_vehicle_batch_profiles_and_points(self):
        expected_points = {
            "Gladiator Lancer": (160, 180), "Gladiator Reaper": (165, 185),
            "Gladiator Valiant": (165, 185), "Storm Speeder Hailstrike": (110, 120),
            "Storm Speeder Hammerstrike": (140, 150), "Storm Speeder Thunderstrike": (140, 150),
            "Ballistus Dreadnought": (150, 170), "Brutalis Dreadnought": (160, 180),
            "Invictor Tactical Warsuit": (135, 150), "Redemptor Dreadnought": (170, 190),
        }
        for name, points in expected_points.items():
            with self.subTest(unit=name):
                self.assertEqual(tuple(entry["points"] for entry in self.units[name]["points"]), points)

        self.assertEqual(self.units["Land Speeder"]["points"], [105])
        self.assertEqual(self.units["Brutalis Dreadnought"]["stats"]["movement"], 10)
        self.assertEqual(self.units["Invictor Tactical Warsuit"]["stats"]["toughness"], 9)

        lancer_weapons = {weapon["name"]: weapon for weapon in self.units["Gladiator Lancer"]["weapons"]}
        self.assertEqual(lancer_weapons["Lancer laser destroyer"]["armor_piercing"], "-3")
        self.assertEqual(lancer_weapons["Defensive array"]["attacks"], "6")

        ballistus_weapons = {weapon["name"]: weapon for weapon in self.units["Ballistus Dreadnought"]["weapons"]}
        self.assertEqual(ballistus_weapons["Ballistus missile launcher - frag"]["attacks"], "D6+6")
        self.assertEqual(ballistus_weapons["Ballistus lascannon"]["damage"], "D3+3")

        redemptor_weapons = {weapon["name"]: weapon for weapon in self.units["Redemptor Dreadnought"]["weapons"]}
        self.assertEqual(redemptor_weapons["Macro plasma incinerator - supercharge"]["attacks"], "D3+3")
        self.assertEqual(redemptor_weapons["Redemptor fist"]["damage"], "D3+3")
        self.assertEqual(self.units["Redemptor Dreadnought"]["wargear_points"], {"Macro plasma incinerator": 10})


if __name__ == "__main__":
    unittest.main()
