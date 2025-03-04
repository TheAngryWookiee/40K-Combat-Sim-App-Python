# Created 09-08-22
# Edited 03-03-25
# This program is the basis for a combat sim between Warhammer units WIP
# This is an attempt to use functions to clean up the code
# First iteration of combat functionality, will be translated and turned into proper C# .NET application

import tkinter as tk
from tkinter import messagebox
import random

def die_roll():
    roll = random.randint(1,6)
    return roll

def d3_die_roll():
    d3_roll = random.randint(1,3)
    return d3_roll


# Variables 
# Unit Statlines
armor_save = 0
toughness = 0 
unit_name = "Space Marine"
target_name = "Dark Eldar"
wounds = 1
invulnerable_save = 0
reroll_hits_all = 1
reroll_hits_1 = 0
reroll_wounds_all = 1
reroll_wounds_1 = 0
squad_size = 0
unit_size = 0
feel_no_pain = 0 
# Weapon Statlines
attacks = 0
strength = 0
armor_piercing = 0
weapon_name = "Bolt"
weapon_keywords = ""
weapon = 0
weapon_skill = 0
# Weapon Damage
flat_damage = 0
variable_damage = ""
d3_damage = 0
d6_damage = 0
damage_dealt = 0
# Weapon Modifiers
hit_modifier = 0
wound_modifier = 0
successful_hit = 0
lethal_hit = 0
devastating_wound = 0
anti = 0
anti_to_wound = 0
sustained_hits = 0
total_hits = 0
hit_result = False
wound_result = False
successful_wound = 0

# Conditions
cover = False
# Weapon array 
weapons = [weapon_name, attacks, weapon_skill, strength, armor_piercing, flat_damage, variable_damage, weapon_keywords, anti_to_wound, unit_size]

# Target array
target_stats = [target_name, toughness, wounds, armor_save, invulnerable_save, squad_size]

# Weapon Selection
print("\nWarhammer Combat Sim")
print("\nSelect a unit from the List")
print("\n1. Lion El'Jonson")
print("2. Roboute Guilliman")
print("3. Angron")
print("4. Deathwing Knights")
print("5. Devastator Squad")

# Select unit to fight
unit = (input("\nWhich unit will fight the enemy: "))

# Attacking Units
if unit == "1":
    unit_name = "Lion El' Jonson"
    squad_weapons = 1
    print("\n1. Fealty Strike: A8 S12 AP-4 D4")
    print("2. Fealty Sweep: A16 S6 AP-3 D2")
    weapon = input("\nHow will " + unit_name + " strike? ")


    if weapon == "1": 
        is_valid = True
        weapons = ["Fealty Strike", 8, 2, 12, 4, 4, "", "LH", 0]
    if weapon == "2":
        is_valid = True
        weapons = ["Fealty Sweep", 16, 2, 6, 3, 2, "", "SH1", 0]

if unit == "2":
    unit_name = "Roboute Guilliman"
    print("\n1. Emperor's Sword: A14 S8 AP-3 D2")
    print("2. Hand of Dominion: A7 S14 AP-4 D4")
    weapon = input("\nHow will " + unit_name + " strike? ")


    if weapon == "1": 
        is_valid = True
        weapons = ["Emperor's Sword", 14, 2, 8, 3, 2, "", "DW", 0]
    if weapon == "2":
        is_valid = True
        weapons = ["Hand of Dominion", 7, 2, 14, 4, 4, "", "LH", 0]

if unit == "3":
    unit_name = "Angron"
    print("\n1. Samni'arius and Spinegrinder Strike: A8 S16 AP-4 Dd6+2")
    print("2. Samni'arius and Spinegrinder Sweep: A18 S8 AP-2 D2")
    weapon = input("\nHow will " + unit_name + " strike? ")


    if weapon == "1": 
        is_valid = True
        weapons = ["Samni'arius and Spinegrinder Strike", 8, 2, 16, 4, 2, "d6", "", 0]
    if weapon == "2":
        is_valid = True
        weapons = ["Samni'arius and Spinegrinder Sweep", 18, 2, 8, 2, 2, "", "", 0]

