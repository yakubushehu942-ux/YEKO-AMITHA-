const {verifyIdToken}=require("./lib/firebase-admin");
const {consumeUsage,addTokenUsage}=require("./lib/usage");
const {extractFileText}=require("./lib/file-extract");
const OpenAI=require("openai");
const json=(statusCode,body)=>({statusCode,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(body)});
exports.handler=async event=>{
  if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  try{
    const decoded=await verifyIdToken(event.headers.authorization),uid=decoded.uid;
    const body=JSON.parse(event.body||"{}");
    if(typeof body.message!=="string"||body.message.length>12000)return json(400,{error:"Message is required and must be under 12,000 characters."});
    if(!process.env.OPENAI_API_KEY)return json(503,{error:"OpenAI is not configured. Add OPENAI_API_KEY in Netlify."});
    const quota=await consumeUsage(uid);if(!quota.ok)return json(429,{error:quota.message});
    let prompt=body.message;
    if(body.file){const extracted=await extractFileText(body.file);if(!extracted.trim())return json(422,{error:"No readable text was found in this file."});prompt+="\n\nUploaded document text:\n"+extracted.slice(0,45000);}
    const content=[];
    if(body.image){
      if(!/^image\/(png|jpeg|webp)$/.test(body.image.mimeType||""))return json(400,{error:"Supported image types are PNG, JPEG and WEBP."});
      if(typeof body.image.data!=="string"||body.image.data.length>4_300_000)return json(413,{error:"Image too large. Use an image under 3 MB."});
      content.push({type:"text",text:prompt});
      content.push({type:"image_url",image_url:{url:`data:${body.image.mimeType};base64,${body.image.data}`}});
    }else content.push({type:"text",text:prompt});
    const history=Array.isArray(body.history)?body.history.slice(-16):[];
    const messages=[{role:"system",content:"You are YEKO AMITHA, a helpful and accurate AI assistant. Respond in the language the user uses, including Hausa or English. Explain clearly. Be honest about uncertainty. Never claim to have performed actions you did not perform."},
      ...history.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string"&&m.content.length<=12000).map(m=>({role:m.role,content:m.content})),
      {role:"user",content}];
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const completion=await client.chat.completions.create({model:process.env.OPENAI_CHAT_MODEL||"gpt-4o-mini",messages,max_tokens:1800});
    const reply=completion.choices?.[0]?.message?.content||"I could not generate a response.";
    await addTokenUsage(uid,completion.usage?.total_tokens||0);
    return json(200,{reply,usage:completion.usage||null});
  }catch(e){console.error("chat function:",e);return json(e.status||500,{error:e.status===401?"Please sign in again.":(e.message||"Assistant service error.")});}
};