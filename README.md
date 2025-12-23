# ioBroker.duofern

Adapter for Rademacher DuoFern devices via DuoFern USB Stick.

## Installation

1. Install the adapter through ioBroker Admin interface
2. Configure the serial port and stick code
3. Start the adapter

## Configuration

### Serial Port
Specify the path to the serial port where your DuoFern USB stick is connected:
- Linux: `/dev/ttyUSB0` or `/dev/serial/by-id/...`
- Windows: `COM1`, `COM2`, etc.

**Example**: `/dev/serial/by-id/usb-Rademacher_DuoFern_USB-Stick_WR03XXXX-if00-port0`

**Tip**: On Linux, it is highly recommended to use the path in `/dev/serial/by-id/` instead of `/dev/ttyUSB0`, as it is persistent and more stable across reboots. Use `ls -l /dev/serial/by-id/` to find the correct path.

### DuoFern Stick Code
Enter the 6-digit hexadecimal code of your DuoFern stick:
- Must start with `6F`
- Last 4 digits are freely configurable (e.g., `6F1234`)

## Supported Devices

- **Blinds/Roller Shutters**: Basic control (up, down, stop, position, other commands may work, but untested)
  - *Note: Currently, this adapter is only tested with blinds/roller shutters.*

## Usage

1. Put devices into pairing mode using the `pair` button in the adapter
2. Activate pairing mode on your DuoFern device (see device manual)
3. The device should appear automatically in the object tree
4. Control devices through the created states

## Troubleshooting

### Device not found
- Check serial port path and permissions
- Verify stick code is correct
- Ensure USB stick is properly connected

### Device not responding
- Check if device is within radio range
- Verify device is properly paired
- Check adapter logs for error messages

## Acknowledgements

- **FHEM**: This adapter is inspired by the DuoFern module for FHEM. For more details on the DuoFern module, refer to the [FHEM Wiki](https://wiki.fhem.de/wiki/Rademacher_DuoFern).

## Development

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Commit message format (Conventional Commits)
- Version management and semantic versioning
- Code quality standards and testing requirements

### Testing

The project includes comprehensive unit tests with code coverage reporting:

```bash
# Run tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests with coverage threshold validation
npm run test:coverage:check
```

The project maintains high code coverage standards with automated checks enforced through CI/CD pipelines.

### Test Environment
A standalone CLI is provided to test the library and the stick without ioBroker.

1.  Install dependencies: `npm install`
2.  Run the CLI: `npm run test-env`
3.  In the CLI:
    -   `init /dev/ttyUSB0 6Fxxxx` (Replace with your serial port and dongle code)
    -   `pair` (Start pairing mode)
    -   `unpair` (Start unpairing mode)
    -   `reopen` (Reopen and reinitialize the connection)
    -   `send <hex>` (Send raw frame)
    -   `exit`

### Build
```bash
npm run build
```

### Continuous Integration

The project uses GitHub Actions for automated testing and quality checks:
- **Test Workflow**: Runs on every pull request to the main branch
- **Coverage Validation**: Enforces minimum coverage thresholds for statements, branches, and functions
- **Build Verification**: Ensures TypeScript compilation succeeds

All pull requests must pass these automated checks before merging.
