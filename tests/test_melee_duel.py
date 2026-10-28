import unittest

from combat_engine import CombatSimulator


def make_weapon(name="blade", attacks=1, damage=1):
    return {
        "name": name,
        "range": "Melee",
        "attacks": attacks,
        "skill": 2,
        "strength": 20,
        "ap": -10,
        "damage": damage,
        "keywords": ["Torrent"],
        "raw_keywords": ["Torrent"],
    }


def make_unit(name, wounds=3, weapon=None):
    selected_weapon = weapon or make_weapon()
    return {
        "name": name,
        "keywords": ["infantry"],
        "display_keywords": ["Infantry"],
        "models": 1,
        "toughness": 4,
        "wounds": wounds,
        "armor_save": 7,
        "invulnerable_save": 0,
        "effects": [],
        "abilities": [],
        "wargear_abilities": [],
        "selectable_abilities": [],
        "weapons": {selected_weapon["name"]: selected_weapon},
        "weapon_bearer_counts": {selected_weapon["name"]: 1},
    }


def entry(unit):
    return {"attacker_unit": unit, "weapons": list(unit["weapons"].values())}


class MeleeDuelTests(unittest.TestCase):
    def test_destroyed_defender_does_not_fight_back(self):
        attacker = make_unit("Attacker", weapon=make_weapon(damage=10))
        defender = make_unit("Defender")

        result = CombatSimulator(seed=1).simulate_melee_duel(
            [entry(attacker)], [entry(defender)], attacker, defender
        )

        self.assertEqual(result["duel"]["winner"], "attacker")
        self.assertEqual(result["duel"]["rounds_completed"], 1)
        self.assertEqual(result["duel"]["rounds"][0]["defender_damage"], 0)

    def test_defender_fights_back_in_the_same_round(self):
        attacker = make_unit("Attacker", wounds=100, weapon=make_weapon(attacks=20))
        defender = make_unit("Defender", wounds=100, weapon=make_weapon(attacks=20))

        result = CombatSimulator(seed=2).simulate_melee_duel(
            [entry(attacker)], [entry(defender)], attacker, defender
        )

        self.assertGreater(result["duel"]["rounds"][0]["attacker_damage"], 0)
        self.assertGreater(result["duel"]["rounds"][0]["defender_damage"], 0)
        self.assertEqual(result["duel"]["rounds_completed"], 1)

    def test_repeated_duel_reports_each_round_until_destruction(self):
        attacker = make_unit("Attacker", wounds=8, weapon=make_weapon(attacks=1, damage=2))
        defender = make_unit("Defender", wounds=8, weapon=make_weapon(attacks=1, damage=2))

        result = CombatSimulator(seed=3).simulate_melee_duel(
            [entry(attacker)],
            [entry(defender)],
            attacker,
            defender,
            repeat_until_destroyed=True,
        )

        self.assertGreater(result["duel"]["rounds_completed"], 1)
        self.assertIn(result["duel"]["winner"], {"attacker", "defender", "draw"})
        self.assertEqual(
            [round_result["round"] for round_result in result["duel"]["rounds"]],
            list(range(1, result["duel"]["rounds_completed"] + 1)),
        )

    def test_zero_damage_round_stops_as_stalemate(self):
        attacker = make_unit("Attacker", weapon=make_weapon(attacks=0))
        defender = make_unit("Defender", weapon=make_weapon(attacks=0))

        result = CombatSimulator(seed=4).simulate_melee_duel(
            [entry(attacker)],
            [entry(defender)],
            attacker,
            defender,
            repeat_until_destroyed=True,
        )

        self.assertTrue(result["duel"]["stalemate"])
        self.assertEqual(result["duel"]["rounds_completed"], 1)


if __name__ == "__main__":
    unittest.main()
