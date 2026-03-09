const config = {
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FFA500'],
    mode: 'none', device: '',
    fullAlpha: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    collected: [], options: [], activeIdx: 0,
    particles: [], bodies: [], targets: [], snake: [],
    mouseX: 0, mouseY: 0, shake: 0
};

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');

const games = {
    pc: [{id:'chaos', n:'🌌 КОСМОС'}, {id:'pop', n:'💥 ХЛОПУШКИ'}, {id:'snake', n:'🐍 ГУСЕНИЦА'}, {id:'physics', n:'🏔️ ЛАВИНА'}, {id:'symphony', n:'🎹 СИМФОНИЯ'}, {id:'alphabet', n:'🅰️ АЛФАВИТ'}, {id:'flashlight', n:'🔦 ФОНАРИК'}],
    mobile: [{id:'alphabet', n:'🅰️ АЛФАВИТ'}, {id:'pop', n:'💥 ХЛОПУШКИ'}, {id:'physics', n:'⚽ МЯЧИКИ'}]
};

window.initApp = function(t) {
    config.device = t;
    document.getElementById('version-selector').style.display = 'none';
    const list = document.getElementById('menu-list');
    games[t].forEach(g => {
        let d = document.createElement('div'); d.className = 'item'; d.innerText = g.n;
        d.onclick = () => setMode(g.id); list.appendChild(d);
    });
};

function setMode(m) {
    config.mode = m;
    config.bodies = []; config.particles = []; config.targets = []; config.snake = [];
    document.getElementById('menu').classList.remove('active');
    document.getElementById('welcome-screen').style.display = (m === 'none') ? 'flex' : 'none';
    if (m === 'alphabet') initAlphaGame();
    if (m === 'pop') for(let i=0; i<5; i++) spawnTarget();
}

function initAlphaGame() {
    config.collected = []; config.activeIdx = 0;
    refreshOptions();
}

function refreshOptions() {
    const correct = config.fullAlpha[config.activeIdx];
    let others = config.fullAlpha.filter(l => l !== correct);
    others.sort(() => Math.random() - 0.5);
    config.options = [correct, others[0], others[1]].sort(() => Math.random() - 0.5);
}

function draw() {
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка собранных букв сверху
    if (config.mode === 'alphabet') {
        ctx.fillStyle = "#555"; ctx.font = "16px sans-serif";
        config.fullAlpha.forEach((l, i) => {
            ctx.fillStyle = config.collected.includes(l) ? "#0ff" : "#333";
            ctx.fillText(l, 20 + i * (canvas.width/35), 40);
        });

        // 3 кнопки выбора
        config.options.forEach((l, i) => {
            let x = canvas.width/2 + (i-1)*120, y = canvas.height/2 + 100;
            ctx.strokeStyle = "#0ff"; ctx.strokeRect(x-40, y-40, 80, 80);
            ctx.fillStyle = "#fff"; ctx.font = "bold 40px sans-serif";
            ctx.textAlign = "center"; ctx.fillText(l, x, y + 15);
        });
    }

    // Твоя физика и частицы
    config.bodies.forEach((b, i) => {
        if (config.mode === 'physics') b.vy += 0.5;
        b.x += b.vx; b.y += b.vy; b.op -= 0.01;
        if (b.y > canvas.height) { b.y = canvas.height; b.vy *= -0.6; }
        ctx.globalAlpha = b.op; ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, 7); ctx.fill();
        if (b.op <= 0) config.bodies.splice(i, 1);
    });

    if (config.mode === 'snake') {
        config.snake.push({x: config.mouseX, y: config.mouseY});
        if (config.snake.length > 20) config.snake.shift();
        config.snake.forEach((p, i) => { ctx.fillStyle = config.colors[i%7]; ctx.beginPath(); ctx.arc(p.x, p.y, i*2, 0, 7); ctx.fill(); });
    }

    ctx.globalAlpha = 1; requestAnimationFrame(draw);
}

// Универсальный клик/тап
window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#menu') || e.target.closest('#menu-trigger')) return;
    config.mouseX = e.clientX; config.mouseY = e.clientY;
    
    if (config.mode === 'alphabet') {
        config.options.forEach((l, i) => {
            let x = canvas.width/2 + (i-1)*120, y = canvas.height/2 + 100;
            if (Math.hypot(config.mouseX - x, config.mouseY - y) < 50) {
                if (l === config.fullAlpha[config.activeIdx]) {
                    config.collected.push(l); config.activeIdx++;
                    if (config.activeIdx >= 33) initAlphaGame(); else refreshOptions();
                } else { config.shake = 10; }
            }
        });
    }
    
    if (config.mode === 'physics') spawnObj(config.mouseX, config.mouseY, true);
    if (config.mode === 'chaos') for(let i=0; i<5; i++) spawnObj(random(width), random(height), false);
});

function spawnObj(x, y, p) {
    config.bodies.push({x, y, vx: (Math.random()-0.5)*10, vy: p?-10:0, s: 30, c: config.colors[Math.floor(Math.random()*7)], op: 1});
}

window.addEventListener('keydown', (e) => {
    if (config.mode === 'alphabet') {
        const target = config.fullAlpha[config.activeIdx].toLowerCase();
        if (e.key.toLowerCase() === target) {
            config.collected.push(config.fullAlpha[config.activeIdx]);
            config.activeIdx++; if (config.activeIdx >= 33) initAlphaGame(); else refreshOptions();
        }
    }
});

const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', resize); resize();
window.toggleMenu = () => document.getElementById('menu').classList.toggle('active');
const random = (min, max) => Math.random()*(max-min)+min;

draw();