if unit == "4":
    unit_name = "Deathwing Knights"
    squad_weapons = 2
    print("\n1. Flail of the Unforgiven: A5 S6 AP-2 D2")
    print("2. Mace of Absolution: A4 S6 AP-1 D3")
    weapon = input("\nWhich weapon will " + unit_name + " strike with first? ")

    if weapon == "1":
        is_valid = True
        weapons = ["Flail of the Unforgiven", 5, 2, 6, 2, 2, "", "SH1 DW", 0]

    if weapon == "2":
        is_valid = True
        weapons = ["Mace of Absolution", 4, 2, 6, 1, 3, "", "", 0]

if unit == "5":
    unit_name = "Devastator Squad"
    print("\n1. Grav-cannons [Anti-Vehicle 2+, Heavy]: A3 BS4+ S6 AP-1 D3")
    print("2. Heavy Bolters [Heavy, Sustained Hits 1]: A3 BS4+ S5 AP-1 D2")
    print("3. Lascannons [Heavy]: A1 BS4+ S12 AP-3 Dd6+1")
    print("4. Missile Launchers - Frag [Blast, Heavy]: Ad6 BS4+ S4 AP0 D1")
    print("5. Missile Launchers - Krak [Heavy]: A1 BS4+ S9 AP-2 Dd6")
    print("6. Multi-meltas [Heavy, Melta 2]: A2 BS4+ S9 AP-4 Dd6")
    weapon = input("\nHow will " + unit_name + " strike? ")

    if weapon == "1": 
        is_valid = True
        weapons = ["Grav=cannons", 3, 4, 6, 1, 3, "", "anti vehicle", 2]
    if weapon == "2":
        is_valid = True
        weapons = ["Heavy Bolters", 3, 4, 5, 1, 2, "", "Heavy SH1", 0]




# Target/Defending units
print("\n1. Wyches: T3, W1, Sv5+")
print("2. Talos Pain Engine: T7, W9, Sv3+/5++")
print("3. Knight Rampager: T12, W22, Sv3+")

# Select target
target = input(f"\nWhich unit is {unit_name} fighting? ")

if target == "1":
    is_valid = True
    target_stats = ["Whyches", 3, 1, 5, 0, 10]

if target == "2":
    is_valid = True
    target_stats = ["Talos Pain Engine", 7, 9, 3, 5, 3]

if target == "3":
    is_valid = True
    target_stats = ["Knight Rampager", 12, 22, 3, 0, 1, "vehicle imperium knight"]

# Weapon Variable Table
attacks_remaining = weapons[1]
weapon_skill = weapons[2] + hit_modifier
strength = weapons[3]
armor_piercing = weapons[4]
attacks_remaining = weapons[1]
anti_to_wound = weapons[8]

# Target Unit Variable Table
target_name = target_stats[0]
toughness = target_stats[1]
wounds = target_stats[2]
armor_save = target_stats[3]
invulnerable_save = target_stats[4]
squad_size = target_stats[5]

# Wounding Table
if strength/2 >= toughness:
    to_wound = 2
elif strength > toughness: 
    to_wound = 3
elif strength == toughness: 
    to_wound = 4
elif strength < toughness: 
    to_wound = 5
elif strength <= toughness/2:
    to_wound = 6

to_wound = to_wound + wound_modifier



# Shooting Loop

def attack(unit_name, weapon_skill, target_name, weapons, target_stats, squad_size, attacks_remaining, wounds, lethal_hit, devastating_wound, sustained_hits):
    for i in range(attacks_remaining):
        hit_result, lethal_hit, sustained_hits = hit(unit_name, weapon_skill, target_name, squad_size, wounds, lethal_hit, sustained_hits)
        successful_hit = 1
        if not hit_result:    
            continue
        total_hits = successful_hit + sustained_hits
        for i in range(total_hits):
            wound_result, devastating_wound = wound(unit_name, to_wound, target_name, weapons, attacks_remaining, wounds, lethal_hit, devastating_wound, sustained_hits)
            if not wound_result:    
                continue
            if not save(armor_save, armor_piercing, target_stats, devastating_wound):
                continue
            wounds, squad_size = apply_damage(target_name, wounds, damage_dealt, squad_size, d3_damage, d6_damage) 
            if squad_size <= 0:
                break
    return True, wounds, squad_size
    



