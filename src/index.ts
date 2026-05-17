import Slack, {} from "@slack/bolt";
const { App, subtype } = Slack;

import { config } from "dotenv";
config();

const {
	SLACK_BOT_TOKEN,
	SLACK_SIGNING_SECRET,
	SLACK_APP_TOKEN,
	SLACK_CLIENT_SECRET,
} = process.env;

const slack = new App({
	token: SLACK_BOT_TOKEN,
	appToken: SLACK_APP_TOKEN,
	socketMode: true, 
	signingSecret: SLACK_SIGNING_SECRET,
	port: 6777,
	clientSecret: SLACK_CLIENT_SECRET,
});

slack.command(
	"/command",
	async ({ ack, body, client, respond, command }) => {
		await ack();
		const args = body.text;
	},
);

await slack.start();

