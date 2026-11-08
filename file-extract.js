const pdfParse=require("pdf-parse");
const mammoth=require("mammoth");
const XLSX=require("xlsx");
async function extractFileText(file){
  if(!file||typeof file.data!=="string")throw new Error("Invalid file upload.");
  const bytes=Buffer.from(file.data,"base64");
  if(!bytes.length||bytes.length>4*1024*1024)throw new Error("File must be smaller than 4 MB.");
  const name=String(file.name||"").toLowerCase();
  if(name.endsWith(".pdf")){const p=await pdfParse(bytes);return p.text||"";}
  if(name.endsWith(".docx")){const d=await mammoth.extractRawText({buffer:bytes});return d.value||"";}
  if(name.endsWith(".xlsx")||name.endsWith(".xls")){
    const w=XLSX.read(bytes,{type:"buffer"});
    return w.SheetNames.map(n=>`Sheet: ${n}\n${XLSX.utils.sheet_to_csv(w.Sheets[n])}`).join("\n\n");
  }
  if(name.endsWith(".txt")||name.endsWith(".csv"))return bytes.toString("utf8");
  throw new Error("Supported files: PDF, DOCX, XLSX, XLS, TXT and CSV.");
}
module.exports={extractFileText};