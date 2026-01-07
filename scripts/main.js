import { MODULE_ID, registerSettings } from "./settings.js";

Hooks.once("init", () => { registerSettings(); });

Hooks.once("setup", () => {
    const moduleData = game.modules.get(MODULE_ID);
    moduleData.api = {
        refresh: () => ui.grimoireHUD?.update(),
        override: (key, value) => ui.grimoireHUD?.setOverride(key, value),
        flashMessage: (msg) => ui.grimoireHUD?.flashMessage(msg)
    };
    Hooks.callAll("grimoireHudReady", moduleData.api);
});

Hooks.once("ready", () => {
    if (game.settings.get(MODULE_ID, "enableHUD")) {
        ui.grimoireHUD = new HUD();
        ui.grimoireHUD.create();
    }
});

class HUD {
    constructor() {
        this.elementId = "grimoire-hud";
        this.pos = { top: 100, left: 120 };
        this.overrides = {};
        this.isMinified = false;
    }

    create() {
        if (document.getElementById(this.elementId)) return;

        const hudDiv = document.createElement("div");
        hudDiv.id = this.elementId;
        document.body.appendChild(hudDiv);

        const savedPos = localStorage.getItem(`${MODULE_ID}-pos`);
        if (savedPos) {
            this.pos = JSON.parse(savedPos);
            hudDiv.style.top = this.pos.top + "px";
            hudDiv.style.left = this.pos.left + "px";
        }

        this.update();
        this.makeDraggable(hudDiv);
        this.activateListeners(hudDiv);
        
        // --- LISTENERS ---
        Hooks.on("updateWorldTime", () => this.update());
        Hooks.on("updateScene", () => this.update());
        Hooks.on("canvasReady", () => this.update());

        Hooks.on("controlToken", () => this.update());
        Hooks.on("updateToken", (token, changes) => { if (changes.x || changes.y) this.update(); });
        
        Hooks.on("updateCombat", () => this.update());
        Hooks.on("deleteCombat", () => this.update());
        Hooks.on("createCombat", () => this.update());
        Hooks.on("lightingRefresh", () => this.update()); 
        Hooks.on("updatePlaylist", () => this.update());
        Hooks.on("updatePlaylistSound", () => this.update());
    }

    remove() {
        const el = document.getElementById(this.elementId);
        if (el) el.remove();
    }

