const config = {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#00fbff', '#ff0055'],
    shapes: ['circle', 'square', 'rect', 'rhombus', 'triangle', 'star', 'oval'],
    mode: 'none',
    particles: [], targets: [], bodies: [],
    mouseX: 0, mouseY: 0, isMouseDown: false,
    alphabet: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    currentLetters: [], activeIndex: 0, isFinished: false,
    startTime: 0, endTime: 0, errorCount: 0, shake: 0,
    user: JSON.parse(localStorage.getItem('mp_user')) || null,
    wantsRank: false, isShuffle: false, countdown: 0,
    quest: { shape: '', name: '', count: 0 },
    hiddenItems: [], snakeTrail: []
};

const SHAPE_NAMES = { 
    'star': 'Звездочка', 'circle': 'Круг', 'oval': 'Овал', 
    'square': 'Квадрат', 'triangle': 'Треугольник', 
    'rect': 'Прямоугольник', 'rhombus': 'Ромб' 
};

const DB = {
    getScores: () => JSON.parse(localStorage.getItem('mp_leaderboard')) || [],
    saveScore: (entry) => {
        let scores = DB.getScores();
        scores.push(entry);
        scores.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem('mp_leaderboard', JSON.stringify(scores.slice(0, 100)));
    }
};

const canvas = document.querySelector('canvas') || document.createElement('canvas');
if (!canvas.parentElement) document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const uiWindows = {
    rankChoice: document.createElement('div'),
    userConfirm: document.createElement('div'),
    auth: document.createElement('div'),
    alphaStart: document.createElement('div'),
    quest: document.createElement('div'),
    timer: document.createElement('div'),
    controls: document.createElement('div')
};

const baseWinStyle = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:11000; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:sans-serif; text-align:center;";
Object.keys(uiWindows).forEach(key => {
    uiWindows[key].style.cssText = baseWinStyle;
    if(key === 'timer') uiWindows[key].style.cssText = "position:fixed; top:20px; right:20px; font-size:2rem; color:#00fbff; font-weight:bold; display:none; z-index:1000;";
    if(key === 'quest') uiWindows[key].style.cssText = "position:fixed; top:15px; left:50%; transform:translateX(-50%); background:rgba(255,255,255,0.1); padding:12px 30px; border-radius:50px; color:white; display:none; z-index:1000; border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(10px); font-family:sans-serif; font-size:1.4rem;";
    document.body.appendChild(uiWindows[key]);
});

// Инициализация интерфейса
uiWindows.rankChoice.innerHTML = `<h2>Участвовать в рейтинге?</h2><div style="display:flex; gap:20px; margin:20px 0;"><button class="alphabet-btn" onclick="handleRankChoice(true)">ДА ✅</button><button class="alphabet-btn" onclick="handleRankChoice(false)">НЕТ ❌</button></div><div id="lb-container" style="width:340px; height:250px; overflow-y:auto; background:rgba(255,255,255,0.05); padding:15px; border-radius:15px; border:1px solid #444;"><h3 style="color:#00fbff;">ТОП 20</h3><div id="lb-list"></div></div>`;
uiWindows.userConfirm.innerHTML = `<h2 id="user-greet"></h2><p>Это ты?</p><div style="display:flex; gap:20px; margin-top:20px;"><button class="alphabet-btn" onclick="confirmUser(true)">ДА ✅</button><button class="alphabet-btn" onclick="confirmUser(false)">НЕТ 👤</button></div>`;
uiWindows.auth.innerHTML = `<h2>Как тебя зовут?</h2><input type="text" id="u-name" placeholder="Имя" style="margin:10px; padding:15px; border-radius:10px; width:250px;"><input type="number" id="u-age" placeholder="Возраст" style="margin:10px; padding:15px; border-radius:10px; width:250px;"><button class="alphabet-btn" onclick="saveUserAndNext()">ГОТОВО</button>`;
uiWindows.alphaStart.innerHTML = `<h2>Выбери режим</h2><div style="display:flex; gap:20px; margin-top:20px;"><button class="alphabet-btn" onclick="startAlphabetSequence(true)">🎲 МЕШАТЬ</button><button class="alphabet-btn" onclick="startAlphabetSequence(false)">📋 ПОРЯДОК</button></div>`;

