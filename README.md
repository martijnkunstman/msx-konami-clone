# Phoenix Knight

Een verticaal scrollende top-down shooter in de stijl van de Konami-games op MSX/MSX2.
Het spel lijkt op **Knightmare** en heeft invloeden van **Hi no Tori (Firebird)**. De muziek klinkt als de **SCC**-geluidschip.

## Starten

```bash
node tools/serve.js
```

Open daarna http://localhost:8123. Je kunt `index.html` ook direct in de browser openen.

## Besturing

| Toets | Actie |
|---|---|
| Pijltjes / WASD | Lopen |
| Z / Spatie | Schieten (ingedrukt houden = autofire) |
| P / Enter | Pauze |
| M | Geluid aan/uit |
| C | CRT-scanlines aan/uit |

Een gamepad werkt ook.

## Spelregels

- **Knightmare-regel:** het landschap scrolt mee. Als je klem komt te zitten tussen een boom of muur en de onderrand, ga je dood.
- **Kristallen:** schiet op een kristal en het verandert van kleur. Pak het op voor de kracht die bij die kleur hoort:
  - blauw = ARROW
  - rood = FIRE (waaiervuur)
  - groen = BLADE (golf die door vijanden heen gaat)
  - wit = schild
  - geel = snelheid

  Pak je dezelfde wapenkleur nog een keer, dan wordt dat wapen sterker (tot niveau 3).
- **Feniksveren (Hi no Tori):** gouden vuurvogels laten een veer vallen. Met 3 veren word je ongeveer 10 seconden een **feniks**. Je bent dan onkwetsbaar, vliegt over obstakels heen en spuwt vuur.
- **Eindbaas DARK PHOENIX:** hij heeft drie fases (waaiervuur, vleermuizen oproepen, spiraalkogels met een regen van veren). Na de eindbaas volgt de volgende stage, die steeds moeilijker wordt.
- Bij 20.000 punten krijg je een extra leven, daarna elke 60.000 punten.

## Techniek

- `src/audio.js`: SCC-achtige engine.
  - 5 wavetable-kanalen met golfvormen van 32 samples en 8 bit (inclusief de typische 'trapjes'). Daarnaast PSG-ruis voor drums.
  - Een kleine MML-parser en een sequencer met lookahead-scheduling.
  - Alle melodieën zijn origineel. Er zijn tracks voor de stage, de eindbaas, de start, stage clear en game over.
- `src/gfx.js`: MSX-palet en pixel-art sprites als tekststrings. Symmetrische sprites worden gespiegeld. Tiles worden met code gegenereerd.
- `src/game.js`: level-generator (weide, bos, rivier, ruïnes, kasteel en arena), vijanden, eindbaas, HUD en de spelronde.

De resolutie is 256×212 (MSX2), en het beeld wordt met hele factoren vergroot.