    activateListeners(html) {
        html.addEventListener("click", (event) => {
            const target = event.target.closest(".hud-section");
            if (!target) return;

            if (target.classList.contains("date-section") && target.classList.contains("combat-active")) {
                ui.combat.renderPopout(true);
            }
            else if (target.classList.contains("date-section")) {
                if (window.SimpleCalendar) window.SimpleCalendar.api.openCalendar();
                else ui.journal.renderPopout(true);
            }
            else if (target.classList.contains("music-section")) {
                ui.playlists.renderPopout(true);
            }
            else if (target.classList.contains("weather-section")) {
                if (game.user.isGM) new SceneConfig(canvas.scene).render(true);
            }
        });

        html.addEventListener("dblclick", (event) => {
            if (event.target.closest(".hud-header")) {
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

        const s = {
            weather: game.settings.get(MODULE_ID, "showWeather"),
            moons: game.settings.get(MODULE_ID, "showMoons"),
            location: game.settings.get(MODULE_ID, "showLocation"),
            combat: game.settings.get(MODULE_ID, "showCombat"),
            lighting: game.settings.get(MODULE_ID, "showLighting"),
            music: game.settings.get(MODULE_ID, "showMusic"),
            worldName: game.settings.get(MODULE_ID, "showWorldName"),
            theme: game.settings.get(MODULE_ID, "theme"),
            compact: game.settings.get(MODULE_ID, "compactMode")
        };

        const worldSeconds = game.time.worldTime;
        const makeTicker = (text) => {
            if (text && text.length > 20 && !s.compact) {
                return `<div class="ticker-wrap"><div class="ticker-move">${text}</div></div>`;
            }
            return text;
        };
        
        const locationString = this.overrides.location || this.getLocation();
        const weatherString = this.overrides.weather || canvas.scene?.weather || "clear"; 
        
        let dateString = this.overrides.date || this.getFantasyDate(worldSeconds);
        let isCombat = false;

        if (s.combat && game.combat?.started) {
            const c = game.combat.combatant;
            if (c) {
                const name = c?.token?.name || c?.name || "Unknown";
                dateString = makeTicker(`Turn: ${name}`);
            } else {
                dateString = "🚫 Null Combatants";
            }
            isCombat = true;
        }

        const lighting = this.getLightingData();
        const musicTrack = this.getMusicTrack();
        const headerText = s.worldName ? game.world.title : "Data HUD";

        let moonHTML = "";
        if (s.moons) {
            let moons = [];
            try { moons = JSON.parse(game.settings.get(MODULE_ID, "moonConfig")); } catch (e) { moons = []; }
            moonHTML = moons.map(moon => {
                const phaseData = this.getPhaseData(worldSeconds, moon.cycleDays, moon.phaseOffset || 0);
                const svgIcon = this.getMoonIcon(phaseData.index, moon.color);
                return `
                <div class="moon-row" title="${moon.name}: ${phaseData.name}">
                    <span class="moon-icon">${svgIcon}</span>
                    ${!s.compact ? `<span class="moon-name" style="color:${moon.color}">${moon.name}</span>` : ""}
                </div>`;
            }).join("");
        }

        const minifyClass = this.isMinified ? "minified" : "";
        
        el.innerHTML = `
            <div class="hud-box theme-${s.theme} ${s.compact ? 'compact' : ''} ${minifyClass}">
                ${!s.compact ? `<h3 class="hud-header" title="Double-click to collapse">${headerText}</h3>` : ""}
                
                <div class="hud-content">
                    ${s.location ? `
                    <div class="hud-section location-section">
                        <span class="location-icon">📍</span>
                        <span class="location-text">${makeTicker(locationString)}</span>
                    </div>` : ""}

                    <div class="hud-section date-section ${isCombat ? 'combat-active' : ''}" title="Click to open Calendar/Tracker">
                        <div class="hud-value">${dateString}</div>
                    </div>

                    ${s.moons ? `<div class="hud-section moon-section">${moonHTML}</div>` : ""}

                    ${s.weather ? `
                    <div class="hud-section weather-section" title="Click to Configure Weather">
                        <span class="weather-icon">${this.getWeatherIcon(weatherString)}</span>
                        ${!s.compact ? `<span class="weather-text">${weatherString}</span>` : ""}
                    </div>` : ""}

                    ${s.lighting ? `
                    <div class="hud-section lighting-section">
                        <span class="lighting-icon">${lighting.icon}</span>
                        ${!s.compact ? `<span class="lighting-text">${lighting.text}</span>` : ""}
                    </div>` : ""}

                    ${s.music && musicTrack ? `
                    <div class="hud-section music-section" title="Click to open Playlist">
                        <span class="music-icon">🎵</span>
                        ${!s.compact ? `<span class="music-text">${makeTicker(musicTrack)}</span>` : ""}
                    </div>` : ""}
                </div>
            </div>
        `;
    }

    getLocation() {
        let loc = canvas.scene?.navName || canvas.scene?.name || "Unknown";
        const token = canvas.tokens.controlled[0];
        
        // V13 FIX: Use RegionDocument.testPoint instead of Region.testPoint
        if (token && canvas.regions) {
            const point = { x: token.center.x, y: token.center.y, elevation: token.document.elevation };
            const regions = canvas.regions.placeables.filter(r => {
                return r.document && typeof r.document.testPoint === "function" && r.document.testPoint(point);
            });
            
            if (regions.length > 0) {
                // Prioritize the last one found (usually top-most)
                loc = regions[regions.length - 1].document.name;
            }
        }
        return loc;
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

    getLightingData() {
        const darkness = canvas.darknessLevel || 0;
        if (darkness < 0.25) return { icon: "☀️", text: "Bright" };
        if (darkness > 0.75) return { icon: "🌑", text: "Dark" };
        return { icon: "🔅", text: "Dim" };
    }

    getFantasyDate(seconds) {
        if (window.SimpleCalendar && window.SimpleCalendar.api) {
            const timestamp = window.SimpleCalendar.api.timestampToDate(seconds);
            return `${timestamp.year.numeric}-${timestamp.month.numeric}-${timestamp.day.numeric}`;
        }
        const yearStart = game.settings.get(MODULE_ID, "currentYear");
        const eraSuffix = game.settings.get(MODULE_ID, "eraSuffix");
        const daysPerMonth = game.settings.get(MODULE_ID, "daysInMonth");
        const monthNamesRaw = game.settings.get(MODULE_ID, "monthNames");
        const monthNames = monthNamesRaw.split(",").map(s => s.trim());
        const daysPerYear = daysPerMonth * monthNames.length;
        const totalDays = Math.floor(seconds / 86400);
        
        const currentYear = yearStart + Math.floor(totalDays / daysPerYear);
        const dayOfYear = (totalDays % daysPerYear);
        const currentMonthIndex = Math.floor(dayOfYear / daysPerMonth);
        const currentDay = (dayOfYear % daysPerMonth) + 1;
        const monthName = monthNames[currentMonthIndex] || "Unknown";

        return `${currentDay} ${monthName}, ${currentYear} ${eraSuffix}`;
    }

    getPhaseData(seconds, cycleDays, offset = 0) {
        const cycleSeconds = cycleDays * 86400;
        let ratio = (seconds % cycleSeconds) / cycleSeconds;
        ratio = (ratio + offset) % 1.0;
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
            `<circle cx="12" cy="12" r="10" fill="#222" stroke="${color}" stroke-width="1"/>`, 
            `<path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 0 0-20z" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 1 0 20V2z" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 0 0-20z" fill="${color}" transform="scale(-1,1) translate(-24,0)"/> <circle cx="12" cy="12" r="10" fill="${color}"/>`,
            `<circle cx="12" cy="12" r="10" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 0 0-20z" fill="#222"/> <path d="M12 2a10 10 0 0 1 0 20V2z" fill="${color}" transform="scale(-1,1) translate(-24,0)"/>`, 
            `<path d="M12 2a10 10 0 0 0 0 20V2z" fill="${color}"/>`, 
            `<path d="M12 2a10 10 0 0 0 0 20 10 10 0 0 1 0-20z" fill="${color}"/>` 
        ];
        return `<svg width="24" height="24" viewBox="0 0 24 24">${paths[phaseIndex]}</svg>`;
    }

    getWeatherIcon(weather) {
        if (!weather) return "☀️";
        const w = weather.toLowerCase();
        if (w.includes("rain")) return "🌧️";
        if (w.includes("snow")) return "❄️";
        if (w.includes("cloud") || w.includes("overcast")) return "☁️";
        if (w.includes("storm")) return "⚡";
        if (w.includes("fog")) return "🌫️";
        return "☀️";
    }

    makeDraggable(element) {
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        element.addEventListener("mousedown", (e) => {
            if (e.target.closest(".hud-section")) return;
            isDragging = true;
            offset.x = e.clientX - element.offsetLeft;
            offset.y = e.clientY - element.offsetTop;
            element.style.zIndex = 100;
        });
        window.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                localStorage.setItem(`${MODULE_ID}-pos`, JSON.stringify({
                    top: element.offsetTop,
                    left: element.offsetLeft
                }));
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