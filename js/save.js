// ============================================================
//  SAVE — сохранения
// ============================================================

const Save = (() => {

    const KEY = 'idleMiner_save';

    function save(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Save] localStorage недоступен:', e);
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('[Save] Ошибка чтения:', e);
            return null;
        }
    }

    function clear() {
        localStorage.removeItem(KEY);
    }

    return { save, load, clear };

})();