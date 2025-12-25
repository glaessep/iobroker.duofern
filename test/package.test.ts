import { tests } from '@iobroker/testing';
import * as path from 'path';

// Validate the package files
tests.packageFiles(path.join(__dirname, '..'));
