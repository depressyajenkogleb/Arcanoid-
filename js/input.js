// ============================================================
//  INPUT — клавиатура + мышь/тач для меню и игры
// ============================================================

const Input = (() => {

    const keys = {};
    let _onClick = null;
    let _canvas  = null;

    function init(canvas) {
        _canvas = canvas;

        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (['ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
        });
        document.addEventListener('keyup', (e) => { keys[e.code] = false; });

        // Клик мышью
        canvas.addEventListener('click', (e) => {
            if (_onClick) _onClick(getPos(canvas, e));
        });

        // Тач
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (_onClick && e.changedTouches.length) {
                _onClick(getTouchPos(canvas, e.changedTouches[0]));
            }
        }, { passive: false });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    function getPos(canvas, e) {
        const rect   = canvas.getBoundingClientRect();
        const scaleX = CONFIG.canvasWidth  / rect.width;
        const scaleY = CONFIG.canvasHeight / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    function getTouchPos(canvas, touch) {
        const rect   = canvas.getBoundingClientRect();
        const scaleX = CONFIG.canvasWidth  / rect.width;
        const scaleY = CONFIG.canvasHeight / rect.height;
        return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }

    function isLeft()  { return keys['ArrowLeft']  || keys['KeyA']; }
    function isRight() { return keys['ArrowRight'] || keys['KeyD']; }
    function isLaunch() {
        if (keys['Space']) { keys['Space'] = false; return true; }
        return false;
    }

    function onClickHandler(fn) { _onClick = fn; }

    // Проверка попадания в прямоугольник
    function hitTest(pos, x, y, w, h) {
        return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
    }

    return { init, isLeft, isRight, isLaunch, onClickHandler, hitTest };
})();