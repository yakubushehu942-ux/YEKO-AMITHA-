# Developer handoff — YEKO AMITHA

## Work completed in this package
- Wired web search and image generation buttons to their Netlify endpoints.
- Connected document upload to chat and retained a dedicated file-Q&A endpoint.
- Fixed verified Firebase identity handling: server uses `decoded.uid`, not the decoded token object, as the usage document ID.
- Added recent conversation context to OpenAI chat requests.
- Made memory toggle control Firestore persistence for new messages.
- Added a simple custom-claim-protected admin metrics dashboard.
- Added admin claim assignment script; service account file remains local only.
- Made daily/monthly quota consumption transaction-backed.
- Added file/image size and MIME checks, and clearer configuration errors.
- Added syntax-check script and deployment documentation.

## Not represented as complete
- OpenAI Realtime voice-to-voice conversation.
- Payments/subscriptions.
- Full admin user management and custom quota editor.
- CAPTCHA, email verification enforcement, IP-based distributed rate limiting.
- Full production security review and live integration tests.

## Required developer / owner setup
1. Add Firebase web config to `public/js/firebase-config.js`.
2. Enable Firebase Email/Password and Firestore.
3. Publish `firebase/firestore.rules`.
4. Set Netlify environment variables in README.
5. Configure Firebase authorized domains for the Netlify domain.
6. Assign admin custom claim with `scripts/set-admin.js` from a trusted local environment.
7. Run `npm install`, `npm test`, deploy, and test every feature with real credentials.
8. Confirm model availability, OpenAI account billing, and Tavily configuration.

Do not place secrets in source files, public assets, GitHub, or chat messages.
