import Slack, {} from "@slack/bolt";
const { App, subtype, ExpressReceiver } = Slack;
import {Eta} from "eta"
import { config } from "dotenv";
import { randomUUID, UUID } from "crypto"
import path from "path";
import * as express from "express"
config();
import * as pgp from "openpgp"
import { Valkeyrie } from 'valkeyrie';
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
  user_name: string;
  kind: 'registration'; // kind of page 
}

//const slugs = new Map<string, PageKind>() // slug to PageKind
const db = await Valkeyrie.open("./e2ee.db") 
const SLUGS = "slugs", USERS = "users"
const _users = new Map<string, UserData>() // user slack id to UserData

//DEBUG
await db.set([SLUGS, "quecosa"], {
  kind: "registration",
  user: "U1234567",
  user_name: "Jorge"
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



const possible_commands = ["register", "send", "self"] 
slack.command(
	"/e2ee",
	async ({ ack, body, client, respond, command }) => {
		await ack();
		const args = body.text;
    let cmd = args.split(" ")[0]
    console.log(`Received from ${body.user_id} - /e2ee ${args}`)

    const userData = await (await db.get([USERS,body.user_id])).value
    if (!userData) cmd = "register"

    console.log(`Parsed cmd =`, cmd)

    if (!possible_commands.includes(cmd)) {
      await respond({response_type: "ephemeral", text: `Unknown command, available: ${possible_commands.map(c=>`\`${c}\``).join(", ")}`})
      return;
    }

    switch (cmd) {
      case "register":
      const slug = await generateSlug({user: body.user_id, kind: "registration", user_name: body.user_name})
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

    const res = await client.views.open({
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
    console.log("res =", res)
    }
    	},
);


receiver.router.get("/slug/:slug", async (req, res) => {
  const {slug} = req.params;

  const page = await (await db.get([SLUGS, slug])).value as PageKind

  if (!page) return res.status(404).send("Slug not found, weird")

  res.status(200).send(eta.render("./something", {name:page.user_name, slug, slack_user_id: page.user}))
})

receiver.router.get("/openpgp.min.mjs",(req, res)=>{
  res.status(200).sendFile(path.join(assetsPath, "openpgp.min.mjs"))
})

receiver.router.get("/que", (r, res) =>{
  res.status(200).send("so")
})

receiver.router.post("/postKey", express.json(), async (req, res) => {
  const body: registrationFormData = req.body
  console.log("received a post request",body)
  if (!body["slug"] || !body["public_key"] || !body["private_key"]) {
    res.status(422).send("unprocessable body")
  }

  if (!(await save_user(body))) return res.status(500).send("server error")

  res.status(200).send("ok")
})


await slack.start(PORT!);
await slack.logger.info("Slack app started in", PORT!)



async function generateSlug(k: PageKind) {
  const slug = randomUUID();
  await db.set([SLUGS, slug], k);
  return slug;
}

async function save_user(payload:registrationFormData): Promise<boolean> {
  const { public_key, private_key, slug} = payload
  const slug_data = await (await db.get([SLUGS, slug])).value as PageKind
  if (!slug_data) return false
  if (slug_data.kind != "registration") return false

  await db.set([USERS, slug_data.user],{private_key, public_key})

  
  slack.client.chat.postMessage({
    channel: slug_data.user,
    text: "Successfully registered to E2EE Slack with private key: ***redacted***, public key: \n ```\n" + public_key + "\n```"
  }).catch(e=>console.error(e)).then(m=>console.log(`sent registration message${m}`))
   return true
}

interface registrationFormData {
  private_key: string
  public_key: string
  slug: string
}

