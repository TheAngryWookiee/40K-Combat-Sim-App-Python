import copy
import unittest

from combat_engine import CombatSimulator
from data_loader import load_factions


class UltramarinesDatasheetRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Ultramarines"]["units"]

    def context(self, unit_name, weapon_name, target_keywords=None, doctrine="", active=()):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.units[unit_name])
        profile = attacker["weapons"][weapon_name]
        target = {
            "name": "Target", "keywords": target_keywords or ["infantry"], "models": 1,
            "toughness": 5, "wounds": 5, "armor_save": 3, "invulnerable_save": 0,
            "effects": [], "abilities": [], "weapons": {},
        }
        return engine.build_attack_context(
            attacker, profile, engine.build_target_state(target),
            {"attacker_combat_doctrine": doctrine,
             "attacker_active_ability_names": list(active)}, None, False,
        )

    def test_deeds_of_astartes(self):
        standard = self.context("Captain Titus", "Master-crafted Chainsword")
        assault = self.context("Captain Titus", "Master-crafted Chainsword", doctrine="assault")
        vehicle = self.context("Captain Titus", "Master-crafted Chainsword", ["vehicle"])
        self.assertIn("SH1", standard["temporary_melee_weapon_keywords"])
        self.assertIn("SH2", assault["temporary_melee_weapon_keywords"])
        self.assertNotIn("SH1", vehicle["temporary_melee_weapon_keywords"])

    def test_calgars_champion(self):
        context = self.context(
            "Kaius Konorius", "Severance and Rebuke - Strike", ["character", "infantry"],
        )
        self.assertTrue(context["reroll_hit_rolls_of_1"])
        self.assertTrue(context["reroll_wound_rolls_of_1"])

    def test_primarch_aura(self):
        context = self.context(
            "Roboute Guilliman", "Hand of Dominion", active=["Primarch of the XIII (Aura)"],
        )
        self.assertTrue(context["reroll_hit_rolls_of_1"])
        self.assertTrue(context["reroll_wound_rolls_of_1"])

    def test_honour_guard_of_macragge(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.units["Intercessor Squad"])
        profile = next(iter(attacker["weapons"].values()))
        target = engine.build_target_state(copy.deepcopy(self.units["Victrix Honour Guard"]))
        context = engine.build_attack_context(attacker, profile, target, {}, None, False)
        self.assertEqual(context["target_incoming_wound_modifier"], -1)


if __name__ == "__main__":
    unittest.main()
