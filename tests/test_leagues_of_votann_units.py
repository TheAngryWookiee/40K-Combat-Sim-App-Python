import unittest

from data_loader import apply_unit_loadout, load_factions


class LeaguesOfVotannUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Leagues of Votann"]["units"]

    def test_first_batch_is_available(self):
        self.assertEqual(len(self.units), 22)
        self.assertTrue({
            "Arkanyst Evaluator", "Berek Stornbröw", "Brôkhyr Iron-master",
            "Buri Aegnirssen", "Einhyr Champion", "Grimnyr",
            "Hearthkyn Warriors", "Kâhl", "Kapricus Carrier",
            "Memnyr Strategist", "Sagitaur", "Ûthar the Destined",
        }.issubset(self.units))

    def test_final_batch_is_available(self):
        self.assertTrue({
            "Brôkhyr Thunderkyn", "Cthonian Beserks", "Cthonian Earthshakers",
            "Einhyr Hearthguard", "Hekaton Land Fortress", "Hernkyn Pioneers",
            "Hernkyn Yaegirs",
            "Ironkin Steeljacks with Heavy Volkanite Disintegrators",
            "Ironkin Steeljacks with Melee Weapons", "Kapricus Defenders",
        }.issubset(self.units))

    def test_character_keywords_and_leader_targets_are_preserved(self):
        self.assertIn("epic hero", self.units["Berek Stornbröw"]["keywords"])
        self.assertIn("kâhl", self.units["Kâhl"]["keywords"])
        self.assertEqual(
            self.units["Ûthar the Destined"]["leader"]["can_lead"],
            ["Einhyr Hearthguard", "Hearthkyn Warriors"],
        )
        self.assertEqual(
            self.units["Memnyr Strategist"]["leader"]["can_lead"],
            [
                "Ironkin Steeljacks with Heavy Volkanite Disintegrators",
                "Ironkin Steeljacks with Melee Weapons",
            ],
        )

    def test_mixed_model_units_and_squad_sizes_are_preserved(self):
        iron_master = apply_unit_loadout(self.units["Brôkhyr Iron-master"])
        grimnyr = apply_unit_loadout(self.units["Grimnyr"])
        self.assertEqual(iron_master["models"], 5)
        self.assertEqual(iron_master["model_counts_by_name"]["E-COGs"], 3)
        self.assertEqual(len(iron_master["target_profiles"]), 3)
        self.assertEqual(grimnyr["models"], 3)
        self.assertEqual(self.units["Hearthkyn Warriors"]["models"], 10)

    def test_weapon_profiles_are_normalized(self):
        evaluator = apply_unit_loadout(self.units["Arkanyst Evaluator"])
        warriors = apply_unit_loadout(self.units["Hearthkyn Warriors"])
        sagitaur = apply_unit_loadout(self.units["Sagitaur"])
        self.assertEqual(evaluator["weapons"]["Transmatter inverter – overcharge"]["damage"], 3)
        self.assertIn("Hazardous", evaluator["weapons"]["Transmatter inverter – overcharge"]["keywords"])
        self.assertEqual(warriors["weapons"]["Magna-rail rifle"]["damage"], "d3+3")
        self.assertIn("DW", warriors["weapons"]["Magna-rail rifle"]["keywords"])
        self.assertIn("Twin-linked", sagitaur["weapons"]["Twin bolt cannon"]["keywords"])

    def test_vehicle_and_transport_data_is_preserved(self):
        self.assertIn("vehicle", self.units["Sagitaur"]["keywords"])
        self.assertIn("dedicated transport", self.units["Sagitaur"]["keywords"])
        self.assertIn("Capacity 6", self.units["Sagitaur"].get("transport", ""))
        self.assertIn("vehicle", self.units["Kapricus Carrier"]["keywords"])
        self.assertIn("vehicle", self.units["Hekaton Land Fortress"]["keywords"])
        self.assertIn("14 Leagues of Votann Infantry", self.units["Hekaton Land Fortress"]["transport"])

    def test_final_batch_variable_unit_sizes(self):
        self.assertEqual(self.units["Brôkhyr Thunderkyn"]["unit_composition"]["min_models"], 3)
        self.assertEqual(self.units["Brôkhyr Thunderkyn"]["unit_composition"]["max_models"], 6)
        self.assertEqual(self.units["Einhyr Hearthguard"]["unit_composition"]["min_models"], 5)
        self.assertEqual(self.units["Einhyr Hearthguard"]["unit_composition"]["max_models"], 10)
        self.assertEqual(self.units["Kapricus Defenders"]["unit_composition"]["max_models"], 2)

        hearthguard = apply_unit_loadout(self.units["Einhyr Hearthguard"], requested_model_count=10)
        self.assertEqual(hearthguard["model_counts_by_name"]["Hesyr"], 1)
        self.assertEqual(hearthguard["model_counts_by_name"]["Hearthguard"], 9)

    def test_final_batch_weapon_profiles(self):
        thunderkyn = apply_unit_loadout(self.units["Brôkhyr Thunderkyn"])
        fortress = apply_unit_loadout(self.units["Hekaton Land Fortress"])
        steeljacks = apply_unit_loadout(self.units["Ironkin Steeljacks with Heavy Volkanite Disintegrators"])
        self.assertEqual(thunderkyn["weapons"]["Graviton blast cannon"]["anti_keyword"], "vehicle")
        self.assertEqual(thunderkyn["weapons"]["Graviton blast cannon"]["anti_value"], 2)
        self.assertEqual(fortress["weapons"]["Heavy magna-rail cannon"]["strength"], 18)
        self.assertIn("DW", fortress["weapons"]["Heavy magna-rail cannon"]["keywords"])
        self.assertIn("DW", steeljacks["weapons"]["Heavy volkanite disintegrator"]["keywords"])


if __name__ == "__main__":
    unittest.main()