def hit(unit_name, weapon_skill, target_name, squad_size, wounds, lethal_hit, sustained_hits):
    hit_roll = die_roll()
    lethal_hit = 0
    if squad_size == 0:
        return False, 0, 0
    else:
        print(f"{unit_name} rolls a {hit_roll} to hit")
        if hit_roll < weapon_skill:
            print(unit_name + " failed to hit")
            if reroll_hits_all == 1:
                hit_roll = die_roll()
                print(f"{unit_name} re-rolled the failed hit into a {hit_roll} to hit")
                if hit_roll < weapon_skill:
                    print(unit_name + " failed to hit")
                    return False, 0, 0
                elif hit_roll == 6 and weapons[7] == "LH":
                    print(f"On a 6 {unit_name} has automatically wounded {target_name} due to having Lethal Hits")
                    lethal_hit = 1
                    return True, lethal_hit, 0        
                elif hit_roll == 6 and weapons[7] == "SH1":
                    print(f"On a 6 the attack explodes causing 1 extra hit")
                    sustained_hits = 1
                    return True, 0, sustained_hits                               
                else:
                    return True, 0, 0
            if reroll_hits_1 == 1:
                hit_roll = die_roll()
                print(f"{unit_name} re-rolled the 1 into a {hit_roll} to hit")
                if hit_roll < weapon_skill:
                    print(unit_name + " failed to hit again")
                    return False, 0, 0
                elif hit_roll == 6 and weapons[7] == "LH":
                    print(f"On a 6 {unit_name} has automatically wounded {target_name} due to having Lethal Hits")
                    lethal_hit = 1
                    return True, lethal_hit, 0        
                elif hit_roll == 6 and weapons[7] == "SH1":
                    print(f"On a 6 the attack explodes causing 1 extra hit")
                    sustained_hits = 1
                    return True, 0, sustained_hits                                                  
                else:
                    return True, 0, 0
            return False, 0, 0
        elif hit_roll == 6 and "LH" in weapons[7]:
            print(f"On a 6 {unit_name} has automatically wounded {target_name} due to having Lethal Hits")
            lethal_hit = 1
            return True, lethal_hit, 0        
        elif hit_roll == 6 and "SH1" in weapons[7]:
            print(f"On a 6 the attack explodes causing 1 extra hit")
            sustained_hits = 1
            return True, 0, sustained_hits
        return True, 0, 0
        


def wound(unit_name, to_wound, target_name, weapons, attacks_remaining, wounds, lethal_hit, devastating_wound, sustained_hits):
    successful_hit = 1
    devastating_wound = 0
    total_hits = sustained_hits + successful_hit
    for i in range(total_hits):    
        wound_roll = die_roll()
        if lethal_hit == 1:
            return True, devastating_wound
        print(f"{unit_name} rolls a {wound_roll} to wound")
        if "anti" in weapons[7]:
            match = []
            for a in weapons[7].split():  
                for d in target_stats[6].split():  
                    if a == d:
                        match.append(a)    

            if "anti" in weapons[7]:
                if not match: 
                    print("No Anti")

                else:
                    if wound_roll >= anti_to_wound:
                        wound_roll = 6
                        print("The wound roll becomes a Crtical Wound due to Anti")        
               
        if wound_roll < to_wound:
            print(unit_name + " fails to wound")
            if reroll_wounds_all == 1:
                wound_roll = die_roll()
                print(f"{unit_name} re-rolled the failed wound into a {wound_roll} to wound")
                if wound_roll < to_wound:
                    print(unit_name + " failed to wound")
                    return False, devastating_wound
                elif wound_roll == 6 and "DW" in weapons[7]:
                    wounds -= weapons[5]
                    print(f"On a 6 {unit_name} does {weapons[5]} mortal wounds to {target_name}")
                    devastating_wound = 1
                    return True, devastating_wound
                else:
                    return True, devastating_wound
            if reroll_wounds_1 == 1:
                wound_roll = die_roll()
                print(f"{unit_name} re-rolled the 1 into a {wound_roll} to wound")
                
                if "anti" in weapons[7]:
                    print(f"This weapon has Anti on a {anti_to_wound}")
                    match = []
                    for a in weapons[7].split():  
                        for d in target_stats[6].split():  
                            if a == d:
                                match.append(a)    

                    if "anti" in weapons[7]:
                        if not match: 
                            print("No Anti")

                        else:
                            if wound_roll >= anti_to_wound:
                                wound_roll = 6
                                print("The wound roll becomes a Crtical Wound due to Anti")                
                      
                if wound_roll < to_wound:
                    print(unit_name + " failed to wound again")
                    return False, devastating_wound
                               
                else:
                    return True, devastating_wound
            return False, devastating_wound
        
        
        elif wound_roll == 6 and "DW" in weapons[7]:
            wounds -= weapons[5]
            print(f"On a 6 {unit_name} does {weapons[5]} mortal wounds to {target_name}")
            devastating_wound = 1
            return True, devastating_wound
        return True, devastating_wound


