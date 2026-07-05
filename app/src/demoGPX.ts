/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEMO_GPX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<gpx version="1.1" creator="GPX-Standzeit-Generator" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>München Altstadt Rundgang (Demo mit Stopps)</name>
    <desc>Ein Spaziergang durch die Münchener Altstadt mit drei ausgeprägten Standzeiten.</desc>
    <time>2026-06-15T12:00:00Z</time>
  </metadata>
  <trk>
    <name>Tour Altstadt</name>
    <trkseg>
      <!-- --- START: Marienplatz --- -->
      <trkpt lat="48.13715" lon="11.57538">
        <ele>519.0</ele>
        <time>2026-06-15T12:00:00Z</time>
      </trkpt>
      <trkpt lat="48.13716" lon="11.57539">
        <ele>519.1</ele>
        <time>2026-06-15T12:00:15Z</time>
      </trkpt>

      <!-- STOPP 1: Kaffeepause am Marienplatz (Dauer: ~ 6 Minuten) -->
      <!-- Es gibt leichten Jitter/Schwankungen um 1-5 Meter -->
      <trkpt lat="48.13712" lon="11.57540">
        <ele>519.2</ele>
        <time>2026-06-15T12:00:45Z</time>
      </trkpt>
      <trkpt lat="48.13714" lon="11.57542">
        <ele>519.1</ele>
        <time>2026-06-15T12:01:45Z</time>
      </trkpt>
      <trkpt lat="48.13713" lon="11.57539">
        <ele>519.3</ele>
        <time>2026-06-15T12:02:45Z</time>
      </trkpt>
      <trkpt lat="48.13711" lon="11.57541">
        <ele>519.0</ele>
        <time>2026-06-15T12:03:45Z</time>
      </trkpt>
      <trkpt lat="48.13714" lon="11.57540">
        <ele>519.2</ele>
        <time>2026-06-15T12:04:45Z</time>
      </trkpt>
      <trkpt lat="48.13713" lon="11.57541">
        <ele>519.1</ele>
        <time>2026-06-15T12:05:45Z</time>
      </trkpt>
      <trkpt lat="48.13712" lon="11.57542">
        <ele>519.2</ele>
        <time>2026-06-15T12:06:45Z</time>
      </trkpt>

      <!-- Bewegung zum Viktualienmarkt -->
      <trkpt lat="48.13670" lon="11.57551">
        <ele>519.0</ele>
        <time>2026-06-15T12:07:30Z</time>
      </trkpt>
      <trkpt lat="48.13601" lon="11.57582">
        <ele>518.9</ele>
        <time>2026-06-15T12:08:15Z</time>
      </trkpt>
      <trkpt lat="48.13540" lon="11.57599">
        <ele>518.7</ele>
        <time>2026-06-15T12:09:00Z</time>
      </trkpt>
      <trkpt lat="48.13512" lon="11.57612">
        <ele>518.5</ele>
        <time>2026-06-15T12:09:45Z</time>
      </trkpt>

      <!-- STOPP 2: Pause am Viktualienmarkt (Dauer: ~ 12 Minuten) -->
      <!-- GPS Drift-Simulation zwischen 10 und 15 Meter -->
      <trkpt lat="48.13511" lon="11.57610">
        <ele>518.5</ele>
        <time>2026-06-15T12:10:45Z</time>
      </trkpt>
      <trkpt lat="48.13510" lon="11.57613">
        <ele>518.6</ele>
        <time>2026-06-15T12:11:45Z</time>
      </trkpt>
      <trkpt lat="48.13514" lon="11.57611">
        <ele>518.4</ele>
        <time>2026-06-15T12:12:45Z</time>
      </trkpt>
      <!-- Kleiner Ausreißer/Schritt -->
      <trkpt lat="48.13519" lon="11.57615">
        <ele>518.5</ele>
        <time>2026-06-15T12:13:45Z</time>
      </trkpt>
      <trkpt lat="48.13513" lon="11.57608">
        <ele>518.7</ele>
        <time>2026-06-15T12:14:45Z</time>
      </trkpt>
      <trkpt lat="48.13511" lon="11.57612">
        <ele>518.5</ele>
        <time>2026-06-15T12:16:45Z</time>
      </trkpt>
      <trkpt lat="48.13512" lon="11.57613">
        <ele>518.4</ele>
        <time>2026-06-15T12:18:45Z</time>
      </trkpt>
      <trkpt lat="48.13510" lon="11.57611">
        <ele>518.5</ele>
        <time>2026-06-15T12:20:45Z</time>
      </trkpt>
      <trkpt lat="48.13512" lon="11.57612">
        <ele>518.5</ele>
        <time>2026-06-15T12:22:15Z</time>
      </trkpt>

      <!-- Bewegung zum Hofbräuhaus -->
      <trkpt lat="48.13580" lon="11.57710">
        <ele>518.6</ele>
        <time>2026-06-15T12:23:00Z</time>
      </trkpt>
      <trkpt lat="48.13630" lon="11.57805">
        <ele>518.8</ele>
        <time>2026-06-15T12:24:00Z</time>
      </trkpt>
      <trkpt lat="48.13708" lon="11.57890">
        <ele>518.9</ele>
        <time>2026-06-15T12:25:00Z</time>
      </trkpt>
      <trkpt lat="48.13758" lon="11.58012">
        <ele>519.2</ele>
        <time>2026-06-15T12:26:00Z</time>
      </trkpt>

      <!-- STOPP 3: Einkehr im Hofbräuhaus (Dauer: ~ 10 Minuten) -->
      <trkpt lat="48.13760" lon="11.58014">
        <ele>519.2</ele>
        <time>2026-06-15T12:27:00Z</time>
      </trkpt>
      <trkpt lat="48.13757" lon="11.58010">
        <ele>519.3</ele>
        <time>2026-06-15T12:28:30Z</time>
      </trkpt>
      <!-- GPS Spike Simulation: Springt kurz 80 Meter nach Norden und springt sofort zurück -->
      <trkpt lat="48.13830" lon="11.58011">
        <ele>521.0</ele>
        <time>2026-06-15T12:29:00Z</time>
      </trkpt>
      <trkpt lat="48.13759" lon="11.58013">
        <ele>519.2</ele>
        <time>2026-06-15T12:29:30Z</time>
      </trkpt>
      <trkpt lat="48.13758" lon="11.58011">
        <ele>519.4</ele>
        <time>2026-06-15T12:31:30Z</time>
      </trkpt>
      <trkpt lat="48.13761" lon="11.58015">
        <ele>519.3</ele>
        <time>2026-06-15T12:34:00Z</time>
      </trkpt>
      <trkpt lat="48.13757" lon="11.58012">
        <ele>519.2</ele>
        <time>2026-06-15T12:36:00Z</time>
      </trkpt>

      <!-- Bewegung zurück zum Ausgangspunkt -->
      <trkpt lat="48.13775" lon="11.57860">
        <ele>519.1</ele>
        <time>2026-06-15T12:37:30Z</time>
      </trkpt>
      <trkpt lat="48.13750" lon="11.57680">
        <ele>519.0</ele>
        <time>2026-06-15T12:39:00Z</time>
      </trkpt>
      <trkpt lat="48.13715" lon="11.57538">
        <ele>519.0</ele>
        <time>2026-06-15T12:40:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>
`;
