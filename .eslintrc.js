module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
    },
    extends: [
        '@iobroker/eslint-config'
    ],
    plugins: [
        '@typescript-eslint'
    ],
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
    },
    env: {
        es6: true,
        node: true,
        mocha: true
    },
    overrides: [
        {
            files: ['*.js'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'off'
            }
        }
    ]
};