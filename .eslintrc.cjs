module.exports = {
  root: true,
  env: { es2020: true, node: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-var-requires': 0,
  },
};
