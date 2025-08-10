/**** Tailwind CSS configuration for VS Code Webview ****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/webview/**/*.{ts,tsx,js,jsx,html}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    // Keep preflight; VS Code webview sets background/color via inline style in HTML
  },
};
