import { defineConfig } from "vitepress";

export default defineConfig({
	title: "claude-review-bot",
	description:
		"Five-agent parallel code reviews powered by Claude. Comment /claude-review on any pull request.",
	base: "/claude-review-bot/",
	themeConfig: {
		nav: [
			{ text: "Quick Start", link: "/quick-start" },
			{ text: "How it works", link: "/how-it-works" },
			{ text: "Configuration", link: "/configuration" },
			{
				text: "GitHub",
				link: "https://github.com/joeblackwaslike/claude-review-bot",
			},
		],
		sidebar: [
			{ text: "Quick Start", link: "/quick-start" },
			{ text: "How it works", link: "/how-it-works" },
			{ text: "Configuration", link: "/configuration" },
		],
		socialLinks: [
			{
				icon: "github",
				link: "https://github.com/joeblackwaslike/claude-review-bot",
			},
		],
		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © 2025 Joe Black",
		},
	},
	head: [["meta", { name: "og:type", content: "website" }]],
});
