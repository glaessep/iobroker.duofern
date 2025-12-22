/**
 * @file DuoFern Device Capabilities
 * 
 * Centralizes all state and command definitions for DuoFern devices.
 * This module serves as the single source of truth for device capabilities,
 * deriving metadata from the protocol and parser layers.
 * 
 * By consolidating capability definitions here, we:
 * - Eliminate duplicated knowledge across adapter and protocol layers
 * - Enable automatic discovery of new status fields
 * - Provide proper type safety without runtime guessing
 * - Support device-specific capability filtering (future enhancement)
 */


/**
 * Defines metadata for a device state or command.
 * 
 * This interface describes all properties needed to create ioBroker state objects,
 * including type information, access permissions, and optional constraints.
 * 
 * @interface StateDefinition
 */
export interface StateDefinition {
    /** Human-readable name of the state */
    name: string;

    /** Data type of the state value */
    type: 'number' | 'string' | 'boolean';

    /** ioBroker role defining the semantic meaning and UI representation */
    role: 'button' | 'state' | 'level' | 'indicator' | 'text';

    /** Whether the state can be read by adapters/users */
    readable: boolean;

    /** Whether the state can be written/controlled by adapters/users */
    writable: boolean;

    /** Optional unit of measurement (e.g., '%', '°C') */
    unit?: string;

    /** Optional minimum value for numeric states */
    min?: number;

    /** Optional maximum value for numeric states */
    max?: number;
}

/**
 * Mapping of command names to their display labels.
 * These are user-friendly names shown in the ioBroker UI.
 */
const COMMAND_NAMES: Record<string, string> = {
    up: 'Up',
    down: 'Down',
    stop: 'Stop',
    position: 'Position',
    toggle: 'Toggle',
    remotePair: 'Remote Pair',
    statusRequest: 'Get Status',
    sunModeOn: 'Sun Mode On',
    sunModeOff: 'Sun Mode Off',
    windModeOn: 'Wind Mode On',
    windModeOff: 'Wind Mode Off',
    rainModeOn: 'Rain Mode On',
    rainModeOff: 'Rain Mode Off',
    sunAutomaticOn: 'Sun Automatic On',
    sunAutomaticOff: 'Sun Automatic Off',
    timeAutomaticOn: 'Time Automatic On',
    timeAutomaticOff: 'Time Automatic Off',
    dawnAutomaticOn: 'Dawn Automatic On',
    dawnAutomaticOff: 'Dawn Automatic Off',
    duskAutomaticOn: 'Dusk Automatic On',
    duskAutomaticOff: 'Dusk Automatic Off',
    manualModeOn: 'Manual Mode On',
    manualModeOff: 'Manual Mode Off',
    windAutomaticOn: 'Wind Automatic On',
    windAutomaticOff: 'Wind Automatic Off',
    rainAutomaticOn: 'Rain Automatic On',
    rainAutomaticOff: 'Rain Automatic Off',
    sunPosition: 'Sun Position',
    ventilatingPosition: 'Ventilating Position',
    ventilatingModeOn: 'Ventilating Mode On',
    ventilatingModeOff: 'Ventilating Mode Off',
};

/**
 * Device type categories based on first two hex digits of device code.
 * Determines which capabilities are available for each device type.
 */
