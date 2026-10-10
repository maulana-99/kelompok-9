/** Design tokens diambil langsung dari file Figma "melodi final". */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Palet utama (Login, Search, Playlist Preview, Create Playlist)
        base: '#131315',
        sunken: '#0e0e10',
        card: '#1b1b1d',
        raised: '#201f21',
        'raised-2': '#353437',
        line: '#2a2a2c',
        muted: '#a48b8b',
        dim: '#ddc0c0',
        ink: '#e5e1e4',
        primary: '#ff7f87',
        'primary-soft': '#ffb3b5',
        'on-primary': '#65081a',
        sky: '#7bd0ff',
        lilac: '#cebdff',
        // Palet khusus frame Home/Dashboard
        dash: {
          bg: '#0e0e11',
          side: '#0a0a0d',
          card: '#141418',
          hover: '#18181c',
          line: '#222228',
          line2: '#2e2e36',
          muted: '#767182',
          dim: '#9c98a6',
          ink: '#f1eff4',
          'on-primary': '#40000b',
        },
      },
      boxShadow: {
        primary: '0 4px 6px -1px rgba(255,127,135,0.2), 0 2px 4px -2px rgba(255,127,135,0.2)',
        logo: '0 10px 15px -3px rgba(255,127,135,0.2), 0 4px 6px -4px rgba(255,127,135,0.2)',
        card: '0 25px 50px -12px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
