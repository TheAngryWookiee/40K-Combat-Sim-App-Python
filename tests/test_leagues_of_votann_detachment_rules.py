import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="Kin", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["leagues of votann", "infantry"],
        "models": 5,
        "toughness": 5,
        "wounds": 2,
        "armor_save": 4,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(ranged=False, strength=6):
    return {
        "name": "Autoch weapon" if ranged else "Kin weapon",
        "range": '24"' if ranged else "Melee",
        "attacks": 2,
        "skill": 4,
        "strength": strength,
        "ap": 1,
        "damage": 2,
        "keywords": [],
        "raw_keywords": [],
    }


class VotannDetachmentRulesTests(unittest.TestCase):
    def context(self, active=(), defender_active=(), attacker=None, target=None, profile=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(attacker or unit())
        profile = profile or weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target_state = engine.build_target_state(copy.deepcopy(target or unit("Target")))
        return engine.build_attack_context(
            attacker,
            profile,
            target_state,
            {
                "attacker_active_ability_names": list(active),
                "defender_active_ability_names": list(defender_active),
                **options,
            },
            None,
            False,
        )

    def test_yield_point_weapon_modes(self):
        context = self.context(
            ["Ancestral Sentence - Spend 3YP", "No Shot Wasted", "Fury of the Hearth - Spend 1YP"],
            profile=weapon(ranged=True),
        )
        self.assertIn("SH2", context["temporary_ranged_weapon_keywords"])
        self.assertIn("LH", context["temporary_ranged_weapon_keywords"])
        self.assertEqual(context["ranged_strength_bonus"], 1)

    def test_reroll_modes(self):
        standard = self.context(["Optimal Expenditure - Standard"])
        spent = self.context(["Optimal Expenditure - Spend 3YP"])
        self.assertTrue(standard["reroll_hit_rolls_of_1"])
        self.assertTrue(standard["reroll_wound_rolls_of_1"])
        self.assertTrue(spent["reroll_hit_rolls_of_1"])
        self.assertTrue(spent["reroll_all_wound_rolls"])

    def test_enhancement_bearer_damage_and_passive(self):
        context = self.context(
            ["Iron Ambassador - Spend 3YP"],
            profile=weapon(ranged=True),
            attacker_enhancement_name="Iron Ambassador",
            attacker_enhancement_bearer_name="Kin",
        )
        oathbound = self.context(
            attacker_enhancement_name="Oathbound Speculator",
            attacker_enhancement_bearer_name="Kin",
        )
        self.assertEqual(context["ranged_damage_bonus"], 3)
        self.assertTrue(oathbound["reroll_wound_rolls_of_1"])

    def test_attack_modifiers(self):
        context = self.context(["Hostile Acquisition", "Oathbound Speculator - Spend 3YP"])
        self.assertEqual(context["attacker_hit_modifier"], 1)
        self.assertEqual(context["attacker_outgoing_wound_modifier"], 1)

    def test_defensive_effects(self):
        context = self.context(
            defender_active=["Fortify Takeover", "Void Hardened", "Brêkkeknots"],
            profile=weapon(ranged=True, strength=8),
        )
        self.assertEqual(context["target_incoming_wound_modifier"], -1)
        self.assertEqual(context["target_ap_modifier"], -1)
        self.assertEqual(context["target_invulnerable_save"], 4)

    def test_built_to_last_only_applies_when_strength_exceeds_toughness(self):
        high = self.context(defender_active=["Built to Last"], profile=weapon(ranged=True, strength=8))
        equal = self.context(defender_active=["Built to Last"], profile=weapon(ranged=True, strength=5))
        self.assertEqual(high["target_incoming_wound_modifier"], -1)
        self.assertEqual(equal["target_incoming_wound_modifier"], 0)

    def test_suppression_and_unwavering_accuracy(self):
        suppressed = self.context(defender_active=["Graviton Vault"])
        unwavering = self.context(["Unwavering Accuracy"], defender_active=["Graviton Vault"])
        self.assertEqual(suppressed["attacker_hit_modifier"], -1)
        self.assertTrue(unwavering["ignore_negative_hit_modifiers"])
        self.assertTrue(unwavering["ignore_negative_wound_modifiers"])


if __name__ == "__main__":
    unittest.main()
