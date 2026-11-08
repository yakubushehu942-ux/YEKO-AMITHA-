// Run locally only. Never commit your Firebase service-account JSON.
const fs=require("fs");
const admin=require("firebase-admin");
const email=process.argv[2];
const keyPath=process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
if(!email||!keyPath){console.error("Usage: FIREBASE_SERVICE_ACCOUNT_FILE=/secure/path/service-account.json node scripts/set-admin.js user@example.com");process.exit(1);}
const service=JSON.parse(fs.readFileSync(keyPath,"utf8"));
admin.initializeApp({credential:admin.credential.cert(service)});
(async()=>{try{const user=await admin.auth().getUserByEmail(email);await admin.auth().setCustomUserClaims(user.uid,{...(user.customClaims||{}),admin:true});console.log(`Admin permission granted to ${email}. Sign out and sign in again to refresh the token.`);}catch(e){console.error(e.message);process.exitCode=1;}finally{await admin.app().delete();}})();