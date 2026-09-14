import unittest

from combat_engine import CombatSimulator
from data_loader import apply_unit_loadout, load_factions


class WorldEatersUnitLoadoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_factions()['World Eaters']['units']

    def loadout(self, name, selection=None, size=None, counts=None):
        return apply_unit_loadout(self.units[name], selection, requested_model_count=size, requested_model_counts=counts)

    def weapon_counts(self, unit):
        simulator = CombatSimulator()
        return {w['name']: simulator.get_weapon_bearer_count(unit, w) for w in unit['weapons'].values()}

    def test_jakhals_compositions_and_mixed_bases(self):
        small = self.loadout('Jakhals', size=10)
        large = self.loadout('Jakhals', size=20)
        self.assertEqual(small['model_counts_by_name'], {'Jakhal Pack Leader': 1, 'Dishonoured': 1, 'Jakhal': 8})
        self.assertEqual(large['model_counts_by_name'], {'Jakhal Pack Leader': 1, 'Dishonoured': 2, 'Jakhal': 17})
        self.assertEqual(self.weapon_counts(large), {'Autopistol': 18, 'Chainblades': 18, 'Paired manglers': 2})
        self.assertEqual({m['name']: m['base_size'] for m in large['models_data']}, {'Jakhal Pack Leader': '28.5mm', 'Dishonoured': '40mm', 'Jakhal': '28.5mm'})
        with self.assertRaises(ValueError):
            self.loadout('Jakhals', size=11)
        with self.assertRaises(ValueError):
            self.loadout('Jakhals', counts={'Jakhal Pack Leader': 1, 'Dishonoured': 2, 'Jakhal': 8})

    def test_only_gore_hound_has_burning_roar(self):
        for size in [5, 10]:
            self.assertEqual(self.weapon_counts(self.loadout('Flesh Hounds', size=size)), {'Burning roar': 1, 'Gore-drenched fangs': size})

    def test_goremonger_optional_duplicate_does_not_hide_default_pistols(self):
        self.assertEqual(self.weapon_counts(self.loadout('Goremongers'))['Autopistol'], 8)
        selected = self.loadout('Goremongers', {'goremonger_weapons': {'additional_autopistol': 1, 'blood_harpoon': 1}})
        self.assertEqual(self.weapon_counts(selected), {'Autopistol': 9, 'Blood harpoon': 1, 'Chainblade': 6, 'Close combat weapon': 8})

    def test_terminators_cannot_replace_the_same_weapon_twice(self):
        with self.assertRaisesRegex(ValueError, 'replaces more'):
            self.loadout('Chaos Terminators', {'ranged_weapons': {'combi_weapon': 5}, 'heavy_weapons': {'heavy_flamer': 1}})
        valid = self.loadout('Chaos Terminators', {
            'ranged_weapons': {'combi_weapon': 3}, 'heavy_weapons': {'heavy_flamer': 1},
            'paired_weapons': {'paired_accursed_weapons': 1}, 'melee_weapons': {'power_fist': 3, 'chainfist': 1},
        })
        self.assertEqual(self.weapon_counts(valid), {'Combi-weapon': 3, 'Heavy flamer': 1, 'Chainfist': 1, 'Paired accursed weapons': 1, 'Power fist': 3})

    def test_berzerker_champion_and_squad_pistols_use_correct_counts(self):
        selected = self.loadout('Khorne Berzerkers', {
            'champion_pistol': {'plasma_pistol_supercharge': 1},
            'berzerker_pistols': {'plasma_pistol_standard': 2}, 'eviscerators': {'khornate_eviscerator': 2},
        })
        self.assertEqual(self.weapon_counts(selected), {'Bolt pistol': 7, 'Plasma pistol - standard': 2, 'Plasma pistol - supercharge': 1, 'Chainblade': 8, 'Khornate eviscerator': 2})

    def test_vehicle_weapon_multiplicity_and_replacements(self):
        self.assertEqual(self.weapon_counts(self.loadout('Chaos Land Raider'))['Soulshatter lascannon'], 2)
        forge = self.loadout('Forgefiend', {'arm_weapons': 'two_ectoplasma_cannons', 'head_weapon': 'ectoplasma_cannon_and_claws'})
        self.assertEqual(self.weapon_counts(forge), {'Ectoplasma cannon': 3, 'Forgefiend claws': 1})
        mauler = self.loadout('Maulerfiend', {'secondary_weapons': 'two_magma_cutters'})
        self.assertEqual(self.weapon_counts(mauler), {'Magma cutter': 2, 'Maulerfiend fists': 1})
        defiler = self.loadout('Defiler', {'side_weapons': 'hades_lascannon_and_hades_lascannon'})
        self.assertEqual(self.weapon_counts(defiler)['Hades lascannon'], 2)
        with self.assertRaises(ValueError):
            self.loadout('Defiler', {'side_weapons': 'electroscourge_and_electroscourge'})

    def test_batch_one_leaders_match_new_bodyguard_names(self):
        for name in ['Slaughterbound', 'Lord Invocatus', 'Lord on Juggernaut', 'Kh\u00e2rn the Betrayer', 'Master of Executions']:
            for target in self.units[name]['leader']['can_lead']:
                self.assertIn(target, self.units)


if __name__ == '__main__':
    unittest.main()
