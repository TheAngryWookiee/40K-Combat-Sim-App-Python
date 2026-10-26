import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class ImperialFistsUnitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = json.loads(Path("Imperial_Fists.json").read_text(encoding="utf-8"))
        cls.raw_units = {unit["name"]: unit for unit in raw["units"]}
        cls.loaded_units = load_factions()["Imperial Fists"]["units"]

    def test_updated_specific_roster(self):
        self.assertEqual(set(self.raw_units), {"Darnath Lysander", "Tor Garadon"})
        self.assertIn("Intercessor Squad", self.loaded_units)

    def test_profiles_points_and_leaders(self):
        lysander = self.raw_units["Darnath Lysander"]
        garadon = self.raw_units["Tor Garadon"]

        self.assertEqual(lysander["points"], 160)
        self.assertEqual(lysander["stats"]["toughness"], 6)
        self.assertEqual(lysander["weapons"][0]["strength"], "10")
        self.assertEqual(garadon["points"], 90)
        self.assertIn("Eradicator Squad with Heavy Bolters", garadon["leader"]["can_lead"])
        self.assertIn("Eradicator Squad with Melta Rifles", garadon["leader"]["can_lead"])

    def test_updated_army_rules(self):
        for name in ("Darnath Lysander", "Tor Garadon"):
            rules = [ability["rules_text"] for ability in self.raw_units[name]["abilities"]]
            self.assertIn("Combat Doctrines", rules)
            self.assertIn("Transhuman Strategist", rules)

    def test_icon_of_obstinacy_and_rampart(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units["Intercessor Squad"])
        profile = next(iter(attacker["weapons"].values()))
        target = engine.build_target_state(copy.deepcopy(self.loaded_units["Darnath Lysander"]))

        context = engine.build_attack_context(
            attacker, profile, target, {"defender_active_ability_names": ["Rampart"]}, None, False,
        )
        self.assertEqual(context["attacker_hit_modifier"], -1)
        self.assertEqual(context["target_incoming_wound_modifier"], 0)
        self.assertEqual(context["target_invulnerable_save"], 2)

    def test_siege_captain_and_signum_array(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = copy.deepcopy(self.loaded_units["Tor Garadon"])
        profile = attacker["weapons"]["Artificer grav-gun"]
        target = {
            "name": "Vehicle", "keywords": ["vehicle"], "models": 1, "toughness": 10,
            "wounds": 12, "armor_save": 3, "invulnerable_save": 0, "effects": [],
            "abilities": [], "weapons": {}, "has_cover": True,
        }
        target_state = engine.build_target_state(target)
        context = engine.build_attack_context(attacker, profile, target_state, {}, None, False)

        self.assertEqual(context["ranged_strength_bonus"], 2)
        self.assertEqual(context["ranged_damage_bonus"], 2)
        self.assertEqual(context["attacker_ap_modifier"], 2)
        self.assertIn("Ignores Cover", context["temporary_weapon_keywords_by_weapon_name"]["artificer grav-gun"])


if __name__ == "__main__":
    unittest.main()