const DEVICE_TYPE_CATEGORIES: Record<string, 'blinds' | 'venetianBlinds' | 'gate' | 'actuator' | 'dimmer' | 'sensor' | 'thermostat' | 'remote' | 'unknown'> = {
    // Roller shutters and blinds (simple, no slat control)
    '40': 'blinds', // RolloTron Standard
    '41': 'blinds', // RolloTron Comfort Slave
    '47': 'blinds', // Rohrmotor Steuerung
    '49': 'blinds', // Rohrmotor
    '61': 'blinds', // RolloTron Comfort Master
    '62': 'blinds', // Unspecified device type

    // Venetian blinds (with slat/tilt control)
    '42': 'venetianBlinds', // Rohrmotor-Aktor
    '4B': 'venetianBlinds', // Connect-Aktor
    '4C': 'venetianBlinds', // Troll Basis
    '70': 'venetianBlinds', // Troll Comfort DuoFern

    // Gates and garage doors
    '4E': 'gate', // SX5 Gate Controller

    // Actuators and switches
    '43': 'actuator', // Universalaktor
    '46': 'actuator', // Steckdosenaktor
    '71': 'actuator', // Troll Comfort DuoFern (Light/Switch mode)

    // Dimmers
    '48': 'dimmer', // Dimmaktor
    '4A': 'dimmer', // Dimmer

    // Sensors
    '65': 'sensor', // Bewegungsmelder (motion sensor)
    '69': 'sensor', // Umweltsensor (environmental sensor)
    'A5': 'sensor', // Sonnensensor
    'A9': 'sensor', // Sonnen-/Windsensor
    'AA': 'sensor', // Markisenwaechter
    'AB': 'sensor', // Rauchmelder (smoke detector)
    'AC': 'sensor', // Fenster-Tuer-Kontakt (door/window contact)
    'AF': 'sensor', // Sonnensensor

    // Thermostats
    '73': 'thermostat', // Raumthermostat
    'E1': 'thermostat', // Heizkoerperantrieb

    // Remotes and controllers (minimal states: getStatus for battery, remotePair for pairing)
    '74': 'remote', // Wandtaster 6fach
    'A0': 'remote', // Handsender 6G48
    'A1': 'remote', // Handsender 1G48
    'A2': 'remote', // Handsender 6G1
    'A3': 'remote', // Handsender 1G1
    'A4': 'remote', // Wandtaster
    'A7': 'remote', // Funksender UP
    'A8': 'remote', // HomeTimer
    'AD': 'remote', // Wandtaster 6fach Bat
    'E0': 'remote', // Handzentrale
};

/**
 * Mapping of status field names to their display labels and metadata.
 * Derived from parser.ts statusIds but organized for adapter consumption.
 */
const STATUS_FIELD_META: Record<string, { name: string; writable: boolean }> = {
    moving: { name: 'Moving', writable: false },
    position: { name: 'Position', writable: true },
    sunAutomatic: { name: 'Sun Automatic', writable: true },
    timeAutomatic: { name: 'Time Automatic', writable: true },
    duskAutomatic: { name: 'Dusk Automatic', writable: true },
    dawnAutomatic: { name: 'Dawn Automatic', writable: true },
    manualMode: { name: 'Manual Mode', writable: true },
    runningTime: { name: 'Running Time', writable: false },
    sunPosition: { name: 'Sun Position', writable: true },
    ventilatingPosition: { name: 'Ventilating Position', writable: true },
    ventilatingMode: { name: 'Ventilating Mode', writable: true },
    sunMode: { name: 'Sun Mode', writable: true },
    rainAutomatic: { name: 'Rain Automatic', writable: true },
    windAutomatic: { name: 'Wind Automatic', writable: true },
    reversal: { name: 'Reversal', writable: false },
    rainDirection: { name: 'Rain Direction', writable: false },
    windDirection: { name: 'Wind Direction', writable: false },
    slatRunTime: { name: 'Slat Run Time', writable: false },
    tiltAfterMoveLevel: { name: 'Tilt After Move Level', writable: true },
    tiltInVentPos: { name: 'Tilt In Vent Position', writable: true },
    defaultSlatPos: { name: 'Default Slat Position', writable: true },
    tiltAfterStopDown: { name: 'Tilt After Stop Down', writable: true },
    motorDeadTime: { name: 'Motor Dead Time', writable: false },
    tiltInSunPos: { name: 'Tilt In Sun Position', writable: true },
    slatPosition: { name: 'Slat Position', writable: true },
    blindsMode: { name: 'Blinds Mode', writable: true },
    windMode: { name: 'Wind Mode', writable: true },
    rainMode: { name: 'Rain Mode', writable: true },
    obstacle: { name: 'Obstacle', writable: false },
    block: { name: 'Block', writable: false },
    lightCurtain: { name: 'Light Curtain', writable: false },
    automaticClosing: { name: 'Automatic Closing', writable: true },
    openSpeed: { name: 'Open Speed', writable: true },
    '2000cycleAlarm': { name: '2000 Cycle Alarm', writable: false },
    wicketDoor: { name: 'Wicket Door', writable: false },
    backJump: { name: 'Back Jump', writable: true },
    '10minuteAlarm': { name: '10 Minute Alarm', writable: false },
    light: { name: 'Light', writable: false },
};

