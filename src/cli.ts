import * as readline from 'readline';
import { DuoFernStick } from './duofern/stick';
import { parseStatus } from './duofern/parser';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let stick: DuoFernStick | null = null;

console.log("DuoFern CLI Test Environment");
console.log("Commands: init <path> <serial>, pair, unpair, reopen, send <hex>, exit");

rl.on('line', async (line) => {
    const args = line.trim().split(' ');
    const cmd = args[0];

    try {
        switch (cmd) {
            case 'init':
                if (args.length < 3) {
                    console.log("Usage: init <path> <serial>");
                    break;
                }
                const path = args[1];
                const serial = args[2];
                stick = new DuoFernStick(path, serial);

                stick.on('log', (level, msg) => console.log(`[${level.toUpperCase()}] ${msg}`));
                stick.on('error', (err) => console.error(`[ERROR]`, err));
                stick.on('initialized', () => console.log("Stick Initialized!"));
                stick.on('frame', (frame) => console.log(`RX: ${frame}`));
                stick.on('message', (frame) => {
                    console.log(`MSG: ${frame}`);
                    if (frame.startsWith("0FFF0F")) {
                        try {
                            const status = parseStatus(frame);
                            console.log("Parsed Status:", status);
                        } catch (e) {
                            console.error("Parse error:", e);
                        }
                    }
                });
                stick.on('paired', (frame) => console.log(`PAIRED: ${frame}`));
                stick.on('unpaired', (frame) => console.log(`UNPAIRED: ${frame}`));

                await stick.open();
                break;

            case 'pair':
                if (!stick) { console.log("Not initialized"); break; }
                stick.pair();
                console.log("Pairing started...");
                break;

            case 'unpair':
                if (!stick) { console.log("Not initialized"); break; }
                stick.unpair();
                console.log("Unpairing started...");
                break;

            case 'reopen':
                if (!stick) { console.log("Not initialized"); break; }
                console.log("Reopening connection...");
                await stick.reopen();
                console.log("Connection reopened");
                break;

            case 'send':
                if (!stick) { console.log("Not initialized"); break; }
                if (args.length < 2) { console.log("Usage: send <hex>"); break; }
                stick.write(args[1]);
                break;

            case 'exit':
                if (stick) await stick.close();
                process.exit(0);
                break;

            default:
                console.log("Unknown command");
        }
    } catch (e) {
        console.error("Error:", e);
    }
});
