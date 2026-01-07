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

    // 2. Visual Theme (CRITICAL for your CSS)
    game.settings.register(MODULE_ID, "theme", {
        name: "HUD Theme",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "glass": "Mana Glass (Blue)",
            "parchment": "Old Parchment",
            "solid": "High Contrast (B&W)"
        },
        default: "glass",
        onChange: () => ui.grimoireHUD?.update()
    });

    // 3. Toggles
    ["showLocation", "showDate", "showWeather", "showMoons", "showCombat", "showLighting", "showMusic", "showWorldName"].forEach(t => {
        game.settings.register(MODULE_ID, t, {
            name: `Show ${t.replace("show", "")}`,
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: () => ui.grimoireHUD?.update()
        });
    });

    game.settings.register(MODULE_ID, "compactMode", {
        name: "Compact Mode",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => ui.grimoireHUD?.update()
    });

    // 4. Moon Config
    game.settings.register(MODULE_ID, "moonConfig", {
        scope: "world",
        config: false,
        type: String,
        default: JSON.stringify([{ name: "Luna", cycleDays: 29.5, color: "#e0e0e0" }])
    });
    
    // 5. Calendar Settings
    game.settings.register(MODULE_ID, "currentYear", { name: "Current Year", scope: "world", config: true, type: Number, default: 1492 });
    game.settings.register(MODULE_ID, "eraSuffix", { name: "Era Suffix", scope: "world", config: true, type: String, default: "DR" });
    game.settings.register(MODULE_ID, "monthNames", { name: "Month Names", scope: "world", config: true, type: String, default: "Hammer, Alturiak, Ches, Tarsakh, Mirtul, Kythorn, Flamerule, Eleasis, Eleint, Marpenoth, Uktar, Nightal" });
});

// --- SETUP ---
Hooks.once("setup", () => {
    const moduleData = game.modules.get(MODULE_ID);
    moduleData.api = {
        refresh: () => ui.grimoireHUD?.update(),
        override: (key, value) => ui.grimoireHUD?.setOverride(key, value),
        flashMessage: (msg) => ui.grimoireHUD?.flashMessage(msg)
    };
    Hooks.callAll("grimoireHudReady", moduleData.api);
});

// --- READY ---
Hooks.once("ready", () => {
    if (game.settings.get(MODULE_ID, "enableHUD")) {
        ui.grimoireHUD = new HUD();
        ui.grimoireHUD.create();
    }
});

// --- MAIN CLASS ---
class HUD {
    constructor() {
        this.elementId = "grimoire-hud";
        this.overrides = {};
        this.isMinified = false;
    }

    create() {
        if (document.getElementById(this.elementId)) return;
        const hudDiv = document.createElement("div");
        hudDiv.id = this.elementId;
        document.body.appendChild(hudDiv);
        
        // Restore Position
        const savedPos = localStorage.getItem(`${MODULE_ID}-pos`);
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            hudDiv.style.top = pos.top + "px";
            hudDiv.style.left = pos.left + "px";
        }

        this.update();
        this.makeDraggable(hudDiv);
        this.activateListeners(hudDiv);
        
