import copy
import unittest

from combat_engine import CombatSimulator


def unit(name="T'au Unit", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["t'au empire", "infantry"],
        "models": 5,
        "toughness": 5,
        "wounds": 3,
        "armor_save": 4,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "weapons": {},
    }


def weapon(name="Pulse rifle", ranged=True):
    return {
        "name": name,
        "range": '30"' if ranged else "Melee",
        "attacks": 2,
        "skill": 4,
        "strength": 5,
        "ap": 0,
        "damage": 1,
        "keywords": [],
        "raw_keywords": [],
    }


class TauDetachmentRulesTests(unittest.TestCase):
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

    def test_kauyon_and_montka_modes(self):
        kauyon = self.context(["Patient Hunter - Guided"])
        montka = self.context(["Killing Blow - Guided"])
        self.assertIn("SH1", kauyon["temporary_ranged_weapon_keywords"])
        self.assertTrue(kauyon["ignore_negative_hit_modifiers"])
        self.assertIn("Assault", montka["temporary_ranged_weapon_keywords"])
        self.assertIn("LH", montka["temporary_ranged_weapon_keywords"])

    def test_retaliation_distance_bands_require_battlesuit(self):
        battlesuit = unit(keywords=["t'au empire", "battlesuit"])
        close = self.context(["Bonded Heroes - Within 8"], attacker=battlesuit)
        invalid = self.context(["Bonded Heroes - Within 8"])
        self.assertEqual(close["ranged_strength_bonus"], 1)
        self.assertEqual(close["attacker_ap_modifier"], 1)
        self.assertEqual(invalid["ranged_strength_bonus"], 0)

    def test_kroot_rules_and_defensive_save(self):
        kroot = unit(keywords=["t'au empire", "kroot", "infantry"])
        attack = self.context(
            ["Hunter Instincts"], attacker=kroot,
            target_below_starting_strength=True, target_below_half_strength=True,
        )
        defence = self.context(defender_active=["Skirmish Fighters"], target=kroot)
        self.assertEqual(attack["attacker_hit_modifier"], 1)
        self.assertEqual(attack["attacker_outgoing_wound_modifier"], 1)
        self.assertEqual(defence["target_invulnerable_save"], 5)

    def test_stratagem_defences(self):
        context = self.context(defender_active=["Counterfire Defence Systems", "Stimm Injectors", "Autoreactive Camouflage"])
        self.assertEqual(context["target_damage_modifier"], -1)
        self.assertEqual(context["target_feel_no_pain"], 6)
        self.assertEqual(context["target_armor_save_modifier"], -1)

    def test_prototype_weapon_upgrades_are_profile_specific(self):
        flamer = self.context(["Thermoneutronic Projector"], profile=weapon("T'au flamer"))
        pulse = self.context(["Thermoneutronic Projector"])
        plasma = self.context(["Plasma Accelerator Rifle"], profile=weapon("Plasma rifle"))
        self.assertEqual((flamer["ranged_strength_bonus"], flamer["ranged_damage_bonus"], flamer["attacker_ap_modifier"]), (2, 1, 1))
        self.assertEqual(pulse["ranged_strength_bonus"], 0)
        self.assertEqual(plasma["ranged_attack_bonus"], 1)

    def test_arrokon_and_prototype_choices(self):
        context = self.context(["The Arro'kon Protocol - 11+ Models", "Prototype Weapon System - Lethal Hits"])
        self.assertIn("SH2", context["temporary_ranged_weapon_keywords"])
        self.assertIn("LH", context["temporary_ranged_weapon_keywords"])


if __name__ == "__main__":
    unittest.main()
