# ioBroker.duofern AI Coding Instructions

## Project Overview
This is an ioBroker adapter for Rademacher DuoFern devices, communicating via a USB stick (serial port). It is written in TypeScript.

## Architecture
- **Adapter Layer** (`src/main.ts`): Extends `@iobroker/adapter-core`. Manages the adapter lifecycle, configuration, and maps DuoFern messages to ioBroker states.
- **Hardware Layer** (`src/duofern/stick.ts`): Manages the serial connection to the DuoFern stick. Handles buffering, queueing, and basic protocol flow (ACKs).
- **Protocol Layer**:
  - `src/duofern/protocol.ts`: Defines command constants and frame builders. All device commands are 4-byte structures (8 hex chars) consisting of: prefix (07) + sub-command + param1 + param2. Commands are wrapped in 22-byte frames with proper padding.
  - `src/duofern/parser.ts`: Parses incoming hex strings into usable objects.
- **Testing** (`test/protocol.test.ts`): Comprehensive unit tests validating all command formats against captured protocol traffic. Ensures commands generate correct 22-byte frames.


## Key Conventions
- **Logging**:
  - In `DuoFernAdapter`: Use `this.log.info()`, `this.log.error()`, etc.
  - In `DuoFernStick`: Emit `log` events (`this.emit('log', level, msg)`).
- **State Management**:
  - Use `this.setState()` or `this.setStateAsync()` to update ioBroker states.
  - Device IDs are typically the 6-digit hex DuoFern code.

## Configuration
- **Port**: Serial port path (e.g., `/dev/ttyUSB0`).
- **Code**: 6-digit hex code of the DuoFern stick (starts with `6F`).
- Defined in `io-package.json` under `native`.

## Contributing to the Code

**For complete contribution guidelines, see [CONTRIBUTING.md](../CONTRIBUTING.md).**

### Code Quality Standards
- **TypeScript**: All source code must be written in TypeScript with proper type annotations.
- **Linting**: Run `npm run lint` before committing. Fix all ESLint errors.
- **Testing**: Add or update tests in `test/protocol.test.ts` for protocol changes. Run `npm test` to validate.
- **Build**: Ensure `npm run build` completes without errors before submitting changes.

### Commit Guidelines
Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` for new features (minor version bump)
- `fix:` for bug fixes (patch version bump)
- `docs:` for documentation changes
- `refactor:`, `test:`, `chore:` for other changes
- Example: `feat: add support for tilt position control`

See [CONTRIBUTING.md](../CONTRIBUTING.md) for complete commit message format and examples.

### Version Management
- This project follows [Semantic Versioning](https://semver.org/).
- Use `npm run version` to bump version numbers (updates package.json and io-package.json).
- Version is automatically incremented based on commit message types since last release.

## External Dependencies
- `serialport`: For communicating with the USB stick.
- `@iobroker/adapter-core`: Base class and utilities for ioBroker adapters.
