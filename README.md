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
- **Power-ups zijn permanent:** wapen, wapenniveau, snelheid en schild blijven behouden, ook als je doodgaat. Het schild slijt nooit: het vangt elke treffer op. Alleen als het landschap je tegen de onderrand klemt, ga je nog dood.
- **Feniksveren (Hi no Tori):** gouden vuurvogels laten een veer vallen. Met 3 veren word je ongeveer 10 seconden een **feniks**. Je bent dan onkwetsbaar, vliegt over obstakels heen en spuwt vuur.
- Bij 20.000 punten krijg je een extra leven, daarna elke 60.000 punten.
- **Cheat:** houd **G** 5 seconden ingedrukt voor oneindige levens.

## Stages

De stages wisselen elkaar af en worden steeds moeilijker:

| Stage | Wereld | Vijanden | Eindbaas |
|---|---|---|---|
| 1, 3, 5… | **The Enchanted Woods**: weides, bos, rivieren, ruïnes, kasteel | vleermuizen, slijmen, skeletten, ridders, tovenaars | **DARK PHOENIX**: waaiervuur, roept vleermuizen op, spiraalkogels en een regen van veren |
| 2, 4, 6… | **The Land of Fire**: as, rotsblokken, lavastromen, tempels, vesting | vuurimps, lavagolems, vuurslangen, vlammende schedels | **MAGMA SERPENT**: een slang met een lijf van segmenten (het lijf blokkeert je schoten, alleen de kop is kwetsbaar), vuuradem, segmenten die schieten, en vallende rotsen |

Elke wereld heeft eigen SCC-muziek voor de stage en voor de eindbaas.

## Techniek

- `src/audio.js`: SCC-achtige engine.
  - 5 wavetable-kanalen met golfvormen van 32 samples en 8 bit (inclusief de typische 'trapjes'). Daarnaast PSG-ruis voor drums.
  - Een kleine MML-parser en een sequencer met lookahead-scheduling.
  - Alle melodieën zijn origineel: twee stagethema's, twee eindbaasthema's, en deuntjes voor de start, stage clear en game over.
- `src/gfx.js`: graphics in het **MSX2-palet** (9-bit RGB, 512 kleuren).
  - Pixel-art sprites als tekststrings, met een donkere omlijning. Symmetrische sprites worden gespiegeld.
  - Twee tilesets die met code gegenereerd worden.
  - Het level wordt vooraf getekend, met geditherde slagschaduwen, oevers en bruggen met relingen.
- `src/game.js`: level-generator per thema, vijanden, beide eindbazen, HUD en de spelronde.

De resolutie is 256×212 (MSX2), en het beeld wordt met hele factoren vergroot.
