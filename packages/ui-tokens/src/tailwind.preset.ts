import type { Config } from "tailwindcss";

// Preset tokens — copy dari Atrioom Company Profile (Atrioom/tailwind.config.ts)
// Dipakai di apps/web dan apps/*/tailwind.config.ts via `presets: [require('@atrioom/ui-tokens/tailwind')]`
export const atrioomPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        neon: "#ffffff",
      },
      fontFamily: {
        heading: ["var(--font-heading)", '"Instrument Serif"', "serif"],
        body: ["var(--font-body)", "Barlow", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "9999px",
      },
    },
  },
};

export default atrioomPreset;