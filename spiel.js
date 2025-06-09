document.addEventListener('DOMContentLoaded', () => {

    // HTML-Elemente für den Zugriff speichern
    const stopwatchElement = document.getElementById('stopwatch');
    const stationNameElement = document.getElementById('station-name');
    const stationImageElement = document.getElementById('station-image');
    const stationDescriptionElement = document.getElementById('station-description');
    const hintBoxes = [
        document.getElementById('hint-1'),
        document.getElementById('hint-2'),
        document.getElementById('hint-3'),
        document.getElementById('hint-4'),
        document.getElementById('hint-5'),
    ];
    const progressBar = document.getElementById('hint-progress-bar');
    const progressText = document.getElementById('progress-text');
    const solutionInput = document.getElementById('solution-input');
    const submitButton = document.getElementById('submit-button');
    const reportErrorButton = document.getElementById('report-error-button'); // NEU
    const stationContent = document.getElementById('station-content');
    const endScreen = document.getElementById('end-screen');
    const finalTimeElement = document.getElementById('final-time');
    const fireworksCanvas = document.getElementById('fireworks-canvas');
    const ctx = fireworksCanvas.getContext('2d');
    
    // Audio-Elemente laden
    const soundCorrect = document.getElementById('audio-correct');
    const soundWrong = document.getElementById('audio-wrong');
    const soundWin = document.getElementById('audio-win');

    let particles = [];
    let stations = [];
    let config = {};
    let currentStationIndex = 0;
    let revealedHints = 0;
    let hintTimer, progressTimer, secondsLeftForHint;
    let totalSeconds = 0;
    let stopwatchTimer;

    // --- FUNKTIONEN ---

    function startStopwatch() {
        stopwatchTimer = setInterval(() => {
            totalSeconds++;
            const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
            const s = (totalSeconds % 60).toString().padStart(2, '0');
            stopwatchElement.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    function stopStopwatch() {
        clearInterval(stopwatchTimer);
    }
    
    async function initializeGame() {
        try {
            const configResponse = await fetch('config.json');
            config = configResponse.ok ? await configResponse.json() : { hintIntervalSeconds: 120 };

            const stationsResponse = await fetch('spiel.json');
            if (!stationsResponse.ok) throw new Error('Spieldaten (spiel.json) konnten nicht geladen werden.');
            stations = await stationsResponse.json();

            loadStation(currentStationIndex);
            startStopwatch();
        } catch (error) {
            stationNameElement.textContent = 'Fehler!';
            stationDescriptionElement.textContent = error.message;
        }
    }

    function loadStation(index) {
        if (index >= stations.length) {
            endGame();
            return;
        }
        const station = stations[index];
        stationNameElement.textContent = station.stationsname;
        stationDescriptionElement.textContent = station.beschreibung;
        
        stationImageElement.style.display = (station.stationsbild && station.stationsbild.trim() !== '') ? 'block' : 'none';
        if (stationImageElement.style.display === 'block') {
            stationImageElement.src = `img/${station.stationsbild}`;
        }
        stationImageElement.onerror = () => { stationImageElement.src = 'img/hintergrund_startseite.jpg'; };

        revealedHints = 0;
        hintBoxes.forEach((box, i) => {
            box.classList.add('locked');
            box.classList.remove('unlocked');
            box.querySelector('p').textContent = `Hinweis ${i + 1}`;
        });
        solutionInput.value = '';
        solutionInput.disabled = false;
        submitButton.disabled = false;
        startHintTimer();
    }
    
    function revealHint() {
        if (revealedHints >= hintBoxes.length) {
            clearInterval(hintTimer);
            clearInterval(progressTimer);
            progressBar.style.width = '0%';
            progressText.textContent = 'Alle Hinweise aufgedeckt!';
            return;
        }
        const station = stations[currentStationIndex];
        const hintKey = `hinweis${revealedHints + 1}`;
        const hintBox = hintBoxes[revealedHints];
        hintBox.querySelector('p').textContent = station[hintKey];
        hintBox.classList.remove('locked');
        hintBox.classList.add('unlocked');
        revealedHints++;
    }
    
    function startHintTimer() {
        clearInterval(hintTimer);
        clearInterval(progressTimer);
        revealHint();
        if (revealedHints >= hintBoxes.length) return;
        
        const HINT_INTERVAL_SECONDS = config.hintIntervalSeconds || 120;
        secondsLeftForHint = HINT_INTERVAL_SECONDS;
        hintTimer = setInterval(() => {
            revealHint();
            secondsLeftForHint = HINT_INTERVAL_SECONDS;
            if (revealedHints >= hintBoxes.length) clearInterval(hintTimer);
        }, HINT_INTERVAL_SECONDS * 1000);
        
        progressTimer = setInterval(() => {
            secondsLeftForHint--;
            progressBar.style.width = `${100 - ((secondsLeftForHint / HINT_INTERVAL_SECONDS) * 100)}%`;
            progressText.textContent = `Nächster Hinweis in ${secondsLeftForHint}s`;
            if (secondsLeftForHint <= 0) secondsLeftForHint = HINT_INTERVAL_SECONDS;
            if (revealedHints >= hintBoxes.length) {
                clearInterval(progressTimer);
                progressBar.style.width = '0%';
                progressText.textContent = 'Alle Hinweise aufgedeckt!';
            }
        }, 1000);
    }
    
    function normalizeString(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').trim();
    }
    
    function checkSolution() {
        const station = stations[currentStationIndex];
        const normalizedInput = normalizeString(solutionInput.value);
        const isCheating = normalizedInput === '47110815';
        const isCorrect1 = normalizedInput === normalizeString(station.loesungswort);
        let isCorrect2 = station.loesungswort2 ? normalizedInput === normalizeString(station.loesungswort2) : false;

        if (isCorrect1 || isCorrect2 || isCheating) {
            playSound(soundCorrect);
            triggerSmallFireworks();
            submitButton.disabled = true;
            setTimeout(() => {
                currentStationIndex++;
                loadStation(currentStationIndex);
            }, 1500);
        } else {
            playSound(soundWrong);
            solutionInput.style.animation = 'shake 0.5s';
            setTimeout(() => { solutionInput.style.animation = ''; }, 500);
        }
    }
    
    function endGame() {
        stopStopwatch();
        stationContent.style.display = 'none';
        endScreen.style.display = 'block';
        finalTimeElement.textContent = stopwatchElement.textContent;
        playSound(soundWin);
        triggerLargeFireworks();
    }

    // NEU: Funktion, um eine Fehler-E-Mail zu erstellen
    function reportError() {
        if (stations.length > 0 && stations[currentStationIndex]) {
            const stationName = stations[currentStationIndex].stationsname;
            const subject = `Willinghusen Rallye FEHLER: ${stationName}`;
            // Das E-Mail-Programm des Nutzers wird mit dem vorbereiteten Betreff geöffnet
            window.location.href = `mailto:scholzm@me.com?subject=${encodeURIComponent(subject)}`;
        }
    }

    // --- SOUND & ANIMATION ---

    function playSound(audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(error => {
            console.error("Audio konnte nicht abgespielt werden:", error);
        });
    }

    function Particle(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
    }

    Particle.prototype.update = function(index) {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.1; this.life -= 0.02;
        if (this.life <= 0) particles.splice(index, 1);
        ctx.fillStyle = this.color; ctx.globalAlpha = this.life;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill(); ctx.globalAlpha = 1;
    };

    function createFirework(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function triggerSmallFireworks() {
        createFirework(window.innerWidth / 2, window.innerHeight / 3, 50, `hsl(${Math.random() * 360}, 100%, 70%)`);
    }

    function triggerLargeFireworks() {
        const w = window.innerWidth, h = window.innerHeight;
        createFirework(w * 0.2, h * 0.3, 100, 'gold');
        setTimeout(() => createFirework(w * 0.8, h * 0.4, 100, 'cyan'), 300);
        setTimeout(() => createFirework(w * 0.5, h * 0.2, 100, 'magenta'), 600);
    }

    function animateFireworks() {
        requestAnimationFrame(animateFireworks);
        ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(i);
        }
    }

    // --- INITIALISIERUNG ---
    submitButton.addEventListener('click', checkSolution);
    reportErrorButton.addEventListener('click', reportError); // NEU
    solutionInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') checkSolution(); });
    
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        fireworksCanvas.width = window.innerWidth;
        fireworksCanvas.height = window.innerHeight;
    });
    animateFireworks();
    
    initializeGame();
});
