// Warten, bis das gesamte HTML-Dokument geladen ist
document.addEventListener('DOMContentLoaded', () => {

    // HTML-Elemente für den Zugriff speichern
    const stopwatchElement = document.getElementById('stopwatch');
    const stationNameElement = document.getElementById('station-name');
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

    // Spielzustand
    let stations = [];
    let currentStationIndex = 0;
    let revealedHints = 0;
    
    // Timer-Variablen
    const HINT_INTERVAL_SECONDS = 120; // 2 Minuten
    let hintTimer;
    let progressTimer;
    let secondsLeftForHint = HINT_INTERVAL_SECONDS;

    // Stoppuhr-Variablen
    let totalSeconds = 0;
    let stopwatchTimer;

    // --- STOPPUHR FUNKTIONEN ---
    function startStopwatch() {
        stopwatchTimer = setInterval(() => {
            totalSeconds++;
            // Formatieren und Anzeigen der Zeit
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

    // Funktion zum Laden der Stationsdaten aus der JSON-Datei
    async function fetchStations() {
        try {
            const response = await fetch('spiel.json');
            if (!response.ok) {
                throw new Error('Die Spieldaten (spiel.json) konnten nicht geladen werden.');
            }
            stations = await response.json();
            // Startet das Spiel mit der ersten Station
            loadStation(currentStationIndex);
            startStopwatch();
        } catch (error) {
            stationNameElement.textContent = 'Fehler!';
            stationDescriptionElement.textContent = error.message;
        }
    }

    // Funktion zum Laden und Anzeigen einer Station
    function loadStation(index) {
        if (index >= stations.length) {
            // Spiel beendet
            endGame();
            return;
        }

        const station = stations[index];
        stationNameElement.textContent = station.stationsname;
        stationDescriptionElement.textContent = station.beschreibung;
        
        // Zurücksetzen der Hinweise und des Eingabefeldes
        revealedHints = 0;
        hintBoxes.forEach((box, i) => {
            box.classList.add('locked');
            box.classList.remove('unlocked');
            // Der Text der Hinweise wird erst beim Aufdecken gesetzt
            box.querySelector('p').textContent = `Hinweis ${i + 1}`;
        });
        solutionInput.value = '';
        solutionInput.disabled = false;
        submitButton.disabled = false;

        // Startet den Timer für den ersten Hinweis
        startHintTimer();
    }
    
    // Funktion zum Aufdecken eines Hinweises
    function revealHint() {
        if (revealedHints >= hintBoxes.length) {
             // Alle Hinweise aufgedeckt, Timer stoppen
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
    
    // Funktion zum Starten des Hinweis-Timers
    function startHintTimer() {
        // Bestehende Timer löschen
        clearInterval(hintTimer);
        clearInterval(progressTimer);

        // Sofort den ersten Hinweis aufdecken
        revealHint();

        // Wenn alle Hinweise aufgedeckt sind, keinen neuen Timer starten
        if (revealedHints >= hintBoxes.length) {
            return;
        }
        
        secondsLeftForHint = HINT_INTERVAL_SECONDS;
        
        // Haupt-Timer, der alle 2 Minuten einen Hinweis aufdeckt
        hintTimer = setInterval(() => {
            revealHint();
            secondsLeftForHint = HINT_INTERVAL_SECONDS; // Timer zurücksetzen
            if (revealedHints >= hintBoxes.length) {
                 clearInterval(hintTimer); // Stoppen, wenn alle aufgedeckt sind
            }
        }, HINT_INTERVAL_SECONDS * 1000);
        
        // Timer für den Fortschrittsbalken, der jede Sekunde läuft
        progressTimer = setInterval(() => {
            secondsLeftForHint--;
            const progressPercentage = (secondsLeftForHint / HINT_INTERVAL_SECONDS) * 100;
            progressBar.style.width = `${100 - progressPercentage}%`;
            progressText.textContent = `Nächster Hinweis in ${secondsLeftForHint}s`;

            if (secondsLeftForHint <= 0) {
                 secondsLeftForHint = HINT_INTERVAL_SECONDS;
            }
            if (revealedHints >= hintBoxes.length) {
                clearInterval(progressTimer);
                progressBar.style.width = '0%';
                progressText.textContent = 'Alle Hinweise aufgedeckt!';
            }
        }, 1000);
    }
    
    // Funktion zum Prüfen der Antwort
    function checkSolution() {
        const station = stations[currentStationIndex];
        const userInput = solutionInput.value.trim().toLowerCase();
        
        if (userInput === station.loesungswort.toLowerCase()) {
            // Richtige Antwort
            currentStationIndex++;
            loadStation(currentStationIndex);
        } else {
            // Falsche Antwort
            solutionInput.style.animation = 'shake 0.5s';
            // Animation nach Ablauf entfernen
            setTimeout(() => {
                solutionInput.style.animation = '';
            }, 500);
        }
    }
    
    // Funktion zum Beenden des Spiels
    function endGame() {
        stopStopwatch();
        stationContent.style.display = 'none';
        endScreen.style.display = 'block';
        finalTimeElement.textContent = stopwatchElement.textContent;
    }

    // Event Listener für den Weiter-Button
    submitButton.addEventListener('click', checkSolution);
    // Erlaubt das Absenden mit der Enter-Taste
    solutionInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            checkSolution();
        }
    });

    // Das Spiel initialisieren
    fetchStations();
});
