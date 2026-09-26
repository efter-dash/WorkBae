const STORAGE_KEY = 'workbae-v1';
const ACTION_WORDS = [
  'completed','finished','done','sent','shared','submitted','delivered','published','posted','scheduled',
  'designed','created','prepared','updated','revised','edited','fixed','resolved','reviewed','checked',
  'approved','confirmed','meeting','met','call','called','discussed','follow up','follow-up','working on',
  'need','please','can you','could you','deadline','feedback','change','launch','report','invoice','payment',
  'করেছি','শেষ','পাঠিয়েছি','পাঠিয়েছি','শেয়ার','আপডেট','ডিজাইন','মিটিং','কল','রিভিউ','দেখেছি','দিতে হবে','করতে হবে'
];
const TYPES = {
  deliverable: ['sent','shared','submitted','delivered','published','posted','scheduled','পাঠিয়েছি','পাঠিয়েছি','শেয়ার'],
  meeting: ['meeting','met','call','called','discussed','মিটিং','কল'],
  decision: ['approved','confirmed','feedback','decision','approved','রিভিউ'],
  task: ['completed','finished','done','designed','created','prepared','updated','revised','edited','fixed','resolved','করেছি','শেষ','আপডেট','ডিজাইন'],
  request: ['need','please','can you','could you','deadline','change','দিতে হবে','করতে হবে']
};

let state = loadState();
let draftEntries = [];
let activeView = 'today';
let exportScope = 'day';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const todayISO = () => new Date().toLocaleDateString('en-CA');

function defaultState() { return { clients: [], savedDays: {}, myNames: ['You'], aiModel: 'qwen3:1.7b', settingsSeen: false }; }
function loadState() {
  try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return defaultState(); }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(value='') { let h=2166136261; for (const c of value) { h ^= c.charCodeAt(0); h = Math.imul(h,16777619); } return (h>>>0).toString(36); }
