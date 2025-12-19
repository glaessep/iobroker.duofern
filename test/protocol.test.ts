import * as assert from 'assert';
import { buildCommand, Commands, Protocol, buildStatusRequest, buildSetDongle, buildSetPairs, buildBroadcastStatusRequest, buildRemotePairFrames } from '../src/duofern/protocol';

describe('DuoFern Protocol', () => {
    const STICK_CODE = '6F1234';
    const DEVICE_CODE = '49ABCD';
    const frameOpts = {
        deviceCode: DEVICE_CODE,
        stickCode: STICK_CODE,
        channel: '01',
        suffix: '00'
    };

    describe('Command Frame Structure', () => {
        it('should generate frames with correct length (22 bytes = 44 hex chars)', () => {
            const up = buildCommand(Commands.up, {}, frameOpts);
            assert.strictEqual(up.length, 44, 'Frame should be 44 hex characters');
            assert.strictEqual(up.length / 2, 22, 'Frame should be 22 bytes');
        });

        it('should start all device commands with 0D', () => {
            const commands = [
                buildCommand(Commands.up, {}, frameOpts),
                buildCommand(Commands.down, {}, frameOpts),
                buildCommand(Commands.stop, {}, frameOpts),
                buildCommand(Commands.position, { nn: 50 }, frameOpts)
            ];

            commands.forEach(cmd => {
                assert.strictEqual(cmd.substring(0, 2), '0D', 'Command should start with 0D');
            });
        });

        it('should include channel in correct position (byte 1)', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            assert.strictEqual(cmd.substring(2, 4), '01', 'Channel should be at position 2-3');
        });

        it('should include stick code in correct position (bytes 15-17)', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            const stickCodePos = cmd.substring(30, 36);
            assert.strictEqual(stickCodePos, STICK_CODE, 'Stick code should be at position 30-35');
        });

        it('should include device code in correct position (bytes 18-20)', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            const deviceCodePos = cmd.substring(36, 42);
            assert.strictEqual(deviceCodePos, DEVICE_CODE, 'Device code should be at position 36-41');
        });

        it('should end with suffix byte', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            assert.strictEqual(cmd.substring(42, 44), '00', 'Suffix should be 00');
        });
    });

    describe('UP Command', () => {
        it('should generate correct UP command', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            const expected = '0D01070100000000000000000000006F123449ABCD00';
            assert.strictEqual(cmd, expected, 'UP command should have correct format');
        });

        it('should use 4-byte command body (07 01 00 00)', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            const commandBody = cmd.substring(4, 12); // bytes 2-5
            assert.strictEqual(commandBody, '07010000', 'Command body should be 07 01 00 00');
        });

        it('should have 9 bytes of padding (18 hex chars)', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            const padding = cmd.substring(12, 30); // bytes 6-14
            assert.strictEqual(padding, '000000000000000000', 'Should have 9 bytes of padding');
        });
    });

    describe('DOWN Command', () => {
        it('should generate correct DOWN command', () => {
            const cmd = buildCommand(Commands.down, {}, frameOpts);
            const expected = '0D01070300000000000000000000006F123449ABCD00';
            assert.strictEqual(cmd, expected, 'DOWN command should have correct format');
        });

        it('should use 4-byte command body (07 03 00 00)', () => {
            const cmd = buildCommand(Commands.down, {}, frameOpts);
            const commandBody = cmd.substring(4, 12);
            assert.strictEqual(commandBody, '07030000', 'Command body should be 07 03 00 00');
        });
    });

    describe('STOP Command', () => {
        it('should generate correct STOP command', () => {
            const cmd = buildCommand(Commands.stop, {}, frameOpts);
            const expected = '0D01070200000000000000000000006F123449ABCD00';
            assert.strictEqual(cmd, expected, 'STOP command should have correct format');
        });

        it('should use 4-byte command body (07 02 00 00)', () => {
            const cmd = buildCommand(Commands.stop, {}, frameOpts);
            const commandBody = cmd.substring(4, 12);
            assert.strictEqual(commandBody, '07020000', 'Command body should be 07 02 00 00');
        });
    });

    describe('POSITION Command', () => {
        it('should generate correct POSITION command for 50%', () => {
            const cmd = buildCommand(Commands.position, { nn: 50 }, frameOpts);
            const expected = '0D01070700320000000000000000006F123449ABCD00';
            assert.strictEqual(cmd, expected, 'POSITION 50 command should have correct format');
        });

        it('should use 4-byte command body (07 07 00 nn)', () => {
            const cmd = buildCommand(Commands.position, { nn: 50 }, frameOpts);
            const commandBody = cmd.substring(4, 12); // 4 bytes = 8 hex chars
            assert.strictEqual(commandBody, '07070032', 'Command body should be 07 07 00 32 for position 50');
        });

        it('should have 9 bytes of padding for 4-byte command (18 hex chars)', () => {
            const cmd = buildCommand(Commands.position, { nn: 50 }, frameOpts);
            const padding = cmd.substring(12, 30); // bytes 6-14
            assert.strictEqual(padding, '000000000000000000', 'Should have 9 bytes of padding for 4-byte command');
        });

        it('should correctly encode position 0', () => {
            const cmd = buildCommand(Commands.position, { nn: 0 }, frameOpts);
            assert.ok(cmd.includes('07070000'), 'Position 0 should be encoded as 07 07 00 00');
        });

        it('should correctly encode position 25', () => {
            const cmd = buildCommand(Commands.position, { nn: 25 }, frameOpts);
            assert.ok(cmd.includes('07070019'), 'Position 25 should be encoded as 07 07 00 19');
        });

        it('should correctly encode position 75', () => {
            const cmd = buildCommand(Commands.position, { nn: 75 }, frameOpts);
            assert.ok(cmd.includes('0707004B'), 'Position 75 should be encoded as 07 07 00 4B');
        });

        it('should correctly encode position 100', () => {
            const cmd = buildCommand(Commands.position, { nn: 100 }, frameOpts);
            assert.ok(cmd.includes('07070064'), 'Position 100 should be encoded as 07 07 00 64');
        });
    });

    describe('Initialization Sequence', () => {
        it('should have duoInit1 command', () => {
            assert.strictEqual(Protocol.duoInit1.length, 44, 'duoInit1 should be 44 chars');
            assert.strictEqual(Protocol.duoInit1.substring(0, 2), '01', 'duoInit1 should start with 01');
        });

        it('should have duoInit2 command', () => {
            assert.strictEqual(Protocol.duoInit2.length, 44, 'duoInit2 should be 44 chars');
            assert.strictEqual(Protocol.duoInit2.substring(0, 2), '0E', 'duoInit2 should start with 0E');
        });

        it('should have duoInit3 command', () => {
            assert.strictEqual(Protocol.duoInit3.length, 44, 'duoInit3 should be 44 chars');
            assert.strictEqual(Protocol.duoInit3.substring(0, 4), '1414', 'duoInit3 should start with 1414');
        });

        it('should have duoInitEnd command', () => {
            assert.strictEqual(Protocol.duoInitEnd.length, 44, 'duoInitEnd should be 44 chars');
            assert.strictEqual(Protocol.duoInitEnd.substring(0, 4), '1001', 'duoInitEnd should start with 1001');
        });

        it('should build duoSetDongle with stick code', () => {
            const cmd = buildSetDongle(STICK_CODE);
            assert.strictEqual(cmd.length, 44, 'duoSetDongle should be 44 chars');
            assert.strictEqual(cmd.substring(0, 2), '0A', 'duoSetDongle should start with 0A');
            assert.ok(cmd.includes(STICK_CODE), 'Should include stick code');
        });

        it('should build duoSetPairs with counter and device code', () => {
            const cmd = buildSetPairs(0, DEVICE_CODE);
            assert.strictEqual(cmd.length, 44, 'duoSetPairs should be 44 chars');
            assert.strictEqual(cmd.substring(0, 2), '03', 'duoSetPairs should start with 03');
            assert.ok(cmd.includes(DEVICE_CODE), 'Should include device code');
            assert.ok(cmd.includes('00'), 'Should include counter 00');
        });

        it('should build duoSetPairs with different counters', () => {
            const cmd1 = buildSetPairs(1, DEVICE_CODE);
            const cmd2 = buildSetPairs(10, DEVICE_CODE);
            assert.ok(cmd1.includes('01'), 'Should include counter 01');
            assert.ok(cmd2.includes('0A'), 'Should include counter 0A (10 in hex)');
        });
    });

    describe('Status Request', () => {
        it('should build status request with device code', () => {
            const cmd = buildStatusRequest(DEVICE_CODE);
            assert.strictEqual(cmd.length, 44, 'Status request should be 44 chars');
            assert.ok(cmd.includes('0DFF0F40'), 'Should start with 0DFF0F40');
            assert.ok(cmd.includes(DEVICE_CODE), 'Should include device code');
            assert.ok(cmd.endsWith('01'), 'Should end with 01');
        });

        it('should build broadcast status request', () => {
            const cmd = buildStatusRequest('FFFFFF');
            assert.ok(cmd.includes('FFFFFF'), 'Should include FFFFFF for broadcast');
        });

        it('should use channel FF for status requests', () => {
            const cmd = buildStatusRequest(DEVICE_CODE);
            const channel = cmd.substring(2, 4);
            assert.strictEqual(channel, 'FF', 'Status request should use channel FF');
        });

        it('should use 000000 as stick code for status requests', () => {
            const cmd = buildStatusRequest(DEVICE_CODE);
            const stickCode = cmd.substring(30, 36);
            assert.strictEqual(stickCode, '000000', 'Status request should use 000000 as stick code');
        });

        it('should use 4-byte command body (0F 40 00 00)', () => {
            const cmd = buildStatusRequest(DEVICE_CODE);
            const commandBody = cmd.substring(4, 12);
            assert.strictEqual(commandBody, '0F400000', 'Status request command body should be 0F 40 00 00');
        });

        it('should have 9 bytes of padding', () => {
            const cmd = buildStatusRequest(DEVICE_CODE);
            const padding = cmd.substring(12, 30);
            assert.strictEqual(padding, '000000000000000000', 'Status request should have 9 bytes of padding');
        });
    });

    describe('ACK Pattern', () => {
        it('should validate ACK pattern', () => {
            const validAck = '81000000000000000000000000000000000000000000';
            const enhancedAck = '810003CC00000000000000000000006F123449ABCD00';
            const invalidAck = '82000000000000000000000000000000000000000000';

            assert.ok(Protocol.ackPattern.test(validAck), 'Should match basic ACK');
            assert.ok(Protocol.ackPattern.test(enhancedAck), 'Should match enhanced ACK');
            assert.ok(!Protocol.ackPattern.test(invalidAck), 'Should not match non-ACK');
        });
    });

    describe('Stick Code Validation', () => {
        it('should validate stick code format', () => {
            const validCodes = ['6F1234', '6F0000', '6FABCD'];
            const invalidCodes = ['5F1234', '6G1234', '6F12', 'invalid', ''];

            validCodes.forEach(code => {
                assert.strictEqual(/^6F[0-9A-Fa-f]{4}$/i.test(code), true, `${code} should be valid`);
            });

            invalidCodes.forEach(code => {
                assert.strictEqual(/^6F[0-9A-Fa-f]{4}$/i.test(code), false, `${code} should be invalid`);
            });
        });

        it('should reject invalid format in buildSetDongle', () => {
            assert.throws(() => buildSetDongle('6G1234'), /Invalid dongle serial/, 'Should reject non-hex characters');
            assert.throws(() => buildSetDongle('6F12'), /Invalid dongle serial/, 'Should reject wrong length');
            assert.throws(() => buildSetDongle(''), /Invalid dongle serial/, 'Should reject empty string');
            assert.throws(() => buildSetDongle('invalid'), /Invalid dongle serial/, 'Should reject non-hex string');
        });
    });

    describe('Command Template Validation', () => {
        it('should have correct command template lengths', () => {
            assert.strictEqual(Commands.up.length, 8, 'UP command template should be 8 chars (4 bytes)');
            assert.strictEqual(Commands.down.length, 8, 'DOWN command template should be 8 chars (4 bytes)');
            assert.strictEqual(Commands.stop.length, 8, 'STOP command template should be 8 chars (4 bytes)');
            assert.strictEqual(Commands.position.length, 8, 'POSITION command template should be 8 chars (4 bytes)');
            assert.strictEqual(Commands.statusRequest.length, 8, 'STATUS REQUEST command template should be 8 chars (4 bytes)');
        });

        it('should have correct command prefixes', () => {
            assert.ok(Commands.up.startsWith('07'), 'UP should start with 07');
            assert.ok(Commands.down.startsWith('07'), 'DOWN should start with 07');
            assert.ok(Commands.stop.startsWith('07'), 'STOP should start with 07');
            assert.ok(Commands.position.startsWith('07'), 'POSITION should start with 07');
            assert.ok(Commands.statusRequest.startsWith('0F'), 'STATUS REQUEST should start with 0F');
        });
    });

    describe('Hex Value Conversion', () => {
        it('should convert decimal to hex with padding', () => {
            const testCases = [
                { input: 0, expected: '00' },
                { input: 10, expected: '0A' },
                { input: 25, expected: '19' },
                { input: 50, expected: '32' },
                { input: 75, expected: '4B' },
                { input: 100, expected: '64' },
                { input: 255, expected: 'FF' }
            ];

            testCases.forEach(({ input, expected }) => {
                const cmd = buildCommand(Commands.position, { nn: input }, frameOpts);
                assert.ok(cmd.includes(expected), `Position ${input} should include hex ${expected}`);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing optional parameters', () => {
            const cmd = buildCommand(Commands.up, {}, frameOpts);
            assert.strictEqual(cmd.length, 44, 'Should generate valid frame without extra parameters');
        });

        it('should handle uppercase and lowercase hex values', () => {
            const opts1 = { ...frameOpts, stickCode: '6f1234', deviceCode: '49abcd' };
            const opts2 = { ...frameOpts, stickCode: '6F1234', deviceCode: '49ABCD' };
            const cmd1 = buildCommand(Commands.up, {}, opts1);
            const cmd2 = buildCommand(Commands.up, {}, opts2);
            assert.strictEqual(cmd1, cmd2, 'Should normalize to uppercase');
            assert.strictEqual(cmd1.toUpperCase(), cmd1, 'Should be uppercase');
        });

        it('should maintain frame integrity with different channels', () => {
            const opts = { ...frameOpts, channel: '02' };
            const cmd = buildCommand(Commands.up, {}, opts);
            assert.strictEqual(cmd.length, 44, 'Should maintain correct length with different channel');
            assert.strictEqual(cmd.substring(2, 4), '02', 'Should use specified channel');
        });

        it('should use 000000 as stick code when not provided', () => {
            const cmd = buildCommand(Commands.up, {}, { deviceCode: DEVICE_CODE });
            assert.strictEqual(cmd.length, 44, 'Should generate full frame');
            const stickCode = cmd.substring(30, 36);
            assert.strictEqual(stickCode, '000000', 'Should use 000000 when stick code not provided');
        });

        it('should allow custom channel and suffix without stick code', () => {
            const cmd = buildCommand(Commands.statusRequest, {}, {
                deviceCode: DEVICE_CODE,
                channel: 'FF',
                suffix: '01'
            });
            const channel = cmd.substring(2, 4);
            const suffix = cmd.substring(42, 44);
            assert.strictEqual(channel, 'FF', 'Should allow custom channel without stick code');
            assert.strictEqual(suffix, '01', 'Should allow custom suffix without stick code');
        });
    });

    describe('buildRemotePairFrames', () => {
        it('should generate two frames with correct length (44 hex chars)', () => {
            const frames = buildRemotePairFrames('49ABCD');
            assert.strictEqual(frames.length, 2, 'Should return two frames');
            assert.strictEqual(frames[0].length, 44, 'First frame should be 44 hex chars');
            assert.strictEqual(frames[1].length, 44, 'Second frame should be 44 hex chars');
        });

        it('should use correct structure for remote pairing', () => {
            const frames = buildRemotePairFrames('49ABCD', '01');
            // Frame structure: 0D + channel + command (06010000) + padding (32 zeros) + device + suffix
            assert.ok(frames[0].startsWith('0D01'), 'Should start with 0D01');
            assert.ok(frames[0].includes('06010000'), 'Should include remote pair command');
            assert.ok(frames[0].endsWith('49ABCD00'), 'First frame should end with device code and 00 suffix');
            assert.ok(frames[1].endsWith('49ABCD01'), 'Second frame should end with device code and 01 suffix');
        });

        it('should handle custom channels', () => {
            const frames = buildRemotePairFrames('49ABCD', 'FF');
            assert.ok(frames[0].startsWith('0DFF'), 'Should use custom channel FF');
        });

        it('should uppercase device codes', () => {
            const frames = buildRemotePairFrames('49abcd');
            assert.ok(frames[0].includes('49ABCD'), 'Should uppercase device code');
        });
    });

    describe('buildBroadcastStatusRequest', () => {
        it('should generate frame with correct length (44 hex chars)', () => {
            const cmd = buildBroadcastStatusRequest();
            assert.strictEqual(cmd.length, 44, 'Should be 44 hex chars');
        });

        it('should use broadcast channel FF and suffix 01', () => {
            const cmd = buildBroadcastStatusRequest();
            const channel = cmd.substring(2, 4);
            const suffix = cmd.substring(42, 44);
            assert.strictEqual(channel, 'FF', 'Should use broadcast channel FF');
            assert.strictEqual(suffix, '01', 'Should use suffix 01');
        });

        it('should include status request command', () => {
            const cmd = buildBroadcastStatusRequest();
            const commandBody = cmd.substring(4, 12);
            assert.strictEqual(commandBody, '0F400000', 'Should use status request command');
        });

        it('should target all devices (FFFFFF)', () => {
            const cmd = buildBroadcastStatusRequest();
            const deviceCode = cmd.substring(36, 42);
            assert.strictEqual(deviceCode, 'FFFFFF', 'Should target all devices with FFFFFF');
        });
    });
});