export const MODULE_ID = "grimoires-data-hud";

export function registerSettings() {
    // --- DISPLAY SETTINGS ---
    game.settings.register(MODULE_ID, "enableHUD", {
        name: "Enable HUD",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: value => { 
            if (value) ui.grimoireHUD?.create(); 
            else ui.grimoireHUD?.remove(); 
        }
    });

    game.settings.register(MODULE_ID, "theme", {
        name: "Visual Theme",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "glass": "Mana Glass (Blue Gradient)",
            "parchment": "Old Parchment (Paper)",
            "solid": "Solid Contrast (Black/White)"
        },
        default: "glass",
        onChange: () => ui.grimoireHUD?.update()
    });

    game.settings.register(MODULE_ID, "compactMode", {
        name: "Compact Mode",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => ui.grimoireHUD?.update()
    });

    game.settings.register(MODULE_ID, "showWorldName", {
        name: "Show World Name",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => ui.grimoireHUD?.update()
    });

    // --- WIDGET TOGGLES ---
    game.settings.register(MODULE_ID, "showLocation", { name: "Show Location", scope: "client", config: true, type: Boolean, default: true, onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "showWeather", { name: "Show Weather", scope: "client", config: true, type: Boolean, default: true, onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "showMoons", { name: "Show Moons", scope: "client", config: true, type: Boolean, default: true, onChange: () => ui.grimoireHUD?.update() });
    
    // NEW TOGGLES
    game.settings.register(MODULE_ID, "showCombat", { name: "Show Combat State", hint: "Replaces Date with Round Counter during combat.", scope: "client", config: true, type: Boolean, default: true, onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "showLighting", { name: "Show Lighting Level", hint: "Displays Bright/Dim/Dark status.", scope: "client", config: true, type: Boolean, default: true, onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "showMusic", { name: "Show Now Playing", hint: "Displays active music track.", scope: "client", config: true, type: Boolean, default: true, onChange: () => ui.grimoireHUD?.update() });

    // --- CALENDAR SETTINGS ---
    game.settings.register(MODULE_ID, "currentYear", { name: "Current Year", scope: "world", config: true, type: Number, default: 1492, onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "eraSuffix", { name: "Era Suffix", scope: "world", config: true, type: String, default: "DR", onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "monthNames", { name: "Month Names", scope: "world", config: true, type: String, default: "Hammer, Alturiak, Ches, Tarsakh, Mirtul, Kythorn, Flamerule, Eleasis, Eleint, Marpenoth, Uktar, Nightal", onChange: () => ui.grimoireHUD?.update() });
    game.settings.register(MODULE_ID, "daysInMonth", { name: "Days per Month", scope: "world", config: true, type: Number, default: 30, onChange: () => ui.grimoireHUD?.update() });

    // --- MOON CONFIGURATION ---
    game.settings.register(MODULE_ID, "moonConfig", {
        name: "Moon Configuration (JSON)",
        scope: "world",
        config: true,
        type: String,
        default: JSON.stringify([
            { name: "Luna",     cycleDays: 29.5, color: "#e0e0e0", phaseOffset: 0 },
            { name: "Celestia", cycleDays: 7.0,  color: "#aaffaa", phaseOffset: 0.5 },
            { name: "Umbra",    cycleDays: 400,  color: "#aa00ff", phaseOffset: 0.25 }
        ]),
        onChange: () => ui.grimoireHUD?.update()
    });
}