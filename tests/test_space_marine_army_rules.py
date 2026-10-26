import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


ROOT = Path(__file__).resolve().parents[1]


def unit(abilities):
    return {
        "name": "Intercessor Squad",
        "keywords": ["infantry"],
        "models": 1,
        "toughness": 4,
        "wounds": 2,
        "armor_save": 3,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": abilities,
        "weapons": {},
    }


def weapon(ranged=True):
    return {
        "name": "Bolt rifle" if ranged else "Close combat weapon",
        "range": '24"' if ranged else "Melee",
        "attacks": 2,
        "skill": 3,
        "strength": 4,
        "ap": -1 if ranged else 0,
        "damage": 1,
        "keywords": [],
        "raw_keywords": [],
    }


class SpaceMarineArmyRuleTests(unittest.TestCase):
    def test_faction_exposes_new_army_rule_package(self):
        data = json.loads((ROOT / "Adeptus_Astartes.json").read_text(encoding="utf-8"))
        rules = {rule["name"]: rule for rule in data["faction"]["army_rules"]}

        self.assertNotIn("Oath of Moment", rules)
        self.assertTrue(rules["Combat Doctrines"]["implemented"])
        self.assertIn("DEVASTATOR DOCTRINE", rules["Combat Doctrines"]["rules_text"])
        self.assertIn("Space Marine Chapters", rules)
        self.assertIn("Transhuman Strategist", rules)
        self.assertIn("Librarius", rules)
        self.assertIn("Special Move Types", rules)

    def test_devastator_doctrine_grants_assault_to_ranged_weapons(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit([{"name": "Faction", "rules_text": "Combat Doctrines", "implemented": True}])
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target = engine.build_target_state(copy.deepcopy(unit([])))

        context = engine.build_attack_context(
            attacker,
            profile,
            target,
            {"attacker_combat_doctrine": "devastator"},
            None,
            False,
        )

        self.assertIn("Assault", context["temporary_ranged_weapon_keywords"])

    def test_doctrine_requires_combat_doctrines_ability(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit([])
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target = engine.build_target_state(copy.deepcopy(unit([])))

        context = engine.build_attack_context(
            attacker,
            profile,
            target,
            {"attacker_combat_doctrine": "devastator"},
            None,
            False,
        )

        self.assertNotIn("Assault", context["temporary_ranged_weapon_keywords"])

    def test_black_templars_use_their_combat_doctrines_variant(self):
        data = json.loads((ROOT / "Black_Templars.json").read_text(encoding="utf-8"))
        rules = {rule["name"]: rule for rule in data["faction"]["army_rules"]}

        self.assertIn("Combat Doctrines", rules)
        self.assertIn("Transhuman Strategist", rules)
        self.assertIn("Space Marine Chapters", rules)
        self.assertIn("Special Move Types", rules)
        self.assertIn("Heirs of Sigismund", rules)
        self.assertNotIn("Librarius", rules)
        self.assertNotIn("Templar Vows", rules)
        self.assertIn("GLADIATOR LANCER", rules["Heirs of Sigismund"]["rules_text"])
        self.assertIn("REPULSOR EXECUTIONER", rules["Heirs of Sigismund"]["rules_text"])

        serialized = json.dumps(data)
        self.assertNotIn('"rules_text": "Templar Vows"', serialized)
        self.assertIn('"rules_text": "Combat Doctrines"', serialized)

    def test_dark_angels_add_ravenwing_and_deathwing(self):
        data = json.loads((ROOT / "Dark_Angels.json").read_text(encoding="utf-8"))
        rules = {rule["name"]: rule for rule in data["faction"]["army_rules"]}

        self.assertIn("Combat Doctrines", rules)
        self.assertIn("Transhuman Strategist", rules)
        self.assertIn("Space Marine Chapters", rules)
        self.assertIn("Librarius", rules)
        self.assertIn("Special Move Types", rules)
        self.assertTrue(rules["The Ravenwing"]["implemented"])
        self.assertIn("MOUNTED", rules["The Ravenwing"]["rules_text"])
        self.assertIn("VEHICLE FLY", rules["The Ravenwing"]["rules_text"])
        self.assertTrue(rules["The Deathwing"]["implemented"])
        self.assertIn("TERMINATOR", rules["The Deathwing"]["rules_text"])
        self.assertIn("DREADNOUGHT", rules["The Deathwing"]["rules_text"])

        loaded = load_factions()["Dark Angels"]["units"]
        self.assertIn("ravenwing", loaded["Outrider Squad"]["keywords"])
        self.assertIn("ravenwing", loaded["Storm Speeder Hailstrike"]["keywords"])
        self.assertIn("deathwing", loaded["Bladeguard Veteran Squad"]["keywords"])
        self.assertIn("deathwing", loaded["Redemptor Dreadnought"]["keywords"])

    def test_deathwatch_veteran_recruits(self):
        data = json.loads((ROOT / "Deathwatch.json").read_text(encoding="utf-8"))
        rules = {rule["name"]: rule for rule in data["faction"]["army_rules"]}

        self.assertIn("Combat Doctrines", rules)
        self.assertIn("Kill Teams", rules)
        self.assertTrue(rules["Veteran Recruits"]["implemented"])
        self.assertEqual(
            data["faction"]["unit_filters"]["deny_names"],
            ["Scout Squad", "Terminator Squad", "Terminator Assault Squad"],
        )

        loaded = load_factions()["Deathwatch"]["units"]
        self.assertNotIn("Scout Squad", loaded)
        self.assertNotIn("Terminator Squad", loaded)
        self.assertNotIn("Terminator Assault Squad", loaded)
        self.assertIn("Intercessor Squad", loaded)


if __name__ == "__main__":
    unittest.main()
