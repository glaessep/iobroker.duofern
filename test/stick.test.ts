/**
 * @file Simplified Stick Test Suite
 * 
 * Unit tests for DuoFern USB stick focusing on achieving >95% code coverage.
 * Uses mocked SerialPort to avoid requiring actual hardware.
 */

import * as assert from 'assert';
import { EventEmitter } from 'events';
import { Protocol } from '../src/duofern/protocol';
import * as Module from 'module';

class MockSerialPort extends EventEmitter {
    public isOpen: boolean = false;
    public writtenData: Buffer[] = [];
    public options: any;

    constructor(options: any) {
        super();
        this.options = options;
    }

    open(callback: (err?: Error) => void) {
        setTimeout(() => {
            this.isOpen = true;
            this.emit('open');
            callback();
        }, 5);
    }

    close(callback: (err?: Error) => void) {
        setTimeout(() => {
            this.isOpen = false;
            callback();
        }, 5);
    }

    write(data: Buffer) {
        this.writtenData.push(data);
        // No auto-ACK - tests handle this explicitly when needed
    }

    simulateData(hexString: string) {
        const buffer = Buffer.from(hexString, 'hex');
        this.emit('data', buffer);
    }
}

// Mock serialport module
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
    if (id === 'serialport') {
        return { SerialPort: MockSerialPort };
    }
    return originalRequire.apply(this, arguments);
};

import { DuoFernStick } from '../src/duofern/stick';

// Helper to initialize stick with auto-ACK
async function initializeStick(stickInstance: DuoFernStick, timeout = 300): Promise<void> {
    const port = (stickInstance as any).port as MockSerialPort;
    const originalWrite = port.write.bind(port);

    // Override write to auto-respond with ACKs during init
    port.write = (data: Buffer) => {
        originalWrite(data);
        setTimeout(() => port.simulateData(Protocol.duoACK), 5);
    };

    // Wait for initialization to complete
    const initPromise = new Promise<void>((resolve) => {
        stickInstance.once('initialized', () => resolve());
    });

    await stickInstance.open();
    await initPromise;
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for processing

    // Restore original write behavior after init completes
    port.write = originalWrite;
}

