import unittest

from data_loader import apply_unit_loadout, load_factions


class DrukhariUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Drukhari"]["units"]

    def test_all_supplied_units_are_available(self):
        self.assertEqual(len(self.units), 36)
        self.assertTrue(
            {
                "Archon", "Death Jester", "Drazhar", "Haemonculus", "Kharseth",
                "Lady Malys", "Lelith Hesperax", "Prince Yriel", "Shadowseer",
                "Solitaire", "Succubus", "Troupe Master", "Corsair Skyreavers",
                "Corsair Voidreavers", "Corsair Voidscarred", "Hand of the Archon",
                "Incubi", "Kabalite Warriors", "Mandrakes", "Raider",
                "Razorwing Jetfighter", "Scourges with Heavy Weapons", "Starweaver",
                "Troupe", "Venom", "Voidraven Bomber", "Wracks", "Wyches",
                "Cronos", "Hellions", "Ravager", "Reavers", "Skyweavers",
                "Starfangs", "Talos", "Voidweaver",
            }.issubset(self.units),
        )

    def test_compact_weapon_profiles_are_normalized(self):
        archon = apply_unit_loadout(self.units["Archon"])
        self.assertEqual(archon["weapons"]["Blast pistol"]["range"], '6"')
        self.assertEqual(archon["weapons"]["Huskblade"]["damage"], 3)
        self.assertIn("DW", archon["weapons"]["Huskblade"]["keywords"])

    def test_restriction_keywords_and_leader_targets_are_preserved(self):
        self.assertIn("epic hero", self.units["Lelith Hesperax"]["keywords"])
        self.assertIn("wych cult", self.units["Succubus"]["keywords"])
        self.assertIn("psyker", self.units["Shadowseer"]["keywords"])
        self.assertEqual(self.units["Haemonculus"]["leader"]["can_lead"], ["Wracks"])

    def test_squad_sizes_and_unit_classes_are_normalized(self):
        self.assertEqual(self.units["Corsair Skyreavers"]["models"], 5)
        self.assertEqual(self.units["Troupe"]["unit_composition"]["max_models"], 12)
        self.assertIn("vehicle", self.units["Raider"]["keywords"])
        self.assertIn("dedicated transport", self.units["Venom"]["keywords"])
        self.assertIn("aircraft", self.units["Voidraven Bomber"]["keywords"])
        self.assertIn("kabal", self.units["Kabalite Warriors"]["keywords"])
        self.assertIn("wych cult", self.units["Wyches"]["keywords"])
        self.assertIn("haemonculus covens", self.units["Wracks"]["keywords"])

    def test_final_batch_mounted_monster_and_vehicle_keywords(self):
        self.assertIn("monster", self.units["Cronos"]["keywords"])
        self.assertIn("haemonculus covens", self.units["Talos"]["keywords"])
        self.assertIn("mounted", self.units["Hellions"]["keywords"])
        self.assertIn("wych cult", self.units["Reavers"]["keywords"])
        self.assertIn("mounted", self.units["Skyweavers"]["keywords"])
        self.assertIn("vehicle", self.units["Ravager"]["keywords"])
        self.assertIn("anhrathe", self.units["Starfangs"]["keywords"])
        self.assertEqual(self.units["Cronos"]["base_size"], "60mm flying base")


if __name__ == "__main__":
    unittest.main()
