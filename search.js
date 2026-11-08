const {verifyIdToken}=require("./lib/firebase-admin");
const {consumeUsage}=require("./lib/usage");
const json=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(b)});
exports.handler=async e=>{
  if(e.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  try{
    const decoded=await verifyIdToken(e.headers.authorization),{query}=JSON.parse(e.body||"{}");
    if(typeof query!=="string"||!query.trim()||query.length>500)return json(400,{error:"Enter a search query under 500 characters."});
    if(!process.env.TAVILY_API_KEY)return json(503,{error:"Web search is not configured. Add TAVILY_API_KEY in Netlify."});
    const quota=await consumeUsage(decoded.uid);if(!quota.ok)return json(429,{error:quota.message});
    const r=await fetch("https://api.tavily.com/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:process.env.TAVILY_API_KEY,query,search_depth:"basic",max_results:5,include_answer:true})});
    const data=await r.json();if(!r.ok)throw new Error(data.message||"Search provider error");
    return json(200,{answer:data.answer||"",results:(data.results||[]).map(x=>({title:x.title,url:x.url,content:x.content}))});
  }catch(e){console.error("search function:",e);return json(e.status||500,{error:e.status===401?"Please sign in again.":(e.message||"Search failed.")});}
};