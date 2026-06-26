// ============================================================
//  ECONOMY — золото + кристаллы
// ============================================================

const Economy = (() => {

    let gold      = 0;
    let crystals  = 0;

    function addGold(amount)      { gold += amount; }
    function getGold()            { return Math.floor(gold); }
    function spendGold(amount)    { gold = Math.max(0, gold - amount); }

    function addCrystals(amount)  { crystals += amount; }
    function getCrystals()        { return crystals; }
    function spendCrystals(amount){ crystals = Math.max(0, crystals - amount); }

    function reset() { gold = 0; crystals = 0; }

    return { addGold, getGold, spendGold, addCrystals, getCrystals, spendCrystals, reset };

})();