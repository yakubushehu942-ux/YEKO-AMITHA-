import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, deleteDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = id => document.getElementById(id);
const config = window.YEKO_FIREBASE_CONFIG || {};
let auth=null, db=null, user=null, currentChat=null, chats=[], currentMessages=[];
let attachedImage=null, attachedFile=null, signup=false, busy=false, mode="chat", lastUserPrompt="";
const memoryKey="yeko-memory", themeKey="yeko-theme";
const memoryOn=()=>localStorage.getItem(memoryKey)!=="off";
const firebaseReady=Boolean(config.apiKey && config.projectId && config.authDomain && !String(config.apiKey).startsWith("PASTE_"));

if(firebaseReady){
  const app=initializeApp(config); auth=getAuth(app); db=getFirestore(app);
  onAuthStateChanged(auth, async u=>{user=u;renderAccount();if(u)await loadChats();else{chats=[];renderHistory();}});
}else{
  $("status").textContent="Firebase is not configured yet. Add your Firebase Web App values in public/js/firebase-config.js.";
  $("loginBtn").addEventListener("click",()=>$("authDialog").showModal());
}

function renderAccount(){
  $("userBadge").textContent=user?.email||"Guest";
  $("accountArea").innerHTML=user?'<button id="logoutBtn" class="side-btn">↪ Sign out</button>':'<button id="loginBtn" class="side-btn">Sign in / Create account</button>';
  $("loginBtn")?.addEventListener("click",()=>$("authDialog").showModal());
  $("logoutBtn")?.addEventListener("click",async()=>{await signOut(auth);newChat();});
}
function renderHistory(){
  $("history").replaceChildren();
  chats.forEach(c=>{
    const row=document.createElement("div");row.className="history-item";
    const name=document.createElement("button");name.className="history-name";name.textContent=c.title||"New conversation";name.onclick=()=>openChat(c.id);
    const del=document.createElement("button");del.className="delete-chat";del.textContent="×";del.title="Delete conversation";
    del.onclick=async e=>{e.stopPropagation();if(!confirm("Delete this conversation?"))return;try{await deleteDoc(doc(db,"users",user.uid,"chats",c.id));chats=chats.filter(x=>x.id!==c.id);renderHistory();if(currentChat===c.id)newChat();}catch(err){setStatus(err.message)}};
    row.append(name,del);$("history").append(row);
  });
}
async function loadChats(){
  if(!db||!user)return;
  try{const snap=await getDocs(query(collection(db,"users",user.uid,"chats"),orderBy("updatedAt","desc")));chats=snap.docs.map(d=>({id:d.id,...d.data()}));renderHistory();}
  catch(e){console.error(e);setStatus("Could not load chat history. Check Firestore rules and setup.");}
}
function setStatus(s){$("status").textContent=s||"";}
function newChat(){currentChat=null;currentMessages=[];$("messages").replaceChildren();$("welcome").hidden=false;$("prompt").focus();}
function openChat(id){
  const c=chats.find(x=>x.id===id);if(!c)return;
  currentChat=id;currentMessages=Array.isArray(c.messages)?c.messages.slice(-60):[];
  $("welcome").hidden=true;$("messages").replaceChildren();
  currentMessages.forEach(m=>addMessage(m.role,m.content,false));
  $("sidebar").classList.remove("open");
}
function addMessage(role,content,actions=true){
  $("welcome").hidden=true;
  const wrap=document.createElement("div");wrap.className="message "+role;
  const av=document.createElement("div");av.className="avatar";av.textContent=role==="user"?"Y":"✦";
  const body=document.createElement("div");body.className="bubble";
  if(typeof content==="string")body.textContent=content;else body.append(content);
  wrap.append(av,body);
  if(role==="assistant"&&actions&&typeof content==="string"){
    const bar=document.createElement("div");bar.className="message-actions";
    [["Copy",()=>navigator.clipboard?.writeText(content)],["Read aloud",()=>speak(content)],["Regenerate",()=>regenerate()]].forEach(([label,fn])=>{
      const b=document.createElement("button");b.textContent=label;b.onclick=fn;bar.append(b);
    });body.append(bar);
  }
  $("messages").append(wrap);wrap.scrollIntoView({behavior:"smooth",block:"end"});return body;
}
async function ensureChat(first){
  if(currentChat||!user||!db||!memoryOn())return currentChat;
  const ref=await addDoc(collection(db,"users",user.uid,"chats"),{title:first.slice(0,48)||"New conversation",messages:[],createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  currentChat=ref.id;chats.unshift({id:ref.id,title:first.slice(0,48),messages:[]});renderHistory();return currentChat;
}
async function persistNew(messages){
  currentMessages.push(...messages);currentMessages=currentMessages.slice(-60);
  if(!user||!db||!memoryOn())return;
  if(!currentChat)await ensureChat(messages.find(m=>m.role==="user")?.content||"New conversation");
  if(!currentChat)return;
  const ref=doc(db,"users",user.uid,"chats",currentChat);
  const title=(currentMessages.find(m=>m.role==="user")?.content||"New conversation").slice(0,48);
  await setDoc(ref,{title,messages:currentMessages,updatedAt:serverTimestamp(),createdAt:serverTimestamp()},{merge:true});
  const existing=chats.find(c=>c.id===currentChat);
  if(existing){existing.title=title;existing.messages=currentMessages;}else chats.unshift({id:currentChat,title,messages:currentMessages});
  renderHistory();
}
async function apiPost(path,payload){
  if(!user)throw new Error("Please sign in first.");
  const token=await user.getIdToken();
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({error:"The server returned an invalid response."}));
  if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);
  return data;
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(",")[1]);r.onerror=reject;r.readAsDataURL(file);});}
async function send(text){
  if(busy)return;
  const clean=(text||"").trim();
  if(!clean&&!attachedImage&&!attachedFile)return;
  if(!user){$("authDialog").showModal();$("authError").textContent="Please sign in to use YEKO AMITHA.";return;}
  busy=true;$("sendBtn").disabled=true;setStatus(mode==="search"?"Searching the web…":"YEKO AMITHA is thinking…");
  const userText=clean||(attachedImage?"Please analyze this image.":"Please analyze this file.");
  lastUserPrompt=userText;
  addMessage("user",userText);
  $("prompt").value="";$("prompt").style.height="auto";
  const image=attachedImage,file=attachedFile;attachedImage=null;attachedFile=null;$("attachmentPreview").textContent="";
  const history=currentMessages.slice(-20).filter(m=>m.role==="user"||m.role==="assistant").map(m=>({role:m.role,content:m.content}));
  try{
    await persistNew([{role:"user",content:userText}]);
    if(mode==="search"){
      const result=await apiPost("/.netlify/functions/search",{query:userText});
      const links=(result.results||[]).map(x=>`${x.title}\n${x.url}\n${x.content||""}`).join("\n\n");
      const answer=[result.answer||"Search results:",links].filter(Boolean).join("\n\n");
      addMessage("assistant",answer||"No search results were returned.");
      await persistNew([{role:"assistant",content:answer||"No search results were returned."}]);
    }else{
      const payload={message:userText,history,image,file};
      const result=await apiPost("/.netlify/functions/chat",payload);
      addMessage("assistant",result.reply);
      await persistNew([{role:"assistant",content:result.reply}]);
    }
    if(memoryOn())await loadChats();
  }catch(e){addMessage("assistant","Sorry, I could not complete that request: "+e.message);setStatus(e.message);}
  finally{busy=false;$("sendBtn").disabled=false;if(!$("status").textContent.startsWith("Sorry"))setStatus("");mode="chat";updateModeButtons();}
}
async function generateImage(){
  const prompt=$("prompt").value.trim();
  if(!prompt){setStatus("Write a description of the image you want first.");return;}
  if(!user){$("authDialog").showModal();$("authError").textContent="Please sign in to generate images.";return;}
  if(busy)return;
  busy=true;$("sendBtn").disabled=true;setStatus("Creating your image…");
  addMessage("user","Create an image: "+prompt);$("prompt").value="";
  try{
    const data=await apiPost("/.netlify/functions/image",{prompt});
    if(!data.image)throw new Error("The image service returned no image.");
    const img=document.createElement("img");img.src=data.image;img.alt="AI-generated image";img.className="generated-image";
    const holder=document.createElement("div");holder.append(img);
    addMessage("assistant",holder,false);
    await persistNew([{role:"user",content:"Create an image: "+prompt},{role:"assistant",content:"[Generated image] "+prompt}]);
  }catch(e){addMessage("assistant","Image generation failed: "+e.message);setStatus(e.message);}
  finally{busy=false;$("sendBtn").disabled=false;mode="chat";$("prompt").placeholder="Message YEKO AMITHA...";if(!$("status").textContent.startsWith("Image generation"))setStatus("");}
}
function updateModeButtons(){
  $("searchBtn").classList.toggle("active",mode==="search");
  $("searchBtn").textContent=mode==="search"?"⌕ Search mode on":"⌕ Web search";
}
async function regenerate(){
  if(!lastUserPrompt||busy)return;
  const index=[...currentMessages].map(m=>m.role).lastIndexOf("user");
  if(index<0)return;
  const previousPrompt=currentMessages[index].content;
  currentMessages=currentMessages.slice(0,index);
  await send(previousPrompt);
}
function speak(t){if(!("speechSynthesis"in window)){alert("Speech playback is not supported in this browser.");return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);speechSynthesis.speak(u);}

