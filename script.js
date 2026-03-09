const config = {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#00fbff', '#ff0055'],
    shapes: ['circle', 'square', 'rect', 'rhombus', 'triangle', 'star'],
    mode: 'none',
    particles: [], targets: [], bodies: [],
    mouseX: 0, mouseY: 0, isMouseDown: false,
    alphabet: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    currentLetters: [], activeIndex: 0, isFinished: false,
    startTime: 0, endTime: 0, errorCount: 0, shake: 0,
    bestTime: localStorage.getItem('alphaRecord') || Infinity
};

const canvas = document.querySelector('canvas') || document.createElement('canvas');
if (!canvas.parentElement) document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const launcher = document.getElementById('physics-launcher');

const alphaBox = document.createElement('div');
alphaBox.className = 'alphabet-controls';
document.body.appendChild(alphaBox);

const timerEl = document.createElement('div');
timerEl.style.cssText = "position:fixed; top:20px; right:20px; font-size:2rem; color:#00fbff; font-weight:bold; text-shadow:0 0 10px #00fbff; display:none; z-index:1000;";
document.body.appendChild(timerEl);

const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', resize);
resize();

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
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'ru-RU';
    window.speechSynthesis.speak(msg);
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
    } else if (shape === 'rhombus') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y); ctx.lineTo(x, y+s); ctx.lineTo(x-s, y); }
    else if (shape === 'triangle') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y+s); ctx.lineTo(x-s, y+s); }
    else if (shape === 'rect') ctx.rect(x - s*1.5, y - s/2, s*3, s);
    else ctx.rect(x - s, y - s, s*2, s*2);
    ctx.fill(); ctx.closePath(); ctx.globalAlpha = 1;
}

