const config = {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#00fbff', '#ff0055'],
    shapes: ['circle', 'square', 'rect', 'rhombus', 'triangle', 'star', 'oval'],
    mode: 'none', device: '',
    particles: [], targets: [], bodies: [], snakeTrail: [], hiddenItems: [],
    mouseX: 0, mouseY: 0, isMouseDown: false,
    alphabet: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    currentLetters: [], activeIndex: 0, isFinished: false,
    startTime: 0, endTime: 0, errorCount: 0, shake: 0, countdown: 0
};

const SHAPE_NAMES = { 'star':'Звездочка', 'circle':'Круг', 'oval':'Овал', 'square':'Квадрат', 'triangle':'Треугольник', 'rect':'Прямоугольник', 'rhombus':'Ромб' };

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const menuList = {
    pc: [{id:'chaos', n:'🌌 Космос'}, {id:'pop', n:'💥 Хлопушки'}, {id:'snake', n:'🐍 Гусеница'}, {id:'physics', n:'🏔️ Лавина'}, {id:'symphony', n:'🎹 Симфония'}, {id:'alphabet', n:'🅰️ Алфавит'}, {id:'flashlight', n:'🔦 Фонарик'}],
    mobile: [{id:'alphabet', n:'🅰️ Алфавит'}, {id:'pop', n:'💥 Хлопушки'}, {id:'physics', n:'⚽ Мячики'}, {id:'chaos', n:'🌌 Космос'}]
};

// Инициализация
window.initApp = function(type) {
    config.device = type;
    document.getElementById('version-selector').style.display = 'none';
    const container = document.getElementById('menu-list');
    menuList[type].forEach(g => {
        let d = document.createElement('div'); d.className = 'item'; d.innerText = g.n;
        d.onclick = () => setMode(g.id); container.appendChild(d);
    });
};

function setMode(m) {
    config.mode = m;
    config.bodies = []; config.particles = []; config.targets = []; config.snakeTrail = []; config.countdown = 0;
    document.getElementById('menu').classList.remove('active');
    document.getElementById('welcome-screen').style.display = (m === 'none') ? 'flex' : 'none';
    if (m === 'alphabet') startAlphabet();
    if (m === 'pop') { for(let i=0; i<5; i++) addPopTarget(); }
    if (m === 'flashlight') initQuest();
}

// Твоя функция отрисовки объектов
function drawObject(x, y, s, color, shape, op = 1) {
    if (op <= 0) return;
    ctx.globalAlpha = op; ctx.fillStyle = color; ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, s, 0, Math.PI*2);
    else if (shape === 'star') { for(let i=0; i<10; i++) { let r = (i%2===0)?s:s/2; ctx.lineTo(x + r*Math.cos(i*Math.PI/5 - Math.PI/2), y + r*Math.sin(i*Math.PI/5 - Math.PI/2)); } }
    else if (shape === 'triangle') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y+s); ctx.lineTo(x-s, y+s); }
    else if (shape === 'rect') ctx.rect(x - s*1.5, y - s/2, s*3, s);
    else ctx.rect(x - s, y - s, s*2, s*2);
    ctx.fill(); ctx.closePath(); ctx.globalAlpha = 1;
}

