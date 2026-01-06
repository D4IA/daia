/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
			},
			fontSize: {
				"48px": [
					"48px",
					{
						lineHeight: "1.1",
						fontWeight: "700",
					},
				],
			},
		},
	},
	plugins: [require("daisyui")],

	daisyui: {
		themes: ["light", "dark", "corporate"],
	},
};
