import copy
import json
import unittest
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


class TauEmpireTests(unittest.TestCase):
    def test_faction_and_army_rule_are_available(self):
        faction = load_factions()["T'au Empire"]
        self.assertEqual(faction["category"], "Xenos")
        self.assertEqual(len(faction["units"]), 43)
        self.assertEqual(len(faction["detachments"]), 7)
        rule = faction["army_rules"][0]
        self.assertEqual(rule["name"], "For the Greater Good")
        self.assertTrue(rule["implemented"])
        self.assertEqual(len(rule["options"]), 2)

    def context(self, active):
        engine = CombatSimulator(seed=1)
        engine.stats = engine.build_empty_stats()
        weapon = {
            "name": "Pulse weapon",
            "range": '30"',
            "attacks": 2,
            "skill": 4,
            "strength": 5,
            "ap": 0,
            "damage": 1,
            "keywords": [],
            "raw_keywords": [],
        }
        attacker = {
            "name": "T'au Unit",
            "keywords": ["t'au empire", "infantry"],
            "models": 1,
            "toughness": 3,
            "wounds": 1,
            "armor_save": 4,
            "invulnerable_save": 0,
            "effects": [],
            "abilities": [],
            "weapons": {weapon["name"]: weapon},
        }
        target = copy.deepcopy(attacker)
        target["name"] = "Target"
        return engine.build_attack_context(
            attacker,
            weapon,
            engine.build_target_state(target),
            {"attacker_active_ability_names": [active]},
            None,
            False,
        )

    def test_guided_unit_improves_ballistic_skill(self):
        context = self.context("For the Greater Good - Guided")
        self.assertEqual(context["attacker_skill_modifier"], 1)
        self.assertNotIn("Ignores Cover", context["temporary_ranged_weapon_keywords"])

    def test_markerlight_guidance_also_ignores_cover(self):
        context = self.context("For the Greater Good - Guided by Markerlight")
        self.assertEqual(context["attacker_skill_modifier"], 1)
        self.assertIn("Ignores Cover", context["temporary_ranged_weapon_keywords"])

    def test_drones_are_shared_wargear_not_independent_units(self):
        faction = load_factions()["T'au Empire"]
        self.assertNotIn("Guardian Drone", faction["units"])
        self.assertNotIn("Gun Drone", faction["units"])
        drones = {item["name"]: item for item in faction["shared_wargear"]}
        self.assertEqual(
            set(drones),
            {"Guardian Drone", "Gun Drone", "Marker Drone", "Missile Drone", "Shield Drone"},
        )
        self.assertEqual(drones["Gun Drone"]["weapons"][0]["name"], "Twin pulse carbine")
        self.assertEqual(drones["Missile Drone"]["weapons"][0]["damage"], 2)

    def test_character_datasheets_are_available(self):
        units = load_factions()["T'au Empire"]["units"]
        raw_units = {
            unit["name"]: unit
            for unit in json.loads(Path("Tau_Empire.json").read_text(encoding="utf-8"))["units"]
        }
        self.assertTrue({
            "Cadre Fireblade", "Commander Farsight", "Commander in Coldstar Battlesuit",
            "Commander in Enforcer Battlesuit", "Commander Shadowsun", "Darkstrider",
            "Ethereal", "Firesight Team", "Kroot Flesh Shaper", "Kroot Lone-Spear",
            "Kroot Trail Shaper", "Kroot War Shaper", "The Twin Lance",
        }.issubset(units))
        self.assertEqual(raw_units["Commander Farsight"]["points"]["1 model"], 70)
        self.assertIn("Crisis Fireknife Battlesuits", units["Commander Farsight"]["leader"]["can_lead"])
        self.assertEqual(units["Commander in Coldstar Battlesuit"]["stats"]["movement"], '12"')
        self.assertIn("Kroot", units["Kroot War Shaper"]["display_keywords"])

    def test_twin_lance_uses_two_model_composition(self):
        unit = load_factions()["T'au Empire"]["units"]["The Twin Lance"]
        raw_unit = next(
            unit
            for unit in json.loads(Path("Tau_Empire.json").read_text(encoding="utf-8"))["units"]
            if unit["name"] == "The Twin Lance"
        )
        self.assertEqual(unit["unit_composition"]["min_models"], 2)
        self.assertEqual(unit["unit_composition"]["max_models"], 2)
        self.assertEqual(raw_unit["points"]["2 models"], 240)
        self.assertTrue(any("Ri’Lantar is equipped with" in note for note in unit["notes"]))

    def test_second_unit_batch_is_available(self):
        units = load_factions()["T'au Empire"]["units"]
        expected = {
            "AX-1-0 Tiger Shark", "Breacher Team", "Devilfish", "Kroot Carnivores",
            "Kroot Farstalkers", "Kroot Hounds", "Manta", "Pathfinder Team",
            "Razorshark Strike Fighter", "Stealth Battlesuits", "Strike Team",
            "Sun Shark Bomber", "Tiger Shark",
        }
        self.assertTrue(expected.issubset(units))

    def test_second_batch_composition_transport_and_costs(self):
        units = load_factions()["T'au Empire"]["units"]
        raw_units = {
            unit["name"]: unit
            for unit in json.loads(Path("Tau_Empire.json").read_text(encoding="utf-8"))["units"]
        }
        self.assertEqual(units["Kroot Carnivores"]["unit_composition"]["min_models"], 10)
        self.assertEqual(units["Kroot Carnivores"]["unit_composition"]["max_models"], 20)
        self.assertEqual(units["Kroot Farstalkers"]["models"], 12)
        self.assertEqual(len(units["Kroot Farstalkers"]["models_data"]), 2)
        self.assertIn("12 T’AU EMPIRE INFANTRY", units["Devilfish"]["transport"])
        self.assertEqual(raw_units["Pathfinder Team"]["wargear_costs"]["Ion rifle"], 5)
        self.assertEqual(raw_units["Tiger Shark"]["points"]["1 model - 2nd+ unit"], 445)

    def test_final_unit_batch_is_available(self):
        units = load_factions()["T'au Empire"]["units"]
        expected = {
            "Vespid Stingwings", "Krootox Rampagers", "Krootox Riders", "Stormsurge",
            "T'au'nar Supremacy Armour", "Hammerhead Gunship", "Piranhas",
            "Sky Ray Gunship", "Broadside Battlesuits", "Crisis Fireknife Battlesuits",
            "Crisis Starscythe Battlesuits", "Crisis Sunforge Battlesuits",
            "Ghostkeel Battlesuit", "Riptide Battlesuit", "Tidewall Droneport",
            "Tidewall Gunrig", "Tidewall Shieldline",
        }
        self.assertEqual(len(units), 43)
        self.assertTrue(expected.issubset(units))

    def test_final_batch_profiles_and_costs_are_preserved(self):
        units = load_factions()["T'au Empire"]["units"]
        raw_units = {
            unit["name"]: unit
            for unit in json.loads(Path("Tau_Empire.json").read_text(encoding="utf-8"))["units"]
        }
        self.assertEqual(units["Vespid Stingwings"]["unit_composition"]["max_models"], 10)
        self.assertIn("Pulse blast cannon - focused", units["Stormsurge"]["weapons"])
        self.assertEqual(units["Crisis Sunforge Battlesuits"]["invulnerable_save"], 4)
        self.assertEqual(units["Tidewall Shieldline"]["unit_composition"]["max_models"], 2)
        self.assertEqual(raw_units["Piranhas"]["points"]["3 models - 3rd+ unit"], 175)
        self.assertEqual(raw_units["Broadside Battlesuits"]["wargear_costs"]["per High-yield missile pods"], 5)

    def test_initial_detachments_are_preserved(self):
        detachments = {
            detachment["name"]: detachment
            for detachment in load_factions()["T'au Empire"]["detachments"]
        }
        self.assertTrue(
            {"Kauyon", "Mont'ka", "Retaliation Cadre", "Kroot Hunting Pack"}.issubset(detachments),
        )
        initial = [detachments[name] for name in ("Kauyon", "Mont'ka", "Retaliation Cadre", "Kroot Hunting Pack")]
        self.assertTrue(all(len(detachment["enhancements"]) == 4 for detachment in initial))
        self.assertTrue(all(len(detachment["stratagems"]) == 6 for detachment in initial))
        self.assertEqual(detachments["Kauyon"]["rule"]["name"], "Patient Hunter")
        self.assertEqual(detachments["Mont'ka"]["rule"]["name"], "Killing Blow")
        self.assertIn("within 12", detachments["Retaliation Cadre"]["rule"]["rules_text"])
        self.assertEqual(
            detachments["Kroot Hunting Pack"]["additional_rules"][0]["name"],
            "Skirmish Fighters",
        )

    def test_compact_detachments_are_preserved(self):
        detachments = {
            detachment["name"]: detachment
            for detachment in load_factions()["T'au Empire"]["detachments"]
        }
        acquisition = detachments["Advanced Acquisition Cadre"]
        self.assertEqual(acquisition["rule"]["name"], "Expert Fieldcraft")
        self.assertEqual(len(acquisition["enhancements"]), 2)
        self.assertEqual(len(acquisition["stratagems"]), 3)

        auxiliary = detachments["Auxiliary Cadre"]
        self.assertEqual(auxiliary["additional_rules"][0]["name"], "Harnessed Alien Instincts")
        self.assertIn("AUXILIARIES", auxiliary["restrictions"][0])

        prototype = detachments["Experimental Prototype Cadre"]
        self.assertEqual(len(prototype["enhancements"]), 3)
        self.assertEqual(prototype["stratagems"][0]["name"], "Experimental Ammunition")


if __name__ == "__main__":
    unittest.main()
