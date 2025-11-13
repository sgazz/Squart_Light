# Change: Introduce story mode framework with city progression

## Why
Players now perceive Squart kao mrežu gradskih kvartova, pa nam je potreban narativni okvir koji prikazuje gradove, njihovu mapu i status osvojenih kvartova. Takođe želimo da kvartovi (table) podrže specifične oblike koji bolje predstavljaju stvarne gradske blokove.

## What Changes
- Dodavanje novog story-mode capability-ja sa gradovima, kvartovima i narativnim brifinzima.
- Panel za grad mora prikazivati mapu grada sa označenim kvartovima i statusom (npr. zvezdice).
- Definisanje strukture podataka za kvartove, uključujući različite forme tabli preko layout maski.
- Proširenje board generation specifikacije da prihvati prilagođene maske kako bi tabla mogla da bude ne-kvadratna.

## Impact
- Affected specs: `story-mode`, `game-board`
- Affected code: `src/main.js`, `index.html`, `src/game/board.js`, `src/three/boardRenderer.js`, novi fajlovi za definicije gradova/kampanje

