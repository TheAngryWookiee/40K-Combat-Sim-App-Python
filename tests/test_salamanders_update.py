import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class SalamandersUpdateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Salamanders.json").read_text(encoding="utf-8"))
        cls.faction = raw["faction"]
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Salamanders"]["units"]

    def context(self, unit_name, weapon_name, active=(), doctrine="", **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units[unit_name])
        profile = attacker["weapons"][weapon_name]
        target = {
            "name": "Target", "keywords": ["infantry"], "models": 1, "toughness": 5,
            "wounds": 5, "armor_save": 3, "invulnerable_save": 0, "effects": [],
            "abilities": [], "weapons": {},
        }
        return engine.build_attack_context(
            attacker, profile, engine.build_target_state(target),
            {"attacker_detachment_name": "Forgefather's Seekers",
             "attacker_active_ability_names": list(active),
             "attacker_combat_doctrine": doctrine, **options}, None, False,
        )

    def test_detachment_and_roster_payload(self):
        detachment = self.faction["detachments"][0]
        self.assertEqual(detachment["detachment_points"], 2)
        self.assertEqual(detachment["rule"]["name"], "Vulkan's Quest")
        self.assertEqual(len(detachment["enhancements"]), 4)
        self.assertEqual(len(detachment["stratagems"]), 6)
        self.assertEqual(set(self.raw_units), {"Adrax Agatone", "Vulkan He'stan"})
        self.assertEqual(self.raw_units["Adrax Agatone"]["points"], 90)
        self.assertEqual(self.raw_units["Vulkan He'stan"]["points"], 105)

    def test_vulkans_quest(self):
        near = self.context("Vulkan He'stan", "Bolt pistol", attacker_target_within_12=True)
        far = self.context("Vulkan He'stan", "Bolt pistol", attacker_target_within_12=False)
        self.assertEqual(near["attacker_outgoing_wound_modifier"], 1)
        self.assertEqual(far["attacker_outgoing_wound_modifier"], 0)

    def test_unto_the_anvil_scales_with_assault_doctrine(self):
        standard = self.context("Adrax Agatone", "Malleus Noctum")
        assault = self.context("Adrax Agatone", "Malleus Noctum", doctrine="assault")
        self.assertTrue(standard["reroll_wound_rolls_of_1"])
        self.assertFalse(standard["reroll_all_wound_rolls"])
        self.assertTrue(assault["reroll_all_wound_rolls"])

    def test_forgefather_and_enhancements(self):
        forgefather = self.context("Vulkan He'stan", "Gauntlet of the Forge", active=["Forgefather"])
        artifice = self.context(
            "Adrax Agatone", "Malleus Noctum", attacker_enhancement_name="War-tempered Artifice",
            attacker_enhancement_bearer_name="Adrax Agatone",
        )
        immolator = self.context(
            "Vulkan He'stan", "Gauntlet of the Forge", attacker_enhancement_name="Immolator",
            attacker_enhancement_bearer_name="Vulkan He'stan",
        )
        self.assertEqual(forgefather["ranged_strength_bonus"], 2)
        self.assertEqual((artifice["melee_strength_bonus"], artifice["melee_damage_bonus"]), (1, 1))
        self.assertEqual(immolator["ranged_attack_bonus"], 1)

    def test_revised_attack_stratagems(self):
        crucible = self.context("Adrax Agatone", "Malleus Noctum", attacker_crucible_of_battle_active=True)
        immolation = self.context("Vulkan He'stan", "Gauntlet of the Forge", attacker_immolation_protocols_active=True)
        self.assertTrue(crucible["reroll_hit_rolls_of_1"])
        self.assertTrue(crucible["reroll_wound_rolls_of_1"])
        self.assertEqual(immolation["attacker_ap_modifier"], 1)
        self.assertNotIn("DW", immolation["temporary_weapon_keywords"])


if __name__ == "__main__":
    unittest.main()
