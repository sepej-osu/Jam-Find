import { createSystem, defineConfig, defaultConfig } from "@chakra-ui/react";

/**
 * Jam-Find color palette — dark to light:
 *
 *  jam.950  #002322  darkest  (dark mode bg)
 *  jam.800  #004744
 *  jam.700  #006b59
 *  jam.600  #009b6a
 *  jam.400  #00ce8d
 *  jam.50   #a3ffe2  lightest (light mode bg)
 *
 * Semantic tokens resolve automatically for light / dark mode:
 *
 *  jam.bg         page background
 *  jam.surface    card / panel background
 *  jam.subtle     muted / secondary surface
 *  jam.border     dividers and borders
 *  jam.text       primary text
 *  jam.textMuted  secondary text
 *  jam.accent     interactive accent (buttons, links, highlights)
 */

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        jam: {
          950: { value: "#002322" },
          800: { value: "#004744" },
          700: { value: "#006b59" },
          600: { value: "#009b6a" },
          400: { value: "#00ce8d" },
          50:  { value: "#a3ffe2" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "jam.bg": {
          value: { base: "white", _dark: "{colors.jam.950}" },
        },
        "jam.surface": {
          value: { base: "{colors.jam.50}", _dark: "{colors.jam.800}" },
        },
        "jam.subtle": {
          value: { base: "{colors.jam.50}", _dark: "{colors.jam.800}" },
        },
        "jam.border": {
          value: { base: "{colors.jam.400}", _dark: "{colors.jam.700}" },
        },
        "jam.text": {
          value: { base: "{colors.jam.950}", _dark: "{colors.jam.50}" },
        },
        "jam.textMuted": {
          value: { base: "{colors.jam.700}", _dark: "{colors.jam.400}" },
        },
        "jam.accent": {
          value: { base: "{colors.jam.600}", _dark: "{colors.jam.400}" },
        },
        "jam.liked": {
          value: { base: "{colors.jam.600}", _dark: "{colors.jam.400}" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