function escapeHTML(value='') { return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function titleCase(value='') { return value.replace(/[_-]+/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }
function showToast(message) { const el=$('#toast'); el.textContent=message; el.classList.remove('hidden'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>el.classList.add('hidden'),2600); }

function parseDate(raw, inferredOrder='DMY') {
  const clean = raw.replace(/[\u200e\u200f]/g,'').trim();
  const parts = clean.match(/(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})/);
  if (!parts) return null;
  let a=Number(parts[1]), b=Number(parts[2]), c=Number(parts[3]);
  let year, month, day;
  if (a > 31) { year=a; month=b; day=c; }
  else {
    year = c < 100 ? 2000+c : c;
    if (a > 12) { day=a; month=b; }
    else if (b > 12) { month=a; day=b; }
    else if (inferredOrder === 'MDY') { month=a; day=b; }
    else { day=a; month=b; }
  }
  const date = new Date(year, month-1, day);
  if (isNaN(date) || date.getMonth() !== month-1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function parseChat(text) {
  const lines = text.replace(/\r/g,'').split('\n');
  let inferredOrder='DMY';
  for (const line of lines) {
    const dateBits=line.replace(/[\u200e\u200f]/g,'').match(/^\[?(\d{1,2})[/.\-](\d{1,2})[/.\-]\d{2,4}/);
    if (!dateBits) continue;
    if (Number(dateBits[2]) > 12) { inferredOrder='MDY'; break; }
    if (Number(dateBits[1]) > 12) { inferredOrder='DMY'; break; }
  }
  const messages=[];
  let current=null;
  const bracketed = /^\[([^,\]]+),?\s+([^\]]+)\]\s*[-–]?\s*([^:]+):\s*(.*)$/;
  const dashed = /^(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}),?\s+([^\-–]+)\s[-–]\s([^:]+):\s*(.*)$/;
  for (const rawLine of lines) {
    const line=rawLine.replace(/[\u200e\u200f]/g,'').trimEnd();
    let match=line.match(bracketed) || line.match(dashed);
    if (match) {
      const date=parseDate(match[1], inferredOrder);
      if (!date) continue;
      current={ date, time: match[2].trim(), sender: match[3].trim(), text: match[4].trim() };
      current.id=uid(`${current.date}|${current.time}|${current.sender}|${current.text}`);
      messages.push(current);
    } else if (current && line.trim()) {
      current.text += `\n${line.trim()}`;
      current.id=uid(`${current.date}|${current.time}|${current.sender}|${current.text}`);
    }
  }
  return messages.filter(m => !/messages and calls are end-to-end encrypted|created group|changed the subject|added you|security code changed/i.test(m.text));
}

function detectType(text) {
  const lower=text.toLowerCase();
  if (/please note for current and future projects|standing instruction|files should be named properly/.test(lower)) return 'process direction';
  if (/brief|document|\.pdf|meeting minute|compiled feedback|props list|doc link/.test(lower)) return 'documentation';
  if (/meeting|reminder|deadline|deliver|priority|any update|posting window|available|join|please share if|do share|need.*today/.test(lower)) return 'coordination';
  if (/feedback|subtitle|audio|sound|lighting|shadow|resolution|trim|safe zone|unnatural|error|review|volume|lip sync|quality|b-roll|footage|miss/.test(lower)) return 'quality review';
  if (/concept|thumbnail|design style|logo placement|graphic|copy option|mnemonic|font|layout|visual reference/.test(lower)) return 'creative direction';
  for (const [type, words] of Object.entries(TYPES)) if (words.some(w => lower.includes(w))) return type;
  return 'update';
}
function isWorkLike(text) {
  const lower=text.toLowerCase();
  if (/^(?:image|video|audio|document) omitted$/i.test(text.replace(/[\u200e\u200f]/g,'').trim())) return false;
  return (ACTION_WORDS.some(word => lower.includes(word)) || /concept|thumbnail|brief|feedback|subtitle|audio|lighting|logo|graphic|reference|meeting minute|instruction|props list|safe zone|resolution|sound effect/.test(lower)) && text.length > 3;
}
function isLowSignal(text) {
  const clean=text.replace(/[\u200e\u200f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  return /no additional input/.test(clean) || (clean.length < 60 && /^(yes|okay|ok|sure|thank you|thanks|looks good|this is good|on it|accha)[.! ,]*$/.test(clean));
}
function contributionFragment(raw) {
  const text=raw.replace(/[\u200e\u200f]/g,'').replace(/<this message was edited>/ig,'').replace(/\s+/g,' ').trim();
  const lower=text.toLowerCase();
  if (/^concept:\s*(?:image omitted)?$/i.test(text)) return 'Developed and shared the initial visual concept';
  if (/thumbnail concept/.test(lower)) return 'Developed and shared the thumbnail concept';
  if (/reference and design style/.test(lower)) return 'Provided a visual reference and defined the design direction';
  if (/logo placement style reference/.test(lower)) return 'Defined the logo-placement approach with a visual reference';
  if (/errors? in the subtitles/.test(lower)) return 'Reviewed subtitle accuracy and documented specific spoken-word and timeline corrections';
  if (/video feedback\.pdf/.test(lower)) return 'Compiled and shared a structured video-feedback document';
  if (/compiled feedback tab link/.test(lower)) return 'Consolidated production feedback into the shared working document';
  if (/meeting minute/.test(lower)) return 'Documented and shared the meeting minutes';
  if (/photographer_brief/.test(lower)) return 'Prepared and shared the photographer brief';
  if (/cinematographer_brief/.test(lower)) return 'Prepared and shared the cinematographer brief';
  if (/props list/.test(lower)) return 'Prepared and circulated the production props list';
  if (/please share an option with different facial expression/.test(lower)) return 'Directed an alternate thumbnail treatment using a different facial expression';
  if (/^https?:\/\//.test(lower)) return 'Shared a supporting creative reference';
  const cleaned=text.replace(/\uFFFC/g,'').replace(/(?:image|video|audio|document) omitted/ig,'').replace(/@⁨[^⁩]+⁩/g,'').replace(/^[-•]\s*/,'').trim();
  if (!cleaned) return 'Shared a supporting creative asset';
  const polished=cleaned.charAt(0).toUpperCase()+cleaned.slice(1).replace(/\s+([,.])/g,'$1');
  const type=detectType(text);
  if (type==='quality review') return `Reviewed the output and specified: ${polished}`;
  if (type==='creative direction') return `Provided creative direction: ${polished}`;
  if (type==='coordination') return `Coordinated delivery and follow-up: ${polished}`;
  if (type==='documentation') return `Prepared or shared project documentation: ${polished}`;
  if (type==='process direction') return `Established production standards: ${polished}`;
  return polished;
}
function getEntriesForDate(date) {
  const saved=state.savedDays[date];
  if (saved && activeView === 'history') return saved.entries.map(e=>({...e}));
  const ownNames=state.myNames.map(n=>n.toLowerCase().trim()).filter(Boolean);
  const groups=new Map();
  for (const client of state.clients) {
    for (const message of client.messages.filter(m=>m.date===date && isWorkLike(m.text))) {
      const own=ownNames.includes(message.sender.toLowerCase()) || message.sender.toLowerCase()==='you';
      if (!own || isLowSignal(message.text)) continue;
      const type=detectType(message.text);
      const key=`${client.id}-${type}`;
      if (!groups.has(key)) groups.set(key,{ id:key, clientId:client.id, client:client.name, text:'', type, time:message.time, sender:message.sender, source:'chat', fragments:[] });
      groups.get(key).fragments.push(contributionFragment(message.text));
    }
  }
  return [...groups.values()].map(group=>{
    const unique=[...new Set(group.fragments)].filter(Boolean);
    group.text=`${titleCase(group.type)} — ${unique.join('; ')}.`.replace(/\.\.$/,'.');
    delete group.fragments;
    return group;
  });
}

function latestContributionDate() {
  const ownNames=state.myNames.map(name=>name.toLowerCase().trim()).filter(Boolean);
  const dates=[];
  for (const client of state.clients) for (const message of client.messages) {
    const own=ownNames.includes(message.sender.toLowerCase()) || message.sender.toLowerCase()==='you';
    if (own && isWorkLike(message.text) && !isLowSignal(message.text)) dates.push(message.date);
  }
  return dates.sort().at(-1) || '';
}

function inferClientName(filename, text) {
  const first=text.replace(/\r/g,'').split('\n').find(line=>/end-to-end encrypted/i.test(line));
  const match=first?.replace(/[\u200e\u200f]/g,'').match(/^\[[^\]]+\]\s*([^:]+):/);
  if (match) return match[1].trim();
  const fromFile=(filename||'').replace(/\.txt$/i,'').replace(/^_?chat$/i,'').replace(/WhatsApp Chat with /i,'').trim();
  return fromFile || 'Imported client';
}

function importConversation(name, text) {
  const messages=parseChat(text);
  if (!messages.length) { showToast('No dated WhatsApp messages were recognized.'); return false; }
  const cleanName=inferClientName(name,text);
  let client=state.clients.find(c=>c.name.toLowerCase()===cleanName.toLowerCase());
  if (!client) { client={id:uid(`${cleanName}-${Date.now()}`),name:cleanName,messages:[],updatedAt:null}; state.clients.unshift(client); }
  const byId=new Map(client.messages.map(m=>[m.id,m]));
  messages.forEach(m=>byId.set(m.id,m));
  client.messages=[...byId.values()].sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  client.updatedAt=new Date().toISOString();
  persist();
  $('#datePicker').value=latestContributionDate() || todayISO();
  render();
  showToast(`Imported ${messages.length} messages for ${cleanName}.`);
  if (!state.settingsSeen) openSettings();
  return true;
}

function render() {
  const date=$('#datePicker').value || todayISO();
  const empty=state.clients.length===0;
  $('#emptyState').classList.toggle('hidden',!empty);
  $('#workspace').classList.toggle('hidden',empty);
  $('#clientCount').textContent=state.clients.length;
  $('#threadCount').textContent=new Set(state.clients.filter(c=>c.messages.some(m=>m.date===date)).map(c=>c.id)).size;
  renderClients(date);
  if (empty) return;
  draftEntries=getEntriesForDate(date);
  renderEntries(date);
  renderSources(date);
  renderSavedStatus(date);
}
function renderClients(date) {
  $('#clientList').innerHTML=state.clients.map(c=>{
    const count=c.messages.filter(m=>m.date===date).length;
    return `<button class="client-item" data-client="${c.id}"><span class="client-avatar">${escapeHTML(c.name.charAt(0).toUpperCase())}</span><span class="client-name">${escapeHTML(c.name)}</span><span class="client-meta">${count||''}</span></button>`;
  }).join('');
}
function renderEntries(date) {
  const displayDate=new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  $('#logTitle').textContent=displayDate;
  $('#suggestedCount').textContent=draftEntries.length;
  $('#noEntries').classList.toggle('hidden',draftEntries.length>0);
  $('#logEntries').innerHTML=draftEntries.map((e,i)=>`<article class="log-entry">
    <span class="type-dot">${({deliverable:'↗',meeting:'◉',decision:'✓',task:'◆',request:'?',update:'•','creative direction':'✦','quality review':'✓',documentation:'▤',coordination:'◉','process direction':'◇'})[e.type]||'•'}</span>
    <div><textarea class="entry-text" data-index="${i}">${escapeHTML(e.text)}</textarea><div class="entry-meta"><span class="tag">${escapeHTML(titleCase(e.type))}</span><span>${escapeHTML(e.client)}</span><span>${escapeHTML(e.time||'Manual')}</span></div></div>
    <button class="delete-entry" data-delete="${i}" title="Remove">×</button>
  </article>`).join('');
}
function renderSources(date) {
  const rows=state.clients.map(c=>({name:c.name,messages:c.messages.filter(m=>m.date===date)})).filter(x=>x.messages.length);
  $('#sourceActivity').innerHTML=rows.length ? rows.map(r=>`<div class="source-row"><div><strong>${escapeHTML(r.name)}</strong><span>${r.messages.length} messages scanned</span></div><em>${r.messages.filter(m=>isWorkLike(m.text)).length} found</em></div>`).join('') : '<div class="no-entries" style="min-height:120px"><span>No messages on this date.</span></div>';
}
function renderSavedStatus(date) {
  const saved=state.savedDays[date];
  $('#dayStatus').textContent=saved?'Saved':'Draft';
  $('#savedTime').textContent=saved?`Saved ${new Date(saved.savedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'Review before saving';
}

function currentEntries() {
  $$('.entry-text').forEach(el=>{ if(draftEntries[Number(el.dataset.index)]) draftEntries[Number(el.dataset.index)].text=el.value.trim(); });
  return draftEntries.filter(e=>e.text);
}
function saveDay() {
  const date=$('#datePicker').value;
  state.savedDays[date]={savedAt:new Date().toISOString(),entries:currentEntries()};
  persist(); renderSavedStatus(date); showToast('Daily work log saved on this Mac.');
}

function localAIMessage(action, extra={}) {
  if (!window.webkit?.messageHandlers?.daybook) { showToast('Local AI connection is available in the Mac app.'); return false; }
  window.webkit.messageHandlers.daybook.postMessage({action,...extra});
  return true;
}
function buildLocalAIPrompt(date) {
  const ownNames=state.myNames.join(', ');
  const rows=[];
  for (const client of state.clients) for (const message of client.messages.filter(item=>item.date===date)) {
    rows.push(`[Client: ${client.name}] [${message.time}] ${message.sender}: ${message.text.replace(/\s+/g,' ').trim()}`);
  }
  const transcript=rows.join('\n').slice(0,12000);
  return `Create an English daily contribution log for ${date} from this WhatsApp transcript.\n\nThe worker's WhatsApp names are: ${ownNames}.\n\nRules:\n- Translate mixed Bangla, Banglish, and English into natural professional English.\n- Include only work actually contributed by the worker: creative direction, review feedback, documents or briefs prepared, coordination, decisions, follow-up, and production standards.\n- Use other people's messages only as context. Never credit their work to the worker.\n- Merge repeated messages about the same piece of work.\n- Omit greetings, acknowledgements, links without context, and casual chat.\n- Do not invent outcomes, completion, or ownership.\n- Write concise action-led summaries such as "Reviewed the video and specified subtitle corrections."\n- Return JSON exactly in this shape: {"contributions":[{"client":"Client name","category":"Creative Direction | Quality Review | Documentation | Coordination | Process Direction | Delivery","title":"Short title","summary":"One or two factual sentences"}]}\n- Return an empty contributions array if there is no defensible contribution.\n\nTRANSCRIPT:\n${transcript}`;
}
function runLocalAI() {
  const date=$('#datePicker').value;
  const hasMessages=state.clients.some(client=>client.messages.some(message=>message.date===date));
  if (!hasMessages) { showToast('There are no chat messages on this date.'); return; }
  const button=$('#runLocalAi');
  button.disabled=true;
  button.innerHTML='<span>⌛</span> Local model is reading the day…';
  $('#aiStatus').textContent='Translating Bangla + English and preparing contribution entries locally…';
  localAIMessage('summarizeLocalAI',{model:state.aiModel,prompt:buildLocalAIPrompt(date)});
}
window.workBaeAIStatus=result=>{
  const dots=[$('#topAiDot'),$('#connectionResult .status-dot')];
  dots.forEach(dot=>dot?.classList.toggle('online',Boolean(result.ok)));
  $('#connectionResult').lastChild.textContent=` ${result.message}`;
  if (result.ok) {
    const available=(result.models||[]).some(name=>name===state.aiModel || name.startsWith(`${state.aiModel}:`));
    $('#aiStatus').textContent=available ? `${state.aiModel} is ready on this Mac.` : `Ollama is running. Download ${state.aiModel} to enable summaries.`;
  }
};
window.workBaeAIResult=result=>{
  const button=$('#runLocalAi');
  button.disabled=false;
  button.innerHTML='<span>✦</span> Translate &amp; Summarize This Day';
  if (!result.ok) { $('#aiStatus').textContent=result.message; showToast(result.message); return; }
  try {
    const cleaned=result.content.replace(/```(?:json)?|```/gi,'').trim();
    const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}');
    const parsed=JSON.parse(cleaned.slice(start,end+1));
    const items=Array.isArray(parsed.contributions)?parsed.contributions:[];
    draftEntries=items.map((item,index)=>({
      id:`local-ai-${Date.now()}-${index}`,
      clientId:'local-ai',
      client:item.client || state.clients[0]?.name || 'General',
      text:`${item.title || titleCase(item.category || 'Contribution')} — ${item.summary || ''}`.trim(),
      type:(item.category || 'Contribution').toLowerCase(),
      time:'Local AI', sender:state.myNames[0] || 'Me', source:'local-ai'
    })).filter(item=>item.text);
    renderEntries($('#datePicker').value);
    $('#suggestedCount').textContent=draftEntries.length;
    $('#aiStatus').textContent=`Local AI created ${draftEntries.length} translated contribution ${draftEntries.length===1?'entry':'entries'}. Review before saving.`;
    showToast('Local AI contribution log is ready for review.');
  } catch (error) {
    $('#aiStatus').textContent='The model answered, but its format could not be read. Try again.';
    showToast('Could not read the local model response.');
  }
};
function entriesForExportDate(date, selectedDate) {
  if (date===selectedDate) return currentEntries();
  if (state.savedDays[date]?.entries?.length) return state.savedDays[date].entries;
  return getEntriesForDate(date);
}
function exportContent(format, scope=exportScope) {
  const date=$('#datePicker').value;
  const month=date.slice(0,7);
  let datedEntries=[];
  if (scope==='month') {
    const dates=new Set(Object.keys(state.savedDays).filter(item=>item.startsWith(month)));
    state.clients.forEach(client=>client.messages.forEach(message=>{ if(message.date.startsWith(month)) dates.add(message.date); }));
    [...dates].sort().forEach(day=>entriesForExportDate(day,date).forEach(entry=>datedEntries.push({date:day,...entry})));
  } else {
    datedEntries=currentEntries().map(entry=>({date,...entry}));
  }
  if (!datedEntries.length) { showToast(`No contribution entries found for this ${scope}.`); return; }
  let filename, content;
  if (format==='csv') {
    filename=scope==='month' ? `workbae-monthly-log-${month}.csv` : `workbae-daily-log-${date}.csv`;
    const quote=v=>`"${String(v||'').replace(/"/g,'""')}"`;
    content=['Date,Client,Type,Time,Contribution',...datedEntries.map(entry=>[entry.date,entry.client,entry.type,entry.time,entry.text].map(quote).join(','))].join('\n');
  } else {
    filename=scope==='month' ? `workbae-monthly-log-${month}.md` : `workbae-daily-log-${date}.md`;
    if (scope==='month') {
      const groups=Object.groupBy ? Object.groupBy(datedEntries,entry=>entry.date) : datedEntries.reduce((all,entry)=>((all[entry.date]||=[]).push(entry),all),{});
      content=`# Monthly contribution log — ${month}\n\n${Object.keys(groups).sort().map(day=>`## ${day}\n\n${groups[day].map(entry=>`- **${entry.client}** · ${titleCase(entry.type)}${entry.time?` · ${entry.time}`:''}\n  ${entry.text}`).join('\n\n')}`).join('\n\n')}\n`;
    } else {
      content=`# Daily contribution log — ${date}\n\n${datedEntries.map(entry=>`- **${entry.client}** · ${titleCase(entry.type)}${entry.time?` · ${entry.time}`:''}\n  ${entry.text}`).join('\n\n')}\n`;
    }
  }
  if (window.webkit?.messageHandlers?.daybook) window.webkit.messageHandlers.daybook.postMessage({action:'exportFile',filename,content});
  else { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type:'text/plain'})); a.download=filename; a.click(); }
}
function openSettings() { $('#myNames').value=state.myNames.join(', '); $('#settingsModal').classList.remove('hidden'); }
function openAISettings() { $('#aiModel').value=state.aiModel; $('#aiModal').classList.remove('hidden'); localAIMessage('checkLocalAI'); }

