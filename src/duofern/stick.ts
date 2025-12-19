import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import { Protocol, buildSetDongle, buildSetPairs, buildRemotePair } from './protocol';

export class DuoFernStick extends EventEmitter {
    private port: SerialPort;
    private buffer: string = "";
    private queue: string[] = [];
    private isProcessingQueue: boolean = false;
    public initialized: boolean = false;
    private dongleSerial: string;
    private knownDevices: string[];
    private currentInitStep: string = "";
    private initResponseCallback: ((frame: string) => void) | null = null;
    private queueTimeout: NodeJS.Timeout | null = null;

    constructor(path: string, dongleSerial: string, knownDevices: string[] = []) {
        super();
        this.dongleSerial = dongleSerial;
        this.knownDevices = knownDevices;
        this.port = new SerialPort({ path, baudRate: 115200, autoOpen: false });

        this.port.on('data', (data: Buffer) => this.handleData(data));
        this.port.on('open', () => this.onOpen());
        this.port.on('error', (err) => this.emit('error', err));
    }

    public async open(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.port.open((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.port.isOpen) {
                this.port.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private onOpen() {
        this.emit('open');
        this.startInit();
    }

    private handleData(data: Buffer) {
        const hex = data.toString('hex').toUpperCase();
        this.buffer += hex;

        while (this.buffer.length >= 44) {
            const frame = this.buffer.substring(0, 44);
            this.buffer = this.buffer.substring(44);
            this.handleFrame(frame);
        }
    }

    private handleFrame(frame: string) {
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

    private async startInit() {
        try {
            this.emit('log', 'info', 'Starting DuoFern stick initialization...');
            this.emit('log', 'debug', 'Sending INIT1');
            await this.sendInitCommand(Protocol.duoInit1, "INIT1");
            this.emit('log', 'debug', 'Sending INIT2');
            await this.sendInitCommand(Protocol.duoInit2, "INIT2");

            const setDongle = buildSetDongle(this.dongleSerial);
            this.emit('log', 'debug', `Sending SetDongle with serial ${this.dongleSerial}`);
            await this.sendInitCommand(setDongle, "SetDongle");
            this.writeRaw(Protocol.duoACK);

            this.emit('log', 'debug', 'Sending INIT3');
            await this.sendInitCommand(Protocol.duoInit3, "INIT3");
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
            await this.sendInitCommand(Protocol.duoInitEnd, "InitEnd");
            this.writeRaw(Protocol.duoACK);

            this.emit('log', 'debug', 'Requesting initial status from all devices');
            await this.sendInitCommand(Protocol.duoStatusRequest, "StatusRequest");
            this.writeRaw(Protocol.duoACK);

            this.initialized = true;
            this.emit('initialized');
            this.emit('log', 'info', 'DuoFern stick initialization completed successfully');

            this.processQueue();

        } catch (err) {
            this.emit('error', new Error(`Init failed: ${err}`));
        }
    }

    private sendInitCommand(cmd: string, stepName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.currentInitStep = stepName;

            const timeout = setTimeout(() => {
                this.initResponseCallback = null;
                reject(new Error(`Timeout waiting for ${stepName}`));
            }, 3000);

            this.initResponseCallback = (frame) => {
                clearTimeout(timeout);
                this.initResponseCallback = null;
                resolve(frame);
            };

            this.writeRaw(cmd);
        });
    }

    public write(cmd: string) {
        this.emit('log', 'debug', `Queuing command: ${cmd}`);
        this.queue.push(cmd);
        if (this.initialized && !this.isProcessingQueue) {
            this.processQueue();
        } else if (!this.initialized) {
            this.emit('log', 'debug', `Command queued, waiting for initialization (queue length: ${this.queue.length})`);
        }
    }

    private writeRaw(cmd: string) {
        this.emit('log', 'debug', `TX: ${cmd}  (length: ${cmd.length})`);
        const buf = Buffer.from(cmd, 'hex');
        this.port.write(buf);
    }

    private processQueue() {
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
                this.processQueue(); // Move to next
            }, 5000);
        }
    }

    public pair() {
        this.write(Protocol.duoStartPair);
    }

    public unpair() {
        this.write(Protocol.duoStartUnpair);
    }

    public remotePair(code: string) {
        this.write(buildRemotePair(code));
    }

    public async reopen(): Promise<void> {
        this.emit('log', 'info', 'Reopening connection to DuoFern stick...');
        try {
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
            this.emit('error', new Error(`Reopen failed: ${err}`));
            throw err;
        }
    }
}
