import Slack, {} from "@slack/bolt";
const { App, subtype, ExpressReceiver } = Slack;
import {Eta} from "eta"
import { config } from "dotenv";
import { randomUUID, UUID } from "crypto"
import path from "path";
import * as express from "express"
import { STATUS_CODES } from "http";
config();
import * as pgp from "openpgp"


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
const assetsPath = path.join(import.meta.dirname,"../src", "assets")

const receiver = new ExpressReceiver({signingSecret: SLACK_SIGNING_SECRET!});

interface PageKind {
  user: string; // slack id 
  kind: 'registration'; // kind of page 
}

const slugs = new Map<string, PageKind>() // slug to PageKind
const users = new Map<string, UserData>() // user slack id to UserData

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




interface UserData {
//  slack_id: string; the slack ID is they key
  public_key: string;
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

  res.status(200).send(eta.render("./something", {name:"que", slug, slack_user_id: page.user}))
})

receiver.router.get("/openpgp.min.mjs",(req, res)=>{
  res.status(200).sendFile(path.join(assetsPath, "openpgp.min.mjs"))
})

receiver.router.get("/que", (r, res) =>{
  res.status(200).send("so")
})

receiver.router.post("/postKey", express.json(), (req, res) => {
  const body: registrationFormData = req.body
  console.log("received a post request",body)
  if (!body["slug"] || !body["public_key"] || !body["private_key"]) {
    res.status(422).send("unprocessable body")
  }

  if (!save_user(body )) return res.status(500).send("server error")

  res.status(200).send("ok")
})


await slack.start(PORT!);
await slack.logger.info("Slack app started in", PORT!)



function generateSlug(k: PageKind) {
  const slug = randomUUID();
  slugs.set(slug, k);
  return slug;
}

function save_user(payload:registrationFormData): boolean {
  const { public_key, private_key, slug} = payload
  const slug_data = slugs.get(slug)
  if (!slug_data) return false
  if (slug_data.kind != "registration") return false

  users.set(slug_data.user,{private_key, public_key})

  
  
  slack.client.chat.postMessage({
    channel: slug_data.user,
    text: "Successfully registered to E2EE Slack with "
  }) 
   return true
}

interface registrationFormData {
  private_key: string
  public_key: string
  slug: string
}

