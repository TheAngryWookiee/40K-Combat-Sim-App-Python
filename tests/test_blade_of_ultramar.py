import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class BladeOfUltramarTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Ultramarines.json").read_text(encoding="utf-8"))
        cls.detachment = raw["faction"]["detachments"][0]
        cls.units = load_factions()["Ultramarines"]["units"]

    def context(self, ranged=True, active=(), doctrine="", **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.units["Intercessor Squad"])
        profile = next(
            weapon for weapon in attacker["weapons"].values()
            if (weapon["range"] != "Melee") == ranged
        )
        target = {
            "name": "Target", "keywords": ["infantry"], "models": 1, "toughness": 5,
            "wounds": 5, "armor_save": 3, "invulnerable_save": 0, "effects": [],
            "abilities": [], "weapons": {},
        }
        context = engine.build_attack_context(
            attacker, profile, engine.build_target_state(target),
            {"attacker_detachment_name": "Blade of Ultramar",
             "attacker_active_ability_names": list(active),
             "attacker_combat_doctrine": doctrine, **options}, None, False,
        )
        return engine, attacker, profile, target, context

    def test_payload(self):
        self.assertEqual(self.detachment["detachment_points"], 3)
        self.assertEqual(self.detachment["rule"]["name"], "Mastered Doctrines")
        self.assertEqual(len(self.detachment["enhancements"]), 4)
        self.assertEqual(len(self.detachment["stratagems"]), 6)

    def test_oath_of_macragge_scales_with_assault_doctrine(self):
        options = {"attacker_enhancement_name": "Oath of Macragge",
                   "attacker_enhancement_bearer_name": "Intercessor Squad"}
        standard = self.context(ranged=False, **options)[-1]
        assault = self.context(ranged=False, doctrine="assault", **options)[-1]
        self.assertEqual((standard["melee_strength_bonus"], standard["attacker_ap_modifier"]), (1, 1))
        self.assertEqual((assault["melee_strength_bonus"], assault["attacker_ap_modifier"]), (2, 2))

    def test_attack_keywords(self):
        veteran = self.context(
            attacker_enhancement_name="Veteran of Behemoth",
            attacker_enhancement_bearer_name="Intercessor Squad",
        )[-1]
        vigilance = self.context(active=["Exemplary Vigilance"])[-1]
        courage = self.context(ranged=False, active=["Courage and Honour!"])[-1]
        self.assertIn("SH1", veteran["temporary_ranged_weapon_keywords"])
        self.assertIn("Ignores Cover", vigilance["temporary_ranged_weapon_keywords"])
        self.assertIn("Lance", courage["temporary_melee_weapon_keywords"])

    def test_defensive_effects(self):
        engine, attacker, profile, target, _ = self.context()
        profile["strength"] = 10
        target_state = engine.build_target_state(target)
        foresight = engine.build_attack_context(
            attacker, profile, target_state,
            {"defender_active_ability_names": ["Tactical Foresight"]}, None, False,
        )
        antoninus = engine.build_attack_context(
            attacker, profile, target_state,
            {"defender_enhancement_name": "Armour of Antoninus"}, None, False,
        )
        self.assertEqual(foresight["target_incoming_wound_modifier"], -1)
        self.assertEqual(antoninus["target_armor_save_modifier"], -2)
        self.assertEqual(antoninus["target_feel_no_pain"], 5)


if __name__ == "__main__":
    unittest.main()
