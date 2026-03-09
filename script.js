const config = {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#00fbff', '#ff0055'],
    shapes: ['circle', 'square', 'rect', 'rhombus', 'triangle', 'star', 'oval'],
    mode: 'none', device: '',
    particles: [], targets: [], bodies: [], snakeTrail: [], hiddenItems: [],
    mouseX: 0, mouseY: 0, isMouseDown: false,
    alphabet: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    activeIndex: 0, collected: [], options: [], flying: null,
    shake: 0, startTime: 0, countdown: 0, isFinished: false
};

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const SHAPE_NAMES = { 'star':'Звездочка', 'circle':'Круг', 'oval':'Овал', 'square':'Квадрат', 'triangle':'Треугольник', 'rect':'Прямоугольник', 'rhombus':'Ромб' };

// --- ГЛАВНЫЙ ЗАПУСК ---
function boot(type) {
    config.device = type;
    document.getElementById('startup-screen').style.display = 'none';
    
    // Активация Fullscreen (работает только после клика, поэтому вызываем тут)
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log("Фулскрин заблокирован"));
    }

    const list = document.getElementById('menu-list');
    const pcGames = ['chaos', 'pop', 'snake', 'physics', 'symphony', 'alphabet', 'flashlight'];
    const mobileGames = ['alphabet', 'pop', 'physics', 'chaos'];
    
    const activeSet = type === 'pc' ? pcGames : mobileGames;
    activeSet.forEach(id => {
        let d = document.createElement('div'); d.className = 'item'; d.innerText = id.toUpperCase();
        d.onclick = (e) => { e.stopPropagation(); setMode(id); };
        list.appendChild(d);
    });

    resize();
    requestAnimationFrame(loop);
}

function setMode(m) {
    config.mode = m;
    config.bodies = []; config.particles = []; config.targets = []; config.snakeTrail = [];
    document.getElementById('menu').classList.remove('active');
    document.body.className = 'mode-' + m;
    document.getElementById('welcome-screen').style.display = (m === 'none') ? 'flex' : 'none';
    
    if (m === 'alphabet') {
        if (config.device === 'pc') { config.countdown = 3; startCountdown(); }
        else initMobileAlpha();
    }
    if (m === 'pop') for(let i=0; i<5; i++) addPopTarget();
}

// --- ТВOИ ОРИГИНАЛЬНЫЕ ФУНКЦИИ PC ---
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

function startCountdown() {
    config.activeIndex = 0;
    let i = setInterval(() => {
        if (config.countdown > 1) config.countdown--;
        else { clearInterval(i); config.countdown = 0; config.startTime = Date.now(); }
    }, 800);
}

// --- НОВАЯ МОБИЛЬНАЯ ЛОГИКА ---
function initMobileAlpha() {
    config.collected = []; config.activeIndex = 0; config.flying = null;
    generateOptions();
}
function generateOptions() {
    const correct = config.alphabet[config.activeIndex];
    let pool = config.alphabet.filter(l => l !== correct).sort(() => Math.random() - 0.5);
    config.options = [correct, pool[0], pool[1]].sort(() => Math.random() - 0.5);
}

// --- ЦИКЛ ОТРЕСОВКИ ---
function loop() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (config.device === 'pc') {
        // ТВОЙ ОРИГИНАЛЬНЫЙ DRAW
        if (config.countdown > 0) {
            ctx.fillStyle = "#0ff"; ctx.font = "bold 120px sans-serif"; ctx.textAlign="center";
            ctx.fillText(config.countdown, canvas.width/2, canvas.height/2);
        }
        if (config.mode === 'alphabet' && config.countdown === 0) {
            const gap = 90; const startX = (canvas.width - 8*gap)/2;
            config.alphabet.forEach((char, i) => {
                let x = startX + (i%8)*gap, y = 160 + Math.floor(i/8)*gap;
                let isAct = (i === config.activeIndex);
                ctx.strokeStyle = isAct ? "#0ff" : "#222"; ctx.strokeRect(x-35, y-35, 70, 70);
                ctx.fillStyle = isAct ? "#0ff" : (i < config.activeIndex ? "#222" : "#fff");
                ctx.font = "bold 30px sans-serif"; ctx.fillText(char, x, y+10);
            });
        }
    } else {
        // MOBILE DRAW
        if (config.mode === 'alphabet') {
            const step = (canvas.width - 60) / 33;
            config.alphabet.forEach((l, i) => {
                ctx.fillStyle = config.collected.includes(l) ? "#0ff" : "#333";
                ctx.fillText(l, 30 + i * step, 50);
            });
            config.options.forEach((l, i) => {
                let x = canvas.width/2 + (i-1)*110, y = canvas.height/2 + 100;
                ctx.strokeStyle = "#0ff"; ctx.strokeRect(x-45, y-45, 90, 90);
                ctx.fillStyle = "white"; ctx.font = "bold 40px sans-serif"; ctx.fillText(l, x, y+15);
            });
            if (config.flying) {
                config.flying.y -= 15; config.flying.x += (config.flying.tx - config.flying.x) * 0.1;
                ctx.fillStyle = "#0ff"; ctx.fillText(config.flying.l, config.flying.x, config.flying.y);
                if (config.flying.y < 60) { config.collected.push(config.flying.l); config.flying = null; }
            }
        }
    }

    // ТВОИ ЭФФЕКТЫ (Змейка, Физика, Хаос)
    if (config.mode === 'snake') {
        config.snakeTrail.push({x: config.mouseX, y: config.mouseY});
        if (config.snakeTrail.length > 20) config.snakeTrail.shift();
        config.snakeTrail.forEach((p, i) => drawObject(p.x, p.y, i*2, config.colors[i%9], 'circle', 0.8));
    }

    config.bodies.forEach((b, i) => {
        if (config.mode === 'physics') b.vy += 0.5;
        b.x += b.vx; b.y += b.vy; b.op -= 0.015;
        if (b.y > canvas.height) { b.y = canvas.height; b.vy *= -0.7; }
        drawObject(b.x, b.y, 25, b.c || "#0ff", 'circle', b.op);
        if (b.op <= 0) config.bodies.splice(i, 1);
    });

    requestAnimationFrame(loop);
}

// --- СОБЫТИЯ ---
window.addEventListener('mousedown', (e) => {
    if (e.target.id === 'menu-trigger' || e.target.closest('#menu')) return;
    const x = e.clientX, y = e.clientY;
    if (config.device === 'mobile' && config.mode === 'alphabet' && !config.flying) {
        config.options.forEach((l, i) => {
            let ox = canvas.width/2 + (i-1)*110, oy = canvas.height/2 + 100;
            if (Math.hypot(x - ox, y - oy) < 55 && l === config.alphabet[config.activeIndex]) {
                config.flying = { l, x: ox, y: oy, tx: 30 + config.activeIndex * ((canvas.width - 60) / 33) };
                config.activeIndex++; if (config.activeIndex < 33) generateOptions();
            }
        });
    }
    if (config.mode === 'physics') config.bodies.push({x, y, vx: (Math.random()-0.5)*10, vy: -12, c: config.colors[Math.floor(Math.random()*9)], op: 1});
});

window.addEventListener('keydown', (e) => {
    if (config.device === 'pc' && config.mode === 'alphabet') {
        if (e.key.toLowerCase() === config.alphabet[config.activeIndex].toLowerCase()) config.activeIndex++;
    }
});

const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', resize);
document.getElementById('menu-trigger').onclick = () => document.getElementById('menu').classList.toggle('active');
