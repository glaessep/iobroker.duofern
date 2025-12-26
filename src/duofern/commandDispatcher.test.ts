import { assert } from 'chai';
import { CommandDispatcher } from './commandDispatcher';

describe('CommandDispatcher', () => {
  const testDeviceCode = '401234'; // RolloTron Standard (blinds category)
  const testStickCode = '6FABCD';

  describe('executeCommand()', () => {
    describe('Button commands', () => {
      it('should execute UP command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'up', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07010000')); // UP command
        assert.isTrue(result.shouldResetButton);
      });

      it('should execute DOWN command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'down', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07030000')); // DOWN command
        assert.isTrue(result.shouldResetButton);
      });

      it('should execute STOP command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'stop', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07020000')); // STOP command
        assert.isTrue(result.shouldResetButton);
      });

      it('should execute TOGGLE command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'toggle', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('071A0000')); // TOGGLE command
        assert.isTrue(result.shouldResetButton);
      });

      it('should reject button command with false value', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'up', false);
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), 'true value');
      });

      it('should reject button command with non-boolean value', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'up', 'invalid');
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
      });

      it('should execute getStatus command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'getStatus', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('0F400000')); // Status request command
        assert.isTrue(result.shouldResetButton);
      });
    });

    describe('Boolean toggle commands', () => {
      it('should execute sunMode ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunMode', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('070801FF')); // sunModeOn command
        assert.isFalse(result.shouldResetButton);
      });

      it('should execute sunMode OFF', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunMode', false);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('070A0100')); // sunModeOff command
        assert.isFalse(result.shouldResetButton);
      });

      it('should execute windMode ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'windMode', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('070D01FF')); // windModeOn command
      });

      it('should execute windMode OFF', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'windMode', false);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('070E0100')); // windModeOff command
      });

      it('should execute rainMode ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'rainMode', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('071101FF')); // rainModeOn command
      });

      it('should execute rainMode OFF', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'rainMode', false);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07120100')); // rainModeOff command
      });

      it('should execute manualMode ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'manualMode', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080600FD')); // manualModeOn command
      });

      it('should execute manualMode OFF', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'manualMode', false);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080600FE')); // manualModeOff command
      });

      it('should execute timeAutomatic ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'timeAutomatic', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080400FD')); // timeAutomaticOn command
      });

      it('should execute timeAutomatic OFF', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'timeAutomatic', false);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080400FE')); // timeAutomaticOff command
      });

      it('should execute sunAutomatic ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunAutomatic', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080100FD')); // sunAutomaticOn command
      });

      it('should execute sunAutomatic OFF', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunAutomatic', false);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080100FE')); // sunAutomaticOff command
      });

      it('should execute dawnAutomatic ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'dawnAutomatic', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080900FD')); // dawnAutomaticOn command
      });

      it('should execute duskAutomatic ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'duskAutomatic', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080500FD')); // duskAutomaticOn command
      });

      it('should execute rainAutomatic ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'rainAutomatic', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080800FD')); // rainAutomaticOn command
      });

      it('should execute windAutomatic ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'windAutomatic', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080700FD')); // windAutomaticOn command
      });

      it('should execute ventilatingMode ON', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'ventilatingMode', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('080200FD')); // ventilatingModeOn command
      });

      it('should reject boolean toggle with non-boolean value', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunMode', 'invalid');
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), 'boolean');
      });
    });

    describe('Numeric level commands', () => {
      it('should execute position command with 0%', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', 0);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07070000')); // position command with 0
      });

      it('should execute position command with 50%', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', 50);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07070032')); // position command with 50 hex = 32
      });

      it('should execute position command with 100%', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', 100);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('07070064')); // position command with 100 hex = 64
      });

      it('should execute sunPosition command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunPosition', 75);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('0801004B')); // sunPosition command with 75 hex = 4B
      });

      it('should execute ventilatingPosition command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'ventilatingPosition', 25);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('08020019')); // ventilatingPosition command with 25 hex = 19
      });

      it('should execute slatPosition command', () => {
        // Use venetian blinds device code (42xxxx) for slat control
        const venetianBlindsCode = '421234';
        const result = CommandDispatcher.executeCommand(venetianBlindsCode, testStickCode, 'slatPosition', 33);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('071B0021')); // slatPosition command with 33 hex = 21
      });

      it('should reject negative values', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', -10);
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), '0');
        assert.include(result.error.toLowerCase(), '100');
      });

      it('should reject values > 100', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', 150);
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), '0');
        assert.include(result.error.toLowerCase(), '100');
      });

      it('should reject non-numeric values', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', 'fifty');
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), 'number');
      });
    });

    describe('Special commands', () => {
      it('should execute remotePair with multiple frames', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'remotePair', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frames);
        assert.strictEqual(result.frames.length, 2);
        assert.isTrue(result.shouldResetButton);
      });

      it('should reject remotePair with false value', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'remotePair', false);
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
      });
    });

    describe('Error handling', () => {
      it('should reject unknown command', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'unknownCommand', true);
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), 'unknown');
      });

      it('should reject read-only state', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'moving', 'up');
        assert.strictEqual(result.success, false);
        assert.isDefined(result.error);
        assert.include(result.error.toLowerCase(), 'read-only');
      });

      it('should handle uppercase device codes', () => {
        const result = CommandDispatcher.executeCommand('6f1234', testStickCode, 'up', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('6F1234'));
      });

      it('should handle uppercase stick codes', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, '6fabcd', 'up', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes('6FABCD'));
      });
    });

    describe('Frame structure validation', () => {
      it('should generate 44-character frames', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'up', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.strictEqual(result.frame.length, 44);
      });

      it('should include device code in frame', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'down', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes(testDeviceCode.toUpperCase()));
      });

      it('should include stick code in frame', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'stop', true);
        assert.strictEqual(result.success, true);
        assert.isDefined(result.frame);
        assert.isTrue(result.frame.includes(testStickCode.toUpperCase()));
      });
    });

    describe('Role-based behavior', () => {
      it('should mark buttons for reset', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'up', true);
        assert.strictEqual(result.success, true);
        assert.isTrue(result.shouldResetButton);
      });

      it('should not mark switches for reset', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'sunMode', true);
        assert.strictEqual(result.success, true);
        assert.isFalse(result.shouldResetButton);
      });

      it('should not mark levels for reset', () => {
        const result = CommandDispatcher.executeCommand(testDeviceCode, testStickCode, 'position', 50);
        assert.strictEqual(result.success, true);
        assert.isFalse(result.shouldResetButton);
      });
    });
  });
});
