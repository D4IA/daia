# Getting started
## Environment
You need ChatGPT API key for demo to work properly. 
1. Log in or register at [openai.com](https://platform.openai.com/) and go to [api-keys](https://platform.openai.com/api-keys).
2. Generate it with "Create new secret key", copy it to the clipboard.
3. Copy [.env.local](./.env.local) and name it as `.env`.
4. Paste the API key from clipboard in newly created [.env](./.env) file so you have:
```
OPENAI_API_KEY=sk-THE-REST-OF-YOUR-KEY
...
```
5. Run `pnpm install in the root directory`.
6. Run `pnpm run dev in the root directory`
