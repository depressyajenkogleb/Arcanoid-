// ============================================================
//  GAME — главный цикл + меню + уровни
// ============================================================

const Game = (() => {

    let ysdk = null;

    async function initYandexSDK() {
        try {
            ysdk = await YaGames.init();
            console.log('[YaGames] Язык:', ysdk.environment.i18n.lang);
            ysdk.on('game_api_pause', pauseGame);
            ysdk.on('game_api_resume', resumeGame);
        } catch (e) {
            console.warn('[YaGames] SDK не загружен:', e.message);
        }
    }

    // ---------- Состояние ----------

    let state = {
        phase: 'menu',   // 'menu'|'level_select'|'shop'|'drone_shop'|'ready'|'playing'|'level_complete'|'game_over'
        paused: false,
        level:  1,
        maxUnlockedLevel: 1,
        hpBonus: 0,
        depth: 0,
        lives: CONFIG.startLives,
        shield: false,
        blocks: [],
        drones: [],
        drops: [],
        paddle: {
            x: CONFIG.canvasWidth / 2 - CONFIG.paddleWidth / 2,
            w: CONFIG.paddleWidth,
            wideTimer: 0,
        },
        effects: { explosive: false, laser: false },
        floatingTexts: [],
        flashes: [],
        powerTimer: 0,
        lastDroneSpeed: CONFIG.droneSpeed,

        // Анимация меню
        menuDrone: { x: -20, y: 300, vx: 2.5, vy: 0.8 },
    };

    let lastTime = 0;

    // ---------- Сетка ----------

    function getOreForDepth(depth) {
        let ore = CONFIG.ores[0];
        for (const o of CONFIG.ores) { if (depth >= o.minDepth) ore = o; }
        return ore;
    }

    function createBlock(col, row, depth) {
        const bs  = CONFIG.blockSize;
        const hpTable = [1, 2, 2, 3, 4, 5, 5, 6];
        const hp  = (hpTable[row] || 6) + state.hpBonus;

        const oreList = CONFIG.ores;
        const currentOreIdx  = Math.min(state.level - 1, oreList.length - 1);
        const previousOreIdx = Math.max(0, currentOreIdx - 1);
        const ore = row >= CONFIG.rows - 3 ? oreList[previousOreIdx] : oreList[currentOreIdx];

        return {
            col, row,
            x: col * bs, y: row * bs,
            w: bs, h: bs,
            hp, maxHp: hp,
            color: ore.color,
            reward: ore.reward,
            ore: ore.name,
            special: null, drop: null, depth,
        };
    }

    function buildGrid() {
        state.blocks = [];
        state.flashes = [];
        state.floatingTexts = [];

        for (let row = 0; row < CONFIG.rows; row++)
            for (let col = 0; col < CONFIG.cols; col++)
                state.blocks.push(createBlock(col, row, state.depth + row * CONFIG.metersPerRow));

        const placed = [];

        function tryPlace(minDist, validator) {
            for (let attempt = 0; attempt < 50; attempt++) {
                const col = Math.floor(Math.random() * CONFIG.cols);
                const row = Math.floor(Math.random() * CONFIG.rows);
                const tooClose = placed.some(p => Math.abs(p.col - col) < minDist && Math.abs(p.row - row) < minDist);
                if (tooClose) continue;
                const block = state.blocks.find(b => b.col === col && b.row === row);
                if (block && !block.special && !block.drop) {
                    validator(block);
                    placed.push({ col, row });
                    return true;
                }
            }
            return false;
        }

        const veinCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < veinCount; i++)
            tryPlace(3, b => { b.special = 'vein'; b.reward = 25 + Math.floor(Math.random() * 6); });

        const dynamiteCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < dynamiteCount; i++)
            tryPlace(3, b => { b.special = 'dynamite'; });

        const dropTypes = Object.keys(CONFIG.drops);
        const maxDrops  = Math.min(6, 11 - placed.length);
        for (let i = 0; i < maxDrops; i++)
            tryPlace(2, b => { b.drop = dropTypes[Math.floor(Math.random() * dropTypes.length)]; });

        let tripleCount = 0;
        const tripleTarget = 4 + Math.floor(Math.random() * 2);
        for (let i = 0; i < 40 && tripleCount < tripleTarget; i++)
            tryPlace(2, b => { b.drop = 'triple'; tripleCount++; });
    }

    // ---------- Дрон ----------

    function createDrone(x, y, angle, speed) {
        const droneDef = Upgrades.getActiveDroneDef();
        const s = (speed || CONFIG.droneSpeed) * droneDef.speed;
        return {
            x, y,
            vx: Math.cos(angle) * s,
            vy: Math.sin(angle) * s,
            speed: s,
            active: true,
            hitCooldown: 0,
        };
    }

    function launchDrone() {
        if (state.phase !== 'ready') return;
        state.phase = 'playing';
        const upg = Upgrades.getState();
        const pw  = CONFIG.paddleWidth + upg.paddleBonus;
        const px  = state.paddle.x + pw / 2;
        const py  = CONFIG.paddleY;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 2 / 3);
        state.drones.push(createDrone(px, py - CONFIG.paddleHeight / 2 - CONFIG.droneRadius - 2, angle, state.lastDroneSpeed));
        if (ysdk) ysdk.features.GameplayAPI.start();
    }

    // ---------- Дроп-апгрейды ----------

    function spawnDrop(x, y, type) {
        state.drops.push({ x, y, vy: 0.8, type, label: CONFIG.drops[type].label, color: CONFIG.drops[type].color, r: 14, active: true });
    }

    function applyDrop(type) {
        const upg = Upgrades.getState();
        const pw  = CONFIG.paddleWidth + upg.paddleBonus;
        const px  = state.paddle.x + pw / 2;
        const py  = CONFIG.paddleY;
        const dropLvl = upg.levels.dropPower;

        switch (type) {
            case 'power':
                upg.damage += 1;
                state.powerTimer = 45000 + dropLvl * 10000;
                spawnFloatingText('МОЩЬ! +1 урон', px, py - 30, CONFIG.drops.power.color, 20);
                break;
            case 'triple':
                [-0.8, -Math.PI / 2, -Math.PI + 0.8].forEach(angle => {
                    state.drones.push(createDrone(px, py - CONFIG.paddleHeight - CONFIG.droneRadius - 2, angle, state.lastDroneSpeed));
                });
                spawnFloatingText('ТРОЙНОЙ!', px, py - 30, CONFIG.drops.triple.color, 20);
                break;
            case 'explosive':
                state.effects.explosive = true;
                spawnFloatingText('ВЗРЫВ!', px, py - 30, CONFIG.drops.explosive.color, 20);
                break;
            case 'wide':
                state.paddle.wideTimer = CONFIG.paddleWideBonusTime + dropLvl * 5000;
                state.paddle.w = (CONFIG.paddleWidth + upg.paddleBonus) * 1.8;
                spawnFloatingText('ШИРОКО!', px, py - 30, CONFIG.drops.wide.color, 20);
                break;
            case 'shield':
                state.shield = true;
                spawnFloatingText('ЩИТ!', px, py - 30, CONFIG.drops.shield.color, 20);
                break;
            case 'laser':
                state.effects.laser = true;
                spawnFloatingText('ЛАЗЕР!', px, py - 30, CONFIG.drops.laser.color, 20);
                break;
        }
    }

    // ---------- Физика ----------

    function blockCollides(drone, block) {
        const r  = CONFIG.droneRadius;
        const cx = Math.max(block.x, Math.min(drone.x, block.x + block.w));
        const cy = Math.max(block.y, Math.min(drone.y, block.y + block.h));
        const dx = drone.x - cx;
        const dy = drone.y - cy;
        return dx * dx + dy * dy < r * r;
    }

    function resolveBlockCollision(drone, block) {
        const r  = CONFIG.droneRadius;
        const oL = (drone.x + r) - block.x;
        const oR = (block.x + block.w) - (drone.x - r);
        const oT = (drone.y + r) - block.y;
        const oB = (block.y + block.h) - (drone.y - r);
        if (Math.min(oL, oR) < Math.min(oT, oB)) {
            drone.vx = -drone.vx;
            drone.x += oL < oR ? -(oL + 0.5) : (oR + 0.5);
        } else {
            drone.vy = -drone.vy;
            drone.y += oT < oB ? -(oT + 0.5) : (oB + 0.5);
        }
    }

    function spawnFloatingText(text, x, y, color, size) {
        state.floatingTexts.push({ text, x, y, color, size, alpha: 1, vy: -1.2 });
    }

    function destroyBlock(block, index) {
        const upg = Upgrades.getState();
        if (state.flashes.length < 12)
            state.flashes.push({ x: block.x + block.w / 2, y: block.y + block.h / 2, radius: CONFIG.blockSize * 0.4, alpha: 0.6 });

        let reward = block.reward;
        if (block.special === 'vein') {
            reward *= CONFIG.special.vein.rewardMult;
            spawnFloatingText('ЖИЛА! +' + Math.floor(reward * upg.incomeMult), block.x + block.w / 2, block.y, '#ffee00', 22);
        } else if (block.special === 'dynamite') {
            spawnFloatingText('БАБАХ!', block.x + block.w / 2, block.y, '#ff6600', 20);
            state.blocks.forEach(b => {
                if (b !== block && Math.abs(b.col - block.col) <= 1 && Math.abs(b.row - block.row) <= 1)
                    b._pendingDestroy = true;
            });
        } else {
            spawnFloatingText('+' + Math.floor(reward * upg.incomeMult), block.x + block.w / 2, block.y, CONFIG.colors.gold, 13);
        }

        if (block.drop) spawnDrop(block.x + block.w / 2, block.y + block.h / 2, block.drop);
        Economy.addGold(reward * upg.incomeMult);
        state.depth = Math.max(state.depth, block.depth);
        state.blocks.splice(index, 1);
    }

    function processPendingDestroys() {
        let found = true, limit = 80;
        while (found && limit-- > 0) {
            found = false;
            for (let i = state.blocks.length - 1; i >= 0; i--) {
                if (state.blocks[i]._pendingDestroy) {
                    found = true; destroyBlock(state.blocks[i], i); break;
                }
            }
        }
    }

    function fireLaser(drone, hitBlock) {
        hitBlock.hp -= 7;
        if (hitBlock.hp <= 0) { const idx = state.blocks.indexOf(hitBlock); if (idx !== -1) destroyBlock(hitBlock, idx); }
        let col = hitBlock.col, row = hitBlock.row - 1, lastRow = hitBlock.row - 1, hits = 0;
        while (hits < 3) {
            const target = state.blocks.find(b => b.col === col && b.row === row);
            if (target) {
                target.hp -= 7;
                spawnFloatingText('-7', target.x + target.w / 2, target.y, CONFIG.drops.laser.color, 14);
                if (target.hp <= 0) { const idx = state.blocks.indexOf(target); if (idx !== -1) destroyBlock(target, idx); }
                lastRow = row;
            }
            row--; hits++;
        }
        [-1, 1].forEach(side => {
            const t = state.blocks.find(b => b.col === col + side && b.row === lastRow);
            if (!t) return;
            t.hp -= 7;
            spawnFloatingText('-7', t.x + t.w / 2, t.y, CONFIG.drops.laser.color, 14);
            if (t.hp <= 0) { const idx = state.blocks.indexOf(t); if (idx !== -1) destroyBlock(t, idx); }
        });
    }

    function updateDrones(dt) {
        const W   = CONFIG.canvasWidth;
        const upg = Upgrades.getState();
        const droneDef = Upgrades.getActiveDroneDef();

        for (const drone of state.drones) {
            if (!drone.active) continue;
            const STEPS = 4;
            const svx = drone.vx / STEPS;
            const svy = drone.vy / STEPS;

            for (let s = 0; s < STEPS; s++) {
                if (!drone.active) break;
                drone.x += svx; drone.y += svy;

                if (drone.x - CONFIG.droneRadius <= 0) { drone.x = CONFIG.droneRadius; drone.vx = Math.abs(drone.vx); }
                if (drone.x + CONFIG.droneRadius >= W)  { drone.x = W - CONFIG.droneRadius; drone.vx = -Math.abs(drone.vx); }
                if (drone.y - CONFIG.droneRadius <= 0)  { drone.y = CONFIG.droneRadius; drone.vy = Math.abs(drone.vy); }

                if (drone.y - CONFIG.droneRadius > CONFIG.canvasHeight) {
                    drone.active = false; handleDroneLost(); break;
                }

                const pw = state.paddle.w;
                const px = state.paddle.x;
                const py = CONFIG.paddleY;
                const ph = CONFIG.paddleHeight;

                if (drone.vy > 0 &&
                    drone.y + CONFIG.droneRadius >= py &&
                    drone.y - CONFIG.droneRadius <= py + ph &&
                    drone.x >= px - 4 && drone.x <= px + pw + 4) {
                    drone.speed = drone.speed || CONFIG.droneSpeed;
                    drone.speed *= (1 + CONFIG.droneSpeedIncrement);
                    state.lastDroneSpeed = drone.speed;
                    drone.vy = -Math.abs(drone.vy);
                    drone.y  = py - CONFIG.droneRadius - 1;
                    const hit = (drone.x - px) / pw;
                    const angle = -Math.PI * (0.2 + hit * 0.6);
                    drone.vx = Math.cos(angle) * drone.speed;
                    drone.vy = Math.sin(angle) * drone.speed;
                }

                if (drone.hitCooldown > 0) { drone.hitCooldown--; continue; }

                for (let i = state.blocks.length - 1; i >= 0; i--) {
                    const b = state.blocks[i];
                    if (!blockCollides(drone, b)) continue;
                    resolveBlockCollision(drone, b);
                    drone.hitCooldown = 8;

                    if (state.effects.laser) { fireLaser(drone, b); state.effects.laser = false; break; }

                    if (state.effects.explosive) {
                        state.blocks.forEach(nb => {
                            if (Math.abs(nb.col - b.col) <= 1 && Math.abs(nb.row - b.row) <= 1) {
                                nb.hp -= nb === b ? 7 : 5;
                                if (nb.hp <= 0) nb._pendingDestroy = true;
                            }
                        });
                        state.effects.explosive = false;
                        spawnFloatingText('ВЗРЫВ!', b.x + b.w / 2, b.y, '#ff6600', 20);
                        break;
                    }

                    // Дробовик — постоянный малый АоЕ
                    if (droneDef.aoe) {
                        state.blocks.forEach(nb => {
                            if (nb !== b && Math.abs(nb.col - b.col) <= 1 && Math.abs(nb.row - b.row) <= 1) {
                                nb.hp -= 1;
                                if (nb.hp <= 0) nb._pendingDestroy = true;
                            }
                        });
                    }

                    const dmg = Math.floor(upg.damage * droneDef.damage);
                    if (Math.random() < upg.critChance) {
                        b.hp -= dmg * 2;
                        spawnFloatingText('КРИТ!', b.x + b.w / 2, b.y, '#ff4444', 16);
                    } else {
                        b.hp -= dmg;
                    }
                    if (b.hp <= 0) destroyBlock(b, i);
                    break;
                }
            }
        }

        processPendingDestroys();
        state.drones = state.drones.filter(d => d.active);
        if (state.drones.length === 0 && state.phase === 'playing') {
            state.phase = 'ready';
            if (ysdk) ysdk.features.GameplayAPI.stop();
        }
    }

    function handleDroneLost() {
        const hasOthers = state.drones.some(d => d.active);
        if (hasOthers) return;
        if (state.shield) {
            state.shield = false;
            spawnFloatingText('ЩИТ СРАБОТАЛ!', CONFIG.canvasWidth / 2, CONFIG.paddleY - 40, CONFIG.drops.shield.color, 18);
            state.phase = 'ready';
            return;
        }
        state.lives--;
        state.lastDroneSpeed = Math.max(CONFIG.droneSpeed, state.lastDroneSpeed * CONFIG.droneSpeedOnMiss);
        spawnFloatingText('-1 ❤', CONFIG.canvasWidth / 2, CONFIG.paddleY - 40, CONFIG.colors.heart, 22);
        if (state.lives <= 0) {
            state.phase = 'game_over';
            if (ysdk) ysdk.features.GameplayAPI.stop();
        } else {
            state.phase = 'ready';
        }
    }

    function updateDrops(dt) {
        for (const drop of state.drops) {
            if (!drop.active) continue;
            drop.y += drop.vy;
            const pw = state.paddle.w;
            const px = state.paddle.x;
            if (drop.y + drop.r >= CONFIG.paddleY && drop.y - drop.r <= CONFIG.paddleY + CONFIG.paddleHeight &&
                drop.x >= px && drop.x <= px + pw) {
                drop.active = false; applyDrop(drop.type);
            }
            if (drop.y > CONFIG.canvasHeight) drop.active = false;
        }
        state.drops = state.drops.filter(d => d.active);
    }

    // ---------- Переходы ----------

    function startLevel(level) {
        state.level = level;
        state.hpBonus = (level - 1) * 2;
        state.lives = CONFIG.startLives;
        state.drones = [];
        state.drops = [];
        state.effects.explosive = false;
        state.effects.laser = false;
        state.powerTimer = 0;
        const upg = Upgrades.getState();
        state.paddle.w = CONFIG.paddleWidth + upg.paddleBonus;
        state.paddle.wideTimer = 0;
        state.paddle.x = CONFIG.canvasWidth / 2 - state.paddle.w / 2;
        state.lastDroneSpeed = CONFIG.droneSpeed;
        buildGrid();
        state.phase = 'ready';
    }

    function handleLaunch() {
        if (state.phase === 'level_complete') { state.phase = 'game_over'; return; } // временно, UI обрабатывает
        if (state.phase === 'game_over') { startLevel(state.level); return; }
        if (state.phase === 'ready') launchDrone();
    }

    // ---------- Платформа ----------

    function updatePaddle(dt) {
        const maxX = CONFIG.canvasWidth - state.paddle.w;
        if (Input.isLeft())  state.paddle.x = Math.max(0, state.paddle.x - CONFIG.paddleSpeed);
        if (Input.isRight()) state.paddle.x = Math.min(maxX, state.paddle.x + CONFIG.paddleSpeed);

        if (state.paddle.wideTimer > 0) {
            state.paddle.wideTimer -= dt;
            if (state.paddle.wideTimer <= 0) {
                state.paddle.wideTimer = 0;
                const upg = Upgrades.getState();
                state.paddle.w = CONFIG.paddleWidth + upg.paddleBonus;
                state.paddle.x = Math.min(state.paddle.x, CONFIG.canvasWidth - state.paddle.w);
            }
        }
        if (Input.isLaunch()) handleLaunch();
    }

    // ---------- Клики по UI ----------

    function handleClick(pos) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const hit = Input.hitTest;

        if (state.phase === 'menu') {
            // Кнопка ИГРАТЬ
            if (hit(pos, W/2 - 100, H/2 + 20, 200, 55)) { state.phase = 'level_select'; return; }
            // Кнопка МАГАЗИН
            if (hit(pos, W/2 - 100, H/2 + 95, 200, 55)) { state.phase = 'shop'; return; }
        }

        if (state.phase === 'level_select') {
            // Назад
            if (hit(pos, 10, 10, 80, 36)) { state.phase = 'menu'; return; }
            // Ячейки уровней
            const cols = 4, cellW = 90, cellH = 70, startX = (W - cols * cellW) / 2, startY = 120;
            for (let i = 0; i < state.maxUnlockedLevel; i++) {
                const col = i % cols, row = Math.floor(i / cols);
                const cx = startX + col * cellW, cy = startY + row * cellH;
                if (hit(pos, cx, cy, cellW - 8, cellH - 8)) { startLevel(i + 1); return; }
            }
        }

        if (state.phase === 'shop') {
            // Назад
            if (hit(pos, 10, 10, 80, 36)) { state.phase = 'menu'; return; }
            // Вкладка дронов
            if (hit(pos, W/2 + 10, 60, 100, 36)) { state.phase = 'drone_shop'; return; }
            // Кнопки апгрейдов
            const upgKeys = Object.keys(Upgrades.getAllUpgrades());
            upgKeys.forEach((key, i) => {
                const by = 120 + i * 90;
                if (hit(pos, W/2 + 10, by + 30, 120, 36)) { Upgrades.buyUpgrade(key); }
            });
        }

        if (state.phase === 'drone_shop') {
            if (hit(pos, 10, 10, 80, 36)) { state.phase = 'shop'; return; }
            const droneKeys = Object.keys(Upgrades.getAllDrones());
            droneKeys.forEach((key, i) => {
                const by = 120 + i * 100;
                if (hit(pos, W/2 + 10, by + 40, 120, 36)) {
                    if (Upgrades.getState().ownedDrones.includes(key)) {
                        Upgrades.setActiveDrone(key);
                    } else {
                        Upgrades.buyDrone(key);
                    }
                }
            });
        }

        if (state.phase === 'level_complete') {
            // Следующий уровень
            if (hit(pos, W/2 - 100, H/2 + 40, 200, 50)) {
                state.maxUnlockedLevel = Math.max(state.maxUnlockedLevel, state.level + 1);
                Economy.addCrystals(1 + (state.level % 6 === 0 ? 2 : 0));
                startLevel(state.level + 1);
                return;
            }
            // Магазин
            if (hit(pos, W/2 - 100, H/2 + 105, 200, 50)) { state.phase = 'shop'; return; }
        }

        if (state.phase === 'game_over') {
            // Повторить
            if (hit(pos, W/2 - 100, H/2 + 40, 200, 50)) { startLevel(state.level); return; }
            // Магазин
            if (hit(pos, W/2 - 100, H/2 + 105, 200, 50)) { state.phase = 'shop'; return; }
        }
    }

    // ---------- Анимация меню ----------

    function updateMenuDrone(dt) {
        const d = state.menuDrone;
        d.x += d.vx;
        d.y += d.vy;
        if (d.x > CONFIG.canvasWidth + 20)  { d.x = -20; d.y = 100 + Math.random() * 400; }
        if (d.y < 0 || d.y > CONFIG.canvasHeight) d.vy = -d.vy;
    }

    // ---------- Главный цикл ----------

    function update(dt) {
        if (state.paused) return;

        if (state.phase === 'menu') { updateMenuDrone(dt); return; }
        if (state.phase === 'level_select' || state.phase === 'shop' || state.phase === 'drone_shop') return;

        if (state.phase === 'game_over' || state.phase === 'level_complete') return;

        updatePaddle(dt);
        updateDrones(dt);
        updateDrops(dt);

        if (state.powerTimer > 0) {
            state.powerTimer -= dt;
            if (state.powerTimer <= 0) {
                state.powerTimer = 0;
                const upg = Upgrades.getState();
                upg.damage = Math.max(CONFIG.startDamage, upg.damage - 1);
                spawnFloatingText('МОЩЬ закончилась', CONFIG.canvasWidth / 2, CONFIG.paddleY - 40, CONFIG.drops.power.color, 16);
            }
        }

        if ((state.phase === 'ready' || state.phase === 'playing') && state.blocks.length === 0) {
            state.phase = 'level_complete';
            if (ysdk) ysdk.features.GameplayAPI.stop();
        }

        state.flashes = state.flashes.map(f => ({ ...f, alpha: f.alpha - 0.05, radius: f.radius + 1 })).filter(f => f.alpha > 0);
        state.floatingTexts = state.floatingTexts.map(t => ({ ...t, y: t.y + t.vy, alpha: t.alpha - 0.016 })).filter(t => t.alpha > 0);
    }

    function loop(timestamp) {
        requestAnimationFrame(loop);
        const dt = Math.min(timestamp - lastTime, 32);
        lastTime = timestamp;
        update(dt);
        Renderer.render(state);
    }

    function pauseGame()  { state.paused = true;  if (ysdk) ysdk.features.GameplayAPI.stop(); }
    function resumeGame() { state.paused = false; }

    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); else resumeGame(); });

    async function init() {
    await initYandexSDK();
    Renderer.init();                          // сначала рендерер
    Input.init(Renderer.getCanvas());         // потом инпут
    Input.onClickHandler(handleClick);
    lastTime = performance.now();
    requestAnimationFrame(loop);
    if (ysdk) await ysdk.features.LoadingAPI.ready();
}

    return { init };
})();

window.addEventListener('DOMContentLoaded', () => { Game.init(); });