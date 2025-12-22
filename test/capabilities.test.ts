/**
 * Unit tests for the capabilities module
 * 
 * Validates state definitions, capability extraction, and type inference
 * to ensure the single source of truth for device capabilities is correct.
 */

import * as assert from 'assert';
import { getStateDefinitions, getDeviceStateDefinitions } from '../src/duofern/capabilities';

describe('capabilities', () => {
    describe('getStateDefinitions', () => {
        it('should return an object with state definitions', () => {
            const definitions = getStateDefinitions();
            assert.strictEqual(typeof definitions, 'object');
            assert.ok(Object.keys(definitions).length > 0);
        });

        it('should include command capabilities', () => {
            const definitions = getStateDefinitions();

            // Basic movement commands
            assert.ok(definitions.up);
            assert.ok(definitions.down);
            assert.ok(definitions.stop);
            assert.ok(definitions.toggle);

            // Utility commands
            assert.ok(definitions.getStatus);
            assert.ok(definitions.remotePair);
        });

        it('should include on/off command capabilities', () => {
            const definitions = getStateDefinitions();

            // On/Off commands for switches and dimmers
            assert.ok(definitions.on, 'on command should exist');
            assert.ok(definitions.off, 'off command should exist');

            // Verify on command properties
            assert.strictEqual(definitions.on.name, 'On');
            assert.strictEqual(definitions.on.type, 'boolean');
            assert.strictEqual(definitions.on.role, 'button');
            assert.strictEqual(definitions.on.readable, false);
            assert.strictEqual(definitions.on.writable, true);

            // Verify off command properties
            assert.strictEqual(definitions.off.name, 'Off');
            assert.strictEqual(definitions.off.type, 'boolean');
            assert.strictEqual(definitions.off.role, 'button');
            assert.strictEqual(definitions.off.readable, false);
            assert.strictEqual(definitions.off.writable, true);
        });

        it('should include status capabilities', () => {
            const definitions = getStateDefinitions();

            // Common status fields
            assert.ok(definitions.position);
            assert.ok(definitions.moving);
            assert.ok(definitions.sunAutomatic);
            assert.ok(definitions.timeAutomatic);
            assert.ok(definitions.sunMode);
        });

        it('should include mode commands (sunMode, windMode, rainMode)', () => {
            const definitions = getStateDefinitions();

            // Mode commands should exist
            assert.ok(definitions.sunMode, 'sunMode should exist');
            assert.ok(definitions.windMode, 'windMode should exist');
            assert.ok(definitions.rainMode, 'rainMode should exist');

            // Verify sunMode properties
            assert.strictEqual(definitions.sunMode.name, 'Sun Mode');
            assert.strictEqual(definitions.sunMode.type, 'boolean');
            assert.strictEqual(definitions.sunMode.role, 'state');
            assert.strictEqual(definitions.sunMode.readable, true);
            assert.strictEqual(definitions.sunMode.writable, true);

            // Verify windMode properties
            assert.strictEqual(definitions.windMode.name, 'Wind Mode');
            assert.strictEqual(definitions.windMode.type, 'boolean');
            assert.strictEqual(definitions.windMode.role, 'state');
            assert.strictEqual(definitions.windMode.readable, true);
            assert.strictEqual(definitions.windMode.writable, true);

            // Verify rainMode properties
            assert.strictEqual(definitions.rainMode.name, 'Rain Mode');
            assert.strictEqual(definitions.rainMode.type, 'boolean');
            assert.strictEqual(definitions.rainMode.role, 'state');
            assert.strictEqual(definitions.rainMode.readable, true);
            assert.strictEqual(definitions.rainMode.writable, true);
        });

        it('should handle status fields without mapping (defaults to number type)', () => {
            const definitions = getStateDefinitions();

            // runningTime has no entry in getStatusFieldMapping, should default to number
            assert.ok(definitions.runningTime, 'runningTime should exist');
            assert.strictEqual(definitions.runningTime.type, 'number', 'runningTime should default to number type');
            assert.strictEqual(definitions.runningTime.role, 'indicator', 'runningTime should be indicator (not writable)');
            assert.strictEqual(definitions.runningTime.readable, true);
            assert.strictEqual(definitions.runningTime.writable, false);
        });

        it('should define command buttons correctly', () => {
            const definitions = getStateDefinitions();

            // Check up button
            const upDef = definitions.up;
            assert.strictEqual(upDef.type, 'boolean');
            assert.strictEqual(upDef.role, 'button');
            assert.strictEqual(upDef.readable, false);
            assert.strictEqual(upDef.writable, true);

            // Check down button
            const downDef = definitions.down;
            assert.strictEqual(downDef.type, 'boolean');
            assert.strictEqual(downDef.role, 'button');
            assert.strictEqual(downDef.readable, false);
            assert.strictEqual(downDef.writable, true);
        });

        it('should define position as a level with constraints', () => {
            const definitions = getStateDefinitions();
            const positionDef = definitions.position;

            assert.strictEqual(positionDef.type, 'number');
            assert.strictEqual(positionDef.role, 'level');
            assert.strictEqual(positionDef.readable, true);
            assert.strictEqual(positionDef.writable, true);
            assert.strictEqual(positionDef.unit, '%');
            assert.strictEqual(positionDef.min, 0);
            assert.strictEqual(positionDef.max, 100);
        });

        it('should define moving as a read-only indicator', () => {
            const definitions = getStateDefinitions();
            const movingDef = definitions.moving;

            assert.strictEqual(movingDef.type, 'string');
            assert.strictEqual(movingDef.role, 'indicator');
            assert.strictEqual(movingDef.readable, true);
            assert.strictEqual(movingDef.writable, false);
        });

        it('should define automatic settings as writable states', () => {
            const definitions = getStateDefinitions();

            const sunAutomatic = definitions.sunAutomatic;
            assert.strictEqual(sunAutomatic.type, 'boolean');
            assert.strictEqual(sunAutomatic.readable, true);
            assert.strictEqual(sunAutomatic.writable, true);

            const timeAutomatic = definitions.timeAutomatic;
            assert.strictEqual(timeAutomatic.type, 'boolean');
            assert.strictEqual(timeAutomatic.readable, true);
            assert.strictEqual(timeAutomatic.writable, true);
        });

        it('should include all essential state properties', () => {
            const definitions = getStateDefinitions();

            for (const [key, def] of Object.entries(definitions)) {
                assert.ok(def.name, `${key} missing name`);
                assert.ok(def.type, `${key} missing type`);
                assert.ok(def.role, `${key} missing role`);
                assert.ok(def.readable !== undefined, `${key} missing readable`);
                assert.ok(def.writable !== undefined, `${key} missing writable`);

                assert.strictEqual(typeof def.name, 'string');
                assert.ok(['number', 'string', 'boolean'].includes(def.type));
                assert.ok(['button', 'state', 'level', 'indicator', 'text'].includes(def.role));
                assert.strictEqual(typeof def.readable, 'boolean');
                assert.strictEqual(typeof def.writable, 'boolean');
            }
        });

        it('should not have buttons that are readable', () => {
            const definitions = getStateDefinitions();

            for (const [key, def] of Object.entries(definitions)) {
                if (def.role === 'button') {
                    assert.strictEqual(def.readable, false, `Button ${key} should not be readable`);
                    assert.strictEqual(def.writable, true, `Button ${key} should be writable`);
                    assert.strictEqual(def.type, 'boolean', `Button ${key} should be boolean type`);
                }
            }
        });

        it('should have proper units for position-like fields', () => {
            const definitions = getStateDefinitions();

            const positionFields = [
                'position',
                'sunPosition',
                'ventilatingPosition',
                'slatPosition',
                'defaultSlatPos'
            ];

            for (const field of positionFields) {
                if (definitions[field]) {
                    assert.strictEqual(definitions[field].unit, '%', `${field} should have % unit`);
                    assert.strictEqual(definitions[field].min, 0, `${field} should have min 0`);
                    assert.strictEqual(definitions[field].max, 100, `${field} should have max 100`);
                }
            }
        });

        it('should have consistent type for boolean-like states', () => {
            const definitions = getStateDefinitions();

            const booleanStates = [
                'sunAutomatic',
                'timeAutomatic',
                'duskAutomatic',
                'dawnAutomatic',
                'manualMode',
                'sunMode',
                'ventilatingMode'
            ];

            for (const state of booleanStates) {
                if (definitions[state]) {
                    // Boolean-like states are mapped to true/false
                    assert.strictEqual(definitions[state].type, 'boolean', `${state} should be boolean type`);
                }
            }
        });

        it('should define indicators as read-only', () => {
            const definitions = getStateDefinitions();

            for (const [key, def] of Object.entries(definitions)) {
                if (def.role === 'indicator') {
                    assert.strictEqual(def.readable, true, `Indicator ${key} should be readable`);
                    assert.strictEqual(def.writable, false, `Indicator ${key} should not be writable`);
                }
            }
        });

        it('should have human-readable names', () => {
            const definitions = getStateDefinitions();

            for (const [key, def] of Object.entries(definitions)) {
                assert.notStrictEqual(def.name, key, `${key} should have a display name different from key`);
                assert.ok(def.name.length > 0, `${key} should have non-empty name`);
                // Name should be capitalized
                assert.ok(/[A-Z0-9]/.test(def.name[0]), `${key} name should start with capital letter`);
            }
        });
    });

    describe('getDeviceStateDefinitions', () => {
        it('should accept a device code parameter', () => {
            const definitions = getDeviceStateDefinitions('401234');
            assert.strictEqual(typeof definitions, 'object');
        });

        it('should return device-specific filtered definitions', () => {
            const blindsDefs = getDeviceStateDefinitions('401234'); // RolloTron Standard (blinds)
            const gateDefs = getDeviceStateDefinitions('4E1234'); // SX5 (gate)
            const tubularDefs = getDeviceStateDefinitions('491234'); // Rohrmotor (tubular motor - blinds)
            const sensorDefs = getDeviceStateDefinitions('691234'); // Umweltsensor (sensor)
            const dimmerDefs = getDeviceStateDefinitions('481234'); // Dimmaktor (dimmer)
            const actuatorDefs = getDeviceStateDefinitions('461234'); // Steckdosenaktor (actuator)
            const remoteDefs = getDeviceStateDefinitions('A01234'); // Handsender (remote)

            // Blinds should have movement capabilities
            assert.ok(blindsDefs.up, 'Blinds should have up');
            assert.ok(blindsDefs.down, 'Blinds should have down');
            assert.ok(blindsDefs.position, 'Blinds should have position');

            // Gates should have position but also gate-specific states
            assert.ok(gateDefs.up, 'Gates should have up');
            assert.ok(gateDefs.position, 'Gates should have position');
            assert.ok(gateDefs.obstacle, 'Gates should have obstacle detection');
            assert.ok(gateDefs.lightCurtain, 'Gates should have lightCurtain');
            assert.ok(gateDefs['10minuteAlarm'], 'Gates should have 10minuteAlarm');

            // Tubular motors (49) should NOT have gate-specific states
            assert.ok(tubularDefs.up, 'Tubular motors should have up');
            assert.ok(tubularDefs.position, 'Tubular motors should have position');
            assert.ok(!tubularDefs.obstacle, 'Tubular motors should NOT have obstacle');
            assert.ok(!tubularDefs.lightCurtain, 'Tubular motors should NOT have lightCurtain');
            assert.ok(!tubularDefs['10minuteAlarm'], 'Tubular motors should NOT have 10minuteAlarm');

            // Dimmers should have level, not position
            assert.ok(dimmerDefs.level, 'Dimmers should have level');
            assert.ok(dimmerDefs.on, 'Dimmers should have on');
            assert.ok(dimmerDefs.off, 'Dimmers should have off');
            assert.ok(!dimmerDefs.position, 'Dimmers should NOT have position');
            assert.ok(!dimmerDefs.up, 'Dimmers should NOT have up');
            assert.ok(!dimmerDefs.down, 'Dimmers should NOT have down');

            // Actuators should have on/off, not position
            assert.ok(actuatorDefs.on, 'Actuators should have on');
            assert.ok(actuatorDefs.off, 'Actuators should have off');
            assert.ok(!actuatorDefs.position, 'Actuators should NOT have position');
            assert.ok(!actuatorDefs.level, 'Actuators should NOT have level');
            assert.ok(!actuatorDefs.up, 'Actuators should NOT have up');

            // Sensors should have minimal states
            assert.ok(Object.keys(sensorDefs).length < Object.keys(blindsDefs).length, 'Sensors should have fewer states than blinds');
            assert.ok(sensorDefs.getStatus, 'Sensors should have getStatus');
            assert.ok(sensorDefs.remotePair, 'Sensors should have remotePair');
            assert.ok(!sensorDefs.position, 'Sensors should NOT have position');

            // Remotes should have minimal states for status/pairing only
            assert.ok(remoteDefs.getStatus, 'Remotes should have getStatus for battery status');
            assert.ok(remoteDefs.remotePair, 'Remotes should have remotePair for pairing other devices');
            assert.ok(!remoteDefs.up, 'Remotes should NOT have up');
            assert.ok(!remoteDefs.position, 'Remotes should NOT have position');
            assert.ok(!remoteDefs.on, 'Remotes should NOT have on/off');

            // Common states should be available to all
            assert.ok(blindsDefs.getStatus, 'All devices should have getStatus');
            assert.ok(gateDefs.getStatus, 'All devices should have getStatus');
            assert.ok(sensorDefs.getStatus, 'All devices should have getStatus');
        });

        it('should only include venetian blind features for devices that support blindsMode', () => {
            // Devices that support venetian blind features (slat control)
            const venetianDevices = {
                '42': 'Rohrmotor-Aktor',
                '4B': 'Connect-Aktor',
                '4C': 'Troll Basis',
                '70': 'Troll Comfort DuoFern'
            };

            // Regular blind devices without venetian blind support
            const regularBlindDevices = {
                '40': 'RolloTron Standard',
                '41': 'RolloTron Comfort Slave',
                '47': 'Rohrmotor Steuerung',
                '49': 'Rohrmotor',
                '61': 'RolloTron Comfort Master',
                '62': 'Unspecified device'
            };

            const venetianStates = [
                'slatRunTime', 'tiltAfterMoveLevel', 'tiltInVentPos', 'defaultSlatPos',
                'tiltAfterStopDown', 'motorDeadTime', 'tiltInSunPos', 'slatPosition', 'blindsMode'
            ];

            // Test venetian blind devices - should have slat states
            for (const [code, name] of Object.entries(venetianDevices)) {
                const defs = getDeviceStateDefinitions(`${code}1234`);
                for (const state of venetianStates) {
                    assert.ok(defs[state], `${name} (${code}) should have ${state}`);
                }
            }

            // Test regular blind devices - should NOT have slat states
            for (const [code, name] of Object.entries(regularBlindDevices)) {
                const defs = getDeviceStateDefinitions(`${code}1234`);
                for (const state of venetianStates) {
                    assert.ok(!defs[state], `${name} (${code}) should NOT have ${state}`);
                }
            }
        });

        it('should work with different device type codes', () => {
            const blinds = getDeviceStateDefinitions('401234'); // RolloTron Standard
            const thermostat = getDeviceStateDefinitions('731234'); // Raumthermostat
            const sensor = getDeviceStateDefinitions('691234'); // Umweltsensor

            // Currently all return the same, but structure should be consistent
            assert.strictEqual(typeof blinds, 'object');
            assert.strictEqual(typeof thermostat, 'object');
            assert.strictEqual(typeof sensor, 'object');
        });

        it('should include reversal field for blinds devices', () => {
            const blinds = getDeviceStateDefinitions('401234'); // RolloTron Standard (blinds)

            // Reversal should be included in blinds capabilities
            assert.ok(blinds.reversal, 'blinds should have reversal field');
            assert.strictEqual(blinds.reversal.type, 'boolean');
            assert.strictEqual(blinds.reversal.readable, true);
            assert.strictEqual(blinds.reversal.writable, false, 'reversal should be read-only');
        });

        it('should handle unknown device codes with fallback capabilities', () => {
            const unknown = getDeviceStateDefinitions('001234'); // Unknown device type code

            // Unknown devices should get basic capabilities
            assert.ok(unknown.getStatus, 'unknown devices should have getStatus');
            assert.ok(unknown.remotePair, 'unknown devices should have remotePair');
            assert.ok(unknown.up, 'unknown devices should have up');
            assert.ok(unknown.down, 'unknown devices should have down');
            assert.ok(unknown.stop, 'unknown devices should have stop');
            assert.ok(unknown.toggle, 'unknown devices should have toggle');
            assert.ok(unknown.position, 'unknown devices should have position');
            assert.ok(unknown.moving, 'unknown devices should have moving');

            // Should not have device-specific capabilities like slat control
            assert.ok(!unknown.slatPosition, 'unknown devices should not have slatPosition');
            assert.ok(!unknown.lightCurtain, 'unknown devices should not have lightCurtain');
        });
    });

    describe('StateDefinition interface compliance', () => {
        it('should have all required properties in each definition', () => {
            const definitions = getStateDefinitions();

            const requiredProps = ['name', 'type', 'role', 'readable', 'writable'];

            for (const [key, def] of Object.entries(definitions)) {
                // Check required properties
                for (const prop of requiredProps) {
                    assert.ok((def as any)[prop] !== undefined, `${key} missing required property ${prop}`);
                }

                // Check that optional properties are valid if present
                if (def.unit !== undefined) {
                    assert.strictEqual(typeof def.unit, 'string');
                }
                if (def.min !== undefined) {
                    assert.strictEqual(typeof def.min, 'number');
                }
                if (def.max !== undefined) {
                    assert.strictEqual(typeof def.max, 'number');
                }
            }
        });

        it('should have valid type values', () => {
            const definitions = getStateDefinitions();
            const validTypes = ['number', 'string', 'boolean'];

            for (const [key, def] of Object.entries(definitions)) {
                assert.ok(validTypes.includes(def.type), `${key} has invalid type: ${def.type}`);
            }
        });

        it('should have valid role values', () => {
            const definitions = getStateDefinitions();
            const validRoles = ['button', 'state', 'level', 'indicator', 'text'];

            for (const [key, def] of Object.entries(definitions)) {
                assert.ok(validRoles.includes(def.role), `${key} has invalid role: ${def.role}`);
            }
        });

        it('should have logical min/max relationships', () => {
            const definitions = getStateDefinitions();

            for (const [key, def] of Object.entries(definitions)) {
                if (def.min !== undefined && def.max !== undefined) {
                    assert.ok(def.min < def.max, `${key} min should be less than max`);
                }
            }
        });
    });

    describe('Coverage of protocol commands', () => {
        it('should cover all basic movement commands', () => {
            const definitions = getStateDefinitions();

            const movements = ['up', 'down', 'stop', 'toggle', 'position'];
            for (const cmd of movements) {
                assert.ok(definitions[cmd], `Missing command: ${cmd}`);
            }
        });

        it('should cover utility commands', () => {
            const definitions = getStateDefinitions();

            assert.ok(definitions.getStatus);
            assert.ok(definitions.remotePair);
        });
    });

    describe('Coverage of common status fields', () => {
        it('should cover position and movement status', () => {
            const definitions = getStateDefinitions();

            assert.ok(definitions.position);
            assert.ok(definitions.moving);
        });

        it('should cover automatic settings', () => {
            const definitions = getStateDefinitions();

            const automatics = [
                'sunAutomatic',
                'timeAutomatic',
                'duskAutomatic',
                'dawnAutomatic',
                'rainAutomatic',
                'windAutomatic'
            ];

            for (const auto of automatics) {
                assert.ok(definitions[auto], `Missing automatic: ${auto}`);
            }
        });

        it('should cover mode settings', () => {
            const definitions = getStateDefinitions();

            const modes = [
                'manualMode',
                'sunMode',
                'ventilatingMode',
                'windMode',
                'rainMode'
            ];

            for (const mode of modes) {
                assert.ok(definitions[mode], `Missing mode: ${mode}`);
            }
        });

        it('should cover position settings', () => {
            const definitions = getStateDefinitions();

            assert.ok(definitions.sunPosition);
            assert.ok(definitions.ventilatingPosition);
        });
    });

    describe('Type safety and consistency', () => {
        it('should use consistent types for similar fields', () => {
            const definitions = getStateDefinitions();

            // All position fields should be numbers
            const positionFields = ['position', 'sunPosition', 'ventilatingPosition'];
            for (const field of positionFields) {
                if (definitions[field]) {
                    assert.strictEqual(definitions[field].type, 'number', `${field} should be number type`);
                }
            }

            // All automatic fields should be booleans (mapped to true/false)
            const automaticFields = ['sunAutomatic', 'timeAutomatic', 'dawnAutomatic'];
            for (const field of automaticFields) {
                if (definitions[field]) {
                    assert.strictEqual(definitions[field].type, 'boolean', `${field} should be boolean type`);
                }
            }
        });

        it('should have consistent writability for related fields', () => {
            const definitions = getStateDefinitions();

            // All automatic settings should be writable
            const writableSettings = [
                'sunAutomatic',
                'timeAutomatic',
                'duskAutomatic',
                'dawnAutomatic',
                'rainAutomatic',
                'windAutomatic'
            ];

            for (const setting of writableSettings) {
                if (definitions[setting]) {
                    assert.strictEqual(definitions[setting].writable, true, `${setting} should be writable`);
                }
            }
        });
    });
});
