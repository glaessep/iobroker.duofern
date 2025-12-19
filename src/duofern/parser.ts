
interface StatusIdDef {
    name: string;
    map?: string;
    invert?: number;
    chan: {
        [key: string]: {
            position: number;
            from: number;
            to: number;
        }
    }
}

const statusGroups: { [key: string]: number[] } = {
    "21": [100, 101, 102, 104, 105, 106, 111, 112, 113, 114, 50],
    "22": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "23": [102, 107, 109, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 140, 141, 50],
    "23a": [102, 107, 109, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 133, 140, 141, 50],
    "24": [102, 107, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 140, 141, 400, 402, 50],
    "24a": [102, 107, 115, 123, 124, 400, 402, 404, 405, 406, 407, 408, 409, 410, 411, 50],
    // ... others omitted for now (blinds focus)
};

const statusMapping: { [key: string]: any[] } = {
    "onOff": ["off", "on"],
    "upDown": ["up", "down"],
    // The "moving" mapping always returns "stop" regardless of the bit value.
    // This is correct! We manage the actual moving state through command logic,
    // not through device status parsing. When commands like up/down/position are sent,
    // we explicitly update the moving reading to "up"/"down"/"moving"/"stop".
    // The device status only provides a placeholder that always maps to "stop".
    "moving": ["stop", "stop"],
    "motor": ["off", "short(160ms)", "long(480ms)", "individual"],
    "closeT": ["off", "30", "60", "90", "120", "150", "180", "210", "240"],
    "openS": ["error", "11", "15", "19"],
    "scale10": [10, 0],
    "scaleF1": [2, 80],
    "scaleF2": [10, 400],
    "scaleF3": [2, -8],
    "scaleF4": [100, 0],
    "hex": [1, 0],
};

const statusIds: { [key: number]: StatusIdDef } = {
    50: { "name": "moving", "map": "moving", "chan": { "01": { "position": 0, "from": 0, "to": 0 }, "02": { "position": 0, "from": 0, "to": 0 } } },
    100: { "name": "sunAutomatic", "map": "onOff", "chan": { "01": { "position": 0, "from": 2, "to": 2 } } },
    101: { "name": "timeAutomatic", "map": "onOff", "chan": { "01": { "position": 0, "from": 0, "to": 0 } } },
    102: { "name": "position", "invert": 100, "chan": { "01": { "position": 7, "from": 0, "to": 6 } } },
    104: { "name": "duskAutomatic", "map": "onOff", "chan": { "01": { "position": 0, "from": 3, "to": 3 } } },
    105: { "name": "dawnAutomatic", "map": "onOff", "chan": { "01": { "position": 1, "from": 3, "to": 3 } } },
    106: { "name": "manualMode", "map": "onOff", "chan": { "01": { "position": 0, "from": 7, "to": 7 } } },
    107: { "name": "manualMode", "map": "onOff", "chan": { "01": { "position": 3, "from": 5, "to": 5 } } },
    109: { "name": "runningTime", "chan": { "01": { "position": 6, "from": 0, "to": 7 } } },
    111: { "name": "sunPosition", "invert": 100, "chan": { "01": { "position": 6, "from": 0, "to": 6 } } },
    112: { "name": "ventilatingPosition", "invert": 100, "chan": { "01": { "position": 2, "from": 0, "to": 6 } } },
    113: { "name": "ventilatingMode", "map": "onOff", "chan": { "01": { "position": 2, "from": 7, "to": 7 } } },
    114: { "name": "sunMode", "map": "onOff", "chan": { "01": { "position": 6, "from": 7, "to": 7 } } },
    115: { "name": "timeAutomatic", "map": "onOff", "chan": { "01": { "position": 3, "from": 0, "to": 0 } } },
    116: { "name": "sunAutomatic", "map": "onOff", "chan": { "01": { "position": 3, "from": 2, "to": 2 } } },
    117: { "name": "dawnAutomatic", "map": "onOff", "chan": { "01": { "position": 2, "from": 1, "to": 1 } } },
    118: { "name": "duskAutomatic", "map": "onOff", "chan": { "01": { "position": 3, "from": 1, "to": 1 } } },
    119: { "name": "rainAutomatic", "map": "onOff", "chan": { "01": { "position": 3, "from": 7, "to": 7 } } },
    120: { "name": "windAutomatic", "map": "onOff", "chan": { "01": { "position": 3, "from": 6, "to": 6 } } },
    121: { "name": "sunPosition", "invert": 100, "chan": { "01": { "position": 5, "from": 0, "to": 6 } } },
    122: { "name": "sunMode", "map": "onOff", "chan": { "01": { "position": 3, "from": 4, "to": 4 } } },
    123: { "name": "ventilatingPosition", "invert": 100, "chan": { "01": { "position": 4, "from": 0, "to": 6 } } },
    124: { "name": "ventilatingMode", "map": "onOff", "chan": { "01": { "position": 4, "from": 7, "to": 7 } } },
    125: { "name": "reversal", "map": "onOff", "chan": { "01": { "position": 7, "from": 7, "to": 7 } } },
    126: { "name": "rainDirection", "map": "upDown", "chan": { "01": { "position": 2, "from": 3, "to": 3 } } },
    127: { "name": "windDirection", "map": "upDown", "chan": { "01": { "position": 2, "from": 2, "to": 2 } } },
    128: { "name": "slatRunTime", "chan": { "01": { "position": 0, "from": 0, "to": 5 } } },
    129: { "name": "tiltAfterMoveLevel", "map": "onOff", "chan": { "01": { "position": 0, "from": 6, "to": 6 } } },
    130: { "name": "tiltInVentPos", "map": "onOff", "chan": { "01": { "position": 0, "from": 7, "to": 7 } } },
    131: { "name": "defaultSlatPos", "chan": { "01": { "position": 1, "from": 0, "to": 6 } } },
    132: { "name": "tiltAfterStopDown", "map": "onOff", "chan": { "01": { "position": 1, "from": 7, "to": 7 } } },
    133: { "name": "motorDeadTime", "map": "motor", "chan": { "01": { "position": 2, "from": 4, "to": 5 } } },
    134: { "name": "tiltInSunPos", "map": "onOff", "chan": { "01": { "position": 5, "from": 7, "to": 7 } } },
    135: { "name": "slatPosition", "chan": { "01": { "position": 9, "from": 0, "to": 6 } } },
    136: { "name": "blindsMode", "map": "onOff", "chan": { "01": { "position": 9, "from": 7, "to": 7 } } },
    140: { "name": "windMode", "map": "onOff", "chan": { "01": { "position": 3, "from": 3, "to": 3 } } },
    141: { "name": "rainMode", "map": "onOff", "chan": { "01": { "position": 2, "from": 0, "to": 0 } } },
    400: { "name": "obstacle", "chan": { "01": { "position": 2, "from": 4, "to": 4 } } },
    402: { "name": "block", "chan": { "01": { "position": 2, "from": 6, "to": 6 } } },
    404: { "name": "lightCurtain", "chan": { "01": { "position": 0, "from": 7, "to": 7 } } },
    405: { "name": "automaticClosing", "map": "closeT", "chan": { "01": { "position": 1, "from": 0, "to": 3 } } },
    406: { "name": "openSpeed", "map": "openS", "chan": { "01": { "position": 1, "from": 4, "to": 6 } } },
    407: { "name": "2000cycleAlarm", "map": "onOff", "chan": { "01": { "position": 1, "from": 7, "to": 7 } } },
    408: { "name": "wicketDoor", "map": "onOff", "chan": { "01": { "position": 5, "from": 7, "to": 7 } } },
    409: { "name": "backJump", "map": "onOff", "chan": { "01": { "position": 9, "from": 0, "to": 0 } } },
    410: { "name": "10minuteAlarm", "map": "onOff", "chan": { "01": { "position": 9, "from": 1, "to": 1 } } },
    411: { "name": "light", "map": "onOff", "chan": { "01": { "position": 9, "from": 2, "to": 2 } } },
};

