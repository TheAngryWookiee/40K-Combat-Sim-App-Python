import copy
import unittest
from unittest.mock import patch

from combat_engine import CombatSimulator
from data_loader import apply_unit_loadout, load_factions


class WorldEatersDatasheetRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()['World Eaters']['units']

    def context(self, name, melee=True, target='Khorne Berzerkers', loadout=None, weapon_name=None, **options):
        self.engine = CombatSimulator(seed=1)
        self.engine.stats = self.engine.build_empty_stats()
        unit = apply_unit_loadout(self.units[name], loadout)
        weapon = unit['weapons'][weapon_name] if weapon_name else next(w for w in unit['weapons'].values() if (w['range'] == 'Melee') == melee)
        target_state = self.engine.build_target_state(copy.deepcopy(self.units[target]))
        return self.engine.build_attack_context(unit, weapon, target_state, options, None, False)

    def test_charge_devastating_wounds(self):
        self.assertIn('DW', self.context('Daemon Prince of Khorne', charged_this_turn=True)['temporary_weapon_keywords'])
        self.assertNotIn('DW', self.context('Daemon Prince of Khorne')['temporary_weapon_keywords'])
        self.assertNotIn('DW', self.context('Daemon Prince of Khorne', melee=False, charged_this_turn=True)['temporary_weapon_keywords'])

    def test_legendary_killer_requires_attachment_and_melee(self):
        kharn = next(n for n in self.units if n.endswith('the Betrayer'))
        self.assertFalse(self.context(kharn)['reroll_hit_rolls_of_1'])
        opts = dict(attacker_has_attached_character=True, attacker_attached_ability_names=['Legendary Killer'])
        ctx = self.context('Khorne Berzerkers', **opts)
        self.assertTrue(ctx['reroll_hit_rolls_of_1'])
        self.assertTrue(ctx['reroll_wound_rolls_of_1'])
        self.assertFalse(self.context('Khorne Berzerkers', melee=False, **opts)['reroll_hit_rolls_of_1'])

    def test_worthy_skull_is_bearer_only(self):
        ctx = self.context('Master of Executions', target='Angron')
        self.assertTrue(ctx['reroll_all_hit_rolls'])
        self.assertTrue(ctx['reroll_all_wound_rolls'])
        ctx = self.context('Khorne Berzerkers', target='Angron', attacker_has_attached_character=True, attacker_attached_ability_names=['A Worthy Skull'])
        self.assertFalse(ctx['reroll_all_hit_rolls'])

    def test_rend_and_tear_and_savage_exaltation(self):
        self.assertEqual(self.context('Exalted Eightbound', target='Angron')['melee_damage_bonus'], 1)
        self.assertEqual(self.context('Exalted Eightbound')['melee_damage_bonus'], 0)
        ctx = self.context('Maulerfiend', target_below_starting_strength=True, target_below_half_strength=True)
        self.assertEqual((ctx['attacker_hit_modifier'], ctx['attacker_outgoing_wound_modifier']), (1, 1))

    def test_helbrute_counts_two_equipped_weapons(self):
        self.assertEqual(self.context('Helbrute')['melee_attack_bonus'], 0)
        for right in ['helbrute_fist', 'helbrute_hammer']:
            self.assertEqual(self.context('Helbrute', weapon_name='Helbrute fist', loadout={'left_arm': 'helbrute_fist', 'right_arm': right})['melee_attack_bonus'], 2)
            self.assertEqual(self.context('Helbrute', weapon_name='Close combat weapon', loadout={'left_arm': 'helbrute_fist', 'right_arm': right})['melee_attack_bonus'], 0)

    def test_heldrake_hit_bonus_in_both_phases_without_mortal_bomb(self):
        for melee in [True, False]:
            self.assertEqual(self.context('Heldrake', melee=melee, target='Angron')['attacker_hit_modifier'], 1)
        attacker = apply_unit_loadout(self.units['Heldrake'])
        weapon = next(iter(attacker['weapons'].values()))
        target = self.engine.build_target_state(copy.deepcopy(self.units['Angron']))
        before = target['current_wounds']
        ctx = self.engine.build_attack_context(attacker, weapon, target, {'attacker_active_ability_names': ['Airborne Predator']}, None, False)
        with patch.object(self.engine, 'die_roll', return_value=6):
            self.engine.resolve_pre_attack_active_abilities(attacker, weapon, target, ctx)
        self.assertEqual(target['current_wounds'], before)

    def test_targeting_rerolls_require_selected_condition(self):
        for name, ability, target in [('Forgefiend', 'Furious Onslaught', 'Khorne Berzerkers'), ('Chaos Predator Annihilator', 'Blood-hungry Annihilator', 'Angron')]:
            ctx = self.context(name, melee=False, target=target, attacker_active_ability_names=[ability])
            self.assertTrue(ctx['reroll_all_hit_rolls'] if name == 'Forgefiend' else ctx['reroll_all_wound_rolls'])
            if name != 'Forgefiend':
                self.assertTrue(ctx['reroll_damage_rolls'])
        self.assertFalse(self.context('Forgefiend', melee=False)['reroll_all_hit_rolls'])
        self.assertFalse(self.context('Chaos Predator Annihilator', melee=False, attacker_active_ability_names=['Blood-hungry Annihilator'])['reroll_damage_rolls'])

    def test_auras_and_damaged_profiles(self):
        ctx = self.context('Bloodletters', attacker_active_ability_names=['Daemon Lord of Khorne (Aura)', 'Rage Embodied (Aura)'])
        self.assertEqual((ctx['attacker_hit_modifier'], ctx['melee_attack_bonus']), (1, 1))
        self.assertEqual(self.context('Angron', attacker_active_ability_names=['Damaged'])['attacker_hit_modifier'], -1)
        self.assertEqual(self.context('Skarbrand', attacker_active_ability_names=['Damaged'])['melee_attack_bonus'], 2)
        ctx = self.context('Slaughterbound', attacker_active_ability_names=['Possessed Lord'])
        self.assertEqual(ctx['melee_attack_bonus'], 3)
        self.assertIn('DW', ctx['temporary_weapon_keywords'])


if __name__ == '__main__':
    unittest.main()
