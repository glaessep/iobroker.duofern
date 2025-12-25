import { tests } from '@iobroker/testing';
import * as path from 'path';

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'));
