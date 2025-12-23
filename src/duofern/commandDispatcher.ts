/**
 * @file DuoFern Command Dispatcher
 * 
 * Provides centralized command execution logic that maps ioBroker state changes
 * to DuoFern protocol commands. This eliminates the need for hardcoded command
 * handling in the adapter layer.
 */

import { buildCommand, buildStatusRequest, buildRemotePairFrames } from './protocol';
import { getDeviceStateDefinitions, StateDefinition } from './capabilities';

/**
 * Result of a command execution attempt.
 */
export interface CommandResult {
    /** Whether the command was successfully executed */
    success: boolean;
    /** The protocol frame to send (if successful) */
    frame?: string;
    /** Array of protocol frames for multi-frame commands */
    frames?: string[];
    /** Error message (if unsuccessful) */
    error?: string;
    /** Whether this is a button that should be reset after execution */
    shouldResetButton?: boolean;
}

/**
 * Centralized command dispatcher for DuoFern devices.
 * 
 * Translates high-level commands (state changes) into low-level protocol frames
 * by using capability definitions as the single source of truth.
 */
export class CommandDispatcher {
    /**
     * Execute a command for a device.
     * 
     * @param deviceCode - 6-digit hex device code
     * @param stickCode - 6-digit hex stick code
     * @param commandName - State name (e.g., 'up', 'sunMode', 'position')
     * @param value - Command value (boolean for toggles/buttons, number for levels)
     * @returns Command result with frame(s) or error
     */
    public static executeCommand(
        deviceCode: string,
        stickCode: string,
        commandName: string,
        value: boolean | number | string
    ): CommandResult {
        // Special handling for status request broadcast (uses special frame format)
        if (commandName === 'getStatus' && value === true) {
            const frame = buildStatusRequest(deviceCode);
            return {
                success: true,
                frame,
                shouldResetButton: true,
            };
        }

        // Special handling for remote pair (uses multi-frame sequence)
        if (commandName === 'remotePair' && value === true) {
            const frames = buildRemotePairFrames(deviceCode, '01');
            return {
                success: true,
                frames,
                shouldResetButton: true,
            };
        }

        // Get device capabilities
        const capabilities = getDeviceStateDefinitions(deviceCode);
        const capability = capabilities[commandName];

        if (!capability) {
            return { success: false, error: `Unknown command: ${commandName}` };
        }

        if (!capability.writable) {
            return { success: false, error: `Command ${commandName} is read-only` };
        }

        if (!capability.commandMapping) {
            return { success: false, error: `Command ${commandName} has no protocol mapping` };
        }

        const mapping = capability.commandMapping;
        const frameOpts = { deviceCode, stickCode, channel: '01', suffix: '00' };

        // Derive command type from capability role and data type
        let commandType: 'button' | 'booleanToggle' | 'numericLevel';
        if (capability.role === 'button') {
            commandType = 'button';
        } else if (capability.role === 'level') {
            commandType = 'numericLevel';
        } else if (capability.type === 'boolean') {
            commandType = 'booleanToggle';
        } else {
            return { success: false, error: `Cannot derive command type from role=${capability.role}, type=${capability.type}` };
        }

        try {
            switch (commandType) {
                case 'button':
                    return this.handleButton(mapping, frameOpts, value, capability.role);

                case 'booleanToggle':
                    return this.handleBooleanToggle(mapping, frameOpts, value);

                case 'numericLevel':
                    return this.handleNumericLevel(mapping, frameOpts, value);
            }
        } catch (err) {
            return { success: false, error: String(err) };
        }
    }

    /**
     * Handle button command execution.
     * Buttons require a true value to trigger.
     */
    private static handleButton(
        mapping: StateDefinition['commandMapping'],
        frameOpts: { deviceCode: string; stickCode: string; channel: string; suffix: string },
        value: unknown,
        role: StateDefinition['role']
    ): CommandResult {
        if (value !== true) {
            return { success: false, error: 'Button commands require true value' };
        }

        if (!mapping?.commandTemplate) {
            return { success: false, error: 'Missing command template for button' };
        }

        const frame = buildCommand(mapping.commandTemplate, {}, frameOpts);
        return {
            success: true,
            frame,
            shouldResetButton: role === 'button',
        };
    }

    /**
     * Handle boolean toggle command execution.
     * Maps true → commandOn, false → commandOff.
     */
    private static handleBooleanToggle(
        mapping: StateDefinition['commandMapping'],
        frameOpts: { deviceCode: string; stickCode: string; channel: string; suffix: string },
        value: unknown
    ): CommandResult {
        if (typeof value !== 'boolean') {
            return { success: false, error: 'Boolean toggle requires boolean value' };
        }

        const template = value ? mapping?.commandOn : mapping?.commandOff;
        if (!template) {
            return { success: false, error: 'Missing command template for boolean toggle' };
        }

        const frame = buildCommand(template, {}, frameOpts);
        return { success: true, frame, shouldResetButton: false };
    }

    /**
     * Handle numeric level command execution.
     * Validates range and maps to protocol position value.
     */
    private static handleNumericLevel(
        mapping: StateDefinition['commandMapping'],
        frameOpts: { deviceCode: string; stickCode: string; channel: string; suffix: string },
        value: unknown
    ): CommandResult {
        if (typeof value !== 'number') {
            return { success: false, error: 'Numeric level requires number value' };
        }

        if (value < 0 || value > 100) {
            return { success: false, error: 'Numeric level must be between 0 and 100' };
        }

        if (!mapping?.commandTemplate) {
            return { success: false, error: 'Missing command template for numeric level' };
        }

        const frame = buildCommand(mapping.commandTemplate, { nn: value }, frameOpts);
        return { success: true, frame, shouldResetButton: false };
    }
}
