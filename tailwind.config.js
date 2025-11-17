/** @type {import('tailwindcss').Config} */
import defaultTheme from "tailwindcss/defaultTheme";

export const darkMode = ["class"];
export const content = [
  "./pages/**/*.{ts,tsx}",
  "./components/**/*.{ts,tsx}",
  "./app/**/*.{ts,tsx}",
  "./src/**/*.{ts,tsx}",
];
export const theme = {
  container: {
    center: true,
    padding: "2rem",
    screens: {
      "2xl": "1400px",
    },
  },
  extend: {
    colors: {
      "primary-500": "var(--primary-500)",
      "primary-600": "var(--primary-600)",
      "secondary-500": "var(--secondary-500)",
      "off-white": "var(--off-white)",
      red: "var(--red)",
      "dark-1": "var(--background-1)",
      "dark-2": "var(--background-2)",
      "dark-3": "var(--background-3)",
      "dark-4": "var(--background-4)",
      "light-1": "var(--text-primary)",
      "light-2": "var(--text-secondary)",
      "light-3": "var(--text-tertiary)",
      "light-4": "var(--text-quaternary)",
      "bleu-1": "var(--bleu-1)",
      "pink-1": "var(--pink-1)",
      "post-border": "var(--post-border)",
      "post-bg": "var(--post-bg)",
      "poll-border": "var(--poll-border)",
      "poll-bg": "var(--poll-bg)",
      "group-border": "var(--group-border)",
      "group-bg": "var(--group-bg)",
      silver: "var(--silver)",
    },
    screens: {
      xs: "480px",
    },
    width: {
      420: "420px",
      465: "465px",
    },
    fontFamily: {
      inter: ["Inter", "sans-serif"],
    },
    keyframes: {
      "accordion-down": {
        from: { height: 0 },
        to: { height: "var(--radix-accordion-content-height)" },
      },
      "accordion-up": {
        from: { height: "var(--radix-accordion-content-height)" },
        to: { height: 0 },
      },
      // New keyframe for sliding text
      "slide-text": {
        "0%": { transform: "translateX(0)" },
        "100%": { transform: "translateX(-100%)" },
      },

      "slide-down": {
        "0%": {
          transform: "translateY(-100%)",
          opacity: "0",
        },
        "100%": {
          transform: "translateY(0)",
          opacity: "1",
        },
      },
      "slide-up": {
        "0%": {
          transform: "translateY(0)",
          opacity: "1",
        },
        "100%": {
          transform: "translateY(-100%)",
          opacity: "0",
        },
      },
    },
    animation: {
      "accordion-down": "accordion-down 0.2s ease-out",
      "accordion-up": "accordion-up 0.2s ease-out",
      // New animation for sliding text
      "slide-text": "slide-text 5s linear infinite",

      "slide-down": "slide-down 0.3s ease-out forwards",
      "slide-up": "slide-up 0.3s ease-out forwards",
    },
  },
};
export const plugins = [require("tailwindcss-animate")];
