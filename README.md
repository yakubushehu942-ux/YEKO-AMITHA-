# YEKO AMITHA — MY AI ASSISTANT

This project is a deployable website foundation with Firebase Authentication/Firestore, Netlify Functions and OpenAI.

## Included in this delivery

- Responsive chat UI, mobile sidebar, dark/light theme.
- Firebase email/password signup, login, logout and password reset.
- Per-user Firestore chat history and a local memory on/off setting.
- Chat endpoint with recent conversation context and image understanding.
- File extraction for PDF, DOCX, XLSX, XLS, TXT and CSV.
- Image generation endpoint and connected UI.
- Tavily web-search endpoint and connected UI.
- Browser speech recognition and speech synthesis where the browser supports them.
- Basic usage quota with Firestore transaction.
- Admin dashboard protected by Firebase `admin: true` custom claim.
- Firestore rules protecting user chat data and server-only usage records.

## Still requires account setup / external validation

This is not a preconfigured live service. You must supply Firebase web config, OpenAI API key, Firebase service account JSON, and Tavily API key if web search is wanted. OpenAI image model availability and billing must be enabled for your API account. Browser voice input/output support varies by browser and device.

**Not included:** OpenAI Realtime voice-to-voice session, subscription/payment processing, user-facing admin user controls, distributed IP rate limiting/CAPTCHA, email verification workflow, and production security audit. Do not advertise these as implemented.

## 1. Firebase

1. Create a Firebase project.
2. Add a Web App and copy its public config into `public/js/firebase-config.js`.
3. Enable Authentication > Email/Password.
4. Create Firestore.
5. Publish `firebase/firestore.rules`.
6. Create a service account key for backend use. Keep the JSON private. Add the full JSON as Netlify environment variable `FIREBASE_SERVICE_ACCOUNT_JSON`.

Firebase web config is intended for the browser; it is not a substitute for security rules. Never put service-account JSON in the public folder.

## 2. Netlify environment variables

Add these under Site configuration > Environment variables:

- `OPENAI_API_KEY` — required for chat and image generation.
- `FIREBASE_SERVICE_ACCOUNT_JSON` — required for authenticated backend endpoints.
- `OPENAI_CHAT_MODEL` — optional; default `gpt-4o-mini`.
- `OPENAI_IMAGE_MODEL` — optional; default `gpt-image-1`.
- `TAVILY_API_KEY` — optional; enables web search.
- `DEFAULT_DAILY_REQUEST_LIMIT` — optional; default 100.
- `DEFAULT_MONTHLY_REQUEST_LIMIT` — optional; default 2000.

After changing environment variables, redeploy the site.

## 3. Make an admin account

First create the user's account through the website. On a trusted local computer, install dependencies and use the Firebase service account file stored outside the project:

```bash
npm install
FIREBASE_SERVICE_ACCOUNT_FILE=/secure/path/service-account.json node scripts/set-admin.js admin@example.com
```

Sign out and sign in again. Do not commit or upload the service account file. The dashboard checks the verified Firebase custom claim on the server; hiding the link is not security.

## 4. Local run and tests

```bash
npm install
cp .env.example .env
# Fill .env with local secrets; do not commit it.
npx netlify dev
```

Run syntax checks:

```bash
npm test
```

Syntax checks do not prove that Firebase, OpenAI, Tavily, billing or deployed functions work end-to-end.

## 5. GitHub and Netlify deployment

1. Upload this folder to a GitHub repository without secrets.
2. In Netlify, import the GitHub repository.
3. Build command: `npm run build`
4. Publish directory: `.`
5. Functions directory: `netlify/functions`
6. Add environment variables.
7. Deploy and test login, chat, history, image upload, file upload, image generation, web search and admin access.

## Important limits

- The browser sends files as base64 to Netlify Functions; keep images below 3 MB and documents below 4 MB.
- Daily/monthly quota is transaction-backed per Firebase user. It is not a complete abuse-prevention or IP rate-limiting system.
- `admin.html` is protected by server-side custom-claim verification. Do not grant claims to untrusted users.
- Browser voice uses Web Speech APIs; Hausa speech recognition availability depends on the browser/device. This is not realtime conversational voice.
- Review all third-party provider terms, current model availability and costs before public launch.
