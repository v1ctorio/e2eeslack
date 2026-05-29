# e2ee Slack

Proof of Concept of e2ee communication inside the slack client using the video embed block and RSA public-private key encryption.


The idea is that the bot embeds a website that generates a simple webapp which, embedded in the slack app, allow you to:
- create a openpgp key pair which is stored in the server. The private key is encrypted with a passphrase so the service can't decrypt it.
- Once the user has a private key, allow them to encrypt messages targeting other registered users public keys.

The de-encrypted message never leaves the users client. All the encryption is done locally.

### todo
- add a feature to see your private key (encrypted)
- add a feature to provide your own key pair 