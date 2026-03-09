const config = {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#00fbff', '#ff0055'],
    shapes: ['circle', 'square', 'rect', 'rhombus', 'triangle', 'star', 'oval'],
    mode: 'none', device: '',
    particles: [], targets: [], bodies: [], snakeTrail: [], hiddenItems: [],
    mouseX: 0, mouseY: 0, isMouseDown: false,
    alphabet: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    activeIndex: 0, collected: [], options: [], flying: null,
    shake: 0, startTime: 0, isFinished: false
};

const SHAPE_NAMES = { 'star':'Звездочка', 'circle':'Круг', 'oval':'Овал', 'square':'Квадрат', 'triangle':'Треугольник', 'rect':'Прямоугольник', 'rhombus':'Ромб' };

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

function boot(type) {
    config.device = type;
    document.getElementById('startup-screen').style.display = 'none';
    const container = document.getElementById('menu-items-container');
    const games = type === 'pc' ? 
        ['chaos', 'pop', 'snake', 'physics', 'symphony', 'alphabet', 'flashlight'] : 
        ['alphabet', 'pop', 'physics', 'chaos'];
    
    games.forEach(id => {
        let d = document.createElement('div'); d.className = 'item'; d.innerText = id.toUpperCase();
        d.onclick = () => setMode(id); container.appendChild(d);
    });
    resize(); requestAnimationFrame(loop);
}

function setMode(m) {
    config.mode = m; config.bodies = []; config.particles = []; config.targets = []; config.snakeTrail = [];
    document.getElementById('menu').classList.remove('active');
    document.body.className = 'mode-' + m;
    document.getElementById('welcome-screen').style.display = (m === 'none') ? 'flex' : 'none';
    if (m === 'alphabet' && config.device === 'mobile') initMobileAlpha();
    if (m === 'pop') { for(let i=0; i<5; i++) addPopTarget(); }
    if (m === 'flashlight') initQuest();
}

function drawObject(x, y, s, color, shape, op = 1) {
    if (op <= 0) return;
    ctx.globalAlpha = op; ctx.fillStyle = color; ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, s, 0, Math.PI*2);
    else if (shape === 'star') { for(let i=0; i<10; i++) { let r = (i%2===0)?s:s/2; ctx.lineTo(x + r*Math.cos(i*Math.PI/5-Math.PI/2), y + r*Math.sin(i*Math.PI/5-Math.PI/2));}}
    else if (shape === 'triangle') { ctx.moveTo(x, y-s); ctx.lineTo(x+s, y+s); ctx.lineTo(x-s, y+s); }
    else if (shape === 'rect') ctx.rect(x - s*1.5, y - s/2, s*3, s);
    else ctx.rect(x - s, y - s, s*2, s*2);
    ctx.fill(); ctx.closePath(); ctx.globalAlpha = 1;
}

// --- ЛОГИКА MOBILE ALPHABET ---
function initMobileAlpha() {
    config.collected = []; config.activeIndex = 0; config.flying = null;
    refreshMobileOptions();
}
function refreshMobileOptions() {
    const correct = config.alphabet[config.activeIndex];
    let pool = config.alphabet.filter(l => l !== correct).sort(() => Math.random() - 0.5);
    config.options = [correct, pool[0], pool[1]].sort(() => Math.random() - 0.5);
}

