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

const SHAPE_NAMES = { 'star': 'Звездочка', 'circle': 'Круг', 'oval': 'Овал', 'square': 'Квадрат', 'triangle': 'Треугольник', 'rect': 'Прямоугольник', 'rhombus': 'Ромб' };

const DB = {
    getScores: () => JSON.parse(localStorage.getItem('mp_leaderboard')) || [],
    saveScore: (entry) => {
        let scores = DB.getScores(); scores.push(entry);
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

// Исправленный z-index: 10000 для окон, меню должно быть 20000 в CSS
const baseWinStyle = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:10000; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:sans-serif; text-align:center;";
Object.keys(uiWindows).forEach(key => {
    uiWindows[key].style.cssText = baseWinStyle;
    if(key === 'timer') uiWindows[key].style.cssText = "position:fixed; top:20px; right:20px; font-size:2rem; color:#00fbff; font-weight:bold; display:none; z-index:5000;";
    if(key === 'quest') uiWindows[key].style.cssText = "position:fixed; top:15px; left:50%; transform:translateX(-50%); background:rgba(255,255,255,0.1); padding:12px 30px; border-radius:50px; color:white; display:none; z-index:5000; border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(10px); font-family:sans-serif; font-size:1.4rem;";
    document.body.appendChild(uiWindows[key]);
});

uiWindows.rankChoice.innerHTML = `<h2>Рейтинг?</h2><div style="display:flex; gap:20px; margin:20px 0;"><button class="alphabet-btn" onclick="handleRankChoice(true)">ДА</button><button class="alphabet-btn" onclick="handleRankChoice(false)">НЕТ</button></div>`;
uiWindows.alphaStart.innerHTML = `<h2>Режим</h2><div style="display:flex; gap:20px;"><button class="alphabet-btn" onclick="startAlphabetSequence(true)">МЕШАТЬ</button><button class="alphabet-btn" onclick="startAlphabetSequence(false)">ПОРЯДОК</button></div>`;

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

function drawObject(x, y, s, color, shape, op = 1) {
    if (op <= 0) return; ctx.globalAlpha = op; ctx.fillStyle = color; ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, s, 0, Math.PI*2);
    else if (shape === 'star') { for(let i=0; i<10; i++) { let r = (i%2===0)?s:s/2; ctx.lineTo(x + r*Math.cos(i*Math.PI/5 - Math.PI/2), y + r*Math.sin(i*Math.PI/5 - Math.PI/2)); } }
    else if (shape === 'triangle') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y+s); ctx.lineTo(x-s, y+s); }
    else if (shape === 'rect') ctx.rect(x-s*1.5, y-s/2, s*3, s);
    else ctx.rect(x-s, y-s, s*2, s*2);
    ctx.fill(); ctx.closePath(); ctx.globalAlpha = 1;
}

function setMode(newMode) {
    config.mode = newMode;
    config.bodies = []; config.particles = []; config.targets = []; config.countdown = 0;
    Object.values(uiWindows).forEach(win => win.style.display = 'none');
    document.getElementById('welcome-screen').style.display = (newMode === 'none') ? 'flex' : 'none';
    document.getElementById('menu').classList.remove('active');
    if (newMode === 'alphabet') uiWindows.rankChoice.style.display = 'flex';
    else if (newMode === 'pop') { for(let i=0; i<5; i++) addPopTarget(); }
}

// ГЛОБАЛЬНАЯ ЛОГИКА ДЕЙСТВИЯ
function handleAction(key, code, isTouch = false) {
    if (config.mode === 'none' || config.countdown > 0) return;
    const color = config.colors[Math.floor(Math.random()*9)], shape = config.shapes[Math.floor(Math.random()*7)];

    if (config.mode === 'alphabet' && !config.isFinished) {
        const target = config.currentLetters[config.activeIndex].toLowerCase();
        if (isTouch || (key && key.toLowerCase() === target) || code === 'Key'+target.toUpperCase()) {
            config.activeIndex++; playSfx(600);
            if (config.activeIndex >= config.currentLetters.length) {
                config.isFinished = true; config.endTime = Date.now();
                uiWindows.controls.innerHTML = `<h2>ФИНИШ!</h2><button class="alphabet-btn" onclick="setMode('none')">В МЕНЮ</button>`;
                uiWindows.controls.style.display = 'flex';
            }
        } else if (key && key.length === 1) { config.shake = 15; playSfx(150, 'sawtooth'); }
    }
    if (config.mode === 'chaos') {
        for(let i=0; i<5; i++) config.particles.push({x: random(0,width), y: random(0,height), vx:random(-3,3), vy:random(-3,3), age:1, color, shape});
    }
    if (config.mode === 'symphony') {
        playSfx(random(400, 800));
        config.bodies.push({ x: random(50, canvas.width-50), y: random(50, canvas.height-50), vx:0, vy:0, size: 40, color, shape, op: 1 });
    }
    if (config.mode === 'physics') {
        config.bodies.push({ x: config.mouseX, y: config.mouseY, vx: random(-4,4), vy:-6, size: 25, color, shape, op: 1 });
    }
}

