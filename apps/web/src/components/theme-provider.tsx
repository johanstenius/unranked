"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
	theme: Theme;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>("system");
	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const stored = localStorage.getItem("theme") as Theme | null;
		if (stored) {
			setTheme(stored);
		}
	}, []);

	useEffect(() => {
		if (!mounted) return;

		const root = document.documentElement;

		function applyTheme(t: "light" | "dark") {
			if (t === "dark") {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
			setResolvedTheme(t);
		}

		if (theme === "system") {
			const media = window.matchMedia("(prefers-color-scheme: dark)");
			applyTheme(media.matches ? "dark" : "light");

			function handler(e: MediaQueryListEvent) {
				applyTheme(e.matches ? "dark" : "light");
			}
			media.addEventListener("change", handler);
			return () => media.removeEventListener("change", handler);
		}
		applyTheme(theme);
	}, [theme, mounted]);

	function handleSetTheme(newTheme: Theme) {
		setTheme(newTheme);
		localStorage.setItem("theme", newTheme);
	}

	// Prevent flash during hydration
	if (!mounted) {
		return (
			<ThemeContext.Provider
				value={{
					theme: "system",
					resolvedTheme: "light",
					setTheme: handleSetTheme,
				}}
			>
				{children}
			</ThemeContext.Provider>
		);
	}

	return (
		<ThemeContext.Provider
			value={{ theme, resolvedTheme, setTheme: handleSetTheme }}
		>
			{children}
		</ThemeContext.Provider>
	);
}
