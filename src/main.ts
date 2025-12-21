/**
 * @file ioBroker DuoFern Adapter Main Module
 * 
 * This module implements the core ioBroker adapter for Rademacher DuoFern devices.
 * It provides the main adapter logic that bridges ioBroker's state management system
 * with the DuoFern USB stick hardware communication layer.
 */

import * as utils from '@iobroker/adapter-core';
import { DuoFernStick } from './duofern/stick';
import { parseStatus } from './duofern/parser';
import { buildCommand, buildRemotePairFrames, buildStatusRequest, buildBroadcastStatusRequest, Commands } from './duofern/protocol';
import { getStateDefinitions } from './duofern/capabilities';

/**
 * Configuration interface for the DuoFern adapter.
 * 
 * @interface DuoFernAdapterConfig
 */
interface DuoFernAdapterConfig {
    port: string;
    code: string;
    [key: string]: any;
}

/**
 * Maps DuoFern device type codes (first two hex digits of device code) to human-readable device names.
 * 
 * This mapping is defined based on the FHEM DuoFern module and represents known DuoFern device types.
 * Currently unused but reserved for future features such as:
 * - Displaying device types in the UI
 * - Automatic device capability detection
 * - Device-specific state/command configurations
 * 
 * Source: https://wiki.fhem.de/wiki/Rademacher_DuoFern
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEVICE_TYPES: { [key: string]: string } = {
    "40": "RolloTron Standard",
    "41": "RolloTron Comfort Slave",
    "42": "Rohrmotor-Aktor",
    "43": "Universalaktor",
    "46": "Steckdosenaktor",
    "47": "Rohrmotor Steuerung",
    "48": "Dimmaktor",
    "49": "Rohrmotor",
    "4A": "Dimmer",
    "4B": "Connect-Aktor",
    "4C": "Troll Basis",
    "4E": "SX5",
    "61": "RolloTron Comfort Master",
    "62": "Unspecified device type (62)",
    "65": "Bewegungsmelder",
    "69": "Umweltsensor",
    "70": "Troll Comfort DuoFern",
    "71": "Troll Comfort DuoFern Light",
    "73": "Raumthermostat",
    "74": "Wandtaster 6fach",
    "A0": "Handsender 6G48",
    "A1": "Handsender 1G48",
    "A2": "Handsender 6G1",
    "A3": "Handsender 1G1",
    "A4": "Wandtaster",
    "A5": "Sonnensensor",
    "A7": "Funksender UP",
    "A8": "HomeTimer",
    "A9": "Sonnen-/Windsensor",
    "AA": "Markisenwaechter",
    "AB": "Rauchmelder",
    "AC": "Fenster-Tuer-Kontakt",
    "AD": "Wandtaster 6fach Bat",
    "AF": "Sonnensensor",
    "E0": "Handzentrale",
    "E1": "Heizkoerperantrieb",
};

/**
 * Main adapter class for ioBroker DuoFern integration.
 * 
 * This class extends the ioBroker Adapter base class and provides the main logic
 * for communicating with DuoFern devices via the USB stick. It handles:
 * - Serial port communication initialization
 * - Device discovery and pairing
 * - Command execution (up, down, stop, position, etc.)
 * - Status updates from devices
 * - State management in ioBroker
 * 
 * @class DuoFernAdapter
 * @extends {utils.Adapter}
 */
