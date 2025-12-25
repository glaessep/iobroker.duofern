#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const versionType = args[0] || 'patch'; // patch, minor, major, or explicit version like 1.2.3

function bumpVersion(version, type) {
    const parts = version.split('.').map(Number);

    if (/^\d+\.\d+\.\d+$/.test(type)) {
        // Explicit version provided
        return type;
    }

    switch (type) {
        case 'major':
            return `${parts[0] + 1}.0.0`;
        case 'minor':
            return `${parts[0]}.${parts[1] + 1}.0`;
        case 'patch':
        default:
            return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    }
}

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const oldVersion = packageJson.version;
const newVersion = bumpVersion(oldVersion, versionType);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 4)}\n`);

// Read and update io-package.json
const ioPackagePath = path.join(__dirname, '..', 'io-package.json');
const ioPackageJson = JSON.parse(fs.readFileSync(ioPackagePath, 'utf8'));
ioPackageJson.common.version = newVersion;
fs.writeFileSync(ioPackagePath, `${JSON.stringify(ioPackageJson, null, 4)}\n`);

console.log(`✓ Version bumped from ${oldVersion} to ${newVersion}`);
console.log(`  - package.json: ${newVersion}`);
console.log(`  - io-package.json: ${newVersion}`);
