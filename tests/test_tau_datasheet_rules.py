import copy
import unittest

from combat_engine import CombatSimulator


def ability(name):
    return {"name": name, "rules_text": "", "implemented": True}


def unit(name="T'au Unit", keywords=None, abilities=None):
    return {
        "name": name,
        "keywords": keywords or ["t'au empire", "infantry"],
        "models": 1,
        "toughness": 5,
        "wounds": 5,
        "armor_save": 3,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": abilities or [],
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


class TauDatasheetRulesTests(unittest.TestCase):
    def context(self, attacker=None, target=None, profile=None, active=(), defender_active=(), **options):
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
                **options,
            },
            None,
            False,
        )

    def test_leader_attack_buffs(self):
        attacker = unit(abilities=[ability("Volley Fire"), ability("Coldstar Commander")])
        context = self.context(attacker=attacker, attacker_has_attached_character=True)
        self.assertEqual(context["ranged_attack_bonus"], 1)
        self.assertIn("Assault", context["temporary_ranged_weapon_keywords"])

    def test_conditional_hit_and_wound_rules(self):
        vehicle = unit("Target", ["vehicle"])
        armour_hunter = self.context(active=["Armour Hunter"], target=vehicle)
        short_blade = self.context(active=["Way of the Short Blade"], target_within_12=True)
        self.assertEqual(armour_hunter["attacker_hit_modifier"], 1)
        self.assertEqual(short_blade["attacker_outgoing_wound_modifier"], 1)

    def test_crisis_rules(self):
        fireknife = self.context(attacker=unit(abilities=[ability("Fireknife")]))
        starscythe = self.context(attacker=unit(abilities=[ability("Starscythe")]))
        sunforge = self.context(active=["Sunforge"], target=unit("Tank", ["vehicle"]))
        self.assertTrue(fireknife["reroll_all_hit_rolls"])
        self.assertEqual(starscythe["attacker_ap_modifier"], 1)
        self.assertTrue(sunforge["reroll_all_wound_rolls"])
        self.assertTrue(sunforge["reroll_damage_rolls"])

    def test_guidance_and_spotted_target_rules(self):
        uploaded = self.context(active=["Target Uploaded"])
        observers = self.context(active=["Forward Observers"])
        coordinated = self.context(active=["Coordinated Strike"])
        self.assertEqual(uploaded["attacker_skill_modifier"], 1)
        self.assertIn("Ignores Cover", uploaded["temporary_ranged_weapon_keywords"])
        self.assertTrue(observers["reroll_hit_rolls_of_1"])
        self.assertTrue(observers["reroll_wound_rolls_of_1"])
        self.assertTrue(coordinated["reroll_hit_rolls_of_1"])

    def test_defensive_systems(self):
        enforcer = unit("Target", ["vehicle"], [ability("Enforcer Commander")])
        context = self.context(
            target=enforcer,
            defender_active=["Shield Generator", "Stealth Drones"],
            defender_has_attached_character=True,
        )
        self.assertEqual(context["attacker_ap_modifier"], -1)
        self.assertEqual(context["target_invulnerable_save"], 4)
        self.assertEqual(context["target_damage_max"], 0)

    def test_nova_charge_and_twin_lance(self):
        nova = self.context(active=["Nova Charge"])
        twin_lance = self.context(active=["Exemplars of Mont’ka"])
        self.assertIn("DW", nova["temporary_weapon_keywords"])
        self.assertIn("SH1", twin_lance["temporary_ranged_weapon_keywords"])
        self.assertIn("Ignores Cover", twin_lance["temporary_ranged_weapon_keywords"])


if __name__ == "__main__":
    unittest.main()
