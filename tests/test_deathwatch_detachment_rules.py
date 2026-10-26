import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator


def unit(name="Kill Team", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["adeptus astartes", "infantry", "kill team"],
        "models": 5,
        "toughness": 4,
        "wounds": 2,
        "armor_save": 3,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [{"name": "Combat Doctrines", "rules_text": "Combat Doctrines"}],
        "weapons": {},
    }


def weapon():
    return {
        "name": "Bolt rifle",
        "range": '24"',
        "attacks": 2,
        "skill": 3,
        "strength": 4,
        "ap": -1,
        "damage": 1,
        "keywords": [],
        "raw_keywords": [],
    }


class DeathwatchDetachmentRulesTests(unittest.TestCase):
    def context(self, attacker=None, target=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(attacker or unit())
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target_state = engine.build_target_state(copy.deepcopy(target or unit("Target", ["infantry"])))
        context = engine.build_attack_context(
            attacker,
            profile,
            target_state,
            {"attacker_detachment_name": "Black Spear Task Force", **options},
            None,
            False,
        )
        return engine, profile, target_state, context

    def test_payload_matches_current_detachment(self):
        faction = json.loads(Path("Deathwatch.json").read_text(encoding="utf-8"))["faction"]
        detachment = faction["detachments"][0]

        self.assertEqual(detachment["name"], "Black Spear Task Force")
        self.assertEqual(detachment["detachment_points"], 3)
        self.assertEqual(detachment["rule"]["name"], "Mission Tactics")
        self.assertEqual(
            [(entry["name"], entry["points"]) for entry in detachment["enhancements"]],
            [
                ("The Thief of Secrets", 10),
                ("Beacon Angelis", 25),
                ("The Tome of Ectoclades", 15),
                ("Osseus Key (Aura)", 20),
            ],
        )
        self.assertEqual(len(detachment["stratagems"]), 6)

    def test_mission_tactics_follow_active_doctrine(self):
        _, _, _, furor = self.context(attacker_combat_doctrine="devastator")
        _, _, _, malleus = self.context(attacker_combat_doctrine="tactical")
        _, _, _, purgatus = self.context(
            attacker_combat_doctrine="assault", attacker_target_within_9=True,
        )

        self.assertIn("SH1", furor["temporary_weapon_keywords"])
        self.assertIn("LH", malleus["temporary_weapon_keywords"])
        self.assertIn("Precision", purgatus["temporary_weapon_keywords"])

    def test_mission_tactics_require_kill_team(self):
        marine = unit("Intercessors", ["adeptus astartes", "infantry"])
        _, _, _, context = self.context(attacker=marine, attacker_combat_doctrine="devastator")
        self.assertNotIn("SH1", context["temporary_weapon_keywords"])

    def test_special_issue_ammunition(self):
        _, _, _, kraken = self.context(attacker_kraken_rounds_active=True)
        _, _, _, dragonfire = self.context(attacker_dragonfire_rounds_active=True)
        _, _, _, hellfire = self.context(attacker_hellfire_rounds_active=True)

        self.assertEqual(kraken["ranged_strength_bonus"], 1)
        self.assertTrue(dragonfire["reroll_wound_rolls_of_1"])
        self.assertIn(
            "Ignores Cover", dragonfire["temporary_weapon_keywords_by_weapon_name"]["bolt rifle"],
        )
        self.assertIn(
            "Anti-Non-Vehicle 4+", hellfire["temporary_weapon_keywords_by_weapon_name"]["bolt rifle"],
        )

    def test_anti_non_vehicle_excludes_vehicles(self):
        engine, profile, infantry, context = self.context(attacker_hellfire_rounds_active=True)
        self.assertEqual(engine.apply_anti_rule(4, profile, infantry, context), 6)

        vehicle = engine.build_target_state(unit("Vehicle", ["vehicle"]))
        self.assertEqual(engine.apply_anti_rule(4, profile, vehicle, context), 4)


if __name__ == "__main__":
    unittest.main()
