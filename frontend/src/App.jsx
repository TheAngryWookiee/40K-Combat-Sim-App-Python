import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  fetchFactions,
  fetchFactionDetails,
  fetchTurnStructure,
  fetchUnitDetailsWithLoadout,
  fetchUnits,
  simulateCombat,
} from './api'

const statDisplayRows = [
  [
    ['movement', 'M', (value) => `${value}"`],
    ['toughness', 'T'],
    ['save', 'SV'],
  ],
  [
    ['wounds', 'W'],
    ['leadership', 'LD'],
    ['objective_control', 'OC'],
  ],
]

const ATTACHED_LEADER_WEAPON_PREFIX = '__attacker_leader__::'

const initialOptions = {
  target_has_cover: false,
  attacker_in_engagement_range: false,
  target_in_engagement_range_of_allies: false,
  in_half_range: false,
  oath_of_moment_active: false,
  charged_this_turn: false,
  remained_stationary: false,
  indirect_target_visible: true,
  plunging_fire_active: false,
  attached_character_name: '',
  hazardous_overwatch_charge_phase: false,
  hazardous_bearer_current_wounds: '',
  attacker_fire_discipline_active: false,
  attacker_marked_for_destruction_active: false,
  attacker_unforgiven_fury_active: false,
  attacker_unforgiven_fury_army_battleshocked: false,
  attacker_stubborn_tenacity_active: false,
  attacker_weapons_of_the_first_legion_active: false,
  attacker_pennant_of_remembrance_active: false,
  attacker_below_starting_strength: false,
  attacker_battleshocked: false,
  attacker_saga_completed: false,
  attacker_elders_guidance_active: false,
  attacker_boast_achieved: false,
  attacker_hordeslayer_outnumbered: false,
  attacker_heroes_all_reroll_type: '',
  attacker_unbridled_ferocity_active: false,
  attacker_waaagh_active: false,
  defender_waaagh_active: false,
  attacker_prey_active: false,
  attacker_target_within_9: false,
  attacker_counts_as_ten_plus_models: false,
  defender_counts_as_ten_plus_models: false,
  target_below_starting_strength: false,
  target_below_half_strength: false,
  attacker_try_dat_button_effects: [],
  attacker_try_dat_button_hazardous: false,
  attacker_unbridled_carnage_active: false,
  defender_ard_as_nails_active: false,
  attacker_drag_it_down_active: false,
  defender_stalkin_taktiks_active: false,
  defender_speediest_freeks_active: false,
  attacker_blitza_fire_active: false,
  attacker_dakkastorm_active: false,
  attacker_full_throttle_active: false,
  attacker_klankin_klaws_active: false,
  attacker_klankin_klaws_pushed: false,
  attacker_dakka_dakka_dakka_active: false,
  attacker_dakka_dakka_dakka_pushed: false,
  attacker_bigger_shells_active: false,
  attacker_bigger_shells_pushed: false,
  defender_extra_gubbinz_active: false,
  attacker_competitive_streak_active: false,
  attacker_armed_to_da_teef_active: false,
  defender_hulking_brutes_active: false,
  defender_armour_of_contempt_active: false,
  defender_overwhelming_onslaught_active: false,
  defender_unbreakable_lines_active: false,
  defender_pennant_of_remembrance_active: false,
  defender_battleshocked: false,
}

const UNFORGIVEN_TASK_FORCE = 'Unforgiven Task Force'
const SAGA_OF_THE_HUNTER = 'Saga of the Hunter'
const SAGA_OF_THE_BEASTSLAYER = 'Saga of the Beastslayer'
const SAGA_OF_THE_BOLD = 'Saga of the Bold'
const WAR_HORDE = 'War Horde'
const DA_BIG_HUNT = 'Da Big Hunt'
const KULT_OF_SPEED = 'Kult of Speed'
const DREAD_MOB = 'Dread Mob'
const GREEN_TIDE = 'Green Tide'
const BULLY_BOYZ = 'Bully Boyz'
const OATH_EXCLUDED_KEYWORDS = [
  'black templars',
  'blood angels',
  'dark angels',
  'deathwatch',
  'space wolves',
]
const OATH_OF_MOMENT_RULE_TEXT = 'Select one enemy unit. Each time a model with Oath of Moment makes an attack that targets that unit, you can re-roll the Hit roll.'
const OATH_OF_MOMENT_CODEX_RIDER_TEXT = 'If you are using a Codex: Space Marines Detachment and your army does not include Black Templars, Blood Angels, Dark Angels, Deathwatch, or Space Wolves units, add 1 to the Wound roll as well.'
const BATTLEFIELD_WIDTH_INCHES = 60
const BATTLEFIELD_HEIGHT_INCHES = 44
const SAVED_ARMY_LISTS_STORAGE_KEY = 'tactica-forge:saved-army-lists'
const DEFAULT_TURN_STRUCTURE = [
  {
    id: 'start_of_turn',
    sequence: 1,
    name: 'Start of Turn Step',
    kind: 'step',
    summary: 'Rules that are triggered at the start of a turn are resolved now.',
    primary_rules: ['Resolve all rules that trigger at the start of the turn.'],
    available_actions: [],
  },
  {
    id: 'command',
    sequence: 2,
    name: 'Command Phase',
    kind: 'phase',
    summary: "You marshal strategic resources and check your units' morale.",
    primary_rules: [
      'Start of Command Phase: resolve rules triggered at the start of the Command phase.',
      'Gain Core CP: both players gain 1 Command Point.',
      'Battle-shock: the active player makes one battle-shock roll for each unit that is battle-shocked or at or below half-strength.',
      'Command Abilities: resolve other Command phase rules, excluding start triggers, core CP gain, and battle-shock rolls.',
      'End of Command Phase: resolve rules triggered at the end of the Command phase, then mission rules.',
    ],
    available_actions: ['gain_core_cp', 'battle_shock_roll', 'leadership_roll', 'command_abilities'],
    sub_steps: [
      {
        id: 'start_of_command_phase',
        sequence: 1,
        name: 'Start of Command Phase',
        rule_ref: '08.01',
        summary: 'Rules that are triggered at the start of the Command phase are resolved now.',
      },
      {
        id: 'gain_core_cp',
        sequence: 2,
        name: 'Gain Core CP',
        rule_ref: '08.02',
        summary: 'Both players gain 1 Command Point (CP).',
        cp_gained_by_each_player: 1,
      },
      {
        id: 'battle_shock',
        sequence: 3,
        name: 'Battle-shock',
        rule_ref: '08.03',
        summary: 'The active player makes one battle-shock roll for each unit that is currently battle-shocked or at or below half-strength.',
      },
      {
        id: 'command_abilities',
        sequence: 4,
        name: 'Command Abilities',
        rule_ref: '08.04',
        summary: 'Command phase rules are resolved now, excluding start triggers, core CP gain and battle-shock rolls.',
      },
      {
        id: 'end_of_command_phase',
        sequence: 5,
        name: 'End of Command Phase',
        rule_ref: '08.05',
        summary: 'Resolve end-of-Command-phase rules first, then mission rules triggered at this point.',
      },
    ],
  },
  {
    id: 'movement',
    sequence: 3,
    name: 'Movement Phase',
    kind: 'phase',
    summary: 'Your units move across the battlefield and strategic reserves arrive.',
    primary_rules: [
      'Start of Movement Phase: resolve rules triggered at the start of the Movement phase.',
      'Move Units: the active player moves units one at a time until every unit selected to move has resolved a move.',
      'End of Movement Phase: resolve rules triggered at the end of the Movement phase.',
    ],
    available_actions: ['model_move', 'unit_setup', 'unit_coherency', 'unit_engagement', 'hazard_rolls', 'battle_shock_roll'],
    sub_steps: [
      {
        id: 'start_of_movement_phase',
        sequence: 1,
        name: 'Start of Movement Phase',
        rule_ref: '09.01',
        summary: 'Rules that are triggered at the start of the Movement phase are resolved now.',
      },
      {
        id: 'move_units',
        sequence: 2,
        name: 'Move Units',
        rule_ref: '09.02',
        summary: 'Select one friendly unit that has not been selected to move this phase, then select one eligible move type and resolve it.',
      },
      {
        id: 'end_of_movement_phase',
        sequence: 3,
        name: 'End of Movement Phase',
        rule_ref: '09.03',
        summary: 'Rules that are triggered at the end of the Movement phase are resolved now.',
      },
    ],
    move_types: [
      {
        id: 'remain_stationary',
        name: 'Remain Stationary',
        rule_ref: '09.04',
        maximum_distance: '-',
        eligible_if: 'Any unit.',
        effect: 'No models are moved. Units that remain stationary do not trigger rules that are triggered when a unit starts or ends a move.',
        after_moving: [],
      },
      {
        id: 'normal',
        name: 'Normal Move',
        rule_ref: '09.05',
        maximum_distance: 'M',
        eligible_if: 'Your unit is on the battlefield and unengaged.',
        effect: 'Your unit moves as described in Moving.',
        after_moving: ['Your unit must be unengaged.'],
      },
      {
        id: 'advance',
        name: 'Advance Move',
        rule_ref: '09.06',
        maximum_distance: 'M + Advance roll',
        eligible_if: 'Your unit is on the battlefield and unengaged.',
        effect: 'Your unit moves as described in Moving.',
        before_moving: ['Make an advance roll by rolling one D6.'],
        after_moving: [
          'Your unit must be unengaged.',
          'Until the end of the turn, unless otherwise stated, your unit is not eligible to declare a charge or start an action.',
        ],
      },
      {
        id: 'fall_back',
        name: 'Fall-back Move',
        rule_ref: '09.07',
        maximum_distance: 'M',
        eligible_if: 'Your unit is engaged.',
        effect: 'Your unit moves as described in Moving.',
        before_moving: [
          'Select fall-back mode.',
          'Ordered Retreat can only be selected if the unit is not battle-shocked.',
          'Desperate Escape requires a hazard roll for each model in the unit.',
        ],
        while_moving: ['Desperate Escape: each model that is moved can be moved through enemy models.'],
        after_moving: [
          'Your unit must be unengaged.',
          'Until the end of the turn, unless otherwise stated, your unit is not eligible to shoot, declare a charge or start an action.',
          'Desperate Escape: if your unit is not battle-shocked, you must make a battle-shock roll.',
        ],
        modes: [
          { id: 'ordered_retreat', name: 'Ordered Retreat', eligible_if: 'The unit is not battle-shocked.' },
          { id: 'desperate_escape', name: 'Desperate Escape', hazard_rolls_per_model: 1 },
        ],
      },
      {
        id: 'disembark',
        name: 'Disembark Move',
        rule_ref: '18.04',
        maximum_distance: 'Rapid/Tactical 3", Combat 6"',
        eligible_if: 'Your unit is embarked within a Transport model on the battlefield.',
        effect: 'Your unit is set up as described in Set Up.',
        before_moving: [
          'Rapid Disembark if that Transport made a normal or ingress move this phase.',
          'Tactical Disembark if that Transport remained stationary or has not been selected to move.',
          'Combat Disembark otherwise; make a hazard roll for each model in your unit.',
        ],
        after_moving: [
          'Rapid Disembark: until the end of the turn, your unit is not eligible to declare a charge.',
          'Tactical Disembark: select your unit to make a normal or advance move.',
          'Combat Disembark: if battle-shocked, until end of turn, not eligible to declare a charge.',
        ],
      },
      {
        id: 'ingress',
        name: 'Ingress Move',
        rule_ref: '20.04',
        maximum_distance: 'Set-up distance 6"',
        eligible_if: 'Your unit is in strategic reserves, excluding units embarked within Transports that are themselves in strategic reserves.',
        effect: 'Your unit is set up as described in Set Up.',
        while_moving: [
          'Set up wholly within the set-up distance of one or more battlefield edges.',
          'Set up more than 8" horizontally from all enemy units.',
          'Before the third battle round, no models can be set up wholly within your opponent\'s deployment zone.',
        ],
        after_moving: [
          'Until the start of the next Charge phase, the unit is not eligible to make any other type of move.',
        ],
      },
      {
        id: 'surge',
        name: 'Surge Move',
        rule_ref: '21.02',
        maximum_distance: 'As stated in the triggering rule.',
        eligible_if: 'A rule allowing this move type has triggered; your unit is not battle-shocked, is unengaged, and has not moved this phase.',
        effect: 'Your unit moves as described in Moving.',
        before_moving: ['Select the closest enemy unit to be the surge target.'],
        while_moving: [
          'Each model must end its move engaged with the surge target if possible.',
          'Each model that cannot end engaged with the surge target must end as close as possible to it.',
        ],
        after_moving: [
          'Your unit cannot be engaged with enemy units that were not the surge target.',
          'Your unit cannot move again this phase.',
        ],
      },
    ],
  },
  {
    id: 'shooting',
    sequence: 4,
    name: 'Shooting Phase',
    kind: 'phase',
    summary: 'Your units make attacks with their ranged weapons.',
    primary_rules: [
      'Start of Shooting Phase: resolve rules triggered at the start of the Shooting phase.',
      'Shoot: the active player shoots with eligible units one at a time until every selected unit has resolved its attacks.',
      'End of Shooting Phase: resolve rules triggered at the end of the Shooting phase.',
    ],
    available_actions: ['shooting_type', 'weapon_selection', 'weapon_targets', 'attack_resolution', 'visibility'],
    sub_steps: [
      {
        id: 'start_of_shooting_phase',
        sequence: 1,
        name: 'Start of Shooting Phase',
        rule_ref: '10.01',
        summary: 'Rules that are triggered at the start of the Shooting phase are resolved now.',
      },
      {
        id: 'shoot',
        sequence: 2,
        name: 'Shoot',
        rule_ref: '10.02',
        summary: 'Select one friendly unit that is eligible to shoot and has not been selected to shoot this phase, then select an eligible shooting type and resolve it.',
      },
      {
        id: 'end_of_shooting_phase',
        sequence: 3,
        name: 'End of Shooting Phase',
        rule_ref: '10.03',
        summary: 'Rules that are triggered at the end of the Shooting phase are resolved now.',
      },
    ],
    shooting_types: [
      {
        id: 'normal',
        name: 'Normal Shooting',
        rule_ref: '10.04',
        eligible_if: 'Your unit is unengaged and did not make an Advance move this turn.',
        effect: 'Your unit shoots as described in Making Attacks.',
        after_shooting: ['Until the end of the phase, your unit is not eligible to start an action.'],
      },
      {
        id: 'assault',
        name: 'Assault Shooting',
        rule_ref: '10.05',
        eligible_if: 'Your unit is unengaged, made an Advance move this turn, and has one or more [ASSAULT] weapons.',
        effect: 'Your unit shoots as described in Making Attacks.',
        while_shooting: ['You can only select [ASSAULT] weapons to make attacks with.'],
        after_shooting: ['Until the end of the phase, your unit is not eligible to start an action.'],
      },
      {
        id: 'close_quarters',
        name: 'Close-quarters Shooting',
        rule_ref: '10.06',
        eligible_if: 'Your unit is engaged, did not make an Advance move this turn, and has one or more [CLOSE-QUARTERS] weapons or is a MONSTER/VEHICLE unit.',
        effect: 'Your unit shoots as described in Making Attacks.',
        while_shooting: [
          'Models in your unit can target enemy units your unit is engaged with.',
          'MONSTER/VEHICLE models can attack with each ranged weapon that does not have [CLOSE-QUARTERS] and does not have [BLAST], and can still attack with [CLOSE-QUARTERS] weapons if a [BLAST] weapon cannot target a unit.',
          'Non-MONSTER/Non-VEHICLE models can only select [CLOSE-QUARTERS] weapons and can only target enemy units your unit is engaged with.',
        ],
        after_shooting: ['Until the end of the phase, your unit is not eligible to start an action.'],
      },
      {
        id: 'indirect',
        name: 'Indirect Shooting',
        rule_ref: '10.07',
        eligible_if: 'Your unit is unengaged, did not make an Advance move this turn, and has one or more [INDIRECT FIRE] weapons.',
        effect: 'Your unit shoots as described in Making Attacks.',
        while_shooting: [
          '[INDIRECT FIRE] weapons can target units that are not visible to the attacking model.',
          'Each time an [INDIRECT FIRE] weapon attacks, the target has the benefit of cover, hit rolls cannot be re-rolled, and unmodified hit rolls of 1-5 fail unless your unit remained stationary and the target is visible to one or more friendly units.',
        ],
        after_shooting: ['Until the end of the phase, your unit is not eligible to start an action.'],
      },
    ],
  },
  {
    id: 'charge',
    sequence: 5,
    name: 'Charge Phase',
    kind: 'phase',
    summary: 'Your units make charge moves to engage the enemy.',
    primary_rules: [
      'Start of Charge Phase: resolve rules triggered at the start of the Charge phase.',
      'Charge: the active player resolves charges with eligible units one at a time.',
      'End of Charge Phase: resolve rules triggered at the end of the Charge phase.',
    ],
    available_actions: ['charge_roll', 'model_move', 'unit_engagement', 'hazard_rolls'],
    sub_steps: [
      {
        id: 'start_of_charge_phase',
        sequence: 1,
        name: 'Start of Charge Phase',
        rule_ref: '11.01',
        summary: 'Rules that are triggered at the start of the Charge phase are resolved now.',
      },
      {
        id: 'charge',
        sequence: 2,
        name: 'Charge',
        rule_ref: '11.02',
        summary: 'Select one eligible friendly unit that has not declared a charge this phase, roll 2D6, then make a charge move if the result is sufficient.',
      },
      {
        id: 'end_of_charge_phase',
        sequence: 3,
        name: 'End of Charge Phase',
        rule_ref: '11.03',
        summary: 'Rules that are triggered at the end of the Charge phase are resolved now.',
      },
    ],
    charge_rules: {
      eligible_if: [
        'The unit is on the battlefield.',
        'The unit is within 12" of one or more enemy units.',
        'The unit is not engaged.',
        'The unit did not make an Advance or Fall-back move this turn.',
        'The unit has not declared a charge this phase.',
      ],
      roll: 'Roll 2D6; the result is the maximum distance for the charge move.',
      success: 'The charge succeeds if that move can end within Engagement Range of every target selected for the charge.',
      failed_charge: 'If the charge roll is insufficient, the unit does not make a charge move and counts as having charged.',
      charge_move: {
        rule_ref: '11.04',
        maximum_distance: 'Charge roll.',
        eligible_if: 'Your unit declared a charge this phase.',
        effect: 'Your unit moves as described in Moving.',
        before_moving: [
          'Select one or more enemy units that are within 12" of your unit and within the maximum distance of this move.',
          'Each selected enemy unit is a charge target until the end of this move.',
        ],
        while_moving: [
          'Each model must end its move closer to one or more charge targets.',
          'Each model that can end its move within 1" of one or more charge targets must do so.',
          'Each model that can end its move engaged with one or more charge targets must do so.',
        ],
        after_moving: [
          'Your unit must be engaged with all of the charge targets.',
          'Your unit cannot be engaged with one or more enemy units that are not charge targets.',
          'Until the end of the turn, each model in your unit has the Fights First ability.',
        ],
        fights_first_after: true,
      },
    },
  },
  {
    id: 'fight',
    sequence: 6,
    name: 'Fight Phase',
    kind: 'phase',
    summary: "Both players' units make attacks with their melee weapons.",
    primary_rules: [
      'Start of Fight Phase: resolve rules triggered at the start of the Fight phase.',
      'Pile In: both players make pile-in moves with eligible units, starting with the player whose turn it is.',
      'Fight: combatants make melee attacks.',
      'Consolidate: eligible units make consolidation moves.',
      'End of Fight Phase: resolve rules triggered at the end of the Fight phase.',
    ],
    available_actions: ['pile_in', 'fight_type', 'consolidate', 'weapon_selection', 'weapon_targets', 'attack_resolution', 'mortal_wounds'],
    sub_steps: [
      {
        id: 'start_of_fight_phase',
        sequence: 1,
        name: 'Start of Fight Phase',
        rule_ref: '12.01',
        summary: 'Rules that are triggered at the start of the Fight phase are resolved now.',
      },
      {
        id: 'pile_in',
        sequence: 2,
        name: 'Pile In',
        rule_ref: '12.02',
        summary: 'Both players make pile-in moves with all eligible units they choose to move, starting with the player whose turn it is.',
      },
      {
        id: 'fight',
        sequence: 3,
        name: 'Fight',
        summary: 'Combatants make melee attacks.',
      },
      {
        id: 'consolidate',
        sequence: 4,
        name: 'Consolidate',
        rule_ref: '12.07',
        summary: 'Both players make consolidation moves with eligible units they choose to move, starting with the player whose turn it is.',
      },
      {
        id: 'end_of_fight_phase',
        sequence: 5,
        name: 'End of Fight Phase',
        rule_ref: '12.09',
        summary: 'Rules that are triggered at the end of the Fight phase are resolved now.',
      },
    ],
    fight_rules: {
      fight: {
        rule_ref: '12.04',
        eligible_if: [
          'The unit has not already been selected to fight this phase.',
          'The unit is engaged, was engaged at the start of this step, or made a charge move this turn.',
        ],
        sequence: [
          'Resolve Fights First Combats: starting with the player whose turn it is, players alternate selecting one eligible friendly Fights First unit.',
          'Resolve Remaining Combats: starting with the player who just moved, players alternate selecting one eligible friendly unit.',
          'After resolving a fight in Remaining Combats, return to Fights First if any Fights First units are eligible.',
        ],
      },
      fight_types: [
        {
          id: 'normal',
          name: 'Normal Fight',
          rule_ref: '12.05',
          eligible_if: 'Your unit is engaged.',
          effect: 'Your unit fights as described in Making Attacks.',
        },
        {
          id: 'overrun',
          name: 'Overrun Fight',
          rule_ref: '12.06',
          eligible_if: 'Your unit is unengaged, or was unengaged at the start of the Fight step but became engaged during the Fight phase.',
          effect: 'Your unit can make one additional pile-in move, then fights as described in Making Attacks.',
        },
      ],
      pile_in_move: {
        rule_ref: '12.03',
        maximum_distance: '3"',
        eligible_if: [
          'It is the Fight phase.',
          'The unit is engaged, made a charge move this turn, or was selected to make an Overwatching fight this phase.',
        ],
        effect: 'Your unit moves as described in Moving.',
        before_moving: [
          'If your unit is engaged, select every enemy unit it is engaged with as pile-in targets.',
          'Otherwise, select one or more enemy units within 5" of your unit as pile-in targets.',
        ],
        while_moving: [
          'Models in base-contact with one or more enemy models cannot be moved.',
          'Each model that is moved must end its move closer to the closest pile-in target, and engaged with it if possible.',
        ],
        after_moving: [
          'Your unit must be engaged.',
          'Each model that started this move engaged with an enemy unit must still be engaged with that enemy unit.',
        ],
      },
      consolidate_move: {
        rule_ref: '12.08',
        maximum_distance: '3"',
        eligible_if: 'It is the Fight phase and your unit was eligible to fight this phase.',
        effect: 'Your unit moves as described in Moving.',
        before_moving: [
          'Ongoing Consolidation: if your unit is engaged, you must select this mode and every enemy unit it is engaged with.',
          'Engaging Consolidation: otherwise, if your unit is within 3" of one or more enemy units, you must select this mode and one or more of those enemy units.',
          'Objective Consolidation: otherwise, if your unit is within 3" of one or more objectives, you must select this mode and select one of those objectives.',
        ],
        while_moving: [
          'Ongoing Consolidation: models in base-contact with enemy models cannot be moved. Each moved model must end closer to the closest selected enemy unit, and engaged with it if possible.',
          'Engaging Consolidation: each moved model must end closer to the closest selected enemy unit, and engaged with it if possible.',
          'Objective Consolidation: each moved model must end within range of the selected objective if possible, or closer to it if not.',
        ],
        after_moving: [
          'Ongoing Consolidation: each model that started this move engaged with an enemy unit must still be engaged with that unit.',
          'Engaging Consolidation: your unit must be engaged with all selected enemy units.',
          'Objective Consolidation: your unit must be within range of the selected objective.',
        ],
        modes: [
          {
            id: 'ongoing',
            name: 'Ongoing Consolidation',
            required_when: 'Your unit is engaged.',
          },
          {
            id: 'engaging',
            name: 'Engaging Consolidation',
            required_when: 'Your unit is unengaged and within 3" of one or more enemy units.',
          },
          {
            id: 'objective',
            name: 'Objective Consolidation',
            required_when: 'Your unit is unengaged, no enemy unit is within 3", and one or more objectives are within 3".',
          },
        ],
      },
    },
  },
  {
    id: 'end_of_turn',
    sequence: 7,
    name: 'End of Turn Step',
    kind: 'step',
    summary: 'Rules that are triggered at the end of a turn are resolved now, in the following order.',
    primary_rules: [
      'First resolve rules triggered at this point other than mission rules.',
      'Then resolve mission rules triggered at this point.',
      'Units not in coherency must remove models until they regain coherency.',
    ],
    available_actions: ['regain_coherency'],
  },
]
const TURN_ACTION_LABELS = {
  attack_resolution: 'Resolve Attacks',
  battle_shock_roll: 'Battle-shock Rolls',
  command_abilities: 'Command Abilities',
  charge_roll: 'Charge Roll',
  consolidate: 'Consolidate',
  fight_type: 'Fight Type',
  gain_core_cp: 'Gain Core CP',
  hazard_rolls: 'Hazard Rolls',
  leadership_roll: 'Leadership Rolls',
  model_move: 'Moving Units',
  mortal_wounds: 'Mortal Wounds',
  pile_in: 'Pile In',
  regain_coherency: 'Regain Coherency',
  shooting_type: 'Shooting Type',
  unit_coherency: 'Coherency',
  unit_engagement: 'Engagement',
  unit_setup: 'Set Up',
  visibility: 'Visibility',
  weapon_selection: 'Select Weapons',
  weapon_targets: 'Select Targets',
}
const TURN_ACTION_DESCRIPTIONS = {
  attack_resolution: 'Resolve selected attacks through hit, wound, save, damage, mortal wound, and identical attack handling.',
  battle_shock_roll: 'Make Leadership-based battle-shock rolls and apply battle-shocked restrictions when needed.',
  command_abilities: 'Resolve Command phase rules that are not start triggers, Core CP gain, or battle-shock rolls.',
  charge_roll: 'Roll 2D6 and check whether the selected unit can complete a legal charge move.',
  consolidate: 'Resolve post-fight consolidation movement and its required mode restrictions.',
  fight_type: 'Choose the legal fight type for the selected unit, including normal and overrun fights.',
  gain_core_cp: 'Add the Core CP gained by both players in the Command phase.',
  hazard_rolls: 'Roll Hazard tests and apply the resulting mortal wounds.',
  leadership_roll: 'Roll 2D6 against one or more Leadership values in the unit.',
  model_move: 'Validate movement distance, phase restrictions, engagement, pass-through rules, and after-move eligibility.',
  mortal_wounds: 'Allocate mortal wounds one at a time using the required model-selection order.',
  pile_in: 'Validate pile-in movement toward eligible targets before fighting.',
  regain_coherency: 'Remove models until a unit out of coherency is back in coherency.',
  shooting_type: 'Choose a legal shooting type: normal, assault, close-quarters, or indirect.',
  unit_coherency: 'Check the 2"/5" and 9"/5" coherency requirements.',
  unit_engagement: 'Check whether units are engaged or unengaged using Engagement Range.',
  unit_setup: 'Validate setup placement, coherency, unengaged state, and other placement restrictions.',
  visibility: 'Check line of sight and visibility between models.',
  weapon_selection: 'Choose eligible ranged or melee weapons for the current attack step.',
  weapon_targets: 'Choose legal targets for each selected weapon.',
}
const TURN_PHASE_MARKERS = {
  start_of_turn: 'I',
  command: 'CP',
  movement: 'MV',
  shooting: 'RG',
  charge: 'CH',
  fight: 'ML',
  end_of_turn: 'E',
}
const CORE_STRATAGEMS = [
  {
    name: 'Command Re-roll',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'either',
    timing_color: 'green',
    timing: 'Any phase, just after you make an Advance roll, Charge roll, Damage roll, Hazard roll, Hit roll, Save roll, Wound roll, or a roll to determine the number of attacks generated by a weapon.',
    target: 'That unit or model.',
    effect: 'Re-roll that roll. If you are re-rolling more than one dice together, select one of those dice to re-roll; Charge rolls must be re-rolled in full.',
    restrictions: [],
    core: true,
    rule_ref: '15.02',
  },
  {
    name: 'Epic Challenge',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'your_turn',
    timing_color: 'blue',
    timing: 'Fight phase, just after a friendly Character unit is selected to fight.',
    target: 'That Character unit.',
    effect: 'Select one Character model in your unit. Until the end of the phase, that model’s melee weapons have the [Precision] ability.',
    restrictions: [],
    core: true,
    rule_ref: '15.03',
  },
  {
    name: 'Insane Bravery',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'your_turn',
    timing_color: 'blue',
    timing: 'Battle-shock step of your Command phase, just before you make a Battle-shock roll for a friendly unit.',
    target: 'That unit.',
    effect: 'That Battle-shock roll is automatically successful.',
    restrictions: ['You cannot use this stratagem more than once per battle.'],
    once_per_battle: true,
    core: true,
    rule_ref: '15.04',
  },
  {
    name: 'Explosives',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'your_turn',
    timing_color: 'blue',
    timing: 'Your Shooting phase.',
    target: 'One friendly unengaged Explosives/Grenades unit that is eligible to shoot and did not make an Advance move this turn.',
    effect: 'Select one Explosives/Grenades model in your unit, then select one unengaged enemy unit within 8" and visible to that model. Roll six D6; for each 4+, that enemy unit suffers 1 mortal wound.',
    restrictions: [],
    core: true,
    rule_ref: '15.05',
  },
  {
    name: 'Crushing Impact',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'your_turn',
    timing_color: 'blue',
    timing: 'Your Charge phase, just after a friendly Monster/Vehicle unit ends a Charge move.',
    target: 'That Monster/Vehicle unit.',
    effect: 'Select one enemy unit engaged with your unit and one model in your unit engaged with that enemy unit. Roll D6 equal to that model’s Toughness; for each 1, your unit suffers 1 mortal wound, and for each 5+, that enemy unit suffers 1 mortal wound, to a maximum of 6 mortal wounds per unit.',
    restrictions: [],
    core: true,
    rule_ref: '15.06',
  },
  {
    name: 'Rapid Ingress',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'opponent_turn',
    timing_color: 'red',
    timing: 'End of your opponent’s Movement phase.',
    target: 'One friendly unit that is in Strategic Reserves, excluding Aircraft.',
    effect: 'Your unit makes an ingress move.',
    restrictions: ['You cannot use this stratagem during the first battle round.'],
    unavailable_battle_rounds: [1],
    core: true,
    rule_ref: '15.07',
  },
  {
    name: 'Fire Overwatch',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'opponent_turn',
    timing_color: 'red',
    timing: 'End of your opponent’s Movement phase.',
    target: 'One friendly unengaged unit, excluding Titanic units.',
    effect: 'Your unit shoots using Snap Shooting. You can only target one visible enemy unit within 24"; each attack only hits on an unmodified hit roll of 6, and hit rolls cannot be re-rolled.',
    restrictions: [],
    core: true,
    rule_ref: '15.08',
  },
  {
    name: 'Smokescreen',
    type: 'Core',
    cp_cost: 1,
    turn_timing: 'opponent_turn',
    timing_color: 'red',
    timing: 'Start of your opponent’s Shooting phase.',
    target: 'One friendly Smoke unit.',
    effect: 'Until the end of the phase, each attack targeting your Smoke unit, or a unit that is not fully visible to the attacking model because of one or more models in your Smoke unit, has the benefit of cover.',
    restrictions: [],
    core: true,
    rule_ref: '15.10',
  },
  {
    name: 'Heroic Intervention',
    type: 'Core',
    cp_cost: 1,
    alternate_cp_cost: 2,
    turn_timing: 'opponent_turn',
    timing_color: 'red',
    timing: 'End of your opponent’s Charge phase.',
    target: 'One friendly unengaged unit within 12" of one or more enemy units. You can only select a Vehicle unit if it is a Character or Walker unit.',
    effect: 'Resolve a charge with your unit. Leap to Defend costs 1CP and can only select enemy units that made a Charge move this phase and are within maximum distance. Into the Fray costs 2CP and allows enemy units within 6" of your unit and within maximum distance if the charge roll is greater than 6.',
    restrictions: [],
    core: true,
    rule_ref: '15.11',
  },
  {
    name: 'Counteroffensive',
    type: 'Core',
    cp_cost: 2,
    turn_timing: 'opponent_turn',
    timing_color: 'red',
    timing: 'Fight step of your opponent’s Fight phase, just after an enemy unit has resolved its attacks.',
    target: 'One friendly unit that is eligible to fight.',
    effect: 'Until the end of the phase, your unit has the Fights First ability and it must be the next unit you select to fight.',
    restrictions: [],
    core: true,
    rule_ref: '15.12',
  },
]
const DEFAULT_MISSION_ACTIONS = [
  {
    id: 'mission_action',
    name: 'Mission Action',
    source: 'Mission',
    starts: 'Defined by the mission rule.',
    units: 'Defined by the mission rule; apply core Action eligibility from 16.01.',
    use_limit: 'Defined by the mission rule.',
    completes: 'Defined by the mission rule.',
    effect: 'Resolve the mission effect when this action is completed.',
    restrictions: ['Mission actions can add their own restrictions later.'],
    rule_ref: '16.01',
  },
]
const UNIT_BASE_DIAMETERS_MM = {
  "Lion El'Jonson": 60,
  'Logan Grimnar': 80,
  'Grey Hunters': 32,
}

function getDetachmentByName(factionDetails, detachmentName) {
  return factionDetails?.detachments?.find((detachment) => detachment.name === detachmentName) || null
}

function unitIsEpicHero(unit) {
  return (unit?.keywords || []).some((keyword) => String(keyword).toLowerCase() === 'epic hero')
}

function getAttackerEnhancementOptions(detachment, enhancementBearerUnit, attackerUnit, selectedWeapon, hasHazardous) {
  if (!detachment || !enhancementBearerUnit || unitIsEpicHero(enhancementBearerUnit)) {
    return []
  }

  if (detachment.name === UNFORGIVEN_TASK_FORCE) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === 'Stubborn Tenacity') {
        return true
      }
      if (enhancement.name === 'Weapons of the First Legion') {
        return selectedWeapon?.range === 'Melee'
      }
      if (enhancement.name === 'Pennant of Remembrance') {
        return hasHazardous
      }
      return false
    })
  }

  if (detachment.name === SAGA_OF_THE_HUNTER) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === 'Fenrisian Grit') {
        return hasHazardous
      }
      if (enhancement.name === 'Wolf Master') {
        return (attackerUnit?.weapons || []).some((weapon) => (
          ['teeth and claws', 'tyrnak and fenrir'].includes(String(weapon.name).toLowerCase())
        ))
      }
      return enhancement.name === 'Feral Rage' && selectedWeapon?.range === 'Melee'
    })
  }

  if (detachment.name === SAGA_OF_THE_BEASTSLAYER) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === "Elder's Guidance") {
        return selectedWeapon?.range === 'Melee' && attackerUnit?.name === 'Blood Claws'
      }
      return enhancement.name === 'Helm of the Beastslayer'
    })
  }

  if (detachment.name === SAGA_OF_THE_BOLD) {
    return (detachment.enhancements || []).filter((enhancement) => (
      (enhancement.name === "Braggart's Steel" || enhancement.name === 'Hordeslayer')
      && selectedWeapon?.range === 'Melee'
    ))
  }

  if (detachment.name === WAR_HORDE) {
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === "Headwoppa's Killchoppa") {
        return selectedWeapon?.range === 'Melee' && !weaponHasExtraAttacks(selectedWeapon)
      }
      return enhancement.name === 'Supa-Cybork Body'
    })
  }

  if (detachment.name === DA_BIG_HUNT) {
    if (!unitHasKeyword(enhancementBearerUnit, 'beast snagga')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Proper Killy' && selectedWeapon?.range === 'Melee',
    )
  }

  if (detachment.name === DREAD_MOB) {
    if (!unitHasKeyword(enhancementBearerUnit, 'mek')) {
      return []
    }
    return (detachment.enhancements || []).filter((enhancement) => {
      if (enhancement.name === 'Gitfinder Gogglez') {
        return selectedWeapon?.range !== 'Melee'
      }
      return enhancement.name === 'Press It Fasta!'
    })
  }

  if (detachment.name === GREEN_TIDE) {
    if (!unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter((enhancement) => (
      enhancement.name === 'Ferocious Show Off'
        ? selectedWeapon?.range === 'Melee'
        : enhancement.name === 'Raucous Warcaller'
    ))
  }

  if (detachment.name === BULLY_BOYZ) {
    if (!unitHasKeyword(enhancementBearerUnit, 'warboss') || !unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter((enhancement) => (
      enhancement.name === "'Eadstompa" && selectedWeapon?.range === 'Melee'
    ))
  }

  return []
}

function getDefenderEnhancementOptions(detachment, enhancementBearerUnit) {
  if (!detachment || !enhancementBearerUnit || unitIsEpicHero(enhancementBearerUnit)) {
    return []
  }

  if (detachment.name === UNFORGIVEN_TASK_FORCE) {
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Pennant of Remembrance',
    )
  }

  if (detachment.name === SAGA_OF_THE_HUNTER) {
    return (detachment.enhancements || []).filter((enhancement) => (
      enhancement.name === 'Fenrisian Grit' && Number(enhancementBearerUnit?.model_count ?? 1) === 1
    ))
  }

  if (detachment.name === SAGA_OF_THE_BEASTSLAYER) {
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Helm of the Beastslayer',
    )
  }

  if (detachment.name === WAR_HORDE) {
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Supa-Cybork Body',
    )
  }

  if (detachment.name === DA_BIG_HUNT) {
    if (!unitHasKeyword(enhancementBearerUnit, 'beastboss on squigosaur')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Surly As a Squiggoth',
    )
  }

  if (detachment.name === DREAD_MOB) {
    if (!unitHasKeyword(enhancementBearerUnit, 'mek')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Smoky Gubbinz',
    )
  }

  if (detachment.name === GREEN_TIDE) {
    if (!unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Raucous Warcaller',
    )
  }

  if (detachment.name === BULLY_BOYZ) {
    if (!unitHasKeyword(enhancementBearerUnit, 'warboss') || !unitHasKeyword(enhancementBearerUnit, 'infantry')) {
      return []
    }
    return (detachment.enhancements || []).filter(
      (enhancement) => enhancement.name === 'Da Biggest Boss',
    )
  }

  return []
}

function getAttackerStratagemOptions(detachment, unit, isRangedWeapon) {
  if (!detachment) {
    return []
  }

  return (detachment.stratagems || []).filter((stratagem) => {
    if (detachment.name === UNFORGIVEN_TASK_FORCE) {
      if (stratagem.name === 'Fire Discipline') {
        return isRangedWeapon
      }
      return stratagem.name === 'Unforgiven Fury'
    }

    if (detachment.name === SAGA_OF_THE_HUNTER) {
      return (
        stratagem.name === 'Marked for Destruction'
        && isRangedWeapon
        && !unitHasKeyword(unit, 'beasts')
      )
    }

    if (detachment.name === SAGA_OF_THE_BEASTSLAYER) {
      return stratagem.name === 'Unbridled Ferocity' && !isRangedWeapon
    }

    if (detachment.name === WAR_HORDE) {
      return stratagem.name === 'Unbridled Carnage'
    }

    if (detachment.name === DA_BIG_HUNT) {
      return stratagem.name === 'Drag It Down' && !isRangedWeapon
    }

    if (detachment.name === KULT_OF_SPEED) {
      if (stratagem.name === 'Blitza Fire' || stratagem.name === 'Dakkastorm') {
        return isRangedWeapon
      }
      return stratagem.name === 'Full Throttle!' && !isRangedWeapon
    }

    if (detachment.name === DREAD_MOB) {
      if (stratagem.name === "Klankin' Klaws") {
        return !isRangedWeapon
      }
      return isRangedWeapon && (
        stratagem.name === 'Dakka! Dakka! Dakka!' || stratagem.name === 'Bigger Shells for Bigger Gitz'
      )
    }

    if (detachment.name === GREEN_TIDE) {
      return stratagem.name === 'Competitive Streak' && !isRangedWeapon
    }

    if (detachment.name === BULLY_BOYZ) {
      return stratagem.name === 'Armed to da Teef'
    }

    return false
  })
}

function getDefenderStratagemOptions(detachment, selectedWeapon) {
  if (!detachment) {
    return []
  }

  return (detachment.stratagems || []).filter((stratagem) => {
    if (detachment.name === UNFORGIVEN_TASK_FORCE) {
      if (stratagem.name === 'Armour of Contempt') {
        return Number(selectedWeapon?.ap || 0) > 0
      }
      return stratagem.name === 'Unbreakable Lines'
    }

    if (detachment.name === SAGA_OF_THE_HUNTER) {
      return stratagem.name === 'Overwhelming Onslaught' && selectedWeapon?.range === 'Melee'
    }

    if (detachment.name === WAR_HORDE) {
      return stratagem.name === "'Ard as Nails"
    }

    if (detachment.name === DA_BIG_HUNT) {
      return stratagem.name === "Stalkin' Taktiks" && selectedWeapon?.range !== 'Melee'
    }

    if (detachment.name === KULT_OF_SPEED) {
      return stratagem.name === 'Speediest Freeks'
    }

    if (detachment.name === DREAD_MOB) {
      return stratagem.name === 'Extra Gubbinz'
    }

    if (detachment.name === BULLY_BOYZ) {
      return stratagem.name === 'Hulking Brutes'
    }

    return false
  })
}

function formatError(error) {
  if (error?.response?.data?.detail) {
    return String(error.response.data.detail)
  }
  return error?.message || 'Something went wrong.'
}

function buildSimulationPayload(state) {
  const options = {
    target_has_cover: state.targetHasCover,
    attacker_in_engagement_range: state.attackerInEngagementRange,
    target_in_engagement_range_of_allies: state.targetInEngagementRangeOfAllies,
    target_engaged_monster_vehicle: state.targetEngagedMonsterVehicle,
    in_half_range: state.inHalfRange,
    oath_of_moment_active: state.oathOfMomentActive,
    charged_this_turn: state.chargedThisTurn,
    remained_stationary: state.remainedStationary,
    indirect_target_visible: state.indirectTargetVisible,
    plunging_fire_active: state.plungingFireActive,
    hazardous_overwatch_charge_phase: state.hazardousOverwatchChargePhase,
    attacker_marked_for_destruction_active: state.attackerMarkedForDestructionActive,
    attacker_fire_discipline_active: state.attackerFireDisciplineActive,
    attacker_unforgiven_fury_active: state.attackerUnforgivenFuryActive,
    attacker_unforgiven_fury_army_battleshocked: state.attackerUnforgivenFuryArmyBattleshocked,
    attacker_stubborn_tenacity_active: state.attackerStubbornTenacityActive,
    attacker_weapons_of_the_first_legion_active: state.attackerWeaponsOfTheFirstLegionActive,
    attacker_pennant_of_remembrance_active: state.attackerPennantOfRemembranceActive,
    attacker_below_starting_strength: state.attackerBelowStartingStrength,
    attacker_battleshocked: state.attackerBattleshocked,
    attacker_saga_completed: state.attackerSagaCompleted,
    attacker_elders_guidance_active: state.attackerEldersGuidanceActive,
    attacker_boast_achieved: state.attackerBoastAchieved,
    attacker_hordeslayer_outnumbered: state.attackerHordeslayerOutnumbered,
    attacker_heroes_all_reroll_type: state.attackerHeroesAllRerollType || null,
    attacker_unbridled_ferocity_active: state.attackerUnbridledFerocityActive,
    attacker_waaagh_active: state.attackerWaaaghActive,
    defender_waaagh_active: state.defenderWaaaghActive,
    attacker_prey_active: state.attackerPreyActive,
    attacker_target_within_9: state.attackerTargetWithinNine,
    attacker_counts_as_ten_plus_models: state.attackerCountsAsTenPlusModels,
    defender_counts_as_ten_plus_models: state.defenderCountsAsTenPlusModels,
    target_below_starting_strength: state.targetBelowStartingStrength,
    target_below_half_strength: state.targetBelowHalfStrength,
    attacker_try_dat_button_effects: state.attackerTryDatButtonEffects || [],
    attacker_try_dat_button_hazardous: state.attackerTryDatButtonHazardous,
    attacker_unbridled_carnage_active: state.attackerUnbridledCarnageActive,
    defender_ard_as_nails_active: state.defenderArdAsNailsActive,
    attacker_drag_it_down_active: state.attackerDragItDownActive,
    defender_stalkin_taktiks_active: state.defenderStalkinTaktiksActive,
    defender_speediest_freeks_active: state.defenderSpeediestFreeksActive,
    attacker_blitza_fire_active: state.attackerBlitzaFireActive,
    attacker_dakkastorm_active: state.attackerDakkastormActive,
    attacker_full_throttle_active: state.attackerFullThrottleActive,
    attacker_klankin_klaws_active: state.attackerKlankinKlawsActive,
    attacker_klankin_klaws_pushed: state.attackerKlankinKlawsPushed,
    attacker_dakka_dakka_dakka_active: state.attackerDakkaDakkaDakkaActive,
    attacker_dakka_dakka_dakka_pushed: state.attackerDakkaDakkaDakkaPushed,
    attacker_bigger_shells_active: state.attackerBiggerShellsActive,
    attacker_bigger_shells_pushed: state.attackerBiggerShellsPushed,
    defender_extra_gubbinz_active: state.defenderExtraGubbinzActive,
    attacker_competitive_streak_active: state.attackerCompetitiveStreakActive,
    attacker_armed_to_da_teef_active: state.attackerArmedToDaTeefActive,
    defender_hulking_brutes_active: state.defenderHulkingBrutesActive,
    defender_armour_of_contempt_active: state.defenderArmourOfContemptActive,
    defender_overwhelming_onslaught_active: state.defenderOverwhelmingOnslaughtActive,
    defender_unbreakable_lines_active: state.defenderUnbreakableLinesActive,
    defender_pennant_of_remembrance_active: state.defenderPennantOfRemembranceActive,
    defender_battleshocked: state.defenderBattleshocked,
  }

  if (state.attachedCharacterName) {
    options.attached_character_name = state.attachedCharacterName
  }
  if (state.hazardousBearerCurrentWounds !== '') {
    options.hazardous_bearer_current_wounds = Number(state.hazardousBearerCurrentWounds)
  }

  return {
    attacker_faction: state.attackerFaction,
    attacker_unit: state.attackerUnit,
    attacker_detachment_name: state.attackerDetachmentName || undefined,
    attacker_enhancement_name: state.attackerEnhancementName || undefined,
    attacker_loadout: state.attackerLoadoutSelections || {},
    attacker_model_count: state.attackerModelCount !== '' ? Number(state.attackerModelCount) : undefined,
    attacker_model_counts: state.attackerModelCounts || {},
    attacker_attached_character_name: state.attackerAttachedLeaderName || undefined,
    attacker_attached_character_loadout: state.attackerAttachedLeaderLoadoutSelections || {},
    attacker_attached_character_model_count: state.attackerAttachedLeaderModelCount !== '' ? Number(state.attackerAttachedLeaderModelCount) : undefined,
    attacker_attached_character_model_counts: state.attackerAttachedLeaderModelCounts || {},
    weapon_names: state.weaponNames || [],
    defender_faction: state.defenderFaction,
    defender_unit: state.defenderUnit,
    defender_detachment_name: state.defenderDetachmentName || undefined,
    defender_enhancement_name: state.defenderEnhancementName || undefined,
    defender_loadout: state.defenderLoadoutSelections || {},
    defender_model_count: state.defenderModelCount !== '' ? Number(state.defenderModelCount) : undefined,
    defender_model_counts: state.defenderModelCounts || {},
    attached_character_loadout: state.attachedCharacterLoadoutSelections || {},
    attached_character_model_count: state.attachedCharacterModelCount !== '' ? Number(state.attachedCharacterModelCount) : undefined,
    attached_character_model_counts: state.attachedCharacterModelCounts || {},
    options,
  }
}

function formatInvulnerableSave(value) {
  const text = String(value)
  return text.endsWith('+') ? `${text}+` : `${text}++`
}

function formatRangeValue(value) {
  return String(value).replace(/\s*inches?/i, '"')
}

function formatWeaponBaseName(name) {
  return String(name).replace(/\s-\s*([a-z])/, (_, firstLetter) => ` - ${firstLetter.toUpperCase()}`)
}

function formatWeaponName(weapon) {
  if (!weapon) {
    return ''
  }
  if (weapon.label) {
    return weapon.label
  }

  const keywordText = (weapon.raw_keywords || [])
    .map((keyword) => `[${keyword}]`)
    .join(' ')

  const formattedName = formatWeaponBaseName(weapon.name)
  return keywordText ? `${formattedName} ${keywordText}` : formattedName
}

function weaponHasExtraAttacks(weapon) {
  return (weapon?.raw_keywords || []).includes('Extra Attacks')
}

function getWeaponProfileGroupName(weapon) {
  const name = String(weapon?.name || '')
  return name.split(/\s+-\s+/)[0].trim().toLowerCase() || name.toLowerCase()
}

function resolveBattlefieldWeaponSelection(currentWeaponNames, weapon, checked, weaponOptions, limitToSingleWeapon) {
  if (!checked) {
    return currentWeaponNames.filter((name) => name !== weapon.name)
  }
  if (limitToSingleWeapon) {
    return [weapon.name]
  }

  const selectedGroupName = getWeaponProfileGroupName(weapon)
  const weaponByName = new Map(weaponOptions.map((option) => [option.name, option]))
  const withoutSameProfileGroup = currentWeaponNames.filter((name) => {
    const selectedWeapon = weaponByName.get(name)
    return selectedWeapon && getWeaponProfileGroupName(selectedWeapon) !== selectedGroupName
  })
  return [...withoutSameProfileGroup, weapon.name]
}

function buildWeaponSelectionProfile(selectedWeapons, selectedLabels = []) {
  if (!selectedWeapons.length) {
    return null
  }
  if (selectedWeapons.length === 1) {
    return {
      ...selectedWeapons[0],
      label: selectedLabels[0] || selectedWeapons[0].label || null,
    }
  }

  const rawKeywordSet = new Set()
  const keywordSet = new Set()
  let maximumAp = 0
  for (const weapon of selectedWeapons) {
    for (const keyword of weapon.raw_keywords || []) {
      rawKeywordSet.add(keyword)
    }
    for (const keyword of weapon.keywords || []) {
      keywordSet.add(keyword)
    }
    maximumAp = Math.max(maximumAp, Number(weapon.ap || 0))
  }
  const allMelee = selectedWeapons.every((weapon) => weapon.range === 'Melee')
  const allRanged = selectedWeapons.every((weapon) => weapon.range !== 'Melee')

  return {
    name: '__selected_weapons__',
    label: allMelee ? 'Selected Melee Weapons' : allRanged ? 'Selected Ranged Weapons' : 'Selected Weapons',
    range: allMelee ? 'Melee' : allRanged ? 'Ranged' : 'Mixed',
    ap: maximumAp,
    ap_display: maximumAp > 0 ? `-${maximumAp}` : '0',
    raw_keywords: Array.from(rawKeywordSet),
    keywords: Array.from(keywordSet),
  }
}

function buildAttachedLeaderWeaponId(weaponName) {
  return `${ATTACHED_LEADER_WEAPON_PREFIX}${weaponName}`
}

function unitHasOathOfMoment(unit) {
  return (unit?.abilities || []).some((ability) => {
    const name = String(ability.name || '').toLowerCase()
    const rulesText = String(ability.rules_text || '').toLowerCase()
    return name.includes('oath of moment') || rulesText.includes('oath of moment')
  })
}

function unitHasWaaagh(unit) {
  return (unit?.abilities || []).some((ability) => {
    const name = String(ability.name || '').toLowerCase()
    const rulesText = String(ability.rules_text || '').toLowerCase()
    return name.includes('waaagh!') || rulesText.includes('waaagh!')
  })
}

function unitGetsOathWoundBonus(unit) {
  const combinedKeywords = [
    ...(unit?.keywords || []),
    ...(unit?.faction_keywords || []),
  ].map((keyword) => String(keyword).toLowerCase())

  return !OATH_EXCLUDED_KEYWORDS.some((keyword) => combinedKeywords.includes(keyword))
}

function getDetachmentEntry(detachment, collectionName, entryName) {
  const collection = detachment?.[collectionName]
  if (!collection) {
    return null
  }
  if (Array.isArray(collection)) {
    return collection.find((entry) => entry.name === entryName) || null
  }
  if (typeof collection === 'object') {
    if (!entryName || collection.name === entryName) {
      return collection
    }
  }
  return null
}

function getUnitAbility(unit, matcher) {
  return (unit?.abilities || []).find((ability) => matcher(ability))
    || (unit?.wargear_abilities || []).find((ability) => matcher(ability))
    || null
}

function getAbilitySourceLabel(rule, fallback = 'Datasheet Ability') {
  const name = String(rule?.name || '').toLowerCase()
  const text = String(rule?.rules_text || '').toLowerCase()
  const tags = (rule?.tags || rule?.keywords || []).map((tag) => String(tag).toLowerCase())
  if (tags.includes('aura') || name.includes('aura') || text.includes('aura')) {
    return 'Aura Ability'
  }
  if (tags.includes('psychic') || name.includes('psychic') || text.includes('psychic')) {
    return 'Psychic Ability'
  }
  if (tags.includes('faction') || text.includes('army rule') || text.includes('faction ability')) {
    return 'Faction Ability'
  }
  if (fallback === 'Wargear Ability') {
    return 'Wargear Ability'
  }
  return fallback
}

function buildTooltip(...sections) {
  return sections
    .map((section) => String(section || '').trim())
    .filter(Boolean)
    .join('\n\n')
}

function formatDetachmentTooltip(detachment) {
  if (!detachment) {
    return 'No detachment selected.'
  }

  const restrictionText = String(detachment.restrictions || '').trim()
  return buildTooltip(
    detachment.rule?.name ? `${detachment.rule.name}: ${detachment.rule.rules_text || ''}` : '',
    restrictionText ? `Restrictions: ${restrictionText}` : '',
  ) || detachment.name
}

function formatEnhancementTooltip(enhancement) {
  if (!enhancement) {
    return 'No enhancement selected.'
  }

  const restrictionText = Array.isArray(enhancement.restrictions)
    ? enhancement.restrictions.join(' ')
    : String(enhancement.restrictions || '')

  return buildTooltip(
    enhancement.rules_text,
    restrictionText ? `Restrictions: ${restrictionText}` : '',
  ) || enhancement.name
}

function formatStratagemTooltip(stratagem) {
  if (!stratagem) {
    return ''
  }

  return buildTooltip(
    stratagem.type ? `${stratagem.type} Stratagem` : '',
    stratagem.timing ? `When: ${stratagem.timing}` : '',
    stratagem.target ? `Target: ${stratagem.target}` : '',
    stratagem.effect ? `Effect: ${stratagem.effect}` : '',
  ) || stratagem.name
}

function stratagemMatchesPhase(stratagem, phaseId) {
  const timing = String(stratagem?.timing || '').toLowerCase()
  if (!timing || timing.includes('any phase')) {
    return true
  }
  const phaseNames = {
    command: 'command phase',
    movement: 'movement phase',
    shooting: 'shooting phase',
    charge: 'charge phase',
    fight: 'fight phase',
  }
  const phaseText = phaseNames[phaseId] || ''
  return phaseText ? timing.includes(phaseText) || timing.includes(phaseText.replace(' phase', '')) : false
}

function getStratagemSource(stratagem) {
  return stratagem?.core ? 'Core Stratagem' : 'Detachment Stratagem'
}

function getBaseDiameterMm(unit) {
  return UNIT_BASE_DIAMETERS_MM[unit?.name] || 40
}

function mmToInches(value) {
  return value / 25.4
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function formatNumber(value, digits = 1) {
  return Number(value).toFixed(digits).replace(/\.0$/, '')
}

function rollDie(sides = 6) {
  return Math.floor(Math.random() * sides) + 1
}

function RollableNumberInput({
  value,
  min = 1,
  max = 6,
  step = 1,
  sides = 6,
  diceCount = 1,
  label = `Roll D${sides}`,
  disabled = false,
  onChange,
}) {
  const setNumericValue = (nextValue) => {
    onChange(clamp(Number(nextValue) || min, min, max))
  }

  return (
    <div className="rollable-number-input">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => setNumericValue(event.target.value)}
      />
      <button
        type="button"
        className="roll-button"
        onClick={() => setNumericValue(Array.from({ length: diceCount }, () => rollDie(sides)).reduce((total, roll) => total + roll, 0))}
        disabled={disabled}
        title={label}
        aria-label={label}
      >
        {diceCount > 1 ? `${diceCount}D${sides}` : `D${sides}`}
      </button>
    </div>
  )
}

function formatAttackDiceRange(step) {
  const gather = step?.gather_attack_dice || {}
  const minimum = Number(gather.attack_dice_minimum || 0)
  const maximum = Number(gather.attack_dice_maximum || 0)
  return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`
}

function parseMovementInches(value) {
  const match = String(value || '').match(/(\d+(\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

function parseWeaponRangeInches(range) {
  const match = String(range || '').match(/(\d+(\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function battlefieldPercentToInches(position) {
  return {
    x: (Number(position.x) / 100) * BATTLEFIELD_WIDTH_INCHES,
    y: (Number(position.y) / 100) * BATTLEFIELD_HEIGHT_INCHES,
  }
}

function battlefieldInchesToPercent(position) {
  return {
    x: (Number(position.x) / BATTLEFIELD_WIDTH_INCHES) * 100,
    y: (Number(position.y) / BATTLEFIELD_HEIGHT_INCHES) * 100,
  }
}

function getDistanceInches(start, end) {
  return Math.hypot(Number(end.x) - Number(start.x), Number(end.y) - Number(start.y))
}

function getVerticalDistanceInches(start, end) {
  return Math.abs(Number(start.z || 0) - Number(end.z || 0))
}

function getModelBaseDiameterInches(model) {
  return Number(model.baseInches || model.base_diameter || 0)
}

function getModelHorizontalGapInches(model, otherModel) {
  return Math.max(
    0,
    getRawModelHorizontalGapInches(model, otherModel),
  )
}

function getRawModelHorizontalGapInches(model, otherModel) {
  return (
    getDistanceInches(model, otherModel)
      - (getModelBaseDiameterInches(model) / 2)
      - (getModelBaseDiameterInches(otherModel) / 2)
  )
}

function modelBasesOverlap(model, otherModel) {
  return getRawModelHorizontalGapInches(model, otherModel) < -0.001
}

function getPointOnBase(model, angleRadians, insetInches = 0) {
  const radius = Math.max(0, (getModelBaseDiameterInches(model) / 2) - insetInches)
  return {
    x: Number(model.x) + (Math.cos(angleRadians) * radius),
    y: Number(model.y) + (Math.sin(angleRadians) * radius),
    z: Number(model.z || 0),
  }
}

function lineIntersectsModelBase(lineStart, lineEnd, model, lineWidth = 1 / 25.4) {
  return getSegmentPointDistanceInches(lineStart, lineEnd, model) < (getModelBaseDiameterInches(model) / 2) + (lineWidth / 2) - 0.001
}

function lineOfSightExists(observingModel, observedModel, blockingModels = [], lineWidth = 1 / 25.4, sampleCount = 16) {
  const sampleAngles = Array.from({ length: sampleCount }, (_, index) => (2 * Math.PI * index) / sampleCount)
  sampleAngles.push(0)
  let checkedLines = 0
  let clearLines = 0
  let blockedLines = 0

  for (const startAngle of sampleAngles) {
    const lineStart = getPointOnBase(observingModel, startAngle, lineWidth / 2)
    for (const endAngle of sampleAngles) {
      checkedLines += 1
      const lineEnd = getPointOnBase(observedModel, endAngle, lineWidth / 2)
      if (blockingModels.some((model) => lineIntersectsModelBase(lineStart, lineEnd, model, lineWidth))) {
        blockedLines += 1
      } else {
        clearLines += 1
      }
    }
  }

  return {
    visible: clearLines > 0,
    fullyVisible: checkedLines > 0 && blockedLines === 0,
    checkedLines,
    clearLines,
    blockedLines,
  }
}

function modelsAreWithinRange(model, otherModel, horizontalRange, verticalRange) {
  return (
    getModelHorizontalGapInches(model, otherModel) <= horizontalRange + 0.001
    && getVerticalDistanceInches(model, otherModel) <= verticalRange + 0.001
  )
}

function modelIsWithinBattlefield(model) {
  const baseRadius = Number(model.baseInches || model.base_diameter || 0) / 2
  return (
    Number(model.x) - baseRadius >= 0
    && Number(model.x) + baseRadius <= BATTLEFIELD_WIDTH_INCHES
    && Number(model.y) - baseRadius >= 0
    && Number(model.y) + baseRadius <= BATTLEFIELD_HEIGHT_INCHES
  )
}

function validateBattlefieldUnitCoherency(models) {
  if (models.length <= 1) {
    return {
      valid: true,
      violations: [],
      violatingModelIndexes: [],
      modelResults: models.map((model, index) => ({
        id: model.id,
        index,
        within2And5OfAnother: true,
        within9And5OfAllOthers: true,
      })),
    }
  }

  const modelResults = models.map((model, index) => {
    const otherModels = models.filter((_, otherIndex) => otherIndex !== index)
    return {
      id: model.id,
      index,
      within2And5OfAnother: otherModels.some((otherModel) => modelsAreWithinRange(model, otherModel, 2, 5)),
      within9And5OfAllOthers: otherModels.every((otherModel) => modelsAreWithinRange(model, otherModel, 9, 5)),
    }
  })
  const violations = []
  if (modelResults.some((result) => !result.within2And5OfAnother)) {
    violations.push('not_within_2_horizontal_5_vertical_of_another_model')
  }
  if (modelResults.some((result) => !result.within9And5OfAllOthers)) {
    violations.push('not_within_9_horizontal_5_vertical_of_every_model')
  }

  return {
    valid: violations.length === 0,
    violations,
    violatingModelIndexes: modelResults
      .filter((result) => !result.within2And5OfAnother || !result.within9And5OfAllOthers)
      .map((result) => result.index),
    modelResults,
  }
}

function validateBattlefieldUnitEngagement(models, enemyModels) {
  const engagedModelIndexes = models
    .map((model, index) => (
      enemyModels.some((enemyModel) => modelsAreWithinRange(model, enemyModel, 2, 5))
        ? index
        : null
    ))
    .filter((index) => index !== null)

  return {
    engaged: engagedModelIndexes.length > 0,
    unengaged: engagedModelIndexes.length === 0,
    engagedModelIndexes,
  }
}

function validateBattlefieldUnitSetup(models, enemyModels, friendlyModels = [], options = {}) {
  const coherency = validateBattlefieldUnitCoherency(models)
  const engagement = validateBattlefieldUnitEngagement(models, enemyModels)
  const friendlyOverlapModelIndexes = models
    .map((model, index) => (
      friendlyModels.some((friendlyModel) => modelBasesOverlap(model, friendlyModel))
        ? index
        : null
    ))
    .filter((index) => index !== null)
  const offBattlefieldModelIndexes = models
    .map((model, index) => (modelIsWithinBattlefield(model) ? null : index))
    .filter((index) => index !== null)
  const violations = []
  const canOverlapFriendlyModels = Boolean(options.canOverlapFriendlyModels)

  if (!models.length) {
    violations.push('no_models')
  }
  if (offBattlefieldModelIndexes.length) {
    violations.push('models_outside_battlefield')
  }
  if (!coherency.valid) {
    violations.push('unit_not_in_coherency')
  }
  if (!engagement.unengaged) {
    violations.push('unit_engaged')
  }
  if (!canOverlapFriendlyModels && friendlyOverlapModelIndexes.length) {
    violations.push('friendly_model_overlap')
  }

  return {
    valid: violations.length === 0,
    canSetUp: violations.length === 0,
    violations,
    coherency,
    engagement,
    friendlyOverlapModelIndexes,
    offBattlefieldModelIndexes,
    returnToOriginalPosition: violations.length > 0,
  }
}

function getBattlefieldUnitFormationOffsets(unit) {
  const modelCount = Math.max(1, Number(unit?.startingModelCount ?? unit?.modelCount ?? 1) || 1)
  const baseInches = Math.max(0.1, Number(unit?.baseInches ?? 1) || 1)
  const columnCount = Math.min(modelCount, Math.ceil(Math.sqrt(modelCount)))
  const rowCount = Math.ceil(modelCount / columnCount)
  const widestRowCount = Math.min(modelCount, columnCount)
  const gridDiagonal = Math.hypot(Math.max(0, widestRowCount - 1), Math.max(0, rowCount - 1)) || 1
  const maximumCoherentSpacing = (baseInches + 8.8) / gridDiagonal
  const spacing = Math.min(baseInches + 1.5, baseInches + 2, maximumCoherentSpacing)

  return Array.from({ length: modelCount }, (_, index) => {
    const row = Math.floor(index / columnCount)
    const column = index % columnCount
    const modelsInRow = row === rowCount - 1
      ? modelCount - (row * columnCount)
      : columnCount
    return {
      x: (column - ((modelsInRow - 1) / 2)) * spacing,
      y: (row - ((rowCount - 1) / 2)) * spacing,
    }
  })
}

function getUnitDeclaredModelCount(unitDetails) {
  return Number(unitDetails?.model_count ?? unitDetails?.unit_composition?.min_models ?? 1) || 1
}

function getBattlefieldUnitModelIdentity(unit, modelIndex) {
  const leaderDetails = unit?.unitDetails?.attached_leader || null
  const supportDetails = unit?.unitDetails?.attached_support || null
  const leaderCount = leaderDetails ? getUnitDeclaredModelCount(leaderDetails) : 0
  const supportCount = supportDetails ? getUnitDeclaredModelCount(supportDetails) : 0
  const bodyguardCount = Math.max(0, Number(unit?.startingModelCount || 1) - leaderCount - supportCount)

  if (leaderDetails && modelIndex >= bodyguardCount && modelIndex < bodyguardCount + leaderCount) {
    return {
      role: 'leader',
      name: leaderDetails.name || 'Leader',
      label: 'L',
    }
  }
  if (supportDetails && modelIndex >= bodyguardCount + leaderCount) {
    return {
      role: 'support',
      name: supportDetails.name || 'Support',
      label: 'S',
    }
  }
  return {
    role: 'bodyguard',
    name: unit?.unitDetails?.bodyguard_name || unit?.datasheetName || unit?.name || 'Model',
    label: '',
  }
}

function getBattlefieldUnitModelOffsets(unit, customOffsets = {}) {
  const formationOffsets = getBattlefieldUnitFormationOffsets(unit)
  return Object.fromEntries(formationOffsets.map((offset, index) => {
    const modelId = `${unit.id}::${index + 1}`
    return [
      modelId,
      {
        ...offset,
        ...(customOffsets?.[modelId] || {}),
      },
    ]
  }))
}

function getBattlefieldUnitModels(unit, positionPercent, customOffsets = {}) {
  if (!unit || !positionPercent) {
    return []
  }
  const center = battlefieldPercentToInches(positionPercent)
  const modelOffsets = getBattlefieldUnitModelOffsets(unit, customOffsets)
  const removedModelIds = new Set(unit.removedModelIds || [])
  return Object.entries(modelOffsets)
    .filter(([modelId]) => !removedModelIds.has(modelId))
    .map(([modelId, offset]) => {
      const modelIndex = Number(String(modelId).split('::')[1] || 1) - 1
      const modelIdentity = getBattlefieldUnitModelIdentity(unit, modelIndex)
      return {
        id: modelId,
        unitId: unit.id,
        modelNumber: modelIndex + 1,
        modelRole: modelIdentity.role,
        modelName: modelIdentity.name,
        modelLabel: modelIdentity.label,
        x: center.x + offset.x,
        y: center.y + offset.y,
        z: 0,
        baseInches: unit.baseInches,
        base_diameter: unit.baseInches,
      }
    })
}

function getMinimumModelGapInches(models, enemyModels) {
  if (!models.length || !enemyModels.length) {
    return null
  }
  return Math.min(...models.flatMap((model) => (
    enemyModels.map((enemyModel) => getModelHorizontalGapInches(model, enemyModel))
  )))
}

function modelCanAttackTargetWithWeapon(model, targetModels, weapon) {
  if (!model || !targetModels.length || !weapon) {
    return false
  }
  if (weapon.range === 'Melee') {
    return targetModels.some((targetModel) => modelsAreWithinRange(model, targetModel, 2, 5))
  }

  const rangeInches = parseWeaponRangeInches(weapon.range)
  if (rangeInches === null) {
    return false
  }
  return targetModels.some((targetModel) => getModelHorizontalGapInches(model, targetModel) <= rangeInches + 0.001)
}

function countModelsInRangeForWeapon(attackerModels, targetModels, weapon) {
  return attackerModels.filter((model) => modelCanAttackTargetWithWeapon(model, targetModels, weapon)).length
}

function getBattlefieldMoveDistanceLimit({
  unit,
  moveType,
  advanceRoll = 0,
  surgeDistance = 0,
  chargeRoll = 0,
  takeToSkies = false,
  charging = false,
}) {
  if (charging) {
    return Number(chargeRoll) || 0
  }
  if (moveType === 'remain_stationary') {
    return 0
  }
  const hoverIgnoresSkiesPenalty = unitHasAbility(unit, 'Hover')
  const skiesPenalty = takeToSkies && !hoverIgnoresSkiesPenalty && ['normal', 'advance', 'fall_back'].includes(moveType) ? 2 : 0
  const baseDistance = moveType === 'surge'
    ? Number(surgeDistance) || 0
    : (Number(unit?.movementInches) || 0) + (moveType === 'advance' ? Number(advanceRoll) || 0 : 0)
  return Math.max(0, baseDistance - skiesPenalty)
}

function clampModelInsideBattlefield(modelPosition, baseInches) {
  const radius = (Number(baseInches) || 0) / 2
  return {
    x: clamp(Number(modelPosition.x), radius, BATTLEFIELD_WIDTH_INCHES - radius),
    y: clamp(Number(modelPosition.y), radius, BATTLEFIELD_HEIGHT_INCHES - radius),
  }
}

function repairBattlefieldUnitCoherency({
  unit,
  centerPercent,
  startCenterPercent,
  currentOffsets,
  startOffsets,
  anchorModelId,
  movementLimit,
}) {
  if (!unit || !centerPercent || !anchorModelId) {
    return currentOffsets
  }
  const currentModels = getBattlefieldUnitModels(unit, centerPercent, currentOffsets)
  if (validateBattlefieldUnitCoherency(currentModels).valid) {
    return currentOffsets
  }

  const center = battlefieldPercentToInches(centerPercent)
  const startCenter = battlefieldPercentToInches(startCenterPercent || centerPercent)
  const formationOffsets = getBattlefieldUnitModelOffsets(unit)
  const normalizedCurrentOffsets = getBattlefieldUnitModelOffsets(unit, currentOffsets)
  const normalizedStartOffsets = getBattlefieldUnitModelOffsets(unit, startOffsets)
  const anchorFormationOffset = formationOffsets[anchorModelId]
  const anchorCurrentOffset = normalizedCurrentOffsets[anchorModelId]
  if (!anchorFormationOffset || !anchorCurrentOffset) {
    return currentOffsets
  }

  const repairTranslation = {
    x: anchorCurrentOffset.x - anchorFormationOffset.x,
    y: anchorCurrentOffset.y - anchorFormationOffset.y,
  }
  const repairedOffsets = { ...normalizedCurrentOffsets }
  Object.entries(formationOffsets).forEach(([modelId, formationOffset]) => {
    if (modelId === anchorModelId) {
      return
    }
    const desiredAbsolute = clampModelInsideBattlefield({
      x: center.x + formationOffset.x + repairTranslation.x,
      y: center.y + formationOffset.y + repairTranslation.y,
    }, unit.baseInches)
    const startOffset = normalizedStartOffsets[modelId] || normalizedCurrentOffsets[modelId] || formationOffset
    const startAbsolute = {
      x: startCenter.x + startOffset.x,
      y: startCenter.y + startOffset.y,
    }
    const clampedAbsolute = clampModelInsideBattlefield(
      clampMoveToMaximumDistance(startAbsolute, desiredAbsolute, movementLimit),
      unit.baseInches,
    )
    repairedOffsets[modelId] = {
      x: clampedAbsolute.x - center.x,
      y: clampedAbsolute.y - center.y,
    }
  })

  return repairedOffsets
}

function getSegmentPointDistanceInches(segmentStart, segmentEnd, point) {
  const dx = Number(segmentEnd.x) - Number(segmentStart.x)
  const dy = Number(segmentEnd.y) - Number(segmentStart.y)
  const lengthSquared = (dx * dx) + (dy * dy)
  if (lengthSquared <= 0) {
    return getDistanceInches(segmentStart, point)
  }

  const projection = clamp(
    (((Number(point.x) - Number(segmentStart.x)) * dx) + ((Number(point.y) - Number(segmentStart.y)) * dy)) / lengthSquared,
    0,
    1,
  )
  return getDistanceInches(
    {
      x: Number(segmentStart.x) + (projection * dx),
      y: Number(segmentStart.y) + (projection * dy),
    },
    point,
  )
}

function clampMoveToMaximumDistance(start, end, maximumDistance) {
  if (!maximumDistance) {
    return start
  }
  const distance = getDistanceInches(start, end)
  if (distance <= maximumDistance || distance <= 0) {
    return end
  }
  const ratio = maximumDistance / distance
  return {
    x: Number(start.x) + ((Number(end.x) - Number(start.x)) * ratio),
    y: Number(start.y) + ((Number(end.y) - Number(start.y)) * ratio),
  }
}

function validateBattlefieldModelMove({
  start,
  end,
  movingUnit,
  enemyUnit,
  maximumDistance,
  moveType = 'normal',
  advanceRoll = 0,
  surgeDistance = 0,
  unitEngagedBefore = false,
  unitBattleShocked = false,
  fallBackMode = '',
  surgeTriggered = false,
  surgeTargetUnit = null,
  unitMovedThisPhase = false,
  takeToSkies = false,
}) {
  const violations = []
  const distanceMoved = getDistanceInches(start, end)
  const baseRadius = movingUnit.baseInches / 2
  let effectiveMaximumDistance = Number(maximumDistance) || 0
  if (moveType === 'advance') {
    effectiveMaximumDistance += Number(advanceRoll) || 0
  }
  if (moveType === 'surge') {
    effectiveMaximumDistance = Number(surgeDistance) || 0
  }
  const hoverIgnoresSkiesPenalty = unitHasAbility(movingUnit, 'Hover')
  if (takeToSkies && !hoverIgnoresSkiesPenalty && ['normal', 'advance', 'fall_back'].includes(moveType)) {
    effectiveMaximumDistance = Math.max(0, effectiveMaximumDistance - 2)
  }
  if (moveType === 'remain_stationary') {
    effectiveMaximumDistance = 0
  }

  if (distanceMoved > effectiveMaximumDistance + 0.001) {
    violations.push('maximum_distance')
  }
  if (moveType === 'remain_stationary' && distanceMoved > 0.001) {
    violations.push('remain_stationary_moved')
  }
  if (unitHasKeyword(movingUnit, 'aircraft') && moveType !== 'ingress') {
    violations.push('aircraft_must_ingress')
  }
  if (
    (moveType === 'normal' || moveType === 'advance')
    && unitEngagedBefore
    && !unitHasKeyword(enemyUnit, 'aircraft')
  ) {
    violations.push('must_be_unengaged_before')
  }
  if (moveType === 'fall_back' && (!unitEngagedBefore || unitHasKeyword(enemyUnit, 'aircraft'))) {
    violations.push('must_be_engaged_before')
  }
  if (moveType === 'fall_back' && fallBackMode === 'ordered_retreat' && unitBattleShocked) {
    violations.push('ordered_retreat_requires_not_battle_shocked')
  }
  if (moveType === 'surge' && !surgeTriggered) {
    violations.push('surge_not_triggered')
  }
  if (moveType === 'surge' && unitBattleShocked) {
    violations.push('surge_battle_shocked')
  }
  if (moveType === 'surge' && unitEngagedBefore) {
    violations.push('surge_unit_engaged_before')
  }
  if (moveType === 'surge' && unitMovedThisPhase) {
    violations.push('surge_unit_already_moved')
  }
  if (
    end.x - baseRadius < 0
    || end.x + baseRadius > BATTLEFIELD_WIDTH_INCHES
    || end.y - baseRadius < 0
    || end.y + baseRadius > BATTLEFIELD_HEIGHT_INCHES
  ) {
    violations.push('battlefield_edge')
  }
  if (enemyUnit) {
    const enemyPosition = battlefieldPercentToInches(enemyUnit.position)
    const minimumClearance = baseRadius + (enemyUnit.baseInches / 2)
    const pathClearance = getSegmentPointDistanceInches(start, end, enemyPosition)
    const endClearance = getDistanceInches(end, enemyPosition)
    const flyingMoveThrough = takeToSkies && ['normal', 'advance', 'fall_back'].includes(moveType)
    const superHeavyWalkerMoveThrough = (
      unitHasAbility(movingUnit, 'Super-heavy Walker')
      && ['normal', 'advance', 'fall_back'].includes(moveType)
      && !unitHasKeyword(enemyUnit, 'titanic')
    )
    const monsterVehicleNormalMoveThrough = (
      (moveType === 'normal' || moveType === 'advance')
      && unitIsMonsterOrVehicle(movingUnit)
      && !unitIsMonsterOrVehicle(enemyUnit)
    )
    const canMoveThroughEnemyModels = (
      monsterVehicleNormalMoveThrough
      || flyingMoveThrough
      || superHeavyWalkerMoveThrough
      || (moveType === 'fall_back' && fallBackMode === 'desperate_escape')
    )
    const pathCrossesEnemy = pathClearance < minimumClearance - 0.001
    const endsOnEnemy = endClearance < minimumClearance - 0.001
    if ((pathCrossesEnemy && !canMoveThroughEnemyModels) || endsOnEnemy) {
      violations.push('enemy_model')
    }
  }
  if (moveType === 'surge' && surgeTargetUnit) {
    const surgeTargetPosition = battlefieldPercentToInches(surgeTargetUnit.position)
    const startGap = Math.max(
      0,
      getDistanceInches(start, surgeTargetPosition)
        - baseRadius
        - (surgeTargetUnit.baseInches / 2),
    )
    const endGap = Math.max(
      0,
      getDistanceInches(end, surgeTargetPosition)
        - baseRadius
        - (surgeTargetUnit.baseInches / 2),
    )
    if (endGap > 2 + 0.001) {
      violations.push('surge_not_engaged_with_target')
    }
    if (endGap > startGap + 0.001) {
      violations.push('surge_not_closer_to_target')
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    moveType,
    fallBackMode: fallBackMode || null,
    distanceMoved,
    maximumDistance: effectiveMaximumDistance,
    rotationCountsTowardDistance: false,
    canMoveThroughFriendlyModels: true,
    canMoveThroughEnemyModels: (
      (
        (moveType === 'normal' || moveType === 'advance')
        && unitIsMonsterOrVehicle(movingUnit)
        && !unitIsMonsterOrVehicle(enemyUnit)
      )
      || (takeToSkies && ['normal', 'advance', 'fall_back'].includes(moveType))
      || (
        unitHasAbility(movingUnit, 'Super-heavy Walker')
        && ['normal', 'advance', 'fall_back'].includes(moveType)
        && enemyUnit
        && !unitHasKeyword(enemyUnit, 'titanic')
      )
      || (moveType === 'fall_back' && fallBackMode === 'desperate_escape')
    ),
    takeToSkies,
    takeToSkiesDistancePenalty: takeToSkies && !hoverIgnoresSkiesPenalty && ['normal', 'advance', 'fall_back'].includes(moveType) ? 2 : 0,
    hoverIgnoresSkiesPenalty,
    superHeavyWalkerMoveThrough: (
      unitHasAbility(movingUnit, 'Super-heavy Walker')
      && ['normal', 'advance', 'fall_back'].includes(moveType)
      && enemyUnit
      && !unitHasKeyword(enemyUnit, 'titanic')
    ),
    surgeTriggered,
    monsterVehicleMoveThrough: (
      (moveType === 'normal' || moveType === 'advance')
      && unitIsMonsterOrVehicle(movingUnit)
      && enemyUnit
      && !unitIsMonsterOrVehicle(enemyUnit)
    ),
    eligibleToShootAfter: moveType !== 'fall_back',
    eligibleToChargeAfter: moveType !== 'advance' && moveType !== 'fall_back',
    eligibleToStartActionAfter: moveType !== 'advance' && moveType !== 'fall_back',
    hazardRollsPerModel: moveType === 'fall_back' && fallBackMode === 'desperate_escape' ? 1 : 0,
    battleShockRollAfter: moveType === 'fall_back' && fallBackMode === 'desperate_escape' && !unitBattleShocked,
    afterMoving: {
      unitCoherencyRequired: true,
      terrainSurfaceClearanceRequired: true,
      statedConditionsRequired: true,
    },
  }
}

function validateBattlefieldChargeMove({
  start,
  end,
  movingUnit,
  targetUnit,
  chargeRoll,
  unitEngagedBefore = false,
  advancedThisTurn = false,
  fellBackThisTurn = false,
}) {
  const movementValidation = validateBattlefieldModelMove({
    start,
    end,
    movingUnit,
    enemyUnit: targetUnit,
    maximumDistance: chargeRoll,
    moveType: 'charge',
  })
  const violations = [...movementValidation.violations]
  const targetPosition = targetUnit ? battlefieldPercentToInches(targetUnit.position) : null
  const startGap = targetPosition
    ? Math.max(0, getDistanceInches(start, targetPosition) - (movingUnit.baseInches / 2) - (targetUnit.baseInches / 2))
    : null
  const endGap = targetPosition
    ? Math.max(0, getDistanceInches(end, targetPosition) - (movingUnit.baseInches / 2) - (targetUnit.baseInches / 2))
    : null

  if (!targetUnit) {
    violations.push('no_charge_target')
  }
  if (unitEngagedBefore) {
    violations.push('unit_engaged_before_charge')
  }
  if (advancedThisTurn) {
    violations.push('advanced_this_turn')
  }
  if (fellBackThisTurn) {
    violations.push('fell_back_this_turn')
  }
  if (unitHasKeyword(movingUnit, 'aircraft')) {
    violations.push('aircraft_cannot_charge')
  }
  if (targetUnit && unitHasKeyword(targetUnit, 'aircraft') && !unitHasKeyword(movingUnit, 'fly')) {
    violations.push('only_flying_can_charge_aircraft')
  }
  if (startGap !== null && startGap > 12 + 0.001) {
    violations.push('target_not_within_12')
  }
  if (startGap !== null && endGap !== null && endGap >= startGap - 0.001) {
    violations.push('must_end_closer_to_charge_target')
  }
  if (endGap !== null && endGap > 2 + 0.001) {
    violations.push('must_end_engaged_with_charge_target')
  }
  const requiredDistanceToEngage = startGap === null ? null : Math.max(0, startGap - 1.9)
  const chargeCanReach = Boolean(
    targetUnit
    && !unitEngagedBefore
    && !advancedThisTurn
    && !fellBackThisTurn
    && !unitHasKeyword(movingUnit, 'aircraft')
    && (!unitHasKeyword(targetUnit, 'aircraft') || unitHasKeyword(movingUnit, 'fly'))
    && startGap !== null
    && startGap <= 12 + 0.001
    && requiredDistanceToEngage !== null
    && requiredDistanceToEngage <= (Number(chargeRoll) || 0) + 0.001
    && !movementValidation.violations.includes('battlefield_edge')
  )

  return {
    ...movementValidation,
    valid: violations.length === 0,
    violations,
    moveType: 'charge',
    maximumDistance: Number(chargeRoll) || 0,
    chargeRoll: Number(chargeRoll) || 0,
    targetWithin12: startGap !== null && startGap <= 12 + 0.001,
    startGap,
    endGap,
    requiredDistanceToEngage,
    chargeCanReach,
    chargedThisTurn: violations.length === 0,
    fightsFirstAfter: violations.length === 0,
  }
}

function unitHasKeyword(unit, keyword) {
  const normalizedKeyword = String(keyword).toLowerCase()
  return [...(unit?.keywords || []), ...(unit?.faction_keywords || [])]
    .some((entry) => String(entry).toLowerCase() === normalizedKeyword)
}

function unitCanOverlapFriendlyModels(unit) {
  return unitHasKeyword(unit, 'fly') || unitHasKeyword(unit, 'aircraft')
}

function unitHasAbility(unit, abilityName) {
  const normalizedName = String(abilityName).toLowerCase()
  return [...(unit?.abilities || []), ...(unit?.wargear_abilities || [])]
    .some((ability) => {
      const abilityLabel = String(ability.name || '').toLowerCase()
      return abilityLabel === normalizedName || abilityLabel.startsWith(`${normalizedName} `)
    })
}

function getNamedUnitAbility(unit, abilityName) {
  const normalizedName = String(abilityName).toLowerCase()
  return [...(unit?.abilities || []), ...(unit?.wargear_abilities || [])]
    .find((ability) => {
      const abilityLabel = String(ability.name || '').toLowerCase()
      return abilityLabel === normalizedName || abilityLabel.startsWith(`${normalizedName} `)
    }) || null
}

function getUnitAbilityNumber(unit, abilityName, fallback = 0) {
  const ability = getNamedUnitAbility(unit, abilityName)
  if (!ability) {
    return fallback
  }
  const text = `${ability.name || ''} ${ability.rules_text || ''}`
  const match = text.match(new RegExp(`${abilityName}\\D*(\\d+)`, 'i')) || text.match(/(\d+)/)
  return match ? Number(match[1]) : fallback
}

function unitIsMonsterOrVehicle(unit) {
  return unitHasKeyword(unit, 'monster') || unitHasKeyword(unit, 'vehicle')
}

function getLoneOperativeRange(unit) {
  return unitHasAbility(unit, 'Lone Operative') ? getUnitAbilityNumber(unit, 'Lone Operative', 12) || 12 : 0
}

function getScoutMoveDistance(unit) {
  return unitHasAbility(unit, 'Scouts') ? getUnitAbilityNumber(unit, 'Scouts', 0) : 0
}

function getDeadlyDemiseValue(unit) {
  return unitHasAbility(unit, 'Deadly Demise') ? getUnitAbilityNumber(unit, 'Deadly Demise', 0) : 0
}

function getFiringDeckValue(unit) {
  return unitHasAbility(unit, 'Firing Deck') ? getUnitAbilityNumber(unit, 'Firing Deck', 0) : 0
}

function getCombinedUnitKeywords(...units) {
  const keywords = new Set()
  units.filter(Boolean).forEach((unit) => {
    ;[...(unit.keywords || []), ...(unit.faction_keywords || [])].forEach((keyword) => {
      keywords.add(String(keyword))
    })
  })
  return Array.from(keywords).sort((a, b) => a.localeCompare(b))
}

function getTransportCapacity(unit) {
  const statCapacity = parsePlusValue(unit?.stats?.transport_capacity)
  if (statCapacity > 0) {
    return statCapacity
  }
  const text = [
    unit?.transport_capacity,
    ...(unit?.abilities || []).map((ability) => `${ability.name || ''} ${ability.rules_text || ''}`),
  ].join(' ')
  const match = text.match(/transport capacity(?: of)?\s*(\d+)|can transport\s*(\d+)|carry\s*(\d+)/i)
  return match ? Number(match[1] || match[2] || match[3] || 0) : 0
}

function parsePlusValue(value) {
  const match = String(value || '').match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function parseObjectiveControlValue(value) {
  if (String(value || '').trim() === '-') {
    return 0
  }
  return parsePlusValue(value)
}

function getUnitStartingWounds(unitDetails) {
  const woundsPerModel = parsePlusValue(unitDetails?.stats?.wounds)
  const modelCount = Number(unitDetails?.model_count ?? 1) || 1
  return Math.max(0, woundsPerModel * modelCount)
}

function getSimulationTargetRemainingWounds(targetSummary, unitDetails) {
  if (!targetSummary) {
    return getUnitStartingWounds(unitDetails)
  }
  const woundsPerModel = Math.max(1, parsePlusValue(unitDetails?.stats?.wounds) || 1)
  const modelsRemaining = Math.max(0, Number(targetSummary.models_remaining ?? 0) || 0)
  if (modelsRemaining <= 0) {
    return 0
  }
  const activeModelWounds = Math.max(0, Number(targetSummary.current_model_wounds ?? woundsPerModel) || 0)
  return Math.max(0, ((modelsRemaining - 1) * woundsPerModel) + activeModelWounds)
}

function getUnitStrengthStatus(unitDetails, woundsRemaining = null) {
  const startingModels = Math.max(1, Number(unitDetails?.model_count ?? 1) || 1)
  const woundsPerModel = Math.max(1, parsePlusValue(unitDetails?.stats?.wounds) || 1)
  const startingWounds = Math.max(1, getUnitStartingWounds(unitDetails) || woundsPerModel)
  const currentWounds = Math.max(0, Number(woundsRemaining ?? startingWounds) || 0)
  const currentModels = startingModels <= 1
    ? (currentWounds > 0 ? 1 : 0)
    : Math.min(startingModels, Math.ceil(currentWounds / woundsPerModel))
  const usesWounds = startingModels <= 1
  const belowStartingStrength = usesWounds
    ? currentWounds < startingWounds
    : currentModels < startingModels
  const atHalfStrength = usesWounds
    ? currentWounds * 2 <= startingWounds
    : currentModels * 2 <= startingModels
  const belowHalfStrength = usesWounds
    ? currentWounds * 2 < startingWounds
    : currentModels * 2 < startingModels

  return {
    basis: usesWounds ? 'wounds' : 'models',
    currentModels,
    startingModels,
    currentWounds,
    startingWounds,
    belowStartingStrength,
    atHalfStrength,
    belowHalfStrength,
  }
}

function getUnitLeadershipValues(...unitDetailsList) {
  const values = unitDetailsList
    .filter(Boolean)
    .map((unitDetails) => parsePlusValue(unitDetails?.stats?.leadership))
    .filter((value) => value > 0)
  return values.length ? values : [7]
}

function weaponHasRawKeyword(weapon, keyword) {
  const normalizedKeyword = keyword.toLowerCase()
  return (weapon?.raw_keywords || []).some(
    (rawKeyword) => {
      const normalizedRawKeyword = String(rawKeyword).toLowerCase()
      return normalizedRawKeyword === normalizedKeyword || normalizedRawKeyword.startsWith(`${normalizedKeyword} `)
    },
  )
}

function weaponHasCloseQuarters(weapon) {
  return (weapon?.raw_keywords || []).some((rawKeyword) => (
    ['pistol', 'close-quarters', '[close-quarters]'].includes(String(rawKeyword).trim().toLowerCase())
  ))
}

function getWeaponKeywordValue(weapon, keywordPrefix) {
  const matchingKeyword = (weapon?.raw_keywords || []).find((rawKeyword) => (
    new RegExp(`^${keywordPrefix}\\s+(\\d+)`, 'i').test(String(rawKeyword))
  ))
  if (!matchingKeyword) {
    return 0
  }
  const match = String(matchingKeyword).match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function getResolvedLoadoutSelections(unitDetails, loadoutSelections) {
  return {
    ...(unitDetails?.selected_loadout || {}),
    ...(loadoutSelections || {}),
  }
}

function getLoadoutGroupPoolCount(unitDetails, group) {
  if (!group?.target_model) {
    return Number(unitDetails?.model_count ?? 0)
  }
  return Number(unitDetails?.model_counts_by_name?.[group.target_model] ?? 0)
}

function getLoadoutGroupMaxTotal(unitDetails, group) {
  const poolCount = getLoadoutGroupPoolCount(unitDetails, group)
  let maximumTotal = poolCount
  if (group?.max_total_count !== undefined && group?.max_total_count !== null) {
    maximumTotal = Math.min(maximumTotal, Number(group.max_total_count) || 0)
  }
  if (group?.max_total_per_models !== undefined && group?.max_total_per_models !== null) {
    const divisor = Number(group.max_total_per_models) || 1
    maximumTotal = Math.min(maximumTotal, Math.floor(poolCount / Math.max(1, divisor)))
  }
  return Math.max(0, maximumTotal)
}

function getLoadoutOptionMaxCount(unitDetails, group, option) {
  const poolCount = getLoadoutGroupPoolCount(unitDetails, group)
  let maximumCount = poolCount
  if (option?.max_count !== undefined && option?.max_count !== null) {
    maximumCount = Math.min(maximumCount, Number(option.max_count) || 0)
  }
  if (option?.max_count_per_models !== undefined && option?.max_count_per_models !== null) {
    const divisor = Number(option.max_count_per_models) || 1
    maximumCount = Math.min(maximumCount, Math.floor(poolCount / Math.max(1, divisor)))
  }
  return Math.max(0, maximumCount)
}

function getLoadoutSelectionValue(unitDetails, loadoutSelections, group) {
  const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections)
  return (
    resolvedSelections[group.id]
    || group.default_option_id
    || group.options?.[0]?.id
    || ''
  )
}

function getLoadoutCountSelectionValue(unitDetails, loadoutSelections, group, optionId) {
  const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections)
  const groupSelection = resolvedSelections[group.id]
  if (!groupSelection || typeof groupSelection !== 'object') {
    return '0'
  }
  const value = groupSelection[optionId]
  return value === undefined || value === null ? '0' : String(value)
}

function getCombatWeaponOptions(unitDetails, attachedLeaderUnitDetails = null) {
  const unitWeapons = (unitDetails?.weapons || []).filter((weapon) => !weaponHasExtraAttacks(weapon))
  const leaderWeapons = (attachedLeaderUnitDetails?.weapons || []).filter((weapon) => !weaponHasExtraAttacks(weapon))
  return [
    ...unitWeapons,
    ...leaderWeapons.map((weapon) => ({
      ...weapon,
      name: buildAttachedLeaderWeaponId(weapon.name),
      label: `${attachedLeaderUnitDetails.name}: ${formatWeaponName(weapon)}`,
    })),
  ]
}

function getSelectedAttackEntries(unitDetails, attachedLeaderUnitDetails, weaponNames) {
  const entries = []
  const unitWeapons = unitDetails?.weapons || []
  const leaderWeapons = attachedLeaderUnitDetails?.weapons || []
  const requestedWeaponNames = Array.isArray(weaponNames) ? weaponNames : []
  const seenEntryKeys = new Set()

  for (const weaponName of requestedWeaponNames) {
    if (weaponName.startsWith(ATTACHED_LEADER_WEAPON_PREFIX)) {
      const leaderWeaponName = weaponName.slice(ATTACHED_LEADER_WEAPON_PREFIX.length)
      const leaderWeapon = leaderWeapons.find((weapon) => weapon.name === leaderWeaponName)
      if (!leaderWeapon) {
        continue
      }
      const entryKey = `leader::${leaderWeapon.name}`
      if (seenEntryKeys.has(entryKey)) {
        continue
      }
      seenEntryKeys.add(entryKey)
      entries.push({
        owner: 'leader',
        ownerName: attachedLeaderUnitDetails?.name || '',
        label: `${attachedLeaderUnitDetails?.name || 'Attached Leader'}: ${formatWeaponName(leaderWeapon)}`,
        weapon: leaderWeapon,
      })
      continue
    }

    const unitWeapon = unitWeapons.find((weapon) => weapon.name === weaponName)
    if (!unitWeapon) {
      continue
    }
    const entryKey = `unit::${unitWeapon.name}`
    if (seenEntryKeys.has(entryKey)) {
      continue
    }
    seenEntryKeys.add(entryKey)
    entries.push({
      owner: 'unit',
      ownerName: unitDetails?.name || '',
      label: formatWeaponName(unitWeapon),
      weapon: unitWeapon,
    })
  }

  return entries
}

function formatLoadoutOptionLabel(option) {
  const description = String(option?.description || '').trim()
  return description ? `${option.label} (${description})` : option.label
}

function getUnitModelCountValue(unitDetails, modelCount) {
  if (modelCount !== '' && modelCount !== null && modelCount !== undefined) {
    return String(modelCount)
  }
  if (unitDetails?.model_count !== undefined && unitDetails?.model_count !== null) {
    return String(unitDetails.model_count)
  }
  if (unitDetails?.unit_composition?.min_models !== undefined) {
    return String(unitDetails.unit_composition.min_models)
  }
  return '1'
}

function getModelEntryBounds(model) {
  const minimumCount = Number(model?.count?.min ?? 0)
  const maximumCount = Number(model?.count?.max ?? minimumCount)
  return {
    minimumCount,
    maximumCount,
  }
}

function unitUsesModelBreakdownSelectors(unitDetails) {
  const variableEntries = (unitDetails?.models || []).filter((model) => {
    const { minimumCount, maximumCount } = getModelEntryBounds(model)
    return maximumCount > minimumCount
  })
  return variableEntries.length > 1
}

function getResolvedModelCountSelections(unitDetails, modelCounts) {
  return {
    ...(unitDetails?.model_counts_by_name || {}),
    ...(modelCounts || {}),
  }
}

function areModelCountSelectionsEqual(left, right) {
  const leftEntries = Object.entries(left || {}).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  const rightEntries = Object.entries(right || {}).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  if (leftEntries.length !== rightEntries.length) {
    return false
  }
  return leftEntries.every(([leftKey, leftValue], index) => (
    leftKey === rightEntries[index][0] && Number(leftValue) === Number(rightEntries[index][1])
  ))
}

function getUnitModelCountBounds(unitDetails) {
  const minimumModels = Number(unitDetails?.unit_composition?.min_models ?? 1)
  const maximumModels = Number(unitDetails?.unit_composition?.max_models ?? minimumModels)
  return {
    minimumModels,
    maximumModels,
  }
}

function getModelEntryControlBounds(unitDetails, model, modelCounts) {
  const { minimumModels, maximumModels } = getUnitModelCountBounds(unitDetails)
  const { minimumCount, maximumCount } = getModelEntryBounds(model)
  const resolvedCounts = getResolvedModelCountSelections(unitDetails, modelCounts)
  const currentCount = Number(
    resolvedCounts[model.name]
    ?? unitDetails?.model_counts_by_name?.[model.name]
    ?? minimumCount,
  )

  const otherModelTotal = (unitDetails?.models || []).reduce((sum, entry) => {
    if (entry.name === model.name) {
      return sum
    }
    const fallbackMinimum = Number(entry?.count?.min ?? 0)
    return sum + Number(
      resolvedCounts[entry.name]
      ?? unitDetails?.model_counts_by_name?.[entry.name]
      ?? fallbackMinimum,
    )
  }, 0)

  return {
    currentCount,
    minimumCount: Math.max(minimumCount, minimumModels - otherModelTotal),
    maximumCount: Math.min(maximumCount, maximumModels - otherModelTotal),
  }
}

function defenderGetsCoverBenefit({
  selectedWeapon,
  defenderUnitDetails,
  targetHasCover,
  indirectTargetVisible,
  attackerFireDisciplineActive,
}) {
  if (!selectedWeapon || selectedWeapon.range === 'Melee') {
    return false
  }

  const hasIndirectNoVisibility = weaponHasRawKeyword(selectedWeapon, 'Indirect Fire') && !indirectTargetVisible
  const hasCoverSource = targetHasCover || hasIndirectNoVisibility
  if (!hasCoverSource) {
    return false
  }

  const ignoresCover = weaponHasRawKeyword(selectedWeapon, 'Ignores Cover') || attackerFireDisciplineActive
  if (ignoresCover) {
    return false
  }

  const armorSave = parsePlusValue(defenderUnitDetails?.stats?.save)
  const effectiveAp = Number(selectedWeapon?.ap || 0)
  return !(effectiveAp === 0 && armorSave > 0 && armorSave <= 3)
}

function average(values) {
  if (!values.length) {
    return 0
  }
  return values.reduce((total, value) => total + value, 0) / values.length
}

function formatAverage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatPercent(value, total) {
  if (!total) {
    return '0%'
  }
  return `${((value / total) * 100).toFixed(1)}%`
}

function sumBy(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0)
}

function buildRunSummary(runs) {
  const totalRuns = runs.length
  const targets = runs.map((run) => run.result.target)
  const combatStats = runs.map((run) => run.result.stats || {})
  const attachedCharacters = runs
    .map((run) => run.result.attached_character)
    .filter(Boolean)
  const hazardousBearers = runs
    .map((run) => run.result.hazardous_bearer)
    .filter(Boolean)

  return {
    totalRuns,
    targetDestroyedCount: targets.filter((item) => item.destroyed).length,
    averageTargetModelsRemaining: average(targets.map((item) => item.models_remaining)),
    averageTargetCurrentWounds: average(targets.map((item) => item.current_model_wounds)),
    attachedCharacterRuns: attachedCharacters.length,
    attachedCharacterDestroyedCount: attachedCharacters.filter((item) => item.destroyed).length,
    averageAttachedCharacterWounds: average(attachedCharacters.map((item) => item.current_model_wounds)),
    hazardousBearerRuns: hazardousBearers.length,
    hazardousBearerDestroyedCount: hazardousBearers.filter((item) => item.destroyed).length,
    averageHazardousBearerWounds: average(hazardousBearers.map((item) => item.current_model_wounds)),
    combat: {
      attackInstances: sumBy(combatStats, (stat) => stat.attack_instances || 0),
      hitRolls: sumBy(combatStats, (stat) => stat.hit_rolls || 0),
      autoHitAttacks: sumBy(combatStats, (stat) => stat.auto_hit_attacks || 0),
      successfulHitAttacks: sumBy(combatStats, (stat) => stat.successful_hit_attacks || 0),
      failedHitAttacks: sumBy(combatStats, (stat) => stat.failed_hit_attacks || 0),
      criticalHitAttacks: sumBy(combatStats, (stat) => stat.critical_hit_attacks || 0),
      extraHitsGenerated: sumBy(combatStats, (stat) => stat.extra_hits_generated || 0),
      hitRerollsUsed: sumBy(combatStats, (stat) => stat.hit_rerolls_used || 0),
      hitRerollSuccesses: sumBy(combatStats, (stat) => stat.hit_reroll_successes || 0),
      woundRolls: sumBy(combatStats, (stat) => stat.wound_rolls || 0),
      autoWounds: sumBy(combatStats, (stat) => stat.auto_wounds || 0),
      successfulWoundRolls: sumBy(combatStats, (stat) => stat.successful_wound_rolls || 0),
      failedWoundRolls: sumBy(combatStats, (stat) => stat.failed_wound_rolls || 0),
      criticalWounds: sumBy(combatStats, (stat) => stat.critical_wounds || 0),
      woundRerollsUsed: sumBy(combatStats, (stat) => stat.wound_rerolls_used || 0),
      woundRerollSuccesses: sumBy(combatStats, (stat) => stat.wound_reroll_successes || 0),
      saveAttempts: sumBy(combatStats, (stat) => stat.save_attempts || 0),
      savesPassed: sumBy(combatStats, (stat) => stat.saves_passed || 0),
      savesFailed: sumBy(combatStats, (stat) => stat.saves_failed || 0),
      unsavableWounds: sumBy(combatStats, (stat) => stat.unsavable_wounds || 0),
    },
  }
}

function getRelevantUnitRules(unit, role, hasHazardousWeapon) {
  const relevantEffectTypes = role === 'attacker'
    ? new Set(['outgoing_wound_modifier', ...(hasHazardousWeapon ? ['feel_no_pain'] : [])])
    : new Set(['incoming_wound_modifier', 'feel_no_pain'])

  const ruleCollections = [
    ...(unit?.abilities || []).map((rule) => ({ rule, fallback: 'Datasheet Ability' })),
    ...(unit?.wargear_abilities || []).map((rule) => ({ rule, fallback: 'Wargear Ability' })),
  ]

  return ruleCollections
    .filter(({ rule }) => (rule.effects || []).some((effect) => relevantEffectTypes.has(effect.type)))
    .map(({ rule, fallback }) => ({
      name: rule.name,
      source: getAbilitySourceLabel(rule, fallback),
      text: rule.rules_text,
    }))
}

function buildAttackerActiveRules({
  attackerUnitDetails,
  attackerPackageIsCharacterUnit,
  attackerPackageModelCount,
  defenderPackageModelCount,
  defenderUnitDetails,
  selectedWeapon,
  selectedAttackWeapons,
  oathOfMomentActive,
  attackerDetachment,
  attackerEnhancementName,
  attackerSagaCompleted,
  attackerEldersGuidanceActive,
  attackerBoastAchieved,
  attackerHordeslayerOutnumbered,
  attackerHeroesAllRerollType,
  attackerMarkedForDestructionActive,
  attackerFireDisciplineActive,
  attackerUnforgivenFuryActive,
  attackerUnbridledFerocityActive,
  attackerStubbornTenacityActive,
  attackerWeaponsOfTheFirstLegionActive,
  attackerPennantOfRemembranceActive,
  attackerBelowStartingStrength,
  inHalfRange,
  remainedStationary,
  chargedThisTurn,
  indirectTargetVisible,
  plungingFireActive,
  attackerInEngagementRange,
  targetInEngagementRangeOfAllies,
  hasHazardous,
}) {
  const rules = [
    ...getRelevantUnitRules(attackerUnitDetails, 'attacker', hasHazardous),
  ]
  const defenderKeywordSet = new Set((defenderUnitDetails?.keywords || []).map((keyword) => String(keyword).toLowerCase()))
  const packsQuarryActive = attackerDetachment?.name === SAGA_OF_THE_HUNTER
    && selectedWeapon?.range === 'Melee'
    && (
      targetInEngagementRangeOfAllies
      || attackerPackageModelCount > defenderPackageModelCount
    )
  const legendarySlayersActive = attackerDetachment?.name === SAGA_OF_THE_BEASTSLAYER
    && (
      attackerSagaCompleted
      || defenderKeywordSet.has('character')
      || defenderKeywordSet.has('monster')
      || defenderKeywordSet.has('vehicle')
    )
  const heroesAllActive = attackerDetachment?.name === SAGA_OF_THE_BOLD
    && (
      attackerSagaCompleted
      || attackerPackageIsCharacterUnit
    )
  const wolfMasterActive = attackerEnhancementName === 'Wolf Master'
    && selectedAttackWeapons.some((weapon) => (
      ['teeth and claws', 'tyrnak and fenrir'].includes(String(weapon.name).toLowerCase())
    ))

  if (oathOfMomentActive && unitHasOathOfMoment(attackerUnitDetails)) {
    const woundBonusText = unitGetsOathWoundBonus(attackerUnitDetails)
      ? ' Re-roll Hit rolls against the selected target, and this attack also gets +1 to the Wound roll.'
      : ' Re-roll Hit rolls against the selected target.'
    rules.unshift({
      name: 'Oath of Moment',
      source: 'Army Rule',
      text: `This unit is attacking its Oath of Moment target.${woundBonusText}`,
    })
  }

  if (packsQuarryActive) {
    rules.push({
      name: "Pack's Quarry",
      source: `${attackerDetachment.name} Rule`,
      text: attackerSagaCompleted
        ? 'This melee attack gets +1 to Hit and +1 to Wound because the target is outnumbered or already engaged by allied Adeptus Astartes units, and the Saga is completed.'
        : 'This melee attack gets +1 to Hit because the target is outnumbered or already engaged by allied Adeptus Astartes units.',
    })
  }

  if (legendarySlayersActive) {
    rules.push({
      name: 'Legendary Slayers',
      source: `${attackerDetachment.name} Rule`,
      text: 'This attack has Lethal Hits because it is targeting a Character, Monster, or Vehicle unit, or because the Saga is completed.',
    })
  }

  if (heroesAllActive) {
    const rerollText = attackerSagaCompleted
      ? 'This unit can re-roll one Hit roll, one Wound roll, and one Damage roll while resolving this attack sequence.'
      : `This Character unit can re-roll one ${attackerHeroesAllRerollType || 'chosen'} roll while resolving this attack sequence.`
    rules.push({
      name: 'Heroes All',
      source: `${attackerDetachment.name} Rule`,
      text: rerollText,
    })
  }

  if (attackerFireDisciplineActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Fire Discipline')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerMarkedForDestructionActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Marked for Destruction')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerUnbridledFerocityActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Unbridled Ferocity')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerUnforgivenFuryActive) {
    const stratagem = getDetachmentEntry(attackerDetachment, 'stratagems', 'Unforgiven Fury')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${attackerDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (attackerStubbornTenacityActive && attackerBelowStartingStrength) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Stubborn Tenacity')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (attackerWeaponsOfTheFirstLegionActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Weapons of the First Legion')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (attackerPennantOfRemembranceActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Pennant of Remembrance')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (attackerEnhancementName === 'Fenrisian Grit' && hasHazardous) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Fenrisian Grit')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: 'The bearer has Feel No Pain 4+, so failed Hazardous checks use that protection.',
      })
    }
  }

  if (wolfMasterActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Wolf Master')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: 'Selected Teeth and Claws or Tyrnak and Fenrir attacks gain Lethal Hits.',
      })
    }
  }

  if (attackerEnhancementName === 'Feral Rage' && selectedWeapon?.range === 'Melee') {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Feral Rage')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: chargedThisTurn
          ? 'The bearer gets +2 melee Attacks this turn because it charged.'
          : 'The bearer gets +1 melee Attack.',
      })
    }
  }

  if (attackerEnhancementName === "Elder's Guidance" && attackerEldersGuidanceActive) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', "Elder's Guidance")
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: 'Blood Claws melee weapons improve their AP by 1 for this phase.',
      })
    }
  }

  if (attackerEnhancementName === "Braggart's Steel" && selectedWeapon?.range === 'Melee') {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', "Braggart's Steel")
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: attackerBoastAchieved
          ? 'The bearer gets +2 Strength and +1 Damage on melee weapons because its unit has achieved a Boast.'
          : 'The bearer gets +2 Strength on melee weapons.',
      })
    }
  }

  if (
    attackerEnhancementName === 'Hordeslayer'
    && selectedWeapon?.range === 'Melee'
    && attackerHordeslayerOutnumbered
  ) {
    const enhancement = getDetachmentEntry(attackerDetachment, 'enhancements', 'Hordeslayer')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${attackerDetachment.name} Enhancement`,
        text: attackerBoastAchieved
          ? 'The bearer gets +3 melee Attacks because it is outnumbered and its unit has achieved a Boast.'
          : 'The bearer gets +2 melee Attacks because it is outnumbered.',
      })
    }
  }

  if (selectedWeapon && inHalfRange) {
    const rapidFireValue = getWeaponKeywordValue(selectedWeapon, 'Rapid Fire')
    if (rapidFireValue > 0) {
      rules.push({
        name: `Rapid Fire ${rapidFireValue}`,
        source: 'Weapon Rule',
        text: `This weapon is in half range, so it gains ${rapidFireValue} additional attack${rapidFireValue === 1 ? '' : 's'}.`,
      })
    }

    const meltaValue = getWeaponKeywordValue(selectedWeapon, 'Melta')
    if (meltaValue > 0) {
      rules.push({
        name: `Melta ${meltaValue}`,
        source: 'Weapon Rule',
        text: `This weapon is in half range, so each unsaved attack gets +${meltaValue} damage.`,
      })
    }
  }

  if (selectedWeapon && weaponHasRawKeyword(selectedWeapon, 'Blast')) {
    const blastValue = getWeaponKeywordValue(selectedWeapon, 'Blast') || 1
    const extraAttacks = Math.floor((Number(defenderPackageModelCount) || 0) / 5) * blastValue
    if (extraAttacks > 0) {
      rules.push({
        name: blastValue > 1 ? `Blast ${blastValue}` : 'Blast',
        source: 'Weapon Rule',
        text: `The target has ${defenderPackageModelCount} models, so this weapon gains ${extraAttacks} additional attack dice.`,
      })
    }
  }

  if (selectedWeapon && weaponHasRawKeyword(selectedWeapon, 'Cleave')) {
    const cleaveValue = getWeaponKeywordValue(selectedWeapon, 'Cleave')
    const extraAttacks = Math.floor((Number(defenderPackageModelCount) || 0) / 5) * cleaveValue
    if (extraAttacks > 0) {
      rules.push({
        name: `Cleave ${cleaveValue}`,
        source: 'Weapon Rule',
        text: `One target was selected, so this weapon gains ${extraAttacks} additional attack dice from the target unit size.`,
      })
    }
  }

  if (selectedWeapon && remainedStationary) {
    const hasHeavyRule = weaponHasRawKeyword(selectedWeapon, 'Heavy') || attackerFireDisciplineActive
    if (hasHeavyRule && selectedWeapon.range !== 'Melee') {
      rules.push({
        name: 'Heavy',
        source: 'Weapon Rule',
        text: 'This unit remained Stationary, so this attack gets +1 to the Hit roll.',
      })
    }
  }

  if (selectedWeapon && chargedThisTurn && weaponHasRawKeyword(selectedWeapon, 'Lance')) {
    rules.push({
      name: 'Lance',
      source: 'Weapon Rule',
      text: 'This unit charged this turn, so this attack gets +1 to the Wound roll.',
    })
  }

  if (selectedWeapon && attackerInEngagementRange && weaponHasCloseQuarters(selectedWeapon)) {
    rules.push({
      name: 'Close-Quarters',
      source: 'Weapon Rule',
      text: 'This unit is in Engagement Range, but this ranged attack is still legal because the selected weapon is a Close-Quarters sidearm.',
    })
  }

  if (
    selectedWeapon
    && selectedWeapon.range !== 'Melee'
    && attackerInEngagementRange
    && unitIsMonsterOrVehicle(attackerUnitDetails)
    && !weaponHasCloseQuarters(selectedWeapon)
  ) {
    rules.push({
      name: 'Monster/Vehicle Shooting',
      source: 'Keyword Rule',
      text: 'This Monster/Vehicle unit is engaged, but it can still select ranged weapons to make attacks.',
    })
  }

  if (
    selectedWeapon
    && selectedWeapon.range !== 'Melee'
    && targetInEngagementRangeOfAllies
    && unitIsMonsterOrVehicle(defenderUnitDetails)
    && !(attackerInEngagementRange && weaponHasCloseQuarters(selectedWeapon))
  ) {
    rules.push({
      name: 'Shooting at Engaged Monster/Vehicle',
      source: 'Keyword Rule',
      text: 'The target is an engaged Monster/Vehicle, so this ranged attack subtracts 1 from the Hit roll.',
    })
  }

  if (selectedWeapon && weaponHasRawKeyword(selectedWeapon, 'Indirect Fire') && !indirectTargetVisible) {
    rules.push({
      name: 'Indirect Fire',
      source: 'Weapon Rule',
      text: 'This attack is being made without visibility, so it takes -1 to Hit and unmodified hit rolls of 1-3 fail.',
    })
  }

  if (
    selectedWeapon
    && selectedWeapon.range !== 'Melee'
    && plungingFireActive
    && !unitHasKeyword(attackerUnitDetails, 'aircraft')
    && !unitHasKeyword(defenderUnitDetails, 'aircraft')
  ) {
    rules.push({
      name: 'Plunging Fire',
      source: 'Terrain Rule',
      text: 'The attacker is high enough above the target, so improve this ranged attack\'s BS by 1.',
    })
  }

  return rules
}

function buildDefenderActiveRules({
  defenderUnitDetails,
  selectedWeapon,
  defenderDetachment,
  defenderEnhancementName,
  defenderArmourOfContemptActive,
  defenderOverwhelmingOnslaughtActive,
  defenderUnbreakableLinesActive,
  defenderPennantOfRemembranceActive,
  targetHasCover,
  indirectTargetVisible,
  attackerFireDisciplineActive,
}) {
  const rules = [
    ...getRelevantUnitRules(defenderUnitDetails, 'defender', false),
  ]

  if (defenderArmourOfContemptActive) {
    const stratagem = getDetachmentEntry(defenderDetachment, 'stratagems', 'Armour of Contempt')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${defenderDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (defenderOverwhelmingOnslaughtActive) {
    const stratagem = getDetachmentEntry(defenderDetachment, 'stratagems', 'Overwhelming Onslaught')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${defenderDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (defenderUnbreakableLinesActive) {
    const stratagem = getDetachmentEntry(defenderDetachment, 'stratagems', 'Unbreakable Lines')
    if (stratagem) {
      rules.push({
        name: stratagem.name,
        source: `${defenderDetachment.name} Stratagem`,
        text: stratagem.effect,
      })
    }
  }

  if (defenderPennantOfRemembranceActive) {
    const enhancement = getDetachmentEntry(defenderDetachment, 'enhancements', 'Pennant of Remembrance')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${defenderDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (defenderEnhancementName === 'Fenrisian Grit') {
    const enhancement = getDetachmentEntry(defenderDetachment, 'enhancements', 'Fenrisian Grit')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${defenderDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (defenderEnhancementName === 'Helm of the Beastslayer') {
    const enhancement = getDetachmentEntry(defenderDetachment, 'enhancements', 'Helm of the Beastslayer')
    if (enhancement) {
      rules.push({
        name: enhancement.name,
        source: `${defenderDetachment.name} Enhancement`,
        text: enhancement.rules_text,
      })
    }
  }

  if (defenderGetsCoverBenefit({
    selectedWeapon,
    defenderUnitDetails,
    targetHasCover,
    indirectTargetVisible,
    attackerFireDisciplineActive,
  })) {
    rules.push({
      name: 'Cover',
      source: 'Terrain Rule',
      text: 'This target gets +1 to its armor save against this ranged attack.',
    })
  }

  return rules
}

function renderStatsGrid(stats, battleShocked = false) {
  return statDisplayRows.map((row, index) => (
    <div key={index} className="stat-row">
      {row.map(([key, label, formatValue]) => {
        const value = battleShocked && key === 'objective_control' ? '-' : stats?.[key]
        if (value === undefined || value === null || value === '') {
          return null
        }

        if (key === 'save' && stats?.invulnerable_save) {
          return (
            <div key={key} className="stat-chip stat-chip-save">
              <span className="stat-label stat-label-save">{label}</span>
              <strong className="stat-value stat-value-save">
                {formatValue ? formatValue(value) : String(value)}
              </strong>
              <strong className="stat-value stat-value-invuln">
                {formatInvulnerableSave(stats.invulnerable_save)}
              </strong>
            </div>
          )
        }

        return (
          <div key={key} className="stat-chip">
            <span className="stat-label">{label}</span>
            <strong className="stat-value">
              {formatValue ? formatValue(value) : String(value)}
            </strong>
          </div>
        )
      })}
    </div>
  ))
}

function renderWeaponStatsGrid(weapon) {
  if (!weapon) {
    return null
  }

  const topRow = [
    ['Range', formatRangeValue(weapon.range)],
    ['A', String(weapon.attacks)],
    [weapon.skill_type || 'BS', weapon.skill_display],
  ]

  const bottomRow = [
    ['S', String(weapon.strength)],
    ['AP', weapon.ap_display],
    ['D', weapon.damage_display],
  ]

  return [topRow, bottomRow].map((row, index) => (
    <div key={index} className="stat-row">
      {row.map(([label, value]) => (
        <div key={label} className="stat-chip">
          <span className="stat-label">{label}</span>
          <strong className="stat-value">{value}</strong>
        </div>
      ))}
    </div>
  ))
}

function App() {
  const [factions, setFactions] = useState([])
  const [attackerUnits, setAttackerUnits] = useState([])
  const [defenderUnits, setDefenderUnits] = useState([])
  const [attackerFactionDetails, setAttackerFactionDetails] = useState(null)
  const [defenderFactionDetails, setDefenderFactionDetails] = useState(null)
  const [attackerUnitDetails, setAttackerUnitDetails] = useState(null)
  const [defenderUnitDetails, setDefenderUnitDetails] = useState(null)
  const [attackerAttachedLeaderUnitDetails, setAttackerAttachedLeaderUnitDetails] = useState(null)
  const [attachedCharacterUnitDetails, setAttachedCharacterUnitDetails] = useState(null)
  const [simulationRuns, setSimulationRuns] = useState([])
  const [activeRunView, setActiveRunView] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('combat')
  const [armyListEntries, setArmyListEntries] = useState([])
  const [savedArmyLists, setSavedArmyLists] = useState([])
  const [armyListName, setArmyListName] = useState('')
  const [selectedSavedArmyListId, setSelectedSavedArmyListId] = useState('')
  const [armyListFaction, setArmyListFaction] = useState('')
  const [armyListUnits, setArmyListUnits] = useState([])
  const [armyListUnitName, setArmyListUnitName] = useState('')
  const [expandedArmyListEntries, setExpandedArmyListEntries] = useState({})
  const [turnStructure, setTurnStructure] = useState({ edition: '11th', turn_sequence: DEFAULT_TURN_STRUCTURE })
  const [activeTurnPhaseId, setActiveTurnPhaseId] = useState(DEFAULT_TURN_STRUCTURE[0].id)
  const [selectedTurnModuleId, setSelectedTurnModuleId] = useState(DEFAULT_TURN_STRUCTURE[0].available_actions?.[0] || '')
  const [battleRound, setBattleRound] = useState(1)
  const [activePlayer, setActivePlayer] = useState('Player 1')
  const [gameBattleRound, setGameBattleRound] = useState(1)
  const [gameActivePlayer, setGameActivePlayer] = useState('Player 1')
  const [activeGamePhaseId, setActiveGamePhaseId] = useState(DEFAULT_TURN_STRUCTURE[0].id)
  const [selectedGameModuleId, setSelectedGameModuleId] = useState(DEFAULT_TURN_STRUCTURE[0].available_actions?.[0] || '')
  const [gameStepDetailsExpanded, setGameStepDetailsExpanded] = useState(false)
  const [completedGameStepKeys, setCompletedGameStepKeys] = useState({})
  const [gameLogEntries, setGameLogEntries] = useState([])
  const [gameNotes, setGameNotes] = useState('')
  const [battlefieldCommandPoints, setBattlefieldCommandPoints] = useState({
    attacker: 0,
    defender: 0,
  })
  const [battlefieldStratagemSide, setBattlefieldStratagemSide] = useState('attacker')
  const [battlefieldStratagemName, setBattlefieldStratagemName] = useState('')
  const [battlefieldStratagemTargetId, setBattlefieldStratagemTargetId] = useState('attacker')
  const [battlefieldHeroicInterventionMode, setBattlefieldHeroicInterventionMode] = useState('leap_to_defend')
  const [battlefieldUsedStratagems, setBattlefieldUsedStratagems] = useState([])
  const [selectedBattlefieldTool, setSelectedBattlefieldTool] = useState('stratagems')
  const [battlefieldExtraUnits, setBattlefieldExtraUnits] = useState([])
  const [battlefieldBaseUnitDeployment, setBattlefieldBaseUnitDeployment] = useState({
    attacker: false,
    defender: false,
  })
  const [battlefieldAddAttackerUnitName, setBattlefieldAddAttackerUnitName] = useState('')
  const [battlefieldAddDefenderUnitName, setBattlefieldAddDefenderUnitName] = useState('')
  const [battlefieldAddAttackerArmyListEntryId, setBattlefieldAddAttackerArmyListEntryId] = useState('')
  const [battlefieldAddDefenderArmyListEntryId, setBattlefieldAddDefenderArmyListEntryId] = useState('')
  const [battlefieldPositions, setBattlefieldPositions] = useState({
    attacker: { x: 20, y: 50 },
    defender: { x: 80, y: 50 },
  })
  const [battlefieldMoveStarts, setBattlefieldMoveStarts] = useState({
    attacker: { x: 20, y: 50 },
    defender: { x: 80, y: 50 },
  })
  const [battlefieldModelOffsets, setBattlefieldModelOffsets] = useState({})
  const [battlefieldModelMoveStarts, setBattlefieldModelMoveStarts] = useState({})
  const [battlefieldRemovedModelIds, setBattlefieldRemovedModelIds] = useState({})
  const [battlefieldPendingCasualties, setBattlefieldPendingCasualties] = useState(null)
  const [battlefieldRotations, setBattlefieldRotations] = useState({
    attacker: 0,
    defender: 0,
  })
  const [draggingUnitId, setDraggingUnitId] = useState('')
  const [draggingModelId, setDraggingModelId] = useState('')
  const [selectedBattlefieldModelId, setSelectedBattlefieldModelId] = useState('')
  const [selectedBattlefieldUnitId, setSelectedBattlefieldUnitId] = useState('')
  const [battlefieldCombatAttackerId, setBattlefieldCombatAttackerId] = useState('')
  const [battlefieldCombatWeaponNames, setBattlefieldCombatWeaponNames] = useState([])
  const [battlefieldMoveTypes, setBattlefieldMoveTypes] = useState({
    attacker: 'normal',
    defender: 'normal',
  })
  const [battlefieldMovedUnits, setBattlefieldMovedUnits] = useState({})
  const [battlefieldAdvanceRolls, setBattlefieldAdvanceRolls] = useState({
    attacker: 1,
    defender: 1,
  })
  const [battlefieldSurgeDistances, setBattlefieldSurgeDistances] = useState({
    attacker: 3,
    defender: 3,
  })
  const [battlefieldTakeToSkies, setBattlefieldTakeToSkies] = useState({
    attacker: false,
    defender: false,
  })
  const [battlefieldChargeRolls, setBattlefieldChargeRolls] = useState({
    attacker: 2,
    defender: 2,
  })
  const [battlefieldChargedUnits, setBattlefieldChargedUnits] = useState({})
  const [battlefieldWoundsRemaining, setBattlefieldWoundsRemaining] = useState({
    attacker: 0,
    defender: 0,
  })
  const [battlefieldDamageInputs, setBattlefieldDamageInputs] = useState({
    attacker: '0',
    defender: '0',
  })
  const [battlefieldUndoStack, setBattlefieldUndoStack] = useState([])
  const [battlefieldFallBackModes, setBattlefieldFallBackModes] = useState({
    attacker: 'ordered_retreat',
    defender: 'ordered_retreat',
  })
  const [battlefieldBattleShockedUnits, setBattlefieldBattleShockedUnits] = useState({
    attacker: false,
    defender: false,
  })
  const [battlefieldActionName, setBattlefieldActionName] = useState(DEFAULT_MISSION_ACTIONS[0].name)
  const [battlefieldActionTargetId, setBattlefieldActionTargetId] = useState('attacker')
  const [battlefieldActions, setBattlefieldActions] = useState([])
  const [battlefieldEmbarkUnitId, setBattlefieldEmbarkUnitId] = useState('attacker')
  const [battlefieldTransportId, setBattlefieldTransportId] = useState('defender')
  const [battlefieldTransportCapacities, setBattlefieldTransportCapacities] = useState({
    attacker: 0,
    defender: 0,
  })
  const [battlefieldEmbarkedUnits, setBattlefieldEmbarkedUnits] = useState({})
  const [battlefieldDisembarkModes, setBattlefieldDisembarkModes] = useState({
    attacker: 'tactical',
    defender: 'tactical',
  })
  const [battlefieldReserveUnitId, setBattlefieldReserveUnitId] = useState('attacker')
  const [battlefieldReserveStatuses, setBattlefieldReserveStatuses] = useState({})
  const [battlefieldIngressEdges, setBattlefieldIngressEdges] = useState({
    attacker: 'left',
    defender: 'right',
  })
  const battlefieldBoardRef = useRef(null)

  const [attackerFaction, setAttackerFaction] = useState('')
  const [attackerUnit, setAttackerUnit] = useState('')
  const [attackerLoadoutSelections, setAttackerLoadoutSelections] = useState({})
  const [attackerModelCount, setAttackerModelCount] = useState('')
  const [attackerModelCounts, setAttackerModelCounts] = useState({})
  const [weaponNames, setWeaponNames] = useState([])
  const [attackerAttachedLeaderName, setAttackerAttachedLeaderName] = useState('')
  const [attackerAttachedLeaderLoadoutSelections, setAttackerAttachedLeaderLoadoutSelections] = useState({})
  const [attackerAttachedLeaderModelCount, setAttackerAttachedLeaderModelCount] = useState('')
  const [attackerAttachedLeaderModelCounts, setAttackerAttachedLeaderModelCounts] = useState({})
  const [defenderFaction, setDefenderFaction] = useState('')
  const [defenderUnit, setDefenderUnit] = useState('')
  const [defenderLoadoutSelections, setDefenderLoadoutSelections] = useState({})
  const [defenderModelCount, setDefenderModelCount] = useState('')
  const [defenderModelCounts, setDefenderModelCounts] = useState({})
  const [attachedCharacterName, setAttachedCharacterName] = useState('')
  const [attachedCharacterLoadoutSelections, setAttachedCharacterLoadoutSelections] = useState({})
  const [attachedCharacterModelCount, setAttachedCharacterModelCount] = useState('')
  const [attachedCharacterModelCounts, setAttachedCharacterModelCounts] = useState({})
  const [attackerDetachmentName, setAttackerDetachmentName] = useState('')
  const [defenderDetachmentName, setDefenderDetachmentName] = useState('')
  const [attackerEnhancementName, setAttackerEnhancementName] = useState('')
  const [defenderEnhancementName, setDefenderEnhancementName] = useState('')
  const [runCount, setRunCount] = useState('1')

  const [targetHasCover, setTargetHasCover] = useState(initialOptions.target_has_cover)
  const [attackerInEngagementRange, setAttackerInEngagementRange] = useState(initialOptions.attacker_in_engagement_range)
  const [targetInEngagementRangeOfAllies, setTargetInEngagementRangeOfAllies] = useState(initialOptions.target_in_engagement_range_of_allies)
  const [inHalfRange, setInHalfRange] = useState(initialOptions.in_half_range)
  const [oathOfMomentActive, setOathOfMomentActive] = useState(initialOptions.oath_of_moment_active)
  const [chargedThisTurn, setChargedThisTurn] = useState(initialOptions.charged_this_turn)
  const [remainedStationary, setRemainedStationary] = useState(initialOptions.remained_stationary)
  const [indirectTargetVisible, setIndirectTargetVisible] = useState(initialOptions.indirect_target_visible)
  const [plungingFireActive, setPlungingFireActive] = useState(initialOptions.plunging_fire_active)
  const [hazardousOverwatchChargePhase, setHazardousOverwatchChargePhase] = useState(initialOptions.hazardous_overwatch_charge_phase)
  const [hazardousBearerCurrentWounds, setHazardousBearerCurrentWounds] = useState(initialOptions.hazardous_bearer_current_wounds)
  const [attackerFireDisciplineActive, setAttackerFireDisciplineActive] = useState(initialOptions.attacker_fire_discipline_active)
  const [attackerMarkedForDestructionActive, setAttackerMarkedForDestructionActive] = useState(initialOptions.attacker_marked_for_destruction_active)
  const [attackerUnforgivenFuryActive, setAttackerUnforgivenFuryActive] = useState(initialOptions.attacker_unforgiven_fury_active)
  const [attackerUnforgivenFuryArmyBattleshocked, setAttackerUnforgivenFuryArmyBattleshocked] = useState(initialOptions.attacker_unforgiven_fury_army_battleshocked)
  const [attackerStubbornTenacityActive, setAttackerStubbornTenacityActive] = useState(initialOptions.attacker_stubborn_tenacity_active)
  const [attackerWeaponsOfTheFirstLegionActive, setAttackerWeaponsOfTheFirstLegionActive] = useState(initialOptions.attacker_weapons_of_the_first_legion_active)
  const [attackerPennantOfRemembranceActive, setAttackerPennantOfRemembranceActive] = useState(initialOptions.attacker_pennant_of_remembrance_active)
  const [attackerBelowStartingStrength, setAttackerBelowStartingStrength] = useState(initialOptions.attacker_below_starting_strength)
  const [attackerBattleshocked, setAttackerBattleshocked] = useState(initialOptions.attacker_battleshocked)
  const [attackerSagaCompleted, setAttackerSagaCompleted] = useState(initialOptions.attacker_saga_completed)
  const [attackerEldersGuidanceActive, setAttackerEldersGuidanceActive] = useState(initialOptions.attacker_elders_guidance_active)
  const [attackerBoastAchieved, setAttackerBoastAchieved] = useState(initialOptions.attacker_boast_achieved)
  const [attackerHordeslayerOutnumbered, setAttackerHordeslayerOutnumbered] = useState(initialOptions.attacker_hordeslayer_outnumbered)
  const [attackerHeroesAllRerollType, setAttackerHeroesAllRerollType] = useState(initialOptions.attacker_heroes_all_reroll_type)
  const [attackerUnbridledFerocityActive, setAttackerUnbridledFerocityActive] = useState(initialOptions.attacker_unbridled_ferocity_active)
  const [attackerWaaaghActive, setAttackerWaaaghActive] = useState(initialOptions.attacker_waaagh_active)
  const [defenderWaaaghActive, setDefenderWaaaghActive] = useState(initialOptions.defender_waaagh_active)
  const [attackerPreyActive, setAttackerPreyActive] = useState(initialOptions.attacker_prey_active)
  const [attackerTargetWithinNine, setAttackerTargetWithinNine] = useState(initialOptions.attacker_target_within_9)
  const [attackerCountsAsTenPlusModels, setAttackerCountsAsTenPlusModels] = useState(initialOptions.attacker_counts_as_ten_plus_models)
  const [defenderCountsAsTenPlusModels, setDefenderCountsAsTenPlusModels] = useState(initialOptions.defender_counts_as_ten_plus_models)
  const [targetBelowStartingStrength, setTargetBelowStartingStrength] = useState(initialOptions.target_below_starting_strength)
  const [targetBelowHalfStrength, setTargetBelowHalfStrength] = useState(initialOptions.target_below_half_strength)
  const [attackerTryDatButtonEffects, setAttackerTryDatButtonEffects] = useState(initialOptions.attacker_try_dat_button_effects)
  const [attackerTryDatButtonHazardous, setAttackerTryDatButtonHazardous] = useState(initialOptions.attacker_try_dat_button_hazardous)
  const [attackerUnbridledCarnageActive, setAttackerUnbridledCarnageActive] = useState(initialOptions.attacker_unbridled_carnage_active)
  const [defenderArdAsNailsActive, setDefenderArdAsNailsActive] = useState(initialOptions.defender_ard_as_nails_active)
  const [attackerDragItDownActive, setAttackerDragItDownActive] = useState(initialOptions.attacker_drag_it_down_active)
  const [defenderStalkinTaktiksActive, setDefenderStalkinTaktiksActive] = useState(initialOptions.defender_stalkin_taktiks_active)
  const [defenderSpeediestFreeksActive, setDefenderSpeediestFreeksActive] = useState(initialOptions.defender_speediest_freeks_active)
  const [attackerBlitzaFireActive, setAttackerBlitzaFireActive] = useState(initialOptions.attacker_blitza_fire_active)
  const [attackerDakkastormActive, setAttackerDakkastormActive] = useState(initialOptions.attacker_dakkastorm_active)
  const [attackerFullThrottleActive, setAttackerFullThrottleActive] = useState(initialOptions.attacker_full_throttle_active)
  const [attackerKlankinKlawsActive, setAttackerKlankinKlawsActive] = useState(initialOptions.attacker_klankin_klaws_active)
  const [attackerKlankinKlawsPushed, setAttackerKlankinKlawsPushed] = useState(initialOptions.attacker_klankin_klaws_pushed)
  const [attackerDakkaDakkaDakkaActive, setAttackerDakkaDakkaDakkaActive] = useState(initialOptions.attacker_dakka_dakka_dakka_active)
  const [attackerDakkaDakkaDakkaPushed, setAttackerDakkaDakkaDakkaPushed] = useState(initialOptions.attacker_dakka_dakka_dakka_pushed)
  const [attackerBiggerShellsActive, setAttackerBiggerShellsActive] = useState(initialOptions.attacker_bigger_shells_active)
  const [attackerBiggerShellsPushed, setAttackerBiggerShellsPushed] = useState(initialOptions.attacker_bigger_shells_pushed)
  const [defenderExtraGubbinzActive, setDefenderExtraGubbinzActive] = useState(initialOptions.defender_extra_gubbinz_active)
  const [attackerCompetitiveStreakActive, setAttackerCompetitiveStreakActive] = useState(initialOptions.attacker_competitive_streak_active)
  const [attackerArmedToDaTeefActive, setAttackerArmedToDaTeefActive] = useState(initialOptions.attacker_armed_to_da_teef_active)
  const [defenderHulkingBrutesActive, setDefenderHulkingBrutesActive] = useState(initialOptions.defender_hulking_brutes_active)
  const [defenderArmourOfContemptActive, setDefenderArmourOfContemptActive] = useState(initialOptions.defender_armour_of_contempt_active)
  const [defenderOverwhelmingOnslaughtActive, setDefenderOverwhelmingOnslaughtActive] = useState(initialOptions.defender_overwhelming_onslaught_active)
  const [defenderUnbreakableLinesActive, setDefenderUnbreakableLinesActive] = useState(initialOptions.defender_unbreakable_lines_active)
  const [defenderPennantOfRemembranceActive, setDefenderPennantOfRemembranceActive] = useState(initialOptions.defender_pennant_of_remembrance_active)
  const [defenderBattleshocked, setDefenderBattleshocked] = useState(initialOptions.defender_battleshocked)

  useEffect(() => {
    async function loadFactions() {
      try {
        setLoading(true)
        const data = await fetchFactions()
        const items = data.items || []
        setFactions(items)
        if (items[0]) {
          setAttackerFaction(items[0].name)
          setDefenderFaction(items[0].name)
          setArmyListFaction(items[0].name)
        }
      } catch (requestError) {
        setError(formatError(requestError))
      } finally {
        setLoading(false)
      }
    }

    loadFactions()
  }, [])

  useEffect(() => {
    try {
      const storedLists = JSON.parse(localStorage.getItem(SAVED_ARMY_LISTS_STORAGE_KEY) || '[]')
      if (Array.isArray(storedLists)) {
        setSavedArmyLists(storedLists)
        setSelectedSavedArmyListId(storedLists[0]?.id || '')
      }
    } catch {
      setSavedArmyLists([])
      setSelectedSavedArmyListId('')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVED_ARMY_LISTS_STORAGE_KEY, JSON.stringify(savedArmyLists))
  }, [savedArmyLists])

  useEffect(() => {
    let active = true

    async function loadTurnStructure() {
      try {
        const data = await fetchTurnStructure()
        if (!active) {
          return
        }
        const turnSequence = data.turn_sequence?.length ? data.turn_sequence : DEFAULT_TURN_STRUCTURE
        setTurnStructure({ ...data, turn_sequence: turnSequence })
        setActiveTurnPhaseId((currentPhaseId) => (
          turnSequence.some((phase) => phase.id === currentPhaseId)
            ? currentPhaseId
            : turnSequence[0]?.id || DEFAULT_TURN_STRUCTURE[0].id
        ))
      } catch {
        if (active) {
          setTurnStructure({ edition: '11th', turn_sequence: DEFAULT_TURN_STRUCTURE })
        }
      }
    }

    loadTurnStructure()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!attackerFaction) {
      return
    }

    let active = true
    setAttackerUnitDetails(null)
    setWeaponNames([])

    async function loadAttackerUnits() {
      try {
        const data = await fetchUnits(attackerFaction)
        if (!active) {
          return
        }
        const items = data.items || []
        setAttackerUnits(items)
        setAttackerUnit((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setBattlefieldAddAttackerUnitName((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerUnits()

    return () => {
      active = false
    }
  }, [attackerFaction])

  useEffect(() => {
    if (!armyListFaction) {
      setArmyListUnits([])
      setArmyListUnitName('')
      return
    }

    let active = true

    async function loadArmyListUnits() {
      try {
        const data = await fetchUnits(armyListFaction)
        if (!active) {
          return
        }
        const items = data.items || []
        setArmyListUnits(items)
        setArmyListUnitName((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadArmyListUnits()

    return () => {
      active = false
    }
  }, [armyListFaction])

  const attackerArmyListDeploymentEntries = useMemo(() => {
    const matchingEntries = armyListEntries.filter((entry) => !attackerFaction || entry.faction === attackerFaction)
    return matchingEntries.length ? matchingEntries : armyListEntries
  }, [armyListEntries, attackerFaction])
  const defenderArmyListDeploymentEntries = useMemo(() => {
    const matchingEntries = armyListEntries.filter((entry) => !defenderFaction || entry.faction === defenderFaction)
    return matchingEntries.length ? matchingEntries : armyListEntries
  }, [armyListEntries, defenderFaction])

  useEffect(() => {
    setBattlefieldAddAttackerArmyListEntryId((currentEntryId) => (
      attackerArmyListDeploymentEntries.some((entry) => entry.id === currentEntryId)
        ? currentEntryId
        : attackerArmyListDeploymentEntries[0]?.id || ''
    ))
    setBattlefieldAddDefenderArmyListEntryId((currentEntryId) => (
      defenderArmyListDeploymentEntries.some((entry) => entry.id === currentEntryId)
        ? currentEntryId
        : defenderArmyListDeploymentEntries[0]?.id || ''
    ))
  }, [attackerArmyListDeploymentEntries, defenderArmyListDeploymentEntries])

  useEffect(() => {
    if (!attackerFaction) {
      return
    }

    let active = true

    async function loadAttackerFactionDetails() {
      try {
        const data = await fetchFactionDetails(attackerFaction)
        if (!active) {
          return
        }
        setAttackerFactionDetails(data)
        setAttackerDetachmentName((currentDetachment) => (
          data.detachments?.some((detachment) => detachment.name === currentDetachment)
            ? currentDetachment
            : data.detachments?.[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerFactionDetails()

    return () => {
      active = false
    }
  }, [attackerFaction])

  useEffect(() => {
    if (!defenderFaction) {
      return
    }

    let active = true
    setDefenderUnitDetails(null)
    setAttachedCharacterName('')

    async function loadDefenderUnits() {
      try {
        const data = await fetchUnits(defenderFaction)
        if (!active) {
          return
        }
        const items = data.items || []
        setDefenderUnits(items)
        setDefenderUnit((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setBattlefieldAddDefenderUnitName((currentUnit) => (
          items.some((unit) => unit.name === currentUnit)
            ? currentUnit
            : items[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadDefenderUnits()

    return () => {
      active = false
    }
  }, [defenderFaction])

  useEffect(() => {
    if (!defenderFaction) {
      return
    }

    let active = true

    async function loadDefenderFactionDetails() {
      try {
        const data = await fetchFactionDetails(defenderFaction)
        if (!active) {
          return
        }
        setDefenderFactionDetails(data)
        setDefenderDetachmentName((currentDetachment) => (
          data.detachments?.some((detachment) => detachment.name === currentDetachment)
            ? currentDetachment
            : data.detachments?.[0]?.name || ''
        ))
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadDefenderFactionDetails()

    return () => {
      active = false
    }
  }, [defenderFaction])

  useEffect(() => {
    setAttackerLoadoutSelections({})
    setAttackerModelCount('')
    setAttackerModelCounts({})
    setAttackerAttachedLeaderName('')
  }, [attackerFaction, attackerUnit])

  useEffect(() => {
    setDefenderLoadoutSelections({})
    setDefenderModelCount('')
    setDefenderModelCounts({})
  }, [defenderFaction, defenderUnit])

  useEffect(() => {
    setAttackerAttachedLeaderLoadoutSelections({})
    setAttackerAttachedLeaderModelCount('')
    setAttackerAttachedLeaderModelCounts({})
    setAttackerAttachedLeaderUnitDetails(null)
  }, [attackerAttachedLeaderName])

  useEffect(() => {
    setAttachedCharacterLoadoutSelections({})
    setAttachedCharacterModelCount('')
    setAttachedCharacterModelCounts({})
    setAttachedCharacterUnitDetails(null)
  }, [attachedCharacterName])

  useEffect(() => {
    if (!attackerFaction || !attackerUnit || !attackerUnits.some((unit) => unit.name === attackerUnit)) {
      return
    }

    let active = true

    async function loadAttackerUnitDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          attackerFaction,
          attackerUnit,
          attackerLoadoutSelections,
          attackerModelCount,
          attackerModelCounts,
        )
        if (!active) {
          return
        }
        setAttackerUnitDetails(data)
        setAttackerModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setAttackerModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerUnitDetails()

    return () => {
      active = false
    }
  }, [attackerFaction, attackerLoadoutSelections, attackerModelCount, attackerModelCounts, attackerUnit, attackerUnits])

  const attackerAttachedLeaderOptions = useMemo(() => {
    if (!attackerUnit || !attackerFactionDetails?.units?.length) {
      return []
    }
    return attackerFactionDetails.units.filter((unit) => {
      const canLead = unit.leader?.can_lead || []
      return unit.name !== attackerUnit && canLead.includes(attackerUnit)
    })
  }, [attackerFactionDetails, attackerUnit])

  useEffect(() => {
    if (
      !attackerAttachedLeaderName
      || !attackerFaction
      || !attackerAttachedLeaderOptions.some((unit) => unit.name === attackerAttachedLeaderName)
    ) {
      return
    }

    let active = true

    async function loadAttackerAttachedLeaderDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          attackerFaction,
          attackerAttachedLeaderName,
          attackerAttachedLeaderLoadoutSelections,
          attackerAttachedLeaderModelCount,
          attackerAttachedLeaderModelCounts,
        )
        if (!active) {
          return
        }
        setAttackerAttachedLeaderUnitDetails(data)
        setAttackerAttachedLeaderModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setAttackerAttachedLeaderModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttackerAttachedLeaderDetails()

    return () => {
      active = false
    }
  }, [
    attackerAttachedLeaderLoadoutSelections,
    attackerAttachedLeaderModelCount,
    attackerAttachedLeaderModelCounts,
    attackerAttachedLeaderName,
    attackerAttachedLeaderOptions,
    attackerFaction,
  ])

  useEffect(() => {
    if (!defenderFaction || !defenderUnit || !defenderUnits.some((unit) => unit.name === defenderUnit)) {
      return
    }

    let active = true

    async function loadDefenderUnitDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          defenderFaction,
          defenderUnit,
          defenderLoadoutSelections,
          defenderModelCount,
          defenderModelCounts,
        )
        if (!active) {
          return
        }
        setDefenderUnitDetails(data)
        setDefenderModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setDefenderModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadDefenderUnitDetails()

    return () => {
      active = false
    }
  }, [defenderFaction, defenderLoadoutSelections, defenderModelCount, defenderModelCounts, defenderUnit, defenderUnits])

  const combatWeaponOptions = useMemo(
    () => getCombatWeaponOptions(attackerUnitDetails, attackerAttachedLeaderUnitDetails),
    [attackerAttachedLeaderUnitDetails, attackerUnitDetails],
  )
  const selectedCombatWeaponOptions = useMemo(
    () => combatWeaponOptions.filter((weapon) => weaponNames.includes(weapon.name)),
    [combatWeaponOptions, weaponNames],
  )
  const selectedAttackEntries = useMemo(
    () => getSelectedAttackEntries(attackerUnitDetails, attackerAttachedLeaderUnitDetails, weaponNames),
    [attackerAttachedLeaderUnitDetails, attackerUnitDetails, weaponNames],
  )
  const selectedAttackWeapons = useMemo(
    () => selectedAttackEntries.map((entry) => entry.weapon),
    [selectedAttackEntries],
  )
  const selectedAttackWeaponLabels = useMemo(
    () => selectedAttackEntries.map((entry) => entry.label),
    [selectedAttackEntries],
  )
  const selectedWeapon = useMemo(
    () => buildWeaponSelectionProfile(
      selectedAttackWeapons,
      selectedCombatWeaponOptions.map((weapon) => formatWeaponName(weapon)),
    ),
    [selectedAttackWeapons, selectedCombatWeaponOptions],
  )
  const attackerPackageIsCharacterUnit = unitHasKeyword(attackerUnitDetails, 'character') || unitHasKeyword(attackerAttachedLeaderUnitDetails, 'character')
  const attackerPackageModelCount = Number(attackerUnitDetails?.model_count ?? 0) + Number(attackerAttachedLeaderUnitDetails?.model_count ?? 0)
  const defenderPackageModelCount = Number(defenderUnitDetails?.model_count ?? 0) + Number(attachedCharacterUnitDetails?.model_count ?? 0)
  const attackerAttachedUnitKeywords = useMemo(
    () => getCombinedUnitKeywords(attackerUnitDetails, attackerAttachedLeaderUnitDetails),
    [attackerAttachedLeaderUnitDetails, attackerUnitDetails],
  )
  const defenderAttachedUnitKeywords = useMemo(
    () => getCombinedUnitKeywords(defenderUnitDetails, attachedCharacterUnitDetails),
    [attachedCharacterUnitDetails, defenderUnitDetails],
  )
  const defenderBodyguardHighestToughness = useMemo(() => {
    const values = [
      ...(defenderUnitDetails?.target_profiles || []).map((profile) => Number(profile.toughness || 0)),
      Number(defenderUnitDetails?.toughness || parsePlusValue(defenderUnitDetails?.stats?.toughness) || 0),
    ].filter((value) => value > 0)
    return values.length ? Math.max(...values) : 0
  }, [defenderUnitDetails])
  const isRangedWeapon = selectedAttackWeapons.some((weapon) => weapon.range !== 'Melee')
  const isMeleeWeapon = selectedAttackWeapons.some((weapon) => weapon.range === 'Melee')
  const hasHeavy = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Heavy'))
  const hasBlast = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Blast'))
  const hasIndirectFire = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Indirect Fire'))
  const hasHazardous = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Hazardous'))
  const canUsePrecision = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Precision'))
  const canUseLance = selectedAttackWeapons.some((weapon) => weaponHasRawKeyword(weapon, 'Lance'))

  useEffect(() => {
    if (!combatWeaponOptions.length) {
      if (weaponNames.length) {
        setWeaponNames([])
      }
      return
    }
    const validWeaponNames = weaponNames.filter((weaponName) => combatWeaponOptions.some((weapon) => weapon.name === weaponName))
    if (validWeaponNames.length === weaponNames.length && validWeaponNames.length > 0) {
      return
    }
    if (validWeaponNames.length > 0) {
      setWeaponNames(validWeaponNames)
      return
    }
    setWeaponNames([combatWeaponOptions[0].name])
  }, [combatWeaponOptions, weaponNames])

  const attachedCharacterOptions = useMemo(() => {
    if (!defenderUnit || !defenderFactionDetails?.units?.length) {
      return []
    }
    return defenderFactionDetails.units.filter((unit) => {
      const canLead = unit.leader?.can_lead || []
      return unit.name !== defenderUnit && canLead.includes(defenderUnit)
    })
  }, [defenderFactionDetails, defenderUnit])

  useEffect(() => {
    const attackerLeaderStillValid = attackerAttachedLeaderOptions.some((unit) => unit.name === attackerAttachedLeaderName)
    if (!attackerAttachedLeaderName || attackerLeaderStillValid) {
      return
    }
    setAttackerAttachedLeaderName('')
    if (attackerAttachedLeaderUnitDetails) {
      setAttackerAttachedLeaderUnitDetails(null)
    }
    if (Object.keys(attackerAttachedLeaderLoadoutSelections).length) {
      setAttackerAttachedLeaderLoadoutSelections({})
    }
    if (attackerAttachedLeaderModelCount !== '') {
      setAttackerAttachedLeaderModelCount('')
    }
    if (Object.keys(attackerAttachedLeaderModelCounts).length) {
      setAttackerAttachedLeaderModelCounts({})
    }
  }, [
    attackerAttachedLeaderLoadoutSelections,
    attackerAttachedLeaderModelCount,
    attackerAttachedLeaderModelCounts,
    attackerAttachedLeaderName,
    attackerAttachedLeaderOptions,
    attackerAttachedLeaderUnitDetails,
  ])

  useEffect(() => {
    if (
      !canUsePrecision
      || !attachedCharacterName
      || !defenderFaction
      || !attachedCharacterOptions.some((unit) => unit.name === attachedCharacterName)
    ) {
      return
    }

    let active = true

    async function loadAttachedCharacterUnitDetails() {
      try {
        const data = await fetchUnitDetailsWithLoadout(
          defenderFaction,
          attachedCharacterName,
          attachedCharacterLoadoutSelections,
          attachedCharacterModelCount,
          attachedCharacterModelCounts,
        )
        if (!active) {
          return
        }
        setAttachedCharacterUnitDetails(data)
        setAttachedCharacterModelCount((currentModelCount) => {
          if (unitUsesModelBreakdownSelectors(data)) {
            return String(data.model_count ?? data.unit_composition?.min_models ?? 1)
          }
          const currentValue = currentModelCount === '' ? null : Number(currentModelCount)
          const minimumModels = Number(data.unit_composition?.min_models ?? data.model_count ?? 1)
          const maximumModels = Number(data.unit_composition?.max_models ?? minimumModels)
          if (
            currentValue === null
            || Number.isNaN(currentValue)
            || currentValue < minimumModels
            || currentValue > maximumModels
          ) {
            return String(data.model_count ?? minimumModels)
          }
          return currentModelCount
        })
        setAttachedCharacterModelCounts((currentModelCounts) => {
          const nextModelCounts = unitUsesModelBreakdownSelectors(data) ? (data.model_counts_by_name || {}) : {}
          return areModelCountSelectionsEqual(currentModelCounts, nextModelCounts)
            ? currentModelCounts
            : nextModelCounts
        })
        setError('')
      } catch (requestError) {
        if (active) {
          setError(formatError(requestError))
        }
      }
    }

    loadAttachedCharacterUnitDetails()

    return () => {
      active = false
    }
  }, [
    attachedCharacterLoadoutSelections,
    attachedCharacterModelCount,
    attachedCharacterModelCounts,
    attachedCharacterName,
    attachedCharacterOptions,
    canUsePrecision,
    defenderFaction,
  ])

  const selectedAttackerDetachment = useMemo(
    () => getDetachmentByName(attackerFactionDetails, attackerDetachmentName),
    [attackerFactionDetails, attackerDetachmentName],
  )

  const selectedDefenderDetachment = useMemo(
    () => getDetachmentByName(defenderFactionDetails, defenderDetachmentName),
    [defenderFactionDetails, defenderDetachmentName],
  )
  const resolvedAttackerLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(attackerUnitDetails, attackerLoadoutSelections),
    [attackerLoadoutSelections, attackerUnitDetails],
  )
  const resolvedAttackerModelCounts = useMemo(
    () => getResolvedModelCountSelections(attackerUnitDetails, attackerModelCounts),
    [attackerModelCounts, attackerUnitDetails],
  )
  const resolvedAttackerAttachedLeaderLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(attackerAttachedLeaderUnitDetails, attackerAttachedLeaderLoadoutSelections),
    [attackerAttachedLeaderLoadoutSelections, attackerAttachedLeaderUnitDetails],
  )
  const resolvedAttackerAttachedLeaderModelCounts = useMemo(
    () => getResolvedModelCountSelections(attackerAttachedLeaderUnitDetails, attackerAttachedLeaderModelCounts),
    [attackerAttachedLeaderModelCounts, attackerAttachedLeaderUnitDetails],
  )
  const resolvedDefenderLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(defenderUnitDetails, defenderLoadoutSelections),
    [defenderLoadoutSelections, defenderUnitDetails],
  )
  const resolvedDefenderModelCounts = useMemo(
    () => getResolvedModelCountSelections(defenderUnitDetails, defenderModelCounts),
    [defenderModelCounts, defenderUnitDetails],
  )
  const resolvedAttachedCharacterLoadoutSelections = useMemo(
    () => getResolvedLoadoutSelections(attachedCharacterUnitDetails, attachedCharacterLoadoutSelections),
    [attachedCharacterLoadoutSelections, attachedCharacterUnitDetails],
  )
  const resolvedAttachedCharacterModelCounts = useMemo(
    () => getResolvedModelCountSelections(attachedCharacterUnitDetails, attachedCharacterModelCounts),
    [attachedCharacterModelCounts, attachedCharacterUnitDetails],
  )
  const canUseCover = isRangedWeapon
  const canUseHalfRange = isRangedWeapon && (
    selectedAttackWeapons.some((weapon) => getWeaponKeywordValue(weapon, 'Rapid Fire') > 0)
    || selectedAttackWeapons.some((weapon) => getWeaponKeywordValue(weapon, 'Melta') > 0)
  )
  const hasOathOfMoment = unitHasOathOfMoment(attackerUnitDetails)
  const attackerEnhancementBearerUnit = attackerAttachedLeaderUnitDetails || attackerUnitDetails
  const defenderEnhancementBearerUnit = attachedCharacterUnitDetails || defenderUnitDetails
  const attackerEnhancementOptions = useMemo(
    () => getAttackerEnhancementOptions(
      selectedAttackerDetachment,
      attackerEnhancementBearerUnit,
      attackerUnitDetails,
      selectedWeapon,
      hasHazardous,
    ),
    [selectedAttackerDetachment, attackerEnhancementBearerUnit, attackerUnitDetails, selectedWeapon, hasHazardous],
  )
  const defenderEnhancementOptions = useMemo(
    () => getDefenderEnhancementOptions(selectedDefenderDetachment, defenderEnhancementBearerUnit),
    [selectedDefenderDetachment, defenderEnhancementBearerUnit],
  )
  const attackerStratagemOptions = useMemo(
    () => getAttackerStratagemOptions(selectedAttackerDetachment, attackerUnitDetails, isRangedWeapon),
    [selectedAttackerDetachment, attackerUnitDetails, isRangedWeapon],
  )
  const defenderStratagemOptions = useMemo(
    () => getDefenderStratagemOptions(selectedDefenderDetachment, selectedWeapon),
    [selectedDefenderDetachment, selectedWeapon],
  )

  const attackerCanBeTargetedByStratagems = !attackerBattleshocked
  const defenderCanBeTargetedByStratagems = !defenderBattleshocked
  const canUseAttackerFireDiscipline = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Fire Discipline')
  const canUseAttackerMarkedForDestruction = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Marked for Destruction')
  const canUseAttackerUnforgivenFury = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Unforgiven Fury')
  const canUseAttackerUnbridledFerocity = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Unbridled Ferocity')
  const canUseAttackerUnbridledCarnage = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Unbridled Carnage')
  const canUseAttackerDragItDown = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Drag It Down')
  const canUseAttackerBlitzaFire = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Blitza Fire')
  const canUseAttackerDakkastorm = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Dakkastorm')
  const canUseAttackerFullThrottle = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Full Throttle!')
  const canUseAttackerKlankinKlaws = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === "Klankin' Klaws")
  const canUseAttackerDakkaDakkaDakka = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Dakka! Dakka! Dakka!')
  const canUseAttackerBiggerShells = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Bigger Shells for Bigger Gitz')
  const canUseAttackerCompetitiveStreak = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Competitive Streak')
  const canUseAttackerArmedToDaTeef = attackerCanBeTargetedByStratagems && attackerStratagemOptions.some((item) => item.name === 'Armed to da Teef')
  const canUseDefenderArmourOfContempt = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === 'Armour of Contempt')
  const canUseDefenderOverwhelmingOnslaught = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === 'Overwhelming Onslaught')
  const canUseDefenderUnbreakableLines = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === 'Unbreakable Lines')
  const canUseDefenderArdAsNails = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === "'Ard as Nails")
  const canUseDefenderStalkinTaktiks = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === "Stalkin' Taktiks")
  const canUseDefenderSpeediestFreeks = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === 'Speediest Freeks')
  const canUseDefenderExtraGubbinz = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === 'Extra Gubbinz')
  const canUseDefenderHulkingBrutes = defenderCanBeTargetedByStratagems && defenderStratagemOptions.some((item) => item.name === 'Hulking Brutes')
  const canUseAttackerWaaagh = unitHasWaaagh(attackerUnitDetails) || unitHasWaaagh(attackerAttachedLeaderUnitDetails)
  const canUseDefenderWaaagh = unitHasWaaagh(defenderUnitDetails) || unitHasWaaagh(attachedCharacterUnitDetails)
  const canUseAttackerPrey = selectedAttackerDetachment?.name === DA_BIG_HUNT
  const canUseTargetWithinNine = selectedAttackerDetachment?.name === KULT_OF_SPEED && (canUseAttackerBlitzaFire || canUseAttackerDakkastorm)
  const canUseTargetBelowStartingStrength = attackerEnhancementName === "'Eadstompa"
  const canUseTargetBelowHalfStrength = attackerEnhancementName === "'Eadstompa"
  const canUseAttackerCountsAsTenPlus = selectedAttackerDetachment?.name === GREEN_TIDE && attackerPackageModelCount < 10
  const canUseDefenderCountsAsTenPlus = selectedDefenderDetachment?.name === GREEN_TIDE && defenderPackageModelCount < 10
  const canUseTryDatButton = selectedAttackerDetachment?.name === DREAD_MOB && (
    unitHasKeyword(attackerUnitDetails, 'mek')
    || unitHasKeyword(attackerUnitDetails, 'walker')
    || (
      unitHasKeyword(attackerUnitDetails, 'vehicle')
      && (unitHasKeyword(attackerUnitDetails, 'gretchin') || unitHasKeyword(attackerUnitDetails, 'grots'))
    )
  )
  const canUseSagaCompleted = [SAGA_OF_THE_HUNTER, SAGA_OF_THE_BEASTSLAYER, SAGA_OF_THE_BOLD].includes(selectedAttackerDetachment?.name || '')
  const canUseHeroesAllRerollType = selectedAttackerDetachment?.name === SAGA_OF_THE_BOLD && !attackerSagaCompleted && attackerPackageIsCharacterUnit
  const canUseEldersGuidance = attackerEnhancementName === "Elder's Guidance" && isMeleeWeapon && attackerUnitDetails?.name === 'Blood Claws'
  const canUseBoastAchieved = attackerEnhancementName === "Braggart's Steel" || attackerEnhancementName === 'Hordeslayer'
  const canUseHordeslayerOutnumbered = attackerEnhancementName === 'Hordeslayer'
  const canUseTargetInEngagementRangeOfAllies = hasBlast || (selectedAttackerDetachment?.name === SAGA_OF_THE_HUNTER && isMeleeWeapon)
  const selectedAttackerEnhancement = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'enhancements', attackerEnhancementName),
    [selectedAttackerDetachment, attackerEnhancementName],
  )
  const selectedDefenderEnhancement = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'enhancements', defenderEnhancementName),
    [selectedDefenderDetachment, defenderEnhancementName],
  )
  const fireDisciplineEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Fire Discipline'),
    [selectedAttackerDetachment],
  )
  const markedForDestructionEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Marked for Destruction'),
    [selectedAttackerDetachment],
  )
  const unforgivenFuryEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unforgiven Fury'),
    [selectedAttackerDetachment],
  )
  const unbridledFerocityEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unbridled Ferocity'),
    [selectedAttackerDetachment],
  )
  const unbridledCarnageEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Unbridled Carnage'),
    [selectedAttackerDetachment],
  )
  const dragItDownEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Drag It Down'),
    [selectedAttackerDetachment],
  )
  const blitzaFireEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Blitza Fire'),
    [selectedAttackerDetachment],
  )
  const dakkastormEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Dakkastorm'),
    [selectedAttackerDetachment],
  )
  const fullThrottleEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Full Throttle!'),
    [selectedAttackerDetachment],
  )
  const klankinKlawsEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', "Klankin' Klaws"),
    [selectedAttackerDetachment],
  )
  const dakkaDakkaDakkaEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Dakka! Dakka! Dakka!'),
    [selectedAttackerDetachment],
  )
  const biggerShellsEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Bigger Shells for Bigger Gitz'),
    [selectedAttackerDetachment],
  )
  const competitiveStreakEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Competitive Streak'),
    [selectedAttackerDetachment],
  )
  const armedToDaTeefEntry = useMemo(
    () => getDetachmentEntry(selectedAttackerDetachment, 'stratagems', 'Armed to da Teef'),
    [selectedAttackerDetachment],
  )
  const armourOfContemptEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Armour of Contempt'),
    [selectedDefenderDetachment],
  )
  const overwhelmingOnslaughtEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Overwhelming Onslaught'),
    [selectedDefenderDetachment],
  )
  const unbreakableLinesEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Unbreakable Lines'),
    [selectedDefenderDetachment],
  )
  const ardAsNailsEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', "'Ard as Nails"),
    [selectedDefenderDetachment],
  )
  const stalkinTaktiksEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', "Stalkin' Taktiks"),
    [selectedDefenderDetachment],
  )
  const speediestFreeksEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Speediest Freeks'),
    [selectedDefenderDetachment],
  )
  const extraGubbinzEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Extra Gubbinz'),
    [selectedDefenderDetachment],
  )
  const hulkingBrutesEntry = useMemo(
    () => getDetachmentEntry(selectedDefenderDetachment, 'stratagems', 'Hulking Brutes'),
    [selectedDefenderDetachment],
  )
  const oathAbility = useMemo(
    () => getUnitAbility(attackerUnitDetails, (ability) => {
      const name = String(ability.name || '').toLowerCase()
      const rulesText = String(ability.rules_text || '').toLowerCase()
      return name.includes('oath of moment') || rulesText.includes('oath of moment')
    }),
    [attackerUnitDetails],
  )
  const rapidFireValue = selectedAttackWeapons.reduce(
    (maximumValue, weapon) => Math.max(maximumValue, getWeaponKeywordValue(weapon, 'Rapid Fire')),
    0,
  )
  const meltaValue = selectedAttackWeapons.reduce(
    (maximumValue, weapon) => Math.max(maximumValue, getWeaponKeywordValue(weapon, 'Melta')),
    0,
  )
  const attackerDetachmentTooltip = formatDetachmentTooltip(selectedAttackerDetachment)
  const defenderDetachmentTooltip = formatDetachmentTooltip(selectedDefenderDetachment)
  const attackerEnhancementTooltip = formatEnhancementTooltip(selectedAttackerEnhancement)
  const defenderEnhancementTooltip = formatEnhancementTooltip(selectedDefenderEnhancement)
  const fireDisciplineTooltip = formatStratagemTooltip(fireDisciplineEntry)
  const markedForDestructionTooltip = formatStratagemTooltip(markedForDestructionEntry)
  const unforgivenFuryTooltip = formatStratagemTooltip(unforgivenFuryEntry)
  const unbridledFerocityTooltip = formatStratagemTooltip(unbridledFerocityEntry)
  const unbridledCarnageTooltip = formatStratagemTooltip(unbridledCarnageEntry)
  const dragItDownTooltip = formatStratagemTooltip(dragItDownEntry)
  const blitzaFireTooltip = formatStratagemTooltip(blitzaFireEntry)
  const dakkastormTooltip = formatStratagemTooltip(dakkastormEntry)
  const fullThrottleTooltip = formatStratagemTooltip(fullThrottleEntry)
  const klankinKlawsTooltip = formatStratagemTooltip(klankinKlawsEntry)
  const dakkaDakkaDakkaTooltip = formatStratagemTooltip(dakkaDakkaDakkaEntry)
  const biggerShellsTooltip = formatStratagemTooltip(biggerShellsEntry)
  const competitiveStreakTooltip = formatStratagemTooltip(competitiveStreakEntry)
  const armedToDaTeefTooltip = formatStratagemTooltip(armedToDaTeefEntry)
  const armourOfContemptTooltip = formatStratagemTooltip(armourOfContemptEntry)
  const overwhelmingOnslaughtTooltip = formatStratagemTooltip(overwhelmingOnslaughtEntry)
  const unbreakableLinesTooltip = formatStratagemTooltip(unbreakableLinesEntry)
  const ardAsNailsTooltip = formatStratagemTooltip(ardAsNailsEntry)
  const stalkinTaktiksTooltip = formatStratagemTooltip(stalkinTaktiksEntry)
  const speediestFreeksTooltip = formatStratagemTooltip(speediestFreeksEntry)
  const extraGubbinzTooltip = formatStratagemTooltip(extraGubbinzEntry)
  const hulkingBrutesTooltip = formatStratagemTooltip(hulkingBrutesEntry)
  const oathTooltip = buildTooltip(
    OATH_OF_MOMENT_RULE_TEXT,
    unitGetsOathWoundBonus(attackerUnitDetails)
      ? OATH_OF_MOMENT_CODEX_RIDER_TEXT
      : '',
    oathAbility?.rules_text && oathAbility.rules_text !== 'Oath of Moment'
      ? `Datasheet entry: ${oathAbility.rules_text}`
      : '',
  )
  const halfRangeTooltip = buildTooltip(
    rapidFireValue > 0
      ? `Rapid Fire ${rapidFireValue}: if the target is in half range, this weapon gains ${rapidFireValue} additional attack${rapidFireValue === 1 ? '' : 's'}.`
      : '',
    meltaValue > 0
      ? `Melta ${meltaValue}: if the target is in half range, each unsaved attack gets +${meltaValue} damage.`
      : '',
  )
  const coverTooltip = 'Benefit of Cover improves the armor save by 1 against ranged attacks. It does not improve invulnerable saves and does not help a 3+ or better save against AP 0.'
  const engagementTooltip = weaponHasCloseQuarters(selectedWeapon)
    ? 'Close-Quarters: this ranged attack can still be made while the attacker is in Engagement Range, but it must target an enemy unit within Engagement Range.'
    : 'Non-Close-Quarters ranged weapons are usually not allowed while the attacker or target is engaged unless another rule permits it. Monster/Vehicle units can select ranged weapons while engaged, and engaged Monster/Vehicle targets can be shot at with -1 to Hit.'
  const heavyTooltip = 'Heavy: if the unit remained Stationary, add 1 to the Hit roll for this attack.'
  const blastTooltip = 'Blast: this weapon cannot target a unit that is within Engagement Range of allied units.'
  const packsQuarryTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', "Pack's Quarry")?.rules_text || ''
  const targetInEngagementTooltip = hasBlast && selectedAttackerDetachment?.name === SAGA_OF_THE_HUNTER && isMeleeWeapon
    ? buildTooltip(blastTooltip, packsQuarryTooltip)
    : selectedAttackerDetachment?.name === SAGA_OF_THE_HUNTER && isMeleeWeapon
      ? packsQuarryTooltip
      : blastTooltip

  function renderLoadoutSelectors(sideLabel, unitDetails, loadoutSelections, setLoadoutSelections) {
    if (!unitDetails?.loadout_options?.length) {
      return null
    }

    return (
      <div className="cluster two-up">
        {unitDetails.loadout_options.map((group) => {
          if (group.selection_type === 'count') {
            const maximumTotal = getLoadoutGroupMaxTotal(unitDetails, group)
            const resolvedSelections = getResolvedLoadoutSelections(unitDetails, loadoutSelections)
            const currentGroupSelection = resolvedSelections[group.id] && typeof resolvedSelections[group.id] === 'object'
              ? resolvedSelections[group.id]
              : {}
            const currentTotal = Object.values(currentGroupSelection).reduce(
              (sum, value) => sum + (Number(value) || 0),
              0,
            )

            return (
              <div key={`${sideLabel}-${group.id}`}>
                <span>{`${sideLabel} ${group.label}`}</span>
                {(group.options || []).map((option) => {
                  const maximumCount = getLoadoutOptionMaxCount(unitDetails, group, option)
                  const currentValue = Number(getLoadoutCountSelectionValue(unitDetails, loadoutSelections, group, option.id)) || 0
                  const remainingAllowance = Math.max(0, maximumTotal - (currentTotal - currentValue))
                  const inputMaximum = Math.min(maximumCount, remainingAllowance)

                  return (
                    <label key={`${sideLabel}-${group.id}-${option.id}`}>
                      <span>{formatLoadoutOptionLabel(option)}</span>
                      <input
                        type="number"
                        min="0"
                        max={String(inputMaximum)}
                        value={String(currentValue)}
                        onChange={(event) => {
                          const nextValue = Math.max(
                            0,
                            Math.min(
                              inputMaximum,
                              Number(event.target.value) || 0,
                            ),
                          )
                          setLoadoutSelections((currentSelections) => {
                            const existingGroupSelection = currentSelections[group.id]
                              && typeof currentSelections[group.id] === 'object'
                              ? currentSelections[group.id]
                              : currentGroupSelection
                            const nextGroupSelection = {
                              ...existingGroupSelection,
                              [option.id]: nextValue,
                            }
                            if (nextValue <= 0) {
                              delete nextGroupSelection[option.id]
                            }
                            return {
                              ...currentSelections,
                              [group.id]: nextGroupSelection,
                            }
                          })
                        }}
                      />
                    </label>
                  )
                })}
              </div>
            )
          }

          return (
            <label key={`${sideLabel}-${group.id}`}>
              <span>{`${sideLabel} ${group.label}`}</span>
              <select
                value={getLoadoutSelectionValue(unitDetails, loadoutSelections, group)}
                onChange={(event) => {
                  const nextOptionId = event.target.value
                  setLoadoutSelections((currentSelections) => ({
                    ...currentSelections,
                    [group.id]: nextOptionId,
                  }))
                }}
              >
                {(group.options || []).map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    title={formatLoadoutOptionLabel(option)}
                  >
                    {formatLoadoutOptionLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>
    )
  }

  function renderCountStepper(label, value, minimum, maximum, onChange) {
    return (
      <label className="stepper-field">
        <span>{label}</span>
        <div className="stepper-control">
          <button
            type="button"
            className="stepper-button"
            onClick={() => onChange(Math.max(minimum, value - 1))}
            disabled={value <= minimum}
          >
            -
          </button>
          <input
            type="number"
            min={String(minimum)}
            max={String(maximum)}
            step="1"
            value={String(value)}
            onChange={(event) => {
              const nextValue = Math.max(
                minimum,
                Math.min(maximum, Number(event.target.value) || minimum),
              )
              onChange(nextValue)
            }}
          />
          <button
            type="button"
            className="stepper-button"
            onClick={() => onChange(Math.min(maximum, value + 1))}
            disabled={value >= maximum}
          >
            +
          </button>
        </div>
      </label>
    )
  }

  function renderModelCountSelector(
    sideLabel,
    unitDetails,
    modelCount,
    setModelCount,
    modelCounts,
    setModelCounts,
  ) {
    if (!unitDetails) {
      return null
    }

    if (unitUsesModelBreakdownSelectors(unitDetails)) {
      return (
        <div className="cluster two-up">
          {(unitDetails.models || []).map((model) => {
            const { currentCount, minimumCount, maximumCount } = getModelEntryControlBounds(
              unitDetails,
              model,
              modelCounts,
            )
            return (
              <div key={`${sideLabel}-${model.name}`}>
                {renderCountStepper(
                  model.name,
                  currentCount,
                  minimumCount,
                  maximumCount,
                  (nextValue) => {
                    setModelCounts((currentModelCounts) => ({
                      ...currentModelCounts,
                      [model.name]: nextValue,
                    }))
                  },
                )}
              </div>
            )
          })}
        </div>
      )
    }

    const { minimumModels, maximumModels } = getUnitModelCountBounds(unitDetails)
    if (maximumModels <= minimumModels) {
      return null
    }

    return renderCountStepper(
      `${sideLabel} Squad Size`,
      Number(getUnitModelCountValue(unitDetails, modelCount)),
      minimumModels,
      maximumModels,
      (nextValue) => setModelCount(String(nextValue)),
    )
  }

  useEffect(() => {
    const attachedCharacterStillValid = attachedCharacterOptions.some((unit) => unit.name === attachedCharacterName)
    if (canUsePrecision && (!attachedCharacterName || attachedCharacterStillValid)) {
      return
    }
    if (attachedCharacterName && (!canUsePrecision || !attachedCharacterStillValid)) {
      setAttachedCharacterName('')
    }
    if (attachedCharacterUnitDetails) {
      setAttachedCharacterUnitDetails(null)
    }
    if (Object.keys(attachedCharacterLoadoutSelections).length) {
      setAttachedCharacterLoadoutSelections({})
    }
    if (attachedCharacterModelCount !== '') {
      setAttachedCharacterModelCount('')
    }
    if (Object.keys(attachedCharacterModelCounts).length) {
      setAttachedCharacterModelCounts({})
    }
  }, [
    attachedCharacterLoadoutSelections,
    attachedCharacterModelCount,
    attachedCharacterModelCounts,
    attachedCharacterName,
    attachedCharacterOptions,
    attachedCharacterUnitDetails,
    canUsePrecision,
  ])
  const indirectTooltip = 'Indirect Fire: if no defender models are visible, the attack takes -1 to Hit, hit rolls of 1-3 always fail, and the defender gets the benefit of cover.'
  const lanceTooltip = 'Lance: if the bearer made a charge move this turn, add 1 to the Wound roll for this attack.'
  const attackerArmyBattleshockTooltip = 'Unforgiven Fury: if one or more Adeptus Astartes units from your army are Battle-shocked, successful unmodified Hit rolls of 5+ score a Critical Hit until the end of the phase.'
  const attackerBelowStartingStrengthTooltip = attackerEnhancementTooltip
  const attackerBattleshockedTooltip = buildTooltip(
    'Battle-shocked units have OC -, cannot be targeted with stratagems, cannot start actions, and cannot complete actions they started.',
    attackerEnhancementName === 'Weapons of the First Legion'
      ? 'Weapons of the First Legion improves further while the bearer is Battle-shocked.'
      : '',
    attackerEnhancementName === 'Pennant of Remembrance'
      ? 'Pennant of Remembrance improves Feel No Pain while the bearer is Battle-shocked.'
      : '',
    attackerEnhancementName === 'Stubborn Tenacity'
      ? 'Stubborn Tenacity can add an additional +1 to Wound while the bearer is Battle-shocked and below Starting Strength.'
      : '',
  )
  const attackerSagaCompletedTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule')?.saga?.rules_text || 'Apply the completed Saga bonuses for this detachment.'
  const attackerEldersGuidanceTooltip = attackerEnhancementTooltip
  const attackerBoastAchievedTooltip = attackerEnhancementTooltip
  const attackerHordeslayerOutnumberedTooltip = attackerEnhancementTooltip
  const attackerWaaaghTooltip = attackerFactionDetails?.army_rules?.find((rule) => rule.name === 'Waaagh!')?.rules_text || ''
  const defenderWaaaghTooltip = defenderFactionDetails?.army_rules?.find((rule) => rule.name === 'Waaagh!')?.rules_text || ''
  const attackerPreyTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', 'Da Hunt Is On')?.rules_text || ''
  const attackerTargetWithinNineTooltip = buildTooltip(
    blitzaFireTooltip,
    dakkastormTooltip,
  )
  const attackerCountsAsTenTooltip = buildTooltip(
    getDetachmentEntry(selectedAttackerDetachment, 'enhancements', 'Raucous Warcaller')?.rules_text || '',
    getDetachmentEntry(selectedAttackerDetachment, 'stratagems', "Braggin' Rights")?.effect || '',
  )
  const defenderCountsAsTenTooltip = buildTooltip(
    getDetachmentEntry(selectedDefenderDetachment, 'enhancements', 'Raucous Warcaller')?.rules_text || '',
    getDetachmentEntry(selectedDefenderDetachment, 'stratagems', "Braggin' Rights")?.effect || '',
  )
  const targetBelowStartingStrengthTooltip = attackerEnhancementTooltip
  const targetBelowHalfStrengthTooltip = attackerEnhancementTooltip
  const tryDatButtonTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', 'Try Dat Button!')?.rules_text || ''
  const heroesAllRerollTooltip = getDetachmentEntry(selectedAttackerDetachment, 'rule', 'Heroes All')?.rules_text || ''
  const defenderBattleshockedTooltip = buildTooltip(
    'Battle-shocked units have OC -, cannot be targeted with stratagems, cannot start actions, and cannot complete actions they started.',
    defenderEnhancementTooltip,
  )
  const attachedCharacterTooltip = 'Precision: successful wounds from this attack can be allocated to the attached Character first.'
  const hazardousOverwatchTooltip = 'If this Hazardous weapon was used for Fire Overwatch in the opponent charge phase, the self-inflicted mortal wounds are allocated after the charging unit ends its charge move.'
  const hazardousBearerTooltip = 'Set the current wounds on the Hazardous bearer so self-damage is allocated against the correct model state.'
  const attackerActiveRules = useMemo(
    () => buildAttackerActiveRules({
      attackerUnitDetails,
      attackerPackageIsCharacterUnit,
      attackerPackageModelCount,
      defenderPackageModelCount,
      defenderUnitDetails,
      selectedWeapon,
      selectedAttackWeapons,
      oathOfMomentActive,
      attackerDetachment: selectedAttackerDetachment,
      attackerEnhancementName,
      attackerSagaCompleted,
      attackerEldersGuidanceActive,
      attackerBoastAchieved,
      attackerHordeslayerOutnumbered,
      attackerHeroesAllRerollType,
      attackerMarkedForDestructionActive,
      attackerFireDisciplineActive,
      attackerUnforgivenFuryActive,
      attackerUnbridledFerocityActive,
      attackerStubbornTenacityActive,
      attackerWeaponsOfTheFirstLegionActive,
      attackerPennantOfRemembranceActive,
      attackerBelowStartingStrength,
      inHalfRange,
      remainedStationary,
      chargedThisTurn,
      indirectTargetVisible,
      plungingFireActive,
      attackerInEngagementRange,
      targetInEngagementRangeOfAllies,
      hasHazardous,
    }),
    [
      attackerUnitDetails,
      attackerPackageIsCharacterUnit,
      attackerPackageModelCount,
      defenderPackageModelCount,
      defenderUnitDetails,
      selectedWeapon,
      selectedAttackWeapons,
      oathOfMomentActive,
      selectedAttackerDetachment,
      attackerEnhancementName,
      attackerSagaCompleted,
      attackerEldersGuidanceActive,
      attackerBoastAchieved,
      attackerHordeslayerOutnumbered,
      attackerHeroesAllRerollType,
      attackerMarkedForDestructionActive,
      attackerFireDisciplineActive,
      attackerUnforgivenFuryActive,
      attackerUnbridledFerocityActive,
      attackerStubbornTenacityActive,
      attackerWeaponsOfTheFirstLegionActive,
      attackerPennantOfRemembranceActive,
      attackerBelowStartingStrength,
      inHalfRange,
      remainedStationary,
      chargedThisTurn,
      indirectTargetVisible,
      plungingFireActive,
      attackerInEngagementRange,
      targetInEngagementRangeOfAllies,
      hasHazardous,
    ],
  )
  const defenderActiveRules = useMemo(
    () => buildDefenderActiveRules({
      defenderUnitDetails,
      selectedWeapon,
      defenderDetachment: selectedDefenderDetachment,
      defenderEnhancementName,
      defenderArmourOfContemptActive,
      defenderOverwhelmingOnslaughtActive,
      defenderUnbreakableLinesActive,
      defenderPennantOfRemembranceActive,
      targetHasCover,
      indirectTargetVisible,
      attackerFireDisciplineActive,
    }),
    [
      defenderUnitDetails,
      selectedWeapon,
      selectedDefenderDetachment,
      defenderEnhancementName,
      defenderArmourOfContemptActive,
      defenderOverwhelmingOnslaughtActive,
      defenderUnbreakableLinesActive,
      defenderPennantOfRemembranceActive,
      targetHasCover,
      indirectTargetVisible,
      attackerFireDisciplineActive,
    ],
  )
  const summaryStats = useMemo(() => buildRunSummary(simulationRuns), [simulationRuns])
  const activeRun = useMemo(() => {
    if (activeRunView === 'summary') {
      return null
    }
    return simulationRuns.find((run) => run.runIndex === activeRunView) || null
  }, [activeRunView, simulationRuns])
  const turnSequence = turnStructure.turn_sequence?.length ? turnStructure.turn_sequence : DEFAULT_TURN_STRUCTURE
  const activeTurnPhaseIndex = Math.max(
    0,
    turnSequence.findIndex((phase) => phase.id === activeTurnPhaseId),
  )
  const activeTurnPhase = turnSequence[activeTurnPhaseIndex] || turnSequence[0]
  const canGoToPreviousTurnPhase = activeTurnPhaseIndex > 0
  const canGoToNextTurnPhase = activeTurnPhaseIndex < turnSequence.length - 1
  const completedTurnPhases = new Set(turnSequence.slice(0, activeTurnPhaseIndex).map((phase) => phase.id))
  const activeTurnModuleIds = activeTurnPhase?.available_actions || []
  const selectedTurnModule = activeTurnModuleIds.includes(selectedTurnModuleId)
    ? selectedTurnModuleId
    : activeTurnModuleIds[0] || ''
  const activeGamePhaseIndex = Math.max(
    0,
    turnSequence.findIndex((phase) => phase.id === activeGamePhaseId),
  )
  const activeGamePhase = turnSequence[activeGamePhaseIndex] || turnSequence[0]
  const activeGameStepKey = `${gameBattleRound}:${gameActivePlayer}:${activeGamePhase?.id}`
  const completedGameStepCount = turnSequence.filter((phase) => (
    completedGameStepKeys[`${gameBattleRound}:${gameActivePlayer}:${phase.id}`]
  )).length
  const gameTurnProgressPercent = turnSequence.length
    ? Math.round((completedGameStepCount / turnSequence.length) * 100)
    : 0
  const completedGamePhases = new Set(turnSequence.filter((phase) => (
    completedGameStepKeys[`${gameBattleRound}:${gameActivePlayer}:${phase.id}`]
  )).map((phase) => phase.id))
  const gamePhaseRequirements = [
    ...(activeGamePhase?.primary_rules || []),
    ...(activeGamePhase?.sub_steps || []).map((subStep) => (
      `${subStep.name}${subStep.rule_ref ? ` ${subStep.rule_ref}` : ''}: ${subStep.summary}`
    )),
  ]
  const visibleGamePhaseRequirements = gameStepDetailsExpanded
    ? gamePhaseRequirements
    : gamePhaseRequirements.slice(0, 2)
  const hiddenGamePhaseRequirementCount = Math.max(0, gamePhaseRequirements.length - visibleGamePhaseRequirements.length)
  const gameAvailableModuleLabels = (activeGamePhase?.available_actions || []).map((action) => (
    TURN_ACTION_LABELS[action] || action
  ))
  const activeGameModuleIds = activeGamePhase?.available_actions || []
  const selectedGameModule = activeGameModuleIds.includes(selectedGameModuleId)
    ? selectedGameModuleId
    : activeGameModuleIds[0] || ''
  const gameCanGoBack = activeGamePhaseIndex > 0
  const gameCurrentStepComplete = Boolean(completedGameStepKeys[activeGameStepKey])
  const canMoveOnBattlefield = activePage === 'battlefield' && activeGamePhase?.id === 'movement'
  const canChargeOnBattlefield = activePage === 'battlefield' && activeGamePhase?.id === 'charge'
  const canRepositionBattlefieldUnits = canMoveOnBattlefield || canChargeOnBattlefield
  const battlefieldUnits = useMemo(() => {
    const buildUnit = ({ id, sourceSide, role, x, y, instanceNumber = 1, unitDetails: instanceUnitDetails = null, unitName = '', faction: instanceFaction = '' }) => {
      const unitDetails = instanceUnitDetails || (sourceSide === 'attacker' ? attackerUnitDetails : defenderUnitDetails)
      if (!unitDetails) {
        return null
      }
      const baseMm = getBaseDiameterMm(unitDetails)
      const startingModelCount = Number(unitDetails.model_count ?? 1) || 1
      const removedModelIds = battlefieldRemovedModelIds[id] || []
      const currentModelCount = Math.max(0, startingModelCount - removedModelIds.length)
      if (currentModelCount <= 0) {
        return null
      }
      const faction = instanceFaction || (sourceSide === 'attacker' ? attackerFaction : defenderFaction)
      return {
        id,
        sourceSide,
        side: sourceSide,
        role,
        name: instanceNumber > 1 ? `${unitDetails.name || unitName} ${instanceNumber}` : unitDetails.name || unitName,
        datasheetName: unitDetails.bodyguard_name || unitDetails.name || unitName,
        unitDetails,
        faction,
        baseMm,
        baseInches: mmToInches(baseMm),
        movementInches: parseMovementInches(unitDetails.stats?.movement),
        modelCount: currentModelCount,
        startingModelCount,
        removedModelIds,
        keywords: unitDetails.keywords || [],
        faction_keywords: unitDetails.faction_keywords || [],
        abilities: unitDetails.abilities || [],
        wargear_abilities: unitDetails.wargear_abilities || [],
        hasFrame: unitHasKeyword(unitDetails, 'frame'),
        x,
        y,
      }
    }

    return [
      ...(battlefieldBaseUnitDeployment.attacker
        ? [buildUnit({ id: 'attacker', sourceSide: 'attacker', role: 'Attacker', x: 20, y: 50 })]
        : []),
      ...(battlefieldBaseUnitDeployment.defender
        ? [buildUnit({ id: 'defender', sourceSide: 'defender', role: 'Defender', x: 80, y: 50 })]
        : []),
      ...battlefieldExtraUnits.map((unit) => buildUnit(unit)),
    ].filter(Boolean)
  }, [attackerFaction, attackerUnitDetails, battlefieldBaseUnitDeployment, battlefieldExtraUnits, battlefieldRemovedModelIds, defenderFaction, defenderUnitDetails])
  const battlefieldUnitMap = useMemo(
    () => Object.fromEntries(battlefieldUnits.map((unit) => [unit.id, unit])),
    [battlefieldUnits],
  )
  const getBattlefieldSourceSide = useCallback((unitOrId) => {
    const unit = typeof unitOrId === 'string' ? battlefieldUnitMap[unitOrId] : unitOrId
    return unit?.sourceSide || unit?.id || 'attacker'
  }, [battlefieldUnitMap])
  const getBattlefieldUnitDetails = useCallback((unitOrId) => {
    const unit = typeof unitOrId === 'string' ? battlefieldUnitMap[unitOrId] : unitOrId
    return unit?.unitDetails || (getBattlefieldSourceSide(unitOrId) === 'attacker' ? attackerUnitDetails : defenderUnitDetails)
  }, [attackerUnitDetails, battlefieldUnitMap, defenderUnitDetails, getBattlefieldSourceSide])
  const getBattlefieldLoadoutSelections = useCallback((unitOrId) => {
    const unit = typeof unitOrId === 'string' ? battlefieldUnitMap[unitOrId] : unitOrId
    if (unit && !['attacker', 'defender'].includes(unit.id)) {
      return {}
    }
    return getBattlefieldSourceSide(unitOrId) === 'attacker' ? resolvedAttackerLoadoutSelections : resolvedDefenderLoadoutSelections
  }, [battlefieldUnitMap, getBattlefieldSourceSide, resolvedAttackerLoadoutSelections, resolvedDefenderLoadoutSelections])
  const getBattlefieldModelCounts = useCallback((unitOrId) => {
    const unit = typeof unitOrId === 'string' ? battlefieldUnitMap[unitOrId] : unitOrId
    if (unit && !['attacker', 'defender'].includes(unit.id)) {
      return getResolvedModelCountSelections(unit.unitDetails, {})
    }
    return getBattlefieldSourceSide(unitOrId) === 'attacker' ? resolvedAttackerModelCounts : resolvedDefenderModelCounts
  }, [battlefieldUnitMap, getBattlefieldSourceSide, resolvedAttackerModelCounts, resolvedDefenderModelCounts])
  const getBattlefieldModelCountInput = useCallback((unitOrId) => {
    const unit = typeof unitOrId === 'string' ? battlefieldUnitMap[unitOrId] : unitOrId
    if (unit && !['attacker', 'defender'].includes(unit.id)) {
      return ''
    }
    return getBattlefieldSourceSide(unitOrId) === 'attacker' ? attackerModelCount : defenderModelCount
  }, [attackerModelCount, battlefieldUnitMap, defenderModelCount, getBattlefieldSourceSide])
  const selectedBattlefieldUnit = battlefieldUnitMap[selectedBattlefieldUnitId] || battlefieldUnits[0] || null
  const selectedBattlefieldUnitEmbarked = Boolean(selectedBattlefieldUnit && battlefieldEmbarkedUnits[selectedBattlefieldUnit.id])
  const selectedBattlefieldUnitMovedThisPhase = Boolean(selectedBattlefieldUnit && battlefieldMovedUnits[selectedBattlefieldUnit.id])
  const selectedBattlefieldUnitCanMoveThisPhase = canMoveOnBattlefield && !selectedBattlefieldUnitMovedThisPhase
  const selectedBattlefieldUnitReserveStatus = selectedBattlefieldUnit
    ? battlefieldReserveStatuses[selectedBattlefieldUnit.id] || 'deployed'
    : 'deployed'
  const selectedBattlefieldUnitOffBattlefield = selectedBattlefieldUnitReserveStatus !== 'deployed'
  const selectedBattlefieldPosition = selectedBattlefieldUnit
    ? battlefieldPositions[selectedBattlefieldUnit.id] || selectedBattlefieldUnit
    : null
  const enemyBattlefieldUnit = useMemo(() => {
    if (!selectedBattlefieldUnit || !selectedBattlefieldPosition) {
      return null
    }
    const selectedPosition = battlefieldPercentToInches(selectedBattlefieldPosition)
    return battlefieldUnits
      .filter((unit) => unit.side !== selectedBattlefieldUnit.side)
      .map((unit) => {
        const unitPosition = battlefieldPercentToInches(battlefieldPositions[unit.id] || unit)
        return {
          unit,
          distance: getDistanceInches(selectedPosition, unitPosition),
        }
      })
      .sort((left, right) => left.distance - right.distance)[0]?.unit || null
  }, [battlefieldPositions, battlefieldUnits, selectedBattlefieldPosition, selectedBattlefieldUnit])
  const selectedBattlefieldMoveStart = selectedBattlefieldUnit
    ? battlefieldMoveStarts[selectedBattlefieldUnit.id] || selectedBattlefieldPosition
    : null
  const selectedBattlefieldMoveType = selectedBattlefieldUnit
    ? battlefieldMoveTypes[selectedBattlefieldUnit.id] || 'normal'
    : 'normal'
  const selectedBattlefieldAdvanceRoll = selectedBattlefieldUnit
    ? battlefieldAdvanceRolls[selectedBattlefieldUnit.id] || 1
    : 1
  const selectedBattlefieldSurgeDistance = selectedBattlefieldUnit
    ? battlefieldSurgeDistances[selectedBattlefieldUnit.id] || 3
    : 3
  const selectedBattlefieldTakeToSkies = selectedBattlefieldUnit
    ? Boolean(battlefieldTakeToSkies[selectedBattlefieldUnit.id])
    : false
  const selectedBattlefieldChargeRoll = selectedBattlefieldUnit
    ? battlefieldChargeRolls[selectedBattlefieldUnit.id] ?? 2
    : 2
  const selectedBattlefieldFallBackMode = selectedBattlefieldUnit
    ? battlefieldFallBackModes[selectedBattlefieldUnit.id] || 'ordered_retreat'
    : 'ordered_retreat'
  const selectedBattlefieldBattleShocked = selectedBattlefieldUnit
    ? Boolean(battlefieldBattleShockedUnits[selectedBattlefieldUnit.id])
    : false
  const selectedBattlefieldWasEngagedAtStart = useMemo(() => {
    if (!selectedBattlefieldUnit || !enemyBattlefieldUnit || !selectedBattlefieldMoveStart) {
      return false
    }

    const selectedStart = battlefieldPercentToInches(selectedBattlefieldMoveStart)
    const enemyPosition = battlefieldPercentToInches(battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit)
    const baseGap = Math.max(
      0,
      getDistanceInches(selectedStart, enemyPosition)
        - (selectedBattlefieldUnit.baseInches / 2)
        - (enemyBattlefieldUnit.baseInches / 2),
    )
    return baseGap <= 2
  }, [
    battlefieldPositions,
    enemyBattlefieldUnit,
    selectedBattlefieldMoveStart,
    selectedBattlefieldUnit,
  ])
  const selectedBattlefieldMoveStatus = useMemo(() => {
    if (!selectedBattlefieldUnit || !selectedBattlefieldPosition || !selectedBattlefieldMoveStart) {
      return null
    }

    return validateBattlefieldModelMove({
      start: battlefieldPercentToInches(selectedBattlefieldMoveStart),
      end: battlefieldPercentToInches(selectedBattlefieldPosition),
      movingUnit: selectedBattlefieldUnit,
      enemyUnit: enemyBattlefieldUnit ? {
        ...enemyBattlefieldUnit,
        position: battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit,
      } : null,
      maximumDistance: selectedBattlefieldUnit.movementInches,
      moveType: selectedBattlefieldMoveType,
      advanceRoll: selectedBattlefieldAdvanceRoll,
      surgeDistance: selectedBattlefieldSurgeDistance,
      unitEngagedBefore: selectedBattlefieldWasEngagedAtStart,
      unitBattleShocked: selectedBattlefieldBattleShocked,
      fallBackMode: selectedBattlefieldFallBackMode,
      surgeTriggered: selectedBattlefieldMoveType === 'surge',
      surgeTargetUnit: enemyBattlefieldUnit ? {
        ...enemyBattlefieldUnit,
        position: battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit,
      } : null,
      takeToSkies: selectedBattlefieldTakeToSkies,
    })
  }, [
    battlefieldPositions,
    enemyBattlefieldUnit,
    selectedBattlefieldAdvanceRoll,
    selectedBattlefieldBattleShocked,
    selectedBattlefieldFallBackMode,
    selectedBattlefieldMoveStart,
    selectedBattlefieldPosition,
    selectedBattlefieldSurgeDistance,
    selectedBattlefieldTakeToSkies,
    selectedBattlefieldMoveType,
    selectedBattlefieldUnit,
    selectedBattlefieldWasEngagedAtStart,
  ])
  const selectedBattlefieldChargeStatus = useMemo(() => {
    if (!selectedBattlefieldUnit || !selectedBattlefieldPosition || !selectedBattlefieldMoveStart || !enemyBattlefieldUnit) {
      return null
    }

    return validateBattlefieldChargeMove({
      start: battlefieldPercentToInches(selectedBattlefieldMoveStart),
      end: battlefieldPercentToInches(selectedBattlefieldPosition),
      movingUnit: selectedBattlefieldUnit,
      targetUnit: {
        ...enemyBattlefieldUnit,
        position: battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit,
      },
      chargeRoll: selectedBattlefieldChargeRoll,
      unitEngagedBefore: selectedBattlefieldWasEngagedAtStart,
      advancedThisTurn: selectedBattlefieldMoveType === 'advance',
      fellBackThisTurn: selectedBattlefieldMoveType === 'fall_back',
    })
  }, [
    battlefieldPositions,
    enemyBattlefieldUnit,
    selectedBattlefieldChargeRoll,
    selectedBattlefieldMoveStart,
    selectedBattlefieldMoveType,
    selectedBattlefieldPosition,
    selectedBattlefieldUnit,
    selectedBattlefieldWasEngagedAtStart,
  ])
  const selectedBattlefieldUnitDetails = selectedBattlefieldUnit ? getBattlefieldUnitDetails(selectedBattlefieldUnit) : null
  const selectedBattlefieldModels = useMemo(() => {
    if (!selectedBattlefieldUnit || !selectedBattlefieldPosition) {
      return []
    }
    return getBattlefieldUnitModels(
      selectedBattlefieldUnit,
      selectedBattlefieldPosition,
      battlefieldModelOffsets[selectedBattlefieldUnit.id],
    )
  }, [battlefieldModelOffsets, selectedBattlefieldPosition, selectedBattlefieldUnit])
  const selectedBattlefieldModel = selectedBattlefieldModels.find((model) => model.id === selectedBattlefieldModelId)
    || selectedBattlefieldModels[0]
    || null
  const selectedBattlefieldModelStart = useMemo(() => {
    if (!selectedBattlefieldUnit || !selectedBattlefieldModel) {
      return null
    }
    const startCenter = battlefieldPercentToInches(
      battlefieldMoveStarts[selectedBattlefieldUnit.id] || selectedBattlefieldPosition || selectedBattlefieldUnit,
    )
    const startOffsets = getBattlefieldUnitModelOffsets(
      selectedBattlefieldUnit,
      battlefieldModelMoveStarts[selectedBattlefieldUnit.id],
    )
    const startOffset = startOffsets[selectedBattlefieldModel.id]
    if (!startOffset) {
      return null
    }
    return {
      ...selectedBattlefieldModel,
      x: startCenter.x + startOffset.x,
      y: startCenter.y + startOffset.y,
    }
  }, [
    battlefieldModelMoveStarts,
    battlefieldMoveStarts,
    selectedBattlefieldModel,
    selectedBattlefieldPosition,
    selectedBattlefieldUnit,
  ])
  const selectedBattlefieldModelPercent = selectedBattlefieldModel
    ? battlefieldInchesToPercent(selectedBattlefieldModel)
    : null
  const selectedBattlefieldModelStartPercent = selectedBattlefieldModelStart
    ? battlefieldInchesToPercent(selectedBattlefieldModelStart)
    : selectedBattlefieldModelPercent
  const selectedBattlefieldModelMoveLimit = selectedBattlefieldUnit
    ? getBattlefieldMoveDistanceLimit({
      unit: selectedBattlefieldUnit,
      moveType: selectedBattlefieldMoveType,
      advanceRoll: selectedBattlefieldAdvanceRoll,
      surgeDistance: selectedBattlefieldSurgeDistance,
      chargeRoll: selectedBattlefieldChargeRoll,
      takeToSkies: selectedBattlefieldTakeToSkies,
      charging: canChargeOnBattlefield,
    })
    : 0
  const selectedBattlefieldModelMoveDiameter = selectedBattlefieldUnit
    ? (selectedBattlefieldModelMoveLimit * 2) + selectedBattlefieldUnit.baseInches
    : 0
  const selectedBattlefieldModelCoherencyDiameter = selectedBattlefieldUnit
    ? 4 + (selectedBattlefieldUnit.baseInches * 2)
    : 0
  const selectedBattlefieldModelAllModelsCoherencyDiameter = selectedBattlefieldUnit
    ? 18 + (selectedBattlefieldUnit.baseInches * 2)
    : 0
  const enemyBattlefieldModels = useMemo(() => {
    if (!enemyBattlefieldUnit) {
      return []
    }
    return getBattlefieldUnitModels(
      enemyBattlefieldUnit,
      battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit,
      battlefieldModelOffsets[enemyBattlefieldUnit.id],
    )
  }, [battlefieldModelOffsets, battlefieldPositions, enemyBattlefieldUnit])
  const friendlyBattlefieldModels = useMemo(() => {
    if (!selectedBattlefieldUnit) {
      return []
    }
    return battlefieldUnits
      .filter((unit) => unit.side === selectedBattlefieldUnit.side && unit.id !== selectedBattlefieldUnit.id)
      .flatMap((unit) => (
        getBattlefieldUnitModels(
          unit,
          battlefieldPositions[unit.id] || unit,
          battlefieldModelOffsets[unit.id],
        )
      ))
  }, [battlefieldModelOffsets, battlefieldPositions, battlefieldUnits, selectedBattlefieldUnit])
  const battlefieldModelGroups = useMemo(() => (
    Object.fromEntries(battlefieldUnits.map((unit) => [
      unit.id,
      getBattlefieldUnitModels(unit, battlefieldPositions[unit.id] || unit, battlefieldModelOffsets[unit.id]),
    ]))
  ), [battlefieldModelOffsets, battlefieldPositions, battlefieldUnits])
  const selectedBattlefieldSetupStatus = useMemo(() => (
    validateBattlefieldUnitSetup(selectedBattlefieldModels, enemyBattlefieldModels, friendlyBattlefieldModels, {
      canOverlapFriendlyModels: unitCanOverlapFriendlyModels(selectedBattlefieldUnitDetails),
    })
  ), [enemyBattlefieldModels, friendlyBattlefieldModels, selectedBattlefieldModels, selectedBattlefieldUnitDetails])
  const selectedBattlefieldVisibility = useMemo(() => {
    if (!selectedBattlefieldModels.length || !enemyBattlefieldModels.length) {
      return null
    }
    return lineOfSightExists(selectedBattlefieldModels[0], enemyBattlefieldModels[0])
  }, [enemyBattlefieldModels, selectedBattlefieldModels])
  const battlefieldInEngagementRange = selectedBattlefieldSetupStatus.engagement.engaged
  const battlefieldClosestModelGapInches = useMemo(
    () => getMinimumModelGapInches(selectedBattlefieldModels, enemyBattlefieldModels),
    [enemyBattlefieldModels, selectedBattlefieldModels],
  )
  const selectedBattlefieldWeaponRanges = useMemo(() => (
    (selectedBattlefieldUnitDetails?.weapons || [])
      .map((weapon) => {
        const rangeInches = parseWeaponRangeInches(weapon.range)
        const hasHalfRangeRule = (
          getWeaponKeywordValue(weapon, 'Rapid Fire') > 0
          || getWeaponKeywordValue(weapon, 'Melta') > 0
        )
        return rangeInches ? {
          ...weapon,
          rangeInches,
          hasHalfRangeRule,
          halfRangeInches: rangeInches / 2,
          totalDiameterInches: (rangeInches * 2) + (selectedBattlefieldUnit?.baseInches || 0),
        } : null
      })
      .filter(Boolean)
  ), [selectedBattlefieldUnit, selectedBattlefieldUnitDetails])
  const selectedBattlefieldMeleeWeapons = useMemo(
    () => (selectedBattlefieldUnitDetails?.weapons || []).filter((weapon) => weapon.range === 'Melee'),
    [selectedBattlefieldUnitDetails],
  )
  const selectedBattlefieldSidearmWeapons = useMemo(
    () => (selectedBattlefieldUnitDetails?.weapons || []).filter(
      (weapon) => weapon.range !== 'Melee' && weaponHasCloseQuarters(weapon),
    ),
    [selectedBattlefieldUnitDetails],
  )
  const selectedBattlefieldIsMonsterVehicle = unitIsMonsterOrVehicle(selectedBattlefieldUnitDetails)
  const selectedBattlefieldMonsterVehicleRangedWeapons = useMemo(
    () => (selectedBattlefieldUnitDetails?.weapons || []).filter(
      (weapon) => weapon.range !== 'Melee' && !weaponHasCloseQuarters(weapon),
    ),
    [selectedBattlefieldUnitDetails],
  )
  const enemyBattlefieldUnitDetails = enemyBattlefieldUnit ? getBattlefieldUnitDetails(enemyBattlefieldUnit) : null
  const enemyBattlefieldIsMonsterVehicle = unitIsMonsterOrVehicle(enemyBattlefieldUnitDetails)
  const battlefieldTargetEngagedMonsterVehicle = battlefieldInEngagementRange && enemyBattlefieldIsMonsterVehicle
  const inRangeWeaponNames = useMemo(() => {
    if (battlefieldClosestModelGapInches === null || battlefieldInEngagementRange) {
      return []
    }
    return selectedBattlefieldWeaponRanges
      .filter((weapon) => battlefieldClosestModelGapInches <= weapon.rangeInches)
      .map((weapon) => formatWeaponName(weapon))
  }, [battlefieldClosestModelGapInches, battlefieldInEngagementRange, selectedBattlefieldWeaponRanges])
  const halfRangeWeaponNames = useMemo(() => {
    if (battlefieldClosestModelGapInches === null || battlefieldInEngagementRange) {
      return []
    }
    return selectedBattlefieldWeaponRanges
      .filter((weapon) => weapon.hasHalfRangeRule && battlefieldClosestModelGapInches <= weapon.halfRangeInches)
      .map((weapon) => formatWeaponName(weapon))
  }, [battlefieldClosestModelGapInches, battlefieldInEngagementRange, selectedBattlefieldWeaponRanges])
  const showBattlefieldRangeLine = !battlefieldInEngagementRange && inRangeWeaponNames.length > 0 && selectedBattlefieldUnit && enemyBattlefieldUnit
  const battlefieldCombatOptions = useMemo(() => (
    battlefieldUnits.flatMap((unit) => battlefieldUnits
      .filter((candidate) => candidate.side !== unit.side)
      .map((defender) => {
        const attackerDetails = getBattlefieldUnitDetails(unit)
        const attackerLeaderDetails = unit.sourceSide === 'attacker' ? attackerAttachedLeaderUnitDetails : null
        const defenderDetails = getBattlefieldUnitDetails(defender)
        const defenderPartOfAttachedUnit = defender.sourceSide === 'defender' && Boolean(attackerAttachedLeaderUnitDetails)
        if (!attackerDetails || !defenderDetails || !defender) {
          return null
        }

        const attackerModels = battlefieldModelGroups[unit.id] || []
        const defenderModels = battlefieldModelGroups[defender.id] || []
        const pairClosestGapInches = getMinimumModelGapInches(attackerModels, defenderModels)
        const pairInEngagementRange = pairClosestGapInches !== null && pairClosestGapInches <= 2 + 0.001
        const attackWeapons = getCombatWeaponOptions(attackerDetails, attackerLeaderDetails)

        const eligibleWeapons = attackWeapons.filter((weapon) => {
          if (activeGamePhase?.id === 'shooting' && weapon.range === 'Melee') {
            return false
          }
          if (activeGamePhase?.id === 'fight' && weapon.range !== 'Melee') {
            return false
          }

          if (pairInEngagementRange) {
            if (weapon.range === 'Melee') {
              if (unitHasKeyword(defenderDetails, 'aircraft') && !unitHasKeyword(attackerDetails, 'fly')) {
                return false
              }
              if (unitHasKeyword(attackerDetails, 'aircraft') && !unitHasKeyword(defenderDetails, 'fly')) {
                return false
              }
              return true
            }
            if (unitIsMonsterOrVehicle(attackerDetails)) {
              return weaponHasCloseQuarters(weapon) || !weaponHasRawKeyword(weapon, 'Blast')
            }
            return weaponHasCloseQuarters(weapon)
          }

          if (weapon.range === 'Melee') {
            return false
          }

          const loneOperativeRange = defenderPartOfAttachedUnit ? 0 : getLoneOperativeRange(defenderDetails)
          if (loneOperativeRange > 0 && (pairClosestGapInches === null || pairClosestGapInches > loneOperativeRange + 0.001)) {
            return false
          }

          const rangeInches = parseWeaponRangeInches(weapon.range)
          return rangeInches !== null && attackerModels.some((model) => (
            defenderModels.some((targetModel) => getModelHorizontalGapInches(model, targetModel) <= rangeInches + 0.001)
          ))
        })

        if (!eligibleWeapons.length) {
          return null
        }

        return {
          id: `${unit.id}::${defender.id}`,
          attackerId: unit.id,
          defenderId: defender.id,
          attackerFaction: unit.faction,
          attackerName: unit.datasheetName || unit.name,
          attackerDisplayName: unit.name,
          attackerDetails,
          defenderFaction: defender.faction,
          defenderName: defender.datasheetName || defender.name,
          defenderDisplayName: defender.name,
          defenderDetails,
          defenderLoneOperativeRange: defenderPartOfAttachedUnit ? 0 : getLoneOperativeRange(defenderDetails),
          eligibleWeapons,
          closestGapInches: pairClosestGapInches,
          inEngagementRange: pairInEngagementRange,
          targetEngagedMonsterVehicle: pairInEngagementRange && unitIsMonsterOrVehicle(defenderDetails),
        }
      })).filter(Boolean)
  ), [
    activeGamePhase?.id,
    attackerAttachedLeaderUnitDetails,
    battlefieldModelGroups,
    battlefieldUnits,
    getBattlefieldUnitDetails,
  ])
  const selectedBattlefieldCombatant = battlefieldCombatOptions.find(
    (option) => option.id === battlefieldCombatAttackerId,
  ) || battlefieldCombatOptions[0] || null
  const battlefieldCombatWeaponOptions = useMemo(
    () => selectedBattlefieldCombatant?.eligibleWeapons || [],
    [selectedBattlefieldCombatant],
  )
  const battlefieldWeaponSelectionLimited = Boolean(
    selectedBattlefieldCombatant
      && !unitIsMonsterOrVehicle(selectedBattlefieldCombatant.attackerDetails)
      && battlefieldCombatWeaponOptions.some((weapon) => weapon.range !== 'Melee'),
  )
  const selectedBattlefieldCombatWeapons = useMemo(
    () => battlefieldCombatWeaponOptions.filter((weapon) => battlefieldCombatWeaponNames.includes(weapon.name)),
    [battlefieldCombatWeaponNames, battlefieldCombatWeaponOptions],
  )
  const selectedBattlefieldCombatWeaponLabels = useMemo(
    () => selectedBattlefieldCombatWeapons.map((weapon) => formatWeaponName(weapon)),
    [selectedBattlefieldCombatWeapons],
  )
  const selectedBattlefieldCombatWeaponNames = useMemo(
    () => selectedBattlefieldCombatWeapons.map((weapon) => weapon.name),
    [selectedBattlefieldCombatWeapons],
  )
  const selectedBattlefieldCombatTargetId = selectedBattlefieldCombatant
    ? selectedBattlefieldCombatant.defenderId
    : ''
  const selectedBattlefieldCombatAttackerModels = useMemo(() => (
    selectedBattlefieldCombatant
      ? battlefieldModelGroups[selectedBattlefieldCombatant.attackerId] || []
      : []
  ), [battlefieldModelGroups, selectedBattlefieldCombatant])
  const selectedBattlefieldCombatTargetModels = useMemo(() => (
    selectedBattlefieldCombatTargetId
      ? battlefieldModelGroups[selectedBattlefieldCombatTargetId] || []
      : []
  ), [battlefieldModelGroups, selectedBattlefieldCombatTargetId])
  const battlefieldCombatWeaponModelCounts = useMemo(() => (
    Object.fromEntries(battlefieldCombatWeaponOptions.map((weapon) => [
      weapon.name,
      countModelsInRangeForWeapon(
        selectedBattlefieldCombatAttackerModels,
        selectedBattlefieldCombatTargetModels,
        weapon,
      ),
    ]))
  ), [
    battlefieldCombatWeaponOptions,
    selectedBattlefieldCombatAttackerModels,
    selectedBattlefieldCombatTargetModels,
  ])
  const selectedBattlefieldCombatClosestGapInches = useMemo(
    () => getMinimumModelGapInches(selectedBattlefieldCombatAttackerModels, selectedBattlefieldCombatTargetModels),
    [selectedBattlefieldCombatAttackerModels, selectedBattlefieldCombatTargetModels],
  )
  const selectedBattlefieldEligibleAttackerModelCount = selectedBattlefieldCombatWeapons.length
    ? Math.min(...selectedBattlefieldCombatWeapons.map((weapon) => battlefieldCombatWeaponModelCounts[weapon.name] ?? 0))
    : 0
  const battlefieldStartingWounds = useMemo(() => (
    Object.fromEntries(battlefieldUnits.map((unit) => [
      unit.id,
      getUnitStartingWounds(getBattlefieldUnitDetails(unit)),
    ]))
  ), [battlefieldUnits, getBattlefieldUnitDetails])
  const selectedBattlefieldDamageTargetId = selectedBattlefieldCombatant
    ? selectedBattlefieldCombatant.defenderId
    : enemyBattlefieldUnit?.id || battlefieldUnits.find((unit) => unit.id !== selectedBattlefieldUnit?.id)?.id || ''
  const selectedBattlefieldDamageTarget = battlefieldUnitMap[selectedBattlefieldDamageTargetId] || null
  const selectedBattlefieldDamageInput = battlefieldDamageInputs[selectedBattlefieldDamageTargetId] ?? '0'
  const selectedBattlefieldWoundsRemaining = battlefieldWoundsRemaining[selectedBattlefieldDamageTargetId]
    ?? battlefieldStartingWounds[selectedBattlefieldDamageTargetId]
    ?? 0
  const selectedBattlefieldStartingWounds = battlefieldStartingWounds[selectedBattlefieldDamageTargetId] ?? 0
  const selectedBattlefieldStrengthStatus = getUnitStrengthStatus(
    selectedBattlefieldUnitDetails,
    selectedBattlefieldUnit ? battlefieldWoundsRemaining[selectedBattlefieldUnit.id] ?? battlefieldStartingWounds[selectedBattlefieldUnit.id] : null,
  )
  const selectedBattlefieldDamageTargetDetails = getBattlefieldUnitDetails(selectedBattlefieldDamageTargetId)
  const selectedBattlefieldDamageTargetStrengthStatus = getUnitStrengthStatus(
    selectedBattlefieldDamageTargetDetails,
    selectedBattlefieldWoundsRemaining,
  )
  const pendingBattlefieldCasualtyUnit = battlefieldPendingCasualties
    ? battlefieldUnitMap[battlefieldPendingCasualties.unitId] || null
    : null
  const activeBattlefieldSide = gameActivePlayer === 'Player 1' ? 'attacker' : 'defender'
  const battlefieldStratagemDetachment = battlefieldStratagemSide === 'attacker'
    ? selectedAttackerDetachment
    : selectedDefenderDetachment
  const battlefieldStratagemOptions = useMemo(() => (
    [...CORE_STRATAGEMS, ...(battlefieldStratagemDetachment?.stratagems || [])].filter((stratagem) => {
      const turnTiming = stratagem.turn_timing || 'either'
      const turnMatches = turnTiming === 'either'
        || (turnTiming === 'your_turn' && battlefieldStratagemSide === activeBattlefieldSide)
        || (turnTiming === 'opponent_turn' && battlefieldStratagemSide !== activeBattlefieldSide)
      return turnMatches && stratagemMatchesPhase(stratagem, activeGamePhase?.id)
    })
  ), [activeBattlefieldSide, activeGamePhase?.id, battlefieldStratagemDetachment, battlefieldStratagemSide])
  const selectedBattlefieldStratagem = battlefieldStratagemOptions.find(
    (stratagem) => stratagem.name === battlefieldStratagemName,
  ) || battlefieldStratagemOptions[0] || null
  const battlefieldStratagemCost = selectedBattlefieldStratagem?.name === 'Heroic Intervention'
    && battlefieldHeroicInterventionMode === 'into_the_fray'
    ? Number(selectedBattlefieldStratagem.alternate_cp_cost ?? 2)
    : Number(selectedBattlefieldStratagem?.cp_cost ?? 1)
  const battlefieldStratagemPhaseKey = `${gameBattleRound}:${gameActivePlayer}:${activeGamePhase?.id}`
  const battlefieldStratagemTargetBattleShocked = Boolean(battlefieldBattleShockedUnits[battlefieldStratagemTargetId])
  const battlefieldStratagemViolations = [
    !selectedBattlefieldStratagem ? 'No stratagem is available for this timing.' : '',
    battlefieldCommandPoints[battlefieldStratagemSide] < battlefieldStratagemCost ? 'Not enough CP.' : '',
    battlefieldStratagemTargetBattleShocked ? 'Battle-shocked units cannot be targeted with stratagems.' : '',
    battlefieldUsedStratagems.some((entry) => (
      entry.phaseKey === battlefieldStratagemPhaseKey
      && entry.side === battlefieldStratagemSide
      && entry.name === selectedBattlefieldStratagem?.name
    )) ? 'This player has already used that stratagem in this phase.' : '',
    battlefieldUsedStratagems.some((entry) => (
      entry.phaseKey === battlefieldStratagemPhaseKey
      && entry.side === battlefieldStratagemSide
      && entry.targetId === battlefieldStratagemTargetId
    )) ? 'That unit has already been targeted by a stratagem in this phase.' : '',
    selectedBattlefieldStratagem?.once_per_battle && battlefieldUsedStratagems.some((entry) => (
      entry.side === battlefieldStratagemSide
      && entry.name === selectedBattlefieldStratagem?.name
    )) ? 'This stratagem can only be used once per battle.' : '',
    selectedBattlefieldStratagem?.unavailable_battle_rounds?.includes(gameBattleRound) ? 'This stratagem cannot be used during this battle round.' : '',
  ].filter(Boolean)
  const canUseBattlefieldStratagem = battlefieldStratagemViolations.length === 0
  const battlefieldActionOptions = DEFAULT_MISSION_ACTIONS
  const selectedBattlefieldAction = battlefieldActionOptions.find(
    (action) => action.name === battlefieldActionName,
  ) || battlefieldActionOptions[0] || null
  const battlefieldUnitDetailsMap = Object.fromEntries(battlefieldUnits.map((unit) => [
    unit.id,
    getBattlefieldUnitDetails(unit),
  ]))
  const selectedBattlefieldActionUnit = battlefieldUnitMap[battlefieldActionTargetId] || null
  const selectedBattlefieldActionUnitDetails = battlefieldUnitDetailsMap[battlefieldActionTargetId] || null
  const selectedBattlefieldActionEnemy = battlefieldUnits.find((unit) => (
    selectedBattlefieldActionUnit && unit.side !== selectedBattlefieldActionUnit.side
  )) || null
  const battlefieldActionTurnKey = `${gameBattleRound}:${gameActivePlayer}`
  const selectedBattlefieldActionOc = parseObjectiveControlValue(
    selectedBattlefieldActionUnitDetails?.stats?.objective_control,
  )
  const selectedBattlefieldActionEngaged = (() => {
    if (!selectedBattlefieldActionUnit || !selectedBattlefieldActionEnemy) {
      return false
    }
    const unitPosition = battlefieldPercentToInches(
      battlefieldPositions[selectedBattlefieldActionUnit.id] || selectedBattlefieldActionUnit,
    )
    const enemyPosition = battlefieldPercentToInches(
      battlefieldPositions[selectedBattlefieldActionEnemy.id] || selectedBattlefieldActionEnemy,
    )
    const gap = Math.max(
      0,
      Math.hypot(unitPosition.x - enemyPosition.x, unitPosition.y - enemyPosition.y)
        - (selectedBattlefieldActionUnit.baseInches / 2)
        - (selectedBattlefieldActionEnemy.baseInches / 2),
    )
    return gap <= 2 + 0.001
  })()
  const selectedBattlefieldActionIsTitanic = unitHasKeyword(selectedBattlefieldActionUnitDetails, 'titanic')
  const battlefieldActionViolations = [
    !selectedBattlefieldAction ? 'No action is available.' : '',
    !selectedBattlefieldActionUnit || !selectedBattlefieldActionUnitDetails || (battlefieldReserveStatuses[battlefieldActionTargetId] || 'deployed') !== 'deployed'
      ? 'That unit is not on the battlefield.'
      : '',
    unitHasKeyword(selectedBattlefieldActionUnitDetails, 'aircraft') ? 'Aircraft units cannot start actions.' : '',
    unitHasKeyword(selectedBattlefieldActionUnitDetails, 'fortification') ? 'Fortification units cannot start actions.' : '',
    battlefieldBattleShockedUnits[battlefieldActionTargetId] ? 'Battle-shocked units cannot start actions.' : '',
    selectedBattlefieldActionOc <= 0 ? 'Units with OC 0 or OC "-" cannot start actions.' : '',
    selectedBattlefieldActionEngaged && !selectedBattlefieldActionIsTitanic ? 'Engaged units cannot start actions unless they are Titanic.' : '',
    battlefieldMoveTypes[battlefieldActionTargetId] === 'advance' ? 'Units that made an Advance move this turn cannot start actions.' : '',
    battlefieldMoveTypes[battlefieldActionTargetId] === 'fall_back' ? 'Units that made a Fall Back move this turn cannot start actions.' : '',
    battlefieldActions.some((entry) => (
      entry.turnKey === battlefieldActionTurnKey
      && entry.targetId === battlefieldActionTargetId
    )) ? 'That unit has already started an action this turn.' : '',
  ].filter(Boolean)
  const canStartBattlefieldAction = battlefieldActionViolations.length === 0
  const battlefieldActionLedger = battlefieldActions.slice(0, 8)
  const selectedBattlefieldUnitPerformingAction = battlefieldActions.some((entry) => (
    entry.status === 'performing' && entry.targetId === selectedBattlefieldUnit?.id
  ))
  const selectedEmbarkUnit = battlefieldUnitMap[battlefieldEmbarkUnitId] || null
  const selectedTransportUnit = battlefieldUnitMap[battlefieldTransportId] || null
  const selectedEmbarkUnitDetails = battlefieldUnitDetailsMap[battlefieldEmbarkUnitId] || null
  const selectedTransportDetails = battlefieldUnitDetailsMap[battlefieldTransportId] || null
  const selectedEmbarkMoveType = battlefieldMoveTypes[battlefieldEmbarkUnitId] || 'normal'
  const selectedTransportMoveType = battlefieldMoveTypes[battlefieldTransportId] || 'normal'
  const selectedDisembarkMode = battlefieldDisembarkModes[battlefieldEmbarkUnitId] || 'tactical'
  const selectedTransportCapacity = Number(battlefieldTransportCapacities[battlefieldTransportId] || 0)
  const selectedTransportOccupiedCapacity = Object.entries(battlefieldEmbarkedUnits)
    .filter(([, transportId]) => transportId === battlefieldTransportId)
    .reduce((total, [unitId]) => total + (battlefieldUnitMap[unitId]?.modelCount || 1), 0)
  const selectedTransportRemainingCapacity = Math.max(0, selectedTransportCapacity - selectedTransportOccupiedCapacity)
  const selectedEmbarkUnitCapacityNeed = selectedEmbarkUnit?.modelCount || 1
  const selectedEmbarkGap = (() => {
    if (!selectedEmbarkUnit || !selectedTransportUnit) {
      return null
    }
    const unitPosition = battlefieldPercentToInches(battlefieldPositions[selectedEmbarkUnit.id] || selectedEmbarkUnit)
    const transportPosition = battlefieldPercentToInches(battlefieldPositions[selectedTransportUnit.id] || selectedTransportUnit)
    return Math.max(
      0,
      Math.hypot(unitPosition.x - transportPosition.x, unitPosition.y - transportPosition.y)
        - (selectedEmbarkUnit.baseInches / 2)
        - (selectedTransportUnit.baseInches / 2),
    )
  })()
  const selectedEmbarkUnitEmbarked = Boolean(battlefieldEmbarkedUnits[battlefieldEmbarkUnitId])
  const selectedTransportIsTransport = unitHasKeyword(selectedTransportDetails, 'transport') || selectedTransportCapacity > 0
  const battlefieldEmbarkViolations = [
    gameBattleRound < 1 ? 'Embarking is only available once the first battle round has started.' : '',
    !canMoveOnBattlefield ? 'Embarking is resolved from the Movement phase.' : '',
    !selectedEmbarkUnit || !selectedEmbarkUnitDetails ? 'Select a unit on the battlefield to embark.' : '',
    !selectedTransportUnit || !selectedTransportDetails ? 'Select a Transport on the battlefield.' : '',
    battlefieldEmbarkUnitId === battlefieldTransportId ? 'A unit cannot embark within itself.' : '',
    selectedEmbarkUnitEmbarked ? 'That unit is already embarked.' : '',
    !selectedTransportIsTransport ? 'The selected model is not marked as a Transport and has no capacity.' : '',
    selectedEmbarkGap !== null && selectedEmbarkGap > 3 + 0.001 ? 'Every model must be within 3" of the Transport.' : '',
    selectedEmbarkMoveType === 'remain_stationary' ? 'The unit must make a normal, Advance, or Fall Back move to embark.' : '',
    selectedTransportRemainingCapacity < selectedEmbarkUnitCapacityNeed ? 'That Transport does not have enough remaining capacity.' : '',
  ].filter(Boolean)
  const canEmbarkBattlefieldUnit = battlefieldEmbarkViolations.length === 0
  const battlefieldDisembarkDistance = selectedDisembarkMode === 'combat' ? 6 : 3
  const battlefieldDisembarkViolations = [
    !canMoveOnBattlefield ? 'Disembarking is resolved from the Movement phase.' : '',
    !selectedEmbarkUnitEmbarked ? 'That unit is not embarked within a Transport.' : '',
    selectedEmbarkUnitEmbarked && battlefieldEmbarkedUnits[battlefieldEmbarkUnitId] !== battlefieldTransportId
      ? 'Select the Transport this unit is embarked within.' : '',
    selectedDisembarkMode === 'rapid'
      && !['normal', 'ingress'].includes(selectedTransportMoveType)
      ? 'Rapid Disembark requires the Transport to have made a normal or ingress move this phase.' : '',
    selectedDisembarkMode === 'tactical'
      && !['remain_stationary', 'normal'].includes(selectedTransportMoveType)
      ? 'Tactical Disembark requires a stationary or not-yet-selected Transport.' : '',
  ].filter(Boolean)
  const canDisembarkBattlefieldUnit = battlefieldDisembarkViolations.length === 0
  const selectedReserveUnit = battlefieldUnitMap[battlefieldReserveUnitId] || null
  const selectedReserveUnitStatus = battlefieldReserveStatuses[battlefieldReserveUnitId] || 'deployed'
  const selectedReserveUnitEmbarked = Boolean(battlefieldEmbarkedUnits[battlefieldReserveUnitId])
  const selectedReserveIngressEdgeRaw = battlefieldIngressEdges[battlefieldReserveUnitId] || 'left'
  const selectedReserveHasDeepStrike = unitHasAbility(selectedReserveUnit, 'Deep Strike')
  const selectedReserveIngressEdge = selectedReserveIngressEdgeRaw === 'deep_strike' && !selectedReserveHasDeepStrike
    ? 'left'
    : selectedReserveIngressEdgeRaw
  const selectedReserveEnemyUnit = battlefieldUnits.find((unit) => unit.id !== battlefieldReserveUnitId) || null
  const selectedReserveEnemyOffBattlefield = selectedReserveEnemyUnit
    ? (battlefieldReserveStatuses[selectedReserveEnemyUnit.id] || 'deployed') !== 'deployed'
    : false
  const selectedReserveIngressPosition = (() => {
    if (!selectedReserveUnit) {
      return null
    }
    const marginX = ((selectedReserveUnit.baseInches / 2) / BATTLEFIELD_WIDTH_INCHES) * 100
    const marginY = ((selectedReserveUnit.baseInches / 2) / BATTLEFIELD_HEIGHT_INCHES) * 100
    const edgeOffsetX = (6 / BATTLEFIELD_WIDTH_INCHES) * 100
    const edgeOffsetY = (6 / BATTLEFIELD_HEIGHT_INCHES) * 100
    const candidates = {
      left: { x: Math.max(marginX, edgeOffsetX), y: 50 },
      right: { x: Math.min(100 - marginX, 100 - edgeOffsetX), y: 50 },
      top: { x: 50, y: Math.max(marginY, edgeOffsetY) },
      bottom: { x: 50, y: Math.min(100 - marginY, 100 - edgeOffsetY) },
    }
    if (selectedReserveIngressEdge === 'deep_strike' && selectedReserveHasDeepStrike) {
      const deepStrikeCandidates = [
        { x: 50, y: 50 },
        { x: 25, y: 25 },
        { x: 75, y: 25 },
        { x: 25, y: 75 },
        { x: 75, y: 75 },
        { x: 50, y: 25 },
        { x: 50, y: 75 },
      ].map((candidate) => ({
        x: clamp(candidate.x, marginX, 100 - marginX),
        y: clamp(candidate.y, marginY, 100 - marginY),
      }))
      if (!selectedReserveEnemyUnit || selectedReserveEnemyOffBattlefield) {
        return deepStrikeCandidates[0]
      }
      const enemyPosition = battlefieldPercentToInches(battlefieldPositions[selectedReserveEnemyUnit.id] || selectedReserveEnemyUnit)
      return deepStrikeCandidates
        .map((candidate) => {
          const candidatePosition = battlefieldPercentToInches(candidate)
          const gap = Math.max(
            0,
            Math.hypot(candidatePosition.x - enemyPosition.x, candidatePosition.y - enemyPosition.y)
              - (selectedReserveUnit.baseInches / 2)
              - (selectedReserveEnemyUnit.baseInches / 2),
          )
          return { candidate, gap }
        })
        .sort((a, b) => b.gap - a.gap)[0]?.candidate || deepStrikeCandidates[0]
    }
    return candidates[selectedReserveIngressEdge] || candidates.left
  })()
  const selectedReserveIngressGap = (() => {
    if (!selectedReserveUnit || !selectedReserveEnemyUnit || !selectedReserveIngressPosition || selectedReserveEnemyOffBattlefield) {
      return null
    }
    const reservePosition = battlefieldPercentToInches(selectedReserveIngressPosition)
    const enemyPosition = battlefieldPercentToInches(battlefieldPositions[selectedReserveEnemyUnit.id] || selectedReserveEnemyUnit)
    return Math.max(
      0,
      Math.hypot(reservePosition.x - enemyPosition.x, reservePosition.y - enemyPosition.y)
        - (selectedReserveUnit.baseInches / 2)
        - (selectedReserveEnemyUnit.baseInches / 2),
    )
  })()
  const battlefieldReserveWarnings = [
    gameBattleRound < 3 && selectedReserveUnitStatus === 'strategic' && selectedReserveIngressEdge !== 'deep_strike' ? 'Before the third battle round, do not set up wholly within your opponent\'s deployment zone.' : '',
    gameBattleRound >= 3 && selectedReserveUnitStatus === 'strategic' ? 'At the end of the third battle round, strategic reserves that have not made an Ingress move are destroyed unless an exception applies.' : '',
  ].filter(Boolean)
  const battlefieldIngressViolations = [
    !canMoveOnBattlefield ? 'Ingress moves are resolved from the Movement phase.' : '',
    !selectedReserveUnit ? 'Select a unit.' : '',
    selectedReserveUnitEmbarked ? 'Units embarked within a Transport use that Transport\'s reserve state.' : '',
    !['strategic', 'repositioned'].includes(selectedReserveUnitStatus) ? 'That unit is not in strategic reserves or repositioned reserves.' : '',
    gameBattleRound < 2 ? 'Strategic reserves can only arrive from the second battle round onwards.' : '',
    selectedReserveIngressGap !== null && selectedReserveIngressGap <= 8 + 0.001 ? 'Ingress must set up more than 8" horizontally from enemy units.' : '',
  ].filter(Boolean)
  const canIngressBattlefieldUnit = battlefieldIngressViolations.length === 0

  const readyToSimulate = attackerFaction && attackerUnit && weaponNames.length > 0 && defenderFaction && defenderUnit

  useEffect(() => {
    if (!canUseCover && targetHasCover) {
      setTargetHasCover(false)
    }
  }, [canUseCover, targetHasCover])

  useEffect(() => {
    const nextModule = activeTurnPhase?.available_actions?.[0] || ''
    setSelectedTurnModuleId((current) => (
      activeTurnPhase?.available_actions?.includes(current) ? current : nextModule
    ))
  }, [activeTurnPhase])

  useEffect(() => {
    const nextModule = activeGamePhase?.available_actions?.[0] || ''
    setSelectedGameModuleId((current) => (
      activeGamePhase?.available_actions?.includes(current) ? current : nextModule
    ))
    setGameStepDetailsExpanded(false)
  }, [activeGamePhase])

  useEffect(() => {
    if (activeGamePhase?.id === 'charge') {
      setBattlefieldChargeRolls({
        attacker: 2,
        defender: 2,
      })
    }
    if (activeGamePhase?.id === 'movement') {
      setBattlefieldMovedUnits({})
    }
  }, [activeGamePhase?.id, gameActivePlayer, gameBattleRound])

  useEffect(() => {
    if (!canUseHalfRange && inHalfRange) {
      setInHalfRange(false)
    }
  }, [canUseHalfRange, inHalfRange])

  useEffect(() => {
    if (!hasOathOfMoment && oathOfMomentActive) {
      setOathOfMomentActive(false)
    }
  }, [hasOathOfMoment, oathOfMomentActive])

  useEffect(() => {
    if (!attackerEnhancementOptions.some((item) => item.name === attackerEnhancementName)) {
      setAttackerEnhancementName('')
    }
  }, [attackerEnhancementOptions, attackerEnhancementName])

  useEffect(() => {
    if (!defenderEnhancementOptions.some((item) => item.name === defenderEnhancementName)) {
      setDefenderEnhancementName('')
    }
  }, [defenderEnhancementOptions, defenderEnhancementName])

  useEffect(() => {
    if (!canUseAttackerFireDiscipline && attackerFireDisciplineActive) {
      setAttackerFireDisciplineActive(false)
    }
  }, [canUseAttackerFireDiscipline, attackerFireDisciplineActive])

  useEffect(() => {
    if (!canUseAttackerMarkedForDestruction && attackerMarkedForDestructionActive) {
      setAttackerMarkedForDestructionActive(false)
    }
  }, [canUseAttackerMarkedForDestruction, attackerMarkedForDestructionActive])

  useEffect(() => {
    if (!canUseAttackerUnforgivenFury) {
      if (attackerUnforgivenFuryActive) {
        setAttackerUnforgivenFuryActive(false)
      }
      if (attackerUnforgivenFuryArmyBattleshocked) {
        setAttackerUnforgivenFuryArmyBattleshocked(false)
      }
    }
  }, [canUseAttackerUnforgivenFury, attackerUnforgivenFuryActive, attackerUnforgivenFuryArmyBattleshocked])

  useEffect(() => {
    if (!canUseAttackerUnbridledFerocity && attackerUnbridledFerocityActive) {
      setAttackerUnbridledFerocityActive(false)
    }
  }, [canUseAttackerUnbridledFerocity, attackerUnbridledFerocityActive])

  useEffect(() => {
    if (!canUseDefenderArmourOfContempt && defenderArmourOfContemptActive) {
      setDefenderArmourOfContemptActive(false)
    }
  }, [canUseDefenderArmourOfContempt, defenderArmourOfContemptActive])

  useEffect(() => {
    if (!canUseDefenderOverwhelmingOnslaught && defenderOverwhelmingOnslaughtActive) {
      setDefenderOverwhelmingOnslaughtActive(false)
    }
  }, [canUseDefenderOverwhelmingOnslaught, defenderOverwhelmingOnslaughtActive])

  useEffect(() => {
    if (!canUseDefenderUnbreakableLines && defenderUnbreakableLinesActive) {
      setDefenderUnbreakableLinesActive(false)
    }
  }, [canUseDefenderUnbreakableLines, defenderUnbreakableLinesActive])

  useEffect(() => {
    const active = attackerEnhancementName === 'Stubborn Tenacity'
    setAttackerStubbornTenacityActive(active)
    if (!active && attackerBelowStartingStrength) {
      setAttackerBelowStartingStrength(false)
    }
  }, [attackerEnhancementName, attackerBelowStartingStrength])

  useEffect(() => {
    const active = attackerEnhancementName === 'Weapons of the First Legion'
    setAttackerWeaponsOfTheFirstLegionActive(active)
  }, [attackerEnhancementName])

  useEffect(() => {
    const active = attackerEnhancementName === 'Pennant of Remembrance'
    setAttackerPennantOfRemembranceActive(active)
  }, [attackerEnhancementName])

  useEffect(() => {
    if (!canUseSagaCompleted && attackerSagaCompleted) {
      setAttackerSagaCompleted(false)
    }
  }, [canUseSagaCompleted, attackerSagaCompleted])

  useEffect(() => {
    if (!canUseAttackerWaaagh && attackerWaaaghActive) {
      setAttackerWaaaghActive(false)
    }
    if (!canUseDefenderWaaagh && defenderWaaaghActive) {
      setDefenderWaaaghActive(false)
    }
    if (!canUseAttackerPrey && attackerPreyActive) {
      setAttackerPreyActive(false)
    }
    if (!canUseTargetWithinNine && attackerTargetWithinNine) {
      setAttackerTargetWithinNine(false)
    }
    if (!canUseAttackerCountsAsTenPlus && attackerCountsAsTenPlusModels) {
      setAttackerCountsAsTenPlusModels(false)
    }
    if (!canUseDefenderCountsAsTenPlus && defenderCountsAsTenPlusModels) {
      setDefenderCountsAsTenPlusModels(false)
    }
    if (!canUseTargetBelowStartingStrength && targetBelowStartingStrength) {
      setTargetBelowStartingStrength(false)
    }
    if (!canUseTargetBelowHalfStrength && targetBelowHalfStrength) {
      setTargetBelowHalfStrength(false)
    }
    if (!canUseTryDatButton) {
      if (attackerTryDatButtonEffects.length) {
        setAttackerTryDatButtonEffects([])
      }
      if (attackerTryDatButtonHazardous) {
        setAttackerTryDatButtonHazardous(false)
      }
    }
    if (!canUseAttackerUnbridledCarnage && attackerUnbridledCarnageActive) {
      setAttackerUnbridledCarnageActive(false)
    }
    if (!canUseDefenderArdAsNails && defenderArdAsNailsActive) {
      setDefenderArdAsNailsActive(false)
    }
    if (!canUseAttackerDragItDown && attackerDragItDownActive) {
      setAttackerDragItDownActive(false)
    }
    if (!canUseDefenderStalkinTaktiks && defenderStalkinTaktiksActive) {
      setDefenderStalkinTaktiksActive(false)
    }
    if (!canUseDefenderSpeediestFreeks && defenderSpeediestFreeksActive) {
      setDefenderSpeediestFreeksActive(false)
    }
    if (!canUseAttackerBlitzaFire && attackerBlitzaFireActive) {
      setAttackerBlitzaFireActive(false)
    }
    if (!canUseAttackerDakkastorm && attackerDakkastormActive) {
      setAttackerDakkastormActive(false)
    }
    if (!canUseAttackerFullThrottle && attackerFullThrottleActive) {
      setAttackerFullThrottleActive(false)
    }
    if (!canUseAttackerKlankinKlaws) {
      if (attackerKlankinKlawsActive) {
        setAttackerKlankinKlawsActive(false)
      }
      if (attackerKlankinKlawsPushed) {
        setAttackerKlankinKlawsPushed(false)
      }
    } else if (!attackerKlankinKlawsActive && attackerKlankinKlawsPushed) {
      setAttackerKlankinKlawsPushed(false)
    }
    if (!canUseAttackerDakkaDakkaDakka) {
      if (attackerDakkaDakkaDakkaActive) {
        setAttackerDakkaDakkaDakkaActive(false)
      }
      if (attackerDakkaDakkaDakkaPushed) {
        setAttackerDakkaDakkaDakkaPushed(false)
      }
    } else if (!attackerDakkaDakkaDakkaActive && attackerDakkaDakkaDakkaPushed) {
      setAttackerDakkaDakkaDakkaPushed(false)
    }
    if (!canUseAttackerBiggerShells) {
      if (attackerBiggerShellsActive) {
        setAttackerBiggerShellsActive(false)
      }
      if (attackerBiggerShellsPushed) {
        setAttackerBiggerShellsPushed(false)
      }
    } else if (!attackerBiggerShellsActive && attackerBiggerShellsPushed) {
      setAttackerBiggerShellsPushed(false)
    }
    if (!canUseDefenderExtraGubbinz && defenderExtraGubbinzActive) {
      setDefenderExtraGubbinzActive(false)
    }
    if (!canUseAttackerCompetitiveStreak && attackerCompetitiveStreakActive) {
      setAttackerCompetitiveStreakActive(false)
    }
    if (!canUseAttackerArmedToDaTeef && attackerArmedToDaTeefActive) {
      setAttackerArmedToDaTeefActive(false)
    }
    if (!canUseDefenderHulkingBrutes && defenderHulkingBrutesActive) {
      setDefenderHulkingBrutesActive(false)
    }
  }, [
    attackerArmedToDaTeefActive,
    attackerBiggerShellsActive,
    attackerBiggerShellsPushed,
    attackerBlitzaFireActive,
    attackerCompetitiveStreakActive,
    attackerCountsAsTenPlusModels,
    attackerDakkastormActive,
    attackerDakkaDakkaDakkaActive,
    attackerDakkaDakkaDakkaPushed,
    attackerDragItDownActive,
    attackerFullThrottleActive,
    attackerKlankinKlawsActive,
    attackerKlankinKlawsPushed,
    attackerPreyActive,
    attackerTargetWithinNine,
    attackerTryDatButtonEffects,
    attackerTryDatButtonHazardous,
    attackerUnbridledCarnageActive,
    attackerWaaaghActive,
    canUseAttackerArmedToDaTeef,
    canUseAttackerBiggerShells,
    canUseAttackerBlitzaFire,
    canUseAttackerCompetitiveStreak,
    canUseAttackerCountsAsTenPlus,
    canUseAttackerDakkastorm,
    canUseAttackerDakkaDakkaDakka,
    canUseAttackerDragItDown,
    canUseAttackerFullThrottle,
    canUseAttackerKlankinKlaws,
    canUseAttackerPrey,
    canUseAttackerUnbridledCarnage,
    canUseAttackerWaaagh,
    canUseDefenderArdAsNails,
    canUseDefenderCountsAsTenPlus,
    canUseDefenderExtraGubbinz,
    canUseDefenderHulkingBrutes,
    canUseDefenderSpeediestFreeks,
    canUseDefenderStalkinTaktiks,
    canUseDefenderWaaagh,
    canUseTargetBelowHalfStrength,
    canUseTargetBelowStartingStrength,
    canUseTargetWithinNine,
    canUseTryDatButton,
    defenderArdAsNailsActive,
    defenderCountsAsTenPlusModels,
    defenderExtraGubbinzActive,
    defenderHulkingBrutesActive,
    defenderSpeediestFreeksActive,
    defenderStalkinTaktiksActive,
    defenderWaaaghActive,
    targetBelowHalfStrength,
    targetBelowStartingStrength,
  ])

  useEffect(() => {
    if (targetBelowHalfStrength && !targetBelowStartingStrength) {
      setTargetBelowStartingStrength(true)
    }
  }, [targetBelowHalfStrength, targetBelowStartingStrength])

  useEffect(() => {
    if (!canUseEldersGuidance && attackerEldersGuidanceActive) {
      setAttackerEldersGuidanceActive(false)
    }
  }, [canUseEldersGuidance, attackerEldersGuidanceActive])

  useEffect(() => {
    if (!canUseBoastAchieved && attackerBoastAchieved) {
      setAttackerBoastAchieved(false)
    }
  }, [canUseBoastAchieved, attackerBoastAchieved])

  useEffect(() => {
    if (!canUseHordeslayerOutnumbered && attackerHordeslayerOutnumbered) {
      setAttackerHordeslayerOutnumbered(false)
    }
  }, [canUseHordeslayerOutnumbered, attackerHordeslayerOutnumbered])

  useEffect(() => {
    if (!canUseHeroesAllRerollType && attackerHeroesAllRerollType) {
      setAttackerHeroesAllRerollType('')
    }
  }, [canUseHeroesAllRerollType, attackerHeroesAllRerollType])

  useEffect(() => {
    const active = defenderEnhancementName === 'Pennant of Remembrance'
    setDefenderPennantOfRemembranceActive(active)
  }, [defenderEnhancementName])

  useEffect(() => {
    setSimulationRuns([])
    setActiveRunView('summary')
  }, [
    attackerFaction,
    attackerUnit,
    resolvedAttackerLoadoutSelections,
    attackerModelCount,
    resolvedAttackerModelCounts,
    attackerAttachedLeaderName,
    resolvedAttackerAttachedLeaderLoadoutSelections,
    attackerAttachedLeaderModelCount,
    resolvedAttackerAttachedLeaderModelCounts,
    weaponNames,
    defenderFaction,
    defenderUnit,
    resolvedDefenderLoadoutSelections,
    defenderModelCount,
    resolvedDefenderModelCounts,
    attachedCharacterName,
    resolvedAttachedCharacterLoadoutSelections,
    attachedCharacterModelCount,
    resolvedAttachedCharacterModelCounts,
    attackerDetachmentName,
    defenderDetachmentName,
  ])

  useEffect(() => {
    const defaultPositions = {
      attacker: { x: 20, y: 50 },
      defender: { x: 80, y: 50 },
    }
    setBattlefieldBaseUnitDeployment({
      attacker: false,
      defender: false,
    })
    setBattlefieldPositions(defaultPositions)
    setBattlefieldExtraUnits([])
    setBattlefieldMoveStarts(defaultPositions)
    setBattlefieldModelOffsets({})
    setBattlefieldModelMoveStarts({})
    setBattlefieldRemovedModelIds({})
    setBattlefieldPendingCasualties(null)
    setBattlefieldMovedUnits({})
    setBattlefieldUndoStack([])
    setBattlefieldRotations({
      attacker: 0,
      defender: 0,
    })
    setBattlefieldChargeRolls({
      attacker: 2,
      defender: 2,
    })
    setBattlefieldChargedUnits({})
    setBattlefieldWoundsRemaining({
      attacker: getUnitStartingWounds(attackerUnitDetails),
      defender: getUnitStartingWounds(defenderUnitDetails),
    })
    setBattlefieldDamageInputs({
      attacker: '0',
      defender: '0',
    })
    setBattlefieldActions([])
    setBattlefieldTransportCapacities({
      attacker: getTransportCapacity(attackerUnitDetails),
      defender: getTransportCapacity(defenderUnitDetails),
    })
    setBattlefieldEmbarkedUnits({})
    setBattlefieldReserveStatuses({
      ...(unitHasKeyword(attackerUnitDetails, 'aircraft') ? { attacker: 'strategic' } : {}),
      ...(unitHasKeyword(defenderUnitDetails, 'aircraft') ? { defender: 'strategic' } : {}),
    })
  }, [attackerUnitDetails, defenderUnitDetails])

  useEffect(() => {
    if (!battlefieldUnitMap[selectedBattlefieldUnitId]) {
      setSelectedBattlefieldUnitId(battlefieldUnits[0]?.id || '')
    }
  }, [battlefieldUnitMap, battlefieldUnits, selectedBattlefieldUnitId])

  useEffect(() => {
    if (!selectedBattlefieldModels.length) {
      if (selectedBattlefieldModelId) {
        setSelectedBattlefieldModelId('')
      }
      return
    }
    if (!selectedBattlefieldModels.some((model) => model.id === selectedBattlefieldModelId)) {
      setSelectedBattlefieldModelId(selectedBattlefieldModels[0].id)
    }
  }, [selectedBattlefieldModelId, selectedBattlefieldModels])

  useEffect(() => {
    if (!battlefieldUnitMap[battlefieldActionTargetId]) {
      setBattlefieldActionTargetId(battlefieldUnits[0]?.id || '')
    }
  }, [battlefieldActionTargetId, battlefieldUnitMap, battlefieldUnits])

  useEffect(() => {
    if (!battlefieldUnitMap[battlefieldEmbarkUnitId]) {
      setBattlefieldEmbarkUnitId(battlefieldUnits[0]?.id || '')
    }
    if (!battlefieldUnitMap[battlefieldTransportId]) {
      setBattlefieldTransportId(battlefieldUnits.find((unit) => unit.id !== battlefieldEmbarkUnitId)?.id || battlefieldUnits[0]?.id || '')
    }
  }, [battlefieldEmbarkUnitId, battlefieldTransportId, battlefieldUnitMap, battlefieldUnits])

  useEffect(() => {
    if (!battlefieldUnitMap[battlefieldReserveUnitId]) {
      setBattlefieldReserveUnitId(battlefieldUnits[0]?.id || '')
    }
  }, [battlefieldReserveUnitId, battlefieldUnitMap, battlefieldUnits])

  useEffect(() => {
    if (!battlefieldActionOptions.some((action) => action.name === battlefieldActionName)) {
      setBattlefieldActionName(battlefieldActionOptions[0]?.name || '')
    }
  }, [battlefieldActionName, battlefieldActionOptions])

  useEffect(() => {
    if (!battlefieldCombatOptions.some((option) => option.id === battlefieldCombatAttackerId)) {
      setBattlefieldCombatAttackerId(battlefieldCombatOptions[0]?.id || '')
    }
  }, [battlefieldCombatAttackerId, battlefieldCombatOptions])

  useEffect(() => {
    if (!battlefieldStratagemOptions.some((stratagem) => stratagem.name === battlefieldStratagemName)) {
      setBattlefieldStratagemName(battlefieldStratagemOptions[0]?.name || '')
    }
  }, [battlefieldStratagemName, battlefieldStratagemOptions])

  useEffect(() => {
    if (!battlefieldCombatWeaponOptions.length) {
      if (battlefieldCombatWeaponNames.length) {
        setBattlefieldCombatWeaponNames([])
      }
      return
    }

    const weaponByName = new Map(battlefieldCombatWeaponOptions.map((weapon) => [weapon.name, weapon]))
    const validWeapons = battlefieldCombatWeaponNames
      .map((weaponName) => weaponByName.get(weaponName))
      .filter(Boolean)
    const limitedValidWeaponNames = []
    const selectedProfileGroups = new Set()
    for (const weapon of validWeapons) {
      if (battlefieldWeaponSelectionLimited && limitedValidWeaponNames.length > 0) {
        break
      }
      const profileGroupName = getWeaponProfileGroupName(weapon)
      if (selectedProfileGroups.has(profileGroupName)) {
        continue
      }
      selectedProfileGroups.add(profileGroupName)
      limitedValidWeaponNames.push(weapon.name)
    }
    if (
      limitedValidWeaponNames.length === battlefieldCombatWeaponNames.length
      && limitedValidWeaponNames.length > 0
      && limitedValidWeaponNames.every((weaponName, index) => weaponName === battlefieldCombatWeaponNames[index])
    ) {
      return
    }
    if (limitedValidWeaponNames.length > 0) {
      setBattlefieldCombatWeaponNames(limitedValidWeaponNames)
      return
    }
    setBattlefieldCombatWeaponNames([battlefieldCombatWeaponOptions[0].name])
  }, [battlefieldCombatWeaponNames, battlefieldCombatWeaponOptions, battlefieldWeaponSelectionLimited])

  useEffect(() => {
    if ((!draggingUnitId && !draggingModelId) || !canRepositionBattlefieldUnits) {
      if ((draggingUnitId || draggingModelId) && !canRepositionBattlefieldUnits) {
        setDraggingUnitId('')
        setDraggingModelId('')
      }
      return undefined
    }

    function getDragContext(unitId) {
      const unit = battlefieldUnitMap[unitId]
      const board = battlefieldBoardRef.current
      if (!unit || !board) {
        return null
      }
      const moveType = battlefieldMoveTypes[unitId] || 'normal'
      const advanceRoll = battlefieldAdvanceRolls[unitId] || 1
      const surgeDistance = battlefieldSurgeDistances[unitId] || 3
      const chargeRoll = battlefieldChargeRolls[unitId] ?? 2
      const takeToSkies = Boolean(battlefieldTakeToSkies[unitId])
      return {
        unit,
        board,
        moveType,
        advanceRoll,
        surgeDistance,
        chargeRoll,
        fallBackMode: battlefieldFallBackModes[unitId] || 'ordered_retreat',
        unitBattleShocked: Boolean(battlefieldBattleShockedUnits[unitId]),
        takeToSkies,
        movementLimit: getBattlefieldMoveDistanceLimit({
          unit,
          moveType,
          advanceRoll,
          surgeDistance,
          chargeRoll,
          takeToSkies,
          charging: canChargeOnBattlefield,
        }),
      }
    }

    function getPointerInches(board, clientX, clientY) {
      const rect = board.getBoundingClientRect()
      return clampModelInsideBattlefield({
        x: ((clientX - rect.left) / rect.width) * BATTLEFIELD_WIDTH_INCHES,
        y: ((clientY - rect.top) / rect.height) * BATTLEFIELD_HEIGHT_INCHES,
      }, 0)
    }

    function updateDraggedModelPosition(clientX, clientY) {
      if (!draggingModelId) {
        return
      }
      const unitId = draggingModelId.split('::')[0]
      const context = getDragContext(unitId)
      if (!context) {
        return
      }
      const { unit, board, movementLimit } = context
      const centerPercent = battlefieldPositions[unitId] || unit
      const center = battlefieldPercentToInches(centerPercent)
      const startCenterPercent = battlefieldMoveStarts[unitId] || unit
      const startCenter = battlefieldPercentToInches(startCenterPercent)
      const currentOffsets = getBattlefieldUnitModelOffsets(unit, battlefieldModelOffsets[unitId])
      const startOffsets = getBattlefieldUnitModelOffsets(unit, battlefieldModelMoveStarts[unitId])
      const startOffset = startOffsets[draggingModelId]
      if (!startOffset) {
        return
      }
      const startAbsolute = {
        x: startCenter.x + startOffset.x,
        y: startCenter.y + startOffset.y,
      }
      const desiredAbsolute = clampModelInsideBattlefield(getPointerInches(board, clientX, clientY), unit.baseInches)
      const nextAbsolute = clampModelInsideBattlefield(
        clampMoveToMaximumDistance(startAbsolute, desiredAbsolute, movementLimit),
        unit.baseInches,
      )
      const nextOffsets = {
        ...currentOffsets,
        [draggingModelId]: {
          x: nextAbsolute.x - center.x,
          y: nextAbsolute.y - center.y,
        },
      }
      const repairedOffsets = repairBattlefieldUnitCoherency({
        unit,
        centerPercent,
        startCenterPercent,
        currentOffsets: nextOffsets,
        startOffsets,
        anchorModelId: draggingModelId,
        movementLimit,
      })
      setBattlefieldModelOffsets((current) => ({
        ...current,
        [unitId]: repairedOffsets,
      }))
    }

    function updateDraggedUnitPosition(clientX, clientY) {
      setBattlefieldPositions((current) => {
        const context = getDragContext(draggingUnitId)
        if (!context) {
          return current
        }
        const {
          unit,
          board,
          moveType,
          advanceRoll,
          surgeDistance,
          chargeRoll,
          fallBackMode,
          unitBattleShocked,
          takeToSkies,
          movementLimit,
        } = context

        const rect = board.getBoundingClientRect()
        const currentOffsets = getBattlefieldUnitModelOffsets(unit, battlefieldModelOffsets[draggingUnitId])
        const baseRadius = unit.baseInches / 2
        const minOffsetX = Math.min(...Object.values(currentOffsets).map((offset) => offset.x))
        const maxOffsetX = Math.max(...Object.values(currentOffsets).map((offset) => offset.x))
        const minOffsetY = Math.min(...Object.values(currentOffsets).map((offset) => offset.y))
        const maxOffsetY = Math.max(...Object.values(currentOffsets).map((offset) => offset.y))
        const minCenterXPercent = ((baseRadius - minOffsetX) / BATTLEFIELD_WIDTH_INCHES) * 100
        const maxCenterXPercent = ((BATTLEFIELD_WIDTH_INCHES - baseRadius - maxOffsetX) / BATTLEFIELD_WIDTH_INCHES) * 100
        const minCenterYPercent = ((baseRadius - minOffsetY) / BATTLEFIELD_HEIGHT_INCHES) * 100
        const maxCenterYPercent = ((BATTLEFIELD_HEIGHT_INCHES - baseRadius - maxOffsetY) / BATTLEFIELD_HEIGHT_INCHES) * 100
        const xPercent = ((clientX - rect.left) / rect.width) * 100
        const yPercent = ((clientY - rect.top) / rect.height) * 100
        const startPercent = battlefieldMoveStarts[draggingUnitId] || current[draggingUnitId] || unit
        const startInches = battlefieldPercentToInches(startPercent)
        const edgeClampedPercent = {
          x: clamp(xPercent, minCenterXPercent, maxCenterXPercent),
          y: clamp(yPercent, minCenterYPercent, maxCenterYPercent),
        }
        const distanceClampedInches = clampMoveToMaximumDistance(
          startInches,
          battlefieldPercentToInches(edgeClampedPercent),
          movementLimit,
        )
        const nextPercent = battlefieldInchesToPercent(distanceClampedInches)
        const enemyUnit = battlefieldUnits.find((candidate) => candidate.id !== draggingUnitId)
        const enemyPosition = enemyUnit ? battlefieldPercentToInches(current[enemyUnit.id] || enemyUnit) : null
        const unitEngagedBefore = enemyUnit && enemyPosition
          ? Math.max(
            0,
            getDistanceInches(startInches, enemyPosition) - (unit.baseInches / 2) - (enemyUnit.baseInches / 2),
          ) <= 2
          : false
        const targetUnit = enemyUnit ? {
          ...enemyUnit,
          position: current[enemyUnit.id] || enemyUnit,
        } : null
        const validation = canChargeOnBattlefield
          ? validateBattlefieldChargeMove({
            start: startInches,
            end: distanceClampedInches,
            movingUnit: unit,
            targetUnit,
            chargeRoll,
            unitEngagedBefore,
            advancedThisTurn: moveType === 'advance',
            fellBackThisTurn: moveType === 'fall_back',
          })
          : validateBattlefieldModelMove({
            start: startInches,
            end: distanceClampedInches,
            movingUnit: unit,
            enemyUnit: targetUnit,
            maximumDistance: unit.movementInches,
            moveType,
            advanceRoll,
            surgeDistance,
            unitEngagedBefore,
            unitBattleShocked,
            fallBackMode,
            surgeTriggered: moveType === 'surge',
            surgeTargetUnit: targetUnit,
            takeToSkies,
          })

        if (!validation.valid) {
          return current
        }

        return {
          ...current,
          [draggingUnitId]: {
            x: nextPercent.x,
            y: nextPercent.y,
          },
        }
      })
    }

    function handlePointerMove(event) {
      if (draggingModelId) {
        updateDraggedModelPosition(event.clientX, event.clientY)
        return
      }
      updateDraggedUnitPosition(event.clientX, event.clientY)
    }

    function handlePointerUp() {
      setDraggingUnitId('')
      setDraggingModelId('')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [
    battlefieldAdvanceRolls,
    battlefieldBattleShockedUnits,
    battlefieldChargeRolls,
    battlefieldFallBackModes,
    battlefieldModelMoveStarts,
    battlefieldModelOffsets,
    battlefieldMoveStarts,
    battlefieldMoveTypes,
    battlefieldPositions,
    battlefieldSurgeDistances,
    battlefieldTakeToSkies,
    battlefieldUnitMap,
    battlefieldUnits,
    canChargeOnBattlefield,
    canRepositionBattlefieldUnits,
    draggingModelId,
    draggingUnitId,
  ])

  function cloneForUndo(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value)
    }
    return JSON.parse(JSON.stringify(value))
  }

  function createBattlefieldUndoSnapshot(label) {
    return {
      id: `${Date.now()}-${Math.random()}`,
      label,
      battlefieldPositions: cloneForUndo(battlefieldPositions),
      battlefieldMoveStarts: cloneForUndo(battlefieldMoveStarts),
      battlefieldModelOffsets: cloneForUndo(battlefieldModelOffsets),
      battlefieldModelMoveStarts: cloneForUndo(battlefieldModelMoveStarts),
      battlefieldRemovedModelIds: cloneForUndo(battlefieldRemovedModelIds),
      battlefieldPendingCasualties: cloneForUndo(battlefieldPendingCasualties),
      battlefieldRotations: cloneForUndo(battlefieldRotations),
      battlefieldMovedUnits: cloneForUndo(battlefieldMovedUnits),
      battlefieldChargeRolls: cloneForUndo(battlefieldChargeRolls),
      battlefieldChargedUnits: cloneForUndo(battlefieldChargedUnits),
      battlefieldWoundsRemaining: cloneForUndo(battlefieldWoundsRemaining),
      battlefieldDamageInputs: cloneForUndo(battlefieldDamageInputs),
      battlefieldActions: cloneForUndo(battlefieldActions),
      battlefieldEmbarkedUnits: cloneForUndo(battlefieldEmbarkedUnits),
      battlefieldReserveStatuses: cloneForUndo(battlefieldReserveStatuses),
      battlefieldBaseUnitDeployment: cloneForUndo(battlefieldBaseUnitDeployment),
      selectedBattlefieldUnitId,
      selectedBattlefieldModelId,
      simulationRuns: cloneForUndo(simulationRuns),
      activeRunView,
      gameLogEntries: cloneForUndo(gameLogEntries),
      battlefieldExtraUnits: cloneForUndo(battlefieldExtraUnits),
    }
  }

  function pushBattlefieldUndo(label) {
    const snapshot = createBattlefieldUndoSnapshot(label)
    setBattlefieldUndoStack((current) => [snapshot, ...current].slice(0, 20))
  }

  function undoLastBattlefieldStep() {
    const [snapshot, ...remainingSnapshots] = battlefieldUndoStack
    if (!snapshot) {
      return
    }
    setBattlefieldUndoStack(remainingSnapshots)
    setBattlefieldPositions(snapshot.battlefieldPositions)
    setBattlefieldMoveStarts(snapshot.battlefieldMoveStarts)
    setBattlefieldModelOffsets(snapshot.battlefieldModelOffsets)
    setBattlefieldModelMoveStarts(snapshot.battlefieldModelMoveStarts)
    setBattlefieldRemovedModelIds(snapshot.battlefieldRemovedModelIds)
    setBattlefieldPendingCasualties(snapshot.battlefieldPendingCasualties)
    setBattlefieldRotations(snapshot.battlefieldRotations)
    setBattlefieldMovedUnits(snapshot.battlefieldMovedUnits)
    setBattlefieldChargeRolls(snapshot.battlefieldChargeRolls)
    setBattlefieldChargedUnits(snapshot.battlefieldChargedUnits)
    setBattlefieldWoundsRemaining(snapshot.battlefieldWoundsRemaining)
    setBattlefieldDamageInputs(snapshot.battlefieldDamageInputs)
    setBattlefieldActions(snapshot.battlefieldActions)
    setBattlefieldEmbarkedUnits(snapshot.battlefieldEmbarkedUnits)
    setBattlefieldReserveStatuses(snapshot.battlefieldReserveStatuses)
    setBattlefieldBaseUnitDeployment(snapshot.battlefieldBaseUnitDeployment || { attacker: false, defender: false })
    setSelectedBattlefieldUnitId(snapshot.selectedBattlefieldUnitId)
    setSelectedBattlefieldModelId(snapshot.selectedBattlefieldModelId)
    setSimulationRuns(snapshot.simulationRuns)
    setActiveRunView(snapshot.activeRunView)
    setGameLogEntries(snapshot.gameLogEntries)
    setBattlefieldExtraUnits(snapshot.battlefieldExtraUnits || [])
    setDraggingUnitId('')
    setDraggingModelId('')
  }

  function removeBattlefieldModel(unitId, modelId) {
    pushBattlefieldUndo('Remove casualty')
    setBattlefieldRemovedModelIds((current) => {
      const removedIds = current[unitId] || []
      if (removedIds.includes(modelId)) {
        return current
      }
      return {
        ...current,
        [unitId]: [...removedIds, modelId],
      }
    })
    setBattlefieldPendingCasualties((current) => {
      if (!current || current.unitId !== unitId) {
        return current
      }
      const remainingCount = Math.max(0, Number(current.count || 0) - 1)
      return remainingCount > 0 ? { ...current, count: remainingCount } : null
    })
    if (selectedBattlefieldModelId === modelId) {
      setSelectedBattlefieldModelId('')
    }
  }

  function removeAllBattlefieldModels(unitId, { recordUndo = true } = {}) {
    const unit = battlefieldUnitMap[unitId]
    if (!unit) {
      return
    }
    if (recordUndo) {
      pushBattlefieldUndo('Remove unit')
    }
    const modelIds = (battlefieldModelGroups[unitId] || []).map((model) => model.id)
    setBattlefieldRemovedModelIds((current) => ({
      ...current,
      [unitId]: Array.from(new Set([...(current[unitId] || []), ...modelIds])),
    }))
    setBattlefieldPendingCasualties((current) => (current?.unitId === unitId ? null : current))
    if (selectedBattlefieldUnitId === unitId) {
      setSelectedBattlefieldModelId('')
    }
  }

  async function executeSimulation(payload, runsToExecute, simulationOptions = {}) {
    try {
      if (simulationOptions.battlefieldDamageTargetId) {
        pushBattlefieldUndo('Run battlefield simulation')
      }
      setSimulating(true)
      setError('')
      setSimulationRuns([])
      const seedBase = Date.now()
      const responses = await Promise.all(
        Array.from({ length: runsToExecute }, (_, index) => simulateCombat({
          ...payload,
          seed: seedBase + index,
        })),
      )
      const runs = responses.map((data, index) => ({
        ...data,
        runIndex: index + 1,
      }))
      setSimulationRuns(runs)
      setActiveRunView('summary')
      if (simulationOptions.battlefieldDamageTargetId) {
        const targetId = simulationOptions.battlefieldDamageTargetId
        const targetDetails = getBattlefieldUnitDetails(targetId)
        const targetSummary = runs[0]?.result?.target
        const remainingWounds = getSimulationTargetRemainingWounds(targetSummary, targetDetails)
        const startingWounds = battlefieldStartingWounds[targetId] ?? getUnitStartingWounds(targetDetails)
        const damageInflicted = Math.max(0, startingWounds - remainingWounds)
        setBattlefieldWoundsRemaining((current) => ({
          ...current,
          [targetId]: remainingWounds,
        }))
        setBattlefieldDamageInputs((current) => ({
          ...current,
          [targetId]: String(damageInflicted),
        }))
        const modelsRemaining = Math.max(0, Number(targetSummary?.models_remaining ?? targetDetails?.model_count ?? 1) || 0)
        const currentModels = battlefieldModelGroups[targetId] || []
        const currentModelCount = currentModels.length || battlefieldUnitMap[targetId]?.modelCount || Number(targetDetails?.model_count ?? 1) || 1
        const casualtyCount = Math.max(0, currentModelCount - modelsRemaining)
        if (modelsRemaining <= 0) {
          removeAllBattlefieldModels(targetId, { recordUndo: false })
        } else if (casualtyCount > 0 && currentModelCount > 1) {
          setBattlefieldPendingCasualties({
            unitId: targetId,
            count: casualtyCount,
          })
        }
      }
    } catch (requestError) {
      setError(formatError(requestError))
      setSimulationRuns([])
    } finally {
      setSimulating(false)
    }
  }

  async function handleSimulate(event) {
    event.preventDefault()
    if (!readyToSimulate) {
      return
    }

    const payload = buildSimulationPayload({
      attackerFaction,
      attackerUnit,
      attackerDetachmentName,
      defenderDetachmentName,
      attackerEnhancementName,
      defenderEnhancementName,
      attackerLoadoutSelections: resolvedAttackerLoadoutSelections,
      attackerModelCount,
      attackerModelCounts: resolvedAttackerModelCounts,
      attackerAttachedLeaderName,
      attackerAttachedLeaderLoadoutSelections: resolvedAttackerAttachedLeaderLoadoutSelections,
      attackerAttachedLeaderModelCount,
      attackerAttachedLeaderModelCounts: resolvedAttackerAttachedLeaderModelCounts,
      weaponNames,
      defenderFaction,
      defenderUnit,
      defenderLoadoutSelections: resolvedDefenderLoadoutSelections,
      defenderModelCount,
      defenderModelCounts: resolvedDefenderModelCounts,
      attachedCharacterLoadoutSelections: resolvedAttachedCharacterLoadoutSelections,
      attachedCharacterModelCount,
      attachedCharacterModelCounts: resolvedAttachedCharacterModelCounts,
      targetHasCover,
      attackerInEngagementRange,
      targetInEngagementRangeOfAllies,
      targetEngagedMonsterVehicle: targetInEngagementRangeOfAllies && unitIsMonsterOrVehicle(defenderUnitDetails),
      inHalfRange,
      oathOfMomentActive,
      chargedThisTurn,
      remainedStationary,
      indirectTargetVisible,
      plungingFireActive,
      attachedCharacterName,
      hazardousOverwatchChargePhase,
      hazardousBearerCurrentWounds,
      attackerFireDisciplineActive,
      attackerMarkedForDestructionActive,
      attackerUnforgivenFuryActive,
      attackerUnforgivenFuryArmyBattleshocked,
      attackerStubbornTenacityActive,
      attackerWeaponsOfTheFirstLegionActive,
      attackerPennantOfRemembranceActive,
      attackerBelowStartingStrength,
      attackerBattleshocked,
      attackerSagaCompleted,
      attackerEldersGuidanceActive,
      attackerBoastAchieved,
      attackerHordeslayerOutnumbered,
      attackerHeroesAllRerollType,
      attackerUnbridledFerocityActive,
      defenderArmourOfContemptActive,
      defenderOverwhelmingOnslaughtActive,
      defenderUnbreakableLinesActive,
      defenderPennantOfRemembranceActive,
      defenderBattleshocked,
    })
    await executeSimulation(payload, Math.max(1, Number(runCount) || 1))
  }

  async function handleBattlefieldSimulate() {
    if (
      !selectedBattlefieldCombatant
      || !selectedBattlefieldCombatWeapons.length
      || selectedBattlefieldEligibleAttackerModelCount <= 0
    ) {
      return
    }

    const battlefieldHalfRangeActive = selectedBattlefieldCombatClosestGapInches !== null
      && selectedBattlefieldCombatWeapons.some((weapon) => (
        weapon.range !== 'Melee'
        && (
          getWeaponKeywordValue(weapon, 'Rapid Fire') > 0
          || getWeaponKeywordValue(weapon, 'Melta') > 0
        )
        && selectedBattlefieldCombatClosestGapInches <= (parseWeaponRangeInches(weapon.range) || 0) / 2
      ))

    const battlefieldAttackerLoadoutSelections = getBattlefieldLoadoutSelections(selectedBattlefieldCombatant.attackerId)
    const battlefieldDefenderLoadoutSelections = getBattlefieldLoadoutSelections(selectedBattlefieldCombatant.defenderId)
    const battlefieldAttackerModelCounts = getBattlefieldModelCounts(selectedBattlefieldCombatant.attackerId)
    const battlefieldDefenderModelCounts = getBattlefieldModelCounts(selectedBattlefieldCombatant.defenderId)
    const battlefieldAttackerModelInput = getBattlefieldModelCountInput(selectedBattlefieldCombatant.attackerId)
    const battlefieldDefenderModelInput = getBattlefieldModelCountInput(selectedBattlefieldCombatant.defenderId)
    const battlefieldAttackerModelCount = battlefieldAttackerModelInput !== '' ? Number(battlefieldAttackerModelInput) : undefined
    const battlefieldDefenderModelCount = battlefieldDefenderModelInput !== '' ? Number(battlefieldDefenderModelInput) : undefined

    const battlefieldDamageTargetId = selectedBattlefieldCombatant.defenderId

    await executeSimulation({
      attacker_faction: selectedBattlefieldCombatant.attackerFaction,
      attacker_unit: selectedBattlefieldCombatant.attackerName,
      attacker_loadout: battlefieldAttackerLoadoutSelections,
      attacker_model_count: battlefieldAttackerModelCount,
      attacker_model_counts: battlefieldAttackerModelCounts,
      attacker_attached_character_name: getBattlefieldSourceSide(selectedBattlefieldCombatant.attackerId) === 'attacker'
        ? attackerAttachedLeaderName || undefined
        : undefined,
      attacker_attached_character_loadout: getBattlefieldSourceSide(selectedBattlefieldCombatant.attackerId) === 'attacker'
        ? resolvedAttackerAttachedLeaderLoadoutSelections
        : {},
      attacker_attached_character_model_count: getBattlefieldSourceSide(selectedBattlefieldCombatant.attackerId) === 'attacker' && attackerAttachedLeaderModelCount !== ''
        ? Number(attackerAttachedLeaderModelCount)
        : undefined,
      attacker_attached_character_model_counts: getBattlefieldSourceSide(selectedBattlefieldCombatant.attackerId) === 'attacker'
        ? resolvedAttackerAttachedLeaderModelCounts
        : {},
      weapon_names: selectedBattlefieldCombatWeaponNames,
      defender_faction: selectedBattlefieldCombatant.defenderFaction,
      defender_unit: selectedBattlefieldCombatant.defenderName,
      defender_loadout: battlefieldDefenderLoadoutSelections,
      defender_model_count: battlefieldDefenderModelCount,
      defender_model_counts: battlefieldDefenderModelCounts,
      attached_character_loadout: resolvedAttachedCharacterLoadoutSelections,
      attached_character_model_count: attachedCharacterModelCount !== '' ? Number(attachedCharacterModelCount) : undefined,
      attached_character_model_counts: resolvedAttachedCharacterModelCounts,
      options: {
        attacker_in_engagement_range: battlefieldInEngagementRange,
        target_in_engagement_range_of_allies: battlefieldInEngagementRange,
        target_engaged_monster_vehicle: Boolean(selectedBattlefieldCombatant.targetEngagedMonsterVehicle),
        in_half_range: battlefieldHalfRangeActive,
        attacker_eligible_model_count: selectedBattlefieldEligibleAttackerModelCount,
        defender_current_model_count: selectedBattlefieldCombatTargetModels.length,
        plunging_fire_active: plungingFireActive,
      },
    }, Math.max(1, Number(runCount) || 1), {
      battlefieldDamageTargetId,
    })
  }

  function useBattlefieldStratagem() {
    if (!canUseBattlefieldStratagem || !selectedBattlefieldStratagem) {
      return
    }

    const targetUnit = battlefieldUnitMap[battlefieldStratagemTargetId]
    setBattlefieldCommandPoints((current) => ({
      ...current,
      [battlefieldStratagemSide]: Math.max(0, Number(current[battlefieldStratagemSide] || 0) - battlefieldStratagemCost),
    }))
    setBattlefieldUsedStratagems((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        phaseKey: battlefieldStratagemPhaseKey,
        round: gameBattleRound,
        player: gameActivePlayer,
        phase: activeGamePhase?.name || 'Current Phase',
        side: battlefieldStratagemSide,
        name: selectedBattlefieldStratagem.name,
        targetId: battlefieldStratagemTargetId,
        targetName: targetUnit?.name || battlefieldStratagemTargetId,
        cpCost: battlefieldStratagemCost,
        source: getStratagemSource(selectedBattlefieldStratagem),
        mode: selectedBattlefieldStratagem.name === 'Heroic Intervention' ? battlefieldHeroicInterventionMode : null,
        effect: selectedBattlefieldStratagem.effect || '',
      },
      ...current,
    ].slice(0, 24))
    appendGameLog(`${battlefieldStratagemSide === 'attacker' ? 'Attacker' : 'Defender'} used ${selectedBattlefieldStratagem.name} on ${targetUnit?.name || 'a unit'} for ${battlefieldStratagemCost} CP.`)
  }

  function startBattlefieldAction() {
    if (!canStartBattlefieldAction || !selectedBattlefieldAction || !selectedBattlefieldActionUnit) {
      return
    }

    setBattlefieldActions((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        actionId: selectedBattlefieldAction.id,
        actionName: selectedBattlefieldAction.name,
        targetId: battlefieldActionTargetId,
        targetName: selectedBattlefieldActionUnit.name,
        status: 'performing',
        turnKey: battlefieldActionTurnKey,
        round: gameBattleRound,
        player: gameActivePlayer,
        startedPhase: activeGamePhase?.name || 'Current Phase',
        starts: selectedBattlefieldAction.starts,
        completes: selectedBattlefieldAction.completes,
        effect: selectedBattlefieldAction.effect,
      },
      ...current,
    ].slice(0, 24))
    appendGameLog(`${selectedBattlefieldActionUnit.name} started ${selectedBattlefieldAction.name}.`)
  }

  function updateBattlefieldActionStatus(actionId, status, reason = '') {
    setBattlefieldActions((current) => current.map((entry) => (
      entry.id === actionId
        ? {
          ...entry,
          status,
          completedPhase: status === 'completed' ? activeGamePhase?.name || 'Current Phase' : entry.completedPhase,
          failedReason: status === 'failed' ? reason : entry.failedReason,
        }
        : entry
    )))
  }

  function completeBattlefieldAction(action) {
    updateBattlefieldActionStatus(action.id, 'completed')
    appendGameLog(`${action.targetName} completed ${action.actionName}.`)
  }

  function failBattlefieldAction(action, reason) {
    updateBattlefieldActionStatus(action.id, 'failed', reason)
    appendGameLog(`${action.targetName} failed ${action.actionName}: ${reason}.`)
  }

  function failBattlefieldActionsForUnit(unitId, reason) {
    const performingActions = battlefieldActions.filter((entry) => (
      entry.targetId === unitId && entry.status === 'performing'
    ))
    if (!performingActions.length) {
      return
    }
    setBattlefieldActions((current) => current.map((entry) => (
      entry.targetId === unitId && entry.status === 'performing'
        ? { ...entry, status: 'failed', failedReason: reason }
        : entry
    )))
    performingActions.forEach((entry) => {
      appendGameLog(`${entry.targetName} failed ${entry.actionName}: ${reason}.`)
    })
  }

  function embarkBattlefieldUnit() {
    if (!canEmbarkBattlefieldUnit || !selectedEmbarkUnit || !selectedTransportUnit) {
      return
    }

    setBattlefieldEmbarkedUnits((current) => ({
      ...current,
      [selectedEmbarkUnit.id]: selectedTransportUnit.id,
    }))
    failBattlefieldActionsForUnit(selectedEmbarkUnit.id, 'unit embarked within a Transport')
    appendGameLog(`${selectedEmbarkUnit.name} embarked within ${selectedTransportUnit.name}.`)
  }

  function disembarkBattlefieldUnit() {
    if (!canDisembarkBattlefieldUnit || !selectedEmbarkUnit || !selectedTransportUnit) {
      return
    }

    const transportPosition = battlefieldPositions[selectedTransportUnit.id] || selectedTransportUnit
    const transportInches = battlefieldPercentToInches(transportPosition)
    const distance = (selectedTransportUnit.baseInches / 2) + battlefieldDisembarkDistance + (selectedEmbarkUnit.baseInches / 2)
    const disembarkPercent = battlefieldInchesToPercent({
      x: Math.min(BATTLEFIELD_WIDTH_INCHES - (selectedEmbarkUnit.baseInches / 2), transportInches.x + distance),
      y: transportInches.y,
    })
    const radiusXPercent = ((selectedEmbarkUnit.baseInches / 2) / BATTLEFIELD_WIDTH_INCHES) * 100
    const radiusYPercent = ((selectedEmbarkUnit.baseInches / 2) / BATTLEFIELD_HEIGHT_INCHES) * 100
    const nextPosition = {
      x: clamp(disembarkPercent.x, radiusXPercent, 100 - radiusXPercent),
      y: clamp(disembarkPercent.y, radiusYPercent, 100 - radiusYPercent),
    }

    setBattlefieldEmbarkedUnits((current) => {
      const next = { ...current }
      delete next[selectedEmbarkUnit.id]
      return next
    })
    setBattlefieldPositions((current) => ({
      ...current,
      [selectedEmbarkUnit.id]: nextPosition,
    }))
    setBattlefieldMoveStarts((current) => ({
      ...current,
      [selectedEmbarkUnit.id]: nextPosition,
    }))
    appendGameLog(`${selectedEmbarkUnit.name} made a ${selectedDisembarkMode} disembark move from ${selectedTransportUnit.name}.`)
  }

  function placeBattlefieldUnitInStrategicReserves(status = 'strategic') {
    if (!selectedReserveUnit || selectedReserveUnitEmbarked) {
      return
    }

    setBattlefieldReserveStatuses((current) => ({
      ...current,
      [selectedReserveUnit.id]: status,
    }))
    setDraggingUnitId('')
    failBattlefieldActionsForUnit(
      selectedReserveUnit.id,
      status === 'repositioned' ? 'unit was repositioned into strategic reserves' : 'unit was placed in strategic reserves',
    )
    appendGameLog(`${selectedReserveUnit.name} was placed in ${status === 'repositioned' ? 'repositioned reserves' : 'strategic reserves'}.`)
  }

  function ingressBattlefieldReserveUnit() {
    if (!canIngressBattlefieldUnit || !selectedReserveUnit || !selectedReserveIngressPosition) {
      return
    }

    setBattlefieldReserveStatuses((current) => ({
      ...current,
      [selectedReserveUnit.id]: 'deployed',
    }))
    setBattlefieldPositions((current) => ({
      ...current,
      [selectedReserveUnit.id]: selectedReserveIngressPosition,
    }))
    setBattlefieldMoveStarts((current) => ({
      ...current,
      [selectedReserveUnit.id]: selectedReserveIngressPosition,
    }))
    setBattlefieldMoveTypes((current) => ({
      ...current,
      [selectedReserveUnit.id]: 'ingress',
    }))
    appendGameLog(
      selectedReserveIngressEdge === 'deep_strike'
        ? `${selectedReserveUnit.name} made an Ingress move using Deep Strike.`
        : `${selectedReserveUnit.name} made an Ingress move from ${selectedReserveIngressEdge} battlefield edge.`,
    )
  }

  function handleBattlefieldUnitPointerDown(unitId) {
    return (event) => {
      event.preventDefault()
      if (battlefieldPendingCasualties?.unitId === unitId) {
        return
      }
      setSelectedBattlefieldUnitId(unitId)
      setSelectedBattlefieldModelId('')
      setDraggingModelId('')
      if (battlefieldEmbarkedUnits[unitId] || (battlefieldReserveStatuses[unitId] || 'deployed') !== 'deployed') {
        return
      }
      if (activeGamePhase?.id === 'movement' && battlefieldMovedUnits[unitId]) {
        return
      }
      if (!canRepositionBattlefieldUnits) {
        return
      }
      setDraggingUnitId(unitId)
    }
  }

  function handleBattlefieldModelPointerDown(unitId, modelId) {
    return (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (battlefieldPendingCasualties?.unitId === unitId) {
        removeBattlefieldModel(unitId, modelId)
        return
      }
      setSelectedBattlefieldUnitId(unitId)
      setSelectedBattlefieldModelId(modelId)
      setDraggingUnitId('')
      if (battlefieldEmbarkedUnits[unitId] || (battlefieldReserveStatuses[unitId] || 'deployed') !== 'deployed') {
        return
      }
      if (activeGamePhase?.id === 'movement' && battlefieldMovedUnits[unitId]) {
        return
      }
      if (!canRepositionBattlefieldUnits) {
        return
      }
      setDraggingModelId(modelId)
    }
  }

  function returnBattlefieldUnitToMoveStart(unit = selectedBattlefieldUnit) {
    if (!unit) {
      return
    }
    setDraggingUnitId('')
    setDraggingModelId('')
    setBattlefieldPositions((current) => ({
      ...current,
      [unit.id]: battlefieldMoveStarts[unit.id] || current[unit.id] || unit,
    }))
    setBattlefieldModelOffsets((current) => ({
      ...current,
      [unit.id]: battlefieldModelMoveStarts[unit.id] || getBattlefieldUnitModelOffsets(unit),
    }))
  }

  function addUnitToArmyList(unitDetails, faction) {
    if (!unitDetails?.name || !faction) {
      return
    }

    const entryId = `${faction}::${unitDetails.name}`
    setArmyListEntries((currentEntries) => {
      const existingEntry = currentEntries.find((entry) => entry.id === entryId)
      if (existingEntry) {
        setExpandedArmyListEntries((current) => ({ ...current, [entryId]: true }))
        return currentEntries.map((entry) => (
          entry.id === entryId
            ? {
                ...entry,
                count: entry.count + 1,
                unitDetails,
                stats: unitDetails.stats,
                keywords: unitDetails.keywords || [],
                loadoutSelections: entry.loadoutSelections || {},
                modelCount: entry.modelCount || '',
                modelCounts: entry.modelCounts || {},
              }
            : entry
        ))
      }

      setExpandedArmyListEntries((current) => ({ ...current, [entryId]: true }))
      return [
        ...currentEntries,
        {
          id: entryId,
          faction,
          name: unitDetails.name,
          count: 1,
          unitDetails,
          stats: unitDetails.stats,
          keywords: unitDetails.keywords || [],
          loadoutSelections: {},
          modelCount: '',
          modelCounts: {},
        },
      ]
    })
  }

  async function addSelectedUnitToArmyList() {
    if (!armyListFaction || !armyListUnitName) {
      return
    }

    try {
      const unitDetails = await fetchUnitDetailsWithLoadout(armyListFaction, armyListUnitName, {}, null, {})
      addUnitToArmyList(unitDetails, armyListFaction)
      setError('')
    } catch (requestError) {
      setError(formatError(requestError))
    }
  }

  function removeArmyListEntry(entryId) {
    setArmyListEntries((currentEntries) => currentEntries
      .filter((entry) => entry.id !== entryId)
      .map((entry) => ({
        ...entry,
        attachedLeaderEntryId: entry.attachedLeaderEntryId === entryId ? '' : entry.attachedLeaderEntryId,
        attachedSupportEntryId: entry.attachedSupportEntryId === entryId ? '' : entry.attachedSupportEntryId,
      })))
    setExpandedArmyListEntries((currentEntries) => {
      const nextEntries = { ...currentEntries }
      delete nextEntries[entryId]
      return nextEntries
    })
  }

  async function updateArmyListEntryConfiguration(entryId, changes) {
    const currentEntry = armyListEntries.find((entry) => entry.id === entryId)
    if (!currentEntry) {
      return
    }

    const nextLoadoutSelections = changes.loadoutSelections ?? currentEntry.loadoutSelections ?? {}
    const nextModelCount = changes.modelCount ?? currentEntry.modelCount ?? ''
    const nextModelCounts = changes.modelCounts ?? currentEntry.modelCounts ?? {}

    setArmyListEntries((currentEntries) => currentEntries.map((entry) => (
      entry.id === entryId
        ? {
            ...entry,
            ...changes,
            loadoutSelections: nextLoadoutSelections,
            modelCount: nextModelCount,
            modelCounts: nextModelCounts,
          }
        : entry
    )))

    try {
      const unitDetails = await fetchUnitDetailsWithLoadout(
        currentEntry.faction,
        currentEntry.name,
        nextLoadoutSelections,
        nextModelCount,
        nextModelCounts,
      )
      setArmyListEntries((currentEntries) => currentEntries.map((entry) => (
        entry.id === entryId
          ? {
              ...entry,
              unitDetails,
              stats: unitDetails.stats,
              keywords: unitDetails.keywords || [],
              loadoutSelections: nextLoadoutSelections,
              modelCount: nextModelCount,
              modelCounts: nextModelCounts,
            }
          : entry
      )))
      setError('')
    } catch (requestError) {
      setError(formatError(requestError))
    }
  }

  function getArmyListEntryUnitDetails(entryId) {
    return armyListEntries.find((entry) => entry.id === entryId)?.unitDetails || null
  }

  function getAttachedArmyListUnitDetails(entry, attachmentType) {
    if (attachmentType === 'leader') {
      return getArmyListEntryUnitDetails(entry.attachedLeaderEntryId)
    }
    return getArmyListEntryUnitDetails(entry.attachedSupportEntryId)
  }

  function getEligibleLeaderEntriesForArmyListEntry(entry) {
    const bodyguardName = entry?.name
    if (!bodyguardName) {
      return []
    }
    return armyListEntries.filter((candidate) => {
      if (candidate.id === entry.id) {
        return false
      }
      const canLead = candidate.unitDetails?.leader?.can_lead || []
      return canLead.includes(bodyguardName)
    })
  }

  function getEligibleSupportEntriesForArmyListEntry(entry) {
    const bodyguardName = entry?.name
    if (!bodyguardName) {
      return []
    }
    return armyListEntries.filter((candidate) => {
      if (candidate.id === entry.id || candidate.id === entry.attachedLeaderEntryId) {
        return false
      }
      const support = candidate.unitDetails?.support || {}
      const supportTargets = [
        ...(support.can_support || []),
        ...(support.can_join || []),
        ...(support.can_attach_to || []),
      ]
      return supportTargets.includes(bodyguardName)
    })
  }

  function updateArmyListEntryAttachment(entryId, attachmentKey, attachedEntryId) {
    const isLeaderAttachment = attachmentKey === 'attachedLeaderEntryId'
    const detailsFieldName = isLeaderAttachment ? 'attachedLeaderUnitDetails' : 'attachedSupportUnitDetails'
    const nameFieldName = isLeaderAttachment ? 'attachedLeaderUnitName' : 'attachedSupportUnitName'
    setArmyListEntries((currentEntries) => currentEntries.map((entry) => (
      entry.id === entryId
        ? {
            ...entry,
            [attachmentKey]: attachedEntryId,
            [detailsFieldName]: null,
            [nameFieldName]: '',
          }
        : entry
    )))
  }

  function getArmyListEntryBattlefieldDetails(entry) {
    const bodyguardDetails = entry?.unitDetails || entry
    if (!bodyguardDetails) {
      return null
    }

    const leaderDetails = getAttachedArmyListUnitDetails(entry, 'leader')
    const supportDetails = getAttachedArmyListUnitDetails(entry, 'support')
    const attachedDetails = [leaderDetails, supportDetails].filter(Boolean)
    const modelCount = [bodyguardDetails, ...attachedDetails].reduce(
      (total, unitDetails) => total + (Number(unitDetails?.model_count ?? unitDetails?.unit_composition?.min_models ?? 1) || 1),
      0,
    )
    const packageName = [
      bodyguardDetails.name,
      leaderDetails ? `+ ${leaderDetails.name}` : '',
      supportDetails ? `+ ${supportDetails.name}` : '',
    ].filter(Boolean).join(' ')

    return {
      ...bodyguardDetails,
      name: packageName,
      bodyguard_name: bodyguardDetails.name,
      model_count: modelCount,
      models: [
        ...(bodyguardDetails.models || []),
        ...attachedDetails.flatMap((unitDetails) => unitDetails.models || []),
      ],
      weapons: [
        ...(bodyguardDetails.weapons || []),
        ...attachedDetails.flatMap((unitDetails) => (
          (unitDetails.weapons || []).map((weapon) => ({
            ...weapon,
            name: `${unitDetails.name} - ${weapon.name}`,
          }))
        )),
      ],
      abilities: [
        ...(bodyguardDetails.abilities || []),
        ...attachedDetails.flatMap((unitDetails) => unitDetails.abilities || []),
      ],
      selectable_abilities: [
        ...(bodyguardDetails.selectable_abilities || []),
        ...attachedDetails.flatMap((unitDetails) => unitDetails.selectable_abilities || []),
      ],
      wargear_abilities: [
        ...(bodyguardDetails.wargear_abilities || []),
        ...attachedDetails.flatMap((unitDetails) => unitDetails.wargear_abilities || []),
      ],
      keywords: Array.from(new Set([
        ...(bodyguardDetails.keywords || []),
        ...attachedDetails.flatMap((unitDetails) => unitDetails.keywords || []),
      ])),
      faction_keywords: Array.from(new Set([
        ...(bodyguardDetails.faction_keywords || []),
        ...attachedDetails.flatMap((unitDetails) => unitDetails.faction_keywords || []),
      ])),
      attached_leader: leaderDetails,
      attached_support: supportDetails,
    }
  }

  function saveCurrentArmyList() {
    if (!armyListEntries.length) {
      return
    }

    const trimmedName = armyListName.trim()
    const listName = trimmedName || `Army List ${savedArmyLists.length + 1}`
    const existingList = savedArmyLists.find((list) => list.name.toLowerCase() === listName.toLowerCase())
    const listId = existingList?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const nextList = {
      id: listId,
      name: listName,
      updatedAt: new Date().toISOString(),
      entries: armyListEntries,
    }

    setSavedArmyLists((currentLists) => {
      const withoutExisting = currentLists.filter((list) => list.id !== listId)
      return [nextList, ...withoutExisting]
    })
    setSelectedSavedArmyListId(listId)
    setArmyListName(listName)
  }

  function normalizeSavedArmyListEntry(entry, index) {
    const inferredFaction = entry.faction || String(entry.id || '').split('::')[0] || ''
    const inferredName = entry.name || entry.unitDetails?.name || `Unit ${index + 1}`
    return {
      ...entry,
      id: entry.id || `${inferredFaction || 'saved'}::${inferredName}::${index}`,
      faction: inferredFaction,
      name: inferredName,
      count: Math.max(1, Number(entry.count || 1)),
      loadoutSelections: entry.loadoutSelections || {},
      modelCount: entry.modelCount || '',
      modelCounts: entry.modelCounts || {},
      attachedLeaderEntryId: entry.attachedLeaderEntryId || '',
      attachedSupportEntryId: entry.attachedSupportEntryId || '',
    }
  }

  async function hydrateSavedArmyListEntry(entry, index) {
    const normalizedEntry = normalizeSavedArmyListEntry(entry, index)
    if (!normalizedEntry.faction || !normalizedEntry.name) {
      return normalizedEntry
    }

    try {
      const unitDetails = await fetchUnitDetailsWithLoadout(
        normalizedEntry.faction,
        normalizedEntry.name,
        normalizedEntry.loadoutSelections,
        normalizedEntry.modelCount || null,
        normalizedEntry.modelCounts,
      )
      return {
        ...normalizedEntry,
        unitDetails,
        stats: unitDetails.stats,
        keywords: unitDetails.keywords || [],
      }
    } catch {
      return normalizedEntry
    }
  }

  async function loadSavedArmyList() {
    const selectedList = savedArmyLists.find((list) => list.id === selectedSavedArmyListId)
    if (!selectedList) {
      return
    }
    const hydratedEntries = await Promise.all((selectedList.entries || []).map(hydrateSavedArmyListEntry))
    setArmyListEntries(hydratedEntries)
    setArmyListName(selectedList.name || '')
  }

  function deleteSavedArmyList() {
    if (!selectedSavedArmyListId) {
      return
    }
    setSavedArmyLists((currentLists) => {
      const nextLists = currentLists.filter((list) => list.id !== selectedSavedArmyListId)
      setSelectedSavedArmyListId(nextLists[0]?.id || '')
      return nextLists
    })
  }

  function renderArmyWeaponProfile(weapon) {
    const skill = weapon?.skill_display || weapon?.skill?.value || weapon?.weapon_skill || weapon?.ballistic_skill || '-'
    const skillType = weapon?.skill_type || weapon?.skill?.type || (weapon?.range === 'Melee' ? 'WS' : 'BS')
    const ap = weapon?.ap_display || weapon?.armor_piercing || weapon?.ap || '0'
    const damage = weapon?.damage_display || weapon?.damage || '-'
    const keywords = weapon?.raw_keywords || weapon?.keywords || []
    const rangeValue = String(weapon?.range || '').toLowerCase() === 'melee'
      ? 'M'
      : formatRangeValue(weapon?.range || '-')

    return (
      <article key={`${weapon.name}-${weapon.range}-${weapon.attacks}`} className="army-list-detail-card weapon">
        <div className="army-list-detail-header">
          <h4>{formatWeaponBaseName(weapon.name)}</h4>
          {keywords.length ? <span>{keywords.map((keyword) => `[${keyword}]`).join(' ')}</span> : null}
        </div>
        <div className="army-list-weapon-stat-grid">
          {[
            ['R', rangeValue],
            ['A', weapon.attacks || '-'],
            [skillType, skill],
            ['S', weapon.strength || '-'],
            ['AP', ap],
            ['D', damage],
          ].map(([label, value]) => (
            <div key={label} className="stat-chip">
              <span className="stat-label">{label}</span>
              <strong className="stat-value">{String(value)}</strong>
            </div>
          ))}
        </div>
      </article>
    )
  }

  function renderArmyWeaponProfiles(unitDetails) {
    if (!unitDetails?.weapons?.length) {
      return null
    }

    return (
      <div className="army-list-weapon-section">
        <h4>Weapon Profiles</h4>
        <div className="army-list-weapon-grid">
          {unitDetails.weapons.map((weapon) => renderArmyWeaponProfile(weapon))}
        </div>
      </div>
    )
  }

  function renderArmyListInlineStats(stats) {
    if (!stats) {
      return null
    }

    return (
      <div className="army-list-inline-stats">
        {[
          ['movement', 'M', (value) => `${value}"`],
          ['toughness', 'T'],
          ['save', 'SV'],
          ['wounds', 'W'],
          ['leadership', 'LD'],
          ['objective_control', 'OC'],
        ].map(([key, label, formatValue]) => {
          const value = stats[key]
          if (value === undefined || value === null || value === '') {
            return null
          }
          const displayValue = formatValue ? formatValue(value) : String(value)
          return (
            <div key={key} className="army-list-inline-stat">
              <span>{label}</span>
              <strong>
                {displayValue}
                {key === 'save' && stats.invulnerable_save ? ` / ${formatInvulnerableSave(stats.invulnerable_save)}` : ''}
              </strong>
            </div>
          )
        })}
      </div>
    )
  }

  function renderArmyListEntryCustomization(entry) {
    const unitDetails = entry.unitDetails || entry
    const eligibleLeaderEntries = getEligibleLeaderEntriesForArmyListEntry(entry)
    const eligibleSupportEntries = getEligibleSupportEntriesForArmyListEntry(entry)
    const hasModelOptions = Boolean(unitDetails) && (
      unitUsesModelBreakdownSelectors(unitDetails)
      || getUnitModelCountBounds(unitDetails).maximumModels > getUnitModelCountBounds(unitDetails).minimumModels
    )
    const hasLoadoutOptions = Boolean(unitDetails?.loadout_options?.length)
    const hasAttachmentOptions = (
      eligibleLeaderEntries.length
      || eligibleSupportEntries.length
      || entry.attachedLeaderEntryId
      || entry.attachedSupportEntryId
    )

    if (!hasModelOptions && !hasLoadoutOptions && !hasAttachmentOptions) {
      return null
    }

    const setEntryModelCount = (nextValueOrUpdater) => {
      const currentValue = entry.modelCount || ''
      const nextValue = typeof nextValueOrUpdater === 'function'
        ? nextValueOrUpdater(currentValue)
        : nextValueOrUpdater
      updateArmyListEntryConfiguration(entry.id, { modelCount: nextValue })
    }
    const setEntryModelCounts = (nextValueOrUpdater) => {
      const currentValue = entry.modelCounts || {}
      const nextValue = typeof nextValueOrUpdater === 'function'
        ? nextValueOrUpdater(currentValue)
        : nextValueOrUpdater
      updateArmyListEntryConfiguration(entry.id, { modelCounts: nextValue })
    }
    const setEntryLoadoutSelections = (nextValueOrUpdater) => {
      const currentValue = entry.loadoutSelections || {}
      const nextValue = typeof nextValueOrUpdater === 'function'
        ? nextValueOrUpdater(currentValue)
        : nextValueOrUpdater
      updateArmyListEntryConfiguration(entry.id, { loadoutSelections: nextValue })
    }

    return (
      <div className="army-list-customization-panel">
        <h4>Customize Unit</h4>
        {eligibleLeaderEntries.length || entry.attachedLeaderEntryId ? (
          <label>
            <span>Add Leader</span>
            <select
              value={entry.attachedLeaderEntryId || ''}
              onChange={(event) => updateArmyListEntryAttachment(entry.id, 'attachedLeaderEntryId', event.target.value)}
            >
              <option value="">No Leader attached</option>
              {eligibleLeaderEntries.map((leaderEntry) => (
                <option key={leaderEntry.id} value={leaderEntry.id}>
                  {leaderEntry.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {eligibleSupportEntries.length || entry.attachedSupportEntryId ? (
          <label>
            <span>Add Support</span>
            <select
              value={entry.attachedSupportEntryId || ''}
              onChange={(event) => updateArmyListEntryAttachment(entry.id, 'attachedSupportEntryId', event.target.value)}
            >
              <option value="">No Support attached</option>
              {eligibleSupportEntries.map((supportEntry) => (
                <option key={supportEntry.id} value={supportEntry.id}>
                  {supportEntry.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {renderModelCountSelector(
          entry.name,
          unitDetails,
          entry.modelCount || '',
          setEntryModelCount,
          entry.modelCounts || {},
          setEntryModelCounts,
        )}
        {renderLoadoutSelectors(
          entry.name,
          unitDetails,
          entry.loadoutSelections || {},
          setEntryLoadoutSelections,
        )}
      </div>
    )
  }

  function renderArmyRuleList(title, rules) {
    const normalizedRules = (rules || []).filter(Boolean)
    if (!normalizedRules.length) {
      return null
    }

    return (
      <div className="army-list-detail-section">
        <h4>{title}</h4>
        <div className="army-list-rule-list">
          {normalizedRules.map((rule, index) => (
            <article key={`${title}-${rule.name || index}`} className="army-list-detail-card">
              <strong>{rule.name || 'Rule'}</strong>
              {rule.rules_text ? <p>{rule.rules_text}</p> : null}
              {rule.restrictions?.length ? <p>Restrictions: {rule.restrictions.join('; ')}</p> : null}
              {rule.options?.length ? (
                <div className="army-list-nested-rules">
                  {rule.options.map((option) => (
                    <p key={option.name}>
                      <strong>{option.name}:</strong> {option.rules_text}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderArmyListEntryDetails(entry) {
    const unitDetails = entry.unitDetails || entry
    const composition = unitDetails.unit_composition
    const keywords = [
      ...(unitDetails.faction_keywords || []),
      ...(unitDetails.keywords || entry.keywords || []),
    ]
    const leaderTargets = unitDetails.leader?.can_lead || []
    const supportTargets = unitDetails.support?.can_support || unitDetails.support?.can_join || []
    const loadoutOptions = unitDetails.loadout_options || unitDetails.wargear_options || []
    const attachedLeaderDetails = getAttachedArmyListUnitDetails(entry, 'leader')
    const attachedSupportDetails = getAttachedArmyListUnitDetails(entry, 'support')

    return (
      <div className="army-list-detail-grid">
        <div className="army-list-detail-section">
          <h4>Composition</h4>
          <div className="army-list-detail-card">
            {composition ? (
              <p>{composition.min_models} to {composition.max_models} model{Number(composition.max_models) === 1 ? '' : 's'} per unit.</p>
            ) : (
              <p>{unitDetails.model_count || 1} model{Number(unitDetails.model_count || 1) === 1 ? '' : 's'} per unit.</p>
            )}
            {unitDetails.models?.length ? (
              <div className="army-list-model-list">
                {unitDetails.models.map((model) => (
                  <p key={model.name}>
                    <strong>{model.name}</strong>
                    {model.count ? ` (${model.count.min}-${model.count.max})` : ''}
                    {model.default_wargear?.length ? `: ${model.default_wargear.join(', ')}` : ''}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {keywords.length ? (
          <div className="army-list-detail-section">
            <h4>Keywords</h4>
            <div className="army-list-keyword-list">
              {Array.from(new Set(keywords)).map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        ) : null}

        {(leaderTargets.length || supportTargets.length || unitDetails.leader?.rules_text || unitDetails.support?.rules_text || attachedLeaderDetails || attachedSupportDetails) ? (
          <div className="army-list-detail-section">
            <h4>Leader / Support</h4>
            <div className="army-list-detail-card">
              {attachedLeaderDetails ? <p><strong>Attached Leader:</strong> {attachedLeaderDetails.name}</p> : null}
              {attachedSupportDetails ? <p><strong>Attached Support:</strong> {attachedSupportDetails.name}</p> : null}
              {leaderTargets.length ? <p><strong>Can lead:</strong> {leaderTargets.join(', ')}</p> : null}
              {unitDetails.leader?.rules_text ? <p>{unitDetails.leader.rules_text}</p> : null}
              {supportTargets.length ? <p><strong>Can support:</strong> {supportTargets.join(', ')}</p> : null}
              {unitDetails.support?.rules_text ? <p>{unitDetails.support.rules_text}</p> : null}
              {!leaderTargets.length && !supportTargets.length && !unitDetails.leader?.rules_text && !unitDetails.support?.rules_text && !attachedLeaderDetails && !attachedSupportDetails ? <p>No leader/support role listed.</p> : null}
            </div>
          </div>
        ) : null}

        {renderArmyRuleList('Abilities', unitDetails.abilities)}
        {renderArmyRuleList('Selectable Abilities', unitDetails.selectable_abilities)}
        {renderArmyRuleList('Wargear Abilities', unitDetails.wargear_abilities)}

        {loadoutOptions.length ? (
          <div className="army-list-detail-section">
            <h4>Wargear / Loadout Options</h4>
            <div className="army-list-rule-list">
              {loadoutOptions.map((option, index) => (
                <article key={option.id || option.name || index} className="army-list-detail-card">
                  <strong>{option.label || option.name || 'Option'}</strong>
                  {option.description ? <p>{option.description}</p> : null}
                  {option.options?.length ? (
                    <p>{option.options.map((item) => formatLoadoutOptionLabel(item)).join('; ')}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    )
  }

  async function addBattlefieldUnitInstance(sourceSide) {
    const factionName = sourceSide === 'attacker' ? attackerFaction : defenderFaction
    const unitName = sourceSide === 'attacker' ? battlefieldAddAttackerUnitName : battlefieldAddDefenderUnitName
    if (!factionName || !unitName) {
      return
    }
    let unitDetails = null
    try {
      unitDetails = await fetchUnitDetailsWithLoadout(factionName, unitName, {}, null, {})
      setError('')
    } catch (requestError) {
      setError(formatError(requestError))
      return
    }

    pushBattlefieldUndo(`Add ${sourceSide} unit`)
    const sameDatasheetCount = battlefieldUnits.filter((unit) => (
      unit.sourceSide === sourceSide && unit.datasheetName === unitDetails.name
    )).length
    const id = `${sourceSide}-${Date.now()}`
    const instanceNumber = sameDatasheetCount + 1
    const position = findAvailableBattlefieldPosition(sourceSide, unitDetails)
    setBattlefieldExtraUnits((current) => [
      ...current,
      {
        id,
        sourceSide,
        side: sourceSide,
        role: sourceSide === 'attacker' ? 'Attacker' : 'Defender',
        unitName: unitDetails.name,
        unitDetails,
        x: position.x,
        y: position.y,
        instanceNumber,
      },
    ])
    initializeBattlefieldUnitState(id, unitDetails, position)
    setSelectedBattlefieldUnitId(id)
  }

  function deployBaseBattlefieldUnit(sourceSide) {
    const unitDetails = sourceSide === 'attacker' ? attackerUnitDetails : defenderUnitDetails
    if (!unitDetails || battlefieldBaseUnitDeployment[sourceSide]) {
      return
    }
    pushBattlefieldUndo(`Deploy ${sourceSide} unit`)
    const position = findAvailableBattlefieldPosition(sourceSide, unitDetails)
    setBattlefieldBaseUnitDeployment((current) => ({
      ...current,
      [sourceSide]: true,
    }))
    initializeBattlefieldUnitState(sourceSide, unitDetails, position)
    setSelectedBattlefieldUnitId(sourceSide)
  }

  function addBattlefieldArmyListEntryInstance(sourceSide) {
    const entryId = sourceSide === 'attacker'
      ? battlefieldAddAttackerArmyListEntryId
      : battlefieldAddDefenderArmyListEntryId
    const armyListEntry = armyListEntries.find((entry) => entry.id === entryId)
    const unitDetails = getArmyListEntryBattlefieldDetails(armyListEntry)
    if (!armyListEntry || !unitDetails) {
      return
    }

    pushBattlefieldUndo(`Deploy ${armyListEntry.name}`)
    const sameDatasheetCount = battlefieldUnits.filter((unit) => (
      unit.sourceSide === sourceSide && unit.datasheetName === armyListEntry.name
    )).length
    const id = `${sourceSide}-army-${Date.now()}`
    const instanceNumber = sameDatasheetCount + 1
    const position = findAvailableBattlefieldPosition(sourceSide, unitDetails)

    setBattlefieldExtraUnits((current) => [
      ...current,
      {
        id,
        sourceSide,
        side: sourceSide,
        role: sourceSide === 'attacker' ? 'Attacker' : 'Defender',
        unitName: armyListEntry.name,
        unitDetails,
        faction: armyListEntry.faction,
        armyListEntryId: armyListEntry.id,
        x: position.x,
        y: position.y,
        instanceNumber,
        attachedLeaderEntryId: armyListEntry.attachedLeaderEntryId || '',
        attachedSupportEntryId: armyListEntry.attachedSupportEntryId || '',
      },
    ])
    initializeBattlefieldUnitState(id, unitDetails, position)
    setSelectedBattlefieldUnitId(id)
  }

  function removeSelectedBattlefieldUnitInstance() {
    if (!selectedBattlefieldUnit) {
      return
    }
    pushBattlefieldUndo('Remove battlefield unit')
    const unitId = selectedBattlefieldUnit.id
    if (['attacker', 'defender'].includes(unitId)) {
      setBattlefieldBaseUnitDeployment((current) => ({
        ...current,
        [unitId]: false,
      }))
    } else {
      setBattlefieldExtraUnits((current) => current.filter((unit) => unit.id !== unitId))
    }
    removeBattlefieldUnitState(unitId)
    setBattlefieldPendingCasualties((current) => (current?.unitId === unitId ? null : current))
    setSelectedBattlefieldUnitId('')
    setSelectedBattlefieldModelId('')
  }

  function clearBattlefieldDeployment() {
    if (!battlefieldUnits.length) {
      return
    }
    pushBattlefieldUndo('Clear battlefield')
    setBattlefieldBaseUnitDeployment({ attacker: false, defender: false })
    setBattlefieldExtraUnits([])
    setBattlefieldPositions({})
    setBattlefieldMoveStarts({})
    setBattlefieldModelOffsets({})
    setBattlefieldModelMoveStarts({})
    setBattlefieldRemovedModelIds({})
    setBattlefieldPendingCasualties(null)
    setBattlefieldMovedUnits({})
    setBattlefieldChargedUnits({})
    setBattlefieldWoundsRemaining({})
    setBattlefieldDamageInputs({})
    setBattlefieldEmbarkedUnits({})
    setBattlefieldReserveStatuses({})
    setBattlefieldTransportCapacities({})
    setSelectedBattlefieldUnitId('')
    setSelectedBattlefieldModelId('')
  }

  function updateArmyListEntryCount(entryId, nextCount) {
    const normalizedCount = Math.max(1, Number(nextCount) || 1)
    setArmyListEntries((currentEntries) => currentEntries.map((entry) => (
      entry.id === entryId
        ? { ...entry, count: normalizedCount }
        : entry
    )))
  }

  function goToPreviousTurnPhase() {
    if (!canGoToPreviousTurnPhase) {
      return
    }
    setActiveTurnPhaseId(turnSequence[activeTurnPhaseIndex - 1].id)
  }

  function goToNextTurnPhase() {
    if (!canGoToNextTurnPhase) {
      return
    }
    setActiveTurnPhaseId(turnSequence[activeTurnPhaseIndex + 1].id)
  }

  function startNextPlayerTurn() {
    setActiveTurnPhaseId(turnSequence[0]?.id || DEFAULT_TURN_STRUCTURE[0].id)
    setActivePlayer((currentPlayer) => (currentPlayer === 'Player 1' ? 'Player 2' : 'Player 1'))
  }

  function advanceBattleRound() {
    setActiveTurnPhaseId(turnSequence[0]?.id || DEFAULT_TURN_STRUCTURE[0].id)
    setActivePlayer('Player 1')
    setBattleRound((currentRound) => currentRound + 1)
  }

  function appendGameLog(message) {
    setGameLogEntries((currentEntries) => [
      {
        id: `${Date.now()}-${currentEntries.length}`,
        round: gameBattleRound,
        player: gameActivePlayer,
        phase: activeGamePhase?.name || 'Unknown Phase',
        message,
      },
      ...currentEntries,
    ].slice(0, 20))
  }

  function getDefaultBattlefieldPosition(sourceSide) {
    return sourceSide === 'attacker' ? { x: 20, y: 50 } : { x: 80, y: 50 }
  }

  function getBattlefieldModelsForPositionCandidate(sourceSide, unitDetails, position, id = '__candidate__') {
    const baseMm = getBaseDiameterMm(unitDetails)
    const candidateUnit = {
      id,
      sourceSide,
      side: sourceSide,
      baseMm,
      baseInches: mmToInches(baseMm),
      startingModelCount: Number(unitDetails?.model_count ?? 1) || 1,
      modelCount: Number(unitDetails?.model_count ?? 1) || 1,
      removedModelIds: [],
    }
    return getBattlefieldUnitModels(candidateUnit, position, {})
  }

  function battlefieldModelsOverlap(models, otherModels) {
    return models.some((model) => otherModels.some((otherModel) => modelBasesOverlap(model, otherModel)))
  }

  function findAvailableBattlefieldPosition(sourceSide, unitDetails) {
    const sameSideUnits = battlefieldUnits.filter((unit) => unit.sourceSide === sourceSide)
    const sameSideModels = sameSideUnits.flatMap((unit) => (
      getBattlefieldUnitModels(
        unit,
        battlefieldPositions[unit.id] || unit,
        battlefieldModelOffsets[unit.id],
      )
    ))
    const canOverlap = unitCanOverlapFriendlyModels(unitDetails)
    const baseY = sourceSide === 'attacker' ? 62 : 38
    const xValues = sourceSide === 'attacker'
      ? [18, 26, 34, 42, 12, 50, 58, 66]
      : [82, 74, 66, 58, 88, 50, 42, 34]
    const yValues = sourceSide === 'attacker'
      ? [baseY, 74, 50, 86, 38, 26]
      : [baseY, 26, 50, 14, 62, 74]
    const candidates = yValues.flatMap((y) => xValues.map((x) => ({ x, y })))
    const fallback = getDefaultBattlefieldPosition(sourceSide)

    if (canOverlap || !sameSideModels.length) {
      return candidates[0] || fallback
    }

    return candidates.find((position) => {
      const candidateModels = getBattlefieldModelsForPositionCandidate(sourceSide, unitDetails, position)
      return candidateModels.every(modelIsWithinBattlefield) && !battlefieldModelsOverlap(candidateModels, sameSideModels)
    }) || fallback
  }

  function initializeBattlefieldUnitState(unitId, unitDetails, position) {
    setBattlefieldPositions((current) => ({ ...current, [unitId]: position }))
    setBattlefieldMoveStarts((current) => ({ ...current, [unitId]: position }))
    setBattlefieldModelOffsets((current) => {
      const { [unitId]: _removed, ...rest } = current
      return rest
    })
    setBattlefieldModelMoveStarts((current) => {
      const { [unitId]: _removed, ...rest } = current
      return rest
    })
    setBattlefieldRemovedModelIds((current) => {
      const { [unitId]: _removed, ...rest } = current
      return rest
    })
    setBattlefieldMoveTypes((current) => ({ ...current, [unitId]: 'normal' }))
    setBattlefieldAdvanceRolls((current) => ({ ...current, [unitId]: 1 }))
    setBattlefieldSurgeDistances((current) => ({ ...current, [unitId]: 3 }))
    setBattlefieldTakeToSkies((current) => ({ ...current, [unitId]: false }))
    setBattlefieldChargeRolls((current) => ({ ...current, [unitId]: 2 }))
    setBattlefieldFallBackModes((current) => ({ ...current, [unitId]: 'ordered_retreat' }))
    setBattlefieldBattleShockedUnits((current) => ({ ...current, [unitId]: false }))
    setBattlefieldWoundsRemaining((current) => ({ ...current, [unitId]: getUnitStartingWounds(unitDetails) }))
    setBattlefieldDamageInputs((current) => ({ ...current, [unitId]: '0' }))
    setBattlefieldTransportCapacities((current) => ({ ...current, [unitId]: getTransportCapacity(unitDetails) }))
    setBattlefieldEmbarkedUnits((current) => {
      const { [unitId]: _removed, ...rest } = current
      return rest
    })
    setBattlefieldReserveStatuses((current) => ({
      ...current,
      [unitId]: unitHasKeyword(unitDetails, 'aircraft') ? 'strategic' : 'deployed',
    }))
  }

  function removeBattlefieldUnitState(unitId) {
    const clearKey = (setter) => {
      setter((current) => {
        const { [unitId]: _removed, ...rest } = current
        return rest
      })
    }
    clearKey(setBattlefieldPositions)
    clearKey(setBattlefieldMoveStarts)
    clearKey(setBattlefieldModelOffsets)
    clearKey(setBattlefieldModelMoveStarts)
    clearKey(setBattlefieldRemovedModelIds)
    clearKey(setBattlefieldMovedUnits)
    clearKey(setBattlefieldAdvanceRolls)
    clearKey(setBattlefieldSurgeDistances)
    clearKey(setBattlefieldTakeToSkies)
    clearKey(setBattlefieldChargeRolls)
    clearKey(setBattlefieldChargedUnits)
    clearKey(setBattlefieldFallBackModes)
    clearKey(setBattlefieldBattleShockedUnits)
    clearKey(setBattlefieldWoundsRemaining)
    clearKey(setBattlefieldDamageInputs)
    clearKey(setBattlefieldEmbarkedUnits)
    clearKey(setBattlefieldReserveStatuses)
    clearKey(setBattlefieldTransportCapacities)
  }

  function commitBattlefieldPositionsAsMoveStarts(nextPositions = battlefieldPositions, options = {}) {
    const positionsToCommit = nextPositions?.nativeEvent ? battlefieldPositions : nextPositions
    const {
      markSelectedMoved = activeGamePhase?.id === 'movement',
    } = options
    setDraggingUnitId('')
    setDraggingModelId('')
    const committedMovementUnitId = markSelectedMoved ? selectedBattlefieldUnit?.id : ''
    if (activeGamePhase?.id !== 'fight') {
      Object.entries(positionsToCommit).forEach(([unitId, position]) => {
        const unit = battlefieldUnitMap[unitId]
        const start = battlefieldMoveStarts[unitId]
        if (!start || !unit) {
          return
        }
        const movedDistance = Math.hypot(
          Number(position.x || 0) - Number(start.x || 0),
          Number(position.y || 0) - Number(start.y || 0),
        )
        const currentModelOffsets = getBattlefieldUnitModelOffsets(unit, battlefieldModelOffsets[unitId])
        const startModelOffsets = getBattlefieldUnitModelOffsets(unit, battlefieldModelMoveStarts[unitId])
        const modelMoved = Object.entries(currentModelOffsets).some(([modelId, offset]) => {
          const startOffset = startModelOffsets[modelId]
          return startOffset && getDistanceInches(offset, startOffset) > 0.001
        })
        if (movedDistance > 0.001 || modelMoved) {
          failBattlefieldActionsForUnit(unitId, 'unit made a move before the action completed')
        }
      })
    }
    setBattlefieldMoveStarts(Object.fromEntries(
      Object.entries(positionsToCommit).map(([unitId, position]) => [
        unitId,
        { ...position },
      ]),
    ))
    setBattlefieldModelMoveStarts((current) => ({
      ...current,
      ...Object.fromEntries(battlefieldUnits.map((unit) => [
        unit.id,
        getBattlefieldUnitModelOffsets(unit, battlefieldModelOffsets[unit.id]),
      ])),
    }))
    if (committedMovementUnitId) {
      setBattlefieldMovedUnits((current) => ({
        ...current,
        [committedMovementUnitId]: true,
      }))
    }
  }

  function commitSelectedBattlefieldMove() {
    if (
      !selectedBattlefieldUnitCanMoveThisPhase
      || !selectedBattlefieldMoveStatus?.valid
      || !selectedBattlefieldSetupStatus.canSetUp
      || selectedBattlefieldUnitEmbarked
      || selectedBattlefieldUnitOffBattlefield
    ) {
      return
    }
    pushBattlefieldUndo('Commit move')
    commitBattlefieldPositionsAsMoveStarts(battlefieldPositions, { markSelectedMoved: true })
  }

  function commitSelectedBattlefieldCharge() {
    if (
      !selectedBattlefieldUnit
      || !enemyBattlefieldUnit
      || !selectedBattlefieldChargeStatus?.chargeCanReach
      || selectedBattlefieldSetupStatus.violations.includes('friendly_model_overlap')
      || selectedBattlefieldUnitPerformingAction
      || selectedBattlefieldUnitEmbarked
      || selectedBattlefieldUnitOffBattlefield
    ) {
      return
    }
    pushBattlefieldUndo('Commit charge')
    const nextPositions = { ...battlefieldPositions }

    if (!selectedBattlefieldChargeStatus.valid) {
      const start = battlefieldPercentToInches(selectedBattlefieldMoveStart || selectedBattlefieldPosition || selectedBattlefieldUnit)
      const target = battlefieldPercentToInches(battlefieldPositions[enemyBattlefieldUnit.id] || enemyBattlefieldUnit)
      const dx = Number(start.x) - Number(target.x)
      const dy = Number(start.y) - Number(target.y)
      const distance = Math.hypot(dx, dy) || 1
      const desiredCenterDistance = (selectedBattlefieldUnit.baseInches / 2) + (enemyBattlefieldUnit.baseInches / 2) + 1.9
      const autoEnd = {
        x: Number(target.x) + ((dx / distance) * desiredCenterDistance),
        y: Number(target.y) + ((dy / distance) * desiredCenterDistance),
      }
      const radiusXPercent = ((selectedBattlefieldUnit.baseInches / 2) / BATTLEFIELD_WIDTH_INCHES) * 100
      const radiusYPercent = ((selectedBattlefieldUnit.baseInches / 2) / BATTLEFIELD_HEIGHT_INCHES) * 100
      const autoEndPercent = battlefieldInchesToPercent(autoEnd)
      nextPositions[selectedBattlefieldUnit.id] = {
        x: clamp(autoEndPercent.x, radiusXPercent, 100 - radiusXPercent),
        y: clamp(autoEndPercent.y, radiusYPercent, 100 - radiusYPercent),
      }
      setBattlefieldPositions(nextPositions)
    }

    commitBattlefieldPositionsAsMoveStarts(nextPositions, { markSelectedMoved: false })
    setBattlefieldChargedUnits((current) => ({
      ...current,
      [selectedBattlefieldUnit.id]: true,
    }))
    if (selectedBattlefieldUnit.sourceSide === 'attacker') {
      setChargedThisTurn(true)
    }
  }

  function resolveCommandPhaseAutomation() {
    setBattlefieldCommandPoints((current) => ({
      attacker: Number(current.attacker || 0) + 1,
      defender: Number(current.defender || 0) + 1,
    }))

    appendGameLog('Command phase: both players gained 1 CP.')

    const activeSide = gameActivePlayer === 'Player 1' ? 'attacker' : 'defender'
    const activeUnits = battlefieldUnits.filter((unit) => unit.side === activeSide)
    if (!activeUnits.length) {
      appendGameLog('Command phase: no active battlefield unit was available for battle-shock checks.')
      return
    }

    let rollsMade = 0
    const battleShockUpdates = {}
    activeUnits.forEach((activeUnit) => {
      const activeUnitDetails = battlefieldUnitDetailsMap[activeUnit.id]
      const activeAttachedDetails = activeUnit.sourceSide === 'attacker' ? attackerAttachedLeaderUnitDetails : null
      if (!activeUnitDetails) {
        return
      }

      const woundsRemaining = battlefieldWoundsRemaining[activeUnit.id] ?? battlefieldStartingWounds[activeUnit.id]
      const strengthStatus = getUnitStrengthStatus(activeUnitDetails, woundsRemaining)
      const startedBattleShocked = Boolean(battlefieldBattleShockedUnits[activeUnit.id])
      const requiresBattleShock = startedBattleShocked || strengthStatus.atHalfStrength

      if (!requiresBattleShock) {
        appendGameLog(`${activeUnit.name} does not require a battle-shock roll.`)
        return
      }

      rollsMade += 1
      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]
      const total = dice[0] + dice[1]
      const leadershipValues = getUnitLeadershipValues(activeUnitDetails, activeAttachedDetails)
      const succeeded = leadershipValues.some((leadership) => total >= leadership)

      battleShockUpdates[activeUnit.id] = !succeeded

      if (!succeeded) {
        failBattlefieldActionsForUnit(activeUnit.id, 'unit became battle-shocked in the Command phase')
      }

      appendGameLog(
        `${activeUnit.name} made a battle-shock roll: ${dice[0]} + ${dice[1]} = ${total} vs Ld ${leadershipValues.join('/')}; ${succeeded ? 'passed and is not battle-shocked' : 'failed and is battle-shocked'}.`,
      )
    })

    if (Object.keys(battleShockUpdates).length) {
      setBattlefieldBattleShockedUnits((current) => ({
        ...current,
        ...battleShockUpdates,
      }))
    }
    if (!rollsMade) {
      appendGameLog('Command phase: no active units required battle-shock rolls.')
    }
  }

  function completeCurrentGameStep() {
    if (!activeGamePhase) {
      return
    }

    if (activeGamePhase.id === 'movement') {
      commitBattlefieldPositionsAsMoveStarts(battlefieldPositions, { markSelectedMoved: false })
    }
    if (activeGamePhase.id === 'command' && !gameCurrentStepComplete) {
      resolveCommandPhaseAutomation()
    }
    if (activeGamePhase.id === 'charge') {
      commitSelectedBattlefieldCharge()
    }

    if (!gameCurrentStepComplete) {
      setCompletedGameStepKeys((currentKeys) => ({
        ...currentKeys,
        [activeGameStepKey]: true,
      }))
      appendGameLog(`Completed ${activeGamePhase.name}.`)
    }

    if (activeGamePhaseIndex < turnSequence.length - 1) {
      setActiveGamePhaseId(turnSequence[activeGamePhaseIndex + 1].id)
      return
    }

    const nextPlayer = gameActivePlayer === 'Player 1' ? 'Player 2' : 'Player 1'
    if (gameActivePlayer === 'Player 1') {
      setGameActivePlayer(nextPlayer)
      setActiveGamePhaseId(turnSequence[0]?.id || DEFAULT_TURN_STRUCTURE[0].id)
      return
    }

    setGameActivePlayer('Player 1')
    setGameBattleRound((currentRound) => currentRound + 1)
    setActiveGamePhaseId(turnSequence[0]?.id || DEFAULT_TURN_STRUCTURE[0].id)
  }

  function goToPreviousGameStep() {
    if (!gameCanGoBack) {
      return
    }
    setActiveGamePhaseId(turnSequence[activeGamePhaseIndex - 1].id)
  }

  function resetGuidedGame() {
    setGameBattleRound(1)
    setGameActivePlayer('Player 1')
    setActiveGamePhaseId(turnSequence[0]?.id || DEFAULT_TURN_STRUCTURE[0].id)
    setCompletedGameStepKeys({})
    setGameLogEntries([])
    setGameNotes('')
    setBattlefieldCommandPoints({ attacker: 0, defender: 0 })
    setBattlefieldUsedStratagems([])
    setBattlefieldActions([])
    setBattlefieldUndoStack([])
  }

  function jumpToFreeFormCombat() {
    if (activeGamePhase?.id === 'charge') {
      setChargedThisTurn(true)
    }
    if (activeGamePhase?.id === 'fight') {
      setAttackerInEngagementRange(true)
      setChargedThisTurn(true)
    }
    if (activeGamePhase?.id === 'shooting') {
      setAttackerInEngagementRange(false)
    }
    setActivePage('combat')
  }

  function resetOptions() {
    setTargetHasCover(initialOptions.target_has_cover)
    setAttackerInEngagementRange(initialOptions.attacker_in_engagement_range)
    setTargetInEngagementRangeOfAllies(initialOptions.target_in_engagement_range_of_allies)
    setInHalfRange(initialOptions.in_half_range)
    setOathOfMomentActive(initialOptions.oath_of_moment_active)
    setChargedThisTurn(initialOptions.charged_this_turn)
    setRemainedStationary(initialOptions.remained_stationary)
    setIndirectTargetVisible(initialOptions.indirect_target_visible)
    setPlungingFireActive(initialOptions.plunging_fire_active)
    setAttachedCharacterName(initialOptions.attached_character_name)
    setHazardousOverwatchChargePhase(initialOptions.hazardous_overwatch_charge_phase)
    setHazardousBearerCurrentWounds(initialOptions.hazardous_bearer_current_wounds)
    setAttackerFireDisciplineActive(initialOptions.attacker_fire_discipline_active)
    setAttackerMarkedForDestructionActive(initialOptions.attacker_marked_for_destruction_active)
    setAttackerUnforgivenFuryActive(initialOptions.attacker_unforgiven_fury_active)
    setAttackerUnforgivenFuryArmyBattleshocked(initialOptions.attacker_unforgiven_fury_army_battleshocked)
    setAttackerStubbornTenacityActive(initialOptions.attacker_stubborn_tenacity_active)
    setAttackerWeaponsOfTheFirstLegionActive(initialOptions.attacker_weapons_of_the_first_legion_active)
    setAttackerPennantOfRemembranceActive(initialOptions.attacker_pennant_of_remembrance_active)
    setAttackerBelowStartingStrength(initialOptions.attacker_below_starting_strength)
    setAttackerBattleshocked(initialOptions.attacker_battleshocked)
    setAttackerSagaCompleted(initialOptions.attacker_saga_completed)
    setAttackerEldersGuidanceActive(initialOptions.attacker_elders_guidance_active)
    setAttackerBoastAchieved(initialOptions.attacker_boast_achieved)
    setAttackerHordeslayerOutnumbered(initialOptions.attacker_hordeslayer_outnumbered)
    setAttackerHeroesAllRerollType(initialOptions.attacker_heroes_all_reroll_type)
    setAttackerUnbridledFerocityActive(initialOptions.attacker_unbridled_ferocity_active)
    setDefenderArmourOfContemptActive(initialOptions.defender_armour_of_contempt_active)
    setDefenderOverwhelmingOnslaughtActive(initialOptions.defender_overwhelming_onslaught_active)
    setDefenderUnbreakableLinesActive(initialOptions.defender_unbreakable_lines_active)
    setDefenderPennantOfRemembranceActive(initialOptions.defender_pennant_of_remembrance_active)
    setDefenderBattleshocked(initialOptions.defender_battleshocked)
    setAttackerEnhancementName('')
    setDefenderEnhancementName('')
    setRunCount('1')
  }

  return (
    <div className="app-shell">
      <header className="hero-band">
        <p className="eyebrow">Tactica Forge: Warhammer 40,000 Combat Simulator</p>
        <div className="hero-copy">
          <h1>
            {activePage === 'combat'
              ? 'Check Unit Effectiveness'
              : activePage === 'battlefield'
                ? 'Plot Units on the Battlefield'
                : activePage === 'turn'
                  ? 'Run the Turn Sequence'
                  : 'Build Army Lists'}
          </h1>
          <p>
            {activePage === 'combat'
              ? 'Pick an attacker, a weapon profile, a defender, and the combat context. Applies the rules engine and returns a full combat log.'
              : activePage === 'battlefield'
                ? 'The selected units from Combat are shown as scaled bases on a 44 x 60 inch top-down board.'
                : activePage === 'turn'
                  ? 'Track the 11th Edition turn order and inspect which rule modules are available in each phase.'
                  : 'Build named rosters from selected combat units and save them locally for later sessions.'}
          </p>
        </div>
      </header>

      <nav className="page-nav" aria-label="Primary">
        <button
          type="button"
          className={`page-nav-button ${activePage === 'army-list' ? 'active' : ''}`}
          onClick={() => setActivePage('army-list')}
        >
          Army List
        </button>
        <button
          type="button"
          className={`page-nav-button ${activePage === 'combat' ? 'active' : ''}`}
          onClick={() => setActivePage('combat')}
        >
          Combat
        </button>
        <button
          type="button"
          className={`page-nav-button ${activePage === 'turn' ? 'active' : ''}`}
          onClick={() => setActivePage('turn')}
        >
          Turn
        </button>
        <button
          type="button"
          className={`page-nav-button ${activePage === 'battlefield' ? 'active' : ''}`}
          onClick={() => setActivePage('battlefield')}
        >
          Battlefield
        </button>
      </nav>

      {activePage === 'combat' ? (
        <>
          <main className="workspace-grid">
        <section className="panel control-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Setup</p>
              <h2>Simulation Input</h2>
            </div>
            <button type="button" className="secondary-button" onClick={resetOptions}>
              Reset Options
            </button>
          </div>

          {loading ? <p className="status-line">Loading faction data...</p> : null}
          {error ? <p className="status-line error">{error}</p> : null}

          <form className="sim-form" onSubmit={handleSimulate}>
            <div className="combat-side-grid">
              <section className="combat-side-panel">
                <p className="kicker">Attacker</p>
                <label>
                  <span>Attacking Faction</span>
                  <select value={attackerFaction} onChange={(event) => setAttackerFaction(event.target.value)}>
                    {factions.map((faction) => (
                      <option key={faction.name} value={faction.name}>
                        {faction.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Attacking Unit</span>
                  <select value={attackerUnit} onChange={(event) => setAttackerUnit(event.target.value)}>
                    {attackerUnits.map((unit) => (
                      <option key={unit.name} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>

                {renderModelCountSelector(
                  'Attacker',
                  attackerUnitDetails,
                  attackerModelCount,
                  setAttackerModelCount,
                  attackerModelCounts,
                  setAttackerModelCounts,
                )}

                {renderLoadoutSelectors(
                  'Attacker',
                  attackerUnitDetails,
                  attackerLoadoutSelections,
                  setAttackerLoadoutSelections,
                )}

                {attackerAttachedLeaderOptions.length ? (
                  <>
                    <label>
                      <span>Attacker Attached Leader</span>
                      <select
                        value={attackerAttachedLeaderName}
                        onChange={(event) => setAttackerAttachedLeaderName(event.target.value)}
                      >
                        <option value="">No attached leader</option>
                        {attackerAttachedLeaderOptions.map((unit) => (
                          <option key={unit.name} value={unit.name}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {renderLoadoutSelectors(
                      'Attacker Leader',
                      attackerAttachedLeaderUnitDetails,
                      attackerAttachedLeaderLoadoutSelections,
                      setAttackerAttachedLeaderLoadoutSelections,
                    )}

                    {renderModelCountSelector(
                      'Attacker Leader',
                      attackerAttachedLeaderUnitDetails,
                      attackerAttachedLeaderModelCount,
                      setAttackerAttachedLeaderModelCount,
                      attackerAttachedLeaderModelCounts,
                      setAttackerAttachedLeaderModelCounts,
                    )}
                  </>
                ) : null}

                {attackerFactionDetails?.detachments?.length ? (
                  <label title={attackerDetachmentTooltip}>
                    <span>Attacker Detachment</span>
                    <select
                      title={attackerDetachmentTooltip}
                      value={attackerDetachmentName}
                      onChange={(event) => setAttackerDetachmentName(event.target.value)}
                    >
                      <option value="">No detachment</option>
                      {(attackerFactionDetails?.detachments || []).map((detachment) => (
                        <option
                          key={detachment.name}
                          value={detachment.name}
                          title={formatDetachmentTooltip(detachment)}
                        >
                          {detachment.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </section>

              <section className="combat-side-panel">
                <p className="kicker">Defender</p>
                <label>
                  <span>Defending Faction</span>
                  <select value={defenderFaction} onChange={(event) => setDefenderFaction(event.target.value)}>
                    {factions.map((faction) => (
                      <option key={faction.name} value={faction.name}>
                        {faction.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Defending Unit</span>
                  <select value={defenderUnit} onChange={(event) => setDefenderUnit(event.target.value)}>
                    {defenderUnits.map((unit) => (
                      <option key={unit.name} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>

                {renderModelCountSelector(
                  'Defender',
                  defenderUnitDetails,
                  defenderModelCount,
                  setDefenderModelCount,
                  defenderModelCounts,
                  setDefenderModelCounts,
                )}

                {renderLoadoutSelectors(
                  'Defender',
                  defenderUnitDetails,
                  defenderLoadoutSelections,
                  setDefenderLoadoutSelections,
                )}

                {defenderFactionDetails?.detachments?.length ? (
                  <label title={defenderDetachmentTooltip}>
                    <span>Defender Detachment</span>
                    <select
                      title={defenderDetachmentTooltip}
                      value={defenderDetachmentName}
                      onChange={(event) => setDefenderDetachmentName(event.target.value)}
                    >
                      <option value="">No detachment</option>
                      {(defenderFactionDetails?.detachments || []).map((detachment) => (
                        <option
                          key={detachment.name}
                          value={detachment.name}
                          title={formatDetachmentTooltip(detachment)}
                        >
                          {detachment.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </section>
            </div>

            <div className="weapon-selection-panel">
              <div className="weapon-selection-header">
                <span>Weapon Profiles</span>
                <span>{weaponNames.length} selected</span>
              </div>
              <div className="weapon-selection-grid">
                {combatWeaponOptions.map((weapon) => {
                  const checked = weaponNames.includes(weapon.name)
                  return (
                    <label key={weapon.name} className="checkbox-row weapon-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setWeaponNames((currentWeaponNames) => (
                            event.target.checked
                              ? [...currentWeaponNames, weapon.name]
                              : currentWeaponNames.filter((name) => name !== weapon.name)
                          ))
                        }}
                      />
                      <span>{formatWeaponName(weapon)}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <label>
              <span>Number of Runs</span>
              <input
                type="number"
                min="1"
                max="100"
                value={runCount}
                onChange={(event) => setRunCount(event.target.value)}
              />
            </label>

            {selectedWeapon ? (
              <div className="weapon-card">
                <div>
                  <p className="kicker">Selected Weapons</p>
                  <h3>{formatWeaponName(selectedWeapon)}</h3>
                </div>
                {selectedAttackWeapons.length > 1 ? (
                  <p>{selectedAttackWeaponLabels.join(', ')}</p>
                ) : (
                  <div className="datasheet-stats">
                    {renderWeaponStatsGrid(selectedWeapon)}
                  </div>
                )}
              </div>
            ) : null}

            <div className="rule-grid">
              {attackerEnhancementOptions.length ? (
                <label title={attackerEnhancementTooltip}>
                  <span>Attacker Enhancement</span>
                  <select
                    title={attackerEnhancementTooltip}
                    value={attackerEnhancementName}
                    onChange={(event) => setAttackerEnhancementName(event.target.value)}
                  >
                    <option value="">No enhancement</option>
                    {attackerEnhancementOptions.map((enhancement) => (
                      <option
                        key={enhancement.name}
                        value={enhancement.name}
                        title={formatEnhancementTooltip(enhancement)}
                      >
                        {enhancement.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {defenderEnhancementOptions.length ? (
                <label title={defenderEnhancementTooltip}>
                  <span>Defender Enhancement</span>
                  <select
                    title={defenderEnhancementTooltip}
                    value={defenderEnhancementName}
                    onChange={(event) => setDefenderEnhancementName(event.target.value)}
                  >
                    <option value="">No enhancement</option>
                    {defenderEnhancementOptions.map((enhancement) => (
                      <option
                        key={enhancement.name}
                        value={enhancement.name}
                        title={formatEnhancementTooltip(enhancement)}
                      >
                        {enhancement.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {canUseAttackerFireDiscipline ? (
                <label className="checkbox-row" title={fireDisciplineTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerFireDisciplineActive}
                    onChange={(event) => setAttackerFireDisciplineActive(event.target.checked)}
                  />
                  <span>Use Fire Discipline</span>
                </label>
              ) : null}

              {canUseAttackerMarkedForDestruction ? (
                <label className="checkbox-row" title={markedForDestructionTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerMarkedForDestructionActive}
                    onChange={(event) => setAttackerMarkedForDestructionActive(event.target.checked)}
                  />
                  <span>Use Marked for Destruction</span>
                </label>
              ) : null}

              {canUseAttackerUnbridledFerocity ? (
                <label className="checkbox-row" title={unbridledFerocityTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnbridledFerocityActive}
                    onChange={(event) => setAttackerUnbridledFerocityActive(event.target.checked)}
                  />
                  <span>Use Unbridled Ferocity</span>
                </label>
              ) : null}

              {canUseAttackerUnforgivenFury ? (
                <label className="checkbox-row" title={unforgivenFuryTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnforgivenFuryActive}
                    onChange={(event) => setAttackerUnforgivenFuryActive(event.target.checked)}
                  />
                  <span>Use Unforgiven Fury</span>
                </label>
              ) : null}

              {attackerUnforgivenFuryActive ? (
                <label className="checkbox-row" title={attackerArmyBattleshockTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnforgivenFuryArmyBattleshocked}
                    onChange={(event) => setAttackerUnforgivenFuryArmyBattleshocked(event.target.checked)}
                  />
                  <span>Attacker army has a Battle-shocked Adeptus Astartes unit</span>
                </label>
              ) : null}

              {canUseDefenderArmourOfContempt ? (
                <label className="checkbox-row" title={armourOfContemptTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderArmourOfContemptActive}
                    onChange={(event) => setDefenderArmourOfContemptActive(event.target.checked)}
                  />
                  <span>Defender uses Armour of Contempt</span>
                </label>
              ) : null}

              {canUseDefenderOverwhelmingOnslaught ? (
                <label className="checkbox-row" title={overwhelmingOnslaughtTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderOverwhelmingOnslaughtActive}
                    onChange={(event) => setDefenderOverwhelmingOnslaughtActive(event.target.checked)}
                  />
                  <span>Defender uses Overwhelming Onslaught</span>
                </label>
              ) : null}

              {canUseDefenderUnbreakableLines ? (
                <label className="checkbox-row" title={unbreakableLinesTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderUnbreakableLinesActive}
                    onChange={(event) => setDefenderUnbreakableLinesActive(event.target.checked)}
                  />
                  <span>Defender uses Unbreakable Lines</span>
                </label>
              ) : null}

              {canUseCover ? (
                <label className="checkbox-row" title={coverTooltip}>
                  <input
                    type="checkbox"
                    checked={targetHasCover}
                    onChange={(event) => setTargetHasCover(event.target.checked)}
                  />
                  <span>Defender has cover</span>
                </label>
              ) : null}

              {hasOathOfMoment ? (
                <label className="checkbox-row" title={oathTooltip}>
                  <input
                    type="checkbox"
                    checked={oathOfMomentActive}
                    onChange={(event) => setOathOfMomentActive(event.target.checked)}
                  />
                  <span>Defender is the Oath of Moment target</span>
                </label>
              ) : null}

              {canUseHalfRange ? (
                <label className="checkbox-row" title={halfRangeTooltip}>
                  <input
                    type="checkbox"
                    checked={inHalfRange}
                    onChange={(event) => setInHalfRange(event.target.checked)}
                  />
                  <span>Target is in Half Range</span>
                </label>
              ) : null}

              {canUseSagaCompleted ? (
                <label className="checkbox-row" title={attackerSagaCompletedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerSagaCompleted}
                    onChange={(event) => setAttackerSagaCompleted(event.target.checked)}
                  />
                  <span>Attacker Saga is completed</span>
                </label>
              ) : null}

              {canUseAttackerWaaagh ? (
                <label className="checkbox-row" title={attackerWaaaghTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerWaaaghActive}
                    onChange={(event) => setAttackerWaaaghActive(event.target.checked)}
                  />
                  <span>Waaagh! is active for the attacker</span>
                </label>
              ) : null}

              {canUseDefenderWaaagh ? (
                <label className="checkbox-row" title={defenderWaaaghTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderWaaaghActive}
                    onChange={(event) => setDefenderWaaaghActive(event.target.checked)}
                  />
                  <span>Waaagh! is active for the defender</span>
                </label>
              ) : null}

              {canUseAttackerPrey ? (
                <label className="checkbox-row" title={attackerPreyTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerPreyActive}
                    onChange={(event) => setAttackerPreyActive(event.target.checked)}
                  />
                  <span>Defender is the attacker's Prey</span>
                </label>
              ) : null}

              {canUseTargetWithinNine ? (
                <label className="checkbox-row" title={attackerTargetWithinNineTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerTargetWithinNine}
                    onChange={(event) => setAttackerTargetWithinNine(event.target.checked)}
                  />
                  <span>Defender is within 9"</span>
                </label>
              ) : null}

              {canUseAttackerCountsAsTenPlus ? (
                <label className="checkbox-row" title={attackerCountsAsTenTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerCountsAsTenPlusModels}
                    onChange={(event) => setAttackerCountsAsTenPlusModels(event.target.checked)}
                  />
                  <span>Attacker counts as 10+ models</span>
                </label>
              ) : null}

              {canUseDefenderCountsAsTenPlus ? (
                <label className="checkbox-row" title={defenderCountsAsTenTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderCountsAsTenPlusModels}
                    onChange={(event) => setDefenderCountsAsTenPlusModels(event.target.checked)}
                  />
                  <span>Defender counts as 10+ models</span>
                </label>
              ) : null}

              {canUseTargetBelowStartingStrength ? (
                <label className="checkbox-row" title={targetBelowStartingStrengthTooltip}>
                  <input
                    type="checkbox"
                    checked={targetBelowStartingStrength}
                    onChange={(event) => setTargetBelowStartingStrength(event.target.checked)}
                  />
                  <span>Defender is below Starting Strength</span>
                </label>
              ) : null}

              {canUseTargetBelowHalfStrength ? (
                <label className="checkbox-row" title={targetBelowHalfStrengthTooltip}>
                  <input
                    type="checkbox"
                    checked={targetBelowHalfStrength}
                    onChange={(event) => setTargetBelowHalfStrength(event.target.checked)}
                  />
                  <span>Defender is Below Half-strength</span>
                </label>
              ) : null}

              {canUseTryDatButton ? (
                <div title={tryDatButtonTooltip}>
                  <span>Try Dat Button! Effects</span>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonEffects.includes('sustained_hits_1')}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setAttackerTryDatButtonEffects((currentEffects) => (
                          checked
                            ? [...new Set([...currentEffects, 'sustained_hits_1'])]
                            : currentEffects.filter((effect) => effect !== 'sustained_hits_1')
                        ))
                      }}
                    />
                    <span>Sustained Hits 1</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonEffects.includes('lethal_hits')}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setAttackerTryDatButtonEffects((currentEffects) => (
                          checked
                            ? [...new Set([...currentEffects, 'lethal_hits'])]
                            : currentEffects.filter((effect) => effect !== 'lethal_hits')
                        ))
                      }}
                    />
                    <span>Lethal Hits</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonEffects.includes('critical_wound_ap_2')}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setAttackerTryDatButtonEffects((currentEffects) => (
                          checked
                            ? [...new Set([...currentEffects, 'critical_wound_ap_2'])]
                            : currentEffects.filter((effect) => effect !== 'critical_wound_ap_2')
                        ))
                      }}
                    />
                    <span>Critical Wounds improve AP by 2</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={attackerTryDatButtonHazardous}
                      onChange={(event) => setAttackerTryDatButtonHazardous(event.target.checked)}
                    />
                    <span>Button effect was chosen manually and adds Hazardous</span>
                  </label>
                </div>
              ) : null}

              {isRangedWeapon ? (
                <label className="checkbox-row" title={engagementTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerInEngagementRange}
                    onChange={(event) => setAttackerInEngagementRange(event.target.checked)}
                  />
                  <span>Attacker is in Engagement Range</span>
                </label>
              ) : null}

              {hasHeavy ? (
                <label className="checkbox-row" title={heavyTooltip}>
                  <input
                    type="checkbox"
                    checked={remainedStationary}
                    onChange={(event) => setRemainedStationary(event.target.checked)}
                  />
                  <span>Attacker remained Stationary</span>
                </label>
              ) : null}

              {canUseTargetInEngagementRangeOfAllies ? (
                <label className="checkbox-row" title={targetInEngagementTooltip}>
                  <input
                    type="checkbox"
                    checked={targetInEngagementRangeOfAllies}
                    onChange={(event) => setTargetInEngagementRangeOfAllies(event.target.checked)}
                  />
                  <span>Defender is in Engagement Range of allied units</span>
                </label>
              ) : null}

              {hasIndirectFire ? (
                <label className="checkbox-row" title={indirectTooltip}>
                  <input
                    type="checkbox"
                    checked={indirectTargetVisible}
                    onChange={(event) => setIndirectTargetVisible(event.target.checked)}
                  />
                  <span>Any defender models are visible</span>
                </label>
              ) : null}

              {isRangedWeapon ? (
                <label className="checkbox-row" title="Plunging Fire: future 3D/terrain hook. Improves BS by 1 when the attacker is 3&quot;+ above the target or has Towering within 12&quot;. This has no effect for attacks made by or targeting Aircraft.">
                  <input
                    type="checkbox"
                    checked={plungingFireActive}
                    onChange={(event) => setPlungingFireActive(event.target.checked)}
                  />
                  <span>Plunging Fire applies</span>
                </label>
              ) : null}

              {canUseLance && isMeleeWeapon ? (
                <label className="checkbox-row" title={lanceTooltip}>
                  <input
                    type="checkbox"
                    checked={chargedThisTurn}
                    onChange={(event) => setChargedThisTurn(event.target.checked)}
                  />
                  <span>Attacker charged this turn</span>
                </label>
              ) : null}

              {canUseEldersGuidance ? (
                <label className="checkbox-row" title={attackerEldersGuidanceTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerEldersGuidanceActive}
                    onChange={(event) => setAttackerEldersGuidanceActive(event.target.checked)}
                  />
                  <span>Use Elder's Guidance</span>
                </label>
              ) : null}

              {canUseAttackerUnbridledCarnage ? (
                <label className="checkbox-row" title={unbridledCarnageTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerUnbridledCarnageActive}
                    onChange={(event) => setAttackerUnbridledCarnageActive(event.target.checked)}
                  />
                  <span>Use Unbridled Carnage</span>
                </label>
              ) : null}

              {canUseDefenderArdAsNails ? (
                <label className="checkbox-row" title={ardAsNailsTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderArdAsNailsActive}
                    onChange={(event) => setDefenderArdAsNailsActive(event.target.checked)}
                  />
                  <span>Defender uses 'Ard as Nails</span>
                </label>
              ) : null}

              {canUseAttackerDragItDown ? (
                <label className="checkbox-row" title={dragItDownTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerDragItDownActive}
                    onChange={(event) => setAttackerDragItDownActive(event.target.checked)}
                  />
                  <span>Use Drag It Down</span>
                </label>
              ) : null}

              {canUseDefenderStalkinTaktiks ? (
                <label className="checkbox-row" title={stalkinTaktiksTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderStalkinTaktiksActive}
                    onChange={(event) => setDefenderStalkinTaktiksActive(event.target.checked)}
                  />
                  <span>Defender uses Stalkin' Taktiks</span>
                </label>
              ) : null}

              {canUseDefenderSpeediestFreeks ? (
                <label className="checkbox-row" title={speediestFreeksTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderSpeediestFreeksActive}
                    onChange={(event) => setDefenderSpeediestFreeksActive(event.target.checked)}
                  />
                  <span>Defender uses Speediest Freeks</span>
                </label>
              ) : null}

              {canUseAttackerBlitzaFire ? (
                <label className="checkbox-row" title={blitzaFireTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBlitzaFireActive}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setAttackerBlitzaFireActive(checked)
                      if (checked) {
                        setAttackerDakkastormActive(false)
                      }
                    }}
                  />
                  <span>Use Blitza Fire</span>
                </label>
              ) : null}

              {canUseAttackerDakkastorm ? (
                <label className="checkbox-row" title={dakkastormTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerDakkastormActive}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setAttackerDakkastormActive(checked)
                      if (checked) {
                        setAttackerBlitzaFireActive(false)
                      }
                    }}
                  />
                  <span>Use Dakkastorm</span>
                </label>
              ) : null}

              {canUseAttackerFullThrottle ? (
                <label className="checkbox-row" title={fullThrottleTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerFullThrottleActive}
                    onChange={(event) => setAttackerFullThrottleActive(event.target.checked)}
                  />
                  <span>Use Full Throttle!</span>
                </label>
              ) : null}

              {canUseAttackerKlankinKlaws ? (
                <>
                  <label className="checkbox-row" title={klankinKlawsTooltip}>
                    <input
                      type="checkbox"
                      checked={attackerKlankinKlawsActive}
                      onChange={(event) => setAttackerKlankinKlawsActive(event.target.checked)}
                    />
                    <span>Use Klankin' Klaws</span>
                  </label>
                  {attackerKlankinKlawsActive ? (
                    <label className="checkbox-row" title={klankinKlawsTooltip}>
                      <input
                        type="checkbox"
                        checked={attackerKlankinKlawsPushed}
                        onChange={(event) => setAttackerKlankinKlawsPushed(event.target.checked)}
                      />
                      <span>Push Klankin' Klaws</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {canUseAttackerDakkaDakkaDakka ? (
                <>
                  <label className="checkbox-row" title={dakkaDakkaDakkaTooltip}>
                    <input
                      type="checkbox"
                      checked={attackerDakkaDakkaDakkaActive}
                      onChange={(event) => setAttackerDakkaDakkaDakkaActive(event.target.checked)}
                    />
                    <span>Use Dakka! Dakka! Dakka!</span>
                  </label>
                  {attackerDakkaDakkaDakkaActive ? (
                    <label className="checkbox-row" title={dakkaDakkaDakkaTooltip}>
                      <input
                        type="checkbox"
                        checked={attackerDakkaDakkaDakkaPushed}
                        onChange={(event) => setAttackerDakkaDakkaDakkaPushed(event.target.checked)}
                      />
                      <span>Push Dakka! Dakka! Dakka!</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {canUseAttackerBiggerShells ? (
                <>
                  <label className="checkbox-row" title={biggerShellsTooltip}>
                    <input
                      type="checkbox"
                      checked={attackerBiggerShellsActive}
                      onChange={(event) => setAttackerBiggerShellsActive(event.target.checked)}
                    />
                    <span>Use Bigger Shells for Bigger Gitz</span>
                  </label>
                  {attackerBiggerShellsActive ? (
                    <label className="checkbox-row" title={biggerShellsTooltip}>
                      <input
                        type="checkbox"
                        checked={attackerBiggerShellsPushed}
                        onChange={(event) => setAttackerBiggerShellsPushed(event.target.checked)}
                      />
                      <span>Push Bigger Shells for Bigger Gitz</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {canUseDefenderExtraGubbinz ? (
                <label className="checkbox-row" title={extraGubbinzTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderExtraGubbinzActive}
                    onChange={(event) => setDefenderExtraGubbinzActive(event.target.checked)}
                  />
                  <span>Defender uses Extra Gubbinz</span>
                </label>
              ) : null}

              {canUseAttackerCompetitiveStreak ? (
                <label className="checkbox-row" title={competitiveStreakTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerCompetitiveStreakActive}
                    onChange={(event) => setAttackerCompetitiveStreakActive(event.target.checked)}
                  />
                  <span>Use Competitive Streak</span>
                </label>
              ) : null}

              {canUseAttackerArmedToDaTeef ? (
                <label className="checkbox-row" title={armedToDaTeefTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerArmedToDaTeefActive}
                    onChange={(event) => setAttackerArmedToDaTeefActive(event.target.checked)}
                  />
                  <span>Use Armed to da Teef</span>
                </label>
              ) : null}

              {canUseDefenderHulkingBrutes ? (
                <label className="checkbox-row" title={hulkingBrutesTooltip}>
                  <input
                    type="checkbox"
                    checked={defenderHulkingBrutesActive}
                    onChange={(event) => setDefenderHulkingBrutesActive(event.target.checked)}
                  />
                  <span>Defender uses Hulking Brutes</span>
                </label>
              ) : null}

              {canUseBoastAchieved ? (
                <label className="checkbox-row" title={attackerBoastAchievedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBoastAchieved}
                    onChange={(event) => setAttackerBoastAchieved(event.target.checked)}
                  />
                  <span>Bearer's unit achieved a Boast</span>
                </label>
              ) : null}

              {canUseHordeslayerOutnumbered ? (
                <label className="checkbox-row" title={attackerHordeslayerOutnumberedTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerHordeslayerOutnumbered}
                    onChange={(event) => setAttackerHordeslayerOutnumbered(event.target.checked)}
                  />
                  <span>More enemy than friendly models are within 6"</span>
                </label>
              ) : null}

              {canUseHeroesAllRerollType ? (
                <label title={heroesAllRerollTooltip}>
                  <span>Heroes All Reroll</span>
                  <select
                    title={heroesAllRerollTooltip}
                    value={attackerHeroesAllRerollType}
                    onChange={(event) => setAttackerHeroesAllRerollType(event.target.value)}
                  >
                    <option value="">Select reroll</option>
                    <option value="hit">Hit roll</option>
                    <option value="wound">Wound roll</option>
                    <option value="damage">Damage roll</option>
                  </select>
                </label>
              ) : null}

              {attackerEnhancementName === 'Stubborn Tenacity' ? (
                <label className="checkbox-row" title={attackerBelowStartingStrengthTooltip}>
                  <input
                    type="checkbox"
                    checked={attackerBelowStartingStrength}
                    onChange={(event) => setAttackerBelowStartingStrength(event.target.checked)}
                  />
                  <span>Attacker is below Starting Strength</span>
                </label>
              ) : null}

              <label className="checkbox-row" title={attackerBattleshockedTooltip}>
                <input
                  type="checkbox"
                  checked={attackerBattleshocked}
                  onChange={(event) => setAttackerBattleshocked(event.target.checked)}
                />
                <span>Attacker is Battle-shocked</span>
              </label>

              <label className="checkbox-row" title={defenderBattleshockedTooltip}>
                <input
                  type="checkbox"
                  checked={defenderBattleshocked}
                  onChange={(event) => setDefenderBattleshocked(event.target.checked)}
                />
                <span>Defender is Battle-shocked</span>
              </label>

              {(attackerAttachedLeaderUnitDetails || attachedCharacterUnitDetails) ? (
                <div className="attached-unit-rule-card">
                  <p className="kicker">Attached Units</p>
                  {attackerAttachedLeaderUnitDetails ? (
                    <p>
                      <strong>Attacker:</strong> {attackerAttachedLeaderUnitDetails.name} is attached to {attackerUnitDetails?.name || 'the bodyguard'}.
                      The attached unit has {attackerAttachedUnitKeywords.slice(0, 8).join(', ')}{attackerAttachedUnitKeywords.length > 8 ? ', ...' : ''}.
                    </p>
                  ) : null}
                  {attachedCharacterUnitDetails ? (
                    <p>
                      <strong>Defender:</strong> {attachedCharacterUnitDetails.name} is attached to {defenderUnitDetails?.name || 'the bodyguard'}.
                      Attacks use the bodyguard unit&apos;s highest Toughness{defenderBodyguardHighestToughness ? ` (${defenderBodyguardHighestToughness})` : ''} until its bodyguard models are gone.
                    </p>
                  ) : null}
                  {attachedCharacterUnitDetails ? (
                    <p>
                      Defender keywords: {defenderAttachedUnitKeywords.slice(0, 8).join(', ')}{defenderAttachedUnitKeywords.length > 8 ? ', ...' : ''}. Precision can allocate successful wounds to the attached Character.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {canUsePrecision ? (
                <>
                  <label title={attachedCharacterTooltip}>
                    <span>Attached Character</span>
                    <select
                      title={attachedCharacterTooltip}
                      value={attachedCharacterName}
                      onChange={(event) => setAttachedCharacterName(event.target.value)}
                    >
                      <option value="">No attached character</option>
                      {attachedCharacterOptions.map((unit) => (
                        <option key={unit.name} value={unit.name}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {renderLoadoutSelectors(
                    'Attached Character',
                    attachedCharacterUnitDetails,
                    attachedCharacterLoadoutSelections,
                    setAttachedCharacterLoadoutSelections,
                  )}

                  {renderModelCountSelector(
                    'Attached Character',
                    attachedCharacterUnitDetails,
                    attachedCharacterModelCount,
                    setAttachedCharacterModelCount,
                    attachedCharacterModelCounts,
                    setAttachedCharacterModelCounts,
                  )}
                </>
              ) : null}

              {hasHazardous ? (
                <label className="checkbox-row" title={hazardousOverwatchTooltip}>
                  <input
                    type="checkbox"
                    checked={hazardousOverwatchChargePhase}
                    onChange={(event) => setHazardousOverwatchChargePhase(event.target.checked)}
                  />
                  <span>Used Fire Overwatch in opponent charge phase</span>
                </label>
              ) : null}

              {hasHazardous ? (
                <label title={hazardousBearerTooltip}>
                  <span>Hazardous Bearer Current Wounds</span>
                  <input
                    title={hazardousBearerTooltip}
                    type="number"
                    min="0"
                    value={hazardousBearerCurrentWounds}
                    onChange={(event) => setHazardousBearerCurrentWounds(event.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <button type="submit" className="primary-button" disabled={!readyToSimulate || simulating}>
              {simulating ? 'Running Simulations...' : 'Run Simulations'}
            </button>
          </form>
        </section>

        <section className="panel data-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Reference</p>
              <h2>Datasheets</h2>
            </div>
          </div>

          <div className="snapshot-grid">
            <article className="datasheet-card">
              <p className="kicker">Attacker</p>
              <h3>{attackerUnitDetails?.name || 'No unit selected'}</h3>
              <p>{attackerFaction || 'Faction not set'}</p>
              <button
                type="button"
                className="secondary-button army-list-button"
                onClick={() => addUnitToArmyList(attackerUnitDetails, attackerFaction)}
                disabled={!attackerUnitDetails || !attackerFaction}
              >
                Add To Army List
              </button>
              <div className="datasheet-stats">
                {renderStatsGrid(attackerUnitDetails?.stats, attackerBattleshocked)}
              </div>
              <div className="active-rules">
                <p className="kicker">Active Rules</p>
                {attackerActiveRules.length ? (
                  <div className="active-rule-list">
                    {attackerActiveRules.map((rule) => (
                      <article key={`${rule.source}-${rule.name}`} className="active-rule-card">
                        <div className="active-rule-header">
                          <h4>{rule.name}</h4>
                          <span className="active-rule-source">{rule.source}</span>
                        </div>
                        <p>{rule.text}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="active-rule-empty">No active rules affecting this attack.</p>
                )}
              </div>
            </article>

            <article className="datasheet-card">
              <p className="kicker">Defender</p>
              <h3>{defenderUnitDetails?.name || 'No unit selected'}</h3>
              <p>{defenderFaction || 'Faction not set'}</p>
              <button
                type="button"
                className="secondary-button army-list-button"
                onClick={() => addUnitToArmyList(defenderUnitDetails, defenderFaction)}
                disabled={!defenderUnitDetails || !defenderFaction}
              >
                Add To Army List
              </button>
              <div className="datasheet-stats">
                {renderStatsGrid(defenderUnitDetails?.stats, defenderBattleshocked)}
              </div>
              <div className="active-rules">
                <p className="kicker">Active Rules</p>
                {defenderActiveRules.length ? (
                  <div className="active-rule-list">
                    {defenderActiveRules.map((rule) => (
                      <article key={`${rule.source}-${rule.name}`} className="active-rule-card">
                        <div className="active-rule-header">
                          <h4>{rule.name}</h4>
                          <span className="active-rule-source">{rule.source}</span>
                        </div>
                        <p>{rule.text}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="active-rule-empty">No active rules affecting this attack.</p>
                )}
              </div>
            </article>
          </div>

          {simulationRuns.length ? (
            <>
              <div className="run-tabs">
                <button
                  type="button"
                  className={`run-tab ${activeRunView === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveRunView('summary')}
                >
                  Summary
                </button>
                {simulationRuns.map((run) => (
                  <button
                    key={run.runIndex}
                    type="button"
                    className={`run-tab ${activeRunView === run.runIndex ? 'active' : ''}`}
                    onClick={() => setActiveRunView(run.runIndex)}
                  >
                    Run {run.runIndex}
                  </button>
                ))}
              </div>

              {activeRunView === 'summary' ? (
                <div className="outcome-grid">
                  <article className="result-card accent">
                    <p className="kicker">Target Summary</p>
                    <h3>{defenderUnit || 'Defender'}</h3>
                    <p>{summaryStats.totalRuns} runs completed</p>
                    <p>Destroyed: {summaryStats.targetDestroyedCount} ({formatPercent(summaryStats.targetDestroyedCount, summaryStats.totalRuns)})</p>
                    <p>Avg models remaining: {formatAverage(summaryStats.averageTargetModelsRemaining)}</p>
                    <p>Avg current model wounds: {formatAverage(summaryStats.averageTargetCurrentWounds)}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Hit Breakdown</p>
                    <h3>Accuracy</h3>
                    <p>Attack instances: {summaryStats.combat.attackInstances}</p>
                    <p>Hits landed: {summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks} ({formatPercent(summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks, summaryStats.combat.attackInstances)})</p>
                    <p>Auto-hits: {summaryStats.combat.autoHitAttacks}</p>
                    <p>Critical hits: {summaryStats.combat.criticalHitAttacks} ({formatPercent(summaryStats.combat.criticalHitAttacks, summaryStats.combat.attackInstances)})</p>
                    <p>Extra hits generated: {summaryStats.combat.extraHitsGenerated}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Wound Breakdown</p>
                    <h3>Conversion</h3>
                    <p>Wound rolls made: {summaryStats.combat.woundRolls}</p>
                    <p>Successful wound rolls: {summaryStats.combat.successfulWoundRolls} ({formatPercent(summaryStats.combat.successfulWoundRolls, summaryStats.combat.woundRolls)})</p>
                    <p>Auto-wounds: {summaryStats.combat.autoWounds}</p>
                    <p>Critical wounds: {summaryStats.combat.criticalWounds} ({formatPercent(summaryStats.combat.criticalWounds, summaryStats.combat.woundRolls + summaryStats.combat.autoWounds)})</p>
                    <p>Total wounds created: {summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Save Breakdown</p>
                    <h3>Defense</h3>
                    <p>Save attempts: {summaryStats.combat.saveAttempts}</p>
                    <p>Failed saves: {summaryStats.combat.savesFailed} ({formatPercent(summaryStats.combat.savesFailed, summaryStats.combat.saveAttempts)})</p>
                    <p>Passed saves: {summaryStats.combat.savesPassed} ({formatPercent(summaryStats.combat.savesPassed, summaryStats.combat.saveAttempts)})</p>
                    <p>Unsavable wounds: {summaryStats.combat.unsavableWounds}</p>
                  </article>

                  <article className="result-card">
                    <p className="kicker">Re-roll Breakdown</p>
                    <h3>Efficiency</h3>
                    <p>Hit re-rolls used: {summaryStats.combat.hitRerollsUsed}</p>
                    <p>Hit re-roll success: {summaryStats.combat.hitRerollSuccesses} ({formatPercent(summaryStats.combat.hitRerollSuccesses, summaryStats.combat.hitRerollsUsed)})</p>
                    <p>Wound re-rolls used: {summaryStats.combat.woundRerollsUsed}</p>
                    <p>Wound re-roll success: {summaryStats.combat.woundRerollSuccesses} ({formatPercent(summaryStats.combat.woundRerollSuccesses, summaryStats.combat.woundRerollsUsed)})</p>
                  </article>

                  {summaryStats.attachedCharacterRuns > 0 ? (
                    <article className="result-card">
                      <p className="kicker">Attached Character Summary</p>
                      <h3>{attachedCharacterName || 'Attached Character'}</h3>
                      <p>Tracked in {summaryStats.attachedCharacterRuns} runs</p>
                      <p>Destroyed: {summaryStats.attachedCharacterDestroyedCount} ({formatPercent(summaryStats.attachedCharacterDestroyedCount, summaryStats.attachedCharacterRuns)})</p>
                      <p>Avg current wounds: {formatAverage(summaryStats.averageAttachedCharacterWounds)}</p>
                    </article>
                  ) : null}

                  {summaryStats.hazardousBearerRuns > 0 ? (
                    <article className="result-card warning">
                      <p className="kicker">Hazardous Summary</p>
                      <h3>{attackerUnit || 'Hazardous Bearer'}</h3>
                      <p>Triggered in {summaryStats.hazardousBearerRuns} runs</p>
                      <p>Destroyed: {summaryStats.hazardousBearerDestroyedCount} ({formatPercent(summaryStats.hazardousBearerDestroyedCount, summaryStats.hazardousBearerRuns)})</p>
                      <p>Avg current wounds: {formatAverage(summaryStats.averageHazardousBearerWounds)}</p>
                    </article>
                  ) : null}
                </div>
              ) : activeRun ? (
                <div className="outcome-grid">
                  <article className="result-card accent">
                    <p className="kicker">Run {activeRun.runIndex}</p>
                    <h3>{activeRun.result.target.name}</h3>
                    <p>
                      {activeRun.result.target.destroyed
                        ? 'Destroyed'
                        : `${activeRun.result.target.models_remaining} models remain`}
                    </p>
                    <p>Current model wounds: {activeRun.result.target.current_model_wounds}</p>
                  </article>

                  {activeRun.result.attack_resolution_plan?.steps?.length ? (
                    <article className="result-card">
                      <p className="kicker">Resolve Attacks</p>
                      <h3>Attack Sequence</h3>
                      {activeRun.result.attack_resolution_plan.steps.slice(0, 3).map((step, index) => (
                        <p key={`${step.gather_attack_dice.selected_weapon_name}-${index}`}>
                          {step.select_enemy_unit.target_name}: {formatAttackDiceRange(step)} dice with {step.gather_attack_dice.identical_weapon_count} profile{step.gather_attack_dice.identical_weapon_count === 1 ? '' : 's'}
                        </p>
                      ))}
                    </article>
                  ) : null}

                  {activeRun.result.attached_character ? (
                    <article className="result-card">
                      <p className="kicker">Attached Character</p>
                      <h3>{activeRun.result.attached_character.name}</h3>
                      <p>
                        {activeRun.result.attached_character.destroyed
                          ? 'Destroyed'
                          : `${activeRun.result.attached_character.models_remaining} model remains`}
                      </p>
                      <p>Current wounds: {activeRun.result.attached_character.current_model_wounds}</p>
                    </article>
                  ) : null}

                  {activeRun.result.hazardous_bearer ? (
                    <article className="result-card warning">
                      <p className="kicker">Hazardous Bearer</p>
                      <h3>{activeRun.result.hazardous_bearer.name}</h3>
                      <p>
                        {activeRun.result.hazardous_bearer.destroyed
                          ? 'Destroyed'
                          : `${activeRun.result.hazardous_bearer.models_remaining} model remains`}
                      </p>
                      <p>Current wounds: {activeRun.result.hazardous_bearer.current_model_wounds}</p>
                    </article>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <p>Run one or more simulations to see summary statistics and individual combat logs.</p>
            </div>
          )}
        </section>
          </main>

          <section className="panel log-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Resolution</p>
                <h2>{activeRunView === 'summary' ? 'Run Index' : `Combat Log: Run ${activeRunView}`}</h2>
              </div>
            </div>

            {simulationRuns.length && activeRunView === 'summary' ? (
              <div className="summary-index">
                <p className="summary-index-copy">
                  Use the tabs above to switch between the summary page and each individual run.
                </p>
                <div className="summary-index-grid">
                  {simulationRuns.map((run) => (
                    <button
                      key={run.runIndex}
                      type="button"
                      className="summary-index-card"
                      onClick={() => setActiveRunView(run.runIndex)}
                    >
                      <strong>Run {run.runIndex}</strong>
                      <span>{run.result.target.destroyed ? 'Target destroyed' : `${run.result.target.models_remaining} models remain`}</span>
                      <span>Current wounds: {run.result.target.current_model_wounds}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeRun?.result?.log?.length ? (
              <ul className="combat-log">
                {activeRun.result.log.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <div className="empty-state compact">
                <p>The run index and combat logs will appear here after a simulation.</p>
              </div>
            )}
          </section>
        </>
      ) : activePage === 'turn' ? (
        <main className="turn-layout">
          <section className="panel turn-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Turn Structure</p>
                <h2>Battle Round {battleRound}</h2>
              </div>
              <div className="turn-meta">
                <label>
                  <span>Active Player</span>
                  <select value={activePlayer} onChange={(event) => setActivePlayer(event.target.value)}>
                    <option value="Player 1">Player 1</option>
                    <option value="Player 2">Player 2</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="turn-track" aria-label="11th Edition turn sequence">
              {turnSequence.map((phase) => {
                const active = phase.id === activeTurnPhase?.id
                const complete = completedTurnPhases.has(phase.id)
                return (
                  <button
                    key={phase.id}
                    type="button"
                    className={`turn-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}
                    onClick={() => setActiveTurnPhaseId(phase.id)}
                  >
                    <span className="turn-step-number">{phase.sequence}</span>
                    <span className="turn-step-body">
                      <strong>{phase.name}</strong>
                      <span>{phase.summary}</span>
                    </span>
                    <span className="turn-step-marker" aria-hidden="true">
                      {TURN_PHASE_MARKERS[phase.id] || phase.sequence}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="panel turn-detail-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">{activeTurnPhase?.kind || 'Phase'}</p>
                <h2>{activeTurnPhase?.name || 'Turn Phase'}</h2>
              </div>
              <span className="turn-phase-index">
                {activeTurnPhaseIndex + 1}/{turnSequence.length}
              </span>
            </div>

            <div className="turn-current-card">
              <p className="kicker">{activePlayer}</p>
              <h3>{activeTurnPhase?.summary}</h3>
            </div>

            {activeTurnPhase?.sub_steps?.length ? (
              <div className="turn-substep-list">
                <p className="kicker">Phase Steps</p>
                {activeTurnPhase.sub_steps.map((subStep) => (
                  <article key={subStep.id} className="turn-substep-card">
                    <span>{subStep.sequence}</span>
                    <div>
                      <h3>
                        {subStep.name}
                        {subStep.rule_ref ? <small>{subStep.rule_ref}</small> : null}
                      </h3>
                      <p>{subStep.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {activeTurnPhase?.move_types?.length ? (
              <div className="turn-move-type-list">
                <p className="kicker">Move Types</p>
                {activeTurnPhase.move_types.map((moveType) => (
                  <article key={moveType.id} className="turn-move-type-card">
                    <div>
                      <h3>
                        {moveType.name}
                        {moveType.rule_ref ? <small>{moveType.rule_ref}</small> : null}
                      </h3>
                      <p>{moveType.effect}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Maximum</dt>
                        <dd>{moveType.maximum_distance}</dd>
                      </div>
                      <div>
                        <dt>Eligible If</dt>
                        <dd>{moveType.eligible_if}</dd>
                      </div>
                    </dl>
                    {moveType.after_moving?.length ? (
                      <ul>
                        {moveType.after_moving.map((ruleText) => (
                          <li key={ruleText}>{ruleText}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}

            {activeTurnPhase?.shooting_types?.length ? (
              <div className="turn-move-type-list">
                <p className="kicker">Shooting Types</p>
                {activeTurnPhase.shooting_types.map((shootingType) => (
                  <article key={shootingType.id} className="turn-move-type-card">
                    <div>
                      <h3>
                        {shootingType.name}
                        {shootingType.rule_ref ? <small>{shootingType.rule_ref}</small> : null}
                      </h3>
                      <p>{shootingType.effect}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Eligible If</dt>
                        <dd>{shootingType.eligible_if}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{shootingType.details_pending ? 'Pending rules text' : 'Implemented'}</dd>
                      </div>
                    </dl>
                    {shootingType.while_shooting?.length ? (
                      <ul>
                        {shootingType.while_shooting.map((ruleText) => (
                          <li key={ruleText}>{ruleText}</li>
                        ))}
                      </ul>
                    ) : null}
                    {shootingType.after_shooting?.length ? (
                      <ul>
                        {shootingType.after_shooting.map((ruleText) => (
                          <li key={ruleText}>{ruleText}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}

            {activeTurnPhase?.charge_rules ? (
              <div className="turn-move-type-list">
                <p className="kicker">Charge Rules</p>
                <article className="turn-move-type-card">
                  <div>
                    <h3>Declare Charge<small>11.02</small></h3>
                    <p>{activeTurnPhase.charge_rules.roll}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Success</dt>
                      <dd>{activeTurnPhase.charge_rules.success}</dd>
                    </div>
                    <div>
                      <dt>Failed Charge</dt>
                      <dd>{activeTurnPhase.charge_rules.failed_charge}</dd>
                    </div>
                  </dl>
                  <ul>
                    {activeTurnPhase.charge_rules.eligible_if.map((ruleText) => (
                      <li key={ruleText}>{ruleText}</li>
                    ))}
                  </ul>
                </article>
                {activeTurnPhase.charge_rules.charge_move ? (
                  <article className="turn-move-type-card">
                    <div>
                      <h3>
                        Charge Move
                        <small>{activeTurnPhase.charge_rules.charge_move.rule_ref}</small>
                      </h3>
                      <p>{activeTurnPhase.charge_rules.charge_move.effect}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Maximum</dt>
                        <dd>{activeTurnPhase.charge_rules.charge_move.maximum_distance}</dd>
                      </div>
                      <div>
                        <dt>Eligible If</dt>
                        <dd>{activeTurnPhase.charge_rules.charge_move.eligible_if}</dd>
                      </div>
                    </dl>
                    <ul>
                      {[
                        ...(activeTurnPhase.charge_rules.charge_move.before_moving || []),
                        ...(activeTurnPhase.charge_rules.charge_move.while_moving || []),
                        ...(activeTurnPhase.charge_rules.charge_move.after_moving || []),
                      ].map((ruleText) => (
                        <li key={ruleText}>{ruleText}</li>
                      ))}
                    </ul>
                  </article>
                ) : null}
              </div>
            ) : null}

            {activeTurnPhase?.fight_rules?.pile_in_move ? (
              <div className="turn-move-type-list">
                <p className="kicker">Fight Rules</p>
                {activeTurnPhase.fight_rules.fight ? (
                  <article className="turn-move-type-card">
                    <div>
                      <h3>
                        Fight
                        <small>{activeTurnPhase.fight_rules.fight.rule_ref}</small>
                      </h3>
                      <p>{activeTurnPhase.fight_rules.fight.eligible_if.join(' ')}</p>
                    </div>
                    <ul>
                      {activeTurnPhase.fight_rules.fight.sequence.map((ruleText) => (
                        <li key={ruleText}>{ruleText}</li>
                      ))}
                    </ul>
                  </article>
                ) : null}
                {activeTurnPhase.fight_rules.fight_types?.map((fightType) => (
                  <article key={fightType.id} className="turn-move-type-card">
                    <div>
                      <h3>
                        {fightType.name}
                        <small>{fightType.rule_ref}</small>
                      </h3>
                      <p>{fightType.effect}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Eligible If</dt>
                        <dd>{fightType.eligible_if}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>Implemented</dd>
                      </div>
                    </dl>
                  </article>
                ))}
                <article className="turn-move-type-card">
                  <div>
                    <h3>
                      Pile-in Move
                      <small>{activeTurnPhase.fight_rules.pile_in_move.rule_ref}</small>
                    </h3>
                    <p>{activeTurnPhase.fight_rules.pile_in_move.effect}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Maximum</dt>
                      <dd>{activeTurnPhase.fight_rules.pile_in_move.maximum_distance}</dd>
                    </div>
                    <div>
                      <dt>Eligible If</dt>
                      <dd>{activeTurnPhase.fight_rules.pile_in_move.eligible_if.join(' ')}</dd>
                    </div>
                  </dl>
                  <ul>
                    {[
                      ...(activeTurnPhase.fight_rules.pile_in_move.before_moving || []),
                      ...(activeTurnPhase.fight_rules.pile_in_move.while_moving || []),
                      ...(activeTurnPhase.fight_rules.pile_in_move.after_moving || []),
                    ].map((ruleText) => (
                      <li key={ruleText}>{ruleText}</li>
                    ))}
                  </ul>
                </article>
                {activeTurnPhase.fight_rules.consolidate_move ? (
                  <article className="turn-move-type-card">
                    <div>
                      <h3>
                        Consolidate Move
                        <small>{activeTurnPhase.fight_rules.consolidate_move.rule_ref}</small>
                      </h3>
                      <p>{activeTurnPhase.fight_rules.consolidate_move.effect}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Maximum</dt>
                        <dd>{activeTurnPhase.fight_rules.consolidate_move.maximum_distance}</dd>
                      </div>
                      <div>
                        <dt>Eligible If</dt>
                        <dd>{activeTurnPhase.fight_rules.consolidate_move.eligible_if}</dd>
                      </div>
                    </dl>
                    <ul>
                      {[
                        ...(activeTurnPhase.fight_rules.consolidate_move.before_moving || []),
                        ...(activeTurnPhase.fight_rules.consolidate_move.while_moving || []),
                        ...(activeTurnPhase.fight_rules.consolidate_move.after_moving || []),
                      ].map((ruleText) => (
                        <li key={ruleText}>{ruleText}</li>
                      ))}
                    </ul>
                    {activeTurnPhase.fight_rules.consolidate_move.modes?.length ? (
                      <div className="turn-action-grid">
                        {activeTurnPhase.fight_rules.consolidate_move.modes.map((mode) => (
                          <span key={mode.id}>
                            {mode.name}
                            {mode.required_when ? `: ${mode.required_when}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ) : null}
              </div>
            ) : null}

            <div className="turn-rule-list">
              <p className="kicker">Rules Resolved Here</p>
              <ol>
                {(activeTurnPhase?.primary_rules || []).map((ruleText) => (
                  <li key={ruleText}>{ruleText}</li>
                ))}
              </ol>
            </div>

            <div className="turn-action-list">
              <p className="kicker">Available Rule Modules</p>
              {(activeTurnPhase?.available_actions || []).length ? (
                <>
                  <div className="turn-action-grid module-picker" role="tablist" aria-label="Available rule modules">
                    {activeTurnPhase.available_actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className={selectedTurnModule === action ? 'active' : ''}
                        onClick={() => setSelectedTurnModuleId(action)}
                      >
                        {TURN_ACTION_LABELS[action] || action}
                      </button>
                    ))}
                  </div>
                  {selectedTurnModule ? (
                    <article className="module-detail-card">
                      <p className="kicker">Selected Module</p>
                      <h3>{TURN_ACTION_LABELS[selectedTurnModule] || selectedTurnModule}</h3>
                      <p>{TURN_ACTION_DESCRIPTIONS[selectedTurnModule] || 'Use this module when resolving this phase step.'}</p>
                    </article>
                  ) : null}
                </>
              ) : (
                <p className="empty-state">No automated rule module is attached to this step yet.</p>
              )}
            </div>

            <div className="turn-controls">
              <button
                type="button"
                className="secondary-button"
                onClick={goToPreviousTurnPhase}
                disabled={!canGoToPreviousTurnPhase}
              >
                Previous
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={goToNextTurnPhase}
                disabled={!canGoToNextTurnPhase}
              >
                Next Phase
              </button>
            </div>
            <div className="turn-controls secondary">
              <button type="button" className="secondary-button" onClick={startNextPlayerTurn}>
                Next Player Turn
              </button>
              <button type="button" className="secondary-button" onClick={advanceBattleRound}>
                Next Battle Round
              </button>
            </div>
          </aside>
        </main>
      ) : activePage === 'battlefield' ? (
        <section className="panel battlefield-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Tabletop</p>
              <h2>Battlefield</h2>
            </div>
            <div className="battlefield-meta">
              <span>60&quot; x 44&quot;</span>
              <span>Top-Down View</span>
            </div>
          </div>

          <div className="battlefield-squad-controls cluster two-up">
            {renderModelCountSelector(
              'Attacker',
              attackerUnitDetails,
              attackerModelCount,
              setAttackerModelCount,
              attackerModelCounts,
              setAttackerModelCounts,
            )}
            {renderModelCountSelector(
              'Defender',
              defenderUnitDetails,
              defenderModelCount,
              setDefenderModelCount,
              defenderModelCounts,
              setDefenderModelCounts,
            )}
          </div>
          <div className="battlefield-instance-controls">
            <button
              type="button"
              className="secondary-button"
              onClick={() => deployBaseBattlefieldUnit('attacker')}
              disabled={!attackerUnitDetails || battlefieldBaseUnitDeployment.attacker}
            >
              Deploy Base Attacker
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => deployBaseBattlefieldUnit('defender')}
              disabled={!defenderUnitDetails || battlefieldBaseUnitDeployment.defender}
            >
              Deploy Base Defender
            </button>
            <label>
              <span>Add Attacker Unit</span>
              <select
                value={battlefieldAddAttackerUnitName}
                onChange={(event) => setBattlefieldAddAttackerUnitName(event.target.value)}
                disabled={!attackerUnits.length}
              >
                {attackerUnits.map((unit) => (
                  <option key={unit.name} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => addBattlefieldUnitInstance('attacker')}
              disabled={!attackerFaction || !battlefieldAddAttackerUnitName}
            >
              Add Attacker
            </button>
            <label>
              <span>Add Defender Unit</span>
              <select
                value={battlefieldAddDefenderUnitName}
                onChange={(event) => setBattlefieldAddDefenderUnitName(event.target.value)}
                disabled={!defenderUnits.length}
              >
                {defenderUnits.map((unit) => (
                  <option key={unit.name} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => addBattlefieldUnitInstance('defender')}
              disabled={!defenderFaction || !battlefieldAddDefenderUnitName}
            >
              Add Defender
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={removeSelectedBattlefieldUnitInstance}
              disabled={!selectedBattlefieldUnit}
            >
              Remove Selected Unit
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={clearBattlefieldDeployment}
              disabled={!battlefieldUnits.length}
            >
              Clear Battlefield
            </button>
          </div>
          <div className="battlefield-army-list-controls">
            <label>
              <span>Deploy Attacker From Army List</span>
              <select
                value={battlefieldAddAttackerArmyListEntryId}
                onChange={(event) => setBattlefieldAddAttackerArmyListEntryId(event.target.value)}
                disabled={!attackerArmyListDeploymentEntries.length}
              >
                {attackerArmyListDeploymentEntries.length ? attackerArmyListDeploymentEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {getAttachedArmyListUnitDetails(entry, 'leader') ? ` + ${getAttachedArmyListUnitDetails(entry, 'leader')?.name || 'Leader'}` : ''}
                    {getAttachedArmyListUnitDetails(entry, 'support') ? ` + ${getAttachedArmyListUnitDetails(entry, 'support')?.name || 'Support'}` : ''}
                  </option>
                )) : (
                  <option value="">No attacker army list units</option>
                )}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => addBattlefieldArmyListEntryInstance('attacker')}
              disabled={!battlefieldAddAttackerArmyListEntryId}
            >
              Deploy Attacker
            </button>
            <label>
              <span>Deploy Defender From Army List</span>
              <select
                value={battlefieldAddDefenderArmyListEntryId}
                onChange={(event) => setBattlefieldAddDefenderArmyListEntryId(event.target.value)}
                disabled={!defenderArmyListDeploymentEntries.length}
              >
                {defenderArmyListDeploymentEntries.length ? defenderArmyListDeploymentEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {getAttachedArmyListUnitDetails(entry, 'leader') ? ` + ${getAttachedArmyListUnitDetails(entry, 'leader')?.name || 'Leader'}` : ''}
                    {getAttachedArmyListUnitDetails(entry, 'support') ? ` + ${getAttachedArmyListUnitDetails(entry, 'support')?.name || 'Support'}` : ''}
                  </option>
                )) : (
                  <option value="">No defender army list units</option>
                )}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => addBattlefieldArmyListEntryInstance('defender')}
              disabled={!battlefieldAddDefenderArmyListEntryId}
            >
              Deploy Defender
            </button>
          </div>

          <div className="sim-game-panel">
            <div className="sim-game-status">
              <div>
                <p className="kicker">Sim Game</p>
                <h3>Battle Round {gameBattleRound}</h3>
                <p>
                  {gameActivePlayer} is resolving {activeGamePhase?.name || 'the current step'}.
                </p>
              </div>
              <div className="sim-game-progress">
                <strong>{gameTurnProgressPercent}%</strong>
                <span>{completedGameStepCount}/{turnSequence.length} steps complete this player turn</span>
              </div>
            </div>

            <div className="sim-game-track" aria-label="Sim game round sequence">
              {turnSequence.map((phase, index) => {
                const active = phase.id === activeGamePhase?.id
                const complete = completedGamePhases.has(phase.id)
                const available = complete || active || index <= activeGamePhaseIndex
                return (
                  <button
                    key={phase.id}
                    type="button"
                    className={`sim-game-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}
                    onClick={() => setActiveGamePhaseId(phase.id)}
                    disabled={!available}
                  >
                    <span>{phase.sequence}</span>
                    <strong>{phase.name}</strong>
                  </button>
                )
              })}
            </div>

            <div className="sim-game-detail-grid">
              <section className={`sim-game-current ${gameStepDetailsExpanded ? 'expanded' : 'collapsed'}`}>
                <div>
                  <p className="kicker">Current Step</p>
                  <h3>{activeGamePhase?.name}</h3>
                  <p>{activeGamePhase?.summary}</p>
                </div>
                {gamePhaseRequirements.length ? (
                  <>
                    <ol>
                      {visibleGamePhaseRequirements.map((ruleText) => (
                        <li key={ruleText}>{ruleText}</li>
                      ))}
                    </ol>
                    {hiddenGamePhaseRequirementCount > 0 || gameStepDetailsExpanded ? (
                      <button
                        type="button"
                        className="sim-game-detail-toggle"
                        onClick={() => setGameStepDetailsExpanded((current) => !current)}
                      >
                        {gameStepDetailsExpanded
                          ? 'Hide details'
                          : `Show all rules (${hiddenGamePhaseRequirementCount} more)`}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="empty-state">No required rule modules are attached to this step yet.</p>
                )}
              </section>

            </div>

            <div className="sim-game-controls">
              <button
                type="button"
                className="secondary-button"
                onClick={goToPreviousGameStep}
                disabled={!gameCanGoBack}
              >
                Back
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={undoLastBattlefieldStep}
                disabled={!battlefieldUndoStack.length}
                title={battlefieldUndoStack[0]?.label ? `Undo ${battlefieldUndoStack[0].label}` : 'Undo last battlefield action'}
              >
                Undo
              </button>
              <button type="button" className="primary-button" onClick={completeCurrentGameStep}>
                {activeGamePhaseIndex < turnSequence.length - 1 ? 'Complete Step' : 'Complete Turn'}
              </button>
              <button type="button" className="secondary-button" onClick={jumpToFreeFormCombat}>
                Open Combat Sim
              </button>
              <button type="button" className="secondary-button" onClick={resetGuidedGame}>
                Reset Game
              </button>
            </div>
          </div>

          <div className="battlefield-board-layout">
            <div className="battlefield-board-shell">
            <div ref={battlefieldBoardRef} className="battlefield-board">
              <div className="battlefield-center-line" />
              {selectedBattlefieldUnit && selectedBattlefieldModelStartPercent && (canChargeOnBattlefield || selectedBattlefieldUnitCanMoveThisPhase) ? (
                <div
                  className="battlefield-range-ring battlefield-move-range-ring"
                  style={{
                    left: `${selectedBattlefieldModelStartPercent.x}%`,
                    top: `${selectedBattlefieldModelStartPercent.y}%`,
                    width: `${(selectedBattlefieldModelMoveDiameter / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                    height: `${(selectedBattlefieldModelMoveDiameter / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                  }}
                />
              ) : null}
              {selectedBattlefieldUnit && selectedBattlefieldModelPercent && selectedBattlefieldUnit.modelCount > 1 ? (
                <>
                  <div
                    className="battlefield-range-ring battlefield-all-models-coherency-range-ring"
                    style={{
                      left: `${selectedBattlefieldModelPercent.x}%`,
                      top: `${selectedBattlefieldModelPercent.y}%`,
                      width: `${(selectedBattlefieldModelAllModelsCoherencyDiameter / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                      height: `${(selectedBattlefieldModelAllModelsCoherencyDiameter / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                    }}
                  />
                  <div
                    className="battlefield-range-ring battlefield-coherency-range-ring"
                    style={{
                      left: `${selectedBattlefieldModelPercent.x}%`,
                      top: `${selectedBattlefieldModelPercent.y}%`,
                      width: `${(selectedBattlefieldModelCoherencyDiameter / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                      height: `${(selectedBattlefieldModelCoherencyDiameter / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                    }}
                  />
                </>
              ) : null}
              {selectedBattlefieldUnit && !battlefieldInEngagementRange ? selectedBattlefieldWeaponRanges.map((weapon, index) => (
                <div
                  key={`${selectedBattlefieldUnit.id}-${weapon.name}`}
                  className={`battlefield-range-ring ${inRangeWeaponNames.includes(formatWeaponName(weapon)) ? 'in-range' : ''}`}
                  style={{
                    left: `${selectedBattlefieldModelPercent?.x ?? battlefieldPositions[selectedBattlefieldUnit.id]?.x ?? selectedBattlefieldUnit.x}%`,
                    top: `${selectedBattlefieldModelPercent?.y ?? battlefieldPositions[selectedBattlefieldUnit.id]?.y ?? selectedBattlefieldUnit.y}%`,
                    width: `${(weapon.totalDiameterInches / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                    height: `${(weapon.totalDiameterInches / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                    zIndex: selectedBattlefieldWeaponRanges.length - index,
                  }}
                />
              )) : null}
              {showBattlefieldRangeLine ? (
                <svg className="battlefield-range-line-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line
                    className="battlefield-range-line"
                    x1={selectedBattlefieldModelPercent?.x ?? battlefieldPositions[selectedBattlefieldUnit.id]?.x ?? selectedBattlefieldUnit.x}
                    y1={selectedBattlefieldModelPercent?.y ?? battlefieldPositions[selectedBattlefieldUnit.id]?.y ?? selectedBattlefieldUnit.y}
                    x2={battlefieldPositions[enemyBattlefieldUnit.id]?.x ?? enemyBattlefieldUnit.x}
                    y2={battlefieldPositions[enemyBattlefieldUnit.id]?.y ?? enemyBattlefieldUnit.y}
                  />
                </svg>
              ) : null}
              {battlefieldUnits.filter((unit) => (
                !battlefieldEmbarkedUnits[unit.id]
                && (battlefieldReserveStatuses[unit.id] || 'deployed') === 'deployed'
              )).map((unit) => {
                const unitModels = battlefieldModelGroups[unit.id] || []
                const lowestModel = unitModels.reduce((lowest, model) => (
                  !lowest || model.y > lowest.y ? model : lowest
                ), null)
                const labelAnchorPercent = lowestModel
                  ? battlefieldInchesToPercent({
                    x: lowestModel.x,
                    y: lowestModel.y + (unit.baseInches / 2) + 0.55,
                  })
                  : battlefieldPositions[unit.id] || unit
                return (
                  <Fragment key={unit.id}>
                    {unitModels.map((model) => {
                      const modelPercent = battlefieldInchesToPercent(model)
                      const canRemoveAsCasualty = battlefieldPendingCasualties?.unitId === unit.id
                      return (
                        <div
                          key={model.id}
                          className={`battlefield-unit battlefield-model-base battlefield-unit-${unit.id} ${model.modelRole !== 'bodyguard' ? `battlefield-model-${model.modelRole}` : ''} ${draggingModelId === model.id ? 'dragging' : ''} ${selectedBattlefieldModel?.id === model.id ? 'selected-model' : ''} ${selectedBattlefieldUnitId === unit.id ? 'selected' : ''} ${canRepositionBattlefieldUnits && !(activeGamePhase?.id === 'movement' && battlefieldMovedUnits[unit.id]) ? '' : 'movement-locked'} ${canRemoveAsCasualty ? 'casualty-selectable' : ''}`}
                          style={{
                            left: `${modelPercent.x}%`,
                            top: `${modelPercent.y}%`,
                            width: `${(unit.baseInches / BATTLEFIELD_WIDTH_INCHES) * 100}%`,
                            height: `${(unit.baseInches / BATTLEFIELD_HEIGHT_INCHES) * 100}%`,
                          }}
                          onPointerDown={handleBattlefieldModelPointerDown(unit.id, model.id)}
                          title={canRemoveAsCasualty ? `Remove ${model.modelName} (${model.modelRole})` : `${model.modelName}${model.modelRole !== 'bodyguard' ? ` (${model.modelRole})` : ''}`}
                        >
                          <div className="battlefield-unit-dot" />
                          {model.modelLabel ? (
                            <div className="battlefield-model-role-badge" aria-label={`${model.modelName} ${model.modelRole}`}>
                              {model.modelLabel}
                            </div>
                          ) : null}
                          <div
                            className="battlefield-unit-facing"
                            style={{
                              transform: `translate(-50%, -100%) rotate(${battlefieldRotations[unit.id] || 0}deg)`,
                            }}
                          />
                        </div>
                      )
                    })}
                    <div
                      className={`battlefield-unit-label-anchor battlefield-unit-${unit.id} ${selectedBattlefieldUnitId === unit.id ? 'selected' : ''} ${draggingModelId || draggingUnitId ? 'compact' : ''}`}
                      style={{
                        left: `${clamp(labelAnchorPercent.x, 2, 98)}%`,
                        top: `${clamp(labelAnchorPercent.y, 2, 96)}%`,
                      }}
                      onPointerDown={handleBattlefieldUnitPointerDown(unit.id)}
                    >
                      <div className="battlefield-unit-label">
                        <strong>{unit.name}</strong>
                      </div>
                    </div>
                  </Fragment>
                )
              })}
              <div className="battlefield-ring-legend" aria-label="Battlefield ring legend">
                <div>
                  <span className="ring-swatch move" />
                  <p>Move range</p>
                </div>
                <div>
                  <span className="ring-swatch coherency-close" />
                  <p>2&quot; coherency</p>
                </div>
                <div>
                  <span className="ring-swatch coherency-all" />
                  <p>9&quot; all-model coherency</p>
                </div>
                <div>
                  <span className="ring-swatch weapon" />
                  <p>Weapon range</p>
                </div>
                <div>
                  <span className="role-swatch leader">L</span>
                  <p>Leader model</p>
                </div>
                <div>
                  <span className="role-swatch support">S</span>
                  <p>Support model</p>
                </div>
              </div>
            </div>
          </div>

            {simulationRuns.length ? (
              <div className="battlefield-combat-results">
                <p className="kicker">Latest Result</p>
                <div className="battlefield-combat-result-grid">
                  <article className="result-card accent">
                    <h3>{simulationRuns[0].result.target.name}</h3>
                    <p>
                      {summaryStats.totalRuns} run{summaryStats.totalRuns === 1 ? '' : 's'}
                    </p>
                    <p>
                      Destroyed: {summaryStats.targetDestroyedCount} ({formatPercent(summaryStats.targetDestroyedCount, summaryStats.totalRuns)})
                    </p>
                  </article>
                  <article className="result-card">
                    <h3>Selected Attack</h3>
                    <p>{selectedBattlefieldCombatant?.attackerDisplayName || 'No combatant selected'}</p>
                    <p>{selectedBattlefieldCombatWeaponLabels.join(', ') || 'No weapons selected'}</p>
                    <p>{selectedBattlefieldCombatant?.defenderDisplayName || 'No target selected'}</p>
                  </article>
                  {simulationRuns[0].result.attack_resolution_plan?.steps?.length ? (
                    <article className="result-card">
                      <h3>Resolve Attacks</h3>
                      {simulationRuns[0].result.attack_resolution_plan.steps.slice(0, 3).map((step, index) => (
                        <p key={`${step.gather_attack_dice.selected_weapon_name}-${index}`}>
                          {step.select_enemy_unit.target_name}: {formatAttackDiceRange(step)} dice with {step.gather_attack_dice.identical_weapon_count} profile{step.gather_attack_dice.identical_weapon_count === 1 ? '' : 's'}
                        </p>
                      ))}
                    </article>
                  ) : null}
                  <article className="result-card">
                    <h3>Hits</h3>
                    <p>
                      Landed: {summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks}
                      {' '}({formatPercent(summaryStats.combat.successfulHitAttacks + summaryStats.combat.autoHitAttacks, summaryStats.combat.attackInstances)})
                    </p>
                    <p>Critical: {summaryStats.combat.criticalHitAttacks}</p>
                    <p>Extra hits: {summaryStats.combat.extraHitsGenerated}</p>
                  </article>
                  <article className="result-card">
                    <h3>Wounds</h3>
                    <p>
                      Successful: {summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds}
                      {' '}({formatPercent(summaryStats.combat.successfulWoundRolls + summaryStats.combat.autoWounds, summaryStats.combat.woundRolls + summaryStats.combat.autoWounds)})
                    </p>
                    <p>Critical: {summaryStats.combat.criticalWounds}</p>
                    <p>Auto-wounds: {summaryStats.combat.autoWounds}</p>
                  </article>
                  <article className="result-card">
                    <h3>Saves</h3>
                    <p>Attempts: {summaryStats.combat.saveAttempts}</p>
                    <p>Failed: {summaryStats.combat.savesFailed} ({formatPercent(summaryStats.combat.savesFailed, summaryStats.combat.saveAttempts)})</p>
                    <p>Unsavable: {summaryStats.combat.unsavableWounds}</p>
                  </article>
                  <article className="result-card battlefield-wound-card">
                    <h3>Damage Tracker</h3>
                    <p>{selectedBattlefieldDamageTarget?.name || 'No target selected'}</p>
                    <div className="battlefield-wound-grid">
                      <label>
                        <span>Damage Inflicted</span>
                        <input
                          type="number"
                          min="0"
                          value={selectedBattlefieldDamageInput}
                          disabled
                          readOnly
                        />
                      </label>
                      <label>
                        <span>Wounds Remaining</span>
                        <input value={selectedBattlefieldWoundsRemaining} disabled readOnly />
                      </label>
                    </div>
                    <p>Starting wounds: {selectedBattlefieldStartingWounds}</p>
                    <div className="rule-chip-row">
                      <span className={selectedBattlefieldDamageTargetStrengthStatus.belowStartingStrength ? 'invalid' : 'valid'}>
                        {selectedBattlefieldDamageTargetStrengthStatus.belowStartingStrength ? 'Below Starting Strength' : 'Starting Strength'}
                      </span>
                      <span className={selectedBattlefieldDamageTargetStrengthStatus.atHalfStrength ? 'invalid' : 'valid'}>
                        {selectedBattlefieldDamageTargetStrengthStatus.atHalfStrength ? 'At Half-strength' : 'Above Half-strength'}
                      </span>
                      <span className={selectedBattlefieldDamageTargetStrengthStatus.belowHalfStrength ? 'invalid' : 'valid'}>
                        {selectedBattlefieldDamageTargetStrengthStatus.belowHalfStrength ? 'Below Half-strength' : 'Not Below Half-strength'}
                      </span>
                      <span className={selectedBattlefieldWoundsRemaining <= 0 ? 'invalid' : 'valid'}>
                        {selectedBattlefieldWoundsRemaining <= 0 ? 'Destroyed' : 'Not Destroyed'}
                      </span>
                    </div>
                    <p>
                      Strength basis: {selectedBattlefieldDamageTargetStrengthStatus.basis === 'wounds'
                        ? 'remaining wounds because starting strength is 1'
                        : 'remaining models because starting strength is 2 or more'}.
                    </p>
                    {battlefieldPendingCasualties ? (
                      <div className="battlefield-casualty-picker">
                        <p>
                          Click {battlefieldPendingCasualties.count} highlighted model{battlefieldPendingCasualties.count === 1 ? '' : 's'} on the board to remove casualties from {pendingBattlefieldCasualtyUnit?.name || 'that unit'}.
                        </p>
                      </div>
                    ) : null}
                  </article>
                  <article className="result-card">
                    <h3>Re-rolls</h3>
                    <p>Hit re-rolls: {summaryStats.combat.hitRerollsUsed}</p>
                    <p>Hit success: {formatPercent(summaryStats.combat.hitRerollSuccesses, summaryStats.combat.hitRerollsUsed)}</p>
                    <p>Wound success: {formatPercent(summaryStats.combat.woundRerollSuccesses, summaryStats.combat.woundRerollsUsed)}</p>
                  </article>
                </div>
              </div>
            ) : null}

            <aside className="sim-game-side phase-resolver-panel">
              <div className="phase-resolver-header">
                <p className="kicker">Phase Resolver</p>
                <h3>{activeGamePhase?.name}</h3>
              </div>
              <div>
                <p className="kicker">Available Modules</p>
                {activeGameModuleIds.length ? (
                  <>
                    <div className="turn-action-grid module-picker compact" role="tablist" aria-label="Available sim game modules">
                      {activeGameModuleIds.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={selectedGameModule === action ? 'active' : ''}
                          onClick={() => setSelectedGameModuleId(action)}
                        >
                          {TURN_ACTION_LABELS[action] || action}
                        </button>
                      ))}
                    </div>
                    {selectedGameModule ? (
                      <article className="module-detail-card compact">
                        <p className="kicker">Selected Module</p>
                        <h3>{TURN_ACTION_LABELS[selectedGameModule] || selectedGameModule}</h3>
                        <p>{TURN_ACTION_DESCRIPTIONS[selectedGameModule] || 'Use this module when resolving this phase step.'}</p>
                      </article>
                      ) : null}
                    </>
                  ) : gameAvailableModuleLabels.length ? (
                  <div className="turn-action-grid">
                    {gameAvailableModuleLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  ) : (
                    <p className="empty-state">Resolve table state manually for this step.</p>
                  )}
                </div>
                {activeGamePhase?.id === 'command' ? (
                  <div className="battlefield-action-summary">
                    <p className="battlefield-action-key"><strong>Command Automation</strong></p>
                    <p><strong>On Complete Step:</strong> both players gain 1 CP.</p>
                    <p><strong>Battle-shock:</strong> the active player&apos;s unit rolls if it is already battle-shocked or at/below Half-strength.</p>
                    <p><strong>Active unit:</strong> {gameActivePlayer === 'Player 1' ? battlefieldUnitMap.attacker?.name : battlefieldUnitMap.defender?.name}.</p>
                  </div>
                ) : null}
                {activeGamePhase?.id === 'movement' && selectedBattlefieldUnit ? (
                  <div className="phase-inline-controls">
                    <p className="kicker">Movement Controls</p>
                    <h3>{selectedBattlefieldUnit.name}</h3>
                    <p>
                      Moved {formatNumber(selectedBattlefieldMoveStatus?.distanceMoved || 0)}&quot;
                      {' '}of {formatNumber(selectedBattlefieldMoveStatus?.maximumDistance ?? selectedBattlefieldUnit.movementInches)}&quot;.
                    </p>
                    <label>
                      <span>Move Type</span>
                      <select
                        value={selectedBattlefieldMoveType}
                        disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                        onChange={(event) => {
                          const nextMoveType = event.target.value
                          setBattlefieldMoveTypes((current) => ({
                            ...current,
                            [selectedBattlefieldUnit.id]: nextMoveType,
                          }))
                          if (nextMoveType === 'remain_stationary') {
                            returnBattlefieldUnitToMoveStart()
                          }
                        }}
                      >
                        <option value="remain_stationary">Remain Stationary</option>
                        <option value="normal">Normal Move</option>
                        <option value="advance">Advance Move</option>
                        <option value="fall_back">Fall-back Move</option>
                        <option value="surge">Surge Move</option>
                      </select>
                    </label>
                    {selectedBattlefieldMoveType === 'advance' ? (
                      <label>
                        <span>Advance Roll</span>
                        <RollableNumberInput
                          value={selectedBattlefieldAdvanceRoll}
                          min={1}
                          max={6}
                          sides={6}
                          disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                          onChange={(nextRoll) => {
                            setBattlefieldAdvanceRolls((current) => ({
                              ...current,
                              [selectedBattlefieldUnit.id]: nextRoll,
                            }))
                          }}
                        />
                      </label>
                    ) : null}
                    {selectedBattlefieldMoveType === 'surge' ? (
                      <label>
                        <span>Surge Distance</span>
                        <RollableNumberInput
                          value={selectedBattlefieldSurgeDistance}
                          min={1}
                          max={24}
                          sides={6}
                          disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                          onChange={(nextDistance) => {
                            setBattlefieldSurgeDistances((current) => ({
                              ...current,
                              [selectedBattlefieldUnit.id]: nextDistance,
                            }))
                          }}
                        />
                      </label>
                    ) : null}
                    <div className="battlefield-action-entry-controls">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={commitSelectedBattlefieldMove}
                        disabled={!selectedBattlefieldUnitCanMoveThisPhase || !selectedBattlefieldMoveStatus?.valid || !selectedBattlefieldSetupStatus.canSetUp || selectedBattlefieldUnitEmbarked || selectedBattlefieldUnitOffBattlefield}
                      >
                        Commit Move
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          returnBattlefieldUnitToMoveStart()
                        }}
                        disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                      >
                        Return To Start
                      </button>
                    </div>
                    <div className="rule-chip-row">
                      <span className={canMoveOnBattlefield ? 'valid' : 'invalid'}>Movement phase</span>
                      <span className={!selectedBattlefieldUnitMovedThisPhase ? 'valid' : 'invalid'}>{selectedBattlefieldUnitMovedThisPhase ? 'Move committed' : 'Not moved yet'}</span>
                      <span className={selectedBattlefieldMoveStatus?.valid ? 'valid' : 'invalid'}>Legal move</span>
                      <span className={selectedBattlefieldMoveStatus?.eligibleToChargeAfter ? 'valid' : 'invalid'}>Charge later</span>
                      <span className={selectedBattlefieldMoveStatus?.eligibleToStartActionAfter ? 'valid' : 'invalid'}>Action later</span>
                    </div>
                  </div>
                ) : null}
                {activeGamePhase?.id === 'charge' && selectedBattlefieldUnit ? (
                  <div className="phase-inline-controls">
                    <p className="kicker">Charge Controls</p>
                    <h3>{selectedBattlefieldUnit.name}</h3>
                    <p>
                      Target: {enemyBattlefieldUnit?.name || 'No target'}.
                      {' '}Gap: {selectedBattlefieldChargeStatus?.startGap !== null && selectedBattlefieldChargeStatus?.startGap !== undefined
                        ? `${formatNumber(selectedBattlefieldChargeStatus.startGap)}"`
                        : 'n/a'}.
                    </p>
                    <label>
                      <span>Charge Roll</span>
                      <RollableNumberInput
                        value={selectedBattlefieldChargeRoll}
                        min={2}
                        max={12}
                        sides={6}
                        diceCount={2}
                        label="Roll 2D6"
                        disabled={!canChargeOnBattlefield}
                        onChange={(nextRoll) => {
                          setBattlefieldChargeRolls((current) => ({
                            ...current,
                            [selectedBattlefieldUnit.id]: nextRoll,
                          }))
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={commitSelectedBattlefieldCharge}
                      disabled={!canChargeOnBattlefield || !selectedBattlefieldChargeStatus?.chargeCanReach || selectedBattlefieldSetupStatus.violations.includes('friendly_model_overlap') || selectedBattlefieldUnitPerformingAction || selectedBattlefieldUnitEmbarked || selectedBattlefieldUnitOffBattlefield}
                    >
                      Commit Charge
                    </button>
                    <div className="rule-chip-row">
                      <span className={canChargeOnBattlefield ? 'valid' : 'invalid'}>Charge phase</span>
                      <span className={selectedBattlefieldChargeStatus?.targetWithin12 ? 'valid' : 'invalid'}>Target within 12&quot;</span>
                      <span className={selectedBattlefieldChargeStatus?.chargeCanReach ? 'valid' : 'invalid'}>Within charge roll</span>
                      <span className={selectedBattlefieldChargeStatus?.chargedThisTurn ? 'valid' : 'invalid'}>Charged this turn</span>
                    </div>
                  </div>
                ) : null}
                {['shooting', 'fight'].includes(activeGamePhase?.id) ? (
                  <div className="phase-inline-controls">
                    <p className="kicker">{activeGamePhase.id === 'shooting' ? 'Shooting Controls' : 'Fight Controls'}</p>
                    {battlefieldCombatOptions.length ? (
                      <>
                        <label>
                          <span>Attacking Unit</span>
                          <select
                            value={selectedBattlefieldCombatant?.id || ''}
                            onChange={(event) => setBattlefieldCombatAttackerId(event.target.value)}
                          >
                            {battlefieldCombatOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.attackerDisplayName}{' -> '}{option.defenderDisplayName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p>Target: {selectedBattlefieldCombatant?.defenderDisplayName || 'No target selected'}</p>
                        <p className="empty-state compact">
                          {activeGamePhase.id === 'fight' ? 'Eligible fighting models' : 'Eligible firing models'}: {selectedBattlefieldEligibleAttackerModelCount}
                          /{selectedBattlefieldCombatAttackerModels.length}
                        </p>
                        {battlefieldWeaponSelectionLimited ? (
                          <p className="empty-state compact">Non-MONSTER/VEHICLE units can select one ranged weapon profile.</p>
                        ) : null}
                        <div className="phase-inline-weapon-list">
                          {battlefieldCombatWeaponOptions.map((weapon) => {
                            const checked = battlefieldCombatWeaponNames.includes(weapon.name)
                            return (
                              <label key={weapon.name} className="checkbox-row weapon-checkbox">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    setBattlefieldCombatWeaponNames((currentWeaponNames) => (
                                      resolveBattlefieldWeaponSelection(
                                        currentWeaponNames,
                                        weapon,
                                        event.target.checked,
                                        battlefieldCombatWeaponOptions,
                                        battlefieldWeaponSelectionLimited,
                                      )
                                    ))
                                  }}
                                />
                                <span>{formatWeaponName(weapon)}</span>
                              </label>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={handleBattlefieldSimulate}
                          disabled={!selectedBattlefieldCombatant || !selectedBattlefieldCombatWeapons.length || selectedBattlefieldEligibleAttackerModelCount <= 0 || simulating}
                        >
                          {simulating ? 'Running...' : 'Run Battlefield Simulation'}
                        </button>
                      </>
                    ) : (
                      <p className="empty-state">No eligible combatants at the current positions.</p>
                    )}
                  </div>
                ) : null}
                <div className="battlefield-tool-picker" role="tablist" aria-label="Battlefield tools">
                {[
                  ['stratagems', 'Stratagems'],
                  ['actions', 'Actions'],
                  ['transports', 'Transports'],
                  ['reserves', 'Reserves'],
                  ['log', 'Notes / Log'],
                ].map(([toolId, label]) => (
                  <button
                    key={toolId}
                    type="button"
                    className={selectedBattlefieldTool === toolId ? 'active' : ''}
                    onClick={() => setSelectedBattlefieldTool(toolId)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedBattlefieldTool === 'stratagems' ? (
              <div className="battlefield-stratagem-panel">
                <div className="battlefield-cp-grid">
                  <label>
                    <span>Attacker CP</span>
                    <input
                      type="number"
                      min="0"
                      value={battlefieldCommandPoints.attacker}
                      onChange={(event) => {
                        setBattlefieldCommandPoints((current) => ({
                          ...current,
                          attacker: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }}
                    />
                  </label>
                  <label>
                    <span>Defender CP</span>
                    <input
                      type="number"
                      min="0"
                      value={battlefieldCommandPoints.defender}
                      onChange={(event) => {
                        setBattlefieldCommandPoints((current) => ({
                          ...current,
                          defender: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }}
                    />
                  </label>
                </div>
                <label>
                  <span>Stratagem Player</span>
                  <select
                    value={battlefieldStratagemSide}
                    onChange={(event) => setBattlefieldStratagemSide(event.target.value)}
                  >
                    <option value="attacker">Attacker</option>
                    <option value="defender">Defender</option>
                  </select>
                </label>
                <label>
                  <span>Stratagem</span>
                  <select
                    value={selectedBattlefieldStratagem?.name || ''}
                    onChange={(event) => setBattlefieldStratagemName(event.target.value)}
                    disabled={!battlefieldStratagemOptions.length}
                  >
                    {battlefieldStratagemOptions.length ? battlefieldStratagemOptions.map((stratagem) => (
                      <option key={`${getStratagemSource(stratagem)}-${stratagem.name}`} value={stratagem.name}>
                        {stratagem.name} - {getStratagemSource(stratagem)} ({stratagem.cp_cost ?? 1}{stratagem.alternate_cp_cost ? `/${stratagem.alternate_cp_cost}` : ''} CP)
                      </option>
                    )) : (
                      <option value="">No stratagem available</option>
                    )}
                  </select>
                </label>
                {selectedBattlefieldStratagem?.name === 'Heroic Intervention' ? (
                  <label>
                    <span>Heroic Mode</span>
                    <select
                      value={battlefieldHeroicInterventionMode}
                      onChange={(event) => setBattlefieldHeroicInterventionMode(event.target.value)}
                    >
                      <option value="leap_to_defend">Leap to Defend (1 CP)</option>
                      <option value="into_the_fray">Into the Fray (2 CP)</option>
                    </select>
                  </label>
                ) : null}
                <label>
                  <span>Target Unit</span>
                  <select
                    value={battlefieldStratagemTargetId}
                    onChange={(event) => setBattlefieldStratagemTargetId(event.target.value)}
                  >
                    {battlefieldUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedBattlefieldStratagem ? (
                  <div className="battlefield-stratagem-summary">
                    <p className={`battlefield-stratagem-key ${selectedBattlefieldStratagem.timing_color || 'green'}`}>
                      <strong>{getStratagemSource(selectedBattlefieldStratagem)}</strong>
                      {selectedBattlefieldStratagem.rule_ref ? ` ${selectedBattlefieldStratagem.rule_ref}` : ''}
                      {' '}| {battlefieldStratagemCost} CP | Used in {selectedBattlefieldStratagem.timing_color === 'blue' ? 'your turn' : selectedBattlefieldStratagem.timing_color === 'red' ? "opponent's turn" : 'either player turn'}
                    </p>
                    <p><strong>{selectedBattlefieldStratagem.name}</strong></p>
                    <details className="compact-rule-details">
                      <summary>Show timing, target, and effect</summary>
                      <p><strong>When:</strong> {selectedBattlefieldStratagem.timing || 'Any phase'}</p>
                      <p><strong>Target:</strong> {selectedBattlefieldStratagem.target || 'See stratagem.'}</p>
                      <p><strong>Effect:</strong> {selectedBattlefieldStratagem.effect || 'Resolve manually.'}</p>
                      {selectedBattlefieldStratagem.restrictions?.length ? (
                        <p><strong>Restrictions:</strong> {selectedBattlefieldStratagem.restrictions.join(' ')}</p>
                      ) : null}
                    </details>
                  </div>
                ) : null}
                {battlefieldStratagemViolations.length ? (
                  <ul className="battlefield-stratagem-violations">
                    {battlefieldStratagemViolations.map((violation) => (
                      <li key={violation}>{violation}</li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={useBattlefieldStratagem}
                  disabled={!canUseBattlefieldStratagem}
                >
                  Use Stratagem
                </button>
              </div>
              ) : null}
              {selectedBattlefieldTool === 'actions' ? (
              <div className="battlefield-action-panel">
                <label>
                  <span>Action</span>
                  <select
                    value={selectedBattlefieldAction?.name || ''}
                    onChange={(event) => setBattlefieldActionName(event.target.value)}
                  >
                    {battlefieldActionOptions.map((action) => (
                      <option key={action.id} value={action.name}>
                        {action.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Unit</span>
                  <select
                    value={battlefieldActionTargetId}
                    onChange={(event) => setBattlefieldActionTargetId(event.target.value)}
                  >
                    {battlefieldUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedBattlefieldAction ? (
                  <div className="battlefield-action-summary">
                    <p className="battlefield-action-key">
                      <strong>{selectedBattlefieldAction.source}</strong>
                      {selectedBattlefieldAction.rule_ref ? ` ${selectedBattlefieldAction.rule_ref}` : ''}
                    </p>
                    <p><strong>Starts:</strong> {selectedBattlefieldAction.starts}</p>
                    <p><strong>Units:</strong> {selectedBattlefieldAction.units}</p>
                    <p><strong>Use Limit:</strong> {selectedBattlefieldAction.use_limit}</p>
                    <p><strong>Completes:</strong> {selectedBattlefieldAction.completes}</p>
                    <p><strong>Effect:</strong> {selectedBattlefieldAction.effect}</p>
                    {selectedBattlefieldAction.restrictions?.length ? (
                      <p><strong>Restrictions:</strong> {selectedBattlefieldAction.restrictions.join(' ')}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="rule-chip-row">
                  <span className={selectedBattlefieldActionUnit ? 'valid' : 'invalid'}>On battlefield</span>
                  <span className={!battlefieldBattleShockedUnits[battlefieldActionTargetId] ? 'valid' : 'invalid'}>Not battle-shocked</span>
                  <span className={selectedBattlefieldActionOc > 0 ? 'valid' : 'invalid'}>OC above 0</span>
                  <span className={!selectedBattlefieldActionEngaged || selectedBattlefieldActionIsTitanic ? 'valid' : 'invalid'}>Unengaged or Titanic</span>
                  <span className={battlefieldMoveTypes[battlefieldActionTargetId] !== 'advance' ? 'valid' : 'invalid'}>No Advance this turn</span>
                  <span className={battlefieldMoveTypes[battlefieldActionTargetId] !== 'fall_back' ? 'valid' : 'invalid'}>No Fall Back this turn</span>
                </div>
                {battlefieldActionViolations.length ? (
                  <ul className="battlefield-stratagem-violations">
                    {battlefieldActionViolations.map((violation) => (
                      <li key={violation}>{violation}</li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={startBattlefieldAction}
                  disabled={!canStartBattlefieldAction}
                >
                  Start Action
                </button>
                {battlefieldActionLedger.length ? (
                  <div className="battlefield-action-ledger">
                    <p className="kicker">Action Ledger</p>
                    {battlefieldActionLedger.map((action) => (
                      <div key={action.id} className={`battlefield-action-entry ${action.status}`}>
                        <p>
                          <strong>{action.targetName}</strong> {action.status} {action.actionName}
                          {' '}in BR{action.round} {action.player}.
                        </p>
                        {action.status === 'performing' ? (
                          <p>Until end of turn: not eligible to shoot, and not eligible to declare a charge.</p>
                        ) : null}
                        {action.failedReason ? <p>Reason: {action.failedReason}</p> : null}
                        {action.status === 'performing' ? (
                          <div className="battlefield-action-entry-controls">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => completeBattlefieldAction(action)}
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => failBattlefieldAction(action, 'action was interrupted manually')}
                            >
                              Fail
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              ) : null}
              {selectedBattlefieldTool === 'transports' ? (
              <div className="battlefield-transport-panel">
                <div className="battlefield-cp-grid">
                  <label>
                    <span>Attacker Capacity</span>
                    <input
                      type="number"
                      min="0"
                      value={battlefieldTransportCapacities.attacker}
                      onChange={(event) => {
                        setBattlefieldTransportCapacities((current) => ({
                          ...current,
                          attacker: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }}
                    />
                  </label>
                  <label>
                    <span>Defender Capacity</span>
                    <input
                      type="number"
                      min="0"
                      value={battlefieldTransportCapacities.defender}
                      onChange={(event) => {
                        setBattlefieldTransportCapacities((current) => ({
                          ...current,
                          defender: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }}
                    />
                  </label>
                </div>
                <label>
                  <span>Passenger Unit</span>
                  <select
                    value={battlefieldEmbarkUnitId}
                    onChange={(event) => setBattlefieldEmbarkUnitId(event.target.value)}
                  >
                    {battlefieldUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Transport</span>
                  <select
                    value={battlefieldTransportId}
                    onChange={(event) => setBattlefieldTransportId(event.target.value)}
                  >
                    {battlefieldUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="battlefield-action-summary">
                  <p className="battlefield-action-key"><strong>Transport</strong> 18.01-18.05</p>
                  <p><strong>Capacity:</strong> {selectedTransportOccupiedCapacity}/{selectedTransportCapacity} used, {selectedTransportRemainingCapacity} remaining.</p>
                  <p><strong>Embark:</strong> after a normal, Advance, or Fall Back move, every model must be within 3&quot; of the Transport and capacity must remain.</p>
                  <p><strong>Disembark:</strong> Rapid/Tactical set up within 3&quot;; Combat set up within 6&quot; and requires hazard rolls.</p>
                </div>
                <div className="rule-chip-row">
                  <span className={selectedTransportIsTransport ? 'valid' : 'invalid'}>Transport capacity</span>
                  <span className={selectedEmbarkGap !== null && selectedEmbarkGap <= 3 + 0.001 ? 'valid' : 'invalid'}>Within 3&quot;</span>
                  <span className={selectedTransportRemainingCapacity >= selectedEmbarkUnitCapacityNeed ? 'valid' : 'invalid'}>Capacity remaining</span>
                  <span className={!selectedEmbarkUnitEmbarked ? 'valid' : 'invalid'}>Not embarked</span>
                </div>
                {battlefieldEmbarkViolations.length ? (
                  <ul className="battlefield-stratagem-violations">
                    {battlefieldEmbarkViolations.map((violation) => (
                      <li key={violation}>{violation}</li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={embarkBattlefieldUnit}
                  disabled={!canEmbarkBattlefieldUnit}
                >
                  Embark Unit
                </button>
                <label>
                  <span>Disembark Mode</span>
                  <select
                    value={selectedDisembarkMode}
                    onChange={(event) => {
                      setBattlefieldDisembarkModes((current) => ({
                        ...current,
                        [battlefieldEmbarkUnitId]: event.target.value,
                      }))
                    }}
                  >
                    <option value="rapid">Rapid Disembark (3&quot;)</option>
                    <option value="tactical">Tactical Disembark (3&quot;)</option>
                    <option value="combat">Combat Disembark (6&quot;)</option>
                  </select>
                </label>
                {battlefieldDisembarkViolations.length ? (
                  <ul className="battlefield-stratagem-violations">
                    {battlefieldDisembarkViolations.map((violation) => (
                      <li key={violation}>{violation}</li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={disembarkBattlefieldUnit}
                  disabled={!canDisembarkBattlefieldUnit}
                >
                  Disembark Unit
                </button>
                {Object.keys(battlefieldEmbarkedUnits).length ? (
                  <div className="battlefield-action-ledger">
                    <p className="kicker">Embarked Units</p>
                    {Object.entries(battlefieldEmbarkedUnits).map(([unitId, transportId]) => (
                      <div key={`${unitId}-${transportId}`} className="battlefield-action-entry">
                        <p>
                          <strong>{battlefieldUnitMap[unitId]?.name || unitId}</strong>
                          {' '}inside {battlefieldUnitMap[transportId]?.name || transportId}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              ) : null}
              {selectedBattlefieldTool === 'reserves' ? (
              <div className="battlefield-reserve-panel">
                <label>
                  <span>Reserve Unit</span>
                  <select
                    value={battlefieldReserveUnitId}
                    onChange={(event) => setBattlefieldReserveUnitId(event.target.value)}
                  >
                    {battlefieldUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Ingress Edge</span>
                  <select
                    value={selectedReserveIngressEdge}
                    onChange={(event) => {
                      setBattlefieldIngressEdges((current) => ({
                        ...current,
                        [battlefieldReserveUnitId]: event.target.value,
                      }))
                    }}
                  >
                    <option value="left">Left edge</option>
                    <option value="right">Right edge</option>
                    <option value="top">Top edge</option>
                    <option value="bottom">Bottom edge</option>
                    {selectedReserveHasDeepStrike ? (
                      <option value="deep_strike">Deep Strike</option>
                    ) : null}
                  </select>
                </label>
                <div className="battlefield-action-summary">
                  <p className="battlefield-action-key"><strong>Strategic Reserves</strong> 20.01-20.04</p>
                  <p><strong>Status:</strong> {selectedReserveUnitStatus === 'deployed' ? 'On battlefield' : selectedReserveUnitStatus}.</p>
                  <p><strong>Ingress:</strong> set up within 6&quot; of a battlefield edge and more than 8&quot; from enemy units. Arrives from battle round 2 onwards.</p>
                  {selectedReserveHasDeepStrike ? (
                    <p><strong>Deep Strike:</strong> when this unit makes an Ingress move, it can be set up anywhere more than 8&quot; from enemy units, including the opponent&apos;s deployment zone.</p>
                  ) : null}
                  <p><strong>Repositioned:</strong> persistent effects remain, and a unit set up after an Advance, Fall Back, or Disembark still counts as having made that move.</p>
                </div>
                <div className="rule-chip-row">
                  <span className={selectedReserveUnitStatus === 'deployed' ? 'valid' : 'invalid'}>On battlefield</span>
                  <span className={['strategic', 'repositioned'].includes(selectedReserveUnitStatus) ? 'valid' : 'invalid'}>In reserves</span>
                  <span className={gameBattleRound >= 2 ? 'valid' : 'invalid'}>Round 2+</span>
                  {selectedReserveHasDeepStrike ? (
                    <span className={selectedReserveIngressEdge === 'deep_strike' ? 'valid' : 'invalid'}>Deep Strike ready</span>
                  ) : null}
                  <span className={selectedReserveIngressGap === null || selectedReserveIngressGap > 8 + 0.001 ? 'valid' : 'invalid'}>More than 8&quot;</span>
                </div>
                {battlefieldReserveWarnings.length ? (
                  <ul className="battlefield-stratagem-violations">
                    {battlefieldReserveWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="battlefield-action-entry-controls">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => placeBattlefieldUnitInStrategicReserves('strategic')}
                    disabled={!selectedReserveUnit || selectedReserveUnitEmbarked}
                  >
                    Place In Reserves
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => placeBattlefieldUnitInStrategicReserves('repositioned')}
                    disabled={!selectedReserveUnit || selectedReserveUnitEmbarked}
                  >
                    Reposition
                  </button>
                </div>
                {battlefieldIngressViolations.length ? (
                  <ul className="battlefield-stratagem-violations">
                    {battlefieldIngressViolations.map((violation) => (
                      <li key={violation}>{violation}</li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={ingressBattlefieldReserveUnit}
                  disabled={!canIngressBattlefieldUnit}
                >
                  Ingress Move
                </button>
              </div>
              ) : null}
              {selectedBattlefieldTool === 'log' ? (
              <div className="battlefield-log-panel">
              <label>
                <span>Game Notes</span>
                <textarea
                  value={gameNotes}
                  onChange={(event) => setGameNotes(event.target.value)}
                  placeholder="Objectives, stratagems used, damage reminders..."
                  rows="4"
                />
              </label>
              {gameLogEntries.length ? (
                <div className="sim-game-log">
                  <p className="kicker">Recent Steps</p>
                  {gameLogEntries.slice(0, 5).map((entry) => (
                    <p key={entry.id}>
                      BR{entry.round} {entry.player}: {entry.message}
                    </p>
                  ))}
                </div>
              ) : null}
              {battlefieldUsedStratagems.length ? (
                <div className="sim-game-log">
                  <p className="kicker">Stratagem Ledger</p>
                  {battlefieldUsedStratagems.slice(0, 4).map((entry) => (
                    <p key={entry.id}>
                      BR{entry.round} {entry.phase}: {entry.name} ({entry.source}) on {entry.targetName} (-{entry.cpCost} CP)
                    </p>
                  ))}
                </div>
              ) : null}
              </div>
              ) : null}
            </aside>
           </div>


          {selectedBattlefieldUnit ? (
            <div className="battlefield-charge-panel">
              <div className="battlefield-move-summary">
                <p className="kicker">Charge</p>
                <h3>{selectedBattlefieldUnit.name}</h3>
                <p>
                  Target: {enemyBattlefieldUnit?.name || 'No target'}.
                  {' '}Gap: {selectedBattlefieldChargeStatus?.startGap !== null && selectedBattlefieldChargeStatus?.startGap !== undefined
                    ? `${formatNumber(selectedBattlefieldChargeStatus.startGap)}"`
                    : 'n/a'}.
                </p>
                <p>
                  {canChargeOnBattlefield
                    ? selectedBattlefieldChargeStatus?.valid
                      ? 'Charge move is valid. Commit it before moving to the Fight phase.'
                      : selectedBattlefieldChargeStatus?.chargeCanReach
                        ? 'Charge roll is sufficient. Commit Charge will move the unit into Engagement Range.'
                        : 'Roll 2D6 high enough to reach the target, or move the charging unit into Engagement Range.'
                    : `Charge movement is locked until the Sim Game reaches the Charge phase. Current step: ${activeGamePhase?.name || 'Unknown'}.`}
                </p>
              </div>
              <div className="battlefield-move-options">
                <label>
                  <span>Charge Roll</span>
                  <RollableNumberInput
                    value={selectedBattlefieldChargeRoll}
                    min={2}
                    max={12}
                    sides={6}
                    diceCount={2}
                    label="Roll 2D6"
                    disabled={!canChargeOnBattlefield}
                    onChange={(nextRoll) => {
                      setBattlefieldChargeRolls((current) => ({
                        ...current,
                        [selectedBattlefieldUnit.id]: nextRoll,
                      }))
                    }}
                  />
                </label>
                <label>
                  <span>Charge Target</span>
                  <input value={enemyBattlefieldUnit?.name || 'No enemy unit'} disabled readOnly />
                </label>
              </div>
              <div className="battlefield-move-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={commitSelectedBattlefieldCharge}
                  disabled={!canChargeOnBattlefield || !selectedBattlefieldChargeStatus?.chargeCanReach || selectedBattlefieldSetupStatus.violations.includes('friendly_model_overlap') || selectedBattlefieldUnitPerformingAction || selectedBattlefieldUnitEmbarked || selectedBattlefieldUnitOffBattlefield}
                >
                  Commit Charge
                </button>
              </div>
              <div className="battlefield-move-checks">
                <span className={canChargeOnBattlefield ? 'valid' : 'invalid'}>
                  Charge phase
                </span>
                <span className={selectedBattlefieldChargeStatus?.targetWithin12 ? 'valid' : 'invalid'}>
                  Target within 12&quot;
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('unit_engaged_before_charge') ? 'invalid' : 'valid'}>
                  Started unengaged
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('advanced_this_turn') ? 'invalid' : 'valid'}>
                  No Advance this turn
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('fell_back_this_turn') ? 'invalid' : 'valid'}>
                  No Fall Back this turn
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('aircraft_cannot_charge') ? 'invalid' : 'valid'}>
                  Not Aircraft
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('only_flying_can_charge_aircraft') ? 'invalid' : 'valid'}>
                  Aircraft target legal
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('maximum_distance') ? 'invalid' : 'valid'}>
                  Within charge roll
                </span>
                <span className={selectedBattlefieldChargeStatus?.chargeCanReach ? 'valid' : 'invalid'}>
                  Can reach engagement
                </span>
                <span className={!selectedBattlefieldSetupStatus.violations.includes('friendly_model_overlap') ? 'valid' : 'invalid'}>
                  No friendly overlap
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('must_end_closer_to_charge_target') ? 'invalid' : 'valid'}>
                  Ends closer
                </span>
                <span className={selectedBattlefieldChargeStatus?.violations.includes('must_end_engaged_with_charge_target') ? 'invalid' : 'valid'}>
                  Ends engaged
                </span>
                <span className={battlefieldChargedUnits[selectedBattlefieldUnit.id] ? 'valid' : 'invalid'}>
                  Charged this turn
                </span>
                <span className={!selectedBattlefieldUnitPerformingAction ? 'valid' : 'invalid'}>
                  No action in progress
                </span>
                <span className={!selectedBattlefieldUnitEmbarked ? 'valid' : 'invalid'}>
                  On battlefield
                </span>
                <span className={!selectedBattlefieldUnitOffBattlefield ? 'valid' : 'invalid'}>
                  Not in reserves
                </span>
              </div>
            </div>
          ) : null}

          {selectedBattlefieldUnit ? (
            <div className="battlefield-move-panel">
              <div className="battlefield-move-summary">
                <p className="kicker">Movement</p>
                <h3>{selectedBattlefieldUnit.name}</h3>
                <p>
                  Moved {formatNumber(selectedBattlefieldMoveStatus?.distanceMoved || 0)}"
                  {' '}of {formatNumber(selectedBattlefieldMoveStatus?.maximumDistance ?? selectedBattlefieldUnit.movementInches)}".
                </p>
                <p>
                  {canMoveOnBattlefield
                    ? selectedBattlefieldUnitMovedThisPhase
                      ? 'This unit has committed its move for this Movement phase.'
                      : selectedBattlefieldMoveStatus?.valid
                      ? 'Move is currently legal. Rotation is free.'
                      : 'Move is blocked by the movement rules.'
                    : `Movement is locked until the Sim Game reaches the Movement phase. Current step: ${activeGamePhase?.name || 'Unknown'}.`}
                </p>
              </div>
              <div className="battlefield-move-options">
                <label>
                  <span>Move Type</span>
                  <select
                    value={selectedBattlefieldMoveType}
                    disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                    onChange={(event) => {
                      const nextMoveType = event.target.value
                      setBattlefieldMoveTypes((current) => ({
                        ...current,
                        [selectedBattlefieldUnit.id]: nextMoveType,
                      }))
                      if (nextMoveType === 'remain_stationary') {
                        returnBattlefieldUnitToMoveStart()
                      }
                    }}
                  >
                    <option value="remain_stationary">Remain Stationary</option>
                    <option value="normal">Normal Move</option>
                    <option value="advance">Advance Move</option>
                    <option value="fall_back">Fall-back Move</option>
                    <option value="surge">Surge Move</option>
                  </select>
                </label>
                {selectedBattlefieldMoveType === 'advance' ? (
                  <label>
                    <span>Advance Roll</span>
                    <RollableNumberInput
                      value={selectedBattlefieldAdvanceRoll}
                      min={1}
                      max={6}
                      sides={6}
                      disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                      onChange={(nextRoll) => {
                        setBattlefieldAdvanceRolls((current) => ({
                          ...current,
                          [selectedBattlefieldUnit.id]: nextRoll,
                        }))
                      }}
                    />
                  </label>
                ) : null}
                {selectedBattlefieldMoveType === 'surge' ? (
                  <label>
                    <span>Surge Distance</span>
                    <RollableNumberInput
                      value={selectedBattlefieldSurgeDistance}
                      min={1}
                      max={24}
                      sides={6}
                      disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                      onChange={(nextDistance) => {
                        setBattlefieldSurgeDistances((current) => ({
                          ...current,
                          [selectedBattlefieldUnit.id]: nextDistance,
                        }))
                      }}
                    />
                  </label>
                ) : null}
                {selectedBattlefieldMoveType === 'fall_back' ? (
                  <>
                    <label>
                      <span>Fall-back Mode</span>
                      <select
                        value={selectedBattlefieldFallBackMode}
                        disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                        onChange={(event) => {
                          setBattlefieldFallBackModes((current) => ({
                            ...current,
                            [selectedBattlefieldUnit.id]: event.target.value,
                          }))
                        }}
                      >
                        <option value="ordered_retreat">Ordered Retreat</option>
                        <option value="desperate_escape">Desperate Escape</option>
                      </select>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedBattlefieldBattleShocked}
                        disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                        onChange={(event) => {
                          setBattlefieldBattleShockedUnits((current) => ({
                            ...current,
                            [selectedBattlefieldUnit.id]: event.target.checked,
                          }))
                        }}
                      />
                      <span>Unit is battle-shocked</span>
                    </label>
                  </>
                ) : null}
                {unitHasKeyword(selectedBattlefieldUnitDetails, 'fly') ? (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedBattlefieldTakeToSkies}
                      disabled={!selectedBattlefieldUnitCanMoveThisPhase || !['normal', 'advance', 'fall_back'].includes(selectedBattlefieldMoveType)}
                      onChange={(event) => {
                        setBattlefieldTakeToSkies((current) => ({
                          ...current,
                          [selectedBattlefieldUnit.id]: event.target.checked,
                        }))
                      }}
                    />
                    <span>
                      Take to the skies
                      {unitHasAbility(selectedBattlefieldUnitDetails, 'Hover') ? ' (Hover: no -2")' : ' (-2")'}
                    </span>
                  </label>
                ) : null}
              </div>
              <label className="battlefield-rotation-control">
                <span>Facing</span>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={battlefieldRotations[selectedBattlefieldUnit.id] || 0}
                  disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                  onChange={(event) => {
                    const nextRotation = Number(event.target.value)
                    setBattlefieldRotations((current) => ({
                      ...current,
                      [selectedBattlefieldUnit.id]: nextRotation,
                    }))
                  }}
                />
                <strong>{battlefieldRotations[selectedBattlefieldUnit.id] || 0}°</strong>
              </label>
              <div className="battlefield-move-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={commitSelectedBattlefieldMove}
                  disabled={!selectedBattlefieldUnitCanMoveThisPhase || !selectedBattlefieldMoveStatus?.valid || !selectedBattlefieldSetupStatus.canSetUp || selectedBattlefieldUnitEmbarked || selectedBattlefieldUnitOffBattlefield}
                >
                  Commit Move
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    returnBattlefieldUnitToMoveStart()
                  }}
                  disabled={!selectedBattlefieldUnitCanMoveThisPhase}
                >
                  Return To Start
                </button>
              </div>
              <div className="battlefield-move-checks">
                <span className={canMoveOnBattlefield ? 'valid' : 'invalid'}>
                  Movement phase
                </span>
                <span className={!selectedBattlefieldUnitMovedThisPhase ? 'valid' : 'invalid'}>
                  {selectedBattlefieldUnitMovedThisPhase ? 'Move committed' : 'Not moved yet'}
                </span>
                <span className={!selectedBattlefieldUnitEmbarked ? 'valid' : 'invalid'}>
                  On battlefield
                </span>
                <span className={!selectedBattlefieldUnitOffBattlefield ? 'valid' : 'invalid'}>
                  Not in reserves
                </span>
                <span className={selectedBattlefieldSetupStatus.canSetUp ? 'valid' : 'invalid'}>
                  Set Up
                </span>
                <span className={selectedBattlefieldSetupStatus.coherency.valid ? 'valid' : 'invalid'}>
                  Coherency
                </span>
                <span className={selectedBattlefieldSetupStatus.engagement.unengaged ? 'valid' : 'invalid'}>
                  Unengaged
                </span>
                <span className={selectedBattlefieldMoveStatus?.valid ? 'valid' : 'invalid'}>
                  While Moving
                </span>
                <span className={selectedBattlefieldMoveStatus?.violations.includes('enemy_model') ? 'invalid' : 'valid'}>
                  Enemy bases not crossed
                </span>
                <span className={selectedBattlefieldMoveStatus?.violations.includes('battlefield_edge') ? 'invalid' : 'valid'}>
                  Base inside battlefield
                </span>
                <span className={selectedBattlefieldMoveStatus?.violations.includes('maximum_distance') ? 'invalid' : 'valid'}>
                  Maximum distance
                </span>
                <span className={selectedBattlefieldMoveStatus?.violations.includes('must_be_unengaged_before') ? 'invalid' : 'valid'}>
                  Eligible before move
                </span>
                <span className={selectedBattlefieldMoveStatus?.violations.includes('must_be_engaged_before') ? 'invalid' : 'valid'}>
                  Fall-back eligible
                </span>
                <span className={selectedBattlefieldMoveStatus?.violations.includes('aircraft_must_ingress') ? 'invalid' : 'valid'}>
                  Aircraft movement
                </span>
                {selectedBattlefieldMoveType === 'fall_back' ? (
                  <span className={selectedBattlefieldMoveStatus?.violations.includes('ordered_retreat_requires_not_battle_shocked') ? 'invalid' : 'valid'}>
                    Fall-back mode
                  </span>
                ) : null}
                <span className="valid">Friendly models passable</span>
                <span className={!selectedBattlefieldSetupStatus.violations.includes('friendly_model_overlap') ? 'valid' : 'invalid'}>
                  No friendly overlap
                </span>
                <span className={selectedBattlefieldMoveStatus?.canMoveThroughEnemyModels ? 'valid' : 'invalid'}>
                  Enemy models passable
                </span>
                {selectedBattlefieldMoveStatus?.takeToSkies ? (
                  <span className="valid">Flying path</span>
                ) : null}
                {selectedBattlefieldMoveStatus?.hoverIgnoresSkiesPenalty ? (
                  <span className="valid">Hover ignores -2&quot;</span>
                ) : null}
                {selectedBattlefieldMoveType === 'surge' ? (
                  <>
                    <span className={selectedBattlefieldMoveStatus?.violations.includes('surge_battle_shocked') ? 'invalid' : 'valid'}>
                      Not battle-shocked
                    </span>
                    <span className={selectedBattlefieldMoveStatus?.violations.includes('surge_unit_engaged_before') ? 'invalid' : 'valid'}>
                      Started unengaged
                    </span>
                    <span className={selectedBattlefieldMoveStatus?.violations.includes('surge_not_engaged_with_target') ? 'invalid' : 'valid'}>
                      Ends engaged with target
                    </span>
                    <span className={selectedBattlefieldMoveStatus?.violations.includes('surge_not_closer_to_target') ? 'invalid' : 'valid'}>
                      Ends closer
                    </span>
                  </>
                ) : null}
                {unitIsMonsterOrVehicle(selectedBattlefieldUnitDetails) ? (
                  <span className={selectedBattlefieldMoveStatus?.monsterVehicleMoveThrough ? 'valid' : 'invalid'}>
                    Monster/Vehicle move-through
                  </span>
                ) : null}
                {unitHasAbility(selectedBattlefieldUnitDetails, 'Super-heavy Walker') ? (
                  <span className={selectedBattlefieldMoveStatus?.superHeavyWalkerMoveThrough ? 'valid' : 'invalid'}>
                    Super-heavy Walker
                  </span>
                ) : null}
                {selectedBattlefieldUnit?.hasFrame ? (
                  <span className="valid">Frame model</span>
                ) : null}
                <span className={selectedBattlefieldSetupStatus.coherency.valid ? 'valid' : 'invalid'}>
                  After Moving coherency
                </span>
                <span className={selectedBattlefieldMoveStatus?.eligibleToShootAfter ? 'valid' : 'invalid'}>
                  Shoot later
                </span>
                <span className={selectedBattlefieldMoveStatus?.eligibleToChargeAfter ? 'valid' : 'invalid'}>
                  Charge later
                </span>
                <span className={selectedBattlefieldMoveStatus?.eligibleToStartActionAfter ? 'valid' : 'invalid'}>
                  Start action later
                </span>
                {selectedBattlefieldMoveStatus?.hazardRollsPerModel ? (
                  <span className="invalid">Hazard roll per model</span>
                ) : null}
                {selectedBattlefieldMoveStatus?.battleShockRollAfter ? (
                  <span className="invalid">Battle-shock after move</span>
                ) : null}
              </div>
              {!selectedBattlefieldSetupStatus.canSetUp ? (
                <p className="battlefield-setup-warning">
                  Setup is invalid; this unit would be returned to its original position.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="battlefield-range-summary">
            <p className="kicker">Selected Unit Ranges</p>
            <h3>{selectedBattlefieldUnit?.name || 'No unit selected'}</h3>
            <p>
              {battlefieldClosestModelGapInches === null
                ? 'Select a unit marker to inspect its weapon ranges.'
                : battlefieldInEngagementRange
                  ? `Closest model gap: ${battlefieldClosestModelGapInches.toFixed(1)}". Units are in Engagement Range.`
                  : `Closest model gap: ${battlefieldClosestModelGapInches.toFixed(1)}".`}
            </p>
            {selectedBattlefieldVisibility ? (
              <p>
                Visibility: {selectedBattlefieldVisibility.visible ? 'Visible' : 'Not visible'}
                {selectedBattlefieldVisibility.visible
                  ? ` (${selectedBattlefieldVisibility.fullyVisible ? 'fully visible' : 'partially visible'})`
                  : ''}
              </p>
            ) : null}
            {selectedBattlefieldUnit ? (
              <p>
                Strength: {selectedBattlefieldStrengthStatus.currentModels}/{selectedBattlefieldStrengthStatus.startingModels} model{selectedBattlefieldStrengthStatus.startingModels === 1 ? '' : 's'},
                {' '}{selectedBattlefieldStrengthStatus.currentWounds}/{selectedBattlefieldStrengthStatus.startingWounds} wounds.
                {' '}{selectedBattlefieldStrengthStatus.belowStartingStrength ? 'Below Starting Strength.' : 'At Starting Strength.'}
                {' '}{selectedBattlefieldStrengthStatus.atHalfStrength ? 'At or below Half-strength.' : 'Above Half-strength.'}
              </p>
            ) : null}
            {selectedBattlefieldIsMonsterVehicle ? (
              <p>
                Monster/Vehicle: normal and Advance moves can pass through non-Monster/non-Vehicle enemy models,
                and ranged weapons can be selected while this unit is engaged.
              </p>
            ) : null}
            {unitHasKeyword(selectedBattlefieldUnitDetails, 'fly') ? (
              <p>
                Fly: before a normal, Advance, or Fall Back move, this unit can take to the skies. If it does,
                subtract 2&quot; from maximum distance, ignore vertical distance, and move through models and terrain.
              </p>
            ) : null}
            {unitHasAbility(selectedBattlefieldUnitDetails, 'Hover') ? (
              <p>
                Hover: when this unit takes to the skies, it does not subtract 2&quot; from its maximum move distance.
              </p>
            ) : null}
            {unitHasAbility(selectedBattlefieldUnitDetails, 'Super-heavy Walker') ? (
              <p>
                Super-heavy Walker: normal, Advance, and Fall Back moves can pass through non-Titanic models.
                Terrain height and the optional Mobile keyword are scaffolded for later 3D/terrain support.
              </p>
            ) : null}
            {unitHasAbility(selectedBattlefieldUnitDetails, 'Deep Strike') ? (
              <p>
                Deep Strike: this unit can use the Deep Strike Ingress option while in strategic reserves.
              </p>
            ) : null}
            {getScoutMoveDistance(selectedBattlefieldUnitDetails) > 0 ? (
              <p>
                Scouts {getScoutMoveDistance(selectedBattlefieldUnitDetails)}&quot;: pre-battle scout movement is recorded as an ability for deployment support.
              </p>
            ) : null}
            {getLoneOperativeRange(selectedBattlefieldUnitDetails) > 0 ? (
              <p>
                Lone Operative: this unit cannot be selected as a ranged target unless the attacker is within {getLoneOperativeRange(selectedBattlefieldUnitDetails)}&quot;.
              </p>
            ) : null}
            {getFiringDeckValue(selectedBattlefieldUnitDetails) > 0 ? (
              <p>
                Firing Deck {getFiringDeckValue(selectedBattlefieldUnitDetails)}: transport passenger shooting is recorded here for future transport shooting support.
              </p>
            ) : null}
            {getDeadlyDemiseValue(selectedBattlefieldUnitDetails) > 0 ? (
              <p>
                Deadly Demise {getDeadlyDemiseValue(selectedBattlefieldUnitDetails)}: destruction effects are flagged for later battlefield destruction resolution.
              </p>
            ) : null}
            {selectedBattlefieldUnit?.sourceSide === 'attacker' && attackerAttachedLeaderUnitDetails ? (
              <p>
                Attached unit keywords: this unit is affected by rules that apply to any of its component keywords,
                but its models do not gain keywords they do not already have.
              </p>
            ) : null}
            {unitHasKeyword(selectedBattlefieldUnitDetails, 'aircraft') ? (
              <p>
                Aircraft: this unit must be placed in strategic reserves during deployment, is only eligible to make
                Ingress moves, and cannot declare charges.
              </p>
            ) : null}
            {selectedBattlefieldMoveType === 'surge' ? (
              <p>
                Surge: use the distance from the triggering rule, move toward the closest enemy surge target,
                and end engaged with that target if possible.
              </p>
            ) : null}
            {selectedBattlefieldUnit?.hasFrame ? (
              <p>
                Frame: measure to and from the closest point on this model, and rotation does not count toward movement.
              </p>
            ) : null}
            {battlefieldTargetEngagedMonsterVehicle ? (
              <p>
                Target is an engaged Monster/Vehicle: ranged attacks can target it, but subtract 1 from Hit rolls
                unless the attack is made with a Close-Quarters weapon by a unit engaged with it.
              </p>
            ) : null}
            {!battlefieldInEngagementRange && selectedBattlefieldUnitDetails && selectedBattlefieldWeaponRanges.length === 0 ? (
              <p>
                This unit has no ranged weapon profiles. It can still be eligible to shoot, but it cannot make ranged attacks.
              </p>
            ) : null}
            {battlefieldInEngagementRange ? (
              (selectedBattlefieldMeleeWeapons.length || selectedBattlefieldSidearmWeapons.length || (selectedBattlefieldIsMonsterVehicle && selectedBattlefieldMonsterVehicleRangedWeapons.length)) ? (
                <div className="battlefield-range-list">
                  {selectedBattlefieldMeleeWeapons.map((weapon) => (
                    <div
                      key={`melee-${weapon.name}`}
                      className="battlefield-range-list-item engaged"
                    >
                      <strong>{formatWeaponName(weapon)}</strong>
                      <span>Melee</span>
                    </div>
                  ))}
                  {selectedBattlefieldSidearmWeapons.map((weapon) => (
                    <div
                      key={`sidearm-${weapon.name}`}
                      className="battlefield-range-list-item engaged pistol"
                    >
                      <strong>{formatWeaponName(weapon)}</strong>
                      <span>Close-Quarters</span>
                    </div>
                  ))}
                  {selectedBattlefieldIsMonsterVehicle ? selectedBattlefieldMonsterVehicleRangedWeapons.map((weapon) => (
                    <div
                      key={`monster-vehicle-ranged-${weapon.name}`}
                      className="battlefield-range-list-item engaged"
                    >
                      <strong>{formatWeaponName(weapon)}</strong>
                      <span>Monster/Vehicle ranged</span>
                    </div>
                  )) : null}
                </div>
              ) : (
                <p>No melee, Close-Quarters, or Monster/Vehicle ranged weapons available.</p>
              )
            ) : selectedBattlefieldWeaponRanges.length ? (
              <div className="battlefield-range-list">
                {selectedBattlefieldWeaponRanges.map((weapon) => {
                  const weaponInRange = inRangeWeaponNames.includes(formatWeaponName(weapon))
                  const weaponInHalfRange = halfRangeWeaponNames.includes(formatWeaponName(weapon))
                  return (
                    <div
                      key={`summary-${weapon.name}`}
                      className={`battlefield-range-list-item ${weaponInRange ? 'in-range' : ''}`}
                    >
                      <div className="battlefield-range-list-copy">
                        <strong>{formatWeaponName(weapon)}</strong>
                        {weapon.hasHalfRangeRule ? (
                          <span className={`battlefield-half-range-badge ${weaponInHalfRange ? 'active' : ''}`}>
                            Half Range {weapon.halfRangeInches}"
                          </span>
                        ) : null}
                      </div>
                      <span>{weapon.rangeInches}"</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p>No ranged weapons to display.</p>
            )}
            {!battlefieldInEngagementRange && showBattlefieldRangeLine ? (
              <p>
                In range: {inRangeWeaponNames.join(', ')}
              </p>
            ) : !battlefieldInEngagementRange && battlefieldClosestModelGapInches !== null ? (
              <p>No ranged weapons currently reach the enemy unit.</p>
            ) : null}
            {!battlefieldInEngagementRange && halfRangeWeaponNames.length ? (
              <p>
                Within half range: {halfRangeWeaponNames.join(', ')}
              </p>
            ) : null}
          </div>

          <div className="battlefield-combat-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Battlefield Sim</p>
                <h2>Eligible Combat</h2>
              </div>
            </div>

            {battlefieldCombatOptions.length ? (
              <div className="battlefield-combat-grid">
                <label>
                  <span>Eligible Combatant</span>
                  <select
                    value={battlefieldCombatAttackerId}
                    onChange={(event) => setBattlefieldCombatAttackerId(event.target.value)}
                  >
                    {battlefieldCombatOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.attackerDisplayName}{' -> '}{option.defenderDisplayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Target</span>
                  <input
                    type="text"
                    value={selectedBattlefieldCombatant?.defenderDisplayName || ''}
                    readOnly
                  />
                </label>

                <div className="battlefield-combat-span">
                  <span>Eligible Weapon Profiles</span>
                  <p className="empty-state compact">
                    {activeGamePhase?.id === 'fight' ? 'Eligible fighting models' : 'Eligible firing models'}: {selectedBattlefieldEligibleAttackerModelCount}
                    /{selectedBattlefieldCombatAttackerModels.length}
                  </p>
                </div>

                <div className="weapon-selection-panel battlefield-combat-span">
                  <div className="weapon-selection-header">
                    <span>Battlefield Weapons</span>
                    <span>{battlefieldCombatWeaponNames.length} selected</span>
                  </div>
                  {battlefieldWeaponSelectionLimited ? (
                    <p className="empty-state compact">Non-MONSTER/VEHICLE units can select one ranged weapon profile.</p>
                  ) : null}
                  <div className="weapon-selection-grid">
                    {battlefieldCombatWeaponOptions.map((weapon) => {
                      const checked = battlefieldCombatWeaponNames.includes(weapon.name)
                      return (
                        <label key={weapon.name} className="checkbox-row weapon-checkbox">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setBattlefieldCombatWeaponNames((currentWeaponNames) => (
                                resolveBattlefieldWeaponSelection(
                                  currentWeaponNames,
                                  weapon,
                                  event.target.checked,
                                  battlefieldCombatWeaponOptions,
                                  battlefieldWeaponSelectionLimited,
                                )
                              ))
                            }}
                          />
                          <span>{formatWeaponName(weapon)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button battlefield-combat-button"
                  onClick={handleBattlefieldSimulate}
                  disabled={!selectedBattlefieldCombatant || !selectedBattlefieldCombatWeapons.length || selectedBattlefieldEligibleAttackerModelCount <= 0 || simulating}
                >
                  {simulating ? 'Running Simulations...' : 'Run Battlefield Simulation'}
                </button>
              </div>
            ) : (
              <div className="empty-state compact">
                <p>No eligible combatants at the current positions.</p>
              </div>
            )}

          </div>

          <div className="battlefield-legend">
            {battlefieldUnits.map((unit) => (
              <article key={`${unit.id}-legend`} className="battlefield-legend-card">
                <p className="kicker">{unit.role}</p>
                <h3>{unit.name}</h3>
                <p>{unit.faction || 'Faction not set'}</p>
                <p>Base: {unit.baseMm}mm</p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel placeholder-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Roster</p>
              <h2>Army List</h2>
            </div>
            <p className="army-list-count">
              {armyListEntries.reduce((total, entry) => total + entry.count, 0)} unit
              {armyListEntries.reduce((total, entry) => total + entry.count, 0) === 1 ? '' : 's'}
            </p>
          </div>
          <div className="army-list-builder-panel">
            <label>
              <span>Faction</span>
              <select value={armyListFaction} onChange={(event) => setArmyListFaction(event.target.value)}>
                {factions.map((faction) => (
                  <option key={faction.name} value={faction.name}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Unit</span>
              <select
                value={armyListUnitName}
                onChange={(event) => setArmyListUnitName(event.target.value)}
                disabled={!armyListUnits.length}
              >
                {armyListUnits.map((unit) => (
                  <option key={unit.name} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="primary-button"
              onClick={addSelectedUnitToArmyList}
              disabled={!armyListFaction || !armyListUnitName}
            >
              Add Unit
            </button>
          </div>
          <div className="army-list-save-panel">
            <label>
              <span>Army List Name</span>
              <input
                type="text"
                value={armyListName}
                onChange={(event) => setArmyListName(event.target.value)}
                placeholder="e.g. Deathwing 2K"
              />
            </label>
            <button
              type="button"
              className="primary-button"
              onClick={saveCurrentArmyList}
              disabled={!armyListEntries.length}
            >
              Save Army List
            </button>
            <label>
              <span>Saved Lists</span>
              <select
                value={selectedSavedArmyListId}
                onChange={(event) => setSelectedSavedArmyListId(event.target.value)}
                disabled={!savedArmyLists.length}
              >
                {savedArmyLists.length ? savedArmyLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                )) : (
                  <option value="">No saved lists</option>
                )}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={loadSavedArmyList}
              disabled={!selectedSavedArmyListId}
            >
              Load
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={deleteSavedArmyList}
              disabled={!selectedSavedArmyListId}
            >
              Delete
            </button>
          </div>
          {savedArmyLists.length ? (
            <p className="army-list-saved-summary">
              {savedArmyLists.length} saved list{savedArmyLists.length === 1 ? '' : 's'} stored in this browser.
            </p>
          ) : null}
          {armyListEntries.length ? (
            <div className="army-list-grid">
              {armyListEntries.map((entry) => {
                const expanded = Boolean(expandedArmyListEntries[entry.id])
                return (
                  <article key={entry.id} className={`army-list-card ${expanded ? 'expanded' : 'collapsed'}`}>
                    <div className="army-list-card-header">
                      <div>
                        <p className="kicker">{entry.faction}</p>
                        <h3>{entry.name}</h3>
                      </div>
                      {renderArmyListInlineStats((entry.unitDetails || entry).stats)}
                      <div className="army-list-header-actions">
                        <div className="army-list-quantity">
                          <button
                            type="button"
                            className="secondary-button army-list-quantity-button"
                            onClick={() => updateArmyListEntryCount(entry.id, entry.count - 1)}
                            disabled={entry.count <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="army-list-quantity-input"
                            value={entry.count}
                            onChange={(event) => updateArmyListEntryCount(entry.id, event.target.value)}
                          />
                          <button
                            type="button"
                            className="secondary-button army-list-quantity-button"
                            onClick={() => updateArmyListEntryCount(entry.id, entry.count + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="secondary-button army-list-expand-button"
                          onClick={() => setExpandedArmyListEntries((current) => ({
                            ...current,
                            [entry.id]: !expanded,
                          }))}
                        >
                          {expanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>
                    {expanded ? (
                      <>
                        {renderArmyListEntryCustomization(entry)}
                        {renderArmyWeaponProfiles(entry.unitDetails || entry)}
                        {renderArmyListEntryDetails(entry)}
                      </>
                    ) : null}
                    <div className="army-list-card-actions">
                      <span className="army-list-badge">x{entry.count}</span>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => removeArmyListEntry(entry.id)}
                      >
                        Remove Entry
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>Add units from the Combat page and they will appear here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
