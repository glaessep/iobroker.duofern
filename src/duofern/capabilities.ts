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
 * Get device-specific state definitions (future enhancement).
 * 
 * This function is a placeholder for future device-type-specific capability filtering.
 * Currently returns all state definitions regardless of device type.
 * 
 * Future implementation will:
 * - Use the device code's first two digits to identify device type
 * - Filter capabilities based on device capabilities (e.g., blinds vs. thermostats)
 * - Align with statusGroups formats in parser
 * 
 * @param {string} _deviceCode - The 6-digit hex device code (currently unused)
 * @returns {Record<string, StateDefinition>} State definitions for the device
 */
export function getDeviceStateDefinitions(_deviceCode: string): Record<string, StateDefinition> {
    // Future: Implement device-type-specific filtering
    // const deviceType = deviceCode.substring(0, 2);
    // const capabilities = filterByDeviceType(deviceType);
    // return capabilities;

    return getStateDefinitions();
}
