(function() {

    /**
     * Профилировщик.
     * @mixin
     * @description
     * Этот mixin надо подмешивать в прототип класса.
     * ```js
     * no.extend(ns.Update.prototype, no.profile);
     * ```
     */
    ns.profile = {};

    /**
     * Ставит начальную точку отчета для метрики.
     * @param {string} label Название метрики.
     */
    ns.profile.startTimer = function(label) {
        if (!this._profileTimes) {
            this._profileTimes = {};
        }

        // проверяем, что таймер пустой
        ns.assert(!this._profileTimes[label], 'ns.profile', "Timer '%s' is in use", label);
        this._profileTimes[label] = Date.now();
    };

    /**
     * Ставит конечную точку отчета для метрики.
     * @param {string} label Название метрики.
     * @returns {number} Рассчитанное значение метрики.
     */
    ns.profile.stopTimer = function(label) {
        if (!this._profileTimes) {
            this._profileTimes = {};
        }

        // проверяем, что таймер непустой
        ns.assert(this._profileTimes[label], 'ns.profile', "Timer '%s' haven't been started", label);
        this._profileTimes[label] = Date.now() - this._profileTimes[label];

        return this._profileTimes[label];
    };

    /**
     * Возвращает значение метрики.
     * @param {string} label Название метрики.
     * @returns {number}
     */
    ns.profile.getTimer = function(label) {
        if (!this._profileTimes) {
            this._profileTimes = {};
        }
        // проверяем typeof, чтобы возвращать 0
        var value = this._profileTimes[label];
        return typeof value === 'number' ? value : NaN;
    };

})();
