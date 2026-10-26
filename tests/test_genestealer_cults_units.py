import unittest

from data_loader import apply_unit_loadout, load_factions


class GenestealerCultsUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Genestealer Cults"]["units"]

    def test_all_supplied_units_are_available(self):
        self.assertEqual(
            {
                name
                for name, unit in self.units.items()
                if not unit.get("is_ally")
            },
            {
                "Abominant", "Acolyte Iconward", "Benefictus", "Biophagus",
                "Clamavus", "Kelermorph", "Locus", "Magus", "Nexos",
                "Patriarch", "Primus", "Reductus Saboteur", "Sanctus",
                "Aberrants", "Achilles Ridgerunners",
                "Acolyte Hybrids with Autopistols",
                "Acolyte Hybrids with Hand Flamers", "Atalan Jackals",
                "Goliath Rockgrinder", "Goliath Truck", "Hybrid Metamorphs",
                "Jackal Alphus", "Neophyte Hybrids",
                "Purestrain Genestealers",
            },
        )

    def test_configured_allies_are_available_and_identified(self):
        allies = [unit for unit in self.units.values() if unit.get("is_ally")]
        self.assertEqual(len(allies), 65)
        self.assertEqual(
            sum(unit["ally_faction_name"] == "Astra Militarum" for unit in allies),
            52,
        )
        self.assertEqual(
            sum(unit["ally_faction_name"] == "Tyranids" for unit in allies),
            13,
        )
        self.assertTrue(self.units["Leman Russ Commander"]["is_ally"])
        self.assertEqual(
            self.units["Winged Hive Tyrant"]["ally_faction_name"],
            "Tyranids",
        )
        self.assertTrue(self.units["Lictor"]["is_ally"])
        self.assertTrue(self.units["The Red Terror"]["is_ally"])

    def test_weapon_profiles_and_bases_normalize(self):
        reductus = apply_unit_loadout(self.units["Reductus Saboteur"])
        self.assertIn("Remote explosives", reductus["weapons"])
        self.assertEqual(self.units["Abominant"]["base_size"], "40mm")
        self.assertEqual(self.units["Patriarch"]["base_size"], "50mm")

    def test_leader_and_support_targets_normalize(self):
        self.assertEqual(self.units["Abominant"]["leader"]["can_lead"], ["Aberrants"])
        self.assertIn("Neophyte Hybrids", self.units["Primus"]["leader"]["can_lead"])
        self.assertIn("Aberrants", self.units["Biophagus"]["support"]["can_support"])
        self.assertIn("Hybrid Metamorphs", self.units["Locus"]["support"]["can_support"])
        self.assertEqual(
            self.units["Jackal Alphus"]["leader"]["can_lead"],
            ["Atalan Jackals"],
        )

    def test_batch_unit_sizes_and_nested_weapons_normalize(self):
        self.assertEqual(self.units["Aberrants"]["models"], 5)
        self.assertEqual(self.units["Atalan Jackals"]["models"], 5)
        self.assertEqual(self.units["Neophyte Hybrids"]["models"], 10)
        self.assertEqual(self.units["Purestrain Genestealers"]["models"], 5)

        ridgerunner = self.units["Achilles Ridgerunners"]
        self.assertIn("Heavy mining laser", ridgerunner["weapons"])
        self.assertIn("Armoured hull", ridgerunner["weapons"])
        self.assertEqual(ridgerunner["base_size"], "120x92mm")

        jackals = self.units["Atalan Jackals"]
        self.assertEqual(jackals["weapons"]["Atalan incinerator"]["skill"], 0)
        self.assertIn("TORRENT", jackals["weapons"]["Atalan incinerator"]["keywords"])


if __name__ == "__main__":
    unittest.main()