// СОБЫТИЯ ВВОДА
const updateCoords = (e) => {
    const t = e.touches ? e.touches[0] : e;
    config.mouseX = t.clientX; config.mouseY = t.clientY;
};

const inputStart = (e) => {
    // Если нажали на меню или UI — не запускаем игру
    if (e.target.closest('#menu') || e.target.closest('#menu-trigger') || e.target.closest('.alphabet-btn') || e.target.closest('.item')) return;
    
    config.isMouseDown = true; updateCoords(e);
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (config.mode === 'pop') {
        for (let i = config.targets.length-1; i>=0; i--) {
            let t = config.targets[i];
            if (Math.hypot(config.mouseX - t.x, config.mouseY - t.y) < t.size + 20) { config.targets.splice(i,1); playSfx(800); addPopTarget(); }
        }
    }
    handleAction('', '', e.touches ? true : false);
};

window.addEventListener('mousedown', inputStart);
window.addEventListener('touchstart', (e) => { inputStart(e); if(config.mode!=='none') e.preventDefault(); }, {passive:false});
window.addEventListener('mousemove', updateCoords);
window.addEventListener('touchmove', (e) => { updateCoords(e); if(config.mode!=='none') e.preventDefault(); }, {passive:false});
window.addEventListener('mouseup', () => config.isMouseDown = false);
window.addEventListener('touchend', () => config.isMouseDown = false);
window.addEventListener('keydown', (e) => { if(e.key==='Escape') setMode('none'); else handleAction(e.key, e.code); });

// ВСПОМОГАТЕЛЬНЫЕ
const random = (min, max) => Math.random() * (max - min) + min;
function handleRankChoice(wants) { uiWindows.rankChoice.style.display = 'none'; uiWindows.alphaStart.style.display = 'flex'; }
function startAlphabetSequence(s) { 
    uiWindows.alphaStart.style.display='none'; config.countdown=3; 
    let int = setInterval(() => { if(config.countdown>1){ config.countdown--; playSfx(400); } else { clearInterval(int); config.countdown=0; initAlphabet(s); } }, 800);
}
function initAlphabet(s) { config.currentLetters=[...config.alphabet]; if(s) config.currentLetters.sort(()=>Math.random()-0.5); config.activeIndex=0; config.isFinished=false; config.startTime=Date.now(); uiWindows.timer.style.display='block'; }
function addPopTarget() { config.targets.push({ x: random(50,canvas.width-50), y: random(50,canvas.height-50), size: 40, color: config.colors[Math.floor(Math.random()*9)], shape: 'circle' }); }

function draw() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (config.countdown > 0) { ctx.fillStyle = "#0ff"; ctx.font = "bold 120px sans-serif"; ctx.textAlign = "center"; ctx.fillText(config.countdown, canvas.width/2, canvas.height/2+40); }
    if (config.mode === 'alphabet' && config.countdown === 0) {
        uiWindows.timer.innerText = (((config.isFinished?config.endTime:Date.now())-config.startTime)/1000).toFixed(1)+"с";
        const cols = 8, gap = canvas.width > 600 ? 80 : 45, startX = (canvas.width - (cols-1)*gap)/2;
        config.currentLetters.forEach((char, i) => {
            let x = startX + (i%cols)*gap, y = 140 + Math.floor(i/cols)*gap;
            ctx.strokeStyle = (i===config.activeIndex)?"#0ff":"#333";
            ctx.strokeRect(x-gap/2.5, y-gap/2.5, gap/1.2, gap/1.2);
            ctx.fillStyle = (i===config.activeIndex)?"#0ff":(i<config.activeIndex?"#222":"#fff");
            ctx.font = (gap/2.5) + "px sans-serif"; ctx.textAlign="center"; ctx.fillText(char, x, y + gap/8);
        });
    }
    // Рендеринг тел (Физика / Симфония)
    config.bodies.forEach((b, i) => { 
        b.x+=b.vx; b.y+=b.vy; b.op-=0.015; if(config.mode==='physics') b.vy+=0.3;
        drawObject(b.x, b.y, 30, b.color, b.shape, b.op); if(b.op<=0) config.bodies.splice(i,1); 
    });
    if (config.mode === 'chaos') {
        if(config.isMouseDown) handleAction('','',true);
        config.particles.forEach((p, i) => { p.x+=p.vx; p.y+=p.vy; p.age-=0.02; drawObject(p.x, p.y, 6, p.color, p.shape, p.age); if(p.age<=0) config.particles.splice(i,1); });
    }
    if (config.mode === 'pop') config.targets.forEach(t => drawObject(t.x, t.y, t.size, t.color, 'circle'));
    requestAnimationFrame(draw);
}

// ПРИВЯЗКА МЕНЮ
document.getElementById('menu-trigger').onclick = (e) => { 
    e.preventDefault(); e.stopPropagation(); 
    document.getElementById('menu').classList.toggle('active'); 
};
document.querySelectorAll('.item').forEach(el => {
    el.onclick = (e) => { 
        e.preventDefault(); e.stopPropagation(); 
        setMode(el.getAttribute('data-mode')); 
    };
});

draw();
