const {verifyIdToken,adminDb,getAdmin}=require("./lib/firebase-admin");
const json=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(b)});
exports.handler=async e=>{
  if(e.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
  try{
    const decoded=await verifyIdToken(e.headers.authorization);
    if(decoded.admin!==true)return json(403,{error:"This account does not have administrator permission."});
    let userCount=0,nextPageToken;
    do {
      const page=await getAdmin().auth().listUsers(1000,nextPageToken);
      userCount+=page.users.length;
      nextPageToken=page.pageToken;
    } while(nextPageToken);
    const usage=await adminDb().collection("usage").get();
    const now=new Date(),day=now.toISOString().slice(0,10),month=day.slice(0,7);
    let dailyRequests=0,monthlyRequests=0,totalTokens=0;
    usage.forEach(doc=>{const d=doc.data();if(d.day===day)dailyRequests+=Number(d.daily||0);if(d.month===month)monthlyRequests+=Number(d.monthly||0);totalTokens+=Number(d.totalTokens||0);});
    return json(200,{userCount,dailyRequests,monthlyRequests,totalTokens});
  }catch(e){console.error("admin function:",e);return json(e.status||500,{error:e.message||"Admin dashboard error."});}
};