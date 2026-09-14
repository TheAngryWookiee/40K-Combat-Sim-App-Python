"""World Eaters combat effects; conditional selections describe the current combat.

Campaign resources, movement and once-per-battle usage are not inferred here.
"""


def _name(value):
    return str(value or "").casefold()


DIRECT_TARGET_STRATAGEMS = {
    "hack and slash", "frenzied resilience", "fail not the blood god",
    "fail not the blood god - within idol range", "in the shadow of brass idols",
    "in the shadow of brass idols - within idol range", "daemonic resistance",
    "daemonic strength", "apoplectic clarity", "focused ferocity", "a trophy for the throne",
    "wrath beyond reason", "scorn the witch", "aspire to infamy",
}


def apply_world_eaters_context(engine, attacker, weapon, target, options, context):
    attack_detachment = _name(options.get("attacker_detachment_name"))
    defend_detachment = _name(options.get("defender_detachment_name"))
    attack_active = {_name(n) for n in options.get("attacker_active_ability_names", [])}
    defend_active = {_name(n) for n in options.get("defender_active_ability_names", [])}
    if options.get("attacker_battleshocked"):
        attack_active -= DIRECT_TARGET_STRATAGEMS
    if options.get("defender_battleshocked"):
        defend_active -= DIRECT_TARGET_STRATAGEMS
    attack_enhancement = _name(options.get("attacker_enhancement_name"))
    bearer = _name(options.get("attacker_enhancement_bearer_name"))
    is_bearer = bearer == _name(attacker.get("name"))
    melee = _name(weapon.get("range")) == "melee"
    charged = bool(options.get("charged_this_turn"))
    has = engine.unit_has_keyword
    world_eater = has(attacker, "world eaters")
    defending_world_eater = has(target, "world eaters")
    cultist = has(attacker, "jakhals") or has(attacker, "goremongers")
    defending_cultist = has(target, "jakhals") or has(target, "goremongers")
    model_keywords = {_name(k) for k in attacker.get("display_keywords", attacker.get("keywords", []))}
    character = (world_eater and "character" in model_keywords and "epic hero" not in model_keywords
                 and not options.get("attacker_package_has_epic_hero"))
    defending_character = defending_world_eater and has(target, "character") and not has(target, "epic hero")

    def bonus(key, amount):
        context[key] = context.get(key, 0) + amount

    def keyword(value):
        context["temporary_weapon_keywords"].add(value)

    def defence(key, value):
        context[key] = engine.combine_feel_no_pain_values(context.get(key, 0), value)

    if options.get("attacker_world_eaters_suppressed"):
        bonus("attacker_hit_modifier", -1)

    # Exact datasheet names avoid similarly named abilities from other factions.
    abilities = engine.unit_ability_name_set(attacker)
    attached = {_name(n) for n in options.get("attacker_attached_ability_names", [])}
    leading = bool(options.get("attacker_has_attached_character"))
    monster_vehicle = has(target, "monster") or has(target, "vehicle")
    if world_eater or has(attacker, "blood legions"):
        if melee:
            if "devastating assault" in abilities and charged:
                keyword("DW")
            if leading and "legendary killer" in abilities | attached:
                context["reroll_hit_rolls_of_1"] = True
                context["reroll_wound_rolls_of_1"] = True
            if "a worthy skull" in abilities and has(target, "character"):
                context["reroll_all_hit_rolls"] = True
                context["reroll_all_wound_rolls"] = True
            if "rend and tear" in abilities and monster_vehicle:
                bonus("melee_damage_bonus", 1)
            if "savage exaltation" in abilities and options.get("target_below_starting_strength"):
                bonus("attacker_hit_modifier", 1)
                if options.get("target_below_half_strength"):
                    bonus("attacker_outgoing_wound_modifier", 1)
            if "possessed lord" in abilities and "possessed lord" in attack_active:
                bonus("melee_attack_bonus", 3)
                keyword("DW")
            if "devoted to destruction" in abilities and has(attacker, "helbrute"):
                # Count equipped weapons, including paired copies, not alternative profiles.
                counts = attacker.get("weapon_bearer_counts", {})
                equipped = {n: w for n, w in attacker.get("weapons", {}).items()
                            if _name(w.get("range")) == "melee" and _name(n) != "close combat weapon"}
                if sum(counts.get(_name(n), 1) for n in equipped) >= 2 and weapon.get("name") in equipped:
                    bonus("melee_attack_bonus", 2)
            if world_eater and "beacons of rage (aura)" in attack_active and not monster_vehicle:
                bonus("attacker_hit_modifier", 1)
                if options.get("target_below_half_strength"):
                    bonus("attacker_outgoing_wound_modifier", 1)
            if has(attacker, "blood legions"):
                if "rage embodied (aura)" in attack_active:
                    bonus("melee_attack_bonus", 1)
        else:
            if "bloody fury" in abilities and (options.get("attacker_target_closest_eligible") or "bloody fury" in attack_active):
                context["reroll_all_hit_rolls"] = True
            if "furious onslaught" in abilities and "furious onslaught" in attack_active:
                context["reroll_all_hit_rolls"] = True
            if "blood-hungry annihilator" in abilities and "blood-hungry annihilator" in attack_active and monster_vehicle:
                context["reroll_all_wound_rolls"] = True
                context["reroll_damage_rolls"] = True
        if "airborne predator" in abilities and has(attacker, "heldrake") and melee and has(target, "fly"):
            bonus("attacker_hit_modifier", 1)  # Ranged portion is handled in the shared engine.
        if "damaged" in abilities and "damaged" in attack_active:
            if has(attacker, "skarbrand"):
                if melee:
                    bonus("melee_attack_bonus", 2)
            else:
                bonus("attacker_hit_modifier", -1)
        if world_eater and melee and "driven by ultimate rage (aura)" in attack_active:
            context["ignore_negative_hit_modifiers"] = True
            context["attacker_skill_modifier"] = max(0, context["attacker_skill_modifier"])

    if attack_detachment == "berzerker warband" and world_eater and melee:
        if charged:
            bonus("melee_attack_bonus", 1)
            bonus("melee_strength_bonus", 2)
        if charged and "hack and slash" in attack_active:
            bonus("attacker_ap_modifier", 1)
        if (attack_enhancement == "berzerker glaive" and is_bearer
                and not engine.weapon_has_keyword(weapon, "Extra Attacks")):
            bonus("melee_attack_bonus", 1)
            bonus("melee_damage_bonus", 1)
    if defend_detachment == "berzerker warband" and defending_world_eater:
        if melee and "frenzied resilience" in defend_active:
            bonus("target_damage_modifier", -1)

    if attack_detachment == "cult of blood" and cultist:
        if "idol of infinite rage (aura)" in attack_active:
            bonus("attacker_hit_modifier", 1)
            bonus("attacker_outgoing_wound_modifier", 1)
        if "bloody vengeance" in attack_active:
            context["reroll_all_hit_rolls"] = True
        if melee and "fail not the blood god" in attack_active:
            context["reroll_hit_rolls_of_1"] = True
        if melee and "fail not the blood god - within idol range" in attack_active:
            context["reroll_all_hit_rolls"] = True
    if defend_detachment == "cult of blood" and defending_cultist:
        if "idol of blessed blood (aura)" in defend_active:
            defence("target_invulnerable_save", 4)
        if "in the shadow of brass idols" in defend_active:
            defence("target_feel_no_pain", 6)
        if "in the shadow of brass idols - within idol range" in defend_active:
            defence("target_feel_no_pain", 5)

    if attack_detachment == "khorne daemonkin":
        if melee and has(attacker, "blood legions") and "daemonic rage" in attack_active:
            keyword("Lance")
        if melee and world_eater:
            if "daemonic fury" in attack_active or "daemonic fury - daemonic rage active" in attack_active:
                keyword("Lance")
            if "daemonic fury - daemonic rage active" in attack_active:
                keyword("Twin-linked")
            if attack_enhancement == "blade of endless bloodshed" and is_bearer:
                bonus("melee_attack_bonus", 1)
                bonus("melee_strength_bonus", 1)
                bonus("melee_damage_bonus", 1)
    if defend_detachment == "khorne daemonkin":
        if defending_world_eater or has(target, "blood legions"):
            if "enraged abjuration" in defend_active:
                defence("target_mortal_feel_no_pain", 5)
                if engine.weapon_has_keyword(weapon, "Psychic", context):
                    defence("target_feel_no_pain", 5)
        if has(target, "blood legions") and "boon of blood" in defend_active:
            defence("target_invulnerable_save", 4)
        if defending_world_eater:
            if "blessing of burning blood" in defend_active:
                defence("target_invulnerable_save", 5)
            if "blessing of burning blood - boon of blood active" in defend_active:
                defence("target_invulnerable_save", 4)

    if attack_detachment == "possessed slaughterband" and world_eater:
        bearer_keywords = {_name(k) for k in options.get("attacker_enhancement_bearer_keywords", [])}
        valid_focus_bearer = {"world eaters", "daemon"}.issubset(bearer_keywords) or (is_bearer and has(attacker, "daemon"))
        if attack_enhancement == "frenzied focus" and valid_focus_bearer:
            context["critical_hit_threshold"] = min(context["critical_hit_threshold"], 5)
        if melee and has(attacker, "possessed") and "daemonic strength" in attack_active:
            # Allocation can change between bodyguards and an attached monster.
            if has(attacker, "exalted eightbound"):
                context["world_eaters_damage_target"] = "monster_vehicle"
            elif has(attacker, "eightbound"):
                context["world_eaters_damage_target"] = "other"
    if (defend_detachment == "possessed slaughterband" and defending_world_eater
            and has(target, "possessed") and "daemonic resistance" in defend_active):
        bonus("target_incoming_wound_modifier", -1)

    if attack_detachment == "goretrack onslaught" and world_eater and melee:
        if "rush to the fray - disembarked this turn" in attack_active or options.get("attacker_disembarked_from_transport"):
            keyword("Lance")

    if attack_detachment == "brazen engines":
        daemon_vehicle = has(attacker, "vehicle") and (
            has(attacker, "daemon")
            or (world_eater and attack_enhancement == "murder-forged entity" and is_bearer)
        )
        if daemon_vehicle and "apoplectic clarity" in attack_active:
            context["world_eaters_ignore_attack_modifiers"] = True
            context["ignore_negative_hit_modifiers"] = True
            context["ignore_negative_wound_modifiers"] = True
            context["attacker_skill_modifier"] = max(0, context["attacker_skill_modifier"])
        if (attack_enhancement == "talons of butchery" and is_bearer
                and has(attacker, "maulerfiend") and melee
                and engine.weapon_name_contains(weapon, "maulerfiend fists")):
            keyword("Cleave 2")

    if attack_detachment == "butchers of khorne" and has(attacker, "terminator squad"):
        if melee:
            if attack_enhancement == "gore-stained veterans" and is_bearer:
                bonus("attacker_skill_modifier", 1)
            if "focused ferocity" in attack_active:
                bonus("melee_attack_bonus", 1)
            if "a trophy for the throne" in attack_active and (has(target, "monster") or has(target, "vehicle")):
                bonus("attacker_outgoing_wound_modifier", 1)
    if (defend_detachment == "butchers of khorne" and has(target, "terminator squad")
            and not melee and "wrath beyond reason" in defend_active):
        bonus("target_damage_modifier", -1)

    if attack_detachment == "vessels of wrath":
        if melee and character:
            if "wrath of khorne - cleave" in attack_active:
                keyword("Cleave 1")
            elif "wrath of khorne - armour penetration" in attack_active:
                bonus("attacker_ap_modifier", 1)
            if "aspire to infamy" in attack_active:
                bonus("melee_attack_bonus", 1)
                bonus("melee_strength_bonus", 2)
        if (melee and world_eater and attack_enhancement == "archslaughterer"
                and "archslaughterer - combat blessings" in attack_active):
            keyword("SH1")
            keyword("LH")
            if has(target, "infantry"):
                keyword("DW")
    if defend_detachment == "vessels of wrath" and defending_character and "scorn the witch" in defend_active:
        defence("target_mortal_feel_no_pain", 4)

    if len(target.get("profiles", [])) > 1 and (
        context.get("world_eaters_damage_target")
        or any(profile.get("world_eaters_bearer_applied") for profile in target["profiles"])
    ):
        context["world_eaters_allocation_sensitive"] = True


