const STORAGE_KEY = "dailytask_tasks_v1";
const THEME_KEY = "dailytask_theme_v1";

const state = {
  tasks: loadTasks(),
  selectedDate: dateKey(new Date()),
  viewDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  editingId: null
};

const $ = id => document.getElementById(id);

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function parseDateKey(key) {
  const [y,m,d] = key.split("-").map(Number);
  return new Date(y, m-1, d);
}
function todayKey(){ return dateKey(new Date()); }
function formatDate(key, opts={weekday:"long", month:"long", day:"numeric", year:"numeric"}) {
  return parseDateKey(key).toLocaleDateString(undefined, opts);
}
function loadTasks(){
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data && typeof data === "object" ? data : {};
  } catch { return {}; }
}
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); }

function escapeHTML(value=""){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function allTasks(){ return Object.values(state.tasks).flat(); }
function tasksFor(key){ return Array.isArray(state.tasks[key]) ? state.tasks[key] : []; }
function priorityRank(p){ return ({high:0,medium:1,low:2})[p] ?? 1; }


let alarmTimer = null;
let audioContext = null;
const firedAlarms = new Set();

function alarmPermissionStatus(){
  if(!("Notification" in window)) return "Notifications unavailable";
  return Notification.permission === "granted" ? "Notifications enabled" :
         Notification.permission === "denied" ? "Notifications blocked" : "Permission not requested";
}
function renderAlarmStatus(){
  $("alarmStatus").textContent = alarmPermissionStatus();
}
async function enableNotifications(){
  if(!("Notification" in window)){ showToast("Notifications are not supported here"); return; }
  try{
    const result = await Notification.requestPermission();
    renderAlarmStatus();
    showToast(result === "granted" ? "Notifications enabled ✓" : "Notification permission not enabled");
  }catch{ showToast("Could not request notification permission"); }
}
function playAlarmSound(){
  try{
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if(audioContext.state === "suspended") audioContext.resume();
    const start = audioContext.currentTime;
    [0,0.28,0.56,0.84].forEach(offset=>{
      const osc=audioContext.createOscillator();
      const gain=audioContext.createGain();
      osc.type="sine"; osc.frequency.value=880;
      gain.gain.setValueAtTime(0.0001,start+offset);
      gain.gain.exponentialRampToValueAtTime(0.25,start+offset+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,start+offset+0.20);
      osc.connect(gain);gain.connect(audioContext.destination);
      osc.start(start+offset);osc.stop(start+offset+0.22);
    });
  }catch{}
}
function triggerAlarm(task){
  playAlarmSound();
  document.title = "🔔 " + task.title;
  setTimeout(()=>document.title="DailyTask - To-Do Manager",3500);
  if("Notification" in window && Notification.permission==="granted"){
    try{
      new Notification("DailyTask Alarm ⏰",{body:task.title + (task.notes ? "\n"+task.notes : ""), tag:"dailytask-"+task.id});
    }catch{}
  }
  showToast("🔔 Alarm: " + task.title);
  const card = [...document.querySelectorAll(".task-item")].find(el=>el.querySelector('[data-id="'+CSS.escape(String(task.id))+'"]'));
  if(card){card.classList.add("ringing");setTimeout(()=>card.classList.remove("ringing"),3500);}
}
function checkAlarms(){
  const now=new Date();
  const key=dateKey(now);
  const hh=String(now.getHours()).padStart(2,"0"), mm=String(now.getMinutes()).padStart(2,"0");
  const current=hh+":"+mm;
  for(const task of tasksFor(key)){
    if(!task.completed && task.reminder && task.time===current){
      const alarmKey=key+"_"+task.id+"_"+current;
      if(!firedAlarms.has(alarmKey)){ firedAlarms.add(alarmKey); triggerAlarm(task); }
    }
  }
  // Keep the set small.
  if(firedAlarms.size>500) firedAlarms.clear();
}
function startAlarmChecker(){
  clearInterval(alarmTimer);
  checkAlarms();
  alarmTimer=setInterval(checkAlarms,15000);
}
function testAlarm(){
  const task={id:"test",title:"Test alarm",notes:"Your DailyTask alarm is working."};
  triggerAlarm(task);
}


function render(){
  renderStats();
  renderCalendar();
  renderSelectedDate();
  renderTasks();
  renderUpcoming();
}

function renderStats(){
  const all = allTasks();
  $("totalCount").textContent = all.length;
  $("completedCount").textContent = all.filter(t=>t.completed).length;
  $("pendingCount").textContent = all.filter(t=>!t.completed).length;
  $("todayCount").textContent = tasksFor(todayKey()).length;
}

function renderCalendar(){
  const y = state.viewDate.getFullYear(), m = state.viewDate.getMonth();
  $("monthTitle").textContent = state.viewDate.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const first = new Date(y,m,1).getDay();
  const days = new Date(y,m+1,0).getDate();
  const prevDays = new Date(y,m,0).getDate();
  let html = "";
  for(let i=0;i<42;i++){
    const n = i-first+1;
    let d, muted=false;
    if(n<1){ d = new Date(y,m-1,prevDays+n); muted=true; }
    else if(n>days){ d = new Date(y,m+1,n-days); muted=true; }
    else d = new Date(y,m,n);
    const key = dateKey(d);
    const classes = ["day"];
    if(muted) classes.push("muted-day");
    if(key===todayKey()) classes.push("today");
    if(key===state.selectedDate) classes.push("selected");
    if(tasksFor(key).length) classes.push("has-task");
    html += `<button type="button" class="${classes.join(" ")}" data-date="${key}" aria-label="${escapeHTML(formatDate(key))}">${d.getDate()}</button>`;
  }
  $("calendar").innerHTML = html;
  $("calendar").querySelectorAll(".day").forEach(btn=>{
    btn.addEventListener("click",()=>{
      state.selectedDate = btn.dataset.date;
      const d = parseDateKey(state.selectedDate);
      state.viewDate = new Date(d.getFullYear(),d.getMonth(),1);
      render();
    });
  });
}

function renderSelectedDate(){
  $("selectedDateTitle").textContent = formatDate(state.selectedDate);
  const count = tasksFor(state.selectedDate).length;
  $("selectedDateSub").textContent = `${count} task${count===1?"":"s"} scheduled`;
}

function renderTasks(){
  const list = tasksFor(state.selectedDate).slice();
  const q = $("searchInput").value.trim().toLowerCase();
  const filter = $("filterSelect").value;
  const sort = $("sortSelect").value;
  let filtered = list.filter(t=>{
    const matchesQ = !q || t.title.toLowerCase().includes(q) || (t.notes||"").toLowerCase().includes(q) || (t.category||"").toLowerCase().includes(q);
    const matchesFilter = filter==="all" || (filter==="pending" && !t.completed) || (filter==="completed" && t.completed) || (filter==="high" && t.priority==="high");
    return matchesQ && matchesFilter;
  });
  filtered.sort((a,b)=>{
    if(sort==="priority") return priorityRank(a.priority)-priorityRank(b.priority);
    if(sort==="created") return (b.createdAt||0)-(a.createdAt||0);
    return (a.time||"99:99").localeCompare(b.time||"99:99");
  });
  $("taskList").innerHTML = filtered.map(taskHTML).join("");
  $("emptyState").classList.toggle("hidden", filtered.length!==0 || list.length!==0);
  if(list.length && !filtered.length){
    $("emptyState").classList.remove("hidden");
    $("emptyState").querySelector("h3").textContent = "No matching tasks";
    $("emptyState").querySelector("p").textContent = "Try another search or filter.";
    $("emptyState").querySelector("#emptyAddBtn").classList.add("hidden");
  } else {
    $("emptyState").querySelector("h3").textContent = "No tasks for this date";
    $("emptyState").querySelector("p").textContent = "Add a task and keep your day organized.";
    $("emptyState").querySelector("#emptyAddBtn").classList.remove("hidden");
  }
  const completed = list.filter(t=>t.completed).length;
  const pct = list.length ? Math.round(completed/list.length*100) : 0;
  $("progressText").textContent = `${completed} of ${list.length} completed`;
  $("progressPercent").textContent = `${pct}%`;
  $("progressBar").style.width = `${pct}%`;
  $("taskList").querySelectorAll("[data-action]").forEach(el=>{
    el.addEventListener("click",()=>handleTaskAction(el.dataset.action,el.dataset.id));
  });
}

function taskHTML(t){
  const time = t.time ? `⏰ ${escapeHTML(formatTime(t.time))}` : "No time";
  return `<article class="task-item ${t.completed?"completed":""}">
    <button type="button" class="check ${t.completed?"done":""}" data-action="toggle" data-id="${t.id}" aria-label="${t.completed?"Mark pending":"Mark complete"}">${t.completed?"✓":""}</button>
    <div>
      <div class="task-title">${escapeHTML(t.title)}</div>
      <div class="task-meta">
        <span class="pill">${time}</span>
        <span class="pill ${escapeHTML(t.priority)}">${escapeHTML(t.priority[0].toUpperCase()+t.priority.slice(1))}</span>
        <span class="pill">${escapeHTML(t.category)}</span>
        ${t.reminder && t.time ? '<span class="pill">Reminder</span>' : ''}
      </div>
      ${t.notes ? `<p class="task-notes">${escapeHTML(t.notes)}</p>` : ""}
    </div>
    <div class="task-actions">
      <button type="button" class="small-btn" data-action="edit" data-id="${t.id}">Edit</button>
      <button type="button" class="small-btn delete" data-action="delete" data-id="${t.id}">Delete</button>
    </div>
  </article>`;
}
function formatTime(t){
  const [h,m]=t.split(":").map(Number);
  const d=new Date(); d.setHours(h,m);
  return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
}

function handleTaskAction(action,id){
  const list = tasksFor(state.selectedDate);
  const idx = list.findIndex(t=>String(t.id)===String(id));
  if(idx<0) return;
  if(action==="toggle"){
    list[idx].completed=!list[idx].completed;
    saveTasks(); render();
    showToast(list[idx].completed ? "Task completed ✓" : "Task marked pending");
  } else if(action==="edit") openModal(list[idx]);
  else if(action==="delete"){
    if(confirm("Delete this task?")){
      list.splice(idx,1);
      if(!list.length) delete state.tasks[state.selectedDate];
      saveTasks(); render(); showToast("Task deleted");
    }
  }
}

function openModal(task=null){
  state.editingId = task ? task.id : null;
  $("modalTitle").textContent = task ? "Edit Task" : "Add Task";
  $("taskId").value = task?.id || "";
  $("taskTitle").value = task?.title || "";
  $("taskDate").value = task?.date || state.selectedDate;
  $("taskTime").value = task?.time || "";
  $("taskPriority").value = task?.priority || "medium";
  $("taskCategory").value = task?.category || "Personal";
  $("taskNotes").value = task?.notes || "";
  $("taskReminder").checked = Boolean(task?.reminder);
  $("modalBackdrop").classList.remove("hidden");
  setTimeout(()=>$("taskTitle").focus(),50);
}
function closeModal(){
  $("modalBackdrop").classList.add("hidden");
  state.editingId=null;
}
function saveTaskFromForm(e){
  e.preventDefault();
  const title=$("taskTitle").value.trim();
  const date=$("taskDate").value;
  if(!title || !date){ showToast("Please enter a title and date"); return; }
  const task = {
    id: state.editingId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title, date, time:$("taskTime").value,
    priority:$("taskPriority").value, category:$("taskCategory").value,
    notes:$("taskNotes").value.trim(), reminder:$("taskReminder").checked,
    completed:false, createdAt:Date.now()
  };
  if(state.editingId){
    let oldDate = null, oldTask=null;
    for(const [key,arr] of Object.entries(state.tasks)){
      const found=arr.find(t=>String(t.id)===String(state.editingId));
      if(found){oldDate=key;oldTask=found;break;}
    }
    if(oldTask){
      task.completed=oldTask.completed;
      task.createdAt=oldTask.createdAt;
      state.tasks[oldDate]=state.tasks[oldDate].filter(t=>String(t.id)!==String(state.editingId));
      if(!state.tasks[oldDate].length) delete state.tasks[oldDate];
    }
  }
  if(!state.tasks[date]) state.tasks[date]=[];
  state.tasks[date].push(task);
  state.selectedDate=date;
  const d=parseDateKey(date); state.viewDate=new Date(d.getFullYear(),d.getMonth(),1);
  saveTasks(); closeModal(); render(); showToast(state.editingId?"Task updated":"Task added");
}
function renderUpcoming(){
  const today = parseDateKey(todayKey());
  const items=[];
  for(const t of allTasks()){
    if(t.completed) continue;
    const d=parseDateKey(t.date);
    if(d>=today) items.push(t);
  }
  items.sort((a,b)=> (a.date+b.time).localeCompare(b.date+b.time));
  const top=items.slice(0,6);
  $("upcomingList").innerHTML=top.length ? top.map(t=>`<button type="button" class="upcoming-item" data-upcoming="${t.id}">
    <div class="upcoming-date">${escapeHTML(formatDate(t.date,{month:"short",day:"numeric",year:"numeric"}))}${t.time?` · ${escapeHTML(formatTime(t.time))}`:""}</div>
    <h3>${escapeHTML(t.title)}</h3><p>${escapeHTML(t.category)} · ${escapeHTML(t.priority)} priority</p>
  </button>`).join("") : '<div class="empty-small">No upcoming pending tasks.</div>';
  $("upcomingList").querySelectorAll("[data-upcoming]").forEach(el=>el.addEventListener("click",()=>{
    const t=allTasks().find(x=>String(x.id)===String(el.dataset.upcoming));
    if(t){state.selectedDate=t.date;const d=parseDateKey(t.date);state.viewDate=new Date(d.getFullYear(),d.getMonth(),1);render();}
  }));
}

function showToast(msg){
  const el=$("toast");el.textContent=msg;el.classList.add("show");
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove("show"),2200);
}
function applyTheme(){
  const dark=localStorage.getItem(THEME_KEY)==="dark";
  document.body.classList.toggle("dark",dark);
  $("themeBtn").textContent=dark?"☀":"☾";
}
function exportData(){
  const blob=new Blob([JSON.stringify(state.tasks,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`dailytask-backup-${todayKey()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
  showToast("Backup exported");
}
function importData(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data || typeof data!=="object" || Array.isArray(data)) throw new Error();
      let count=0;
      for(const [date,arr] of Object.entries(data)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(arr)) continue;
        state.tasks[date]=arr.map(t=>({...t,date})); count+=arr.length;
      }
      saveTasks();render();showToast(`${count} task${count===1?"":"s"} imported`);
    }catch{showToast("Invalid backup file");}
  };
  reader.readAsText(file);
}

$("addTaskBtn").addEventListener("click",()=>openModal());
$("emptyAddBtn").addEventListener("click",()=>openModal());
$("closeModal").addEventListener("click",closeModal);
$("cancelModal").addEventListener("click",closeModal);
$("taskForm").addEventListener("submit",saveTaskFromForm);
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal()});
$("prevMonth").addEventListener("click",()=>{state.viewDate.setMonth(state.viewDate.getMonth()-1);renderCalendar()});
$("nextMonth").addEventListener("click",()=>{state.viewDate.setMonth(state.viewDate.getMonth()+1);renderCalendar()});
$("todayBtn").addEventListener("click",()=>{state.selectedDate=todayKey();const d=new Date();state.viewDate=new Date(d.getFullYear(),d.getMonth(),1);render()});
$("searchInput").addEventListener("input",renderTasks);
$("filterSelect").addEventListener("change",renderTasks);
$("sortSelect").addEventListener("change",renderTasks);
$("themeBtn").addEventListener("click",()=>{localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"light":"dark");applyTheme()});
$("clearCompletedBtn").addEventListener("click",()=>{
  const list=tasksFor(state.selectedDate);const before=list.length;
  state.tasks[state.selectedDate]=list.filter(t=>!t.completed);
  if(!state.tasks[state.selectedDate].length) delete state.tasks[state.selectedDate];
  saveTasks();render();showToast(`${before-list.length} completed task${before-list.length===1?"":"s"} cleared`);
});
$("enableNotificationsBtn").addEventListener("click",enableNotifications);
$("testAlarmBtn").addEventListener("click",testAlarm);
$("exportBtn").addEventListener("click",exportData);
$("importInput").addEventListener("change",e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""});
$("allTasksBtn").addEventListener("click",()=>{
  $("searchInput").value="";$("filterSelect").value="all";$("sortSelect").value="created";
  state.selectedDate=todayKey();const d=new Date();state.viewDate=new Date(d.getFullYear(),d.getMonth(),1);render();
});

applyTheme();
renderAlarmStatus();
render();
startAlarmChecker();
