import json
import unittest
from pathlib import Path

from data_loader import load_factions


class NecronsDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.faction = load_factions()["Necrons"]
        cls.raw_units = {
            unit["name"]: unit
            for unit in json.loads(Path("Necrons.json").read_text(encoding="utf-8"))["units"]
        }

    def test_faction_is_available_as_xenos(self):
        self.assertEqual(self.faction["category"], "Xenos")
        self.assertEqual(len(self.faction["units"]), 52)
        self.assertEqual(len(self.faction["detachments"]), 12)

    def test_first_character_batch_is_available(self):
        self.assertTrue(
            {
                "C'tan Shard of the Deceiver",
                "C'tan Shard of the Nightbringer",
                "C'tan Shard of the Void Dragon",
                "Illuminor Szeras",
                "Imotekh the Stormlord",
                "Nekrosor Ammentar",
                "Orikan the Diviner",
                "The Silent King",
                "Trazyn the Infinite",
            }.issubset(self.faction["units"]),
        )

    def test_second_character_batch_is_available(self):
        expected = {
            "Catacomb Command Barge", "Chronomancer", "Geomancer",
            "Hexmark Destroyer", "Lokhust Lord", "Overlord",
            "Overlord with Translocation Shroud", "Plasmancer", "Psychomancer",
            "Royal Warden", "Skorpekh Lord", "Technomancer", "Transcendent C'tan",
        }
        self.assertTrue(expected.issubset(self.faction["units"]))

    def test_second_batch_costs_and_relationships_are_preserved(self):
        units = self.faction["units"]
        self.assertEqual(
            self.raw_units["Chronomancer"]["points"],
            {"1 model - 1st unit": 70, "1 model - 2nd+ unit": 80},
        )
        self.assertEqual(
            units["Overlord"]["leader"]["can_lead"],
            ["Immortals", "Lychguard", "Necron Warriors"],
        )
        self.assertEqual(
            units["Technomancer"]["support"]["can_support"],
            ["Canoptek Wraiths", "Immortals", "Necron Warriors"],
        )

    def test_second_batch_weapons_and_keyword_casing_are_normalized(self):
        units = self.faction["units"]
        chronomancer = units["Chronomancer"]
        self.assertIn("Aeonstave - ranged", chronomancer["weapons"])
        self.assertIn("Aeonstave - melee", chronomancer["weapons"])
        self.assertIn("Character", chronomancer["display_keywords"])
        self.assertNotIn("CHARACTER", chronomancer["display_keywords"])

        barge = units["Catacomb Command Barge"]
        self.assertIn("Tesla cannon", barge["weapons"])
        self.assertTrue(any("gauss cannon can be replaced" in option for option in barge["wargear_options"]))

    def test_third_unit_batch_is_available(self):
        expected = {
            "Canoptek Macrocytes", "Canoptek Tomb Crawlers", "Canoptek Wraiths",
            "Cryptothralls", "Deathmarks", "Doom Scythe", "Flayed Ones",
            "Ghost Ark", "Immortals", "Lychguard", "Necron Warriors",
            "Ophydian Destroyers", "Skorpekh Destroyers", "Triarch Praetorians",
        }
        self.assertTrue(expected.issubset(self.faction["units"]))

    def test_third_batch_squad_sizes_and_transport_are_preserved(self):
        units = self.faction["units"]
        self.assertEqual(units["Canoptek Wraiths"]["unit_composition"]["min_models"], 3)
        self.assertEqual(units["Canoptek Wraiths"]["unit_composition"]["max_models"], 6)
        self.assertEqual(units["Necron Warriors"]["models"], 10)
        self.assertIn("10 NECRON WARRIORS", units["Ghost Ark"]["transport"])

    def test_third_batch_weapon_profiles_and_points_are_preserved(self):
        units = self.faction["units"]
        praetorians = units["Triarch Praetorians"]
        self.assertIn("Rod of covenant - ranged", praetorians["weapons"])
        self.assertIn("Rod of covenant - melee", praetorians["weapons"])
        self.assertIn("Fly", units["Doom Scythe"]["display_keywords"])

        self.assertEqual(
            self.raw_units["Deathmarks"]["points"],
            {
                "5 models - 1st to 2nd units": 60,
                "10 models - 1st to 2nd units": 120,
                "5 models - 3rd+ units": 70,
                "10 models - 3rd+ units": 130,
            },
        )

    def test_final_unit_batch_is_available(self):
        expected = {
            "Annihilation Barge", "Canoptek Doomstalker", "Canoptek Reanimator",
            "Canoptek Scarab Swarms", "Canoptek Spyders", "Convergence of Dominion",
            "Doomsday Ark", "Lokhust Destroyers", "Lokhust Heavy Destroyers",
            "Monolith", "Night Scythe", "Obelisk", "Seraptek Heavy Construct",
            "Tesseract Vault", "Tomb Blades", "Triarch Stalker",
        }
        self.assertTrue(expected.issubset(self.faction["units"]))

    def test_final_batch_sizes_transports_and_profiles_are_preserved(self):
        units = self.faction["units"]
        self.assertEqual(units["Lokhust Destroyers"]["unit_composition"]["max_models"], 6)
        self.assertEqual(units["Convergence of Dominion"]["unit_composition"]["max_models"], 3)
        self.assertIn("1 NECRONS INFANTRY unit", units["Night Scythe"]["transport"])
        self.assertIn("Heat ray - dispersed", units["Triarch Stalker"]["weapons"])
        self.assertIn("Heat ray - focused", units["Triarch Stalker"]["weapons"])

    def test_character_profiles_and_weapons_are_normalized(self):
        units = self.faction["units"]
        deceiver = units["C'tan Shard of the Deceiver"]
        self.assertEqual((deceiver["toughness"], deceiver["wounds"]), (11, 16))
        self.assertEqual(deceiver["invulnerable_save"], 4)
        self.assertIn("Anti-Character 4+", deceiver["weapons"]["Cosmic insanity"]["raw_keywords"])

        imotekh = units["Imotekh the Stormlord"]
        self.assertIn("Staff of the Destroyer - ranged", imotekh["weapons"])
        self.assertIn("Staff of the Destroyer - melee", imotekh["weapons"])
        self.assertEqual(imotekh["leader"]["can_lead"], ["Lychguard", "Necron Warriors", "Immortals"])

    def test_support_and_mixed_model_compositions_are_preserved(self):
        units = self.faction["units"]
        self.assertTrue(units["Orikan the Diviner"]["support"]["can_support"])

        silent_king = units["The Silent King"]
        self.assertEqual(silent_king["models"], 3)
        self.assertEqual(silent_king["unit_composition"]["min_models"], 3)
        self.assertEqual(silent_king["unit_composition"]["max_models"], 3)
        self.assertIn("Annihilator beam", silent_king["weapons"])

    def test_reanimation_protocols_are_preserved(self):
        rule = self.faction["army_rules"][0]
        self.assertEqual(rule["name"], "Reanimation Protocols")
        self.assertFalse(rule["implemented"])
        self.assertIn("end of your Command phase", rule["rules_text"])
        self.assertIn("heals D3 wounds", rule["rules_text"])
        self.assertIn("Starting Strength", rule["rules_text"])

    def test_initial_detachments_are_preserved(self):
        detachments = self.faction["detachments"]
        self.assertEqual(
            [detachment["name"] for detachment in detachments[:4]],
            [
                "Awakened Dynasty", "Annihilation Legion",
                "Canoptek Court", "Obeisance Phalanx",
            ],
        )
        self.assertTrue(all(len(detachment["enhancements"]) == 4 for detachment in detachments[:9]))
        self.assertTrue(all(len(detachment["stratagems"]) == 6 for detachment in detachments[:9]))

    def test_representative_detachment_rules_are_preserved(self):
        detachments = {detachment["name"]: detachment for detachment in self.faction["detachments"]}
        awakened = detachments["Awakened Dynasty"]
        self.assertEqual(awakened["unique"], "DYNASTY")
        self.assertEqual(awakened["rule"]["name"], "Command Protocols")
        self.assertEqual(awakened["enhancements"][0]["points"], 20)
        self.assertIn("D3+1 wounds", awakened["stratagems"][1]["effect"])

        annihilation = detachments["Annihilation Legion"]
        self.assertIn("Below Half-strength", annihilation["rule"]["rules_text"])
        self.assertEqual(annihilation["stratagems"][0]["name"], "Masks of Death")

        canoptek = detachments["Canoptek Court"]
        self.assertIn("Power Matrix", canoptek["rule"]["rules_text"])
        self.assertEqual(canoptek["stratagems"][1]["cp_cost"], 2)

        phalanx = detachments["Obeisance Phalanx"]
        self.assertEqual(phalanx["rule"]["name"], "Worthy Foes")
        self.assertIn("ANTI-INFANTRY 5+", phalanx["enhancements"][1]["rules_text"])
        self.assertEqual(phalanx["stratagems"][2]["name"], "Nanoassembly Protocols")

    def test_second_detachment_batch_is_preserved(self):
        detachments = {detachment["name"]: detachment for detachment in self.faction["detachments"]}
        self.assertTrue({
            "Hypercrypt Legion", "Starshatter Arsenal", "Cryptek Conclave",
            "Cursed Legion", "Pantheon of Woe",
        }.issubset(detachments))

        hypercrypt = detachments["Hypercrypt Legion"]
        self.assertIn("Strategic Reserves", hypercrypt["rule"]["rules_text"])
        self.assertEqual(hypercrypt["stratagems"][1]["name"], "Quantum Deflection")

        starshatter = detachments["Starshatter Arsenal"]
        self.assertIn("[ASSAULT]", starshatter["rule"]["rules_text"])
        self.assertEqual(starshatter["enhancements"][0]["points"], 30)

        conclave = detachments["Cryptek Conclave"]
        self.assertIn("[ANTI-INFANTRY 3+]", conclave["rule"]["rules_text"])
        self.assertEqual(conclave["stratagems"][0]["name"], "Molecular Targeting")

        cursed = detachments["Cursed Legion"]
        self.assertIn("Add 2 to the Strength", cursed["rule"]["rules_text"])
        self.assertEqual(cursed["stratagems"][0]["name"], "Methodical Murder")

        pantheon = detachments["Pantheon of Woe"]
        self.assertEqual(pantheon["additional_rules"][0]["name"], "Restrictions")
        self.assertIn("unravelling", pantheon["rule"]["rules_text"])
        self.assertEqual(pantheon["enhancements"][0]["points"], 45)

    def test_short_detachments_are_preserved(self):
        detachments = {detachment["name"]: detachment for detachment in self.faction["detachments"]}
        hand = detachments["Hand of the Dynasty"]
        self.assertIn("[ASSAULT]", hand["rule"]["rules_text"])
        self.assertEqual(hand["additional_rules"][0]["name"], "Unique: Dynasty")
        self.assertEqual(len(hand["enhancements"]), 2)
        self.assertEqual(len(hand["stratagems"]), 3)

        skyshroud = detachments["Skyshroud Spearhead"]
        self.assertIn("Deep Strike", skyshroud["rule"]["rules_text"])
        self.assertEqual(skyshroud["enhancements"][0]["points"], 5)
        self.assertEqual(skyshroud["stratagems"][2]["name"], "Evasive Protocols")

        armoury = detachments["The Phaeron's Armoury"]
        self.assertEqual(armoury["additional_rules"][0]["name"], "Unique: Hypercrypt")
        self.assertIn("[LETHAL HITS]", armoury["enhancements"][0]["rules_text"])
        self.assertIn("[SUSTAINED HITS 1]", armoury["enhancements"][0]["rules_text"])
        self.assertEqual(armoury["stratagems"][2]["name"], "Cosmic Storm")


if __name__ == "__main__":
    unittest.main()