function setMode(newMode) {
    config.mode = newMode; config.bodies = []; config.particles = []; config.targets = [];
    alphaBox.style.display = 'none'; timerEl.style.display = 'none';
    if (launcher) launcher.style.display = (newMode === 'physics') ? 'block' : 'none';
    document.body.className = 'mode-' + newMode;
    document.getElementById('welcome-screen').style.display = (newMode === 'none') ? 'flex' : 'none';
    
    if (newMode !== 'none' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    if (newMode === 'alphabet') initAlphabet(false);
    if (newMode === 'pop') for(let i=0; i<5; i++) addPopTarget();
    document.getElementById('menu').classList.remove('active');
}

function initAlphabet(shuffle = false) {
    config.currentLetters = [...config.alphabet];
    if (shuffle) config.currentLetters.sort(() => Math.random() - 0.5);
    config.activeIndex = 0; config.isFinished = false; config.errorCount = 0; config.shake = 0;
    config.startTime = Date.now(); alphaBox.style.display = 'none'; timerEl.style.display = 'block';
}

function celebrate(isRecord) {
    const notes = isRecord ? [523, 659, 783, 1046] : [523, 659, 783];
    notes.forEach((n, i) => setTimeout(() => playSfx(n, 'sine', 0.2, 0.5), i * 150));
    for(let i = 0; i < (isRecord ? 120 : 50); i++) {
        config.bodies.push({ x: Math.random()*canvas.width, y: canvas.height+50, vx: (Math.random()-0.5)*15, vy: -Math.random()*20-10, size: 20, color: config.colors[Math.floor(Math.random()*9)], shape: config.shapes[Math.floor(Math.random()*6)], op: 1, exp: true });
    }
}

function addPopTarget() {
    config.targets.push({ x: Math.random()*(canvas.width-100)+50, y: Math.random()*(canvas.height-100)+50, size: 30, color: config.colors[Math.floor(Math.random()*9)], shape: config.shapes[Math.floor(Math.random()*6)] });
}

function draw() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (config.mode === 'alphabet') {
        const timeNow = config.isFinished ? config.endTime : Date.now();
        timerEl.innerText = ((timeNow - config.startTime) / 1000).toFixed(1) + " сек";
        const cols = 6, gap = 100, size = 80;
        const startX = (canvas.width - (cols - 1) * gap) / 2;
        const startY = 120;

                config.currentLetters.forEach((char, i) => {
            let x = startX + (i % cols) * gap, y = startY + Math.floor(i / cols) * gap;
            let isAct = (i === config.activeIndex);
            
            // Логика цвета: если есть тряска — красный, иначе — бирюзовый
            let currentColor = (isAct && config.shake > 0.1) ? "#f00" : "#0ff";

            if (isAct && config.shake > 0.1) { 
                x += (Math.random()-0.5) * config.shake; 
                y += (Math.random()-0.5) * config.shake; 
                config.shake *= 0.9; // Гасим тряску
            } else if (isAct) {
                config.shake = 0; // Принудительно обнуляем, если тряска затухла
            }

            ctx.lineWidth = 3; 
            ctx.beginPath(); 
            ctx.roundRect(x - size/2, y - size/2, size, size, 15);
            
            ctx.shadowBlur = isAct ? 20 : 0; 
            ctx.shadowColor = currentColor;
            ctx.strokeStyle = isAct ? currentColor : (i < config.activeIndex ? "#222" : "#555");
            ctx.stroke(); 
            
            ctx.fillStyle = isAct ? currentColor : (i < config.activeIndex ? "#333" : "#fff");
            ctx.font = "bold 40px 'Segoe UI'"; 
            ctx.textAlign = "center"; 
            ctx.textBaseline = "middle"; 
            ctx.fillText(char, x, y); 
            ctx.shadowBlur = 0;
        });

    }

    for (let i = config.bodies.length - 1; i >= 0; i--) {
        let b = config.bodies[i];
        if (config.mode === 'physics' || b.exp) {
            if (!b.exp) b.vy += 0.5; else b.op -= 0.02;
            b.x += b.vx; b.y += b.vy;
            if (b.y + b.size > canvas.height && !b.exp) { b.y = canvas.height - b.size; b.vy *= -0.3; b.vx *= 0.8; }
        } else if (config.mode === 'symphony') b.op -= 0.015;
        drawObject(b.x, b.y, b.size, b.color, b.shape, b.op);
        if (b.op <= 0) config.bodies.splice(i, 1);
    }

    if (config.mode === 'chaos') {
        if (config.isMouseDown) config.particles.push({ x: config.mouseX, y: config.mouseY, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, age: 1, color: config.colors[Math.floor(Math.random()*9)], shape: config.shapes[Math.floor(Math.random()*6)] });
        for (let i = config.particles.length - 1; i >= 0; i--) {
            let p = config.particles[i]; p.x += p.vx; p.y += p.vy; p.age -= 0.02;
            drawObject(p.x, p.y, 6, p.color, p.shape, p.age);
            if (p.age <= 0) config.particles.splice(i, 1);
        }
    }

    if (config.mode === 'pop') config.targets.forEach(t => drawObject(t.x, t.y, t.size, t.color, t.shape));
    requestAnimationFrame(draw);
}
draw();

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (document.fullscreenElement) document.exitFullscreen(); setMode('none'); return; }
    if (config.mode === 'none') return;

    if (config.mode === 'alphabet' && !config.isFinished) {
        const target = config.currentLetters[config.activeIndex].toLowerCase();
        const pressed = e.key.toLowerCase();
        if (pressed === target || (e.code === 'Key'+target.toUpperCase()) || (target === 'ё' && pressed === '`')) {
            speak(config.currentLetters[config.activeIndex]);
            const x = ((canvas.width - 500) / 2) + (config.activeIndex % 6) * 100;
            const y = 120 + Math.floor(config.activeIndex / 6) * 100;
            for(let i=0; i<8; i++) config.bodies.push({ x, y, vx:(Math.random()-0.5)*10, vy:(Math.random()-0.5)*10, size:8, color:"#FF0", shape:"star", op:1, exp:true });
            config.activeIndex++;
            if (config.activeIndex >= config.currentLetters.length) {
                config.isFinished = true; config.endTime = Date.now();
                const time = ((config.endTime - config.startTime) / 1000).toFixed(1);
                let isRec = (parseFloat(time) < parseFloat(config.bestTime));
                if (isRec) { config.bestTime = time; localStorage.setItem('alphaRecord', time); }
                celebrate(isRec);
                alphaBox.innerHTML = `<h2>${isRec?'🎉 РЕКОРД! 🎉':'МОЛОДЕЦ!'}</h2><p>Время: ${time}с</p><p style="color:#ff7f00">Ошибок: ${config.errorCount}</p><button class="alphabet-btn" onclick="initAlphabet(true)">ПЕРЕМЕШАТЬ 🎲</button><button class="alphabet-btn" onclick="initAlphabet(false)" style="margin-top:10px">ЗАНОВО 🔄</button>`;
                alphaBox.style.display = 'flex';
            }
        } else if (e.key.length === 1) { config.errorCount++; config.shake = 15; playSfx(150, 'sawtooth', 0.1, 0.1); }
        return;
    }

    const color = config.colors[Math.floor(Math.random()*9)];
    const shape = config.shapes[Math.floor(Math.random()*6)];
    if (config.mode === 'chaos') {
        playSfx(200, 'triangle', 0.05);
        for(let i=0; i<8; i++) config.particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, age: 1.5, color, shape });
    }
    if (config.mode === 'symphony') {
        const notes = [523, 587, 659, 783, 880]; playSfx(notes[Math.floor(Math.random()*5)], 'sine', 0.15, 0.7);
        config.bodies.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx:0, vy:0, size: 60, color, shape, op: 1 });
    }
    if (config.mode === 'physics') {
        if (e.code === 'Space') {
            playSfx(100, 'sine', 0.4, 0.8); document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 100);
            config.bodies.forEach(b => { const dx = b.x - config.mouseX, dy = b.y - config.mouseY; const dist = Math.sqrt(dx*dx+dy*dy)||1; b.vx += (dx/dist)*20; b.vy += (dy/dist)*20-5; b.exp = true; b.op = 1; });
        } else { playSfx(250, 'sine', 0.1, 0.2); config.bodies.push({ x: config.mouseX, y: config.mouseY, vx: (Math.random()-0.5)*8, vy:-4, size: 25, color, shape, op: 1, exp: false }); }
    }
});

document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setMode('none'); });
window.addEventListener('mousedown', (e) => { config.isMouseDown = true; if (config.mode === 'pop') { for (let i = config.targets.length - 1; i >= 0; i--) { let t = config.targets[i]; if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < t.size + 10) { playSfx(600, 'sine', 0.15, 0.1); config.targets.splice(i, 1); addPopTarget(); } } } });
window.addEventListener('mouseup', () => config.isMouseDown = false);
window.addEventListener('mousemove', (e) => { config.mouseX = e.clientX; config.mouseY = e.clientY; });
document.getElementById('menu-trigger').addEventListener('mousedown', (e) => { e.stopPropagation(); document.getElementById('menu').classList.toggle('active'); });
document.querySelectorAll('.item').forEach(el => el.addEventListener('mousedown', (e) => { e.stopPropagation(); setMode(el.getAttribute('data-mode')); }));
if (launcher) launcher.addEventListener('click', () => { launcher.style.display = 'none'; playSfx(300); });
