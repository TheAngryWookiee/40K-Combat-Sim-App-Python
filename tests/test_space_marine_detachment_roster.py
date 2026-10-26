import json
import unittest
from pathlib import Path

from data_loader import load_factions


EXPECTED = {
    "Adeptus Astartes": [
        "Phobos Shadow Force", "Gravis Siege Force", "Stormlance Task Force", "Ironstorm Spearhead",
    ],
    "Black Templars": ["Marshal's Household"],
    "Blood Angels": ["Angelic Inheritors", "Encarmine Speartip", "Wrath of the Doomed"],
    "Dark Angels": ["Darkflight Pursuit", "Inner Circle Task Force", "Wrath of the Rock"],
    "Deathwatch": ["Black Spear Task Force"],
    "Imperial Fists": ["Ceramite Sentinels"],
    "Raven Guard": ["Shadowmark Talon"],
    "Salamanders": ["Forgefather's Seekers"],
    "Ultramarines": ["Blade of Ultramar"],
    "White Scars": ["Spearpoint Task Force"],
    "Space Wolves": ["Champions of Fenris", "Saga of the Beastslayer", "Saga of the Great Wolf"],
}


class SpaceMarineDetachmentRosterTests(unittest.TestCase):
    def test_loaded_factions_expose_only_current_detachments(self):
        factions = load_factions()
        for faction_name, expected_names in EXPECTED.items():
            with self.subTest(faction=faction_name):
                self.assertEqual(
                    [detachment["name"] for detachment in factions[faction_name]["detachments"]],
                    expected_names,
                )

    def test_space_wolves_detachment_payloads(self):
        data = json.loads(Path("Space_Wolves.json").read_text(encoding="utf-8"))
        faction = data["faction"]
        detachments = {entry["name"]: entry for entry in faction["detachments"]}

        self.assertEqual([rule["name"] for rule in faction["army_rules"]], ["Curse of the Wulfen"])
        self.assertIn("not Battle-shocked", faction["army_rules"][0]["rules_text"])
        self.assertIn("space of 2 models", faction["army_rules"][0]["rules_text"])

        expected = {
            "Champions of Fenris": ("The Great Wolf Watches", 1, 2, 3),
            "Saga of the Beastslayer": ("Legendary Slayers", 1, 2, 3),
            "Saga of the Great Wolf": ("Master of Wolves", 2, 4, 6),
        }
        for name, (rule_name, points, enhancement_count, stratagem_count) in expected.items():
            with self.subTest(detachment=name):
                self.assertEqual(detachments[name]["rule"]["name"], rule_name)
                self.assertEqual(detachments[name]["detachment_points"], points)
                self.assertEqual(len(detachments[name]["enhancements"]), enhancement_count)
                self.assertEqual(len(detachments[name]["stratagems"]), stratagem_count)

        self.assertEqual(detachments["Champions of Fenris"]["restrictions"], ["Unique: TERMINATOR"])

        great_wolf = detachments["Saga of the Great Wolf"]
        self.assertEqual(
            [entry["name"] for entry in great_wolf["additional_rules"]],
            ["Howling Onslaught"],
        )
        self.assertEqual(
            [(entry["name"], entry["points"]) for entry in great_wolf["enhancements"]],
            [
                ("Howlmaw", 15),
                ("Grimnar's Mark", 15),
                ("Chariots of the Storm", 25),
                ("Skjald's Foretelling", 20),
            ],
        )

    def test_base_space_marine_detachments_have_complete_payloads(self):
        data = json.loads(Path("Adeptus_Astartes.json").read_text(encoding="utf-8"))
        expected_rules = {
            "Phobos Shadow Force": "Shadow Masters",
            "Gravis Siege Force": "Indomitable Defence",
            "Stormlance Task Force": "Lightning-fast Strike",
            "Ironstorm Spearhead": "Ironstorm Auto-targeters",
        }

        for detachment in data["faction"]["detachments"]:
            with self.subTest(detachment=detachment["name"]):
                self.assertEqual(detachment["rule"]["name"], expected_rules[detachment["name"]])
                self.assertEqual(len(detachment["enhancements"]), 2)
                self.assertEqual(len(detachment["stratagems"]), 3)
                self.assertFalse(detachment["rule"]["implemented"])

    def test_marshals_household_payload(self):
        data = json.loads(Path("Black_Templars.json").read_text(encoding="utf-8"))
        detachment = data["faction"]["detachments"][0]

        self.assertEqual(detachment["name"], "Marshal's Household")
        self.assertEqual(detachment["rule"]["name"], "Faith-fuelled Resolve")
        self.assertIn("+1 A", detachment["rule"]["rules_text"])
        self.assertEqual(
            [(entry["name"], entry["points"]) for entry in detachment["enhancements"]],
            [("Fervent Exemplars", 10), ("Inheritors of Sigismund", 15)],
        )
        self.assertEqual(
            [entry["name"] for entry in detachment["stratagems"]],
            ["Slayers of Abominations", "Unsparing Execution", "Blade of Detestation"],
        )
        implemented = {entry["name"] for entry in detachment["stratagems"] if entry["implemented"]}
        self.assertEqual(implemented, {"Slayers of Abominations"})

    def test_blood_angels_detachment_payloads(self):
        data = json.loads(Path("Blood_Angels.json").read_text(encoding="utf-8"))
        detachments = {entry["name"]: entry for entry in data["faction"]["detachments"]}

        self.assertEqual(detachments["Angelic Inheritors"]["detachment_points"], 3)
        self.assertEqual(detachments["Angelic Inheritors"]["rule"]["name"], "Legacy of the Angel")
        self.assertEqual(len(detachments["Angelic Inheritors"]["enhancements"]), 4)
        self.assertEqual(len(detachments["Angelic Inheritors"]["stratagems"]), 6)

        self.assertEqual(detachments["Encarmine Speartip"]["detachment_points"], 1)
        self.assertIn("tactical doctrine", detachments["Encarmine Speartip"]["rule"]["rules_text"].lower())
        self.assertEqual(len(detachments["Encarmine Speartip"]["enhancements"]), 2)
        self.assertEqual(len(detachments["Encarmine Speartip"]["stratagems"]), 3)

        self.assertEqual(detachments["Wrath of the Doomed"]["rule"]["name"], "Sanguinius' Fury")
        self.assertIn("assault doctrine", detachments["Wrath of the Doomed"]["rule"]["rules_text"].lower())
        self.assertEqual(len(detachments["Wrath of the Doomed"]["enhancements"]), 2)
        self.assertEqual(len(detachments["Wrath of the Doomed"]["stratagems"]), 3)

        for detachment in detachments.values():
            self.assertEqual(
                detachment["rule"]["implemented"],
                detachment["name"] == "Angelic Inheritors",
            )

    def test_dark_angels_detachment_payloads(self):
        data = json.loads(Path("Dark_Angels.json").read_text(encoding="utf-8"))
        detachments = {entry["name"]: entry for entry in data["faction"]["detachments"]}

        expected = {
            "Darkflight Pursuit": (1, "Black-winged Vigilance", 2, 3),
            "Inner Circle Task Force": (1, "Vowed Target", 2, 3),
            "Wrath of the Rock": (2, "Dutiful Tenacity", 4, 6),
        }
        for name, (points, rule_name, enhancements, stratagems) in expected.items():
            with self.subTest(detachment=name):
                detachment = detachments[name]
                self.assertEqual(detachment["detachment_points"], points)
                self.assertEqual(detachment["rule"]["name"], rule_name)
                self.assertEqual(len(detachment["enhancements"]), enhancements)
                self.assertEqual(len(detachment["stratagems"]), stratagems)
                self.assertEqual(len(detachment["restrictions"]), 1)

        self.assertEqual(detachments["Wrath of the Rock"]["unique"], "Terminator")
        self.assertIn(
            "SUSTAINED HITS 1",
            detachments["Inner Circle Task Force"]["enhancements"][1]["rules_text"],
        )


if __name__ == "__main__":
    unittest.main()
