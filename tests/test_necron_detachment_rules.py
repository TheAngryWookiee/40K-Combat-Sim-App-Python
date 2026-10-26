import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="Necron Unit", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["necrons", "infantry"],
        "models": 5,
        "toughness": 5,
        "wounds": 2,
        "armor_save": 4,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(ranged=False, strength=6, name=None):
    return {
        "name": name or ("Gauss weapon" if ranged else "Necron weapon"),
        "range": '24"' if ranged else "Melee",
        "attacks": 2,
        "skill": 4,
        "strength": strength,
        "ap": 1,
        "damage": 2,
        "keywords": [],
        "raw_keywords": [],
    }


class NecronDetachmentRulesTests(unittest.TestCase):
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

    def test_selectable_weapon_keywords(self):
        context = self.context(
            [
                "Technosorcerous Augmentations - Anti-Infantry 3+",
                "Technosorcerous Augmentations - Ignores Cover",
                "Relocational Optimiser - Lethal Hits",
            ],
            profile=weapon(ranged=True),
        )
        self.assertIn("Anti-Infantry 3+", context["temporary_weapon_keywords"])
        self.assertIn("Ignores Cover", context["temporary_ranged_weapon_keywords"])
        self.assertIn("LH", context["temporary_ranged_weapon_keywords"])

    def test_reroll_modes_and_critical_hits(self):
        standard = self.context(["Power Matrix - Standard"])
        within = self.context(["Power Matrix - Within Matrix", "Enslaved Artifice"])
        self.assertTrue(standard["reroll_hit_rolls_of_1"])
        self.assertTrue(within["reroll_all_hit_rolls"])
        self.assertEqual(within["critical_hit_threshold"], 5)

    def test_hungry_void_modes(self):
        standard = self.context(["Protocol of the Hungry Void - Standard"])
        led = self.context(["Protocol of the Hungry Void - Led"])
        self.assertEqual(standard["melee_strength_bonus"], 1)
        self.assertEqual(standard["attacker_ap_modifier"], 0)
        self.assertEqual(led["attacker_ap_modifier"], 1)

    def test_defensive_effects(self):
        context = self.context(
            defender_active=[
                "Enagic Dermal Bond", "Nanoassembly Protocols",
                "Subsurface Quantumweave", "Nether-Realm Casket",
            ],
            profile=weapon(ranged=True),
        )
        self.assertEqual(context["target_feel_no_pain"], 4)
        self.assertEqual(context["target_damage_modifier"], -1)
        self.assertEqual(context["target_ap_modifier"], -1)
        self.assertTrue(context["target_has_stealth"])

    def test_strength_gated_defence_and_invulnerable_save(self):
        high = self.context(
            defender_active=["Unyielding Forms", "Quantum Deflection"],
            profile=weapon(ranged=True, strength=8),
        )
        equal = self.context(defender_active=["Unyielding Forms"], profile=weapon(ranged=True, strength=5))
        self.assertEqual(high["target_incoming_wound_modifier"], -1)
        self.assertEqual(high["target_invulnerable_save"], 4)
        self.assertEqual(equal["target_incoming_wound_modifier"], 0)

    def test_molecular_targeting_modes(self):
        standard = self.context(["Molecular Targeting - Standard"])
        cryptek = self.context(["Molecular Targeting - Cryptek"])
        self.assertTrue(standard["ignore_negative_hit_modifiers"])
        self.assertFalse(standard["ignore_negative_wound_modifiers"])
        self.assertTrue(cryptek["ignore_negative_hit_modifiers"])
        self.assertTrue(cryptek["ignore_negative_wound_modifiers"])


if __name__ == "__main__":
    unittest.main()