describe('DuoFern Stick', () => {
    let stick: DuoFernStick;
    let mockPort: MockSerialPort;

    beforeEach(() => {
        stick = new DuoFernStick('/dev/ttyUSB0', '6F1234', []);
        mockPort = (stick as any).port as MockSerialPort;
    });

    afterEach(async () => {
        try {
            if (mockPort.isOpen) {
                await stick.close();
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    it('should create instance and initialize', async function () {
        this.timeout(2000);
        let initialized = false;
        stick.on('initialized', () => { initialized = true; });

        await initializeStick(stick, 300);

        assert.strictEqual(stick.isInitialized, true);
        assert.ok(initialized);
    });

    it('should handle data buffering and frame extraction', (done) => {
        const frame = '0FFF0F21' + '00'.repeat(18);

        stick.on('frame', (receivedFrame) => {
            assert.strictEqual(receivedFrame, frame.toUpperCase());
            done();
        });

        mockPort.simulateData(frame);
    });

    it('should handle partial frames across multiple data events', (done) => {
        const frame = '0FFF0F21' + '00'.repeat(18);
        const frames: string[] = [];

        stick.on('frame', (f) => {
            frames.push(f);
            if (frames.length === 1) {
                assert.strictEqual(f, frame.toUpperCase());
                done();
            }
        });

        // Split frame
        mockPort.simulateData(frame.substring(0, 20));
        mockPort.simulateData(frame.substring(20));
    });

    it('should handle ACK frames', (done) => {
        stick.on('log', (level, msg) => {
            if (msg.includes('Received ACK')) {
                done();
            }
        });

        mockPort.simulateData(Protocol.duoACK);
    });

    it('should emit paired event', async function () {
        this.timeout(2000);
        const pairFrame = '0602016F1234000000000000000000FFFFFF00000000';

        // First verify the regex matches
        const matches = Protocol.pairPaired.test(pairFrame);
        assert.ok(matches, `Regex should match pairFrame. Regex: ${Protocol.pairPaired}, Frame: ${pairFrame}, Length: ${pairFrame.length}`);

        await initializeStick(stick, 300);

        // Verify port is open
        assert.ok(mockPort.isOpen, 'Port should be open after init');
        assert.ok(stick.isInitialized, 'Stick should be initialized');

        let receivedFrame = '';
        stick.on('paired', (frame) => {
            receivedFrame = frame;
        });

        // Try calling handleData directly
        (stick as any).handleData(Buffer.from(pairFrame, 'hex'));
        await new Promise(resolve => setTimeout(resolve, 10));

        assert.ok(receivedFrame, `'paired' event not emitted for frame ${pairFrame}`);
        assert.strictEqual(receivedFrame, pairFrame.toUpperCase());
    });

    it('should emit unpaired event', async function () {
        this.timeout(2000);
        const unpairFrame = '0603016F1234000000000000000000FFFFFF00000000';

        await initializeStick(stick, 300);

        // Verify port is open
        assert.ok(mockPort.isOpen, 'Port should be open after init');
        assert.ok(stick.isInitialized, 'Stick should be initialized');

        let receivedFrame = '';
        stick.on('unpaired', (frame) => {
            receivedFrame = frame;
        });

        // Try calling handleData directly
        (stick as any).handleData(Buffer.from(unpairFrame, 'hex'));
        await new Promise(resolve => setTimeout(resolve, 10));

        assert.ok(receivedFrame, `'unpaired' event not emitted for frame ${unpairFrame}`);
        assert.strictEqual(receivedFrame, unpairFrame.toUpperCase());
    });

    it('should queue commands and process after init', async function () {
        this.timeout(2000);
        const cmd = '0D000007020000000000006F1234ABCDEF00';

        await initializeStick(stick, 300);

        mockPort.writtenData = [];
        stick.write(cmd);

        await new Promise(resolve => setTimeout(resolve, 50));

        const written = mockPort.writtenData.some(buf =>
            buf.toString('hex').toUpperCase() === cmd.toUpperCase()
        );
        assert.ok(written);
    });

    it('should handle initialization with known devices', async function () {
        this.timeout(2000);
        const stickWithDevices = new DuoFernStick('/dev/ttyUSB1', '6F9999', ['AABBCC', 'DDEEFF']);
        const devPort = (stickWithDevices as any).port as MockSerialPort;

        // Setup auto-ACK
        const originalWrite = devPort.write.bind(devPort);
        devPort.write = (data: Buffer) => {
            originalWrite(data);
            setTimeout(() => devPort.simulateData(Protocol.duoACK), 5);
        };

        let initialized = false;
        stickWithDevices.on('initialized', () => { initialized = true; });

        await stickWithDevices.open();
        await new Promise(resolve => setTimeout(resolve, 400));

        assert.strictEqual(stickWithDevices.isInitialized, true);
        await stickWithDevices.close();
    });

    it('should handle port open error', async () => {
        const badStick = new DuoFernStick('/dev/invalid', '6F0000', []);
        const badPort = (badStick as any).port as MockSerialPort;

        badPort.open = (callback: (err?: Error) => void) => {
            callback(new Error('Port open failed'));
        };

        try {
            await badStick.open();
            assert.fail('Should have thrown');
        } catch (err: any) {
            assert.ok(err.message.includes('Port open failed'));
        }
    });

    it('should handle port close error', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        const originalClose = mockPort.close.bind(mockPort);
        mockPort.close = (callback: (err?: Error) => void) => {
            callback(new Error('Close failed'));
        };

        try {
            await stick.close();
            assert.fail('Should have thrown');
        } catch (err: any) {
            assert.ok(err.message.includes('Close failed'));
        }

        mockPort.close = originalClose;
    });

    it('should emit serial port errors', (done) => {
        stick.on('error', (err) => {
            assert.ok(err);
            done();
        });

        mockPort.emit('error', new Error('Serial error'));
    });

    it('should call pair() and queue command', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        mockPort.writtenData = [];
        stick.pair();

        await new Promise(resolve => setTimeout(resolve, 50));
        assert.ok(mockPort.writtenData.length > 0);
    });

    it('should call unpair() and queue command', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        mockPort.writtenData = [];
        stick.unpair();

        await new Promise(resolve => setTimeout(resolve, 50));
        assert.ok(mockPort.writtenData.length > 0);
    });

    it('should call remotePair() and queue command', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        mockPort.writtenData = [];
        stick.remotePair('ABCDEF');

        await new Promise(resolve => setTimeout(resolve, 50));
        assert.ok(mockPort.writtenData.length > 0);
    });

    it('should handle reopen()', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        assert.strictEqual(stick.isInitialized, true);

        // Setup ACK handling for the reopen
        const originalWrite = mockPort.write.bind(mockPort);
        mockPort.write = (data: Buffer) => {
            originalWrite(data);
            setTimeout(() => mockPort.simulateData(Protocol.duoACK), 5);
        };

        const reopenPromise = new Promise<void>((resolve) => {
            stick.once('initialized', () => resolve());
        });

        await stick.reopen();
        await reopenPromise;
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.strictEqual(stick.isInitialized, true);
    });

    it('should close gracefully when already closed', async () => {
        await stick.close();
        assert.strictEqual(mockPort.isOpen, false);
    });

    it('should handle init timeout', async function () {
        this.timeout(5000);
        const timeoutStick = new DuoFernStick('/dev/ttyUSB2', '6F0000', []);
        const timeoutPort = (timeoutStick as any).port as MockSerialPort;

        // Don't auto-respond to cause timeout
        timeoutPort.write = (data: Buffer) => {
            timeoutPort.writtenData.push(data);
            // No ACK response
        };

        let errorEmitted = false;
        timeoutStick.on('error', (err) => {
            if (err.message.includes('Timeout')) {
                errorEmitted = true;
            }
        });

        await timeoutStick.open();
        await new Promise(resolve => setTimeout(resolve, 3500));

        assert.ok(errorEmitted);
    });

    it('should emit log events', (done) => {
        let logReceived = false;

        stick.on('log', (level, message) => {
            if (!logReceived) {
                logReceived = true;
                assert.ok(['debug', 'info', 'warn', 'error'].includes(level));
                assert.ok(typeof message === 'string');
                done();
            }
        });

        stick.open();
    });

    it('should handle queue timeout when no ACK', async function () {
        this.timeout(7000);
        await initializeStick(stick, 300);

        // Override to not send ACK
        mockPort.write = (data: Buffer) => {
            mockPort.writtenData.push(data);
        };

        let timeoutWarning = false;
        stick.on('log', (level, msg) => {
            if (level === 'warn' && msg.includes('Timeout waiting for ACK')) {
                timeoutWarning = true;
            }
        });

        stick.write('0D000007010000000000006F1234ABCDEF00');

        await new Promise(resolve => setTimeout(resolve, 5500));

        assert.ok(timeoutWarning);
    });

    it('should clear queueTimeout when ACK received', async function () {
        this.timeout(3000);
        await initializeStick(stick, 300);

        // Setup to NOT automatically send ACK, but track the write
        mockPort.writtenData = [];

        // Queue a command - this should set the queueTimeout
        stick.write('0D000007010000000000006F1234ABCDEF00');

        // Wait for command to be sent
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify command was written
        assert.ok(mockPort.writtenData.length > 0, 'Command should have been written');

        // Verify timeout was set by checking internal state
        const hasTimeout = (stick as any).queueTimeout !== null;
        assert.ok(hasTimeout, 'Queue timeout should be set after sending command');

        // Now simulate ACK to clear the timeout
        mockPort.simulateData(Protocol.duoACK);

        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify timeout was cleared
        const timeoutCleared = (stick as any).queueTimeout === null;
        assert.ok(timeoutCleared, 'Queue timeout should be cleared after ACK');
    });

    it('should handle reopen() with updated device list', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        assert.strictEqual(stick.isInitialized, true);

        // Setup ACK handling for the reopen
        const originalWrite = mockPort.write.bind(mockPort);
        mockPort.write = (data: Buffer) => {
            originalWrite(data);
            setTimeout(() => mockPort.simulateData(Protocol.duoACK), 5);
        };

        const reopenPromise = new Promise<void>((resolve) => {
            stick.once('initialized', () => resolve());
        });

        // Call reopen with updated devices
        await stick.reopen(['112233', '445566']);
        await reopenPromise;
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.strictEqual(stick.isInitialized, true);

        // Verify the device list was updated
        const knownDevices = (stick as any).knownDevices;
        assert.deepStrictEqual(knownDevices, ['112233', '445566']);
    });

    it('should handle reopen() with queued commands', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        assert.strictEqual(stick.isInitialized, true);

        // Queue some commands that won't be processed
        (stick as any).queue = ['command1', 'command2', 'command3'];

        let warnLogReceived = false;
        let debugLogCount = 0;

        stick.on('log', (level, message) => {
            if (level === 'warn' && message.includes('Discarding')) {
                warnLogReceived = true;
            }
            if (level === 'debug' && message.includes('Discarded command')) {
                debugLogCount++;
            }
        });

        // Setup ACK handling for the reopen
        const originalWrite = mockPort.write.bind(mockPort);
        mockPort.write = (data: Buffer) => {
            originalWrite(data);
            setTimeout(() => mockPort.simulateData(Protocol.duoACK), 5);
        };

        const reopenPromise = new Promise<void>((resolve) => {
            stick.once('initialized', () => resolve());
        });

        await stick.reopen();
        await reopenPromise;
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.strictEqual(stick.isInitialized, true);
        assert.ok(warnLogReceived, 'Should emit warning about discarded commands');
        assert.strictEqual(debugLogCount, 3, 'Should log each discarded command');
    });

    it('should handle reopen() failure and emit error', async function () {
        this.timeout(2000);
        await initializeStick(stick, 300);

        assert.strictEqual(stick.isInitialized, true);

        // Make the close fail
        const originalClose = mockPort.close.bind(mockPort);
        mockPort.close = (callback: (err?: Error) => void) => {
            callback(new Error('Reopen close failed'));
        };

        let errorEmitted = false;
        let emittedError: any = null;
        // Use 'on' instead of 'once' to ensure we don't miss it
        stick.on('error', (err) => {
            emittedError = err;
            if (err.message && err.message.includes('Reopen failed')) {
                errorEmitted = true;
            }
        });

        try {
            await stick.reopen(['NEWDEV']);
            assert.fail('Should have thrown error');
        } catch (err: any) {
            // The error might just be the original error
            assert.ok(err.message, `Error should have a message, got: ${JSON.stringify(err)}`);

            // Give event loop a chance to emit the error event
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify error event was emitted
            assert.ok(errorEmitted, `Error event should have been emitted. Got: ${emittedError ? emittedError.message : 'no error'}`);
        }

        // Restore
        mockPort.close = originalClose;

        // Remove the error listener we added
        stick.removeAllListeners('error');
    });
});
