import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    /*
     * Ownership boundaries. The split that matters here is config vs
     * component, not folder vs folder: blocks and heros each hold a config.ts
     * (Payload field definitions, backend) beside a Component.tsx (rendering,
     * UI). Note that server components under app/(frontend) legitimately
     * import @payload-config to fetch data, so that is not restricted.
     */
    files: ['src/components/**/*.tsx', 'src/blocks/**/Component*.tsx', 'src/heros/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/collections/*', '@/access/*'],
            message: 'Collection and access config is backend-owned. Read data through @/server/* instead.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/collections/**/*.ts', 'src/access/**/*.ts', 'src/fields/**/*.ts', 'src/plugins/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/components/*', '**/Component', '**/Component.client'],
            message: 'Backend config should not import React components. Import a config module instead, the way collections/Pages imports @/heros/config.',
          },
        ],
      }],
    },
  },
  {
    /* src/lib is pure helpers -- no data access, no Payload runtime. */
    files: ['src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/server/*', '@payload-config'],
            message: 'src/lib is for pure helpers. Anything that reads data belongs in src/server.',
          },
        ],
      }],
    },
  },
  {
    /*
     * Payload template code that predates Next 16's React Compiler rules.
     * Downgraded here rather than globally, so new code is still held to them.
     * Fixing these properly means reworking hydration-sensitive theme setup
     * and the useClickableCard ref handling -- worth doing, but on its own.
     */
    files: [
      'src/Header/Component.client.tsx',
      'src/components/Card/index.tsx',
      'src/providers/Theme/index.tsx',
      'src/providers/Theme/ThemeSelector/index.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    ignores: ['.next/', '.open-next/', '.claude/worktrees/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
