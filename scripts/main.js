// --- CONSTANTS ---
const MODULE_ID = "grimoires-data-hud";

// --- INIT: REGISTER SETTINGS ---
Hooks.once("init", () => {
    // 1. Master Switch
    game.settings.register(MODULE_ID, "enableHUD", {
        name: "Enable HUD",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
        onChange: value => { value ? ui.grimoireHUD?.create() : ui.grimoireHUD?.remove(); }
    });

    // 2. Visual Options
    const toggles = ["showLocation", "showDate", "showWeather", "showMoons"];
    toggles.forEach(t => {
        game.settings.register(MODULE_ID, t, {
            name: `Show ${t.replace("show", "")}`,
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: () => ui.grimoireHUD?.update()
        });
    });

    // 3. Moon Configuration (Hidden JSON)
    game.settings.register(MODULE_ID, "moonConfig", {
        scope: "world",
        config: false,
        type: String,
        default: JSON.stringify([
            { name: "Luna", cycleDays: 29.5, color: "#ffffff" }
        ])
    });
    
    // 4. Calendar Settings
    game.settings.register(MODULE_ID, "currentYear", { name: "Current Year", scope: "world", config: true, type: Number, default: 1492 });
    game.settings.register(MODULE_ID, "eraSuffix", { name: "Era Suffix", scope: "world", config: true, type: String, default: "DR" });
    game.settings.register(MODULE_ID, "monthNames", { name: "Month Names (comma separated)", scope: "world", config: true, type: String, default: "Hammer, Alturiak, Ches, Tarsakh, Mirtul, Kythorn, Flamerule, Eleasis, Eleint, Marpenoth, Uktar, Nightal" });
});

// --- SETUP: API ---
Hooks.once("setup", () => {
    const moduleData = game.modules.get(MODULE_ID);
    moduleData.api = {
        refresh: () => ui.grimoireHUD?.update(),
        override: (key, value) => ui.grimoireHUD?.setOverride(key, value),
        flashMessage: (msg) => ui.grimoireHUD?.flashMessage(msg)
    };
});

// --- READY: LAUNCH ---
Hooks.once("ready", () => {
    if (game.settings.get(MODULE_ID, "enableHUD")) {
        ui.grimoireHUD = new HUD();
        ui.grimoireHUD.create();
    }
});

// --- THE CLASS ---
class HUD {
    constructor() {
        this.elementId = "grimoire-hud";
        this.overrides = {};
    }

    create() {
        if (document.getElementById(this.elementId)) return;
        const hudDiv = document.createElement("div");
        hudDiv.id = this.elementId;
        document.body.appendChild(hudDiv);
        
        this.update();
        
        // Triggers
        Hooks.on("updateWorldTime", () => this.update());
        Hooks.on("updateScene", () => this.update());
        Hooks.on("controlToken", () => this.update());
        Hooks.on("updateToken", (token, changes) => { if (changes.x || changes.y) this.update(); });
    }

    remove() {
        const el = document.getElementById(this.elementId);
        if (el) el.remove();
    }

    setOverride(key, value) {
        if (value === null) delete this.overrides[key];
        else this.overrides[key] = value;
        this.update();
    }

    flashMessage(msg) {
        this.setOverride("date", msg);
        setTimeout(() => { this.setOverride("date", null); }, 3000);
    }

    update() {
        const el = document.getElementById(this.elementId);
        if (!el) return;
        
        // 1. Gather Data
        const location = this.overrides.location || this.getLocation();
        const date = this.overrides.date || this.getFantasyDate(game.time.worldTime);
        const weather = this.overrides.weather || canvas.scene?.weather || "Clear";
        
        // 2. Render HTML
        el.innerHTML = `
            <div class="hud-box">
                <div class="hud-content">
                    ${game.settings.get(MODULE_ID, "showLocation") ? `<div class="hud-section location">📍 ${location}</div>` : ""}
                    ${game.settings.get(MODULE_ID, "showDate") ? `<div class="hud-section date">📅 ${date}</div>` : ""}
                    ${game.settings.get(MODULE_ID, "showWeather") ? `<div class="hud-section weather">🌤️ ${weather}</div>` : ""}
                </div>
            </div>
        `;
    }

    getLocation() {
        let loc = canvas.scene?.navName || canvas.scene?.name || "Unknown";
        const token = canvas.tokens.controlled[0];
        
        // --- V13 SAFE REGION CHECK ---
        if (token && canvas.regions) {
            const point = { x: token.center.x, y: token.center.y, elevation: token.document.elevation };
            // Check r.document.testPoint (The correct V13 way)
            const region = canvas.regions.placeables.find(r => r.document && r.document.testPoint(point));
            if (region) loc = region.document.name;
        }
        return loc;
    }

    getFantasyDate(seconds) {
        // Use SimpleCalendar if available
        if (window.SimpleCalendar?.api) {
            const ts = window.SimpleCalendar.api.timestampToDate(seconds);
            return `${ts.monthName} ${ts.day}, ${ts.year}`;
        }
        
        // Fallback Calculation
        const monthString = game.settings.get(MODULE_ID, "monthNames");
        const months = monthString.split(",").map(s => s.trim());
        const daysPerMonth = 30; // Simple fallback
        const daysPerYear = months.length * daysPerMonth;
        
        const totalDays = Math.floor(seconds / 86400);
        const year = game.settings.get(MODULE_ID, "currentYear") + Math.floor(totalDays / daysPerYear);
        const dayOfYear = totalDays % daysPerYear;
        const monthIndex = Math.floor(dayOfYear / daysPerMonth);
        const day = (dayOfYear % daysPerMonth) + 1;
        
        return `${day} ${months[monthIndex] || "Unknown"}, ${year} ${game.settings.get(MODULE_ID, "eraSuffix")}`;
    }
}