export function parseStatus(frame: string): Record<string, any> {
    // Frame format: 0FFF0F...
    // Byte 3 (index 6-7) is format
    const format = frame.substring(6, 8);
    const result: Record<string, any> = {};

    // Default to channel 01 for now
    const chan = "01";

    if (statusGroups[format]) {
        for (const id of statusGroups[format]) {
            const def = statusIds[id];
            if (!def) continue;

            const chanDef = def.chan[chan];
            if (!chanDef) continue;

            const pos = chanDef.position;
            const from = chanDef.from;
            const to = chanDef.to;
            const len = to - from + 1;

            // Extract 4 hex chars (2 bytes) starting at 6 + pos*2
            // Frame structure: 0FFF0F[FORMAT][DATA1][DATA2]...
            // Index:           0123456789...
            // Position 0: reads FORMAT + DATA1 (indices 6-9) 
            // Position 1: reads DATA1 + DATA2 (indices 8-11)
            // This means some status bits are embedded in the format byte itself!
            // The format byte is both format identifier AND contains status data.

            const startIndex = 6 + pos * 2;
            const hexVal = frame.substring(startIndex, startIndex + 4);
            let value = parseInt(hexVal, 16);

            // Bitwise extraction
            value = (value >> from) & ((1 << len) - 1);

            // Invert
            if (def.invert !== undefined) {
                value = def.invert - value;
            }

            // Map
            if (def.map && statusMapping[def.map]) {
                const map = statusMapping[def.map];
                // Check for scale/hex maps
                if (def.map.startsWith("scale")) {
                    // Not implemented for blinds, mostly for sensors
                } else if (def.map === "hex") {
                    // Not implemented
                } else {
                    // Array map
                    if (value < map.length) {
                        result[def.name] = map[value];
                    } else {
                        result[def.name] = value;
                    }
                }
            } else {
                result[def.name] = value;
            }
        }
    }

    return result;
}
