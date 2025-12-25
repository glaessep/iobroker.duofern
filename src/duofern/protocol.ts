/**
 * @file DuoFern Protocol Definitions
 *
 * Defines the DuoFern serial protocol commands, frame builders, and command constants.
 * All commands are 4-byte structures (8 hex chars) that get wrapped in 22-byte frames
 * (44 hex chars) with proper device addressing and padding.
 *
 * The protocol implementation is based on reverse engineering and analysis of the
 * FHEM DuoFern module behavior.
 */

/**
 * Protocol-level command templates and patterns.
 *
 * Contains initialization sequences, pairing commands, acknowledgment patterns,
 * and frame matching regular expressions.
 *
 */
export const Protocol = {
    // Init sequences
    duoInit1: '01000000000000000000000000000000000000000000',
    duoInit2: '0E000000000000000000000000000000000000000000',
    duoSetDongle: '0Azzzzzz000100000000000000000000000000000000', // zzzzzz = dongle serial
    duoInit3: '14140000000000000000000000000000000000000000',
    duoSetPairs: '03nnyyyyyy0000000000000000000000000000000000', // nn = counter, yyyyyy = device code
    duoInitEnd: '10010000000000000000000000000000000000000000',

    // Basic commands
    duoACK: '81000000000000000000000000000000000000000000',
    duoStatusRequest: '0DFF0F400000000000000000000000000000FFFFFF01',

    // Pairing
    duoStartPair: '04000000000000000000000000000000000000000000',
    duoStopPair: '05000000000000000000000000000000000000000000',
    duoStartUnpair: '07000000000000000000000000000000000000000000',
    duoStopUnpair: '08000000000000000000000000000000000000000000',
    duoRemotePair: '0D0106010000000000000000000000000000yyyyyy00', // yyyyyy = device code

    // Responses / Patterns
    ackPattern: /^81.{42}$/, // ACK messages
    pairPaired: /^0602.{40}$/,
    pairUnpaired: /^0603.{40}$/,
    statusFrame: /^(06|0F).{42}$/, // Status messages
};

/**
 * Device command definitions.
 *
 * All commands are 4-byte structures (8 hex characters) consisting of:
 * - Byte 0: Command prefix (typically 07 for movement, 08 for settings)
 * - Byte 1: Sub-command identifier
 * - Bytes 2-3: Parameters (often 00 00, or containing position/value)
 *
 * These commands are wrapped in full 22-byte frames by buildCommand().
 *
 */
export const Commands = {
    // Basic Movement - All commands are 4 bytes: prefix + cmd + param1 + param2
    up: '07010000', // 4 bytes: 07 01 00 00
    stop: '07020000', // 4 bytes: 07 02 00 00
    down: '07030000', // 4 bytes: 07 03 00 00
    position: '070700nn', // 4 bytes: 07 07 00 nn (nn = position 00-64 hex = 0-100%)
    toggle: '071A0000', // 4 bytes: 07 1A 00 00
    remotePair: '06010000', // 4 bytes: 06 01 00 00

    // Status/Query - Special command using channel FF, no stick code, suffix 01
    statusRequest: '0F400000', // 4 bytes: 0F 40 00 00 (use with channel=FF, suffix=01, no stickCode)

    // Modes (On/Off) - All 4 bytes
    sunModeOn: '070801FF',
    sunModeOff: '070A0100',
    windModeOn: '070D01FF',
    windModeOff: '070E0100',
    rainModeOn: '071101FF',
    rainModeOff: '07120100',

    // Automatics (On/Off) - All 4 bytes
    sunAutomaticOn: '080100FD',
    sunAutomaticOff: '080100FE',
    timeAutomaticOn: '080400FD',
    timeAutomaticOff: '080400FE',
    dawnAutomaticOn: '080900FD',
    dawnAutomaticOff: '080900FE',
    duskAutomaticOn: '080500FD',
    duskAutomaticOff: '080500FE',
    manualModeOn: '080600FD',
    manualModeOff: '080600FE',
    windAutomaticOn: '080700FD',
    windAutomaticOff: '080700FE',
    rainAutomaticOn: '080800FD',
    rainAutomaticOff: '080800FE',

    // Configuration / Positions - All 4 bytes
    sunPosition: '080100nn', // 4 bytes: 08 01 00 nn
    ventilatingPosition: '080200nn', // 4 bytes: 08 02 00 nn
    ventilatingModeOn: '080200FD',
    ventilatingModeOff: '080200FE',
    slatPosition: '071B00nn', // 4 bytes: 07 1B 00 nn (nn = position 00-64 hex = 0-100%)
};

/**
 * Builds the "Set Dongle" initialization command.
 *
 * This command configures the stick with its 6-digit serial number during initialization.
 *
 * @param serial - 6-character hex string representing the stick's serial number
 * @returns 44-character hex frame ready to send
 * @throws {Error} If serial is not exactly 6 hex digits
 */
export function buildSetDongle(serial: string): string {
    if (!/^[0-9A-F]{6}$/i.test(serial)) {
        throw new Error('Invalid dongle serial. Must be 6 hex digits.');
    }
    return Protocol.duoSetDongle.replace('zzzzzz', serial.toUpperCase());
}

/**
 * Builds a "Set Pairs" command to register a known device during initialization.
 *
 * Each known device must be registered with a sequential counter during the
 * initialization sequence so the stick can recognize and communicate with it.
 *
 * @param counter - Sequential device counter (0, 1, 2, ...)
 * @param deviceCode - 6-character hex device code
 * @returns 44-character hex frame ready to send
 */
