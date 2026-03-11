import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.beutelfuchs.foodlog',
  appName: 'FoodLog',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#000000',
      style: 'LIGHT',
    },
  },
};

export default config;
