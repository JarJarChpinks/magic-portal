let currentProblem = {}, stats = { correct: 0, wrong: 0, wrongExamples: [] };
let errorCount = 0, solvedInSession = 0, startTime = 0, hasCurrentError = false;
let isKraken = false, isGameActive = false, problemPool = [];

// Звуковой движок (генерация через браузер)
const sound = (freq, type, duration) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    } catch(e) { console.log("Sound error"); }
};

const playSuccess = () => sound(523, 'sine', 0.2);
const playError = () => sound(150, 'sawtooth', 0.3);
const playVictory = () => { sound(523, 'sine', 0.2); setTimeout(()=>sound(659, 'sine', 0.4), 150); };

window.onload = () => {
    const savedName = localStorage.getItem('student_name') || 'Гость';
    document.getElementById('studentName').value = savedName;
    document.getElementById('display-name').innerText = savedName;
    document.getElementById('answer-input').onkeydown = e => e.key === 'Enter' && checkAnswer();
    updateParentDisplay();
};

function openParentPanel() { document.getElementById('parent-panel').style.display = 'flex'; }
function closeParentPanel() {
    localStorage.setItem('student_name', document.getElementById('studentName').value || 'Гость');
    document.getElementById('display-name').innerText = localStorage.getItem('student_name');
    document.getElementById('parent-panel').style.display = 'none';
}

function prepareTest(topic) {
    let limitInput = parseInt(document.getElementById('countLimit').value);
    const limit = topic === 'kraken' ? 5 : (limitInput || 10);
    problemPool = [];
    const used = new Set();
    const krakenTopics = ['multiplicationTable', 'add2', 'add3', 'div2', 'mult2'];
    
    let attempts = 0; // Предохранитель от зависания
    while (problemPool.length < limit && attempts < 500) {
        attempts++;
        let t = topic === 'kraken' ? krakenTopics[problemPool.length] : topic;
        let p = generateRawProblem(t);
        if (!used.has(p.q)) { 
            used.add(p.q); 
            problemPool.push(p); 
        }
    }
    
    if (problemPool.length > 0) startTest(topic);
}

function generateRawProblem(topic) {
    let a, b, ans, symbol = "+", hint, r = (min, max) => Math.floor(Math.random()*(max-min+1))+min;
    switch(topic) {
        case 'multiplicationTable': a=r(2,9); b=r(2,9); ans=a*b; symbol="×"; hint="Таблица умножения"; break;
        case 'add2': a=r(10,99); b=r(10,99); ans=a+b; hint="Сложи десятки, потом единицы"; break;
        case 'add3': a=r(100,999); b=r(100,999); ans=a+b; hint="Считай по разрядам"; break;
        case 'div2': b=r(2,12); ans=r(2,12); a=b*ans; symbol="÷"; hint=`Вспомни, на что умножить ${b}, чтобы получить ${a}`; break;
        case 'mult2': a=r(11,25); b=r(2,9); ans=a*b; symbol="×"; hint=`${b}*${Math.floor(a/10)*10} + ${b}*${a%10}`; break;
    }
    return { q: `${a} ${symbol} ${b}`, ans, hint, topic };
}

function startTest(topic) {
    isGameActive = true; isKraken = (topic === 'kraken');
    errorCount = 0; solvedInSession = 0; startTime = Date.now();
    stats = { correct: 0, wrong: 0, wrongExamples: [] };
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    nextQuestion();
}

function nextQuestion() {
    currentProblem = problemPool[solvedInSession];
    hasCurrentError = false;
    document.getElementById('error-hint').style.display = 'none';
    document.getElementById('question').innerText = currentProblem.q;
    document.getElementById('cur-idx').innerText = solvedInSession + 1;
    const input = document.getElementById('answer-input');
    input.value = ''; input.focus();
    updateProgress();
}

function checkAnswer() {
    const input = document.getElementById('answer-input');
    const userVal = parseInt(input.value);
    if (isNaN(userVal)) return;

    if (userVal === currentProblem.ans) {
        playSuccess();
        if (hasCurrentError) stats.wrong++; else stats.correct++;
        solvedInSession++;
        if (solvedInSession >= problemPool.length) finish(); else nextQuestion();
    } else {
        playError();
        errorCount++;
        if (!hasCurrentError) { 
            stats.wrongExamples.push(`${currentProblem.q} = ${currentProblem.ans}`); 
            hasCurrentError = true; 
        }
        input.classList.add('error-shake');
        setTimeout(() => input.classList.remove('error-shake'), 300);
        if (errorCount >= 5) {
            document.getElementById('error-hint').innerText = "Подсказка: " + currentProblem.hint;
            document.getElementById('error-hint').style.display = 'block';
            if (document.getElementById('resetOnError').checked) abortTest();
        }
    }
}

function finish() {
    isGameActive = false;
    playVictory();
    const timeSec = Math.floor((Date.now()-startTime)/1000);
    saveToLog(isKraken ? 'КРАКЕН' : currentProblem.topic, stats.wrong, timeSec, false);
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('stats-screen').style.display = 'block';
    document.getElementById('session-result').innerHTML = `<b>Ошибок: ${stats.wrong} | Время: ${timeSec}с</b>`;
    document.getElementById('wrong-answers-list').innerHTML = stats.wrongExamples.map(ex => `<li>${ex}</li>`).join('');
    updateParentDisplay();
}

function abortTest() {
    alert("Ну ты и пёс!");
    if (isGameActive) saveToLog(isKraken ? 'КРАКЕН' : currentProblem.topic, stats.wrong, 0, true);
    location.reload();
}

function saveToLog(topic, errors, time, aborted) {
    let h = JSON.parse(localStorage.getItem('math_v_final')) || { logs: [], aborted: 0, stars: 0 };
    if (aborted) {
        h.aborted++;
    } else if (errors === 0) {
        h.stars += (isKraken ? 2 : 1);
    }
    
    const now = new Date();
    const fullDate = `${now.toLocaleDateString([], {day:'2-digit', month:'2-digit'})} ${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;

    h.logs.unshift({
        name: localStorage.getItem('student_name') || 'Гость',
        topic: aborted ? topic + " ❌" : topic,
        errors: `${errors}/${problemPool.length}`,
        time: time + "с",
        date: fullDate
    });
    localStorage.setItem('math_v_final', JSON.stringify(h));
}

function updateProgress() { 
    document.getElementById('progress-bar').style.width = (solvedInSession / problemPool.length * 100) + "%"; 
}

function updateParentDisplay() {
    let h = JSON.parse(localStorage.getItem('math_v_final')) || { logs: [], aborted: 0, stars: 0 };
    document.getElementById('star-count').innerText = h.stars;
    document.getElementById('aborted-total').innerText = h.aborted;
    document.getElementById('history-body').innerHTML = h.logs.slice(0, 20).map(l => 
        `<tr><td>${l.name}</td><td>${l.topic}</td><td>${l.errors}</td><td>${l.time}</td><td>${l.date}</td></tr>`
    ).join('');
}
