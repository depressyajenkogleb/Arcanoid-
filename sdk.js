// ============================================================
//  sdk.js — ЗАГЛУШКА для локальной разработки
//  Имитирует Yandex Games SDK без сети
//  УДАЛИТЬ перед публикацией на Яндекс Игры!
// ============================================================

window.YaGames = {
    init: () => Promise.resolve({

        environment: {
            i18n: { lang: 'ru' },
            app:  { id: 'local-dev' },
        },

        features: {
            LoadingAPI: {
                ready: () => {
                    console.log('[SDK stub] LoadingAPI.ready()');
                    return Promise.resolve();
                },
            },
            GameplayAPI: {
                start: () => console.log('[SDK stub] GameplayAPI.start()'),
                stop:  () => console.log('[SDK stub] GameplayAPI.stop()'),
            },
        },

        adv: {
            showFullscreenAdv: ({ onClose }) => {
                console.log('[SDK stub] showFullscreenAdv');
                setTimeout(() => onClose && onClose(true), 500);
            },
            showRewardedVideo: ({ callbacks }) => {
                console.log('[SDK stub] showRewardedVideo');
                setTimeout(() => {
                    callbacks?.onRewarded?.();
                    callbacks?.onClose?.();
                }, 500);
            },
        },

        getPlayer: () => Promise.resolve({
            isAuthorized: () => false,
            getData:      () => Promise.resolve({}),
            setData:      (data) => {
                console.log('[SDK stub] player.setData()', data);
                return Promise.resolve();
            },
            getStats:     () => Promise.resolve({}),
            setStats:     (stats) => {
                console.log('[SDK stub] player.setStats()', stats);
                return Promise.resolve();
            },
        }),

        on:  (event, cb) => console.log('[SDK stub] on:', event),
        off: (event, cb) => console.log('[SDK stub] off:', event),
    }),
};

console.log('[SDK stub] Заглушка загружена. Удали sdk.js перед публикацией!');
