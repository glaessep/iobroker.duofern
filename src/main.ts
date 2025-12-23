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
import { buildBroadcastStatusRequest, buildRemotePairFrames } from './duofern/protocol';
import { getDeviceStateDefinitions, getDeviceTypeName } from './duofern/capabilities';
import { CommandDispatcher } from './duofern/commandDispatcher';

/**
 * Configuration interface for the DuoFern adapter.
 * 
 * @interface DuoFernAdapterConfig
 */
interface DuoFernAdapterConfig {
    port: string;
    code: string;
    [key: string]: string | number | boolean | undefined;
}

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
    private registeredDevices: Set<string> = new Set();
    private isReInitializing: boolean = false;
    private registrationThrottleTimer: NodeJS.Timeout | null = null;
    private pendingDeviceRegistrations: Set<string> = new Set();
    private readonly REGISTRATION_THROTTLE_MS = 2000; // 2 seconds - restarts on each new device
    private registrationRetryCount: number = 0;
    private readonly MAX_REGISTRATION_RETRIES = 3;

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
     * Updates the connection status indicator based on registered devices.
     * Green (true) when at least one device is registered.
     * Yellow (false) when stick is initialized but no devices are registered.
     */
    private updateConnectionStatus(): void {
        const hasDevices = this.registeredDevices.size > 0;
        this.setState('info.connection', hasDevices, true);
        if (hasDevices) {
            this.log.debug(`Connection status: GREEN (${this.registeredDevices.size} device(s) registered)`);
        } else {
            this.log.debug('Connection status: YELLOW (stick initialized but no devices registered)');
        }
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

        // Initialize registeredDevices immediately to prevent race condition
        // where devices send status before 'initialized' event fires
        this.registeredDevices.clear();
        knownDevices.forEach(device => this.registeredDevices.add(device.toUpperCase()));

        this.stick = new DuoFernStick(port, code, knownDevices);

        this.stick.on('log', (level, msg) => {
            if (level === 'info') this.log.info(msg);
            else if (level === 'warn') this.log.warn(msg);
            else if (level === 'error') this.log.error(msg);
            else this.log.debug(msg);
        });

        this.stick.on('initialized', () => {
            this.log.info('DuoFern stick initialized successfully');
            const currentDevices = Array.from(this.registeredDevices);
            this.log.debug(`Stick ready with ${currentDevices.length} registered device(s): ${currentDevices.join(', ')}`);
            this.updateConnectionStatus();
            this.isReInitializing = false;
        });

        this.stick.on('error', (err) => {
            this.log.error(`Stick error: ${err}`);
            this.setState('info.connection', false, true);
            // Reset re-initialization flag on error to prevent permanent blocking
            if (this.isReInitializing) {
                this.log.warn('Resetting re-initialization flag due to error');
                this.isReInitializing = false;
            }
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
     * If a new device is detected (not in registeredDevices), triggers re-initialization
     * to register the device with the stick using SetPairs command.
     * 
     * @private
     * @param {string} frame - The 44-character hex frame received from the stick
     */
    private async handleMessage(frame: string): Promise<void> {
        this.log.debug(`Received message frame: ${frame}`);
        if (frame.startsWith("0FFF0F")) {
            const code = frame.substring(30, 36).toUpperCase();
            this.log.debug(`Status update for device ${code}`);

            // Check if this is a new device that needs to be registered
            // Skip if already registered OR already pending registration
            if (!this.registeredDevices.has(code) && !this.pendingDeviceRegistrations.has(code)) {
                this.log.info(`New device detected: ${code} - scheduling registration`);
                this.scheduleDeviceRegistration(code);
            }

            const status = parseStatus(frame);
            this.log.debug(`Parsed status: ${JSON.stringify(status)}`);
            await this.updateDeviceStates(code, status);
        }
    }

    /**
     * Schedules device registration with adaptive throttling to collect multiple devices.
     * 
     * Instead of immediately re-initializing when a new device appears, this method
     * collects devices over a `this.REGISTRATION_THROTTLE_MS` window (2 seconds).
     * The timer is restarted each time a new device is discovered, ensuring we wait
     * a maximum of 2 seconds after the LAST device before re-initialization.
     * Once the window expires, all pending devices are registered in a single
     * re-initialization along with all already paired devices.
     * 
     * @private
     * @param {string} deviceCode - The 6-digit hex device code to register
     */
    private scheduleDeviceRegistration(deviceCode: string): void {
        const normalizedCode = deviceCode.toUpperCase();
        this.pendingDeviceRegistrations.add(normalizedCode);

        const deviceCount = this.pendingDeviceRegistrations.size;

        // Clear existing timer if present (restart on each new device)
        if (this.registrationThrottleTimer) {
            clearTimeout(this.registrationThrottleTimer);
            this.log.info(`Scheduled registration for ${normalizedCode} (${deviceCount} device${deviceCount > 1 ? 's' : ''} pending, timer restarted)`);
        } else {
            this.log.info(`Scheduled registration for ${normalizedCode} (${deviceCount} device${deviceCount > 1 ? 's' : ''} pending, timer started)`);
        }

        // Set new timer
        this.registrationThrottleTimer = setTimeout(() => {
            this.processPendingRegistrations();
        }, this.REGISTRATION_THROTTLE_MS);
    }

    /**
     * Processes all pending device registrations by re-initializing the stick.
     * 
     * This is necessary because the stick needs to know about all devices via SetPairs
     * commands during initialization. Without this, commands are ACKed but not forwarded.
     * 
     * @private
     * @async
     */
    private async processPendingRegistrations(): Promise<void> {
        if (this.pendingDeviceRegistrations.size === 0) {
            return;
        }

        if (this.isReInitializing) {
            this.log.warn('Re-initialization already in progress, deferring pending registrations');
            // Reschedule for later
            this.registrationThrottleTimer = setTimeout(() => {
                this.processPendingRegistrations();
            }, this.REGISTRATION_THROTTLE_MS);
            return;
        }

        if (!this.stick) {
            this.log.warn('Cannot register devices - stick not initialized');
            this.pendingDeviceRegistrations.clear();
            this.registrationRetryCount = 0;
            return;
        }

        const devicesToRegister = Array.from(this.pendingDeviceRegistrations);
        const attemptNumber = this.registrationRetryCount + 1;
        this.log.info(`Processing registration for ${devicesToRegister.length} device(s): ${devicesToRegister.join(', ')} (attempt ${attemptNumber}/${this.MAX_REGISTRATION_RETRIES})`);

        try {
            this.isReInitializing = true;

            // Add all pending devices to registered set
            // IMPORTANT: registeredDevices contains ALL devices (newly discovered + already paired)
            devicesToRegister.forEach(code => this.registeredDevices.add(code));

            // Clear pending set
            this.pendingDeviceRegistrations.clear();
            this.registrationThrottleTimer = null;

            this.log.info(`Re-initializing stick with ${this.registeredDevices.size} total devices`);
            this.log.debug(`Device list: ${Array.from(this.registeredDevices).join(', ')}`);

            // Re-initialize stick with complete device list (newly discovered + already paired)
            await this.stick.reopen(Array.from(this.registeredDevices));

            this.log.info(`Stick re-initialized successfully with ${devicesToRegister.length} new device(s)`);
            this.updateConnectionStatus();
            // Reset retry count on success
            this.registrationRetryCount = 0;
        } catch (err) {
            this.log.error(`Failed to re-initialize stick (attempt ${this.registrationRetryCount + 1}/${this.MAX_REGISTRATION_RETRIES}): ${err}`);
            // Reset flag to prevent permanent blocking
            this.isReInitializing = false;
            // Remove failed devices from registered list
            devicesToRegister.forEach(code => this.registeredDevices.delete(code));

            // Check retry limit
            this.registrationRetryCount++;
            if (this.registrationRetryCount >= this.MAX_REGISTRATION_RETRIES) {
                this.log.error(`Maximum registration retries (${this.MAX_REGISTRATION_RETRIES}) reached. Giving up on devices: ${devicesToRegister.join(', ')}`);
                this.pendingDeviceRegistrations.clear();
                this.registrationRetryCount = 0;
                return;
            }

            // Re-add to pending for retry with exponential backoff
            devicesToRegister.forEach(code => this.pendingDeviceRegistrations.add(code));
            const backoffDelay = this.REGISTRATION_THROTTLE_MS * Math.pow(2, this.registrationRetryCount - 1);
            this.log.info(`Retrying in ${backoffDelay / 1000} seconds...`);
            this.registrationThrottleTimer = setTimeout(() => {
                this.processPendingRegistrations();
            }, backoffDelay);
        }
    }

    /**
     * Handles device pairing and unpairing events.
     * 
     * Extracts the device code from the frame and updates the device states
     * to reflect the paired/unpaired status. For paired devices, triggers registration.
     * 
     * @private
     * @async
     * @param {string} frame - The pairing/unpairing frame (0602... or 0603...)
     * @param {boolean} paired - True if device was paired, false if unpaired
     */
    private async handlePairing(frame: string, paired: boolean): Promise<void> {
        // 0602... or 0603...
        const code = frame.substring(30, 36).toUpperCase();
        this.log.info(`Device ${code} ${paired ? 'paired' : 'unpaired'}`);

        if (paired) {
            // Register the newly paired device
            if (!this.registeredDevices.has(code)) {
                this.log.info(`Newly paired device ${code} - scheduling registration`);
                this.scheduleDeviceRegistration(code);
            }
            await this.updateDeviceStates(code, { paired: true });
        } else {
            // Mark as unpaired
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
     * @param {Record<string, string | number | boolean>} status - Object containing status key-value pairs from parsed frame
     */
    private async updateDeviceStates(code: string, status: Record<string, string | number | boolean>): Promise<void> {
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

        // Create editable name property with human-readable default
        await this.setObjectNotExistsAsync(`${code}.name`, {
            type: 'state',
            common: {
                name: 'Device Name',
                type: 'string',
                role: 'text',
                read: true,
                write: true,
                def: getDeviceTypeName(code),
            },
            native: {},
        });

        // Get device-specific capability definitions
        const capabilities = getDeviceStateDefinitions(code);

        // Create all state objects based on device-specific capabilities
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
            if (!this.stick.isInitialized) {
                this.log.warn('Stick not fully initialized yet, command queued');
                // Command will still be queued in stick.write()
            }

            this.log.debug(`State change: ${id} = ${state.val}`);

            // Use CommandDispatcher to execute the command
            const result = CommandDispatcher.executeCommand(
                deviceId.toUpperCase(),
                this.config.code.toUpperCase(),
                command,
                state.val
            );

            if (result.success) {
                // Handle single frame commands
                if (result.frame) {
                    this.log.info(`Sending ${command} command to device ${deviceId}`);
                    this.log.debug(`Built command: ${result.frame}`);
                    this.stick.write(result.frame);

                    // Handle moving state updates for movement commands
                    if (command === 'up') {
                        await this.setState(`${deviceId}.moving`, 'up', true);
                    } else if (command === 'down') {
                        await this.setState(`${deviceId}.moving`, 'down', true);
                    } else if (command === 'stop') {
                        await this.setState(`${deviceId}.moving`, 'stop', true);
                    } else if (command === 'position' && typeof state.val === 'number') {
                        // Update moving state based on target vs current position
                        const currentPosition = await this.getStateAsync(`${deviceId}.position`);
                        const currentVal = currentPosition?.val as number || 0;
                        if (state.val > currentVal) {
                            await this.setState(`${deviceId}.moving`, 'down', true);
                        } else if (state.val < currentVal) {
                            await this.setState(`${deviceId}.moving`, 'up', true);
                        } else {
                            await this.setState(`${deviceId}.moving`, 'stop', true);
                        }
                    }
                }

                // Handle multi-frame commands
                if (result.frames) {
                    this.log.info(`Sending ${command} command to device ${deviceId} (${result.frames.length} frames)`);
                    result.frames.forEach((frame) => {
                        this.log.debug(`Built command frame: ${frame}`);
                        this.stick?.write(frame);
                    });
                }

                // Reset button state if needed
                if (result.shouldResetButton) {
                    this.resetButtonState(`${deviceId}.${command}`);
                }
            } else {
                this.log.error(`Failed to execute command ${command} for device ${deviceId}: ${result.error}`);
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

        // Clear registration throttle timer
        if (this.registrationThrottleTimer) {
            clearTimeout(this.registrationThrottleTimer);
            this.registrationThrottleTimer = null;
        }

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
    module.exports = (options: Partial<utils.AdapterOptions> | undefined): DuoFernAdapter => new DuoFernAdapter(options);
} else {
    // Manual start for testing
    startAdapter(undefined);
}