const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', resize); resize();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSfx(freq, type = 'sine', vol = 0.1, dur = 0.2) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'ru-RU'; window.speechSynthesis.speak(msg);
    }
}

function drawObject(x, y, s, color, shape, op = 1) {
    if (op <= 0) return;
    ctx.globalAlpha = op; ctx.fillStyle = color; ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, s, 0, Math.PI*2);
    else if (shape === 'star') {
        for(let i=0; i<10; i++) {
            let r = (i%2===0) ? s : s/2;
            ctx.lineTo(x + r*Math.cos(i*Math.PI/5 - Math.PI/2), y + r*Math.sin(i*Math.PI/5 - Math.PI/2));
        }
    } else if (shape === 'triangle') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y+s); ctx.lineTo(x-s, y+s); }
    else if (shape === 'rect') ctx.rect(x - s*1.5, y - s/2, s*3, s);
    else if (shape === 'rhombus') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y); ctx.lineTo(x, y+s); ctx.lineTo(x-s, y); }
    else ctx.rect(x - s, y - s, s*2, s*2);
    ctx.fill(); ctx.closePath(); ctx.globalAlpha = 1;
}

function setMode(newMode) {
    config.mode = newMode;
    config.bodies = []; config.particles = []; config.targets = []; config.snakeTrail = []; config.countdown = 0;
    Object.values(uiWindows).forEach(win => win.style.display = 'none');
    document.getElementById('welcome-screen').style.display = (newMode === 'none') ? 'flex' : 'none';
    document.getElementById('menu').classList.remove('active');
    if (newMode !== 'none' && !document.fullscreenElement && !/iPhone/i.test(navigator.userAgent)) {
        document.documentElement.requestFullscreen().catch(()=>{});
    }
    if (newMode === 'alphabet') { updateLeaderboardUI(); uiWindows.rankChoice.style.display = 'flex'; }
    else if (newMode === 'pop') { for(let i=0; i<5; i++) addPopTarget(); }
    else if (newMode === 'flashlight') initQuest();
}

// ЛОГИКА СОБЫТИЙ (Универсальная для ПК и Смартфонов)
function handleAction(key, code) {
    if (config.mode === 'none') return;
    const color = config.colors[Math.floor(Math.random()*9)], shape = config.shapes[Math.floor(Math.random()*7)];

    if (config.mode === 'alphabet' && !config.isFinished && config.countdown === 0) {
        const target = config.currentLetters[config.activeIndex].toLowerCase();
        if (key.toLowerCase() === target || code === 'Key'+target.toUpperCase()) {
            config.activeIndex++;
            if (config.activeIndex >= config.currentLetters.length) {
                config.isFinished = true; config.endTime = Date.now();
                const time = ((config.endTime - config.startTime)/1000).toFixed(1);
                if (config.wantsRank && config.user) DB.saveScore({ name: config.user.name, age: config.user.age, time, mode: config.isShuffle ? 'random' : 'standard' });
                uiWindows.controls.innerHTML = `<h2>ФИНИШ!</h2><p>${time}с</p><button class="alphabet-btn" onclick="setMode('none')">В МЕНЮ 🏠</button>`;
                uiWindows.controls.style.display = 'flex';
            }
        } else if (key.length === 1) { config.errorCount++; config.shake = 15; playSfx(150, 'sawtooth'); }
    }
    if (config.mode === 'chaos') {
        for(let i=0; i<6; i++) config.particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx:(Math.random()-0.5)*3, vy:(Math.random()-0.5)*3, age:1.5, color, shape });
    }
    if (config.mode === 'symphony') {
        playSfx(440 + Math.random()*440);
        config.bodies.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx:0, vy:0, size: 60, color, shape, op: 1 });
    }
    if (config.mode === 'physics') {
        if (code === 'Space') {
            config.bodies.forEach(b => { const dx = b.x-config.mouseX, dy = b.y-config.mouseY; const d = Math.sqrt(dx*dx+dy*dy)||1; b.vx+=(dx/d)*20; b.vy+=(dy/d)*20-5; b.exp=true; b.op=1; });
        } else config.bodies.push({ x: config.mouseX, y: config.mouseY, vx: (Math.random()-0.5)*8, vy:-4, size: 25, color, shape, op: 1, exp: false });
    }
}

