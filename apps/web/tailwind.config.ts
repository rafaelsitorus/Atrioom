import type { Config } from "tailwindcss";
import { atrioomPreset } from "@atrioom/ui-tokens/tailwind";

const config: Config = {
  presets: [atrioomPreset as Config],
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;