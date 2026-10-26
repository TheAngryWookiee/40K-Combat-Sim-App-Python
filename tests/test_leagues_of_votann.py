import unittest

from data_loader import load_factions


class LeaguesOfVotannDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.faction = load_factions()["Leagues of Votann"]

    def test_faction_is_available_as_xenos(self):
        self.assertEqual(self.faction["category"], "Xenos")
        self.assertEqual(len(self.faction["units"]), 22)

    def test_prioritised_efficiency_sections_are_preserved(self):
        rule = self.faction["army_rules"][0]
        self.assertEqual(rule["name"], "Prioritised Efficiency")
        self.assertEqual(
            [option["name"] for option in rule["options"]],
            ["Hostile Acquisition", "Fortify Takeover", "Yield Points"],
        )
        self.assertIn("7YP", rule["rules_text"])
        self.assertIn("Advance and Charge", rule["options"][0]["rules_text"])
        self.assertIn("subtract 1 from the Wound roll", rule["options"][1]["rules_text"])

    def test_detachments_are_available(self):
        detachments = self.faction["detachments"]
        self.assertEqual(
            [detachment["name"] for detachment in detachments],
            [
                "Needgård Oathband", "Persecution Prospect", "Dèlve Assault Shift",
                "Brandfast Oathband", "Hearthfyre Arsenal", "Hearthband",
                "Mercenary Oathband", "Armoured Trailblazers", "Farseekers",
                "Hearthguard Covenant",
            ],
        )
        self.assertTrue(all(len(detachment["enhancements"]) == 4 for detachment in detachments[:7]))
        self.assertTrue(all(len(detachment["stratagems"]) == 6 for detachment in detachments[:7]))
        self.assertTrue(all(len(detachment["enhancements"]) == 2 for detachment in detachments[7:]))
        self.assertTrue(all(len(detachment["stratagems"]) == 3 for detachment in detachments[7:]))

    def test_representative_detachment_rules_are_preserved(self):
        oathband, prospect, assault_shift = self.faction["detachments"][:3]
        self.assertEqual(oathband["rule"]["name"], "Martial Levee")
        self.assertEqual(oathband["enhancements"][0]["points"], 30)
        self.assertEqual(oathband["stratagems"][0]["name"], "Void Hardened")
        self.assertIn("assailed", prospect["rule"]["rules_text"])
        self.assertEqual(prospect["stratagems"][5]["name"], "Dispersed Formation")
        self.assertEqual(assault_shift["rule"]["name"], "Fury from the Dèlve")
        self.assertIn("Deep Strike", assault_shift["rule"]["rules_text"])

    def test_additional_detachment_payloads_are_preserved(self):
        detachments = {
            detachment["name"]: detachment
            for detachment in self.faction["detachments"]
        }
        brandfast = detachments["Brandfast Oathband"]
        self.assertEqual(brandfast["rule"]["name"], "Mobile Sensor Relays")
        self.assertIn("SUSTAINED HITS 1", brandfast["rule"]["rules_text"])
        self.assertIn("Forgewrought Expertise", brandfast["enhancements"][3]["rules_text"])

        arsenal = detachments["Hearthfyre Arsenal"]
        self.assertEqual(arsenal["enhancements"][2]["name"], "Mantle of Elders")
        self.assertEqual(arsenal["stratagems"][3]["name"], "Wall of Steel")

        hearthband = detachments["Hearthband"]
        self.assertEqual(hearthband["unique"], "HEARTHBAND")
        self.assertEqual(hearthband["stratagems"][4]["restrictions"], [
            "Until the end of the turn, your unit is not eligible to declare a charge."
        ])

        mercenary = detachments["Mercenary Oathband"]
        self.assertEqual(
            mercenary["enhancements"][2]["name"],
            "Etacarn SB9 Targeting Implant",
        )
        self.assertIn("Hostile Acquisition", mercenary["rule"]["rules_text"])

    def test_final_short_detachments_are_preserved(self):
        detachments = {
            detachment["name"]: detachment
            for detachment in self.faction["detachments"]
        }
        trailblazers = detachments["Armoured Trailblazers"]
        self.assertEqual(trailblazers["rule"]["name"], "Sagitaur Spearhead")
        self.assertEqual(trailblazers["stratagems"][0]["name"], "Coordinated Crossfire")

        farseekers = detachments["Farseekers"]
        self.assertEqual(farseekers["rule"]["name"], "Eye of the Hunt")
        self.assertEqual(farseekers["enhancements"][1]["name"], "Shroudwerke Talismans")
        self.assertIn("Yaegirs", farseekers["enhancements"][1]["rules_text"])

        covenant = detachments["Hearthguard Covenant"]
        self.assertEqual(covenant["unique"], "HEARTHBAND")
        self.assertEqual(covenant["rule"]["name"], "Avatars of the Ancestors")
        self.assertEqual(covenant["stratagems"][0]["name"], "Brêkkeknots")
        self.assertEqual(
            [
                detachment["name"]
                for detachment in self.faction["detachments"]
                if detachment.get("unique") == "HEARTHBAND"
            ],
            ["Hearthband", "Hearthguard Covenant"],
        )


if __name__ == "__main__":
    unittest.main()
