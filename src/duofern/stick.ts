/**
 * @file DuoFern USB Stick Communication Handler
 *
 * Manages serial communication with the Rademacher DuoFern USB stick.
 * Handles:
 * - Serial port connection lifecycle
 * - Initialization sequence with device registration
 * - Command queueing with ACK-based flow control
 * - Frame buffering and parsing
 * - Pairing/unpairing operations
 */

import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import { Protocol, buildRemotePair, buildSetDongle, buildSetPairs } from './protocol';

/**
 * DuoFern USB stick communication handler.
 *
 * Extends EventEmitter to provide event-based notifications for:
 * - 'log': Log messages (level, message)
 * - 'error': Error events
 * - 'open': Port opened
 * - 'initialized': Initialization completed successfully
 * - 'frame': Raw frame received
 * - 'message': Status or data message received
 * - 'paired': Device pairing event
 * - 'unpaired': Device unpairing event
 *
 */
export class DuoFernStick extends EventEmitter {
    private port: SerialPort;
    private buffer: string = '';
    private queue: string[] = [];
    private isProcessingQueue: boolean = false;
    private initialized: boolean = false;
    private dongleSerial: string;
    private knownDevices: string[];
    private currentInitStep: string = '';
    private initResponseCallback: ((frame: string) => void) | null = null;
    private queueTimeout: NodeJS.Timeout | null = null;

    /**
     * Creates an instance of DuoFernStick.
     *
     * @param path - Serial port path (e.g., '/dev/ttyUSB0' or 'COM3')
     * @param dongleSerial - 6-character hex serial number of the stick (starts with 6F)
     * @param [knownDevices] - Array of 6-character hex device codes to register during init
     */
    constructor(path: string, dongleSerial: string, knownDevices: string[] = []) {
        super();
        this.dongleSerial = dongleSerial;
        this.knownDevices = knownDevices;
        this.port = new SerialPort({ path, baudRate: 115200, autoOpen: false });

        this.port.on('data', (data: Buffer) => this.handleData(data));
        this.port.on('open', () => this.onOpen());
        this.port.on('error', err => this.emit('error', err));
    }

