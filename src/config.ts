export interface AppConfig {
	appId: string;
	privateKey: string;
	webhookSecret: string;
	reviewEnabled: boolean;
	reviewCommentPrefix: string;
	reviewCommand: string;
	anthropicModel: string;
}

function getRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function normalizePrivateKey(raw: string): string {
	return raw.replace(/\\n/g, "\n");
}

export function getConfig(): AppConfig {
	return {
		appId: getRequiredEnv("GITHUB_APP_ID"),
		privateKey: normalizePrivateKey(getRequiredEnv("GITHUB_APP_PRIVATE_KEY")),
		webhookSecret: getRequiredEnv("GITHUB_WEBHOOK_SECRET"),
		reviewEnabled: process.env.REVIEW_ENABLED === "true",
		reviewCommentPrefix:
			process.env.REVIEW_COMMENT_PREFIX ?? "claude-review-bot",
		reviewCommand: process.env.REVIEW_COMMAND ?? "/claude-review",
		anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
	};
}
