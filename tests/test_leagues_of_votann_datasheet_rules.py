import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="Kin", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["leagues of votann", "infantry"],
        "models": 1,
        "toughness": 5,
        "wounds": 4,
        "armor_save": 4,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(name="Kin weapon", ranged=False):
    return {
        "name": name,
        "range": '24"' if ranged else "Melee",
        "attacks": 3,
        "skill": 4,
        "strength": 6,
        "ap": 1,
        "damage": 2,
        "keywords": [],
        "raw_keywords": [],
    }


class VotannDatasheetRulesTests(unittest.TestCase):
    def context(self, active=(), defender_active=(), attacker=None, target=None, profile=None):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(attacker or unit())
        profile = profile or weapon()
        attacker["weapons"] = {profile["name"]: profile}
        return engine.build_attack_context(
            attacker,
            profile,
            engine.build_target_state(copy.deepcopy(target or unit("Target"))),
            {
                "attacker_active_ability_names": list(active),
                "defender_active_ability_names": list(defender_active),
            },
            None,
            False,
        )

    def test_weapon_keyword_abilities(self):
        ranged = self.context(["Resource Transmutation", "Kindred Hero"], profile=weapon(ranged=True))
        melee = self.context(["Break the Foe"], profile=weapon())
        self.assertIn("SH1", ranged["temporary_ranged_weapon_keywords"])
        self.assertIn("LH", ranged["temporary_weapon_keywords"])
        self.assertIn("SH1", melee["temporary_melee_weapon_keywords"])

    def test_datasheet_rerolls(self):
        context = self.context(
            ["Multispectral Visor", "Panspectral Scanner", "Defensive Destruction"],
            profile=weapon(ranged=True),
        )
        quake = self.context(["Geomantic Hunters"], profile=weapon("Breacher ordnance", ranged=True))
        self.assertTrue(context["reroll_hit_rolls_of_1"])
        self.assertTrue(context["reroll_wound_rolls_of_1"])
        self.assertTrue(quake["reroll_all_wound_rolls"])

    def test_suppression_and_defensive_abilities(self):
        suppressed = self.context(defender_active=["Scanner Uplinks"])
        protected = self.context(
            defender_active=["Fortify (Psychic)", "Rampart Crest"],
        )
        champion = self.context(
            defender_active=["Weavefield Crest"],
            target=unit("Einhyr Champion"),
        )
        self.assertEqual(suppressed["attacker_hit_modifier"], -1)
        self.assertEqual(protected["target_feel_no_pain"], 5)
        self.assertEqual(protected["target_invulnerable_save"], 5)
        self.assertEqual(champion["target_invulnerable_save"], 4)

    def test_cover_denial_and_modifier_immunity(self):
        context = self.context(
            ["Breaching Fire", "MultiCOG Targeting"],
            profile=weapon(ranged=True),
            target={**unit("Target"), "has_cover": True},
        )
        self.assertFalse(context["target_has_cover"])
        self.assertTrue(context["ignore_negative_hit_modifiers"])

    def test_overcharge_changes_hazardous_failure_threshold(self):
        context = self.context(
            ["Overcharge"],
            profile=weapon("Transmatter inverter - overcharge", ranged=True),
        )
        self.assertEqual(context["hazardous_fail_threshold"], 4)


if __name__ == "__main__":
    unittest.main()