// ОБРАБОТКА ТАЧЕЙ И МЫШИ
function updatePtr(e) {
    const t = e.touches ? e.touches[0] : e;
    config.mouseX = t.clientX; config.mouseY = t.clientY;
}

const onDown = (e) => {
    config.isMouseDown = true; updatePtr(e);
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (config.mode === 'pop') {
        for (let i = config.targets.length - 1; i >= 0; i--) {
            let t = config.targets[i];
            if (Math.hypot(config.mouseX - t.x, config.mouseY - t.y) < t.size + 20) {
                playSfx(600); config.targets.splice(i, 1); addPopTarget();
            }
        }
    }
    // На мобилках клик по экрану в алфавите = нажатие нужной буквы
    if (config.mode === 'alphabet' && config.countdown === 0 && !config.isFinished) {
        handleAction(config.currentLetters[config.activeIndex], '');
    }
    if (config.mode === 'physics') handleAction('tap', '');
};

window.addEventListener('mousedown', onDown);
window.addEventListener('touchstart', (e) => { onDown(e); if(config.mode !== 'none') e.preventDefault(); }, {passive:false});
window.addEventListener('mousemove', updatePtr);
window.addEventListener('touchmove', (e) => { updatePtr(e); if(config.mode !== 'none') e.preventDefault(); }, {passive:false});
window.addEventListener('mouseup', () => config.isMouseDown = false);
window.addEventListener('touchend', () => config.isMouseDown = false);
window.addEventListener('keydown', (e) => handleAction(e.key, e.code));

// СИСТЕМНЫЕ ФУНКЦИИ
function handleRankChoice(wants) { config.wantsRank = wants; uiWindows.rankChoice.style.display = 'none'; if(wants && config.user) uiWindows.userConfirm.style.display='flex'; else if(wants) uiWindows.auth.style.display='flex'; else uiWindows.alphaStart.style.display='flex'; }
function confirmUser(isSame) { uiWindows.userConfirm.style.display = 'none'; if(!isSame) config.user = null; if(config.user) uiWindows.alphaStart.style.display='flex'; else uiWindows.auth.style.display='flex'; }
function saveUserAndNext() { const n = document.getElementById('u-name').value, a = document.getElementById('u-age').value; if(n&&a) { config.user = {name:n, age:a}; localStorage.setItem('mp_user', JSON.stringify(config.user)); uiWindows.auth.style.display='none'; uiWindows.alphaStart.style.display='flex'; } }
function startAlphabetSequence(shuffle) { config.isShuffle = shuffle; uiWindows.alphaStart.style.display = 'none'; config.countdown = 3; const cdInterval = setInterval(() => { if (config.countdown > 1) { config.countdown--; playSfx(440); } else { clearInterval(cdInterval); config.countdown = 0; initAlphabet(config.isShuffle); playSfx(880); } }, 800); }
function initAlphabet(shuffle) { config.currentLetters = [...config.alphabet]; if(shuffle) config.currentLetters.sort(()=>Math.random()-0.5); config.activeIndex=0; config.isFinished=false; config.errorCount=0; config.startTime=Date.now(); uiWindows.timer.style.display='block'; }
function initQuest() { const keys = Object.keys(SHAPE_NAMES); const t = keys[Math.floor(Math.random()*keys.length)]; config.quest = {shape:t, name:SHAPE_NAMES[t], count:3+Math.floor(Math.random()*2)}; config.hiddenItems = Array.from({length:12}, (_,i)=>({x:100+Math.random()*(canvas.width-200), y:120+Math.random()*(canvas.height-240), size:60, color:config.colors[Math.floor(Math.random()*9)], shape:(i<config.quest.count)?t:keys[Math.floor(Math.random()*keys.length)], found:false})); uiWindows.quest.style.display='block'; updateQuestUI(); }
function updateQuestUI() { uiWindows.quest.innerText = config.quest.count > 0 ? `Найди ${config.quest.count}: ${config.quest.name} 🔦` : "🎉 ГОТОВО!"; }
function updateLeaderboardUI() { const s = DB.getScores(); document.getElementById('lb-list').innerHTML = s.slice(0,20).map((x,i)=>`<div style="display:flex; justify-content:space-between; padding:5px 0;"><span>${i+1}. ${x.name}</span><span>${x.time}с</span></div>`).join('') || "Пусто"; }
function addPopTarget() { config.targets.push({ x: 50+Math.random()*(canvas.width-100), y: 50+Math.random()*(canvas.height-100), size: 30, color: config.colors[Math.floor(Math.random()*9)], shape: config.shapes[Math.floor(Math.random()*7)] }); }

