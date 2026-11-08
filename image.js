const {verifyIdToken}=require("./lib/firebase-admin");
const {consumeUsage,addTokenUsage}=require("./lib/usage");
const OpenAI=require("openai");
const json=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(b)});
exports.handler=async e=>{
  if(e.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  try{
    const decoded=await verifyIdToken(e.headers.authorization);
    const {prompt}=JSON.parse(e.body||"{}");
    if(typeof prompt!=="string"||!prompt.trim()||prompt.length>2000)return json(400,{error:"Enter an image description under 2,000 characters."});
    if(!process.env.OPENAI_API_KEY)return json(503,{error:"OpenAI is not configured."});
    const quota=await consumeUsage(decoded.uid);if(!quota.ok)return json(429,{error:quota.message});
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const r=await client.images.generate({model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-1",prompt:prompt.trim(),size:"1024x1024"});
    await addTokenUsage(decoded.uid,r.usage?.total_tokens||0);
    return json(200,{image:r.data?.[0]?.b64_json?`data:image/png;base64,${r.data[0].b64_json}`:null});
  }catch(e){console.error("image function:",e);return json(e.status||500,{error:e.status===401?"Please sign in again.":(e.message||"Image generation failed.")});}
};