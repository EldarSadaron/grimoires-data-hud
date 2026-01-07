# Grimoire's Data HUD

![Foundry v13](https://img.shields.io/badge/Foundry-v13-orange) ![Version](https://img.shields.io/badge/Version-1.0.0-blue)

A "Quality of Life" dashboard for Foundry VTT that acts as a central command center for your world's environment. 

Unlike standard calendar modules, Grimoire's HUD is designed to be a **passive, immersive display** that reacts to the game state automatically. It tracks Time, celestial cycles (Moons), Weather, Lighting, and even Combat turns.

## Features

* **📍 Hybrid GPS:** Automatically displays the current **Scene Name**. If a token enters a V13 **Region**, the HUD updates to show that specific location (e.g., "Throne Room").
* **⚔️ Active Combat Tracker:** When combat starts, the Date is replaced by a pulsing **Turn Tracker** showing the current active combatant.
* **🌑 Multi-Moon Engine:** accurately tracks multiple moons with different orbital periods and colors.
* **🎵 Now Playing:** A scrolling ticker displays the active music track.
* **💡 Ambience Sensors:** Detects if the scene is Bright, Dim, or Dark based on lighting settings.
* **🎨 Visual Themes:** Choose between **Mana Glass** (Fantasy UI), **Parchment** (Paper), or **Solid** (High Contrast).
* **🤖 Developer API:** Full macro support to force-override data for cutscenes or dream sequences.

## Installation

1.  Copy the Manifest URL (Coming soon).
2.  Paste into Foundry VTT > Install Module.
3.  Enable "Grimoire's Data HUD" in your world.

## Configuration

Go to **Game Settings > Configure Settings > Module Settings** to customize:

### The Moon System
The module uses a JSON configuration to define your world's moons. 
* **cycleDays:** How long (in game days) from New Moon to New Moon.
* **phaseOffset:** (0.0 to 1.0) shifts the starting phase. 0 = New, 0.5 = Full.

**Example Config:**
```json
[
  { "name": "Luna", "cycleDays": 29.5, "color": "#e0e0e0", "phaseOffset": 0 },
  { "name": "Celestia", "cycleDays": 7.0, "color": "#aaffaa", "phaseOffset": 0.5 },
  { "name": "Umbra", "cycleDays": 400, "color": "#aa00ff", "phaseOffset": 0.25 }
]

World Calendar

Set your Current Year, Era Suffix (e.g., DR), and Month Names directly in the settings menu.
API & Macros

Grimoire exposes an API for advanced users who want to control the HUD via Macros or other modules.

Access the API:
const hud = game.modules.get("grimoires-data-hud").api;

Commands:

    hud.refresh() - Force a re-render.

    hud.override(key, value) - Lock a specific field to a custom value.

        Keys: "location", "weather", "date".

        Pass null as the value to release the override and return to auto-detection.

    hud.flashMessage(text) - Flashes a warning message in the Date slot for 3 seconds.

Example Cutscene Macro:
// Force the location to "The Void" and flash a warning
const hud = game.modules.get("grimoires-data-hud").api;
hud.override("location", "The Void");
hud.flashMessage("⚠️ REALITY FRACTURED ⚠️");

// Reset after 10 seconds
setTimeout(() => {
    hud.override("location", null);
}, 10000);

Credits

    Author: Eldar

    Development Assistance: Generated with the assistance of AI (Google Gemini).

    License: MIT