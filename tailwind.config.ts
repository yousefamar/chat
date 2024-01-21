import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  daisyui: {
    themes: [
      {
        deen: {
          "primary": "#3d736e",
          "secondary": "#1e3937",
          "accent": "#c8c9cb",
          "neutral": "#eef0f2",
          "base-100": "#1e3937",
        },
      },
    ],
  },
  plugins: [
    require("daisyui"),
    require('tailwind-scrollbar'),
    require('@tailwindcss/typography'),
  ],
}
export default config