export function buildSetPairs(counter: number, deviceCode: string): string {
    const nn = counter.toString(16).padStart(2, '0').toUpperCase();
    const yyyyyy = deviceCode.toUpperCase();
    return Protocol.duoSetPairs.replace('nn', nn).replace('yyyyyy', yyyyyy);
}

/**
 * Builds a remote pairing command for the initialization sequence.
 *
 * @param deviceCode - 6-character hex device code to pair
 * @returns 44-character hex frame ready to send
 */
export function buildRemotePair(deviceCode: string): string {
    return Protocol.duoRemotePair.replace('yyyyyy', deviceCode.toUpperCase());
}

/**
 * Builds a 22-byte (44-character) command frame for DuoFern devices.
 *
 * @param template - 4-byte (8 hex char) command body from Commands object (e.g., Commands.up)
 * @param replacements - Dynamic values to replace placeholders in template (e.g., {"nn": position})
 * @param options - Frame parameters: deviceCode (6 hex), stickCode (6 hex), channel (2 hex), suffix (2 hex)
 * @param options.deviceCode - Device code
 * @param options.stickCode - Stick code
 * @param options.channel - Device channel
 * @param options.suffix - Command suffix
 * @returns 44-character hex string representing the complete command frame
 *
 * The function builds a 22-byte frame with this structure:
 * - Bytes 0-1: Prefix ("0D") and channel
 * - Bytes 2-5: Command body (4 bytes from template, after replacements)
 * - Bytes 6-11: Padding (all zeros)
 * - Bytes 12-14: Stick code (from options.stickCode)
 * - Bytes 15-17: Device code (from options.deviceCode)
 * - Bytes 18-21: Suffix (from options.suffix)
 *
 * Parameter precedence: options values are used directly; replacements are for
 * template placeholders only (e.g., position value in "070700nn").
 */
export function buildCommand(
    template: string,
    replacements: Record<string, string | number>,
    options?: { deviceCode?: string; stickCode?: string; channel?: string; suffix?: string },
): string {
    let cmd = template;

    // Replace placeholders in the command body (e.g., tt/nn).
    for (const [key, value] of Object.entries(replacements)) {
        let hexVal = '';
        if (typeof value === 'number') {
            hexVal = value.toString(16).padStart(2, '0').toUpperCase();
        } else {
            hexVal = value.toUpperCase();
        }
        cmd = cmd.replace(key, hexVal);
    }

    // All commands are exactly 4 bytes (8 hex chars)
    // Pad with 00 if needed to ensure 8 hex chars
    if (cmd.length < 8) {
        cmd = cmd.padEnd(8, '0');
    }
    const commandBody = cmd.substring(0, 8);

    // Frame structure: 0D + CH(1) + CMD(4) + PADDING(9) + STICK(3) + DEVICE(3) + SF(1) = 22 bytes
    // 0D(2) + CH(2) + CMD(8) + PADDING(18) + STICK(6) + DEVICE(6) + SF(2) = 44 hex chars
    const padding = '000000000000000000'; // 9 bytes = 18 hex chars

    // Wrap in full DuoFern frame if device code is provided
    const deviceCode = options?.deviceCode || (replacements.yyyyyy as string | undefined);
    const stickCode = options?.stickCode || (replacements.zzzzzz as string | undefined);

    if (deviceCode) {
        const channel = (options?.channel || '01').toUpperCase();
        const suffix = (options?.suffix || '00').toUpperCase();
        const stick = stickCode ? stickCode.toUpperCase() : '000000'; // Use 000000 if no stick code (e.g., status requests)

        return [
            '0D', // Start byte (1)
            channel, // Channel (1)
            commandBody, // Command (4 bytes = 8 hex chars)
            padding, // Padding (9 bytes = 18 hex chars)
            stick, // Stick code (3) or 000000 for broadcast
            deviceCode.toUpperCase(), // Device code (3)
            suffix, // Suffix (1)
        ].join(''); // Total: 22 bytes = 44 hex chars
    }

    return cmd;
}

/**
 * Build a status request for a specific device (or broadcast with FFFFFF).
 * Uses channel FF, no stick code, and suffix 01.
 *
 * @param deviceCode - 6-character hex device code to query
 * @returns 44-character hex frame ready to send
 */
export function buildStatusRequest(deviceCode: string): string {
    return buildCommand(
        Commands.statusRequest,
        {},
        {
            deviceCode: deviceCode.toUpperCase(),
            channel: 'FF',
            suffix: '01',
            // No stickCode = uses 000000
        },
    );
}

/**
 * Build a broadcast status request to all devices (equivalent to FHEM's statusBroadcast).
 * This is a convenience function that calls buildStatusRequest with 'FFFFFF'.
 *
 * @returns 44-character hex frame ready to send
 */
export function buildBroadcastStatusRequest(): string {
    return buildStatusRequest('FFFFFF');
}

/**
 * Builds remote pair command frames for pairing a device without physical button press.
 *
 * Generates two frames (with suffixes 00 and 01) that must be sent in sequence
 * to remotely pair a device.
 *
 * @param deviceCode - 6-character hex device code to pair
 * @param [channel] - Channel identifier (default: "01")
 * @returns Array of two 44-character hex frames
 */
export function buildRemotePairFrames(deviceCode: string, channel = '01'): string[] {
    const dev = deviceCode.toUpperCase();
    const chan = channel.toUpperCase();
    // Build frames matching the Protocol.duoRemotePair structure:
    // "0D" + channel + "060100" + 26 zero hex chars + deviceCode (6 hex) + suffix
    // Total: 44 hex chars (22 bytes)
    const frame = (suffix: string): string => `0D${chan}06010000000000000000000000000000${dev}${suffix}`;
    return [frame('00'), frame('01')];
}
