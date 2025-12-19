# Contributing to ioBroker.duofern

Thank you for considering contributing to ioBroker.duofern! We welcome contributions from everyone.

## Getting Started

1.  **Fork** the repository on GitHub.
2.  **Clone** your fork locally.
3.  Create a new **branch** for your feature or bugfix.
4.  Make your changes and commit them.
5.  Push your branch to your fork.
6.  Submit a **Pull Request** to the `main` branch of the original repository.

## Versioning

This project follows [Semantic Versioning](https://semver.org/) (SemVer).
Version numbers are in the format `MAJOR.MINOR.PATCH`.

*   **MAJOR** version when you make incompatible API changes,
*   **MINOR** version when you add functionality in a backwards compatible manner, and
*   **PATCH** version when you make backwards compatible bug fixes.

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This allows us to automatically generate changelogs and determine the next version number.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

*   **feat**: A new feature (correlates with MINOR in SemVer).
*   **fix**: A bug fix (correlates with PATCH in SemVer).
*   **docs**: Documentation only changes.
*   **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
*   **refactor**: A code change that neither fixes a bug nor adds a feature.
*   **perf**: A code change that improves performance.
*   **test**: Adding missing tests or correcting existing tests.
*   **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm).
*   **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs).
*   **chore**: Other changes that don't modify src or test files.
*   **revert**: Reverts a previous commit.

### Examples

*   `feat: add support for new device type`
*   `fix: handle timeout error correctly`
*   `docs: update readme with installation instructions`
*   `chore: update dependencies`

## Development

Please refer to the [README.md](README.md) and `.github/copilot-instructions.md` for details on the project architecture and development workflow.
