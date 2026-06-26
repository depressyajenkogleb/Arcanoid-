// ============================================================
//  CONFIG — весь баланс игры
// ============================================================

const CONFIG = {

    // --- Canvas ---
    canvasWidth:  416,
    canvasHeight: 800,

    // --- Сетка блоков ---
    cols: 8,
    rows: 8,
    blockSize: 52,

    // --- Дрон ---
    startDamage: 1,
    droneRadius: 8,
    droneSpeed:  2,
    droneSpeedIncrement: 0.01,  // +0.5% за каждый отскок
    droneSpeedOnMiss:    0.3,    // 30% скорости при промахе

    // --- HP блоков: HP = глубина * 0.5 + 5 ---
    hpBase:     5,
    hpPerMeter: 0.5,

    // --- Платформа ---
    paddleWidth:  100,
    paddleHeight: 10,
    paddleSpeed:  3.5,
    paddleY:      740,   // Y позиция платформы
    paddleWideBonusTime: 10000, // мс

    // --- Жизни ---
    startLives: 3,

    // --- Руды (биом 1) ---
    ores: [
        { name: 'stone',  minDepth:   0, color: '#7a7a7a', reward: 1  },
        { name: 'coal',   minDepth:  50, color: '#3a3a3a', reward: 2  },
        { name: 'iron',   minDepth: 150, color: '#a0785a', reward: 4  },
        { name: 'silver', minDepth: 250, color: '#c0c8d0', reward: 8  },
        { name: 'gold',   minDepth: 350, color: '#f0c030', reward: 15 },
        { name: 'ruby',   minDepth: 450, color: '#e03040', reward: 30 },
    ],

    // --- Глубина ---
    metersPerRow: 5,

    // --- UI ---
    panelHeight:  60,
    hpBarHeight:  4,

    // --- Особые блоки ---
    special: {
        chest:    { chance: 0.03, rewardMult: 5  },
        dynamite: { chance: 0.01 },
        vein:     { chance: 0.005, rewardMult: 20 },
    },

    // --- Дроп-апгрейды ---
    drops: {
        power:     { chance: 0.02, color: '#ff0088', label: '⚡'  },
        triple:    { chance: 0.02, color: '#00ffaa', label: '×3'  },
        explosive: { chance: 0.02, color: '#ff6600', label: '💥'  },
        wide:      { chance: 0.02, color: '#44aaff', label: '⟺'   },
        shield:    { chance: 0.01, color: '#ffdd00', label: '🛡'  },
        laser:     { chance: 0.02, color: '#ff44ff', label: '▶▶'  },
    },

    // --- Цвета ---
    colors: {
        bg:        '#0a0a0f',
        panelBg:   '#1a1a2a',
        hpBarBg:   '#00000060',
        hpBarFill: '#44ff88',
        drone:     '#ffffff',
        droneGlow: '#ffaa00',
        paddle:    '#00eeff',
        paddleGlow:'#0088aa',
        text:      '#ffffff',
        textDim:   '#aaaaaa',
        gold:      '#f0c030',
        accent:    '#ffdd00',
        heart:     '#ff4466',
    },
};