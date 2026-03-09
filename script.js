let mode = 'none';
let deviceType = '';
let elements = [], stars = [], targets = [], particles = [], snakeTrail = [];
let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
let alphaIndex = 0;

const gamesPC = [
    {id: 'chaos', name: '🌌 КОСМОС'}, {id: 'pop', name: '💥 ХЛОПУШКИ'},
    {id: 'snake', name: '🐍 ГУСЕНИЦА'}, {id: 'physics', name: '🏔️ ЛАВИНА'},
    {id: 'symphony', name: '🎹 СИМФОНИЯ'}, {id: 'alphabet', name: '🅰️ АЛФАВИТ'},
    {id: 'flashlight', name: '🔦 ФОНАРИК'}
];

const gamesMobile = [
    {id: 'alphabet', name: '🅰️ АЛФАВИТ (ТАПЫ)'}, {id: 'pop', name: '💥 ХЛОПУШКИ'},
    {id: 'physics', name: '⚽ МЯЧИКИ'}, {id: 'chaos', name: '🌌 КОСМОС'}
];

window.initVersion = function(type) {
    deviceType = type;
    document.getElementById('version-selector').style.display = 'none';
    document.getElementById('welcome-screen').style.display = 'flex';
    const container = document.getElementById('menu-items-container');
    const activeGames = (type === 'pc') ? gamesPC : gamesMobile;
    activeGames.forEach(game => {
        const div = document.createElement('div');
        div.className = 'item'; div.innerText = game.name;
        div.onclick = () => selectGame(game.id);
        container.appendChild(div);
    });
};

window.toggleMenu = () => document.getElementById('menu').classList.toggle('active');

function selectGame(id) {
    mode = id;
    elements = []; targets = []; particles = []; snakeTrail = [];
    document.getElementById('menu').classList.remove('active');
    document.getElementById('welcome-screen').style.display = 'none';
    if (mode === 'pop') for(let i=0; i<5; i++) spawnTarget();
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    for (let i = 0; i < 60; i++) stars.push({x: random(width), y: random(height), s: random(1, 3)});
}

function draw() {
    background(0, 0, 15);
    fill(255, 150);
    for (let s of stars) circle(s.x, s.y, s.s);

    if (mode === 'snake') {
        snakeTrail.push({x: mouseX, y: mouseY});
        if (snakeTrail.length > 20) snakeTrail.shift();
        snakeTrail.forEach((p, i) => {
            fill(random(100, 255), 255, 255, (i/20)*255);
            circle(p.x, p.y, i * 2);
        });
    }

    if (mode === 'flashlight') {
        fill(255, 255, 255, 20);
        circle(mouseX, mouseY, 200);
        if (dist(mouseX, mouseY, width/2, height/2) < 100) {
            textSize(100); text("💎", width/2, height/2);
        }
    }

    for (let i = elements.length - 1; i >= 0; i--) {
        let e = elements[i];
        fill(e.c); textSize(e.size);
        text(e.txt, e.x, e.y);
        if (mode === 'physics' || mode === 'symphony') {
            e.vy += 0.3; e.x += e.vx; e.y += e.vy;
            if (e.y > height) { e.y = height; e.vy *= -0.7; }
        } else { e.size += 2; e.opacity -= 5; }
        if (e.opacity <= 0 || e.x < -100 || e.x > width + 100) elements.splice(i, 1);
    }

    if (mode === 'pop') targets.forEach(t => { fill(t.col); circle(t.x, t.y, 80); });
}

function mousePressed() {
    if (mouseX < 60 || document.getElementById('menu').classList.contains('active')) return;
    
    if (mode === 'alphabet') {
        let t = (deviceType === 'mobile') ? alphabet[alphaIndex++ % alphabet.length] : "⌨️";
        spawn(t, mouseX, mouseY);
    } else if (mode === 'pop') {
        for(let i=targets.length-1; i>=0; i--) {
            if (dist(mouseX, mouseY, targets[i].x, targets[i].y) < 40) {
                targets.splice(i, 1); spawnTarget();
            }
        }
    } else if (mode === 'physics') spawn("⚽", mouseX, mouseY, true);
    else if (mode === 'symphony') spawn("🎹", random(width), random(height), true);
    else spawn("✨", mouseX, mouseY);
}

function keyPressed() {
    if (deviceType === 'pc' && mode === 'alphabet' && key.length === 1) {
        spawn(key.toUpperCase(), random(width), random(height));
    }
}

function spawn(txt, x, y, phys = false) {
    elements.push({txt: txt, x: x, y: y, size: 80, opacity: 255, vx: random(-3,3), vy: phys?-10:0, c: color(random(100,255), 255, 255)});
}

function spawnTarget() {
    targets.push({x: random(80, width-80), y: random(80, height-80), col: color(random(255), 255, 0)});
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