def save(armor_save, armor_piercing, target_stats, devastating_wound):
    save_roll = die_roll()
    if devastating_wound == 1:
        return True
    if target_stats[4] > 0:
        print(f"{target_stats[0]} attempts an invulnerable save with a {target_stats[4]}")
        if save_roll >= target_stats[4]:
            print(f"{target_stats[0]} passes the invuln save with a {save_roll}")
            return False
        elif save_roll < target_stats[4]:
            print(f"{target_stats[0]} fails the invulnerable save with a {save_roll}")
            return True
    elif cover == True:
        armor_save -= 1
        print("The target gets +1 to their armor save due to cover")
        if armor_save + armor_piercing > 6:
            print(f"{target_stats[0]} does not get a save as you cannot roll more than a 6")
            return True
        elif save_roll < armor_save + armor_piercing:
            print(f"{target_stats[0]} fails an armor save with a {save_roll}")
            return True
        else:
            print(f"{target_name} successfully saves with a {save_roll}")
            return False
    if armor_save + armor_piercing > 6:
        print(f"{target_stats[0]} does not get a save as you cannot roll more than a 6")
        return True
    elif save_roll < armor_save + armor_piercing:
        print(f"{target_stats[0]} fails an armor save with a {save_roll}")
        return True
    else:
        print(f"{target_name} successfully saves with a {save_roll}")
        return False


def apply_damage(target_name, wounds, damage_dealt, squad_size, d3_damage, d6_damage):
    #Add Damage table
    # Determine if weapon deals d6 damage or not
    if weapons[6] == "":
        d6_damage = 0
    
    if weapons[6] == "d6":
        # Roll for d6 damage
        d6_damage = die_roll()

    # Determine if weapon does d3 damage
    if weapons[6] == "d3":
        # Roll for d3 damage
        d3_damage = d3_die_roll()
    
    # Add total damage
    # DELETE FNP VARIABLE FROM HERE WHEN DONE TESTING
    damage_reduction = 0
    damage_halved = 0
    feel_no_pain = 0
    fnp_save = 5
    fnp_negates = 0    
    # DOWN TO HERE DELETE
    flat_damage = weapons[5]
    variable_damage = d3_damage + d6_damage
    damage_dealt = flat_damage + variable_damage
    
    if damage_reduction == 1:
        damage_dealt -= 1
    
    elif damage_halved == 1:
        damage_dealt = damage_dealt/2
    
    if feel_no_pain == 1:
        for i in range(damage_dealt):
            if die_roll() >= fnp_save:
                fnp_negates += 1
        print(f"The {target_name} has made {fnp_negates} FNP Rolls")
    
    damage_dealt -= fnp_negates
    wounds -= damage_dealt
    if devastating_wound == 0:
        print(f"{unit_name} did {damage_dealt} damage to {target_name}")
    if wounds <= 0:
        squad_size -= 1
        wounds = target_stats[2]
        print(f"There are {squad_size} {target_name}'s left in the squad")
    elif squad_size == 0:
        print(f"{target_name} has died to {unit_name}")
    else:
        print(f"{target_name} survived the strikes from {unit_name} with {wounds} wounds remaining")
    return wounds, squad_size

_, wounds, squad_size = attack(unit_name, weapon_skill, target_name, weapons, target_stats, squad_size, attacks_remaining, wounds, lethal_hit, devastating_wound, sustained_hits)
if squad_size == 0:
    wounds = 0
if wounds == 0:
    print(f"The {target_name} have been destroyed")
if wounds > 0: 
    print(f"The {target_name} survived the combat with {squad_size} units left with {wounds} wounds remaining")