$('#datePicker').value=latestContributionDate() || todayISO();
function chooseChatFile() {
  if (window.webkit?.messageHandlers?.daybook) window.webkit.messageHandlers.daybook.postMessage({action:'importChat'});
  else $('#fileInput').click();
}
window.workBaeNativeImport=(name,text)=>importConversation(name,text);
$('#importButton').onclick=$('#emptyImport').onclick=chooseChatFile;
$('#fileInput').onchange=async event=>{ for(const file of event.target.files) importConversation(file.name,await file.text()); event.target.value=''; };
$('#pasteButton').onclick=()=>$('#pasteModal').classList.remove('hidden');
$$('.close-modal').forEach(b=>b.onclick=()=>$('#pasteModal').classList.add('hidden'));
$('#processPaste').onclick=()=>{ if(importConversation($('#pasteClient').value,$('#pasteText').value)){ $('#pasteModal').classList.add('hidden'); $('#pasteText').value=''; $('#pasteClient').value=''; } };
$('#settingsButton').onclick=openSettings;
$$('.close-settings').forEach(b=>b.onclick=()=>$('#settingsModal').classList.add('hidden'));
$('#saveSettings').onclick=()=>{ state.myNames=$('#myNames').value.split(',').map(x=>x.trim()).filter(Boolean); state.settingsSeen=true; persist(); $('#settingsModal').classList.add('hidden'); render(); showToast('Your message names were saved.'); };
$('#aiSetupButton').onclick=openAISettings;
$$('.close-ai-modal').forEach(button=>button.onclick=()=>$('#aiModal').classList.add('hidden'));
$('#checkAiConnection').onclick=()=>localAIMessage('checkLocalAI');
$('#saveAiSettings').onclick=()=>{ state.aiModel=$('#aiModel').value.trim() || 'qwen3:1.7b'; persist(); $('#aiModelChip').textContent=state.aiModel.toUpperCase(); $('#aiModal').classList.add('hidden'); localAIMessage('checkLocalAI'); showToast('Local AI model setting saved.'); };
$('#runLocalAi').onclick=runLocalAI;
$('#datePicker').onchange=render;
$('#saveDay').onclick=saveDay;
$('#addManual').onclick=()=>{ draftEntries.push({id:`manual-${Date.now()}`,clientId:'manual',client:'General',text:'',type:'update',time:'',sender:'Me',source:'manual'}); renderEntries($('#datePicker').value); setTimeout(()=>$$('.entry-text').at(-1)?.focus(),0); };
$('#logEntries').onclick=e=>{ const index=e.target.dataset.delete; if(index!==undefined){ currentEntries(); draftEntries.splice(Number(index),1); renderEntries($('#datePicker').value); } };
$$('.scope-button').forEach(button=>button.onclick=()=>{
  exportScope=button.dataset.scope;
  $$('.scope-button').forEach(item=>item.classList.toggle('active',item===button));
  const monthly=exportScope==='month';
  $('#exportTitle').textContent=monthly?'Export the month':'Export the day';
  $('#exportDescription').textContent=monthly?'Combine every contribution from the selected month.':'Share the selected day without exposing the full chat.';
});
$('#exportMarkdown').onclick=()=>exportContent('markdown',exportScope);
$('#exportCsv').onclick=()=>exportContent('csv',exportScope);
$('#openWhatsApp').onclick=()=>{ if(window.webkit?.messageHandlers?.daybook) window.webkit.messageHandlers.daybook.postMessage({action:'openWhatsApp'}); else window.open('https://web.whatsapp.com/'); };
$$('.nav-item').forEach(button=>button.onclick=()=>{ $$('.nav-item').forEach(b=>b.classList.remove('active')); button.classList.add('active'); activeView=button.dataset.view; if(activeView==='history'){ const dates=Object.keys(state.savedDays).sort().reverse(); if(dates.length) $('#datePicker').value=dates[0]; else showToast('No saved days yet.'); } render(); });

render();
$('#aiModelChip').textContent=state.aiModel.toUpperCase();
setTimeout(()=>localAIMessage('checkLocalAI'),500);
