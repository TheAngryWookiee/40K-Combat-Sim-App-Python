import copy
import unittest

from combat_engine import CombatSimulator
from data_loader import apply_unit_loadout, load_factions


class DrukhariDatasheetRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()["Drukhari"]["units"]

    def context(self, attacker_name, target_name, weapon_name, active=(), defender_active=(), **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = apply_unit_loadout(self.units[attacker_name])
        weapon = attacker["weapons"][weapon_name]
        target = engine.build_target_state(copy.deepcopy(self.units[target_name]))
        return engine.build_attack_context(
            attacker,
            weapon,
            target,
            {
                "attacker_active_ability_names": list(active),
                "defender_active_ability_names": list(defender_active),
                **options,
            },
            None,
            False,
        )

    def test_archon_pain_and_soul_trap_modes(self):
        base = self.context("Archon", "Wracks", "Huskblade", ["Hatred Eternal (Pain)"])
        fed = self.context("Archon", "Wracks", "Huskblade", ["Soul Trap - Fed"])
        self.assertTrue(base["reroll_all_hit_rolls"])
        self.assertEqual((base["melee_attack_bonus"], base["melee_strength_bonus"]), (1, 1))
        self.assertEqual((fed["melee_attack_bonus"], fed["melee_strength_bonus"]), (2, 2))

    def test_death_jester_modes_only_modify_shrieker_cannon(self):
        context = self.context(
            "Death Jester",
            "Wracks",
            "Shrieker cannon",
            ["Cruel Amusement - Sustained Hits 3"],
        )
        self.assertIn("Sustained Hits 3", context["temporary_weapon_keywords_by_weapon_name"]["shrieker cannon"])

    def test_pain_melee_buffs_and_battleshock_gate(self):
        lelith = self.context("Lelith Hesperax", "Wracks", "Lelith's blades", ["Brides of Death (Pain)"])
        incubi = self.context(
            "Incubi", "Wracks", "Klaive", ["Tormentors", "Decapitating Strikes (Pain)"],
            defender_battleshocked=True,
        )
        self.assertEqual((lelith["melee_strength_bonus"], lelith["attacker_ap_modifier"]), (1, 1))
        self.assertEqual(incubi["attacker_hit_modifier"], 1)
        self.assertIn("DW", incubi["temporary_weapon_keywords_by_weapon_name"]["klaive"])

    def test_ranged_pain_rules_apply_their_conditions(self):
        scourges = self.context(
            "Scourges with Heavy Weapons", "Talos", "Dark lance", ["Winged Strike (Pain)"]
        )
        jet = self.context("Razorwing Jetfighter", "Wracks", "Dark lance")
        ravager = self.context("Ravager", "Talos", "Dark lance")
        self.assertTrue(scourges["reroll_all_hit_rolls"])
        self.assertEqual(jet["attacker_hit_modifier"], 1)
        self.assertTrue(ravager["reroll_all_hit_rolls"])

    def test_troupe_and_suppression_defensive_modes(self):
        troupe = self.context(
            "Archon", "Troupe", "Huskblade", defender_active=["Dance of Death - Trickster's Grace"]
        )
        suppressed = self.context(
            "Archon", "Ravager", "Blast pistol", defender_active=["Agonising Suppression (Pain)"]
        )
        self.assertEqual(troupe["attacker_hit_modifier"], -1)
        self.assertEqual(suppressed["attacker_hit_modifier"], -1)

    def test_nowhere_to_hide_and_treacherous_illusion(self):
        no_cover = self.context(
            "Voidraven Bomber", "Wracks", "Void lance", ["Nowhere to Hide (Pain)"], target_has_cover=True
        )
        illusion = self.context("Archon", "Shadowseer", "Huskblade")
        self.assertFalse(no_cover["target_has_cover"])
        self.assertIn("Hazardous", illusion["temporary_weapon_keywords_by_weapon_name"]["huskblade"])


if __name__ == "__main__":
    unittest.main()