function loop() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (config.device === 'mobile' && config.mode === 'alphabet') {
        const step = (canvas.width - 60) / 33;
        config.alphabet.forEach((l, i) => {
            ctx.fillStyle = config.collected.includes(l) ? "#0ff" : "#333";
            ctx.font = "bold 12px Arial"; ctx.fillText(l, 30 + i * step, 50);
        });
        config.options.forEach((l, i) => {
            let x = canvas.width/2 + (i-1)*110, y = canvas.height/2 + 100;
            ctx.strokeStyle = "#0ff"; ctx.strokeRect(x-45, y-45, 90, 90);
            ctx.fillStyle = "white"; ctx.font = "bold 40px Arial"; ctx.textAlign="center"; ctx.fillText(l, x, y+15);
        });
        if (config.flying) {
            config.flying.y -= 15; config.flying.x += (config.flying.tx - config.flying.x) * 0.1;
            ctx.fillStyle = "#0ff"; ctx.fillText(config.flying.l, config.flying.x, config.flying.y);
            if (config.flying.y < 60) { config.collected.push(config.flying.l); config.flying = null; }
        }
    }

    if (config.device === 'pc' && config.mode === 'alphabet') {
        const gap = 90; const startX = (canvas.width - 8*gap)/2;
        config.alphabet.forEach((char, i) => {
            let x = startX + (i%8)*gap, y = 160 + Math.floor(i/8)*gap;
            ctx.strokeStyle = (i === config.activeIndex) ? "#0ff" : "#222";
            ctx.strokeRect(x-35, y-35, 70, 70);
            ctx.fillStyle = (i === config.activeIndex) ? "#0ff" : (i < config.activeIndex ? "#222" : "#fff");
            ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.fillText(char, x, y+10);
        });
    }

    if (config.mode === 'flashlight') {
        const grad = ctx.createRadialGradient(config.mouseX, config.mouseY, 0, config.mouseX, config.mouseY, 150);
        grad.addColorStop(0, 'rgba(255,255,255,0.2)'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(config.mouseX, config.mouseY, 150, 0, Math.PI*2); ctx.fill();
    }

    if (config.mode === 'snake') {
        config.snakeTrail.push({x: config.mouseX, y: config.mouseY});
        if (config.snakeTrail.length > 20) config.snakeTrail.shift();
        config.snakeTrail.forEach((p, i) => drawObject(p.x, p.y, i*2, config.colors[i%9], 'circle', 0.8));
    }

    config.bodies.forEach((b, i) => {
        if (config.mode === 'physics') b.vy += 0.5;
        b.x += b.vx; b.y += b.vy; b.op -= 0.015;
        if (b.y > canvas.height) { b.y = canvas.height; b.vy *= -0.7; }
        drawObject(b.x, b.y, b.s, b.c, b.shape, b.op);
        if (b.op <= 0) config.bodies.splice(i, 1);
    });

    config.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.age -= 0.02;
        drawObject(p.x, p.y, 6, p.c, p.shape, p.age);
        if (p.age <= 0) config.particles.splice(i, 1);
    });

    requestAnimationFrame(loop);
}

// --- СОБЫТИЯ ---
window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#menu') || e.target.id === 'menu-trigger') return;
    const x = e.clientX, y = e.clientY;
    config.mouseX = x; config.mouseY = y;

    if (config.device === 'mobile' && config.mode === 'alphabet' && !config.flying) {
        config.options.forEach((l, i) => {
            let ox = canvas.width/2 + (i-1)*110, oy = canvas.height/2 + 100;
            if (Math.hypot(x - ox, y - oy) < 55 && l === config.alphabet[config.activeIndex]) {
                config.flying = { l, x: ox, y: oy, tx: 30 + config.activeIndex * ((canvas.width - 60) / 33) };
                config.activeIndex++; config.activeIndex >= 33 ? setTimeout(initMobileAlpha, 2000) : refreshMobileOptions();
            }
        });
    }
    if (config.mode === 'physics') config.bodies.push({x, y, vx: (Math.random()-0.5)*10, vy: -12, s: 25, c: config.colors[0], shape: 'circle', op: 1});
    if (config.mode === 'chaos') config.isMouseDown = true;
});

window.addEventListener('mousemove', (e) => { config.mouseX = e.clientX; config.mouseY = e.clientY; });
window.addEventListener('keydown', (e) => {
    if (config.device === 'pc' && config.mode === 'alphabet') {
        if (e.key.toLowerCase() === config.alphabet[config.activeIndex].toLowerCase()) config.activeIndex++;
    }
});

const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.textAlign='center'; };
window.addEventListener('resize', resize);
document.getElementById('menu-trigger').onclick = () => document.getElementById('menu').classList.toggle('active');
