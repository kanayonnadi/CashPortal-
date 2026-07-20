# CashPortal Chatbot Demo

CashPortal is a fictional logged-in mobile banking website with a floating webchat assistant in the bottom right corner. The page includes a fake customer persona, masked card details, balances, transaction history, and cardholder profile information.

All financial data in this demo is fictional.

## Setup

```sh
npm install
cp .env.example .env
```

Add your OpenAI key to `.env`:

```sh
OPENAI_API_KEY=your_openai_key_here
```

`config.yaml` already uses the web adapter:

```yaml
platform: "web"
```

## Run Locally

```sh
npm run demo
```

Open:

```text
http://localhost:3000
```

The banking demo website lives in `public/`. The chatbot posts messages to `POST /message` and resets sessions with `POST /reset`.

## Add Chatbot FAQ Knowledge

Add your FAQ files to `knowledge/` as `.txt`, `.md`, or `.pdf`.

Good examples:

```text
knowledge/cashportal-faq.md
knowledge/security-policy.md
knowledge/card-support.pdf
```

The bot reads the knowledge folder at startup. If the server is already running, restart it after adding or changing FAQ files. You can also reload knowledge without restarting by sending the process a SIGHUP signal:

```sh
kill -HUP <pid>
```

The loader ignores `knowledge/README.md`, so this instruction file will not be included in the bot's answer context.

## Build

```sh
npm run build
npm run start:prod
```

For hosting, set these environment variables:

```sh
OPENAI_API_KEY=your_openai_key_here
CHATBOT_PLATFORM=web
```

`PORT` is optional locally. Render will provide it automatically.

## GitHub

Suggested first commit:

```sh
git init
git add .
git commit -m "Create CashPortal chatbot demo"
```

Then create a GitHub repo and push:

```sh
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cashportal-chatbot.git
git push -u origin main
```

## Hosting Notes

Render is a good fit for this project because it runs a Node server and supports environment variables easily.

Cheap alternatives:

- Railway: simple Node deploys, easy env vars, often quick for prototypes.
- Fly.io: inexpensive for small apps, more infrastructure-oriented.
- Koyeb: straightforward web service deployment with a free tier depending on current availability.

Pure static hosts like Netlify, Vercel static, or GitHub Pages are not enough by themselves because this app needs the Express backend for `/message`.
