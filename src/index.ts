import Slack, {} from "@slack/bolt";
const { App, subtype, ExpressReceiver } = Slack;
import {Eta} from "eta"
import { config } from "dotenv";
import { randomUUID, UUID } from "crypto"
import path from "path";
config();



const {
	SLACK_BOT_TOKEN,
	SLACK_SIGNING_SECRET,
	SLACK_APP_TOKEN,
	SLACK_CLIENT_SECRET,
  SELF_BASE_URL,
  PORT
} = process.env;

//This is so silly but tscompiler is trash
const eta = new Eta({views: path.join(import.meta.dirname,"../src", "templates")})

const receiver = new ExpressReceiver({signingSecret: SLACK_SIGNING_SECRET!,});

interface PageKind {
  user: string; // slack id 
  kind: 'registration'; // kind of page 
}

const slugs = new Map<string, PageKind>()

//DEBUG
slugs.set("quecosa", {
  kind: "registration",
  user: "U1234567"
})


const slack = new App({
	token: SLACK_BOT_TOKEN,
  installerOptions: { port: 3000 },
	receiver,
});




interface User {
  slack_id: string;
  pub_key: string;
  private_key: string; // Private keys should ALWAYS have a passphrase
}



slack.command(
	"/e2ee",
	async ({ ack, body, client, respond, command }) => {
		await ack();
		const args = body.text;



    const slug = generateSlug({user: body.user_id, kind: "registration"})
    const targetVideoUrl = `${SELF_BASE_URL}/slug/${slug}`

    const responseBlocks = [
        {
          type: "video",
          alt_text: "embedded e2ee client",
          title: {
            type: "plain_text",
            text: "E2EE Slack",
          },
        thumbnail_url: "https://http.cat/200", // TODO change this with an actual thumbnail 
        video_url: targetVideoUrl
        },
      ]
      slack.logger.info("Sending user to targetVideoUrl =",targetVideoUrl)

    //await respond({
    //  response_type: "ephemeral",
    //  text: "To use e2ee slack you must use a different client",
    //  blocks: responseBlocks
    //})

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "E2EE Slack"
        },
        callback_id: slug,
        blocks: responseBlocks,
        close: {
          type: "plain_text",
          text: "Done"
        }
      }
    })
	},
);


receiver.router.get("/slug/:slug", (req, res) => {
  const {slug} = req.params;

  const page = slugs.get(slug)

  if (!page) return res.status(404).send("Slug not found, weird")

  res.status(200).send(eta.render("./something", {name:"que", slug}))
})

receiver.router.get("/que", (r, res) =>{
  res.status(200).send("so")
})


function generateSlug(k: PageKind) {
  const slug = randomUUID();
  slugs.set(slug, k);
  return slug;
}
await slack.start(PORT!);
await slack.logger.info("Slack app started in", PORT!)