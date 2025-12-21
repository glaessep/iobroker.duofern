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

        it('should include status capabilities', () => {
            const definitions = getStateDefinitions();

            // Common status fields
            assert.ok(definitions.position);
            assert.ok(definitions.moving);
            assert.ok(definitions.sunAutomatic);
            assert.ok(definitions.timeAutomatic);
            assert.ok(definitions.sunMode);
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
            assert.strictEqual(sunAutomatic.type, 'string');
            assert.strictEqual(sunAutomatic.readable, true);
            assert.strictEqual(sunAutomatic.writable, true);

            const timeAutomatic = definitions.timeAutomatic;
            assert.strictEqual(timeAutomatic.type, 'string');
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
                    // Boolean-like states are mapped to "on"/"off" strings
                    assert.strictEqual(definitions[state].type, 'string', `${state} should be string type`);
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

        it('should currently return all definitions (future: device-specific)', () => {
            const allDefs = getStateDefinitions();
            const deviceDefs = getDeviceStateDefinitions('401234');

            // Currently should be the same
            assert.strictEqual(Object.keys(deviceDefs).length, Object.keys(allDefs).length);
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

            // All automatic fields should be strings (mapped to on/off)
            const automaticFields = ['sunAutomatic', 'timeAutomatic', 'dawnAutomatic'];
            for (const field of automaticFields) {
                if (definitions[field]) {
                    assert.strictEqual(definitions[field].type, 'string', `${field} should be string type`);
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
