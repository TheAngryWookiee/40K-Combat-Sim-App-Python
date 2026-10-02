import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="Cultists", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["genestealer cults", "infantry"],
        "models": 5,
        "toughness": 4,
        "wounds": 2,
        "armor_save": 5,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(ranged=False):
    return {
        "name": "Autogun" if ranged else "Cult weapon",
        "range": '24"' if ranged else "Melee",
        "attacks": 2,
        "skill": 4,
        "strength": 4,
        "ap": 1,
        "damage": 2,
        "keywords": [],
        "raw_keywords": [],
    }


class GenestealerCultsDetachmentRulesTests(unittest.TestCase):
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

    def test_host_of_ascension_keywords_and_critical_hits(self):
        context = self.context(["A Perfect Ambush", "Primed and Readied"], profile=weapon(ranged=True))
        self.assertIn("SH1", context["temporary_weapon_keywords"])
        self.assertIn("Ignores Cover", context["temporary_weapon_keywords"])
        self.assertEqual(context["critical_hit_threshold"], 5)

    def test_character_target_and_melee_buffs(self):
        character = unit("Character", ["character"])
        context = self.context(
            ["Denunciator of Tyrants", "Frenzied Devotion", "Coordinated Trap"],
            target=character,
        )
        self.assertEqual(context["attacker_hit_modifier"], 2)
        self.assertEqual(context["attacker_outgoing_wound_modifier"], 2)
        self.assertEqual(context["melee_attack_bonus"], 1)
        self.assertIn("Hazardous", context["temporary_weapon_keywords_by_weapon_name"]["cult weapon"])

    def test_broodsurge_charge_and_monster_target(self):
        monster = unit("Monster", ["monster"])
        context = self.context(
            ["Hypermorphic Fury", "Gene-twisted Muscle"],
            attacker=unit("Aberrants", ["genestealer cults", "infantry", "aberrants"]),
            target=monster,
            charged_this_turn=True,
        )
        self.assertEqual(context["melee_attack_bonus"], 1)
        self.assertEqual(context["attacker_outgoing_wound_modifier"], 1)

    def test_static_enhancement_effects(self):
        bearer = unit("Sanctus", ["genestealer cults", "sanctus"])
        toxins = self.context(
            attacker=bearer,
            attacker_enhancement_name="Gene-Tailored Toxins",
            attacker_enhancement_bearer_name="Sanctus",
        )
        munitions = self.context(
            profile=weapon(ranged=True),
            attacker_enhancement_name="Contraband Munitions",
        )
        self.assertEqual(toxins["melee_damage_bonus"], 1)
        self.assertEqual(munitions["ranged_strength_bonus"], 2)

    def test_final_day_and_killer_rerolls(self):
        context = self.context(
            ["Killer Reputation", "Avenge the Star Children"],
            attacker=unit("Kelermorph", ["genestealer cults", "infantry", "character", "kelermorph"]),
        )
        self.assertTrue(context["reroll_hit_rolls_of_1"])
        self.assertTrue(context["reroll_wound_rolls_of_1"])
        self.assertEqual(context["attacker_hit_modifier"], 1)
        self.assertEqual(context["attacker_outgoing_wound_modifier"], 1)

    def test_vengeance_for_the_martyr_modes(self):
        standard = self.context(["Vengeance for the Martyr - Standard"])
        revered = self.context(["Vengeance for the Martyr - Revered Leader"])
        self.assertTrue(standard["reroll_hit_rolls_of_1"])
        self.assertFalse(standard["reroll_all_hit_rolls"])
        self.assertTrue(revered["reroll_all_hit_rolls"])

    def test_defensive_stratagems_and_upgrade(self):
        context = self.context(
            defender_active=["Devoted Crew", "Deft Manoeuvring", "Slunk from the Underbelly"],
            profile=weapon(ranged=True),
        )
        marked = self.context(
            defender_enhancement_name="Mark of the Star Children",
            target=unit(
                "Purestrain Genestealers",
                ["genestealer cults", "infantry", "purestrain genestealers"],
            ),
        )
        self.assertEqual(context["target_damage_modifier"], -1)
        self.assertEqual(context["target_invulnerable_save"], 4)
        self.assertEqual(context["target_ap_modifier"], -1)
        self.assertEqual(marked["target_toughness_bonus"], 1)
        self.assertEqual(marked["target_invulnerable_save"], 4)


if __name__ == "__main__":
    unittest.main()
