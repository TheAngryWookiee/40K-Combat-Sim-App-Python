import copy
import unittest

from combat_engine import CombatSimulator
from data_loader import apply_unit_loadout, load_factions


class AeldariDatasheetRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Aeldari"]["units"]

    def context(self, attacker_name, target_name, weapon_name=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = apply_unit_loadout(self.units[attacker_name])
        weapon = (
            attacker["weapons"][weapon_name]
            if weapon_name
            else next(iter(attacker["weapons"].values()))
        )
        target = engine.build_target_state(copy.deepcopy(self.units[target_name]))
        return engine.build_attack_context(attacker, weapon, target, options, None, False)

    def test_hand_of_asuryan_updates_bloody_twins(self):
        context = self.context(
            "Asurmen",
            "Guardian Defenders",
            "Bloody Twins",
            attacker_active_ability_names=["Hand of Asuryan"],
        )
        keywords = context["temporary_weapon_keywords_by_weapon_name"]["bloody twins"]
        self.assertIn("Anti-Infantry 3+", keywords)
        self.assertIn("DW", keywords)
        self.assertEqual(context["ranged_damage_bonus"], 1)

    def test_assured_destruction_rerolls_monster_attacks(self):
        context = self.context("Fire Dragons", "Wraithlord", "Dragon fusion gun")
        self.assertTrue(context["reroll_all_hit_rolls"])
        self.assertTrue(context["reroll_all_wound_rolls"])
        self.assertTrue(context["reroll_damage_rolls"])

    def test_bladestorm_requires_half_range(self):
        normal = self.context("Dire Avengers", "Guardian Defenders", "Avenger shuriken catapult")
        close = self.context(
            "Dire Avengers",
            "Guardian Defenders",
            "Avenger shuriken catapult",
            in_half_range=True,
        )
        self.assertNotIn("SH1", normal["temporary_weapon_keywords_by_weapon_name"].get("avenger shuriken catapult", set()))
        self.assertIn("SH1", close["temporary_weapon_keywords_by_weapon_name"]["avenger shuriken catapult"])

    def test_wave_serpent_shield_reduces_high_strength_wound_roll(self):
        context = self.context("D-Cannon Platform", "Wave Serpent", "D-cannon")
        self.assertEqual(context["target_incoming_wound_modifier"], -1)

    def test_crystal_matrix_grants_one_hit_and_wound_reroll(self):
        engine = CombatSimulator(seed=1)
        state = engine.build_sequence_state({"attacker_active_ability_names": ["Crystal Matrix"]})
        self.assertEqual(state["remaining_hit_rerolls"], 1)
        self.assertEqual(state["remaining_wound_rerolls"], 1)


if __name__ == "__main__":
    unittest.main()
