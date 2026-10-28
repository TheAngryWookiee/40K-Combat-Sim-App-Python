import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator


def unit(name="Custodian Guard", keywords=None):
    return {
        "name": name,
        "keywords": keywords or ["adeptus custodes", "infantry"],
        "models": 1,
        "toughness": 6,
        "wounds": 3,
        "armor_save": 2,
        "invulnerable_save": 4,
        "effects": [],
        "abilities": [{"name": "Faction", "rules_text": "Martial Ka'tah"}],
        "weapons": {},
    }


def weapon(melee=True):
    return {
        "name": "Guardian spear",
        "range": "Melee" if melee else '24"',
        "attacks": 5,
        "skill": 2,
        "strength": 7,
        "ap": -2,
        "damage": 2,
        "keywords": [],
        "raw_keywords": [],
    }


class CustodesArmyRuleTests(unittest.TestCase):
    def context(self, profile, target_keywords=None, **options):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit()
        attacker["weapons"] = {profile["name"]: profile}
        target = unit("Target", target_keywords or ["infantry"])
        return engine.build_attack_context(attacker, profile, engine.build_target_state(copy.deepcopy(target)), options, None, False)

    def test_army_rule_payload_is_replaced(self):
        rules = json.loads(Path("Adeptus_Custodes.json").read_text(encoding="utf-8"))["faction"]["army_rules"]
        self.assertEqual([rule["name"] for rule in rules], ["Martial Ka'tah", "Aegis of the Emperor", "Aquila Commander", "Daughters of the Abyss", "Anathema Psykana", "Special Move Types"])
        self.assertEqual([option["name"] for option in rules[0]["options"]], ["Conservai", "Calistus", "Salvis", "Dacatarai", "Kaptaris", "Rendax"])

    def test_new_detachments_replace_the_old_catalog(self):
        detachments = json.loads(Path("Adeptus_Custodes.json").read_text(encoding="utf-8"))["faction"]["detachments"]
        self.assertEqual([item["name"] for item in detachments], ["Auric Champions", "Lions of the Emperor", "Might of the Moritoi", "Null Maiden Vigil"])
        self.assertTrue(all(item["detachment_points"] == 1 for item in detachments))

    def test_dacatarai_rerolls_melee_hit_rolls_of_one_against_infantry(self):
        context = self.context(weapon(), attacker_martial_katah="dacatarai")
        self.assertTrue(context["reroll_hit_rolls_of_1"])
        monster = self.context(weapon(), ["monster"], attacker_martial_katah="dacatarai")
        self.assertFalse(monster["reroll_hit_rolls_of_1"])

    def test_rendax_is_conditional_lethal_hits(self):
        context = self.context(weapon(), attacker_martial_katah="rendax")
        applied = context["temporary_weapon_keywords_by_weapon_name"]["guardian spear"]
        self.assertIn("LH: MONSTER/VEHICLE", applied)

    def test_kaptaris_penalizes_incoming_melee_hits(self):
        context = self.context(weapon(), defender_martial_katah="kaptaris")
        self.assertEqual(context["attacker_hit_modifier"], -1)

    def test_aegis_grants_five_plus_feel_no_pain_against_mortal_wounds(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit("Attacker", ["infantry"])
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target = unit()
        target["abilities"].append({"name": "Aegis of the Emperor", "rules_text": "Feel No Pain 5+ against mortal wounds."})

        context = engine.build_attack_context(
            attacker,
            profile,
            engine.build_target_state(target),
            {},
            None,
            False,
        )

        self.assertEqual(context["target_mortal_feel_no_pain"], 5)

    def test_moritoi_dreadnought_rerolls_when_damaged(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit("Contemptor", ["adeptus custodes", "vehicle", "dreadnought"])
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        context = engine.build_attack_context(attacker, profile, engine.build_target_state(unit("Target", ["vehicle"])), {"attacker_detachment_name": "Might of the Moritoi", "attacker_below_starting_strength": True, "attacker_below_half_strength": True}, None, False)
        self.assertTrue(context["reroll_hit_rolls_of_1"])
        self.assertTrue(context["reroll_wound_rolls_of_1"])

    def test_memento_moritoi_improves_melee_profile(self):
        context = self.context(weapon(), attacker_enhancement_name="Memento Moritoi", attacker_enhancement_bearer_name="Custodian Guard")
        self.assertEqual(context["melee_attack_bonus"], 1)
        self.assertEqual(context["melee_strength_bonus"], 1)
        self.assertEqual(context["melee_damage_bonus"], 1)

    def test_charge_and_objective_datasheet_keywords(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit("Vertus Praetors", ["adeptus custodes", "mounted"])
        attacker["abilities"].append({"name": "Quicksilver Execution", "rules_text": ""})
        profile = weapon()
        attacker["weapons"] = {profile["name"]: profile}
        context = engine.build_attack_context(attacker, profile, engine.build_target_state(unit("Target", ["infantry"])), {"charged_this_turn": True}, None, False)
        self.assertIn("SH1", context["temporary_melee_weapon_keywords"])

    def test_unyielding_ancient_reduces_high_strength_wound_rolls(self):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        attacker = unit("Attacker", ["infantry"])
        profile = weapon()
        profile["strength"] = 12
        attacker["weapons"] = {profile["name"]: profile}
        target = unit("Contemptor", ["vehicle", "dreadnought"])
        target["toughness"] = 10
        target["abilities"].append({"name": "Unyielding Ancient", "rules_text": ""})
        context = engine.build_attack_context(attacker, profile, engine.build_target_state(target), {}, None, False)
        self.assertEqual(context["attacker_outgoing_wound_modifier"], -1)


if __name__ == "__main__":
    unittest.main()