/**
 * Extract command capabilities from the protocol layer.
 * 
 * Analyzes the Commands object and generates StateDefinition metadata for each command.
 * Commands are primarily buttons (non-readable, writable actions), with special handling
 * for position-based commands that require numeric input.
 * 
 * @returns {Record<string, StateDefinition>} Command capabilities keyed by command identifier
 */
function getCommandCapabilities(): Record<string, StateDefinition> {
    const capabilities: Record<string, StateDefinition> = {};

    // Basic movement commands - all are buttons
    capabilities.up = {
        name: COMMAND_NAMES.up,
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    capabilities.down = {
        name: COMMAND_NAMES.down,
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    capabilities.stop = {
        name: COMMAND_NAMES.stop,
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    capabilities.toggle = {
        name: COMMAND_NAMES.toggle,
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    // Position is special - it's both a command and status
    // As a command, it's a numeric level control
    capabilities.position = {
        name: COMMAND_NAMES.position,
        type: 'number',
        role: 'level',
        readable: true,
        writable: true,
        unit: '%',
        min: 0,
        max: 100,
    };

    // Level for dimmers (brightness control, similar to position)
    capabilities.level = {
        name: 'Brightness Level',
        type: 'number',
        role: 'level',
        readable: true,
        writable: true,
        unit: '%',
        min: 0,
        max: 100,
    };

    // On/Off commands for switches and dimmers
    capabilities.on = {
        name: 'On',
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    capabilities.off = {
        name: 'Off',
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    // Status request button
    capabilities.getStatus = {
        name: COMMAND_NAMES.statusRequest,
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    // Remote pairing button
    capabilities.remotePair = {
        name: COMMAND_NAMES.remotePair,
        type: 'boolean',
        role: 'button',
        readable: false,
        writable: true,
    };

    return capabilities;
}

/**
 * Infer the data type of a status field based on its mapping.
 * 
 * Analyzes the status mapping type to determine whether the field produces
 * boolean, string, or numeric values.
 * 
 * @param {string | undefined} mapType - The mapping type from statusIds (e.g., 'onOff', 'scale10')
 * @returns {'boolean' | 'string' | 'number'} The inferred data type
 */
function inferTypeFromMapping(mapType: string | undefined): 'boolean' | 'string' | 'number' {
    if (!mapType) {
        return 'number'; // Default for unmapped numeric values
    }

    // Boolean mappings
    if (mapType === 'onOff') {
        return 'string'; // Returns "on" or "off"
    }

    // String/enum mappings
    if (['upDown', 'moving', 'motor', 'closeT', 'openS'].includes(mapType)) {
        return 'string';
    }

    // Numeric scale mappings
    if (mapType.startsWith('scale') || mapType === 'hex') {
        return 'number';
    }

    return 'number';
}

/**
 * Extract status capabilities from the parser layer.
 * 
 * Analyzes the statusIds object to generate StateDefinition metadata for each status field.
 * Type information is inferred from the mapping rules, and writability is determined
 * based on whether the field represents a user-controllable setting.
 * 
 * Note: This function only includes status fields that are commonly used across device types.
 * Device-specific fields can be added in future enhancements.
 * 
 * @returns {Record<string, StateDefinition>} Status capabilities keyed by field name
 */
function getStatusCapabilities(): Record<string, StateDefinition> {
    const capabilities: Record<string, StateDefinition> = {};

    // Iterate through known status fields
    for (const [fieldName, meta] of Object.entries(STATUS_FIELD_META)) {
        const type = inferTypeFromMapping(getStatusFieldMapping(fieldName));

        // Determine role based on field characteristics
        let role: StateDefinition['role'] = 'state';
        if (fieldName === 'position' || fieldName === 'slatPosition') {
            role = 'level';
        } else if (!meta.writable) {
            role = 'indicator';
        }

        // Add unit and constraints for specific fields
        const def: StateDefinition = {
            name: meta.name,
            type: type,
            role: role,
            readable: true,
            writable: meta.writable,
        };

        // Add units and constraints for position-like fields
        if (fieldName === 'position' || fieldName === 'sunPosition' ||
            fieldName === 'ventilatingPosition' || fieldName === 'slatPosition' ||
            fieldName === 'defaultSlatPos') {
            def.unit = '%';
            def.min = 0;
            def.max = 100;
        }

        capabilities[fieldName] = def;
    }

    return capabilities;
}

/**
 * Get the mapping type for a status field.
 * 
 * This is a helper function that would ideally query the parser's statusIds directly,
 * but for now uses a hardcoded mapping to maintain separation of concerns.
 * 
 * @param {string} fieldName - The status field name
 * @returns {string | undefined} The mapping type if defined
 */
function getStatusFieldMapping(fieldName: string): string | undefined {
    const mappings: Record<string, string> = {
        moving: 'moving',
        sunAutomatic: 'onOff',
        timeAutomatic: 'onOff',
        duskAutomatic: 'onOff',
        dawnAutomatic: 'onOff',
        manualMode: 'onOff',
        sunMode: 'onOff',
        ventilatingMode: 'onOff',
        rainAutomatic: 'onOff',
        windAutomatic: 'onOff',
        rainDirection: 'upDown',
        windDirection: 'upDown',
        tiltAfterMoveLevel: 'onOff',
        tiltInVentPos: 'onOff',
        tiltAfterStopDown: 'onOff',
        motorDeadTime: 'motor',
        tiltInSunPos: 'onOff',
        blindsMode: 'onOff',
        windMode: 'onOff',
        rainMode: 'onOff',
        automaticClosing: 'closeT',
        openSpeed: 'openS',
        '2000cycleAlarm': 'onOff',
        wicketDoor: 'onOff',
        backJump: 'onOff',
        '10minuteAlarm': 'onOff',
        light: 'onOff',
    };

    return mappings[fieldName];
}

/**
 * Get all state definitions for DuoFern devices.
 * 
 * Combines command capabilities and status capabilities into a single object.
 * This serves as the central registry of all possible device states.
 * 
 * Future enhancements can add device-type-specific filtering by accepting
 * a deviceCode parameter and using DEVICE_TYPES mapping.
 * 
 * @returns {Record<string, StateDefinition>} Complete state definitions for all capabilities
 */
export function getStateDefinitions(): Record<string, StateDefinition> {
    const commandCaps = getCommandCapabilities();
    const statusCaps = getStatusCapabilities();

    // Merge capabilities, with commands taking precedence over status for overlapping fields
    // (e.g., position is both a command and a status field)
    return {
        ...statusCaps,
        ...commandCaps,
    };
}

/**
 * Get device-specific state definitions based on device type.
 * 
 * Filters the complete state definitions to only include capabilities that are
 * relevant for the specific device type. This prevents creating irrelevant states
 * like 'position' for sensors or 'up/down' for thermostats.
 * 
 * @param {string} deviceCode - The 6-digit hex device code
 * @returns {Record<string, StateDefinition>} Filtered state definitions for the device type
 */
export function getDeviceStateDefinitions(deviceCode: string): Record<string, StateDefinition> {
    const deviceTypeCode = deviceCode.substring(0, 2).toUpperCase();
    const category = DEVICE_TYPE_CATEGORIES[deviceTypeCode] || 'unknown';

    const allCapabilities = getStateDefinitions();
    const filtered: Record<string, StateDefinition> = {};

    // Common capabilities for all devices
    const commonStates = ['getStatus', 'remotePair'];

    // Define which capabilities belong to which device category
    const categoryCapabilities: Record<string, string[]> = {
        'blinds': [
            // Basic movement
            'up', 'down', 'stop', 'toggle', 'position',
            // Status
            'moving', 'sunAutomatic', 'timeAutomatic', 'duskAutomatic', 'dawnAutomatic',
            'manualMode', 'runningTime', 'sunPosition', 'ventilatingPosition', 'ventilatingMode',
            'sunMode', 'rainAutomatic', 'windAutomatic', 'reversal', 'rainDirection', 'windDirection',
            'windMode', 'rainMode'
        ],
        'venetianBlinds': [
            // All basic blind capabilities
            'up', 'down', 'stop', 'toggle', 'position',
            'moving', 'sunAutomatic', 'timeAutomatic', 'duskAutomatic', 'dawnAutomatic',
            'manualMode', 'runningTime', 'sunPosition', 'ventilatingPosition', 'ventilatingMode',
            'sunMode', 'rainAutomatic', 'windAutomatic', 'reversal', 'rainDirection', 'windDirection',
            'windMode', 'rainMode',
            // Plus venetian blind specific features (slat control)
            'slatRunTime', 'tiltAfterMoveLevel', 'tiltInVentPos', 'defaultSlatPos',
            'tiltAfterStopDown', 'motorDeadTime', 'tiltInSunPos', 'slatPosition', 'blindsMode'
        ],
        'gate': [
            // Basic movement (gates/garage doors)
            'up', 'down', 'stop', 'position',
            // Status
            'moving', 'manualMode', 'timeAutomatic', 'ventilatingMode', 'ventilatingPosition',
            // Gate-specific features (SX5 only)
            'obstacle', 'block', 'lightCurtain', 'automaticClosing', 'openSpeed',
            '2000cycleAlarm', 'wicketDoor', 'backJump', '10minuteAlarm', 'light'
        ],
        'actuator': [
            // Switch control (on/off only, no position)
            'on', 'off',
            // Automation modes
            'dawnAutomatic', 'duskAutomatic', 'manualMode',
            'sunAutomatic', 'timeAutomatic', 'sunMode',
            'modeChange', 'stairwellFunction', 'stairwellTime',
            // Triggers
            'dusk', 'dawn'
        ],
        'dimmer': [
            // Dimmer control (brightness level)
            'level', 'on', 'off',
            // Automation modes (same as actuator)
            'dawnAutomatic', 'duskAutomatic', 'manualMode',
            'sunAutomatic', 'timeAutomatic', 'sunMode',
            'modeChange', 'stairwellFunction', 'stairwellTime',
            // Dimmer-specific
            'runningTime', 'intermediateMode', 'intermediateValue',
            'saveIntermediateOnStop',
            // Triggers
            'dusk', 'dawn'
        ],
        'sensor': [
            // Sensors typically only report status, no control
            // Most sensor values come through different channels, not the standard blind protocol
        ],
        'thermostat': [
            // Thermostats have different command structure
            // Typically only basic status reporting through standard protocol
        ],
        'remote': [
            // Remotes get minimal states for status reporting and pairing
            // getStatus: allows querying battery status
            // remotePair: allows pairing other devices
            // No control states (they send commands, don't receive them)
        ],
        'unknown': [
            // For unknown devices, provide basic capabilities
            'up', 'down', 'stop', 'toggle', 'position', 'moving'
        ]
    };

    // Add common states
    for (const state of commonStates) {
        if (allCapabilities[state]) {
            filtered[state] = allCapabilities[state];
        }
    }

    // Add category-specific states
    const allowedStates = categoryCapabilities[category] || [];
    for (const state of allowedStates) {
        if (allCapabilities[state]) {
            filtered[state] = allCapabilities[state];
        }
    }

    return filtered;
}
