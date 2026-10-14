/** Design tokens — palet diambil dari halaman-halaman utama di main (#1B1B1B / #E9204F). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palet utama
        base: '#1B1B1B',
        sunken: '#151515',
        card: '#252525',
        raised: '#2A2A2A',
        line: '#303030',
        muted: '#71717A',
        dim: '#A1A1AA',
        ink: '#F3F3F3',
        primary: '#E9204F',
        'primary-soft': '#E9204F',
        'primary-deep': '#6b1028',
        'on-primary': '#FFFFFF',
      },
      boxShadow: {
        primary: '0 4px 6px -1px rgba(233,32,79,0.2), 0 2px 4px -2px rgba(233,32,79,0.2)',
        logo: '0 10px 15px -3px rgba(233,32,79,0.2), 0 4px 6px -4px rgba(233,32,79,0.2)',
        card: '0 25px 50px -12px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
