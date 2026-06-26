// ============================================================
//  RENDERER — отрисовка всех экранов
// ============================================================

const Renderer = (() => {

    let canvas, ctx;
    let W, H;

    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx    = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        const scale = Math.min(window.innerWidth / CONFIG.canvasWidth, window.innerHeight / CONFIG.canvasHeight);
        canvas.width  = CONFIG.canvasWidth;
        canvas.height = CONFIG.canvasHeight;
        canvas.style.width  = Math.floor(CONFIG.canvasWidth  * scale) + 'px';
        canvas.style.height = Math.floor(CONFIG.canvasHeight * scale) + 'px';
        W = CONFIG.canvasWidth;
        H = CONFIG.canvasHeight;
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function drawButton(x, y, w, h, label, color, enabled) {
        ctx.fillStyle = enabled !== false ? (color || CONFIG.colors.accent) : '#444455';
        roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.fillStyle = enabled !== false ? '#000000' : '#888899';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
    }

    // ---------- Блок ----------

    function drawBlock(block) {
        const { x, y, w, h, hp, maxHp, color, special, drop } = block;
        const hp_frac = hp / maxHp;
        ctx.globalAlpha = 0.5 + 0.5 * hp_frac;
        ctx.fillStyle = color;
        roundRect(x + 2, y + 2, w - 4, h - 4, 5);
        ctx.fill();

        if (special === 'dynamite') {
            ctx.globalAlpha = 1; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💥', x + w / 2, y + h / 2);
        } else if (special === 'vein') {
            ctx.globalAlpha = 1; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('✨', x + w / 2, y + h / 2);
        } else {
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85;
            ctx.font = 'bold ' + (hp >= 100 ? 12 : 14) + 'px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(hp, x + w / 2, y + h / 2);
        }
        ctx.globalAlpha = 1;

        if (hp > 0 && hp < maxHp) {
            const barW = w - 8, barX = x + 4, barY = y + h - 7;
            ctx.fillStyle = CONFIG.colors.hpBarBg;
            roundRect(barX, barY, barW, CONFIG.hpBarHeight, 2); ctx.fill();
            ctx.fillStyle = hp_frac > 0.5 ? CONFIG.colors.hpBarFill : hp_frac > 0.25 ? '#ffaa00' : '#ff4444';
            roundRect(barX, barY, barW * hp_frac, CONFIG.hpBarHeight, 2); ctx.fill();
        }

        if (drop) {
            ctx.fillStyle = CONFIG.drops[drop].color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(x + w - 8, y + 8, 4, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // ---------- Дрон ----------

    function drawDrone(drone) {
        if (!drone.active) return;
        const { x, y } = drone;
        const droneDef = Upgrades.getActiveDroneDef();
        const color = droneDef.color || CONFIG.colors.drone;

        const grd = ctx.createRadialGradient(x, y, 0, x, y, CONFIG.droneRadius * 2.5);
        grd.addColorStop(0, CONFIG.colors.droneGlow + 'cc');
        grd.addColorStop(1, CONFIG.colors.droneGlow + '00');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, CONFIG.droneRadius * 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = color;
        ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, CONFIG.droneRadius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ---------- Платформа ----------

    function drawPaddle(state) {
        const { x, w } = state.paddle;
        const y = CONFIG.paddleY, h = CONFIG.paddleHeight;
        ctx.shadowColor = state.shield ? CONFIG.drops.shield.color : CONFIG.colors.paddle;
        ctx.shadowBlur  = state.shield ? 20 : 10;
        ctx.fillStyle   = state.shield ? CONFIG.drops.shield.color : state.paddle.wideTimer > 0 ? CONFIG.drops.wide.color : CONFIG.colors.paddle;
        roundRect(x, y, w, h, 6); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff44';
        roundRect(x + 4, y + 2, w - 8, 3, 2); ctx.fill();
    }

    // ---------- Дропы ----------

    function drawDrops(drops) {
        for (const drop of drops) {
            if (!drop.active) continue;
            ctx.shadowColor = drop.color; ctx.shadowBlur = 10;
            ctx.fillStyle = drop.color; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000'; ctx.globalAlpha = 1;
            ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(drop.label, drop.x, drop.y);
        }
        ctx.globalAlpha = 1;
    }

    function drawFlashes(flashes) {
        for (const f of flashes) {
            ctx.globalAlpha = f.alpha; ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawFloatingTexts(texts) {
        for (const t of texts) {
            ctx.globalAlpha = t.alpha;
            ctx.fillStyle = t.color || CONFIG.colors.gold;
            ctx.font = 'bold ' + (t.size || 16) + 'px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;
    }

    // ---------- HUD ----------

    function drawHUD(state) {
        const py = CONFIG.paddleY + CONFIG.paddleHeight + 10;
        ctx.font = '18px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        for (let i = 0; i < state.lives; i++) ctx.fillText('❤', 10 + i * 24, py);

        ctx.fillStyle = CONFIG.colors.textDim; ctx.font = '13px monospace';
        ctx.textAlign = 'center'; ctx.fillText('ГЛУБИНА: ' + state.depth + ' м', W / 2, py + 2);

        ctx.fillStyle = CONFIG.colors.gold; ctx.font = '13px monospace';
        ctx.textAlign = 'right'; ctx.fillText('💰 ' + Economy.getGold(), W - 10, py + 2);

        if (state.phase === 'ready') {
            ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'center'; ctx.fillText('[ ПРОБЕЛ ] — запустить', W / 2, CONFIG.paddleY - 28);
        }

        if (state.powerTimer > 0) {
            ctx.fillStyle = CONFIG.drops.power.color; ctx.font = '12px monospace';
            ctx.textAlign = 'left'; ctx.fillText('⚡ ' + Math.ceil(state.powerTimer / 1000) + 'с', 10, CONFIG.paddleY - 46);
        }
        if (state.effects.explosive) {
            ctx.fillStyle = CONFIG.drops.explosive.color; ctx.font = '12px monospace';
            ctx.textAlign = 'left'; ctx.fillText('💥 следующий удар', 10, CONFIG.paddleY - 62);
        }
        if (state.effects.laser) {
            ctx.fillStyle = CONFIG.drops.laser.color; ctx.font = '12px monospace';
            ctx.textAlign = 'left'; ctx.fillText('▶▶ лазер', 10, CONFIG.paddleY - 78);
        }
    }

    // ---------- Экран меню ----------

    function drawMenu(state) {
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(0, 0, W, H);

        // Анимированный дрон
        const d = state.menuDrone;
        const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 30);
        grd.addColorStop(0, '#ffaa00cc'); grd.addColorStop(1, '#ffaa0000');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(d.x, d.y, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(d.x, d.y, CONFIG.droneRadius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Заголовок
        ctx.fillStyle = CONFIG.colors.accent;
        ctx.font = 'bold 42px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = CONFIG.colors.accent; ctx.shadowBlur = 20;
        ctx.fillText('IDLE MINER', W / 2, H / 2 - 100);
        ctx.shadowBlur = 0;

        ctx.fillStyle = CONFIG.colors.textDim;
        ctx.font = '14px monospace'; ctx.fillText('Разбивай блоки. Копай глубже.', W / 2, H / 2 - 60);

        // Валюты
        ctx.font = '14px monospace';
        ctx.fillStyle = CONFIG.colors.gold;
        ctx.fillText('💰 ' + Economy.getGold(), W / 2 - 60, H / 2 - 20);
        ctx.fillStyle = '#aaeeff';
        ctx.fillText('💎 ' + Economy.getCrystals(), W / 2 + 60, H / 2 - 20);

        // Кнопки
        drawButton(W/2 - 100, H/2 + 20, 200, 55, '▶  ИГРАТЬ', CONFIG.colors.accent);
        drawButton(W/2 - 100, H/2 + 95, 200, 55, '🛒  МАГАЗИН', '#8866ff');
    }

    // ---------- Выбор уровня ----------

    function drawLevelSelect(state) {
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(0, 0, W, H);

        drawButton(10, 10, 80, 36, '← НАЗАД', '#445566');

        ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('ВЫБОР УРОВНЯ', W / 2, 60);

        const cols = 4, cellW = 90, cellH = 70;
        const startX = (W - cols * cellW) / 2, startY = 120;
        const totalLevels = 20;

        for (let i = 0; i < totalLevels; i++) {
            const col = i % cols, row = Math.floor(i / cols);
            const cx = startX + col * cellW, cy = startY + row * cellH;
            const unlocked = i < state.maxUnlockedLevel;
            const isCurrent = i + 1 === state.level;

            ctx.fillStyle = unlocked ? (isCurrent ? CONFIG.colors.accent + 'aa' : '#334455') : '#1a1a2a';
            roundRect(cx, cy, cellW - 8, cellH - 8, 8); ctx.fill();

            if (unlocked) {
                ctx.fillStyle = isCurrent ? '#000000' : CONFIG.colors.text;
                ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(i + 1, cx + (cellW - 8) / 2, cy + (cellH - 8) / 2 - 8);

                // Руда уровня
                const oreIdx = Math.min(i, CONFIG.ores.length - 1);
                ctx.fillStyle = CONFIG.ores[oreIdx].color;
                ctx.font = '11px monospace';
                ctx.fillText(CONFIG.ores[oreIdx].name, cx + (cellW - 8) / 2, cy + (cellH - 8) / 2 + 10);
            } else {
                ctx.fillStyle = '#445566'; ctx.font = '20px monospace';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🔒', cx + (cellW - 8) / 2, cy + (cellH - 8) / 2);
            }
        }
    }

    // ---------- Магазин апгрейдов ----------

    function drawShop(state) {
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(0, 0, W, H);

        drawButton(10, 10, 80, 36, '← НАЗАД', '#445566');
        drawButton(W/2 + 10, 60, 100, 36, '🚀 ДРОНЫ', '#8866ff');

        ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('МАГАЗИН', W / 2 - 45, 15);

        ctx.fillStyle = CONFIG.colors.gold; ctx.font = '14px monospace';
        ctx.textAlign = 'left'; ctx.fillText('💰 ' + Economy.getGold(), 10, 55);
        ctx.fillStyle = '#aaeeff';
        ctx.fillText('💎 ' + Economy.getCrystals(), 10, 75);

        const upgKeys = Object.keys(Upgrades.getAllUpgrades());
        upgKeys.forEach((key, i) => {
            const def = Upgrades.getUpgradeDef(key);
            const lvl = Upgrades.getState().levels[key];
            const by  = 110 + i * 90;
            const canBuy = Upgrades.canBuyUpgrade(key);
            const maxed  = lvl >= def.maxLevel;

            ctx.fillStyle = '#1a1a2a';
            roundRect(10, by, W - 20, 78, 8); ctx.fill();

            ctx.fillStyle = def.color || CONFIG.colors.accent;
            ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(def.label, 20, by + 8);

            ctx.fillStyle = CONFIG.colors.textDim; ctx.font = '12px monospace';
            ctx.fillText(def.desc, 20, by + 28);

            ctx.fillStyle = CONFIG.colors.textDim; ctx.font = '12px monospace';
            ctx.fillText('Уровень: ' + lvl + ' / ' + def.maxLevel, 20, by + 46);

            if (!maxed) {
                const cost = def.cost(lvl);
                drawButton(W/2 + 10, by + 22, 140, 36,
                    canBuy ? '💰 ' + cost : '🔒 ' + cost,
                    canBuy ? '#44aa66' : '#445566', canBuy);
            } else {
                ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 13px monospace';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('✅ МАКС', W/2 + 80, by + 40);
            }
        });
    }

    // ---------- Магазин дронов ----------

    function drawDroneShop(state) {
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(0, 0, W, H);

        drawButton(10, 10, 80, 36, '← НАЗАД', '#445566');

        ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('ДРОНЫ', W / 2, 15);

        ctx.fillStyle = '#aaeeff'; ctx.font = '14px monospace';
        ctx.textAlign = 'left'; ctx.fillText('💎 ' + Economy.getCrystals(), 10, 55);

        const droneKeys = Object.keys(Upgrades.getAllDrones());
        const upg = Upgrades.getState();

        droneKeys.forEach((key, i) => {
            const def = Upgrades.getAllDrones()[key];
            const owned   = upg.ownedDrones.includes(key);
            const active  = upg.activeDrone === key;
            const by = 90 + i * 110;

            ctx.fillStyle = active ? '#1a3a2a' : '#1a1a2a';
            if (active) { ctx.shadowColor = CONFIG.colors.accent; ctx.shadowBlur = 8; }
            roundRect(10, by, W - 20, 98, 8); ctx.fill();
            ctx.shadowBlur = 0;

            // Иконка дрона
            ctx.fillStyle = def.color;
            ctx.shadowColor = def.color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(35, by + 49, 14, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = def.color; ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(def.label, 58, by + 8);

            ctx.fillStyle = CONFIG.colors.textDim; ctx.font = '12px monospace';
            ctx.fillText(def.desc, 58, by + 28);
            ctx.fillText('Скорость: x' + def.speed + '  Урон: x' + def.damage, 58, by + 46);

            if (active) {
                ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 13px monospace';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('✅ АКТИВЕН', W/2 + 70, by + 58);
            } else if (owned) {
                drawButton(W/2 + 10, by + 40, 140, 36, '▶ ВЫБРАТЬ', CONFIG.colors.accent);
            } else {
                drawButton(W/2 + 10, by + 40, 140, 36,
                    Upgrades.canBuyDrone(key) ? '💎 ' + def.cost : '🔒 ' + def.cost,
                    Upgrades.canBuyDrone(key) ? '#8866ff' : '#445566',
                    Upgrades.canBuyDrone(key));
            }
        });
    }

    // ---------- Экран победы ----------

    function drawLevelComplete(state) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = CONFIG.colors.accent; ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = CONFIG.colors.accent; ctx.shadowBlur = 20;
        ctx.fillText('УРОВЕНЬ ' + state.level + ' ПРОЙДЕН!', W / 2, H / 2 - 80);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff'; ctx.font = '16px monospace';
        ctx.fillText('💰 Золото: ' + Economy.getGold(), W / 2, H / 2 - 35);
        ctx.fillStyle = '#aaeeff';
        ctx.fillText('💎 Кристаллы: ' + Economy.getCrystals(), W / 2, H / 2 - 10);

        drawButton(W/2 - 100, H/2 + 40, 200, 50, '▶ СЛЕДУЮЩИЙ', CONFIG.colors.accent);
        drawButton(W/2 - 100, H/2 + 105, 200, 50, '🛒 МАГАЗИН', '#8866ff');
    }

    // ---------- Экран поражения ----------

    function drawGameOver(state) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff4466'; ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 80);

        ctx.fillStyle = '#ffffff'; ctx.font = '16px monospace';
        ctx.fillText('💰 Золото сохранено: ' + Economy.getGold(), W / 2, H / 2 - 35);
        ctx.fillStyle = CONFIG.colors.textDim; ctx.font = '14px monospace';
        ctx.fillText('Уровень ' + state.level + ' • Глубина ' + state.depth + ' м', W / 2, H / 2 - 10);

        drawButton(W/2 - 100, H/2 + 40, 200, 50, '🔄 ПОВТОРИТЬ', CONFIG.colors.accent);
        drawButton(W/2 - 100, H/2 + 105, 200, 50, '🛒 МАГАЗИН', '#8866ff');
    }

    // ---------- Игровое поле ----------

    function drawGame(state) {
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(0, 0, W, H);
        for (const block of state.blocks) drawBlock(block);
        drawFlashes(state.flashes);
        drawDrops(state.drops);
        for (const drone of state.drones) drawDrone(drone);
        drawPaddle(state);
        drawFloatingTexts(state.floatingTexts);
        drawHUD(state);
    }

    // ---------- Главный рендер ----------

    function render(state) {
        switch (state.phase) {
            case 'menu':           drawMenu(state);          break;
            case 'level_select':   drawLevelSelect(state);   break;
            case 'shop':           drawShop(state);          break;
            case 'drone_shop':     drawDroneShop(state);     break;
            case 'level_complete': drawGame(state); drawLevelComplete(state); break;
            case 'game_over':      drawGame(state); drawGameOver(state);      break;
            default:               drawGame(state);          break;
        }
    }

    function getCanvas() { return canvas; }
    return { init, render, getCanvas };

})();