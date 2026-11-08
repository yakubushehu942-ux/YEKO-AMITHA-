const admin=require("firebase-admin");
function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error("Firebase backend is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON in Netlify.");
  admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});
  return admin;
}
async function verifyIdToken(header){
  const token=(header||"").replace(/^Bearer\s+/i,"");
  if(!token){const e=new Error("Authentication required");e.status=401;throw e;}
  try{return await getAdmin().auth().verifyIdToken(token);}
  catch(e){const err=new Error("Invalid or expired sign-in session.");err.status=401;throw err;}
}
function adminDb(){return getAdmin().firestore();}
module.exports={verifyIdToken,adminDb,getAdmin};