$("sendBtn").onclick=()=>mode==="image"?generateImage():send($("prompt").value);
$("prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();mode==="image"?generateImage():send($("prompt").value);}});
$("prompt").addEventListener("input",e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,150)+"px";});
$("newChat").onclick=newChat;$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem(themeKey,document.body.classList.contains("light")?"light":"dark");};
if(localStorage.getItem(themeKey)==="light")document.body.classList.add("light");
$("memoryBtn").onclick=()=>{$("memoryToggle").checked=memoryOn();$("memoryDialog").showModal();};
$("memoryForm").addEventListener("submit",()=>{localStorage.setItem(memoryKey,$("memoryToggle").checked?"on":"off");if(!memoryOn())setStatus("Chat history saving is off. New chats will not be stored.");});
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>{$("prompt").value=b.dataset.prompt;$("prompt").focus();});
$("imageBtn").onclick=()=>$("imageInput").click();$("fileBtn").onclick=()=>$("fileInput").click();
$("imageInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("Image must be under 3 MB for reliable server upload.");e.target.value="";return;}attachedImage={name:f.name,mimeType:f.type,data:await fileToBase64(f)};$("attachmentPreview").textContent="Image attached: "+f.name;e.target.value="";};
$("fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>4*1024*1024){alert("File must be under 4 MB for reliable server upload.");e.target.value="";return;}attachedFile={name:f.name,mimeType:f.type,data:await fileToBase64(f)};$("attachmentPreview").textContent="File attached: "+f.name;e.target.value="";};
$("micBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("Voice input is not supported in this browser. Try a supported browser.");return;}const r=new SR();r.lang="ha-NG";r.interimResults=false;r.onstart=()=>setStatus("Listening…");r.onresult=e=>{$("prompt").value=e.results[0][0].transcript;};r.onerror=e=>setStatus("Microphone error: "+e.error);r.onend=()=>setStatus("");r.start();};
$("searchBtn").onclick=()=>{mode=mode==="search"?"chat":"search";updateModeButtons();setStatus(mode==="search"?"Web search mode is on. Your next message will be searched online.":"Web search mode is off.");};
$("generateBtn").onclick=()=>{mode="image";$("prompt").placeholder="Describe the image you want YEKO AMITHA to create…";$("prompt").focus();setStatus("Image creation mode is on. Enter an image description.");};
$("authSwitch").onclick=()=>{signup=!signup;$("authTitle").textContent=signup?"Create your account":"Welcome back";$("authSwitch").textContent=signup?"I already have an account":"Create account";$("authPassword").autocomplete=signup?"new-password":"current-password";};
$("authForm").onsubmit=async e=>{e.preventDefault();if(!auth){$("authError").textContent="Firebase configuration is missing.";return;}try{const email=$("authEmail").value,password=$("authPassword").value;if(signup)await createUserWithEmailAndPassword(auth,email,password);else await signInWithEmailAndPassword(auth,email,password);$("authDialog").close();$("authError").textContent="";}catch(err){$("authError").textContent=err.message;}};
$("resetPassword").onclick=async()=>{try{if(!auth)throw new Error("Firebase is not configured.");await sendPasswordResetEmail(auth,$("authEmail").value);$("authError").textContent="Password reset email sent.";}catch(e){$("authError").textContent=e.message;}};
renderAccount();
