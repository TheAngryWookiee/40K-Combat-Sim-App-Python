import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="Necron Unit", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["necrons", "infantry"],
        "models": 1,
        "toughness": 5,
        "wounds": 5,
        "armor_save": 4,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(name="Gauss weapon", ranged=True, strength=6, attacks=3, keywords=None):
    return {
        "name": name,
        "range": '24"' if ranged else "Melee",
        "attacks": attacks,
        "skill": 3,
        "strength": strength,
        "ap": 1,
        "damage": 2,
        "keywords": keywords or [],
        "raw_keywords": keywords or [],
    }


class NecronDatasheetRulesTests(unittest.TestCase):
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

    def test_damage_reduction_invulnerable_and_feel_no_pain(self):
        context = self.context(
            defender_active=["Necrodermis", "Master Chronomancer", "Rites of Reanimation"],
        )
        self.assertEqual(context["target_damage_modifier"], -1)
        self.assertEqual(context["target_invulnerable_save"], 4)
        self.assertEqual(context["target_feel_no_pain"], 5)

    def test_critical_hit_and_conditional_reroll_rules(self):
        critical = self.context(["Destroyer Cult"])
        hatred = self.context(["Driven by Hatred"], target_below_half_strength=True)
        self.assertEqual(critical["critical_hit_threshold"], 5)
        self.assertTrue(hatred["reroll_all_hit_rolls"])
        self.assertTrue(hatred["reroll_all_wound_rolls"])

    def test_melee_keyword_and_charge_modes(self):
        standard = self.context(["Whirling Onslaught - Standard", "Plasmacyte"], profile=weapon(ranged=False))
        charged = self.context(["Whirling Onslaught - Charged"], profile=weapon(ranged=False))
        self.assertTrue(standard["reroll_hit_rolls_of_1"])
        self.assertIn("DW", standard["temporary_melee_weapon_keywords"])
        self.assertTrue(charged["reroll_all_hit_rolls"])

    def test_weapon_specific_rules(self):
        doomsday = self.context(["Overwhelming Obliteration"], profile=weapon("Doomsday cannon"))
        exterminator = self.context(
            ["Optimised for Slaughter"],
            profile=weapon("Enmitic exterminator"),
            target=unit("Infantry Target", ["infantry"]),
        )
        self.assertIn("DW", doomsday["temporary_weapon_keywords_by_weapon_name"]["doomsday cannon"])
        self.assertTrue(exterminator["reroll_wound_rolls_of_1"])

    def test_defensive_modifiers_and_wargear(self):
        context = self.context(
            defender_active=["Advanced Quantum Shielding", "Mechanical Augmentation (Aura)", "Shieldvanes"],
            profile=weapon(strength=8),
        )
        self.assertEqual(context["target_incoming_wound_modifier"], -1)
        self.assertEqual(context["target_ap_modifier"], -1)
        self.assertEqual(context["target_armor_save_modifier"], -1)

    def test_targeting_and_weapon_sentinel_rules(self):
        relay = self.context(["Targeting Relay"], defender_has_cover=True)
        sentinels = self.context(["Weapon Sentinels"])
        self.assertFalse(relay["target_has_cover"])
        self.assertTrue(sentinels["ignore_negative_hit_modifiers"])
        self.assertTrue(sentinels["ignore_negative_wound_modifiers"])


if __name__ == "__main__":
    unittest.main()
