let mode = 'none';
let deviceType = '';
let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
let stars = [], elements = [], targets = [], alphaIndex = 0;

// Инициализация версии
window.initVersion = function(type) {
    deviceType = type;
    document.getElementById('version-selector').style.display = 'none';
    if (type === 'mobile' && !/iPhone/i.test(navigator.userAgent)) {
        fullscreen(true);
    }
}

// Возврат к выбору версии
window.resetToHome = function() {
    location.reload(); 
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    for (let i = 0; i < 60; i++) stars.push({x: random(width), y: random(height), s: random(1, 3)});

    // Универсальное управление меню
    const trigger = document.getElementById('menu-trigger');
    const menu = document.getElementById('menu');

    const toggle = (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
    };

    if (deviceType === 'mobile') {
        trigger.ontouchstart = toggle;
    } else {
        trigger.onclick = toggle;
    }

    document.querySelectorAll('.item').forEach(el => {
        el.onclick = (e) => {
            mode = el.getAttribute('data-mode');
            elements = []; targets = [];
            menu.classList.remove('active');
            document.getElementById('welcome-screen').style.display = (mode === 'none' || mode === 'home') ? 'flex' : 'none';
            if (mode === 'pop') for(let i=0; i<5; i++) spawnTarget();
        };
    });
}

function draw() {
    background(0, 0, 15);
    fill(255, 150);
    for (let s of stars) circle(s.x, s.y, s.s);

    for (let i = elements.length - 1; i >= 0; i--) {
        let e = elements[i];
        fill(e.c); textSize(e.size); text(e.txt, e.x, e.y);
        if (mode === 'physics') {
            e.vy += 0.3; e.x += e.vx; e.y += e.vy;
            if (e.y > height) { e.y = height; e.vy *= -0.7; }
        } else { e.size += 2; e.opacity -= 5; }
        if (e.opacity <= 0) elements.splice(i, 1);
    }
    if (mode === 'pop') targets.forEach(t => { fill(t.col); circle(t.x, t.y, 80); });
}

// РЕАКЦИЯ НА ИГРУ
function mousePressed() {
    if (mouseX < 60 || document.getElementById('menu').classList.contains('active')) return;

    if (mode === 'alphabet') {
        // На мобилках любое нажатие - следующая буква
        let char = (deviceType === 'mobile') ? alphabet[alphaIndex % alphabet.length] : "⌨️";
        spawn(char, mouseX, mouseY);
        alphaIndex++;
    } else if (mode === 'pop') {
        for(let i=targets.length-1; i>=0; i--) {
            if (dist(mouseX, mouseY, targets[i].x, targets[i].y) < 40) {
                targets.splice(i, 1); spawnTarget();
            }
        }
    } else if (mode === 'physics') spawn("⚽", mouseX, mouseY, true);
    else if (mode === 'chaos') spawn("✨", mouseX, mouseY);
}

function keyPressed() {
    if (deviceType === 'pc' && mode === 'alphabet' && key.length === 1) {
        spawn(key.toUpperCase(), random(width), random(height));
    }
}

function spawn(txt, x, y, phys = false) {
    elements.push({txt: txt, x: x, y: y, size: 80, opacity: 255, vx: random(-2,2), vy: phys?-10:0, c: color(random(100,255), 255, 255)});
}

function spawnTarget() {
    targets.push({x: random(80, width-80), y: random(80, height-80), col: color(random(255), 255, 0)});
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
