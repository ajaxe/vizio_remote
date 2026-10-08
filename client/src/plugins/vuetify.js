import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0D0E11',
          surface: '#1A1C23',
          'surface-bright': '#252834',
          'surface-variant': '#2E3240',
          primary: '#6366F1',
          'primary-darken-1': '#4F46E5',
          secondary: '#3B82F6',
          accent: '#10B981',
          error: '#EF4444',
          info: '#06B6D4',
          success: '#22C55E',
          warning: '#F59E0B'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  }
});
