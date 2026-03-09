let mode = 'none';
let stars = [], elements = [], targets = [];
let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
let alphaIndex = 0;

function setup() {
    // Привязываем холст к контейнеру
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.parent('canvas-wrapper');
    
    textAlign(CENTER, CENTER);
    for (let i = 0; i < 80; i++) stars.push({x: random(width), y: random(height), s: random(1, 3)});
}

// Функции меню вынесены отдельно, чтобы p5 их не блокировал
function toggleMenu(e) {
    e.stopPropagation();
    document.getElementById('menu').classList.toggle('active');
}

function selectMode(m, e) {
    e.stopPropagation();
    mode = m;
    elements = []; targets = [];
    document.getElementById('menu').classList.remove('active');
    document.getElementById('welcome-screen').style.display = (mode === 'none') ? 'flex' : 'none';
    if (mode === 'pop') for(let i=0; i<5; i++) spawnTarget();
}

function draw() {
    background(0, 0, 20);
    
    // Рисуем звезды
    fill(255, 180);
    for (let s of stars) circle(s.x, s.y, s.s);

    // Логика элементов
    for (let i = elements.length - 1; i >= 0; i--) {
        let e = elements[i];
        fill(e.c); textSize(e.size);
        text(e.txt, e.x, e.y);
        
        if (mode === 'physics') {
            e.vy += 0.3; e.x += e.vx; e.y += e.vy;
            if (e.y > height) { e.y = height; e.vy *= -0.7; }
        } else {
            e.size += 2; e.opacity -= 5;
        }
        if (e.opacity <= 0 || e.y > height + 50) elements.splice(i, 1);
    }

    // Режим лопания шариков
    if (mode === 'pop') {
        targets.forEach(t => { fill(t.col); circle(t.x, t.y, 80); });
    }
}

function mousePressed() {
    // ПРОВЕРКА: Если клик в зоне меню (слева), игру не запускаем
    if (mouseX < 60) return;

    if (mode === 'alphabet') {
        spawnElement(alphabet[alphaIndex % alphabet.length], mouseX, mouseY);
        alphaIndex++;
    } else if (mode === 'pop') {
        for(let i=targets.length-1; i>=0; i--) {
            if (dist(mouseX, mouseY, targets[i].x, targets[i].y) < 40) {
                targets.splice(i, 1); spawnTarget();
            }
        }
    } else if (mode === 'physics') {
        spawnElement("⚽", mouseX, mouseY, true);
    }
}

function spawnElement(txt, x, y, phys = false) {
    elements.push({
        txt: txt, x: x, y: y, size: 80, opacity: 255,
        vx: random(-3, 3), vy: phys ? -10 : 0,
        c: color(random(100, 255), random(150, 255), 255)
    });
}

function spawnTarget() {
    targets.push({x: random(80, width-80), y: random(80, height-80), col: color(random(255), random(255), 0)});
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