function draw() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (config.countdown > 0) { ctx.fillStyle = "#00fbff"; ctx.font = "bold 150px sans-serif"; ctx.textAlign = "center"; ctx.fillText(config.countdown, canvas.width/2, canvas.height/2 + 50); }
    if (config.mode === 'alphabet' && config.countdown === 0) {
        const timeNow = config.isFinished ? config.endTime : Date.now();
        uiWindows.timer.innerText = ((timeNow - config.startTime) / 1000).toFixed(1) + "с";
        const cols = 8, gapX = 90, gapY = 85, startX = (canvas.width - (cols-1)*gapX)/2, startY = 140;
        config.currentLetters.forEach((char, i) => {
            let x = startX + (i % cols)*gapX, y = startY + Math.floor(i / cols)*gapY;
            let isAct = (i === config.activeIndex);
            if (isAct && config.shake > 0.1) { x += (Math.random()-0.5)*config.shake; y += (Math.random()-0.5)*config.shake; config.shake *= 0.9; }
            ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x-35, y-35, 70, 70, 10);
            ctx.strokeStyle = isAct ? "#0ff" : (i < config.activeIndex ? "#222" : "#444");
            ctx.stroke(); ctx.fillStyle = isAct ? "#0ff" : (i < config.activeIndex ? "#222" : "#fff");
            ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(char, x, y);
        });
    }
    if (config.mode === 'flashlight') {
        config.hiddenItems.forEach(item => {
            const dist = Math.hypot(config.mouseX - item.x, config.mouseY - item.y);
            if (dist < 150) {
                drawObject(item.x, item.y, item.size, item.color, item.shape, 1 - dist/150);
                if (dist < 40 && !item.found) {
                    item.found = true; speak(SHAPE_NAMES[item.shape]);
                    if (item.shape === config.quest.shape && config.quest.count > 0) { config.quest.count--; updateQuestUI(); if(config.quest.count === 0) setTimeout(initQuest, 2000); }
                }
            }
        });
        const grad = ctx.createRadialGradient(config.mouseX, config.mouseY, 0, config.mouseX, config.mouseY, 150);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(config.mouseX, config.mouseY, 150, 0, Math.PI*2); ctx.fill();
    }
    if (config.mode === 'snake') {
        config.snakeTrail.push({x: config.mouseX, y: config.mouseY}); if (config.snakeTrail.length > 20) config.snakeTrail.shift();
        config.snakeTrail.forEach((p, i) => drawObject(p.x, p.y, (i/20)*45, config.colors[i%9], 'circle', 0.8));
    }
    for (let i = config.bodies.length - 1; i >= 0; i--) {
        let b = config.bodies[i]; b.x += b.vx; b.y += b.vy; b.op -= 0.02;
        if (config.mode === 'physics' && !b.exp) b.vy += 0.5;
        drawObject(b.x, b.y, b.size, b.color, b.shape, b.op);
        if (b.op <= 0) config.bodies.splice(i, 1);
    }
    if (config.mode === 'chaos') {
        if (config.isMouseDown) handleAction('','');
        for (let i = config.particles.length - 1; i >= 0; i--) {
            let p = config.particles[i]; p.x += p.vx; p.y += p.vy; p.age -= 0.02;
            drawObject(p.x, p.y, 6, p.color, p.shape, p.age);
            if (p.age <= 0) config.particles.splice(i, 1);
        }
    }
    if (config.mode === 'pop') config.targets.forEach(t => drawObject(t.x, t.y, t.size, t.color, t.shape));
    requestAnimationFrame(draw);
}

// Привязка меню
document.getElementById('menu-trigger').onclick = (e) => { e.stopPropagation(); document.getElementById('menu').classList.toggle('active'); };
document.querySelectorAll('.item').forEach(el => el.onclick = (e) => { e.stopPropagation(); setMode(el.getAttribute('data-mode')); });

draw();
