const {verifyIdToken}=require("./lib/firebase-admin");
const {consumeUsage,addTokenUsage}=require("./lib/usage");
const {extractFileText}=require("./lib/file-extract");
const OpenAI=require("openai");
const json=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(b)});
exports.handler=async e=>{
  if(e.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  try{
    const decoded=await verifyIdToken(e.headers.authorization),{file,question="Summarize this document and identify its key information."}=JSON.parse(e.body||"{}");
    if(!file)return json(400,{error:"A file is required."});
    if(!process.env.OPENAI_API_KEY)return json(503,{error:"OpenAI is not configured."});
    const quota=await consumeUsage(decoded.uid);if(!quota.ok)return json(429,{error:quota.message});
    const text=await extractFileText(file);
    if(!text.trim())return json(422,{error:"No readable text was found in this file."});
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const r=await client.chat.completions.create({model:process.env.OPENAI_CHAT_MODEL||"gpt-4o-mini",messages:[{role:"user",content:`${String(question).slice(0,4000)}\n\nDocument:\n${text.slice(0,60000)}`}],max_tokens:1800});
    await addTokenUsage(decoded.uid,r.usage?.total_tokens||0);
    return json(200,{reply:r.choices?.[0]?.message?.content||"No answer was generated."});
  }catch(e){console.error("files function:",e);return json(e.status||500,{error:e.status===401?"Please sign in again.":(e.message||"File processing failed.")});}
};