def apply_world_eaters_bearer_defence(engine, target, options):
    """Apply bearer characteristics to the appropriate allocation profile only."""
    detachment = _name(options.get("defender_detachment_name"))
    enhancement = _name(options.get("defender_enhancement_name"))
    if (detachment, enhancement) not in {
        ("berzerker warband", "helm of brazen ire"),
        ("cult of blood", "brazen form"),
        ("khorne daemonkin", "blood-forged armour"),
    }:
        return
    bearer = _name(options.get("defender_enhancement_bearer_name"))
    role = options.get("defender_enhancement_bearer_role", "bodyguard")
    for profile in target.get("profiles") or [target]:
        if bearer != _name(profile.get("unit_name", profile.get("name"))):
            continue
        if "allocation_role" in profile and profile["allocation_role"] != role:
            continue
        if profile.get("world_eaters_bearer_applied"):
            continue
        world_eater = engine.unit_has_keyword(profile, "world eaters")
        if detachment == "berzerker warband" and enhancement == "helm of brazen ire" and world_eater:
            profile["world_eaters_damage_reduction"] = 1
        if (detachment == "cult of blood" and enhancement == "brazen form" and world_eater
                and engine.unit_has_keyword(profile, "monster")):
            profile["toughness"] += 1
            profile["feel_no_pain"] = engine.combine_feel_no_pain_values(profile.get("feel_no_pain", 0), 5)
        if detachment == "khorne daemonkin" and enhancement == "blood-forged armour" and (
            world_eater or engine.unit_has_keyword(profile, "blood legions")
        ):
            profile["armor_save"] = 2
        profile["world_eaters_bearer_applied"] = True
    engine.sync_target_state_profiles(target)
