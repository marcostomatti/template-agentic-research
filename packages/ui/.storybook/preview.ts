import type { Preview } from '@storybook/react-vite';

import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'cream',
      values: [
        { name: 'cream', value: '#FAF4E8' },
        { name: 'char', value: '#1A150F' },
      ],
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  globalTypes: {
    theme: {
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme === 'dark' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      return Story();
    },
  ],
};

export default preview;
