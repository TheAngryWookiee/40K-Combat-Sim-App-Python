import unittest

from data_loader import load_factions


class TyranidUnitImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Tyranids"]["units"]

    def test_lictor_datasheet(self):
        lictor = self.units["Lictor"]
        self.assertEqual(lictor["base_size"], "50mm")
        self.assertEqual(lictor["toughness"], 6)
        self.assertEqual(lictor["wounds"], 6)
        weapon = lictor["weapons"]["Lictor claws and talons"]
        self.assertEqual(weapon["attacks"], 6)
        self.assertEqual(weapon["skill"], 2)
        self.assertIn("PRECISION", weapon["keywords"])
        self.assertIn("Pheromone Trail", [ability["name"] for ability in lictor["abilities"]])

    def test_red_terror_datasheet(self):
        red_terror = self.units["The Red Terror"]
        self.assertEqual(red_terror["base_size"], "100mm")
        self.assertEqual(red_terror["toughness"], 8)
        self.assertEqual(red_terror["wounds"], 9)
        self.assertIn("epic hero", red_terror["keywords"])
        maw = red_terror["weapons"]["Gaping maw"]
        self.assertEqual(maw["damage"], "d3+2")
        self.assertIn("EXTRA ATTACKS", maw["keywords"])
        self.assertIn("DW", maw["keywords"])
        self.assertIn("PRECISION", maw["keywords"])


if __name__ == "__main__":
    unittest.main()
