import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="Kabalites", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["drukhari", "infantry", "kabal"],
        "models": 5,
        "toughness": 3,
        "wounds": 1,
        "armor_save": 5,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(ranged=False, strength=4):
    return {
        "name": "Splinter rifle" if ranged else "Blade",
        "range": '24"' if ranged else "Melee",
        "attacks": 2,
        "skill": 3,
        "strength": strength,
        "ap": 1,
        "damage": 2,
        "keywords": [],
    }


class DrukhariDetachmentRulesTests(unittest.TestCase):
    def context(self, active=(), defender_active=(), attacker=None, target=None, profile=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(attacker or unit())
        profile = profile or weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target_state = engine.build_target_state(copy.deepcopy(target or unit("Target")))
        context = engine.build_attack_context(
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
        return context

    def test_rain_of_cruelty_requires_disembark_and_tracks_weapon_type(self):
        ranged = self.context(["Rain of Cruelty"], profile=weapon(ranged=True), attacker_disembarked_from_transport=True)
        melee = self.context(["Rain of Cruelty"], attacker_disembarked_from_transport=True)
        inactive = self.context(["Rain of Cruelty"], profile=weapon(ranged=True))
        self.assertIn("Ignores Cover", ranged["temporary_weapon_keywords_by_weapon_name"]["splinter rifle"])
        self.assertIn("Lance", melee["temporary_weapon_keywords_by_weapon_name"]["blade"])
        self.assertFalse(inactive["temporary_weapon_keywords_by_weapon_name"])

    def test_combat_drugs_modify_only_the_relevant_profile(self):
        wych = unit("Wyches", ["drukhari", "infantry", "wych cult"])
        melee = self.context(["Adrenalight", "Serpentin", "Grave Lotus"], attacker=wych)
        ranged = self.context(["Splintermind"], attacker=wych, profile=weapon(ranged=True))
        defended = self.context(defender_active=["Painbringer"], target=wych)
        self.assertEqual((melee["melee_attack_bonus"], melee["attacker_hit_modifier"], melee["melee_strength_bonus"]), (1, 1, 1))
        self.assertEqual(ranged["attacker_hit_modifier"], 1)
        self.assertEqual(defended["target_toughness_bonus"], 1)

    def test_wager_states_and_target_contracts(self):
        winning = self.context(["Callous Competition - Winning"])
        losing = self.context(["Callous Competition - Losing"])
        monster = unit("Monster", ["monster"])
        contract = self.context(["Show of Strength"], target=monster)
        self.assertTrue(winning["reroll_hit_rolls_of_1"])
        self.assertFalse(winning["reroll_wound_rolls_of_1"])
        self.assertTrue(losing["reroll_wound_rolls_of_1"])
        self.assertIn("LH", contract["temporary_weapon_keywords"])

    def test_defensive_rules_stack_through_standard_context_fields(self):
        target = unit("Talos", ["drukhari", "vehicle", "talos"])
        context = self.context(
            defender_active=["Darkest Artifice", "Insensible to Pain", "Fighting Shadows", "Night Shield"],
            target=target,
            profile=weapon(ranged=True, strength=8),
        )
        self.assertEqual(context["target_incoming_wound_modifier"], -1)
        self.assertEqual(context["target_damage_modifier"], -1)
        self.assertEqual(context["attacker_hit_modifier"], -1)
        self.assertEqual(context["target_invulnerable_save"], 4)

    def test_battleshock_and_non_vehicle_target_gates(self):
        infantry = unit("Infantry", ["infantry"])
        context = self.context(
            ["Exacting Cruelty", "Salting the Wound"],
            attacker=unit("Wyches", ["drukhari", "infantry", "wych cult"]),
            target=infantry,
            defender_battleshocked=True,
        )
        self.assertIn("LH", context["temporary_weapon_keywords_by_weapon_name"]["blade"])
        self.assertIn("DW", context["temporary_weapon_keywords"])


if __name__ == "__main__":
    unittest.main()
