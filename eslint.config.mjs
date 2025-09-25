import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: {
        ...globals.browser,
        game: 'readonly',
        ui: 'readonly',
        Hooks: 'readonly',
        ChatMessage: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        Roll: 'readonly',
        CONFIG: 'readonly',
        CONST: 'readonly',
        foundry: 'readonly',
        Dialog: 'readonly',
        canvas: 'readonly',
        Folder: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
        Scene: 'readonly',
        Token: 'readonly',
        CompendiumCollection: 'readonly',
        setProperty: 'readonly',
        mergeObject: 'readonly',
        duplicate: 'readonly',
        expandObject: 'readonly',
        isEmpty: 'readonly',
        Handlebars: 'readonly',
        Combat: 'readonly',
      },
    },
  },
]);
