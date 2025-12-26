# ioBroker.duofern

Adapter der Rademacher DuoFern Geräte über DuoFern USB Stick verbindet.

## Installation

1. Installiere den Adapter über die ioBroker Admin-Oberfläche
2. Konfiguriere die serielle Schnittstelle und den Stick-Code
3. Starte den Adapter

## Konfiguration

### Serielle Schnittstelle

Gib den Pfad zur seriellen Schnittstelle an, an der dein DuoFern USB-Stick angeschlossen ist:

- Linux: `/dev/ttyUSB0` oder `/dev/serial/by-id/...`
- Windows: `COM1`, `COM2`, etc.

**Beispiel**: `/dev/serial/by-id/usb-Rademacher_DuoFern_USB-Stick_WR03XXXX-if00-port0`

**Tipp**: Unter Linux wird dringend empfohlen, den Pfad unter `/dev/serial/by-id/` anstelle von `/dev/ttyUSB0` zu verwenden, da dieser persistent und über Neustarts hinweg stabiler ist. Verwende `ls -l /dev/serial/by-id/`, um den korrekten Pfad zu finden.

### DuoFern Stick Code

Gib den 6-stelligen Hexadezimalcode deines DuoFern Sticks ein:

- Muss mit `6F` beginnen
- Die letzten 4 Ziffern sind frei konfigurierbar (z.B. `6F1234`)

## Unterstützte Geräte

- **Rollläden/Markisen**: Grundsteuerung (hoch, runter, stopp, Position, andere Befehle funktionieren möglicherweise, sind aber ungetestet)
  - _Hinweis: Dieser Adapter wurde bisher nur mit Rollläden/Jalousien getestet._

## Verwendung

1. Aktiviere den Pairing-Modus mit der `pair` Schaltfläche im Adapter
2. Aktiviere den Pairing-Modus an deinem DuoFern Gerät (siehe Gerätehandbuch)
3. Das Gerät sollte automatisch im Objektbaum erscheinen
4. Steuere Geräte über die erstellten Datenpunkte

## Fehlerbehebung

### Gerät nicht gefunden

- Überprüfe Pfad und Berechtigungen der seriellen Schnittstelle
- Stelle sicher, dass der Stick-Code korrekt ist
- Vergewissere dich, dass der USB-Stick richtig angeschlossen ist

### Gerät reagiert nicht

- Prüfe, ob sich das Gerät in Funkreichweite befindet
- Überprüfe, ob das Gerät ordnungsgemäß gekoppelt ist
- Überprüfe die Adapter-Logs auf Fehlermeldungen

## Danksagung

- **FHEM**: Dieser Adapter ist vom DuoFern-Modul für FHEM inspiriert. Weitere Details zum DuoFern-Protokoll findest du im [FHEM Wiki](https://wiki.fhem.de/wiki/Rademacher_DuoFern).

## Entwicklung

Siehe die [README.md](../../README.md) für Entwicklungsinformationen.
