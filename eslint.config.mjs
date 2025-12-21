import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    // Base configuration for all files
    {
        ignores: [
            'build/**',
            'coverage/**',
            'node_modules/**',
            '.nyc_output/**',
            '*.d.ts'
        ]
    },

    // TypeScript files configuration
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json'
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'writable',
                describe: 'readonly',
                it: 'readonly',
                before: 'readonly',
                after: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescriptEslint
        },
        rules: {
            // ioBroker specific rules
            'no-console': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    'ignoreRestSiblings': true,
                    'argsIgnorePattern': '^_'
                }
            ],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            'prefer-const': 'error',
            'no-var': 'error'
        }
    },

    // CLI tool configuration - allow console (must come after TS config to override)
    {
        files: ['src/cli.ts'],
        rules: {
            'no-console': 'off'
        }
    },

    // JavaScript files configuration
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'writable'
            }
        },
        rules: {
            'no-console': 'error',
            'prefer-const': 'error',
            'no-var': 'error'
        }
    }
];
