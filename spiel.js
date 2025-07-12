document.addEventListener('DOMContentLoaded', () => {

    // HTML-Elemente
    const stopwatchElement = document.getElementById('stopwatch');
    const stationNameElement = document.getElementById('station-name');
    const stationImageElement = document.getElementById('station-image');
    const imageErrorElement = document.getElementById('image-error');
    const stationDescriptionElement = document.getElementById('station-description');
    const hintBoxes = Array.from(document.querySelectorAll('.hint-box'));
    const progressBar = document.getElementById('hint-progress-bar');
    const progressText = document.getElementById('progress-text');
    const solutionInput = document.getElementById('solution-input');
    const submitButton = document.getElementById('submit-button');
    const reportErrorButton = document.getElementById('report-error-button');
    const stationContent = document.getElementById('station-content');
    const endScreen = document.getElementById('end-screen');
    const finalTimeElement = document.getElementById('final-time');
    const fireworksCanvas = document.getElementById('fireworks-canvas');
    const ctx = fireworksCanvas.getContext('2d');
    const solutionModal = document.getElementById('solution-modal');
    const modalSolutionText = document.getElementById('modal-solution-text');
    const modalCloseButton = document.getElementById('modal-close-button');
    
    // Audio-Elemente
    const soundCorrect = document.getElementById('audio-correct');
    const soundWrong = document.getElementById('audio-wrong');
    const soundWin = document.getElementById('audio-win');

    // Spiel-Variablen
    let particles = [], stations = [], config = {};
    let currentStationIndex = 0, revealedHints = 0, totalSeconds = 0;
    let hintTimer, progressTimer, stopwatchTimer, revealSolutionTimer;
    let secondsLeftForHint;

    // --- FUNKTIONEN ---

    const startStopwatch = () => {
        stopwatchTimer = setInterval(() => {
            totalSeconds++;
            const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
            const s = (totalSeconds % 60).toString().padStart(2, '0');
            stopwatchElement.textContent = `${h}:${m}:${s}`;
        }, 1000);
    };

    const stopStopwatch = () => clearInterval(stopwatchTimer);
    
    const initializeGame = async () => {
        try {
            const configResponse = await fetch('config.json');
            config = configResponse.ok ? await configResponse.json() : { revealSolutionDelaySeconds: 30 };
            const stationsResponse = await fetch('spiel.json');
            if (!stationsResponse.ok) throw new Error('Spieldaten (spiel.json) konnten nicht geladen werden.');
            stations = await stationsResponse.json();
            loadStation(currentStationIndex);
            startStopwatch();
        } catch (error) {
            stationNameElement.textContent = 'Fehler!';
            stationDescriptionElement.textContent = error.message;
        }
    };

    const loadStation = (index) => {
        clearTimeout(revealSolutionTimer);
        clearInterval(hintTimer);
        clearInterval(progressTimer);
        progressBar.classList.remove('reveal-mode');

        if (index >= stations.length) {
            endGame();
            return;
        }
        const station = stations[index];
        stationNameElement.textContent = station.stationsname;
        stationDescriptionElement.textContent = station.beschreibung;
        
        imageErrorElement.style.display = 'none';
        stationImageElement.style.display = (station.stationsbild && station.stationsbild.trim() !== '') ? 'block' : 'none';
        if (stationImageElement.style.display === 'block') {
            stationImageElement.src = `img/${station.stationsbild}`;
        }
        stationImageElement.onerror = () => {
            stationImageElement.style.display = 'none';
            imageErrorElement.textContent = `Bild nicht gefunden. Erwarteter Dateiname: "${station.stationsbild}" im "img"-Ordner.`;
            imageErrorElement.style.display = 'block';
        };

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
    };
    
    const revealHint = () => {
        if (revealedHints >= hintBoxes.length) return;
        
        const station = stations[currentStationIndex];
        const hintKey = `hinweis${revealedHints + 1}`;
        const hintBox = hintBoxes[revealedHints];
        hintBox.querySelector('p').textContent = station[hintKey];
        hintBox.classList.remove('locked');
        hintBox.classList.add('unlocked');
        revealedHints++;

        if (revealedHints === hintBoxes.length) {
            clearInterval(hintTimer);
            clearInterval(progressTimer);
            startRevealSolutionTimer();
        }
    };
    
    const startHintTimer = () => {
        clearInterval(hintTimer);
        clearInterval(progressTimer);
        revealHint();
        if (revealedHints >= hintBoxes.length) return;
        
        const station = stations[currentStationIndex];
        const HINT_INTERVAL = station.hintIntervalSeconds || 120;
        secondsLeftForHint = HINT_INTERVAL;
        
        // Initialer Zustand des Balkens
        progressBar.style.width = '100%';
        
        hintTimer = setInterval(() => {
            revealHint();
            secondsLeftForHint = HINT_INTERVAL;
        }, HINT_INTERVAL * 1000);
        
        progressTimer = setInterval(() => {
            secondsLeftForHint--;
            // KORREKTUR: Breite auf Basis der verbleibenden Zeit berechnen
            progressBar.style.width = `${(secondsLeftForHint / HINT_INTERVAL) * 100}%`;
            progressText.textContent = `Nächster Hinweis in ${secondsLeftForHint}s`;
            if (secondsLeftForHint <= 0) secondsLeftForHint = HINT_INTERVAL;
        }, 1000);
    };

    const startRevealSolutionTimer = () => {
        const REVEAL_DELAY = config.revealSolutionDelaySeconds || 30;
        let secondsLeft = REVEAL_DELAY;
        progressBar.classList.add('reveal-mode');

        // Initialer Zustand des Balkens
        progressBar.style.width = '100%';

        progressTimer = setInterval(() => {
            secondsLeft--;
            // KORREKTUR: Breite auf Basis der verbleibenden Zeit berechnen
            progressBar.style.width = `${(secondsLeft / REVEAL_DELAY) * 100}%`;
            progressText.textContent = `Lösung wird in ${secondsLeft}s angezeigt...`;
            if(secondsLeft <= 0) {
                 clearInterval(progressTimer);
            }
        }, 1000);
        
        revealSolutionTimer = setTimeout(showSolutionModal, REVEAL_DELAY * 1000);
    };
    
    const normalizeString = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').trim();
    };
    
    const checkSolution = () => {
        const station = stations[currentStationIndex];
        const normalizedInput = normalizeString(solutionInput.value);
        const isCheating = normalizedInput === '47110815';
        const isCorrect1 = normalizedInput === normalizeString(station.loesungswort);
        const isCorrect2 = station.loesungswort2 ? normalizedInput === normalizeString(station.loesungswort2) : false;

        if (isCorrect1 || isCorrect2 || isCheating) {
            clearTimeout(revealSolutionTimer);
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
    };
    
    const endGame = () => {
        stopStopwatch();
        stationContent.style.display = 'none';
        endScreen.style.display = 'block';
        finalTimeElement.textContent = stopwatchElement.textContent;
        playSound(soundWin);
        triggerLargeFireworks();
    };

    const reportError = () => {
        if (stations.length > 0 && stations[currentStationIndex]) {
            const stationName = stations[currentStationIndex].stationsname;
            const subject = `Willinghusen Rallye FEHLER: ${stationName}`;
            window.location.href = `mailto:scholzm@me.com?subject=${encodeURIComponent(subject)}`;
        }
    };
    
    const showSolutionModal = () => {
        const station = stations[currentStationIndex];
        modalSolutionText.textContent = station.loesungswort;
        solutionModal.style.display = 'flex';
    };

    const hideSolutionModalAndAdvance = () => {
        solutionModal.style.display = 'none';
        currentStationIndex++;
        loadStation(currentStationIndex);
    };

    const playSound = (audioElement) => {
        audioElement.currentTime = 0;
        audioElement.play().catch(console.error);
    };
    
    function Particle(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
    }
    Particle.prototype.update = function(i) {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.1; this.life -= 0.02;
        if (this.life <= 0) particles.splice(i, 1);
        ctx.fillStyle = this.color; ctx.globalAlpha = this.life;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill(); ctx.globalAlpha = 1;
    };
    const createFirework = (x, y, count, color) => {
        for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
    };
    const triggerSmallFireworks = () => createFirework(window.innerWidth / 2, window.innerHeight / 3, 50, `hsl(${Math.random() * 360}, 100%, 70%)`);
    const triggerLargeFireworks = () => {
        const w = window.innerWidth, h = window.innerHeight;
        createFirework(w * 0.2, h * 0.3, 100, 'gold');
        setTimeout(() => createFirework(w * 0.8, h * 0.4, 100, 'cyan'), 300);
        setTimeout(() => createFirework(w * 0.5, h * 0.2, 100, 'magenta'), 600);
    };
    const animateFireworks = () => {
        requestAnimationFrame(animateFireworks);
        ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        for (let i = particles.length - 1; i >= 0; i--) particles[i].update(i);
    };

    // --- INITIALISIERUNG & EVENT LISTENERS ---
    submitButton.addEventListener('click', checkSolution);
    reportErrorButton.addEventListener('click', reportError);
    modalCloseButton.addEventListener('click', hideSolutionModalAndAdvance);
    solutionInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') checkSolution(); });
    
    window.addEventListener('resize', () => {
        fireworksCanvas.width = window.innerWidth;
        fireworksCanvas.height = window.innerHeight;
    });
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    
    animateFireworks();
    initializeGame();
});