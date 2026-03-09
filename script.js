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
    mobile: [{id:'alphabet', n:'🅰️ АЛФАВИТ'}, {id:'pop', n:'💥 ХЛОПУШКИ'}, {id:'physics', n:'⚽ МЯЧИКИ'}, {id:'chaos', n:'🌌 КОСМОС'}]
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
}

function initAlphaGame() {
    config.collected = []; config.activeIdx = 0;
    refreshOptions();
}

function refreshOptions() {
    const correct = config.fullAlpha[config.activeIdx];
    let pool = config.fullAlpha.filter(l => l !== correct);
    pool.sort(() => Math.random() - 0.5);
    config.options = [correct, pool[0], pool[1]].sort(() => Math.random() - 0.5);
}

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (config.mode === 'alphabet') {
        // Полоса прогресса сверху
        const step = (canvas.width - 40) / 33;
        ctx.textAlign = "center"; ctx.font = "14px sans-serif";
        config.fullAlpha.forEach((l, i) => {
            ctx.fillStyle = i < config.activeIdx ? "#0ff" : "#222";
            ctx.fillText(l, 25 + i * step, 40);
        });

        // Карточки выбора
        config.options.forEach((l, i) => {
            let x = canvas.width/2 + (i-1)*(canvas.width > 600 ? 150 : 100);
            let y = canvas.height/2 + 50;
            ctx.strokeStyle = "#0ff"; ctx.lineWidth = 2;
            ctx.strokeRect(x-40, y-40, 80, 80);
            ctx.fillStyle = "#fff"; ctx.font = "bold 40px sans-serif";
            ctx.fillText(l, x, y + 15);
        });
    }

    if (config.mode === 'snake') {
        config.snake.push({x: config.mouseX, y: config.mouseY});
        if (config.snake.length > 25) config.snake.shift();
        config.snake.forEach((p, i) => {
            ctx.fillStyle = config.colors[i % 7];
            ctx.beginPath(); ctx.arc(p.x, p.y, i * 1.5, 0, Math.PI*2); ctx.fill();
        });
    }

    // Физика (Лавина / Симфония)
    config.bodies.forEach((b, i) => {
        if (config.mode === 'physics') b.vy += 0.4;
        b.x += b.vx; b.y += b.vy; b.op -= 0.01;
        if (b.y > canvas.height) { b.y = canvas.height; b.vy *= -0.6; }
        ctx.globalAlpha = b.op; ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.arc(b.x, b.y, 25, 0, Math.PI*2); ctx.fill();
        if (b.op <= 0) config.bodies.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    requestAnimationFrame(draw);
}

// ВВОД
const handleInput = (x, y, isClick = true) => {
    if (config.mode === 'alphabet') {
        config.options.forEach((l, i) => {
            let ox = canvas.width/2 + (i-1)*(canvas.width > 600 ? 150 : 100);
            let oy = canvas.height/2 + 50;
            if (Math.hypot(x - ox, y - oy) < 60) {
                if (l === config.fullAlpha[config.activeIdx]) {
                    config.activeIdx++;
                    if (config.activeIdx >= 33) initAlphaGame(); else refreshOptions();
                }
            }
        });
    }
    if (config.mode === 'physics') spawn(x, y, true);
    if (config.mode === 'chaos') spawn(Math.random()*canvas.width, Math.random()*canvas.height, false);
};

window.addEventListener('mousedown', (e) => {
    if (e.target.id === 'menu-trigger' || e.target.closest('#menu')) return;
    handleInput(e.clientX, e.clientY);
});

window.addEventListener('touchstart', (e) => {
    if (e.target.id === 'menu-trigger' || e.target.closest('#menu')) return;
    const t = e.touches[0];
    handleInput(t.clientX, t.clientY);
    if (config.mode !== 'none') e.preventDefault();
}, {passive: false});

window.addEventListener('mousemove', (e) => { config.mouseX = e.clientX; config.mouseY = e.clientY; });
window.addEventListener('touchmove', (e) => { config.mouseX = e.touches[0].clientX; config.mouseY = e.touches[0].clientY; });

window.addEventListener('keydown', (e) => {
    if (config.mode === 'alphabet') {
        if (e.key.toLowerCase() === config.fullAlpha[config.activeIdx].toLowerCase()) {
            config.activeIdx++;
            if (config.activeIdx >= 33) initAlphaGame(); else refreshOptions();
        }
    }
});

function spawn(x, y, p) {
    config.bodies.push({x, y, vx: (Math.random()-0.5)*8, vy: p?-12:0, c: config.colors[Math.floor(Math.random()*7)], op: 1});
}

window.toggleMenu = (e) => { e.stopPropagation(); document.getElementById('menu').classList.toggle('active'); };
const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', resize); resize();
draw();
