// ============================================================
//  UPGRADES — постоянные апгрейды + модели дронов
// ============================================================

const Upgrades = (() => {

    const state = {
        // Базовые характеристики
        damage:     CONFIG.startDamage,
        incomeMult: 1.0,
        critChance: 0,
        paddleBonus: 0,  // бонус к ширине платформы в px

        // Уровни апгрейдов
        levels: {
            damage:      0,
            income:      0,
            paddle:      0,
            crit:        0,
            dropPower:   0,  // усиление дроп-апгрейдов
        },

        // Активная модель дрона
        activeDrone: 'default',

        // Купленные модели
        ownedDrones: ['default'],
    };

    // ---------- Конфиг апгрейдов ----------

    const upgradeDefs = {
        damage: {
            label: '⚡ Урон',
            desc:  '+1 к урону дрона',
            maxLevel: 10,
            cost: (lvl) => Math.round(50 * Math.pow(1.8, lvl)),
            apply: () => { state.damage++; },
        },
        income: {
            label: '💰 Доход',
            desc:  '+15% золота с блоков',
            maxLevel: 10,
            cost: (lvl) => Math.round(40 * Math.pow(1.7, lvl)),
            apply: () => { state.incomeMult += 0.15; },
        },
        paddle: {
            label: '⟺ Платформа',
            desc:  '+10px к ширине платформы',
            maxLevel: 8,
            cost: (lvl) => Math.round(60 * Math.pow(1.9, lvl)),
            apply: () => { state.paddleBonus += 10; },
        },
        crit: {
            label: '🎯 Крит',
            desc:  '+5% шанс двойного урона',
            maxLevel: 8,
            cost: (lvl) => Math.round(80 * Math.pow(2.0, lvl)),
            apply: () => { state.critChance += 0.05; },
        },
        dropPower: {
            label: '✨ Дропы',
            desc:  'Усиливает апгрейд-блоки',
            maxLevel: 5,
            cost: (lvl) => Math.round(100 * Math.pow(2.2, lvl)),
            apply: () => { /* эффект применяется в game.js */ },
        },
    };

    // ---------- Модели дронов ----------

    const droneDefs = {
        default: {
            label:  'Стандарт',
            desc:   'Сбалансированный дрон',
            cost:   0,
            color:  '#ffffff',
            speed:  1.0,    // множитель скорости
            damage: 1.0,    // множитель урона
            aoe:    false,
        },
        tank: {
            label:  'Танк',
            desc:   'Большой урон, медленный',
            cost:   15,
            color:  '#ff6600',
            speed:  0.6,
            damage: 2.5,
            aoe:    false,
        },
        shotgun: {
            label:  'Дробовик',
            desc:   'Постоянный малый АоЕ',
            cost:   20,
            color:  '#ff44ff',
            speed:  1.0,
            damage: 0.8,
            aoe:    true,
        },
        sniper: {
            label:  'Снайпер',
            desc:   'Редкие удары, огромный урон',
            cost:   25,
            color:  '#44ffff',
            speed:  0.8,
            damage: 4.0,
            aoe:    false,
        },
    };

    // ---------- API ----------

    function getState() { return state; }

    function getDroneDef(id) { return droneDefs[id] || droneDefs.default; }
    function getActiveDroneDef() { return getDroneDef(state.activeDrone); }
    function getAllDrones() { return droneDefs; }

    function getUpgradeDef(id) { return upgradeDefs[id]; }
    function getAllUpgrades() { return upgradeDefs; }

    function canBuyUpgrade(id) {
        const def = upgradeDefs[id];
        const lvl = state.levels[id];
        if (lvl >= def.maxLevel) return false;
        return Economy.getGold() >= def.cost(lvl);
    }

    function buyUpgrade(id) {
        if (!canBuyUpgrade(id)) return false;
        const def = upgradeDefs[id];
        const lvl = state.levels[id];
        Economy.spendGold(def.cost(lvl));
        state.levels[id]++;
        def.apply();
        return true;
    }

    function canBuyDrone(id) {
        if (state.ownedDrones.includes(id)) return false;
        return Economy.getCrystals() >= droneDefs[id].cost;
    }

    function buyDrone(id) {
        if (!canBuyDrone(id)) return false;
        Economy.spendCrystals(droneDefs[id].cost);
        state.ownedDrones.push(id);
        return true;
    }

    function setActiveDrone(id) {
        if (state.ownedDrones.includes(id)) {
            state.activeDrone = id;
        }
    }

    return {
        getState,
        getDroneDef,
        getActiveDroneDef,
        getAllDrones,
        getUpgradeDef,
        getAllUpgrades,
        canBuyUpgrade,
        buyUpgrade,
        canBuyDrone,
        buyDrone,
        setActiveDrone,
    };
})();