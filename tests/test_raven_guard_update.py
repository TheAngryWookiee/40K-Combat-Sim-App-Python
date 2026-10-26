import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class RavenGuardUpdateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Raven_Guard.json").read_text(encoding="utf-8"))
        cls.faction = raw["faction"]
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Raven Guard"]["units"]

    def context(self, unit_name, weapon_name, target_keywords=None, active=(), **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units[unit_name])
        profile = attacker["weapons"][weapon_name]
        target = {
            "name": "Target", "keywords": target_keywords or ["infantry"], "models": 1,
            "toughness": 5, "wounds": 5, "armor_save": 3, "invulnerable_save": 0,
            "effects": [], "abilities": [], "weapons": {},
        }
        return engine.build_attack_context(
            attacker, profile, engine.build_target_state(target),
            {"attacker_active_ability_names": list(active), **options}, None, False,
        )

    def test_detachment_payload(self):
        detachment = self.faction["detachments"][0]
        self.assertEqual(detachment["name"], "Shadowmark Talon")
        self.assertEqual(detachment["detachment_points"], 2)
        self.assertEqual(detachment["rule"]["name"], "Shadow Tactics")
        self.assertEqual(len(detachment["enhancements"]), 4)
        self.assertEqual(len(detachment["stratagems"]), 6)

    def test_updated_specific_roster_and_profiles(self):
        self.assertEqual(set(self.raw_units), {"Aethon Shaan", "Kayvaan Shrike"})
        self.assertIn("Intercessor Squad", self.loaded_units)
        self.assertEqual(self.raw_units["Aethon Shaan"]["points"], 105)
        self.assertEqual(self.raw_units["Kayvaan Shrike"]["points"], 95)
        self.assertIn("Smoke", self.raw_units["Aethon Shaan"]["keywords"])
        self.assertEqual(self.loaded_units["Aethon Shaan"]["weapons"]["Claws of Severax"]["strength"], 5)

    def test_claws_of_severax_are_conditional(self):
        infantry = self.context("Aethon Shaan", "Claws of Severax")
        vehicle = self.context("Aethon Shaan", "Claws of Severax", ["vehicle"])
        self.assertIn("SH2", infantry["temporary_weapon_keywords"])
        self.assertNotIn("SH2", vehicle["temporary_weapon_keywords"])

    def test_attack_stratagems(self):
        shooting = self.context("Kayvaan Shrike", "Blackout", active=["Murderous Fusillade"])
        melee = self.context("Kayvaan Shrike", "The Raven's Talons", active=["Lay Low the Tyrants"])
        self.assertEqual(shooting["attacker_hit_modifier"], 1)
        self.assertEqual(shooting["attacker_ap_modifier"], 1)
        self.assertIn("Precision", melee["temporary_melee_weapon_keywords"])

    def test_shadow_tactics_grants_ranged_stealth(self):
        context = self.context(
            "Kayvaan Shrike", "Blackout", defender_detachment_name="Shadowmark Talon",
        )
        self.assertEqual(context["attacker_hit_modifier"], -1)


if __name__ == "__main__":
    unittest.main()
