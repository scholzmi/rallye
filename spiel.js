// Warten, bis das gesamte HTML-Dokument geladen ist
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
    
    const stationContent = document.getElementById('station-content');
    const endScreen = document.getElementById('end-screen');
    const finalTimeElement = document.getElementById('final-time');

    // Spielzustand & Konfiguration
    let stations = [];
    let config = {}; // NEU: Leeres Objekt für Konfigurationsdaten
    let currentStationIndex = 0;
    let revealedHints = 0;
    
    // Timer-Variablen
    let hintTimer;
    let progressTimer;
    let secondsLeftForHint;

    // Stoppuhr-Variablen
    let totalSeconds = 0;
    let stopwatchTimer;

    // --- STOPPUHR FUNKTIONEN ---
    function startStopwatch() {
        stopwatchTimer = setInterval(() => {
            totalSeconds++;
            const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
            const seconds = (totalSeconds % 60).toString().padStart(2, '0');
            stopwatchElement.textContent = `${hours}:${minutes}:${seconds}`;
        }, 1000);
    }

    function stopStopwatch() {
        clearInterval(stopwatchTimer);
    }
    
    // --- SPIELLOGIK ---

    // NEU: Haupt-Initialisierungsfunktion
    async function initializeGame() {
        try {
            // Zuerst die Konfiguration laden
            const configResponse = await fetch('config.json');
            if (configResponse.ok) {
                config = await configResponse.json();
            } else {
                // Fallback, wenn config.json nicht gefunden wird
                console.warn('config.json nicht gefunden. Benutze Standardwerte.');
                config = { hintIntervalSeconds: 120 };
            }

            // Danach die Stationsdaten laden
            const stationsResponse = await fetch('spiel.json');
            if (!stationsResponse.ok) {
                throw new Error('Die Spieldaten (spiel.json) konnten nicht geladen werden.');
            }
            stations = await stationsResponse.json();

            // Spiel mit der ersten Station starten
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
        
        if (station.stationsbild && station.stationsbild.trim() !== '') {
            stationImageElement.src = `img/${station.stationsbild}`;
            stationImageElement.style.display = 'block';
        } else {
            stationImageElement.style.display = 'none';
        }
        stationImageElement.onerror = () => {
            stationImageElement.src = 'img/hintergrund_startseite.jpg';
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
        
        // NEU: Intervall aus der Konfiguration lesen
        const HINT_INTERVAL_SECONDS = config.hintIntervalSeconds || 120;
        secondsLeftForHint = HINT_INTERVAL_SECONDS;

        hintTimer = setInterval(() => {
            revealHint();
            secondsLeftForHint = HINT_INTERVAL_SECONDS;
            if (revealedHints >= hintBoxes.length) clearInterval(hintTimer);
        }, HINT_INTERVAL_SECONDS * 1000);
        
        progressTimer = setInterval(() => {
            secondsLeftForHint--;
            const progressPercentage = (secondsLeftForHint / HINT_INTERVAL_SECONDS) * 100;
            progressBar.style.width = `${100 - progressPercentage}%`;
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
        if (!str) return ''; // Absicherung gegen null oder undefined
        return str
            .toLowerCase()
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .trim();
    }
    
    function checkSolution() {
        const station = stations[currentStationIndex];
        const normalizedInput = normalizeString(solutionInput.value);

        const isCheating = normalizedInput === '47110815';
        
        const isCorrect1 = normalizedInput === normalizeString(station.loesungswort);
        
        let isCorrect2 = false;
        if (station.loesungswort2 && station.loesungswort2.trim() !== '') {
            isCorrect2 = normalizedInput === normalizeString(station.loesungswort2);
        }

        if (isCorrect1 || isCorrect2 || isCheating) {
            currentStationIndex++;
            loadStation(currentStationIndex);
        } else {
            solutionInput.style.animation = 'shake 0.5s';
            setTimeout(() => {
                solutionInput.style.animation = '';
            }, 500);
        }
    }
    
    function endGame() {
        stopStopwatch();
        stationContent.style.display = 'none';
        endScreen.style.display = 'block';
        finalTimeElement.textContent = stopwatchElement.textContent;
    }

    submitButton.addEventListener('click', checkSolution);
    solutionInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') checkSolution();
    });

    // Das Spiel über die neue Funktion starten
    initializeGame();
});
