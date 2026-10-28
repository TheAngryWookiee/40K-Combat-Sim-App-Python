import unittest

from combat_engine import CombatSimulator


class AbilityActivationClassificationTests(unittest.TestCase):
    def test_mandatory_unit_and_wargear_rules_are_automatic(self):
        unit = {
            "abilities": [
                {
                    "name": "Mandatory Trigger",
                    "rules_text": "Each time this unit attacks, re-roll Hit rolls of 1.",
                }
            ],
            "wargear_abilities": [
                {
                    "name": "Passive Shield",
                    "rules_text": "Attacks that target the bearer have -1 to the Hit roll.",
                }
            ],
            "selectable_abilities": [],
        }

        self.assertEqual(
            CombatSimulator.automatic_ability_name_set(unit),
            {"mandatory trigger", "passive shield"},
        )

    def test_optional_and_selectable_rules_are_not_automatic(self):
        unit = {
            "abilities": [
                {
                    "name": "Once-per-battle Choice",
                    "rules_text": "Once per battle, you can use this ability.",
                },
                {
                    "name": "Explicit Choice",
                    "rules_text": "This text is intentionally neutral.",
                    "activation_type": "activated",
                },
            ],
            "wargear_abilities": [],
            "selectable_abilities": [
                {"name": "Selected Mode", "rules_text": "Weapons have [LETHAL HITS]."}
            ],
        }

        self.assertEqual(CombatSimulator.automatic_ability_name_set(unit), set())

    def test_explicit_mandatory_metadata_overrides_optional_wording(self):
        ability = {
            "name": "Forced Resolution",
            "rules_text": "Once per phase, resolve this rule.",
            "activation_type": "triggered",
        }

        self.assertFalse(CombatSimulator.ability_is_optional(ability))

    def test_untracked_aura_range_remains_a_contextual_option(self):
        ability = {
            "name": "Command Aura (Aura)",
            "rules_text": "While a friendly unit is within 6 inches, re-roll Hit rolls of 1.",
        }

        self.assertTrue(CombatSimulator.ability_is_optional(ability))

    def test_simulation_options_include_automatic_rules_on_both_sides(self):
        attacker = {
            "abilities": [{"name": "Attacker Trigger", "rules_text": "Each time this unit attacks."}],
            "wargear_abilities": [],
        }
        defender = {
            "abilities": [{"name": "Defender Trigger", "rules_text": "Each time this unit is targeted."}],
            "wargear_abilities": [],
        }

        options = CombatSimulator.with_automatic_ability_names(
            {"attacker_active_ability_names": ["Chosen Mode"]}, attacker, defender
        )

        self.assertEqual(
            options["attacker_active_ability_names"],
            ["attacker trigger", "chosen mode"],
        )
        self.assertEqual(options["defender_active_ability_names"], ["defender trigger"])


if __name__ == "__main__":
    unittest.main()