    /**
     * Opens the serial port connection.
     *
     * Triggers the onOpen() handler which starts the initialization sequence.
     *
     * @async
     * @returns Promise that resolves when port is opened
     * @throws {Error} If port cannot be opened
     */
    public async open(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.port.open(err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Closes the serial port connection.
     *
     * @async
     * @returns Promise that resolves when port is closed
     */
    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.port.isOpen) {
                this.port.close(err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Returns whether the stick has completed its initialization sequence.
     *
     * @returns True if stick is initialized and ready
     */
    public get isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Called when the serial port is opened.
     *
     * Initiates the stick initialization sequence.
     *
     */
    private onOpen(): void {
        this.emit('open');
        void this.startInit();
    }

    /**
     * Handles incoming serial data.
     *
     * Buffers hex data and extracts complete 22-byte (44 hex char) frames.
     *
     * @param data - Raw data from serial port
     */
    private handleData(data: Buffer): void {
        const hex = data.toString('hex').toUpperCase();
        this.buffer += hex;

        while (this.buffer.length >= 44) {
            const frame = this.buffer.substring(0, 44);
            this.buffer = this.buffer.substring(44);
            this.handleFrame(frame);
        }
    }

    /**
     * Processes a complete 44-character hex frame.
     *
     * Handles:
     * - Initialization responses (during init sequence)
     * - ACK frames (to advance command queue)
     * - Message frames (status, pairing events)
     *
     * Automatically sends ACK in response to message frames.
     *
     * @param frame - Complete 44-character hex frame
     */
    private handleFrame(frame: string): void {
        this.emit('log', 'debug', `RX: ${frame}`);
        this.emit('frame', frame);

        // Init mode
        if (this.initResponseCallback) {
            this.emit('log', 'debug', `Init response for ${this.currentInitStep}`);
            this.initResponseCallback(frame);
            return;
        }

        // Normal operation
        const isAck = frame === Protocol.duoACK || Protocol.ackPattern.test(frame);

        if (isAck) {
            // ACK received, advance queue
            this.emit('log', 'debug', 'Received ACK');
            if (this.queueTimeout) {
                clearTimeout(this.queueTimeout);
                this.queueTimeout = null;
            }
            this.processQueue();
        } else {
            // It's a message, send ACK immediately
            this.emit('log', 'debug', 'Received message, sending ACK');
            this.writeRaw(Protocol.duoACK);

            if (Protocol.pairPaired.test(frame)) {
                this.emit('paired', frame);
            } else if (Protocol.pairUnpaired.test(frame)) {
                this.emit('unpaired', frame);
            } else {
                this.emit('message', frame);
            }
        }
    }

    /**
     * Executes the complete initialization sequence.
     *
     * Sends:
     * 1. INIT1 and INIT2 commands
     * 2. SetDongle with stick serial
     * 3. INIT3
     * 4. SetPairs for each known device
     * 5. InitEnd
     * 6. Initial status request
     *
     * Emits 'initialized' event upon successful completion.
     *
     * @async
     * @throws {Error} If initialization fails or times out
     */
    private async startInit(): Promise<void> {
        try {
            this.emit('log', 'info', 'Starting DuoFern stick initialization...');
            this.emit('log', 'debug', 'Sending INIT1');
            await this.sendInitCommand(Protocol.duoInit1, 'INIT1');
            this.emit('log', 'debug', 'Sending INIT2');
            await this.sendInitCommand(Protocol.duoInit2, 'INIT2');

            const setDongle = buildSetDongle(this.dongleSerial);
            this.emit('log', 'debug', `Sending SetDongle with serial ${this.dongleSerial}`);
            await this.sendInitCommand(setDongle, 'SetDongle');
            this.writeRaw(Protocol.duoACK);

            this.emit('log', 'debug', 'Sending INIT3');
            await this.sendInitCommand(Protocol.duoInit3, 'INIT3');
            this.writeRaw(Protocol.duoACK);

            let counter = 0;
            for (const device of this.knownDevices) {
                this.emit('log', 'debug', `Registering device ${device} (counter: ${counter})`);
                const setPairs = buildSetPairs(counter, device);
                await this.sendInitCommand(setPairs, `SetPairs-${device}`);
                this.writeRaw(Protocol.duoACK);
                counter++;
            }

            this.emit('log', 'debug', 'Sending InitEnd');
            await this.sendInitCommand(Protocol.duoInitEnd, 'InitEnd');
            this.writeRaw(Protocol.duoACK);

            this.emit('log', 'debug', 'Requesting initial status from all devices');
            await this.sendInitCommand(Protocol.duoStatusRequest, 'StatusRequest');
            this.writeRaw(Protocol.duoACK);

            this.initialized = true;
            this.emit('initialized');
            this.emit('log', 'info', 'DuoFern stick initialization completed successfully');

            this.processQueue();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.emit('error', new Error(`Init failed: ${errorMsg}`));
        }
    }

    /**
     * Sends an initialization command and waits for response.
     *
     * Uses a promise-based approach with timeout to ensure each init step
     * receives a response before proceeding.
     *
     * @param cmd - 44-character hex command frame
     * @param stepName - Descriptive name for logging
     * @returns Response frame
     * @throws {Error} If timeout (3 seconds) is reached without response
     */
    private sendInitCommand(cmd: string, stepName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.currentInitStep = stepName;

            const timeout = setTimeout(() => {
                this.initResponseCallback = null;
                reject(new Error(`Timeout waiting for ${stepName}`));
            }, 3000);

            this.initResponseCallback = (frame): void => {
                clearTimeout(timeout);
                this.initResponseCallback = null;
                resolve(frame);
            };

            this.writeRaw(cmd);
        });
    }

    /**
     * Queues a command for transmission.
     *
     * Commands are queued and sent one at a time, waiting for ACK before
     * sending the next. If not yet initialized, commands remain queued until
     * initialization completes.
     *
     * @param cmd - 44-character hex command frame
     */
    public write(cmd: string): void {
        this.emit('log', 'debug', `Queuing command: ${cmd}`);
        this.queue.push(cmd);
        if (this.initialized && !this.isProcessingQueue) {
            this.processQueue();
        } else if (!this.initialized) {
            this.emit(
                'log',
                'debug',
                `Command queued, waiting for initialization (queue length: ${this.queue.length})`,
            );
        }
    }

    /**
     * Immediately writes a command to the serial port without queueing.
     *
     * Used internally for ACKs and during initialization.
     *
     * @param cmd - 44-character hex command frame
     */
    private writeRaw(cmd: string): void {
        this.emit('log', 'debug', `TX: ${cmd}  (length: ${cmd.length})`);
        const buf = Buffer.from(cmd, 'hex');
        this.port.write(buf);
    }

    /**
     * Processes the command queue.
     *
     * Sends the next queued command and sets up a timeout to handle missing ACKs.
     * Called when ACK is received or timeout expires.
     *
     */
    private processQueue(): void {
        if (this.queue.length === 0) {
            this.emit('log', 'debug', 'Command queue empty');
            this.isProcessingQueue = false;
            return;
        }

        this.isProcessingQueue = true;
        const cmd = this.queue.shift();
        if (cmd) {
            this.emit('log', 'debug', `Processing queued command (${this.queue.length} remaining)`);
            this.writeRaw(cmd);
            // Set timeout to move to next command if no ACK received
            this.queueTimeout = setTimeout(() => {
                this.emit('log', 'warn', `Timeout waiting for ACK for ${cmd}`);
                this.queueTimeout = null;
                this.processQueue(); // Move to next
            }, 5000);
        }
    }

    /**
     * Starts pairing mode to learn new devices.
     *
     * Press the device's button while in pairing mode to pair it.
     *
     */
    public pair(): void {
        this.write(Protocol.duoStartPair);
    }

    /**
     * Starts unpairing mode to remove devices.
     *
     * Press the device's button while in unpairing mode to unpair it.
     *
     */
    public unpair(): void {
        this.write(Protocol.duoStartUnpair);
    }

    /**
     * Remotely pairs a device without physical button press.
     *
     * @param code - 6-character hex device code to pair
     */
    public remotePair(code: string): void {
        this.write(buildRemotePair(code));
    }

    /**
     * Closes and reopens the connection, re-running initialization.
     *
     * Useful for recovering from communication errors or reinitializing
     * the stick with updated device lists.
     *
     * @async
     * @param [updatedDevices] - Optional updated list of device codes to register
     * @returns Promise that resolves when connection is reopened and reinitialized
     * @throws {Error} If reopen fails
     */
    public async reopen(updatedDevices?: string[]): Promise<void> {
        this.emit('log', 'info', 'Reopening connection to DuoFern stick...');
        const originalDevices = [...this.knownDevices]; // Save original state
        const discardedCommands = [...this.queue];

        try {
            // Update device list if provided
            if (updatedDevices) {
                this.knownDevices = updatedDevices;
                this.emit('log', 'debug', `Updated device list: ${updatedDevices.join(', ')}`);
            }

            // Log discarded commands
            if (discardedCommands.length > 0) {
                this.emit('log', 'warn', `Discarding ${discardedCommands.length} queued command(s) during reopen`);
                discardedCommands.forEach((cmd, idx) => {
                    this.emit('log', 'debug', `Discarded command ${idx + 1}: ${cmd}`);
                });
            }

            // Close existing connection
            await this.close();
            this.initialized = false;
            this.buffer = '';
            this.queue = [];
            this.isProcessingQueue = false;

            // Reopen connection
            await this.open();
            // Note: open() triggers onOpen() which calls startInit()
        } catch (err) {
            // Restore original device list on failure
            this.knownDevices = originalDevices;
            this.emit('log', 'error', `Reopen failed, restored original device list`);
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.emit('error', new Error(`Reopen failed: ${errorMsg}`));
            throw err;
        }
    }
}