function draw() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (config.countdown > 0) {
        ctx.fillStyle = "#00fbff"; ctx.font = "bold 120px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(config.countdown, canvas.width/2, canvas.height/2 + 40);
    }

    if (config.mode === 'alphabet' && config.countdown === 0) {
        const cols = 8, gap = canvas.width > 600 ? 90 : 45, startX = (canvas.width - (cols-1)*gap)/2;
        config.currentLetters.forEach((char, i) => {
            let x = startX + (i % cols)*gap, y = 140 + Math.floor(i / cols)*gap;
            let isAct = (i === config.activeIndex);
            if (isAct && config.shake > 0.1) { x += (Math.random()-0.5)*config.shake; y += (Math.random()-0.5)*config.shake; config.shake *= 0.9; }
            ctx.strokeStyle = isAct ? "#0ff" : "#333";
            ctx.strokeRect(x-gap/2.2, y-gap/2.2, gap/1.1, gap/1.1);
            ctx.fillStyle = isAct ? "#0ff" : (i < config.activeIndex ? "#222" : "#fff");
            ctx.font = `bold ${gap/2.5}px sans-serif`; ctx.fillText(char, x, y + gap/8);
        });
    }

    if (config.mode === 'flashlight') {
        config.hiddenItems.forEach(item => {
            const dist = Math.hypot(config.mouseX - item.x, config.mouseY - item.y);
            if (dist < 150) drawObject(item.x, item.y, item.size, item.color, item.shape, 1 - dist/150);
        });
        const grad = ctx.createRadialGradient(config.mouseX, config.mouseY, 0, config.mouseX, config.mouseY, 150);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(config.mouseX, config.mouseY, 150, 0, Math.PI*2); ctx.fill();
    }

    // Твоя логика частиц и физики
    config.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.age -= 0.02;
        drawObject(p.x, p.y, 6, p.color, p.shape, p.age);
        if (p.age <= 0) config.particles.splice(i, 1);
    });

    config.bodies.forEach((b, i) => {
        if (config.mode === 'physics') b.vy += 0.5;
        b.x += b.vx; b.y += b.vy; b.op -= 0.015;
        if (b.y > canvas.height) { b.y = canvas.height; b.vy *= -0.7; }
        drawObject(b.x, b.y, b.size, b.color, b.shape, b.op);
        if (b.op <= 0) config.bodies.splice(i, 1);
    });

    if (config.mode === 'pop') config.targets.forEach(t => drawObject(t.x, t.y, 40, t.color, 'circle'));
    if (config.mode === 'snake') {
        config.snakeTrail.push({x: config.mouseX, y: config.mouseY});
        if (config.snakeTrail.length > 20) config.snakeTrail.shift();
        config.snakeTrail.forEach((p, i) => drawObject(p.x, p.y, i*2, config.colors[i%9], 'circle', 0.8));
    }

    requestAnimationFrame(draw);
}

// Обработка событий (Твой функционал)
function handleAction(key, x, y) {
    const color = config.colors[Math.floor(Math.random()*9)], shape = config.shapes[Math.floor(Math.random()*7)];
    
    if (config.mode === 'alphabet' && config.countdown === 0) {
        const target = config.currentLetters[config.activeIndex].toLowerCase();
        if (config.device === 'mobile' || (key && key.toLowerCase() === target)) {
            config.activeIndex++; if (config.activeIndex >= config.alphabet.length) setMode('none');
        } else { config.shake = 15; }
    }
    if (config.mode === 'chaos') {
        for(let i=0; i<5; i++) config.particles.push({x: random(0, canvas.width), y: random(0, canvas.height), vx:random(-3,3), vy:random(-3,3), age:1, color, shape});
    }
    if (config.mode === 'physics') config.bodies.push({x, y, vx:random(-4,4), vy:-8, size:30, color, shape, op:1});
    if (config.mode === 'symphony') config.bodies.push({x:random(0,width), y:random(0,height), vx:0, vy:0, size:50, color, shape, op:1});
}

// Слушатели
window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#menu') || e.target.closest('#menu-trigger')) return;
    config.mouseX = e.clientX; config.mouseY = e.clientY;
    if (config.mode === 'pop') {
        config.targets.forEach((t, i) => { if(Math.hypot(config.mouseX-t.x, config.mouseY-t.y) < 50) { config.targets.splice(i,1); addPopTarget(); } });
    }
    handleAction(null, config.mouseX, config.mouseY);
});
window.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; config.mouseX = t.clientX; config.mouseY = t.clientY;
    handleAction(null, config.mouseX, config.mouseY);
});
window.addEventListener('keydown', (e) => handleAction(e.key, canvas.width/2, canvas.height/2));
window.addEventListener('mousemove', (e) => { config.mouseX = e.clientX; config.mouseY = e.clientY; });

// Вспомогательные
function startAlphabet() { config.currentLetters = [...config.alphabet]; config.activeIndex = 0; config.countdown = 3; let i = setInterval(() => { if(config.countdown > 1) config.countdown--; else { clearInterval(i); config.countdown = 0; } }, 800); }
function addPopTarget() { config.targets.push({x:random(50, canvas.width-50), y:random(50, canvas.height-50), color:config.colors[Math.floor(Math.random()*9)]}); }
function initQuest() { config.hiddenItems = Array.from({length:10}, () => ({x:random(100, canvas.width-100), y:random(100, canvas.height-100), size:50, color:config.colors[0], shape:'star'})); }
const random = (min, max) => Math.random() * (max - min) + min;
const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.textAlign='center'; };
window.addEventListener('resize', resize); resize();
document.getElementById('menu-trigger').onclick = () => document.getElementById('menu').classList.toggle('active');

draw();
