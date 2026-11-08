const {adminDb}=require("./firebase-admin");
async function consumeUsage(uid){
  const db=adminDb(),ref=db.collection("usage").doc(uid);
  const now=new Date(),day=now.toISOString().slice(0,10),month=day.slice(0,7);
  const dailyLimit=Math.max(1,Number(process.env.DEFAULT_DAILY_REQUEST_LIMIT||100));
  const monthlyLimit=Math.max(1,Number(process.env.DEFAULT_MONTHLY_REQUEST_LIMIT||2000));
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),d=snap.exists?snap.data():{};
    const daily=d.day===day?(d.daily||0):0,monthly=d.month===month?(d.monthly||0):0;
    if(daily>=dailyLimit)return{ok:false,message:"Daily usage limit reached. Please try again tomorrow."};
    if(monthly>=monthlyLimit)return{ok:false,message:"Monthly usage limit reached."};
    tx.set(ref,{day,month,daily:daily+1,monthly:monthly+1,totalTokens:d.totalTokens||0,updatedAt:now},{merge:true});
    return{ok:true};
  });
}
async function addTokenUsage(uid,tokens){
  if(!tokens)return;
  const ref=adminDb().collection("usage").doc(uid);
  await ref.set({totalTokens:require("firebase-admin").firestore.FieldValue.increment(Number(tokens)||0)},{merge:true});
}
module.exports={consumeUsage,addTokenUsage};