        const triggers = ["updateWorldTime", "updateScene", "controlToken", "updateCombat", "deleteCombat", "createCombat", "lightingRefresh", "updatePlaylist", "updatePlaylistSound"];
        triggers.forEach(h => Hooks.on(h, () => this.update()));
        Hooks.on("updateToken", (token, changes) => { if (changes.x || changes.y) this.update(); });
    }

    remove() {
        const el = document.getElementById(this.elementId);
        if (el) el.remove();
    }

    activateListeners(html) {
        html.addEventListener("dblclick", (e) => {
            if (e.target.closest(".hud-header")) {
                this.isMinified = !this.isMinified;
                this.update();
            }
        });
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

        // Settings Map
        const s = {
            loc: game.settings.get(MODULE_ID, "showLocation"),
            date: game.settings.get(MODULE_ID, "showDate"),
            weather: game.settings.get(MODULE_ID, "showWeather"),
            moons: game.settings.get(MODULE_ID, "showMoons"),
            combat: game.settings.get(MODULE_ID, "showCombat"),
            music: game.settings.get(MODULE_ID, "showMusic"),
            light: game.settings.get(MODULE_ID, "showLighting"),
            world: game.settings.get(MODULE_ID, "showWorldName"),
            theme: game.settings.get(MODULE_ID, "theme"), // Crucial!
            compact: game.settings.get(MODULE_ID, "compactMode")
        };

        const worldSeconds = game.time.worldTime;
        
        // --- DATA GATHERING ---
        // 1. Ticker Logic (Restored)
        const makeTicker = (text) => {
            if (text && text.length > 20 && !s.compact) {
                return `<div class="ticker-wrap"><div class="ticker-move">${text}</div></div>`;
            }
            return text;
        };

        const locationRaw = this.overrides.location || this.getLocation();
        const locationHTML = makeTicker(locationRaw);
        
        const weather = this.overrides.weather || canvas.scene?.weather || "Clear";
        let dateString = this.overrides.date || this.getFantasyDate(worldSeconds);
        
        // Combat Logic
        let isCombat = false;
        if (s.combat && game.combat?.started) {
            const c = game.combat.combatant;
            dateString = c ? `Turn: ${c.name}` : "Combat Started";
            isCombat = true;
        }

        // Moon Logic
        let moonHTML = "";
        if (s.moons) {
            let moons = [];
            try { moons = JSON.parse(game.settings.get(MODULE_ID, "moonConfig")); } catch (e) {}
            moonHTML = moons.map(m => {
                const phase = this.getPhaseData(worldSeconds, m.cycleDays);
                const icon = this.getMoonIcon(phase.index, m.color);
                return `<div class="moon-row" title="${m.name}: ${phase.name}"><span class="moon-icon">${icon}</span>${!s.compact ? `<span class="moon-name" style="color:${m.color}">${m.name}</span>` : ""}</div>`;
            }).join("");
        }

        // Lighting & Music
        const lighting = this.getLightingData();
        const musicTrack = this.getMusicTrack();

        // --- RENDER ---
        const themeClass = `theme-${s.theme}`; // e.g. theme-glass
        const compactClass = s.compact ? "compact" : "";
        const minifiedClass = this.isMinified ? "minified" : "";
        
        const headerText = s.world ? game.world.title : "Data HUD";

        el.innerHTML = `
            <div class="hud-box ${themeClass} ${compactClass} ${minifiedClass}">
                ${!s.compact ? `<h3 class="hud-header">${headerText}</h3>` : ""}
                
                <div class="hud-content">
                    ${s.loc ? `<div class="hud-section location-section">${locationHTML}</div>` : ""}
                    
                    ${s.date ? `<div class="hud-section date-section ${isCombat ? 'combat-active' : ''}">${dateString}</div>` : ""}
                    
                    ${s.moons ? `<div class="hud-section moon-section">${moonHTML}</div>` : ""}
                    
                    ${s.weather ? `
                        <div class="hud-section weather-section">
                            <span class="weather-text">${weather}</span>
                        </div>` : ""}
                        
                    ${s.light ? `
                        <div class="hud-section lighting-section">
                            <span class="lighting-text">${lighting}</span>
                        </div>` : ""}
                        
                    ${s.music && musicTrack ? `
                        <div class="hud-section music-section">
                            <span class="music-icon">🎵</span>
                            <span class="music-text">${makeTicker(musicTrack)}</span>
                        </div>` : ""}
                </div>
            </div>
        `;
    }

    // --- HELPERS ---
    getLocation() {
        let loc = canvas.scene?.navName || canvas.scene?.name || "Unknown";
        const token = canvas.tokens.controlled[0];
        
        // V13 CRITICAL FIX
        if (token && canvas.regions) {
            const point = { x: token.center.x, y: token.center.y, elevation: token.document.elevation };
            const region = canvas.regions.placeables.find(r => r.document && r.document.testPoint(point));
            if (region) loc = region.document.name;
        }
        return loc;
    }

    getFantasyDate(seconds) {
        if (window.SimpleCalendar?.api) {
            const ts = window.SimpleCalendar.api.timestampToDate(seconds);
            return `${ts.monthName} ${ts.day}, ${ts.year}`;
        }
        const monthString = game.settings.get(MODULE_ID, "monthNames");
        const months = monthString.split(",").map(s => s.trim());
        const totalDays = Math.floor(seconds / 86400);
        const year = game.settings.get(MODULE_ID, "currentYear") + Math.floor(totalDays / (months.length * 30));
        const day = (totalDays % (months.length * 30)) % 30 + 1;
        const month = months[Math.floor((totalDays % (months.length * 30)) / 30)];
        return `${day} ${month || ""}, ${year} ${game.settings.get(MODULE_ID, "eraSuffix")}`;
    }

    getPhaseData(seconds, cycleDays) {
        const cycleSeconds = cycleDays * 86400;
        let ratio = (seconds % cycleSeconds) / cycleSeconds;
        if (ratio < 0.06) return { index: 0, name: "New Moon" };
        if (ratio < 0.24) return { index: 1, name: "Waxing Crescent" };
        if (ratio < 0.26) return { index: 2, name: "First Quarter" };
        if (ratio < 0.49) return { index: 3, name: "Waxing Gibbous" };
        if (ratio < 0.51) return { index: 4, name: "Full Moon" };
        if (ratio < 0.74) return { index: 5, name: "Waning Gibbous" };
        if (ratio < 0.76) return { index: 6, name: "Last Quarter" };
        if (ratio < 0.94) return { index: 7, name: "Waning Crescent" };
        return { index: 0, name: "New Moon" };
    }

    getMoonIcon(phaseIndex, color) {
        const paths = [
            `<circle cx="12" cy="12" r="10" fill="#222" stroke="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 0 0-20z" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 1 0 20V2z" fill="${color}"/>`, 
            `<circle cx="12" cy="12" r="10" fill="${color}"/>`, 
            `<circle cx="12" cy="12" r="10" fill="${color}"/>`, 
            `<circle cx="12" cy="12" r="10" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 0 0 20V2z" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 0 0 20 10 10 0 0 1 0-20z" fill="${color}"/>` 
        ];
        return `<svg width="20" height="20" viewBox="0 0 24 24">${paths[phaseIndex]}</svg>`;
    }

    getLightingData() {
        const darkness = canvas.darknessLevel || 0;
        if (darkness < 0.25) return "☀️ Bright";
        if (darkness > 0.75) return "🌑 Dark";
        return "🔅 Dim";
    }

    getMusicTrack() {
        if (!game.playlists) return null;
        const playing = game.playlists.contents.filter(p => p.playing);
        for (let pl of playing) {
            const sound = pl.sounds.contents.find(s => s.playing);
            if (sound) return sound.name;
        }
        return null;
    }

    makeDraggable(element) {
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        element.addEventListener("mousedown", (e) => {
            if (e.target.closest(".hud-section")) return;
            isDragging = true;
            offset.x = e.clientX - element.offsetLeft;
            offset.y = e.clientY - element.offsetTop;
        });
        window.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                localStorage.setItem(`${MODULE_ID}-pos`, JSON.stringify({ top: element.offsetTop, left: element.offsetLeft }));
            }
        });
        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            element.style.top = (e.clientY - offset.y) + "px";
            element.style.left = (e.clientX - offset.x) + "px";
        });
    }
}