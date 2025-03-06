import json
import re
import tkinter as tk
from tkinter import ttk
from tkinter import messagebox

# Load the JSON data
with open('Dark_Angels.json', 'r') as file:
    data = json.load(file)

# Define the Unit, Weapon, and Ability classes (as per the previous step)
class Unit:
    def __init__(self, name, page_number, weapons, abilities, keywords, faction_keywords):
        self.name = name
        self.page_number = page_number
        self.weapons = weapons
        self.abilities = abilities
        self.keywords = keywords
        self.faction_keywords = faction_keywords

    def display_info(self):
        info = f"Unit Name: {self.name}\n"
        info += f"Page Number: {self.page_number}\n"
        info += "Weapons:\n"
        if self.weapons:
            for weapon in self.weapons:
                info += f"  {weapon.name} - Range: {weapon.range}, Attacks: {weapon.attacks}, Strength: {weapon.strength}, AP: {weapon.ap}, Damage: {weapon.damage}\n"
        else:
            info += "  No weapons listed.\n"
        
        info += "Abilities:\n"
        if self.abilities:
            for ability in self.abilities:
                info += f"  {ability.name}: {ability.description}\n"
        else:
            info += "  No abilities listed.\n"
        
        info += f"Keywords: {', '.join(self.keywords)}\n"
        info += f"Faction Keywords: {', '.join(self.faction_keywords)}\n"
        return info

class Weapon:
    def __init__(self, name, range, attacks, strength, ap, damage):
        self.name = name
        self.range = range
        self.attacks = attacks
        self.strength = strength
        self.ap = ap
        self.damage = damage

class Ability:
    def __init__(self, name, description):
        self.name = name
        self.description = description

# Function to extract weapons from the text
def extract_weapons(text):
    weapons = []
    weapon_section = re.search(r'RANGED WEAPONS(.*?)MELEE WEAPONS', text, re.DOTALL)
    if weapon_section:
        weapon_text = weapon_section.group(1).strip()
        weapon_lines = weapon_text.split('\n')
        for i in range(0, len(weapon_lines), 6):
            if i + 5 < len(weapon_lines):  # Ensure there are enough lines
                name = weapon_lines[i].strip()
                range_ = weapon_lines[i+1].strip()
                attacks = weapon_lines[i+2].strip()
                strength = weapon_lines[i+3].strip()
                ap = weapon_lines[i+4].strip()
                damage = weapon_lines[i+5].strip()
                weapons.append(Weapon(name, range_, attacks, strength, ap, damage))
            else:
                print(f"Warning: Incomplete weapon data at index {i} in text: {text}")
    return weapons

# Function to extract abilities from the text
def extract_abilities(text):
    abilities = []
    ability_section = re.search(r'ABILITIES(.*?)WARGEAR ABILITIES', text, re.DOTALL)
    if ability_section:
        ability_text = ability_section.group(1).strip()
        ability_lines = ability_text.split('\n')
        for i in range(0, len(ability_lines), 2):
            if i + 1 < len(ability_lines):  # Ensure there are enough lines
                name = ability_lines[i].strip()
                description = ability_lines[i+1].strip()
                abilities.append(Ability(name, description))
            else:
                print(f"Warning: Incomplete ability data at index {i} in text: {text}")
    return abilities

# Function to extract keywords from the text
def extract_keywords(text):
    keywords = []
    keyword_section = re.search(r'KEYWORDS:(.*?)FACTION KEYWORDS:', text, re.DOTALL)
    if keyword_section:
        keyword_text = keyword_section.group(1).strip()
        keywords = [kw.strip() for kw in keyword_text.split(',')]
    return keywords

# Function to extract faction keywords from the text
def extract_faction_keywords(text):
    faction_keywords = []
    faction_keyword_section = re.search(r'FACTION KEYWORDS:(.*)', text, re.DOTALL)
    if faction_keyword_section:
        faction_keyword_text = faction_keyword_section.group(1).strip()
        faction_keywords = [kw.strip() for kw in faction_keyword_text.split(',')]
    return faction_keywords

# Parse the data into Unit objects
units = []
for unit_data in data:
    # Check if 'name' is missing, and try to extract it from the 'text' field
    if 'name' not in unit_data:
        print(f"Warning: 'name' key is missing in unit data, extracting from text: {unit_data['text']}")
        
        # Attempt to extract the unit name using a more refined regex pattern
        match = re.match(r"([A-Za-z\s’]+)(?=\s*KEYWORDS|\s*FACTION)", unit_data['text'])
        if match:
            unit_name = match.group(1).strip()  # Remove any surrounding whitespace
            print(f"Extracted unit name: {unit_name}")
        else:
            unit_name = "Unknown Unit"  # Default value if name cannot be extracted
            print(f"Could not extract unit name, using default: {unit_name}")
        
        # Use the extracted name
        unit_data['name'] = unit_name
    else:
        unit_name = unit_data['name']

    # Skip adding the unit if the name is "Unknown Unit"
    if unit_name == "Unknown Unit":
        continue

    print(f"Processing unit: {unit_name}")
    print(f"Unit data: {unit_data}")

    weapons = extract_weapons(unit_data['text'])
    abilities = extract_abilities(unit_data['text'])
    unit = Unit(unit_data['name'], unit_data['page_number'], weapons, abilities, unit_data.get('keywords', []), unit_data.get('faction_keywords', []))
    units.append(unit)

# Debugging: Print weapons and abilities to ensure they're populated
for unit in units:
    print(f"Unit: {unit.name}")
    print(f"Weapons: {len(unit.weapons)} weapons loaded.")
    for weapon in unit.weapons:
        print(f"  {weapon.name} - {weapon.range} - {weapon.attacks} Attacks")
    print(f"Abilities: {len(unit.abilities)} abilities loaded.")
    for ability in unit.abilities:
        print(f"  {ability.name}: {ability.description}")

# Create the main application window
root = tk.Tk()
root.title("Warhammer 40K Unit Viewer")

# Dropdown menu for selecting units
unit_var = tk.StringVar(value="Select Unit")
unit_names = [unit.name for unit in units]  # Get all unit names for the dropdown
unit_combobox = ttk.Combobox(root, textvariable=unit_var, values=unit_names)
unit_combobox.pack(pady=10)

# Label to display the unit's information
unit_info_label = tk.Label(root, text="", justify=tk.LEFT)
unit_info_label.pack(pady=10)

# Function to update the displayed information based on selected unit
def update_unit_info(event):
    selected_unit_name = unit_var.get()
    
    # Find the unit object by name
    selected_unit = next((unit for unit in units if unit.name == selected_unit_name), None)
    
    if selected_unit:
        unit_info_label.config(text=selected_unit.display_info())

# Bind the combobox selection event
unit_combobox.bind("<<ComboboxSelected>>", update_unit_info)

root.mainloop()
