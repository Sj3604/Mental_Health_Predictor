const API = 'http://localhost:2200';
const $ = id => document.getElementById(id);
const sliders = ['usage','study','sleep','activity'];
const setSlider = id => { $(id+'_o').textContent = $(id).value + ' h'; };
sliders.forEach(id => { $(id).addEventListener('input', () => setSlider(id)); setSlider(id); });

// API status check
fetch(API + '/openapi.json').then(r => {
  if(!r.ok) throw 0;
  $('status').className = 'status on'; $('statusText').textContent = 'API online';
}).catch(() => { $('status').className = 'status off'; $('statusText').textContent = 'API offline'; });

// sample profiles
const profiles = {
  balanced:{age:21,gender:'Female',country:'India',academic:'Undergraduate',platform:'Instagram',purpose:'Networking',usage:3,unlocks:40,study:5,sleep:7.5,activity:1.5,stress:'Low'},
  heavy:{age:19,gender:'Male',country:'USA',academic:'Undergraduate',platform:'TikTok',purpose:'Entertainment',usage:8.5,unlocks:130,study:2,sleep:5,activity:0,stress:'Very High'},
  focused:{age:24,gender:'Female',country:'Germany',academic:'Graduate',platform:'LinkedIn',purpose:'Education',usage:2,unlocks:25,study:7,sleep:7,activity:2,stress:'Medium'}
};
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  const p = profiles[c.dataset.p];
  ['age','country','academic','platform','purpose','unlocks'].forEach(k => $(k).value = p[k]);
  sliders.forEach(k => { $(k).value = p[k]; setSlider(k); });
  document.querySelector(`input[name=gender][value="${p.gender}"]`).checked = true;
  document.querySelector(`input[name=stress][value="${p.stress}"]`).checked = true;
  $('form').requestSubmit();
}));

const bands = [
  {max:5,   name:'Needs attention', color:'#ff5d8f', text:'The model expects lower wellbeing for this profile.'},
  {max:6.5, name:'Moderate',        color:'#e59a1f', text:'A mixed picture. Sleep, activity and screen time all play a part.'},
  {max:8,   name:'Good',            color:'#19b98b', text:'This profile points to healthy wellbeing.'},
  {max:11,  name:'Strong',          color:'#19b98b', text:'This profile points to very strong wellbeing.'}
];

function insights(d){
  const out = [], G='#22d3c5', W='#ffb547', R='#ff5d8f';
  if(d.sleep_hours_per_night < 6) out.push([R,`Sleep is short at ${d.sleep_hours_per_night} h a night.`]);
  else if(d.sleep_hours_per_night >= 7) out.push([G,`Sleep of ${d.sleep_hours_per_night} h is in a healthy range.`]);
  if(d.avg_daily_usage_hours >= 6) out.push([R,`${d.avg_daily_usage_hours} h of daily social media is high.`]);
  else if(d.avg_daily_usage_hours <= 3) out.push([G,`Moderate use at ${d.avg_daily_usage_hours} h a day.`]);
  if(d.daily_unlocks > 100) out.push([W,`${d.daily_unlocks} unlocks a day suggests frequent checking.`]);
  if(d.physical_activity_hours < 0.5) out.push([W,'Very little physical activity.']);
  else if(d.physical_activity_hours >= 1) out.push([G,'Regular physical activity.']);
  if(d.stress_level === 'High' || d.stress_level === 'Very High') out.push([R,`Stress is reported as ${d.stress_level.toLowerCase()}.`]);
  else if(d.stress_level === 'Low') out.push([G,'Stress is reported as low.']);
  return out.slice(0,4);
}

function showResult(v, d){
  const b = bands.find(x => v < x.max);
  $('result').classList.remove('empty');
  $('arc').style.strokeDashoffset = 503 * (1 - Math.max(0, Math.min(1, v/10)));
  $('band').textContent = b.name; $('band').style.background = b.color;
  $('msg').textContent = b.text;
  const items = insights(d);
  $('list').innerHTML = '';
  items.forEach(([c,t]) => { const li = document.createElement('li'); li.style.setProperty('--c', c); li.textContent = t; $('list').appendChild(li); });
  $('insights').classList.toggle('show', items.length > 0);
  const t0 = performance.now();
  (function tick(t){ const p = Math.min(1,(t-t0)/900); $('score').textContent = (v*p).toFixed(2); if(p<1) requestAnimationFrame(tick); })(t0);
  if(window.innerWidth <= 920) $('result').scrollIntoView({behavior:'smooth',block:'center'});
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('error'); err.classList.remove('show');
  const d = {
    age: parseInt($('age').value,10),
    gender: document.querySelector('input[name=gender]:checked').value,
    country: $('country').value.trim(),
    academic_level: $('academic').value,
    most_used_platform: $('platform').value,
    purpose_of_use: $('purpose').value,
    avg_daily_usage_hours: parseFloat($('usage').value),
    daily_unlocks: parseInt($('unlocks').value,10),
    study_hours: parseFloat($('study').value),
    physical_activity_hours: parseFloat($('activity').value),
    sleep_hours_per_night: parseFloat($('sleep').value),
    stress_level: document.querySelector('input[name=stress]:checked').value
  };
  if(!d.country || isNaN(d.age) || isNaN(d.daily_unlocks)){
    err.textContent = 'Enter age, country and phone unlocks before predicting.'; err.classList.add('show'); return;
  }
  const btn = $('btn'); btn.disabled = true; btn.textContent = 'Predicting…';
  try{
    const res = await fetch(API + '/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    if(!res.ok){
      let msg = 'The server rejected the request (' + res.status + ').';
      try{ const j = await res.json(); if(Array.isArray(j.detail)) msg = j.detail.map(x => x.loc.slice(1).join('.') + ': ' + x.msg).join(' | '); }catch(_){}
      throw new Error(msg);
    }
    const data = await res.json();
    $('status').className = 'status on'; $('statusText').textContent = 'API online';
    showResult(data.predicted_mental_health_score, d);
  }catch(ex){
    err.textContent = ex instanceof TypeError ? 'Could not reach the API at ' + API + '. Start the FastAPI server on port 2200 and try again.' : ex.message;
    err.classList.add('show');
    if(ex instanceof TypeError){ $('status').className = 'status off'; $('statusText').textContent = 'API offline'; }
  }finally{
    btn.disabled = false; btn.textContent = 'Predict mental health score';
  }
});
