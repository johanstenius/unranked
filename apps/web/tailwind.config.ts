import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
	content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
	theme: {
		extend: {
			colors: {
				/* Project tokens */
				canvas: "var(--bg-canvas)",
				surface: "var(--bg-surface)",
				subtle: "var(--bg-subtle)",
				border: {
					DEFAULT: "var(--border-subtle)",
					subtle: "var(--border-subtle)",
					active: "var(--border-active)",
					focus: "var(--border-focus)",
				},
				text: {
					primary: "var(--text-primary)",
					secondary: "var(--text-secondary)",
					tertiary: "var(--text-tertiary)",
				},
				accent: {
					DEFAULT: "var(--accent)",
					hover: "var(--accent-hover)",
					subtle: "var(--accent-subtle)",
					teal: "var(--accent-teal)",
					indigo: "var(--accent-indigo)",
				},
				status: {
					good: {
						DEFAULT: "var(--status-good)",
						bg: "var(--status-good-bg)",
					},
					warn: {
						DEFAULT: "var(--status-warn)",
						bg: "var(--status-warn-bg)",
					},
					crit: {
						DEFAULT: "var(--status-crit)",
						bg: "var(--status-crit-bg)",
					},
				},
				/* shadcn/ui tokens */
				background: "var(--background)",
				foreground: "var(--foreground)",
				card: {
					DEFAULT: "var(--card)",
					foreground: "var(--card-foreground)",
				},
				popover: {
					DEFAULT: "var(--popover)",
					foreground: "var(--popover-foreground)",
				},
				primary: {
					DEFAULT: "var(--primary)",
					foreground: "var(--primary-foreground)",
				},
				secondary: {
					DEFAULT: "var(--secondary)",
					foreground: "var(--secondary-foreground)",
				},
				muted: {
					DEFAULT: "var(--muted)",
					foreground: "var(--muted-foreground)",
				},
				destructive: {
					DEFAULT: "var(--destructive)",
					foreground: "var(--destructive-foreground)",
				},
				input: "var(--input)",
				ring: "var(--ring)",
			},
			fontFamily: {
				sans: ["Satoshi", "system-ui", "sans-serif"],
				display: ["Cabinet Grotesk", "system-ui", "sans-serif"],
				mono: ["JetBrains Mono", "monospace"],
			},
			borderRadius: {
				sm: "4px",
				DEFAULT: "6px",
				md: "8px",
				lg: "12px",
			},
			boxShadow: {
				sm: "0 1px 2px rgba(0,0,0,0.04)",
				DEFAULT: "0 2px 8px rgba(0,0,0,0.04)",
				md: "0 4px 16px rgba(0,0,0,0.06)",
				lg: "0 8px 32px rgba(0,0,0,0.08)",
				"dark-sm": "0 1px 2px rgba(0,0,0,0.3)",
				"dark-md": "0 4px 16px rgba(0,0,0,0.4)",
			},
			fontSize: {
				"2xs": ["0.6875rem", { lineHeight: "1rem" }],
			},
			animation: {
				"fade-in": "fadeIn 0.3s ease-out",
				"slide-up": "slideUp 0.4s ease-out",
				"pulse-soft": "pulse-soft 2s ease-in-out infinite",
			},
		},
	},
	plugins: [],
};

export default config;
