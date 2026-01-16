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
				elevated: "var(--bg-elevated)",
				hover: "var(--bg-hover)",
				border: {
					DEFAULT: "var(--border-subtle)",
					subtle: "var(--border-subtle)",
					default: "var(--border-default)",
					active: "var(--border-active)",
					focus: "var(--border-focus)",
				},
				text: {
					primary: "var(--text-primary)",
					secondary: "var(--text-secondary)",
					tertiary: "var(--text-tertiary)",
					muted: "var(--text-muted)",
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
						border: "var(--status-good-border)",
					},
					warn: {
						DEFAULT: "var(--status-warn)",
						bg: "var(--status-warn-bg)",
						border: "var(--status-warn-border)",
					},
					crit: {
						DEFAULT: "var(--status-crit)",
						bg: "var(--status-crit-bg)",
						border: "var(--status-crit-border)",
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
				sm: "var(--shadow-sm)",
				DEFAULT: "var(--shadow-md)",
				md: "var(--shadow-md)",
				lg: "var(--shadow-lg)",
				card: "var(--shadow-card)",
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
