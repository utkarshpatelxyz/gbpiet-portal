const ADDR_RE=/\b(apartment|apartments|apt|flat|plot|street|road|nagar|extension|extn|colony|layout|sector|block|phase|lane|avenue|cross|floor|near|opposite|opp|box|pincode|\bpin\b|district|dist|taluk|tehsil|village|town|city|state|country|building|residency|enclave|society|chowk|marg|puram|pakkam|halli|wadi|gali|bhavan|towers?|complex|no\.)\b/i;
const NAME_LABEL_RE=/\b(?:mail\s*id|e-?mail|mobile|phone|contact|tel|ph\b|mob\b|whatsapp|linkedin)\b/i;
function titleName(s){
  s=(s||"").replace(/[_]+/g," ").replace(/([A-Za-z])\.([A-Za-z])/g,"$1. $2").replace(/\s+/g," ").trim();
  return s.split(/\s+/).map(w=>{
    const bare=w.replace(/[^A-Za-z]/g,"");
    if(bare.length<=2) return w.toUpperCase();                 // initials: "N.", "PK"
    return bare.charAt(0).toUpperCase()+bare.slice(1).toLowerCase();
  }).join(" ").trim();
}
function looksLikeName(s){
  const t=s.replace(/[,.]+$/,"").trim();
  if(!t||t.length>45)return false;
  if(ADDR_RE.test(t))return false;
  if(/\d/.test(t))return false;                                // names have no digits
  if(/@|http|www|resume|curriculum|vitae|objective|summary|profile|linkedin/i.test(t))return false;
  const words=t.split(/\s+/);
  if(words.length<1||words.length>5)return false;
  const letters=t.replace(/[^A-Za-z]/g,"");
  if(letters.length<3)return false;
  if(!/^[A-Za-z][A-Za-z.'\- ]*$/.test(t))return false;
  return true;
}
// phone: prefer a labelled mobile/phone, else a 10-13 digit run (avoids PIN codes / plot nos)
function extractPhone(text){
  const norm=text.replace(/[()]/g,"");
  const lab=norm.match(/(?:mobile|phone|contact|tel|cell|mob|whatsapp)\s*(?:no\.?|number|#)?\s*[:\-]?\s*((?:\+?\d[\d\s.-]{8,}\d))/i);
  if(lab){const d=lab[1].replace(/[^\d+]/g,"");if(d.replace(/\D/g,"").length>=10)return lab[1].trim().replace(/\s{2,}/g," ");}
  // any run of 10-13 digits, optionally +cc, with separators
  const all=norm.match(/\+?\d[\d\s.-]{8,}\d/g)||[];
  for(const c of all){const digits=c.replace(/\D/g,"");if(digits.length>=10 && digits.length<=13)return c.trim().replace(/\s{2,}/g," ");}
  return "";
}
function guessName(text,override){
  if(override && override.trim())return titleName(override.trim());
  const rawLines=text.split("\n").map(l=>l.trim()).filter(Boolean);
  const lines=rawLines.slice(0,20);
  const email=(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)||[])[0]||"";
  // email local-part tokens (drop digits/initials), longest = the family/given name
  let emTokens=[];
  if(email){emTokens=email.split("@")[0].toLowerCase().split(/[^a-z]+/).filter(t=>t.length>=3);}
  const mainTok=emTokens.slice().sort((a,b)=>b.length-a.length)[0]||"";
  // 1) STRONGEST: a header line that contains the email's name token
  if(mainTok){
    for(const l of lines){
      if(l.toLowerCase().replace(/[^a-z]/g,"").includes(mainTok)){
        // strip contact labels and everything after them / after the email
        let nm=l.split(NAME_LABEL_RE)[0].split(/[:|]/)[0].split(/\s{2,}/)[0]
               .replace(/@.*$/,"").replace(/^\s*(name|resume of|cv of|mr\.?|ms\.?|mrs\.?|dr\.?)\s*[:\-]?\s*/i,"")
               .replace(/[,.]+$/,"").trim();
        if(nm && nm.toLowerCase().replace(/[^a-z]/g,"").includes(mainTok) && looksLikeName(nm)) return titleName(nm);
        // name may sit right AFTER the label instead
        let after=l.split(NAME_LABEL_RE).slice(1).join(" ").replace(/[:|].*/,"").trim();
        if(after && after.toLowerCase().replace(/[^a-z]/g,"").includes(mainTok) && looksLikeName(after)) return titleName(after);
      }
    }
  }
  // 2) an explicit "Name:" field
  for(const l of lines){
    const m=l.match(/^\s*name\s*[:\-]\s*(.+)$/i);
    if(m && looksLikeName(m[1])) return titleName(m[1]);
  }
  // 3) first plausible non-address name line near the top
  for(const l of lines.slice(0,10)){
    const cleaned=l.split(NAME_LABEL_RE)[0].replace(/[,.]+$/,"").trim();
    if(looksLikeName(cleaned) && /^[A-Z]/.test(cleaned)) return titleName(cleaned);
  }
  // 4) fall back to the email tokens
  if(emTokens.length) return titleName(emTokens.join(" "));
  return titleName(rawLines[0]||"Candidate");
}

