let mode = 'none';
let stars = [], elements = [], targets = [], particles = [];
let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
let alphaIndex = 0;
let osc;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textAlign(CENTER, CENTER);
    // Инициализация звезд
    for (let i = 0; i < 100; i++) stars.push({x: random(width), y: random(height), s: random(1, 3)});
    
    // Звуковой движок
    osc = new p5.Oscillator('sine');
    osc.amp(0);
    osc.start();

    // Привязка меню
    document.getElementById('menu-trigger').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('menu').classList.toggle('active');
    };

    document.querySelectorAll('.item').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            setMode(el.getAttribute('data-mode'));
        };
    });
}

function setMode(newMode) {
    mode = newMode;
    elements = []; targets = []; particles = [];
    document.getElementById('menu').classList.remove('active');
    document.getElementById('welcome-screen').style.display = (mode === 'none') ? 'flex' : 'none';
    
    if (mode === 'pop') for(let i=0; i<6; i++) spawnTarget();
    if (mode === 'physics') spawnElement("⚽", width/2, height/2);
}

function draw() {
    background(0, 0, 20);
    
    // 1. Фон
    fill(255, 150);
    for (let s of stars) circle(s.x, s.y, s.s);

    // 2. Логика режимов
    if (mode === 'alphabet' || mode === 'physics' || mode === 'random') {
        for (let i = elements.length - 1; i >= 0; i--) {
            let e = elements[i];
            fill(e.color); textSize(e.size);
            text(e.txt, e.x, e.y);
            
            if (mode === 'physics') {
                e.vy += 0.2; // Гравитация
                e.x += e.vx; e.y += e.vy;
                if (e.y > height) { e.y = height; e.vy *= -0.8; }
            } else {
                e.size += 2; e.opacity -= 5;
            }
            if (e.opacity <= 0 || e.x < 0 || e.x > width) elements.splice(i, 1);
        }
    }

    if (mode === 'pop') {
        targets.forEach(t => {
            fill(t.color); circle(t.x, t.y, t.r * 2);
        });
    }

    if (mode === 'flashlight') {
        let d = dist(mouseX, mouseY, width/2, height/2);
        if (d < 150) {
            fill(0, 255, 255); textSize(100);
            text("💎", width/2, height/2);
        }
        // Эффект луча
        fill(255, 255, 255, 50);
        circle(mouseX, mouseY, 200);
    }
}

function mousePressed() {
    if (mouseX < 50 && mouseY < 100) return; // Не срабатывать при клике на меню
    
    userInteraction(mouseX, mouseY);
    if (!fullscreen() && !/iPhone/i.test(navigator.userAgent)) fullscreen(true);
}

function keyPressed() {
    userInteraction(width/2, height/2, key);
}

function userInteraction(x, y, k) {
    if (mode === 'none') return;
    
    // Звук
    osc.freq(random(300, 700)); osc.amp(0.3, 0.05); osc.amp(0, 0.5);

    if (mode === 'alphabet') {
        let t = k ? k.toUpperCase() : alphabet[alphaIndex % alphabet.length];
        if (!k) alphaIndex++;
        spawnElement(t, x, y);
    } else if (mode === 'pop') {
        for(let i=targets.length-1; i>=0; i--) {
            if (dist(x, y, targets[i].x, targets[i].y) < targets[i].r) {
                targets.splice(i, 1);
                spawnTarget();
                playPopSfx();
            }
        }
    } else if (mode === 'physics') {
        spawnElement("🏀", x, y, true);
    } else {
        spawnElement("✨", x, y);
    }
}

function spawnElement(txt, x, y, hasPhysics = false) {
    elements.push({
        txt: txt, x: x, y: y, size: 80, opacity: 255,
        vx: random(-5, 5), vy: hasPhysics ? -10 : 0,
        color: color(random(100, 255), random(100, 255), 255)
    });
}

function spawnTarget() {
    targets.push({x: random(50, width-50), y: random(50, height-50), r: 40, color: color(random(255), random(255), 0)});
}

function playPopSfx() { osc.freq(800); osc.amp(0.5, 0.01); osc.amp(0, 0.1); }

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