export class DuoFernAdapter extends utils.Adapter {
    private stick: DuoFernStick | null = null;
    public declare config: DuoFernAdapterConfig;
    private buttonResetTimers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Creates an instance of DuoFernAdapter.
     * 
     * @param {Partial<utils.AdapterOptions>} [options={}] - Adapter options passed from ioBroker core
     */
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'duofern',
            useFormatDate: true,
            logTransporter: false, // Disable automatic file logging
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Reset a button state to null after a 1-second delay
     * @param stateId - Full state ID (e.g., 'pair', 'deviceId.up')
     */
    private resetButtonState(stateId: string): void {
        // Clear any existing timer for this state
        const existingTimer = this.buttonResetTimers.get(stateId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timer to reset state after 1 second
        const timer = setTimeout(async () => {
            try {
                await this.setState(stateId, null, true);
                this.buttonResetTimers.delete(stateId);
                this.log.debug(`Button state reset: ${stateId}`);
            } catch (err) {
                this.log.error(`Error resetting button state ${stateId}: ${err}`);
            }
        }, 1000);

        this.buttonResetTimers.set(stateId, timer);
    }

    /**
     * Called when the adapter starts up.
     * 
     * Initializes the DuoFern stick connection, loads known devices from ioBroker objects,
     * sets up event handlers, and creates control states for adapter-level operations.
     * Validates configuration (port and stick code) before attempting to connect.
     * 
     * @private
     * @async
     * @returns {Promise<void>}
     */
    private async onReady(): Promise<void> {
        this.log.info('DuoFern adapter starting...');

        const port = this.config.port;
        const code = this.config.code;

        this.log.info(`Configuration: port=${port}, code=${code}`);

        if (!port || !code) {
            const missing: string[] = [];
            if (!port) {
                missing.push('port');
            }
            if (!code) {
                missing.push('code');
            }
            this.log.error(`Configuration error: Missing ${missing.join(' and ')}. Please configure the adapter.`);
            await this.setState('info.connection', false, true);
            return;
        }

        // Validate code format (must be 6F followed by 4 hex digits)
        if (!/^6F[0-9A-Fa-f]{4}$/i.test(code)) {
            this.log.error(`Invalid DuoFern stick code: ${code}. Must be 6 hex digits starting with 6F`);
            await this.setState('info.connection', false, true);
            return;
        }

        // Load known devices from ioBroker objects
        const knownDevices: string[] = [];
        const devices = await this.getDevicesAsync();
        for (const device of devices) {
            // Assuming device ID is the code
            const id = device._id.split('.').pop();
            if (id && /^[0-9A-F]{6}$/i.test(id)) {
                knownDevices.push(id);
            }
        }

        this.stick = new DuoFernStick(port, code, knownDevices);

        this.stick.on('log', (level, msg) => {
            if (level === 'info') this.log.info(msg);
            else if (level === 'warn') this.log.warn(msg);
            else if (level === 'error') this.log.error(msg);
            else this.log.debug(msg);
        });

        this.stick.on('initialized', () => {
            this.log.info('DuoFern stick initialized successfully');
            this.log.debug(`Stick ready with ${knownDevices.length} known devices: ${knownDevices.join(', ')}`);
            this.setState('info.connection', true, true);
        });

        this.stick.on('error', (err) => {
            this.log.error(`Stick error: ${err}`);
            this.setState('info.connection', false, true);
        });

        this.stick.on('message', (frame) => this.handleMessage(frame));
        this.stick.on('paired', (frame) => this.handlePairing(frame, true));
        this.stick.on('unpaired', (frame) => this.handlePairing(frame, false));

        this.log.info(`Opening serial port: ${port}`);

        try {
            await this.stick.open();
            this.log.info(`Serial port ${port} opened successfully`);
        } catch (e) {
            this.log.error(`Failed to open serial port ${port}: ${e instanceof Error ? e.message : String(e)}`);
            this.log.error(`Please check: 1) Port path is correct, 2) Device is connected, 3) User has permissions (run: sudo usermod -a -G dialout $USER)`);
            await this.setState('info.connection', false, true);
            // Don't continue if we can't open the port
            return;
        }

        // Create stick control states
        await this.setObjectNotExistsAsync('pair', {
            type: 'state',
            common: { name: 'Pairing Mode', type: 'boolean', role: 'button', read: false, write: true },
            native: {}
        });
        await this.setObjectNotExistsAsync('unpair', {
            type: 'state',
            common: { name: 'Unpairing Mode', type: 'boolean', role: 'button', read: false, write: true },
            native: {}
        });
        await this.setObjectNotExistsAsync('reopen', {
            type: 'state',
            common: { name: 'Reopen Connection', type: 'boolean', role: 'button', read: false, write: true },
            native: {}
        });

        await this.setObjectNotExistsAsync('remotePairByCode', {
            type: 'state',
            common: { name: 'Remote Pair by Device Code', type: 'string', role: 'text', read: true, write: true },
            native: {}
        });

        await this.setObjectNotExistsAsync('remotePairStatus', {
            type: 'state',
            common: { name: 'Remote Pair Status', type: 'string', role: 'text', read: true, write: false },
            native: {}
        });

        await this.setObjectNotExistsAsync('statusBroadcast', {
            type: 'state',
            common: { name: 'Status Broadcast', type: 'boolean', role: 'button', read: false, write: true },
            native: {}
        });

        this.subscribeStates('*');
    }

    /**
     * Handles incoming message frames from the DuoFern stick.
     * 
     * Processes status update frames (starting with 0FFF0F), extracts the device code,
     * parses the status data, and updates the corresponding ioBroker states.
     * 
     * @private
     * @param {string} frame - The 44-character hex frame received from the stick
     */
    private handleMessage(frame: string) {
        this.log.debug(`Received message frame: ${frame}`);
        if (frame.startsWith("0FFF0F")) {
            const code = frame.substring(30, 36);
            this.log.debug(`Status update for device ${code}`);
            const status = parseStatus(frame);
            this.log.debug(`Parsed status: ${JSON.stringify(status)}`);
            this.updateDeviceStates(code, status);
        }
    }

    /**
     * Handles device pairing and unpairing events.
     * 
     * Extracts the device code from the frame and updates the device states
     * to reflect the paired/unpaired status.
     * 
     * @private
     * @async
     * @param {string} frame - The pairing/unpairing frame (0602... or 0603...)
     * @param {boolean} paired - True if device was paired, false if unpaired
     */
    private async handlePairing(frame: string, paired: boolean) {
        // 0602... or 0603...
        // Code is at 30,6?
        const code = frame.substring(30, 36);
        this.log.info(`Device ${code} ${paired ? 'paired' : 'unpaired'}`);

        if (paired) {
            // Trigger status update or just create device
            await this.updateDeviceStates(code, { paired: true });
        } else {
            // Maybe mark as unpaired or delete?
            await this.updateDeviceStates(code, { paired: false });
        }
    }

    /**
     * Updates or creates ioBroker states for a DuoFern device.
     * 
     * Creates the device object if it doesn't exist, then creates/updates all necessary
     * state objects based on centralized capability definitions from the capabilities module.
     * This eliminates hardcoded state definitions and type guessing.
     * 
     * @private
     * @async
     * @param {string} code - The 6-digit hex device code
     * @param {any} status - Object containing status key-value pairs from parsed frame
     */
    private async updateDeviceStates(code: string, status: any) {
        await this.setObjectNotExistsAsync(code, {
            type: 'device',
            common: {
                name: `DuoFern Device ${code}`,
            },
            native: {},
        });

        // Create read-only code property
        await this.setObjectNotExistsAsync(`${code}.code`, {
            type: 'state',
            common: {
                name: 'Device Code',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setState(`${code}.code`, code, true);

        // Create editable name property
        await this.setObjectNotExistsAsync(`${code}.name`, {
            type: 'state',
            common: {
                name: 'Device Name',
                type: 'string',
                role: 'text',
                read: true,
                write: true,
                def: 'user-defined name',
            },
            native: {},
        });

        // Get capability definitions for this device
        const capabilities = getStateDefinitions();

        // Create all state objects based on capabilities
        for (const [key, def] of Object.entries(capabilities)) {
            await this.setObjectNotExistsAsync(`${code}.${key}`, {
                type: 'state',
                common: {
                    name: def.name,
                    type: def.type,
                    role: def.role,
                    read: def.readable,
                    write: def.writable,
                    unit: def.unit,
                    min: def.min,
                    max: def.max,
                },
                native: {},
            });
        }

        // Check if we have a position change - this indicates movement has completed
        let positionChanged = false;
        if (status.position !== undefined) {
            const currentPosition = await this.getStateAsync(`${code}.position`);
            if (currentPosition?.val !== status.position) {
                positionChanged = true;
            }
        }

        // Update status values received from device
        for (const [key, value] of Object.entries(status)) {
            // Only update states that have capability definitions
            if (capabilities[key]) {
                await this.setState(`${code}.${key}`, value as string | number | boolean, true);
            } else {
                this.log.debug(`Received unknown status field: ${key} = ${value}`);
            }
        }

        // If position changed or we received a moving status from device, reset moving state
        if (positionChanged || status.moving !== undefined) {
            // The parser always returns "stop" for moving (correct behavior), so we use that
            const movingState = status.moving || "stop";
            this.log.debug(`Updating moving state for ${code}: ${movingState} (position changed: ${positionChanged})`);
            await this.setState(`${code}.moving`, movingState, true);
        }
    }

    /**
     * Handles state changes triggered by the user or other adapters.
     * 
     * This is the main command handler that translates ioBroker state changes into
     * DuoFern protocol commands. Handles:
     * - Adapter-level commands (pair, unpair, reopen, statusBroadcast)
     * - Device-level commands (up, down, stop, position, toggle, getStatus)
     * - Mode and automatic settings (sunMode, manualMode, timeAutomatic, etc.)
     * - Device name changes and remote pairing
     * 
     * @private
     * @async
     * @param {string} id - The state ID that changed
     * @param {ioBroker.State | null | undefined} state - The new state value
     * @returns {Promise<void>}
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state || state.ack) return;

        const parts = id.split('.');
        const deviceId = parts[2]; // adapter.instance.device.state
        const command = parts[3];

        if (deviceId === 'pair') {
            if (state.val === true) {
                if (this.stick) {
                    this.stick.pair();
                    this.log.info('Entering pairing mode');
                } else {
                    this.log.warn('Stick not initialized, cannot enter pairing mode');
                }
                // Reset button state after 1 second
                this.resetButtonState('pair');
            } else {
                this.log.debug('Ignoring pairing command - state is not true');
            }
            return;
        }
        if (deviceId === 'unpair') {
            if (state.val === true) {
                if (this.stick) {
                    this.stick.unpair();
                    this.log.info('Entering unpairing mode');
                } else {
                    this.log.warn('Stick not initialized, cannot enter unpairing mode');
                }
                // Reset button state after 1 second
                this.resetButtonState('unpair');
            } else {
                this.log.debug('Ignoring unpairing command - state is not true');
            }
            return;
        }

        if (deviceId === 'reopen') {
            if (state.val === true) {
                if (this.stick) {
                    this.log.info('Reopening connection to DuoFern stick');
                    await this.setState('info.connection', false, true);
                    try {
                        await this.stick.reopen();
                        this.log.info('Connection reopened and reinitialized successfully');
                    } catch (err) {
                        this.log.error(`Failed to reopen connection: ${err instanceof Error ? err.message : String(err)}`);
                    }
                } else {
                    this.log.warn('Stick not initialized, cannot reopen connection');
                }
                // Reset button state after 1 second
                this.resetButtonState('reopen');
            } else {
                this.log.debug('Ignoring reopen command - state is not true');
            }
            return;
        }

        if (deviceId === 'statusBroadcast') {
            if (state.val === true) {
                if (this.stick) {
                    this.log.info('Sending status broadcast request to all devices');
                    const cmd = buildBroadcastStatusRequest();
                    this.log.debug(`Built broadcast status request: ${cmd}`);
                    this.stick.write(cmd);
                } else {
                    this.log.warn('Stick not initialized, cannot send status broadcast');
                }
                // Reset button state after 1 second
                this.resetButtonState('statusBroadcast');
            } else {
                this.log.debug('Ignoring status broadcast command - state is not true');
            }
            return;
        }

        if (deviceId === 'remotePairByCode') {
            const rawCode = (state.val != null ? String(state.val) : '').trim();
            if (rawCode.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(rawCode)) {
                const msg = `Invalid device code for remote pairing: ${state.val}`;
                this.log.warn(msg);
                await this.setState('remotePairStatus', msg, true);
                return;
            }
            const codeVal = rawCode.toUpperCase();
            if (!this.stick) {
                const msg = 'Stick not initialized, cannot remote pair';
                this.log.warn(msg);
                await this.setState('remotePairStatus', msg, true);
                return;
            }
            await this.setState('remotePairStatus', `Sending remote pair for ${codeVal}`, true);
            const frames = buildRemotePairFrames(codeVal);
            frames.forEach((f) => {
                this.log.debug(`Built remote pair frame: ${f}`);
                this.stick?.write(f);
            });
            await this.setState(id, codeVal, true);
            return;
        }

        if (this.stick && deviceId && /^[0-9A-F]{6}$/i.test(deviceId)) {
            // Handle name changes
            if (command === 'name' && typeof state.val === 'string') {
                this.log.info(`Updating device ${deviceId} name to: ${state.val}`);
                await this.extendObjectAsync(deviceId, {
                    common: {
                        name: state.val,
                    },
                });
                await this.setState(id, state.val, true);
                return;
            }

            // Check if stick is ready before sending commands
            if (!(this.stick as any).initialized) {
                this.log.warn('Stick not fully initialized yet, command queued');
                // Command will still be queued in stick.write()
            }

            this.log.debug(`State change: ${id} = ${state.val}`);

            // Build frame options for all device commands
            const frameOpts = {
                deviceCode: deviceId.toUpperCase(),
                stickCode: this.config.code.toUpperCase(),
                channel: "01",
                suffix: "00",
            };

            this.log.debug(`Built frameOpts: ${JSON.stringify(frameOpts)}`);

            if (command === 'up') {
                if (state.val === true) {
                    this.log.info(`Sending UP command to device ${deviceId}`);
                    const cmd = buildCommand(Commands.up, {}, frameOpts);
                    this.log.debug(`Built command: ${cmd}`);
                    this.stick.write(cmd);
                    // Update moving state immediately after sending command
                    await this.setState(`${deviceId}.moving`, 'up', true);
                    // Reset button state after 1 second
                    this.resetButtonState(`${deviceId}.up`);
                } else {
                    this.log.debug(`Ignoring UP command for device ${deviceId} - state is not true`);
                }
            } else if (command === 'down') {
                if (state.val === true) {
                    this.log.info(`Sending DOWN command to device ${deviceId}`);
                    const cmd = buildCommand(Commands.down, {}, frameOpts);
                    this.log.debug(`Built command: ${cmd}`);
                    this.stick.write(cmd);
                    // Update moving state immediately after sending command
                    await this.setState(`${deviceId}.moving`, 'down', true);
                    // Reset button state after 1 second
                    this.resetButtonState(`${deviceId}.down`);
                } else {
                    this.log.debug(`Ignoring DOWN command for device ${deviceId} - state is not true`);
                }
            } else if (command === 'stop') {
                if (state.val === true) {
                    this.log.info(`Sending STOP command to device ${deviceId}`);
                    const cmd = buildCommand(Commands.stop, {}, frameOpts);
                    this.log.debug(`Built command: ${cmd}`);
                    this.stick.write(cmd);
                    // Update moving state immediately after sending command
                    await this.setState(`${deviceId}.moving`, 'stop', true);
                    // Reset button state after 1 second
                    this.resetButtonState(`${deviceId}.stop`);
                } else {
                    this.log.debug(`Ignoring STOP command for device ${deviceId} - state is not true`);
                }
            } else if (command === 'toggle') {
                if (state.val === true) {
                    this.log.info(`Sending TOGGLE command to device ${deviceId}`);
                    const cmd = buildCommand(Commands.toggle, {}, frameOpts);
                    this.log.debug(`Built command: ${cmd}`);
                    this.stick.write(cmd);
                    // Update moving state immediately after sending command
                    const currentPosition = await this.getStateAsync(`${deviceId}.position`);
                    if (currentPosition && typeof currentPosition.val === 'number' && currentPosition.val >= 0) {
                        await this.setState(`${deviceId}.moving`, 'moving', true);
                    }
                    // Reset button state after 1 second
                    this.resetButtonState(`${deviceId}.toggle`);
                } else {
                    this.log.debug(`Ignoring TOGGLE command for device ${deviceId} - state is not true`);
                }
            } else if (command === 'position') {
                const val = state.val as number;
                this.log.info(`Sending POSITION command to device ${deviceId}: ${val}%`);
                const cmd = buildCommand(Commands.position, { nn: val }, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
                // Update moving state based on target vs current position
                const currentPosition = await this.getStateAsync(`${deviceId}.position`);
                const currentVal = currentPosition?.val as number || 0;
                if (val > currentVal) {
                    await this.setState(`${deviceId}.moving`, 'down', true);
                } else if (val < currentVal) {
                    await this.setState(`${deviceId}.moving`, 'up', true);
                } else {
                    await this.setState(`${deviceId}.moving`, 'stop', true);
                }
            } else if (command === 'sunMode') {
                this.log.info(`Sending SUN MODE ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.sunModeOn : Commands.sunModeOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'manualMode') {
                this.log.info(`Sending MANUAL MODE ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.manualModeOn : Commands.manualModeOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'timeAutomatic') {
                this.log.info(`Sending TIME AUTOMATIC ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.timeAutomaticOn : Commands.timeAutomaticOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'sunAutomatic') {
                this.log.info(`Sending SUN AUTOMATIC ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.sunAutomaticOn : Commands.sunAutomaticOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'dawnAutomatic') {
                this.log.info(`Sending DAWN AUTOMATIC ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.dawnAutomaticOn : Commands.dawnAutomaticOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'duskAutomatic') {
                this.log.info(`Sending DUSK AUTOMATIC ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.duskAutomaticOn : Commands.duskAutomaticOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'rainAutomatic') {
                this.log.info(`Sending RAIN AUTOMATIC ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.rainAutomaticOn : Commands.rainAutomaticOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'windAutomatic') {
                this.log.info(`Sending WIND AUTOMATIC ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.windAutomaticOn : Commands.windAutomaticOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'ventilatingMode') {
                this.log.info(`Sending VENTILATING MODE ${state.val ? 'ON' : 'OFF'} command to device ${deviceId}`);
                const cmd = buildCommand(state.val ? Commands.ventilatingModeOn : Commands.ventilatingModeOff, {}, frameOpts);
                this.log.debug(`Built command: ${cmd}`);
                this.stick.write(cmd);
            } else if (command === 'getStatus') {
                if (state.val === true) {
                    this.log.info(`Sending STATUS REQUEST to device ${deviceId}`);
                    const cmd = buildStatusRequest(deviceId);
                    this.log.debug(`Built status request: ${cmd}`);
                    this.stick.write(cmd);
                    // Reset button state after 1 second
                    this.resetButtonState(`${deviceId}.getStatus`);
                } else {
                    this.log.debug(`Ignoring STATUS REQUEST for device ${deviceId} - state is not true`);
                }
            } else if (command === 'remotePair') {
                if (state.val === true) {
                    this.log.info(`Sending REMOTE PAIR to device ${deviceId}`);
                    const frames = buildRemotePairFrames(deviceId);
                    frames.forEach((f) => {
                        this.log.debug(`Built remote pair frame: ${f}`);
                        this.stick?.write(f);
                    });
                    // Reset button state after 1 second
                    this.resetButtonState(`${deviceId}.remotePair`);
                } else {
                    this.log.debug(`Ignoring REMOTE PAIR command for device ${deviceId} - state is not true`);
                }
            }
        }
    }

    /**
     * Called when the adapter is shutting down.
     * 
     * Cleans up resources including button reset timers and closes the serial port connection.
     * 
     * @private
     * @param {() => void} callback - Callback to signal shutdown completion
     * @returns {void}
     */
    private onUnload(callback: () => void): void {
        this.log.info('Shutting down DuoFern adapter...');

        // Clear all button reset timers
        for (const timer of this.buttonResetTimers.values()) {
            clearTimeout(timer);
        }
        this.buttonResetTimers.clear();

        if (this.stick) {
            this.stick.close()
                .then(() => {
                    this.log.info('Serial port closed');
                    callback();
                })
                .catch((err) => {
                    this.log.error(`Error closing serial port: ${err}`);
                    callback();
                });
        } else {
            callback();
        }
    }
}

/**
 * Factory function to create and start the DuoFern adapter instance.
 * 
 * This function is called by ioBroker to instantiate the adapter.
 * 
 * @param {Partial<utils.AdapterOptions> | undefined} options - Adapter options from ioBroker
 * @returns {DuoFernAdapter} The adapter instance
 */
function startAdapter(options: Partial<utils.AdapterOptions> | undefined): DuoFernAdapter {
    return new DuoFernAdapter(options);
}

if (require.main !== module) {
    // Export using the pattern ioBroker expects
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new DuoFernAdapter(options);
} else {
    // Manual start for testing
    startAdapter(undefined);
}
