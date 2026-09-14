import copy
import json
import unittest
from unittest.mock import patch
from pathlib import Path

from combat_engine import CombatSimulator
from data_loader import load_factions


def unit(name="Berzerkers", keywords=None, models=1):
    return {
        "name": name, "keywords": keywords or ["world eaters", "infantry"],
        "models": models, "toughness": 5, "wounds": 5, "armor_save": 3,
        "invulnerable_save": 0, "effects": [], "abilities": [], "weapons": {},
    }


def weapon(name="Chainblade", ranged=False, keywords=None):
    return {"name": name, "range": '24"' if ranged else "Melee", "attacks": 2,
            "skill": 3, "strength": 5, "ap": 1, "damage": 3, "keywords": keywords or []}


class WorldEatersCombatTests(unittest.TestCase):
    def setUp(self):
        self.engine = CombatSimulator(seed=1)
        self.engine.stats = self.engine.build_empty_stats()

    def context(self, detachment="", active=(), defender_detachment="", defender_active=(),
                attacker=None, target=None, profile=None, **options):
        attacker = copy.deepcopy(attacker or unit())
        profile = profile or weapon()
        attacker["weapons"] = {profile["name"]: profile}
        target_state = self.engine.build_target_state(target or unit("Target"))
        opts = {"attacker_detachment_name": detachment, "attacker_active_ability_names": list(active),
                "defender_detachment_name": defender_detachment, "defender_active_ability_names": list(defender_active),
                **options}
        self.engine.apply_detachment_target_stat_modifiers(target_state, opts)
        return self.engine.build_attack_context(attacker, profile, target_state, opts, None, False), target_state

    def test_charge_and_glaive_are_melee_and_bearer_scoped(self):
        options = dict(attacker_enhancement_name="BERZERKER GLAIVE", attacker_enhancement_bearer_name="Lord")
        lord = unit("Lord", ["world eaters", "character"])
        context, _ = self.context("BERZERKER WARBAND", ["HACK AND SLASH"], attacker=lord, charged_this_turn=True, **options)
        self.assertEqual((context['melee_attack_bonus'], context['melee_strength_bonus'], context['melee_damage_bonus'], context['attacker_ap_modifier']), (2, 2, 1, 1))
        extra, _ = self.context("BERZERKER WARBAND", attacker=lord, profile=weapon(keywords=["Extra Attacks"]), **options)
        self.assertEqual((extra['melee_attack_bonus'], extra['melee_damage_bonus']), (0, 0))
        bodyguard, _ = self.context("BERZERKER WARBAND", ["HACK AND SLASH"], **options)
        self.assertEqual((bodyguard['melee_attack_bonus'], bodyguard['attacker_ap_modifier']), (0, 0))
        ranged, _ = self.context("BERZERKER WARBAND", ["HACK AND SLASH"], attacker=lord, profile=weapon(ranged=True), charged_this_turn=True, **options)
        self.assertEqual((ranged['melee_attack_bonus'], ranged['attacker_ap_modifier']), (0, 0))

    def test_helm_tracks_allocation_and_precision(self):
        bodyguard = unit(models=2)
        lord = unit("Lord", ["world eaters", "character"])
        target = self.engine.build_target_state(bodyguard, attached_units=[lord])
        options = {"defender_detachment_name": "BERZERKER WARBAND", "defender_enhancement_name": "HELM OF BRAZEN IRE",
                   "defender_enhancement_bearer_name": "Lord", "defender_enhancement_bearer_role": "attached_character"}
        self.engine.apply_detachment_target_stat_modifiers(target, options)
        self.assertEqual(self.engine.roll_damage(weapon(), {}, target['profiles'][0])[0], 3)
        self.assertEqual(self.engine.roll_damage(weapon(), {}, target['profiles'][1])[0], 2)
        self.assertEqual(self.engine.roll_damage(weapon(), {'target_damage_modifier': -1}, target['profiles'][1])[0], 1)
        attacker = unit()
        attacker['weapons'] = {'Chainblade': weapon()}
        context = self.engine.build_attack_context(attacker, weapon(), target, options, lord, False)
        self.assertEqual(self.engine.roll_damage(weapon(), context, self.engine.get_active_target_profile(context['precision_target']))[0], 2)

    def test_helm_applies_after_last_bodyguard_dies_in_same_attack_batch(self):
        guard = unit('Guard')
        guard.update(wounds=3, armor_save=7)
        lord = unit('Lord', ['world eaters', 'character'])
        lord['armor_save'] = 7
        attacker = unit('Attacker')
        blade = weapon()
        blade['attacks'] = 3
        attacker['weapons'] = {blade['name']: blade}
        options = {'defender_detachment_name': 'BERZERKER WARBAND', 'defender_enhancement_name': 'HELM OF BRAZEN IRE',
                   'defender_enhancement_bearer_name': 'Lord', 'defender_enhancement_bearer_role': 'attached_character'}
        with patch.object(self.engine, 'die_roll', return_value=6):
            result = self.engine.simulate(attacker, blade, guard, options, attached_units=[lord])
        self.assertEqual(result['target']['models_remaining'], 0)
        self.assertEqual(result['attached_character']['current_total_wounds'], 1)

    def test_cult_aura_and_reroll_alternatives(self):
        jakhals = unit('Jakhals', ['world eaters', 'jakhals'])
        context, _ = self.context('CULT OF BLOOD', ['IDOL OF INFINITE RAGE (AURA)', 'FAIL NOT THE BLOOD GOD'], attacker=jakhals)
        self.assertEqual((context['attacker_hit_modifier'], context['attacker_outgoing_wound_modifier']), (1, 1))
        self.assertTrue(context['reroll_hit_rolls_of_1'])
        self.assertFalse(context['reroll_all_hit_rolls'])
        empowered, _ = self.context('CULT OF BLOOD', ['FAIL NOT THE BLOOD GOD - WITHIN IDOL RANGE'], attacker=jakhals)
        self.assertTrue(empowered['reroll_all_hit_rolls'])
        wrong, _ = self.context('CULT OF BLOOD', ['IDOL OF INFINITE RAGE (AURA)'])
        self.assertEqual(wrong['attacker_hit_modifier'], 0)
        defended, _ = self.context(defender_detachment='CULT OF BLOOD', defender_active=['IDOL OF BLESSED BLOOD (AURA)', 'IN THE SHADOW OF BRASS IDOLS - WITHIN IDOL RANGE'], target=jakhals)
        self.assertEqual((defended['target_invulnerable_save'], defended['target_feel_no_pain']), (4, 5))

    def test_brazen_form_is_idempotent_and_bearer_only(self):
        prince = unit('Prince', ['world eaters', 'monster', 'character'])
        options = dict(defender_enhancement_name='BRAZEN FORM', defender_enhancement_bearer_name='Prince')
        _, target = self.context(defender_detachment='CULT OF BLOOD', target=prince, **options)
        self.assertEqual((target['toughness'], target['feel_no_pain']), (6, 5))
        self.engine.apply_detachment_target_stat_modifiers(target, {'defender_detachment_name': 'CULT OF BLOOD', **options})
        self.assertEqual(target['toughness'], 6)

    def test_daemonkin_psychic_fnp_does_not_protect_normal_attacks(self):
        options = dict(defender_detachment='KHORNE DAEMONKIN', defender_active=['ENRAGED ABJURATION'])
        normal, _ = self.context(**options)
        psychic, _ = self.context(profile=weapon(keywords=['Psychic']), **options)
        self.assertEqual((normal['target_feel_no_pain'], normal['target_mortal_feel_no_pain']), (0, 5))
        self.assertEqual((psychic['target_feel_no_pain'], psychic['target_mortal_feel_no_pain']), (5, 5))

    def test_daemonkin_weapon_and_save_bonuses(self):
        context, _ = self.context('KHORNE DAEMONKIN', ['DAEMONIC FURY - DAEMONIC RAGE ACTIVE'], charged_this_turn=True)
        self.assertTrue(self.engine.weapon_has_keyword(weapon(), 'Lance', context))
        self.assertTrue(self.engine.weapon_has_keyword(weapon(), 'Twin-linked', context))
        self.assertEqual(self.engine.get_weapon_wound_bonus(weapon(), context), 1)
        normal, _ = self.context('KHORNE DAEMONKIN', ['DAEMONIC FURY'])
        self.assertEqual(self.engine.get_weapon_wound_bonus(weapon(), normal), 0)
        for name, expected in [('BLESSING OF BURNING BLOOD', 5), ('BLESSING OF BURNING BLOOD - BOON OF BLOOD ACTIVE', 4)]:
            with self.subTest(name=name):
                c, _ = self.context(defender_detachment='KHORNE DAEMONKIN', defender_active=[name])
                self.assertEqual(c['target_invulnerable_save'], expected)
        c, target = self.context(defender_detachment='KHORNE DAEMONKIN', defender_enhancement_name='BLOOD-FORGED ARMOUR', defender_enhancement_bearer_name='Target')
        self.assertEqual(target['armor_save'], 2)

    def test_temporary_twin_linked_rerolls_once_even_if_result_is_unchanged(self):
        c, _ = self.context('KHORNE DAEMONKIN', ['DAEMONIC FURY - DAEMONIC RAGE ACTIVE'])
        with patch.object(self.engine, 'die_roll', return_value=6) as roll:
            self.assertEqual(self.engine.apply_wound_reroll(2, 4, 'Berzerkers', weapon(), c), (6, True))
            roll.assert_called_once()
        c['reroll_all_wound_rolls'] = True
        with patch.object(self.engine, 'die_roll', return_value=2) as roll:
            self.assertEqual(self.engine.apply_wound_reroll(2, 4, 'Berzerkers', weapon(), c), (2, True))
            roll.assert_called_once()

    def test_battleshock_blocks_direct_stratagems_but_not_detachment_rule(self):
        c, _ = self.context('BERZERKER WARBAND', ['HACK AND SLASH'], charged_this_turn=True, attacker_battleshocked=True)
        self.assertEqual((c['melee_attack_bonus'], c['attacker_ap_modifier']), (1, 0))
        c, _ = self.context(defender_detachment='BERZERKER WARBAND', defender_active=['FRENZIED RESILIENCE'], defender_battleshocked=True)
        self.assertEqual(c['target_damage_modifier'], 0)

    def test_possessed_damage_depends_on_allocated_model(self):
        for keyword, infantry_damage, vehicle_damage in [('eightbound', 4, 3), ('exalted eightbound', 3, 4)]:
            with self.subTest(keyword=keyword):
                attacker = unit(keywords=['world eaters', 'possessed', keyword])
                c, _ = self.context('POSSESSED SLAUGHTERBAND', ['DAEMONIC STRENGTH'], attacker=attacker)
                self.assertEqual(self.engine.roll_damage(weapon(), c, unit())[0], infantry_damage)
                self.assertEqual(self.engine.roll_damage(weapon(), c, unit(keywords=['vehicle']))[0], vehicle_damage)
        c, _ = self.context('POSSESSED SLAUGHTERBAND', attacker=unit(keywords=['world eaters', 'daemon']), attacker_enhancement_name='FRENZIED FOCUS', attacker_enhancement_bearer_name='Berzerkers')
        self.assertEqual(c['critical_hit_threshold'], 5)
        c, _ = self.context('POSSESSED SLAUGHTERBAND', ['DAEMONIC STRENGTH'], attacker=unit(keywords=['world eaters', 'possessed', 'eightbound']))
        bodyguard = unit(keywords=['infantry', 'monster'])
        bodyguard['display_keywords'] = ['infantry']
        target = self.engine.build_target_state(bodyguard, attached_units=[unit('Monster', ['monster', 'character'])])
        self.assertEqual(self.engine.roll_damage(weapon(), c, target['profiles'][0])[0], 4)
        self.assertEqual(self.engine.roll_damage(weapon(), c, target['profiles'][1])[0], 3)

    def test_goretrack_lance_needs_disembark_and_charge(self):
        inactive, _ = self.context('GORETRACK ONSLAUGHT', charged_this_turn=True)
        active, _ = self.context('GORETRACK ONSLAUGHT', ['RUSH TO THE FRAY - DISEMBARKED THIS TURN'], charged_this_turn=True)
        self.assertFalse(self.engine.weapon_has_keyword(weapon(), 'Lance', inactive))
        self.assertEqual(self.engine.get_weapon_wound_bonus(weapon(), active), 1)

    def test_brazen_engines_weapon_restrictions(self):
        mauler = unit('Maulerfiend', ['world eaters', 'daemon', 'vehicle', 'maulerfiend'])
        fist = weapon('Maulerfiend fists')
        c, target = self.context('BRAZEN ENGINES', ['APOPLECTIC CLARITY'], attacker=mauler, profile=fist,
                                  target=unit(models=10), attacker_enhancement_name='TALONS OF BUTCHERY', attacker_enhancement_bearer_name='Maulerfiend')
        self.assertEqual(self.engine.get_cleave_bonus(fist, target, c), 4)
        self.assertTrue(c['ignore_negative_hit_modifiers'])
        other, _ = self.context('BRAZEN ENGINES', attacker=mauler, attacker_enhancement_name='TALONS OF BUTCHERY', attacker_enhancement_bearer_name='Maulerfiend')
        self.assertFalse(self.engine.weapon_has_keyword(weapon(), 'Cleave', other))

    def test_apoplectic_clarity_preserves_positive_modifiers(self):
        attacker = unit('Engine', ['world eaters', 'daemon', 'vehicle'])
        gun = weapon(ranged=True, keywords=['Heavy'])
        c, target = self.context('BRAZEN ENGINES', ['APOPLECTIC CLARITY'], attacker=attacker, profile=gun, remained_stationary=True)
        c['target_has_stealth'] = True
        self.assertEqual(self.engine.get_hit_roll_modifier(gun, c), 1)
        c['attacker_outgoing_wound_modifier'] = 1
        c['target_incoming_wound_modifier'] = -1
        self.assertEqual(self.engine.get_total_wound_roll_modifier(attacker, target, gun, c), 1)

    def test_terminator_offence_and_ranged_defence(self):
        terminators = unit('Terminators', ['world eaters', 'terminator squad'])
        c, _ = self.context('BUTCHERS OF KHORNE', ['FOCUSED FEROCITY', 'A TROPHY FOR THE THRONE'], attacker=terminators,
                            target=unit(keywords=['vehicle']), attacker_enhancement_name='GORE-STAINED VETERANS', attacker_enhancement_bearer_name='Terminators')
        self.assertEqual((c['attacker_skill_modifier'], c['melee_attack_bonus'], c['attacker_outgoing_wound_modifier']), (1, 1, 1))
        for ranged, expected in [(True, -1), (False, 0)]:
            c, _ = self.context(defender_detachment='BUTCHERS OF KHORNE', defender_active=['WRATH BEYOND REASON'], target=terminators, profile=weapon(ranged=ranged))
            self.assertEqual(c['target_damage_modifier'], expected)

    def test_vessels_does_not_buff_bodyguard_character_keyword(self):
        bodyguard = unit(keywords=['world eaters', 'infantry', 'character'])
        bodyguard['display_keywords'] = ['world eaters', 'infantry']
        lord = unit('Lord', ['world eaters', 'infantry', 'character'])
        for attacker, expected in [(bodyguard, 0), (lord, 1)]:
            c, _ = self.context('VESSELS OF WRATH', ['WRATH OF KHORNE - ARMOUR PENETRATION', 'ASPIRE TO INFAMY'], attacker=attacker)
            self.assertEqual(c['attacker_ap_modifier'], expected)
            self.assertEqual(c['melee_attack_bonus'], expected)
        c, _ = self.context('VESSELS OF WRATH', ['ASPIRE TO INFAMY'], attacker=lord, attacker_package_has_epic_hero=True)
        self.assertEqual(c['melee_attack_bonus'], 0)

    def test_archslaughterer_grants_combat_blessings_without_stacking(self):
        c, _ = self.context('VESSELS OF WRATH', ['ARCHSLAUGHTERER - COMBAT BLESSINGS', 'MARTIAL EXCELLENCE'],
                            attacker_enhancement_name='ARCHSLAUGHTERER')
        self.assertTrue(self.engine.weapon_has_keyword(weapon(), 'LH', c))
        self.assertTrue(self.engine.weapon_has_keyword(weapon(), 'DW', c))
        self.assertEqual(self.engine.get_sustained_hits_bonus(weapon(), c), 1)

    def test_real_simulation_changes_attack_count_and_preserves_inputs(self):
        attacker = unit(models=2)
        blade = weapon()
        attacker['weapons'] = {blade['name']: blade}
        original = copy.deepcopy(attacker)
        base = self.engine.simulate(attacker, blade, unit('Target', models=10))
        buffed = self.engine.simulate(attacker, blade, unit('Target', models=10), {'attacker_detachment_name': 'BERZERKER WARBAND', 'charged_this_turn': True})
        self.assertEqual(buffed['stats']['gathered_attack_dice'] - base['stats']['gathered_attack_dice'], 2)
        self.assertEqual(attacker, original)

    def test_data_loader_preserves_options_and_partial_status(self):
        data = load_factions()['World Eaters']['detachments']
        self.assertEqual(len(data), 8)
        by_name = {d['name']: d for d in data}
        self.assertTrue(by_name['BERZERKER WARBAND']['rule']['implemented'])
        self.assertFalse(by_name['KHORNE DAEMONKIN']['rule']['implemented'])
        self.assertEqual(len(by_name['VESSELS OF WRATH']['rule']['options']), 2)
        source = json.loads(Path('World_Eaters.json').read_text(encoding='utf-8'))
        self.assertEqual(source['faction']['detachments'], data)


if __name__ == '__main__':
    unittest.main()
