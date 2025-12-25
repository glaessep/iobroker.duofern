![Logo](admin/duofern.png)

# ioBroker.duofern

[![NPM version](https://img.shields.io/npm/v/iobroker.duofern.svg)](https://www.npmjs.com/package/iobroker.duofern)
[![Downloads](https://img.shields.io/npm/dm/iobroker.duofern.svg)](https://www.npmjs.com/package/iobroker.duofern)
![Number of Installations](https://iobroker.live/badges/duofern-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/duofern-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.duofern.png?downloads=true)](https://nodei.co/npm/iobroker.duofern/)

**Tests:** ![Test and Release](https://github.com/glaessep/ioBroker.duofern/workflows/Test%20and%20Release/badge.svg)

## duofern adapter for ioBroker

Connect Rademacher DuoFern devices via DuoFern USB Stick

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
    - _Note: Currently, this adapter is only tested with blinds/roller shutters._

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

### Best Practices

We've collected some [best practices](https://github.com/ioBroker/ioBroker.repositories#development-and-coding-best-practices) regarding ioBroker development and coding in general. If you're new to ioBroker or Node.js, you should
check them out. If you're already experienced, you should also take a look at them - you might learn something new :)

### Scripts in `package.json`

Several npm scripts are predefined for your convenience. You can run them using `npm run <scriptname>`
| Script name | Description |
|-------------|-------------|
| `build` | Compile the TypeScript sources. |
| `watch` | Compile the TypeScript sources and watch for changes. |
| `test:ts` | Executes the tests you defined in `*.test.ts` files. |
| `test:package` | Ensures your `package.json` and `io-package.json` are valid. |
| `test:integration` | Tests the adapter startup with an actual instance of ioBroker. |
| `test` | Performs a minimal test run on package files and your tests. |
| `check` | Performs a type-check on your code (without compiling anything). |
| `coverage` | Generates code coverage using your test files. |
| `lint` | Runs `ESLint` to check your code for formatting errors and potential bugs. |
| `translate` | Translates texts in your adapter to all required languages, see [`@iobroker/adapter-dev`](https://github.com/ioBroker/adapter-dev#manage-translations) for more details. |
| `release` | Creates a new release, see [`@alcalzone/release-script`](https://github.com/AlCalzone/release-script#usage) for more details. |

### Testing

The project includes comprehensive unit tests with code coverage reporting:

```bash
# Run tests
npm test

# Run tests with coverage report
npm run coverage
```

The project maintains high code coverage standards with automated checks enforced through CI/CD pipelines.

### Test Environment

A standalone CLI is provided to test the library and the stick without ioBroker.

1.  Install dependencies: `npm install`
2.  Run the CLI: `npm run test-env`
3.  In the CLI:
    - `init /dev/ttyUSB0 6Fxxxx` (Replace with your serial port and dongle code)
    - `pair` (Start pairing mode)
    - `unpair` (Start unpairing mode)
    - `reopen` (Reopen and reinitialize the connection)
    - `send <hex>` (Send raw frame)
    - `exit`

### Build

```bash
npm run build
```

### Publishing the adapter

Using GitHub Actions, you can enable automatic releases on npm whenever you push a new git tag that matches the form
`v<major>.<minor>.<patch>`. We **strongly recommend** that you do. The necessary steps are described in `.github/workflows/test-and-release.yml`.

Since you installed the release script, you can create a new
release simply by calling:

```bash
npm run release
```

Additional command line options for the release script are explained in the
[release-script documentation](https://github.com/AlCalzone/release-script#command-line).

## Changelog

### **WORK IN PROGRESS**

### 0.6.4 (2024-12-25)

- (glaessep) Added GitHub workflow for automated test and coverage checks
- (glaessep) Improved parameter visualization in adapter settings
- (glaessep) Enhanced documentation

## License

MIT License

Copyright (c) 2024 Patrick Gläßer <p.glaesser@hotmail.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

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
    - _Note: Currently, this adapter is only tested with blinds/roller shutters._

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
    - `init /dev/ttyUSB0 6Fxxxx` (Replace with your serial port and dongle code)
    - `pair` (Start pairing mode)
    - `unpair` (Start unpairing mode)
    - `reopen` (Reopen and reinitialize the connection)
    - `send <hex>` (Send raw frame)
    - `exit`

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
