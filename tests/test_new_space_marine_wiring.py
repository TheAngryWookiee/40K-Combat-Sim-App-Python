import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator


def unit(name="Unit", keywords=None, abilities=None):
    return {
        "name": name, "keywords": keywords or ["adeptus astartes", "infantry"],
        "models": 1, "toughness": 5, "wounds": 5, "armor_save": 3,
        "invulnerable_save": 0, "effects": [], "abilities": abilities or [], "weapons": {},
    }


def weapon(name="Weapon", melee=False):
    return {
        "name": name, "range": "Melee" if melee else '24"', "attacks": 4, "skill": 3,
        "strength": 5, "ap": -1, "damage": 1, "keywords": [], "raw_keywords": [],
    }


class NewSpaceMarineWiringTests(unittest.TestCase):
    def context(self, attacker=None, profile=None, target=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(attacker or unit())
        profile = copy.deepcopy(profile or weapon())
        attacker["weapons"] = {profile["name"]: profile}
        target_state = engine.build_target_state(copy.deepcopy(target or unit("Target")))
        return engine.build_attack_context(attacker, profile, target_state, options, None, False)

    def test_angelic_inheritors_character_rerolls(self):
        character = self.context(
            attacker=unit("Captain", ["adeptus astartes", "infantry", "character"]),
            attacker_detachment_name="Angelic Inheritors",
        )
        non_character = self.context(attacker_detachment_name="Angelic Inheritors")
        self.assertTrue(character["reroll_hit_rolls_of_1"])
        self.assertTrue(character["reroll_wound_rolls_of_1"])
        self.assertFalse(non_character["reroll_hit_rolls_of_1"])

    def test_marshals_household_objective_attack_bonus(self):
        active = self.context(
            attacker=unit("Sword Brethren Squad"), profile=weapon(melee=True),
            attacker_detachment_name="Marshal's Household", attacker_on_objective=True,
        )
        inactive = self.context(
            attacker=unit("Sword Brethren Squad"), profile=weapon(melee=True),
            attacker_detachment_name="Marshal's Household", attacker_on_objective=False,
        )
        self.assertEqual(active["melee_attack_bonus"], 1)
        self.assertEqual(inactive["melee_attack_bonus"], 0)

    def test_great_wolf_doctrine_attack_effects(self):
        devastator = self.context(
            attacker_detachment_name="Saga of the Great Wolf", attacker_combat_doctrine="devastator",
        )
        tactical = self.context(
            attacker_detachment_name="Saga of the Great Wolf", attacker_combat_doctrine="tactical",
            attacker_target_within_12=True,
        )
        self.assertTrue(devastator["reroll_hit_rolls_of_1"])
        self.assertIn("SH1", tactical["temporary_weapon_keywords"])

    def test_vehicle_and_champions_enhancements(self):
        gunnery = self.context(
            attacker=unit("Tank", ["adeptus astartes", "vehicle"]),
            attacker_enhancement_name="Gunnery Honours", attacker_enhancement_bearer_name="Tank",
        )
        giant = self.context(
            attacker=unit("Wolf Lord"), profile=weapon(melee=True),
            attacker_enhancement_name="A Giant Amongst Giants",
            attacker_enhancement_bearer_name="Wolf Lord",
        )
        self.assertIn("Heavy", gunnery["temporary_ranged_weapon_keywords"])
        self.assertEqual(giant["melee_strength_bonus"], 1)

    def test_forward_assault_warsuit_mark(self):
        marked = self.context(attacker_active_ability_names=["Forward Assault Warsuit"])
        self.assertTrue(marked["reroll_wound_rolls_of_1"])

    def test_implemented_flags_match_new_wiring(self):
        expected = {
            "Adeptus_Astartes.json": {"Gunnery Honours", "Strike from the Shadows"},
            "Black_Templars.json": {"Faith-fuelled Resolve", "Slayers of Abominations"},
            "Blood_Angels.json": {"Legacy of the Angel"},
            "Imperial_Fists.json": {"Adaptive Defence"},
            "Space_Wolves.json": {"Master of Wolves", "A Giant Amongst Giants"},
        }
        for filename, names in expected.items():
            data = json.loads(Path(filename).read_text(encoding="utf-8"))["faction"]
            entries = []
            for detachment in data["detachments"]:
                entries.extend([detachment.get("rule", {}), *detachment.get("additional_rules", [])])
                entries.extend(detachment.get("enhancements", []))
                entries.extend(detachment.get("stratagems", []))
            flags = {entry.get("name"): entry.get("implemented") for entry in entries}
            for name in names:
                with self.subTest(file=filename, rule=name):
                    self.assertTrue(flags[name])


if __name__ == "__main__":
    unittest.main()
