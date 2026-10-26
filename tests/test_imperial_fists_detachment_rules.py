import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator


def unit(name="Imperial Fists Unit", keywords=None):
    return {
        "name": name, "keywords": keywords or ["adeptus astartes", "infantry"],
        "models": 5, "toughness": 5, "wounds": 3, "armor_save": 3,
        "invulnerable_save": 0, "effects": [], "abilities": [], "weapons": {},
    }


def weapon():
    return {
        "name": "Bolt rifle", "range": '24"', "attacks": 2, "skill": 3,
        "strength": 5, "ap": -1, "damage": 1, "keywords": [], "raw_keywords": [],
    }


class ImperialFistsDetachmentRulesTests(unittest.TestCase):
    def context(self, target=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit()
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target_state = engine.build_target_state(copy.deepcopy(target or unit("Target")))
        return engine.build_attack_context(
            attacker, profile, target_state,
            {"attacker_detachment_name": "Ceramite Sentinels", **options},
            None, False,
        )

    def test_payload(self):
        faction = json.loads(Path("Imperial_Fists.json").read_text(encoding="utf-8"))["faction"]
        detachment = faction["detachments"][0]
        self.assertEqual(detachment["detachment_points"], 2)
        self.assertEqual(detachment["rule"]["name"], "Adaptive Defence")
        self.assertEqual(
            [(entry["name"], entry["points"]) for entry in detachment["enhancements"]],
            [("Honour Indefatigable", 10), ("Castellum Omnivox", 10),
             ("Defensive Mastery", 10), ("Spy-skull Data Link", 10)],
        )
        self.assertEqual(len(detachment["stratagems"]), 6)

    def test_adaptive_defence_and_spy_skull(self):
        entrenched = self.context(attacker_ceramite_entrenched_active=True)
        spy_skull = self.context(
            attacker_enhancement_name="Spy-skull Data Link",
            attacker_enhancement_bearer_name="Imperial Fists Unit",
        )
        self.assertTrue(entrenched["reroll_wound_rolls_of_1"])
        self.assertIn("Ignores Cover", spy_skull["temporary_ranged_weapon_keywords"])

    def test_augmented_targeting(self):
        standard = self.context(attacker_augmented_targeting_lethal_active=True)
        entrenched = self.context(
            attacker_augmented_targeting_lethal_active=True,
            attacker_augmented_targeting_sustained_active=True,
            attacker_ceramite_entrenched_active=True,
        )
        self.assertIn("LH", standard["temporary_weapon_keywords"])
        self.assertNotIn("SH1", standard["temporary_weapon_keywords"])
        self.assertIn("SH1", entrenched["temporary_weapon_keywords"])

    def test_priority_strike_only_applies_to_monsters_and_vehicles(self):
        monster = self.context(target=unit("Monster", ["monster"]), attacker_priority_strike_active=True)
        infantry = self.context(attacker_priority_strike_active=True)
        self.assertEqual(monster["attacker_outgoing_wound_modifier"], 1)
        self.assertEqual(infantry["attacker_outgoing_wound_modifier"], 0)


if __name__ == "__main__":
    unittest.main()
