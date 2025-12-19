export const Protocol = {
    // Init sequences
    duoInit1: "01000000000000000000000000000000000000000000",
    duoInit2: "0E000000000000000000000000000000000000000000",
    duoSetDongle: "0Azzzzzz000100000000000000000000000000000000", // zzzzzz = dongle serial
    duoInit3: "14140000000000000000000000000000000000000000",
    duoSetPairs: "03nnyyyyyy0000000000000000000000000000000000", // nn = counter, yyyyyy = device code
    duoInitEnd: "10010000000000000000000000000000000000000000",

    // Basic commands
    duoACK: "81000000000000000000000000000000000000000000",
    duoStatusRequest: "0DFF0F400000000000000000000000000000FFFFFF01",

    // Pairing
    duoStartPair: "04000000000000000000000000000000000000000000",
    duoStopPair: "05000000000000000000000000000000000000000000",
    duoStartUnpair: "07000000000000000000000000000000000000000000",
    duoStopUnpair: "08000000000000000000000000000000000000000000",
    duoRemotePair: "0D0106010000000000000000000000000000yyyyyy00", // yyyyyy = device code

    // Responses / Patterns
    ackPattern: /^81.{42}$/,       // ACK messages
    pairPaired: /^0602.{40}$/,
    pairUnpaired: /^0603.{40}$/,
    statusFrame: /^(06|0F).{42}$/, // Status messages 
};

export const Commands = {
    // Basic Movement - All commands are 4 bytes: prefix + cmd + param1 + param2
    up: "07010000",        // 4 bytes: 07 01 00 00
    stop: "07020000",      // 4 bytes: 07 02 00 00
    down: "07030000",      // 4 bytes: 07 03 00 00
    position: "070700nn",  // 4 bytes: 07 07 00 nn (nn = position 00-64 hex = 0-100%)
    toggle: "071A0000",    // 4 bytes: 07 1A 00 00
    remotePair: "06010000",// 4 bytes: 06 01 00 00

    // Status/Query - Special command using channel FF, no stick code, suffix 01
    statusRequest: "0F400000", // 4 bytes: 0F 40 00 00 (use with channel=FF, suffix=01, no stickCode)

    // Modes (On/Off) - All 4 bytes
    sunModeOn: "070801FF",
    sunModeOff: "070A0100",
    windModeOn: "070D01FF",
    windModeOff: "070E0100",
    rainModeOn: "071101FF",
    rainModeOff: "07120100",

    // Automatics (On/Off) - All 4 bytes
    sunAutomaticOn: "080100FD",
    sunAutomaticOff: "080100FE",
    timeAutomaticOn: "080400FD",
    timeAutomaticOff: "080400FE",
    dawnAutomaticOn: "080900FD",
    dawnAutomaticOff: "080900FE",
    duskAutomaticOn: "080500FD",
    duskAutomaticOff: "080500FE",
    manualModeOn: "080600FD",
    manualModeOff: "080600FE",
    windAutomaticOn: "080700FD",
    windAutomaticOff: "080700FE",
    rainAutomaticOn: "080800FD",
    rainAutomaticOff: "080800FE",

    // Configuration / Positions - All 4 bytes
    sunPosition: "080100nn",       // 4 bytes: 08 01 00 nn
    ventilatingPosition: "080200nn", // 4 bytes: 08 02 00 nn
    ventilatingModeOn: "080200FD",
    ventilatingModeOff: "080200FE",

};

export function buildSetDongle(serial: string): string {
    if (!/^[0-9A-F]{6}$/i.test(serial)) {
        throw new Error("Invalid dongle serial. Must be 6 hex digits.");
    }
    return Protocol.duoSetDongle.replace("zzzzzz", serial.toUpperCase());
}

export function buildSetPairs(counter: number, deviceCode: string): string {
    const nn = counter.toString(16).padStart(2, "0").toUpperCase();
    const yyyyyy = deviceCode.toUpperCase();
    return Protocol.duoSetPairs.replace("nn", nn).replace("yyyyyy", yyyyyy);
}

export function buildRemotePair(deviceCode: string): string {
    return Protocol.duoRemotePair.replace("yyyyyy", deviceCode.toUpperCase());
}

export function buildCommand(
    template: string,
    replacements: Record<string, string | number>,
    options?: { deviceCode?: string; stickCode?: string; channel?: string; suffix?: string }
): string {
    let cmd = template;

    // Replace placeholders in the command body (e.g., tt/nn).
    for (const [key, value] of Object.entries(replacements)) {
        let hexVal = "";
        if (typeof value === 'number') {
            hexVal = value.toString(16).padStart(2, "0").toUpperCase();
        } else {
            hexVal = value.toUpperCase();
        }
        cmd = cmd.replace(key, hexVal);
    }

    // All commands are exactly 4 bytes (8 hex chars)
    // Pad with 00 if needed to ensure 8 hex chars
    if (cmd.length < 8) {
        cmd = cmd.padEnd(8, "0");
    }
    const commandBody = cmd.substring(0, 8);

    // Frame structure: 0D + CH(1) + CMD(4) + PADDING(9) + STICK(3) + DEVICE(3) + SF(1) = 22 bytes
    // 0D(2) + CH(2) + CMD(8) + PADDING(18) + STICK(6) + DEVICE(6) + SF(2) = 44 hex chars
    const padding = "000000000000000000"; // 9 bytes = 18 hex chars

    // Wrap in full DuoFern frame if device code is provided
    const deviceCode = options?.deviceCode || (replacements['yyyyyy'] as string | undefined);
    const stickCode = options?.stickCode || (replacements['zzzzzz'] as string | undefined);

    if (deviceCode) {
        const channel = (options?.channel || "01").toUpperCase();
        const suffix = (options?.suffix || "00").toUpperCase();
        const stick = stickCode ? stickCode.toUpperCase() : "000000"; // Use 000000 if no stick code (e.g., status requests)

        return [
            "0D",                          // Start byte (1)
            channel,                       // Channel (1)
            commandBody,                   // Command (4 bytes = 8 hex chars)
            padding,                       // Padding (9 bytes = 18 hex chars)
            stick,                         // Stick code (3) or 000000 for broadcast
            deviceCode.toUpperCase(),      // Device code (3)
            suffix                         // Suffix (1)
        ].join("");                        // Total: 22 bytes = 44 hex chars
    }

    return cmd;
}

/**
 * Build a status request for a specific device (or broadcast with FFFFFF).
 * Uses channel FF, no stick code, and suffix 01.
 */
export function buildStatusRequest(deviceCode: string): string {
    return buildCommand(Commands.statusRequest, {}, {
        deviceCode: deviceCode.toUpperCase(),
        channel: "FF",
        suffix: "01"
        // No stickCode = uses 000000
    });
}

/**
 * Build a broadcast status request to all devices (equivalent to FHEM's statusBroadcast).
 * This is a convenience function that calls buildStatusRequest with 'FFFFFF'.
 */
export function buildBroadcastStatusRequest(): string {
    return buildStatusRequest('FFFFFF');
}

export function buildRemotePairFrames(deviceCode: string, channel = "01"): string[] {
    const dev = deviceCode.toUpperCase();
    const chan = channel.toUpperCase();
    const body = Commands.remotePair;
    const frame = (suffix: string) => ["0D", chan, body, "000000000000", dev, suffix].join("");
    return [frame("00"), frame("01")];
}
