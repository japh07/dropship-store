import nextPlugin from '@next/eslint-plugin-next';

const eslintConfig = [
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
  {
    ignores: ['convex/_generated/**', '.next/**', 'node_modules/**'],
  },
];

export default eslintConfig;
