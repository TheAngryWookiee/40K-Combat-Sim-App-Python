import unittest

from data_loader import apply_unit_loadout, load_factions


class GenestealerCultsUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Genestealer Cults"]["units"]

    def test_all_character_units_are_available(self):
        self.assertEqual(
            set(self.units),
            {
                "Abominant", "Acolyte Iconward", "Benefictus", "Biophagus",
                "Clamavus", "Kelermorph", "Locus", "Magus", "Nexos",
                "Patriarch", "Primus", "Reductus Saboteur", "Sanctus",
            },
        )

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


if __name__ == "__main__":
    unittest.main()
