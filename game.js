const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let nations = [];
let ships = [];
let isIdleMode = false;
let year = 0;

function Nation(name, x, y, strength, population, peaceLevel, color, armySize, ships, flagSize) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.strength = strength;
    this.population = population;
    this.peaceLevel = peaceLevel;
    this.color = color;
    this.armySize = armySize;
    this.ships = ships;
    this.flagSize = flagSize;
    this.territory = [{ x: x, y: y, radius: flagSize / 2 }];
    this.exclaves = [];
    this.generateExclave();
    this.alive = true;
}

Nation.prototype.generateExclave = function() {
    const numExclaves = Math.floor(Math.random() * 3); // 最大で3つの飛地
    for (let i = 0; i < numExclaves; i++) {
        const xOffset = Math.random() * 200 - 100;
        const yOffset = Math.random() * 200 - 100;
        this.exclaves.push({ x: this.x + xOffset, y: this.y + yOffset });
    }
};

Nation.prototype.expandTerritory = function(amount) {
    this.territory.push({ x: this.x, y: this.y, radius: this.flagSize / 2 + amount });
};

Nation.prototype.draw = function() {
    if (!this.alive) return; // 死亡している国は描画しない

    // 領土の描画
    ctx.fillStyle = `rgba(0, 0, 0, 0.5)`; // 半透明
    this.territory.forEach(area => {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 国旗の描画
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.flagSize, this.flagSize);
    ctx.strokeRect(this.x, this.y, this.flagSize, this.flagSize);

    // 国名の描画
    ctx.fillStyle = '#000';
    ctx.fillText(this.name, this.x + 5, this.y + this.flagSize / 2);

    // 飛地の描画
    this.exclaves.forEach(exclave => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(exclave.x, exclave.y, 20, 20);
    });

    // 船の描画
    this.ships.forEach(ship => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(ship.x, ship.y, 10, 5);
    });
};

function Ship(x, y, nation) {
    this.x = x;
    this.y = y;
    this.nation = nation;
}

function generateRandomName() {
    const syllables = ['k', 's', 't', 'm', 'y', 'r', 'w', 'h', 'g', 'z', 'd', 'p', 'ch', 'sh', 'zh'];
    const vowels = ['a', 'i', 'u', 'e', 'o', 'ea'];
    let name = '';
    for (let i = 0; i < 3; i++) {
        name += syllables[Math.floor(Math.random() * syllables.length)];
        name += vowels[Math.floor(Math.random() * vowels.length)];
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getRandomPosition() {
    let x, y, overlapping;
    do {
        x = Math.random() * (canvas.width - 50);
        y = Math.random() * (canvas.height - 50);
        overlapping = nations.some(nation => {
            return x < nation.x + nation.flagSize &&
                   x + nation.flagSize > nation.x &&
                   y < nation.y + nation.flagSize &&
                   y + nation.flagSize > nation.y;
        });
    } while (overlapping);
    return { x, y };
}

function createNation() {
    const name = document.getElementById('nationName').value || generateRandomName();
    const strength = parseInt(document.getElementById('nationStrength').value, 10);
    const population = parseInt(document.getElementById('nationPopulation').value, 10);
    const peaceLevel = parseInt(document.getElementById('nationPeaceLevel').value, 10);
    const color = `rgb(${parseInt(document.getElementById('nationColorR').value, 10)}, ${parseInt(document.getElementById('nationColorG').value, 10)}, ${parseInt(document.getElementById('nationColorB').value, 10)})`;
    const armySize = parseInt(document.getElementById('nationArmySize').value, 10);
    const ships = Array.from({length: parseInt(document.getElementById('nationShips').value, 10)}, () => ({
        x: getRandomPosition().x,
        y: getRandomPosition().y
    }));
    const flagSize = parseInt(document.getElementById('flagSize').value, 10);
    const position = getRandomPosition();
    const newNation = new Nation(name, position.x, position.y, strength, population, peaceLevel, color, armySize, ships, flagSize);
    nations.push(newNation);
    drawAllNations();
}

function editNation() {
    const name = document.getElementById('nationName').value;
    const nation = nations.find(n => n.name === name);
    if (nation) {
        nation.strength = parseInt(document.getElementById('nationStrength').value, 10);
        nation.population = parseInt(document.getElementById('nationPopulation').value, 10);
        nation.peaceLevel = parseInt(document.getElementById('nationPeaceLevel').value, 10);
        nation.color = `rgb(${parseInt(document.getElementById('nationColorR').value, 10)}, ${parseInt(document.getElementById('nationColorG').value, 10)}, ${parseInt(document.getElementById('nationColorB').value, 10)})`;
        nation.armySize = parseInt(document.getElementById('nationArmySize').value, 10);
        nation.ships = Array.from({length: parseInt(document.getElementById('nationShips').value, 10)}, () => ({
            x: getRandomPosition().x,
            y: getRandomPosition().y
        }));
        nation.flagSize = parseInt(document.getElementById('flagSize').value, 10);
        drawAllNations();
    } else {
        showNotification('指定された国が見つかりません。');
    }
}

function drawAllNations() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nations.forEach(nation => nation.draw());
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function toggleIdleMode() {
    isIdleMode = !isIdleMode;
    document.getElementById('toggleIdleMode').textContent = isIdleMode ? 'オフ' : 'オン';
    if (isIdleMode) {
        idleModeUpdate();
    }
}

function idleModeUpdate() {
    if (!isIdleMode) return;

    // 自動で戦争、併合、滅亡、反乱などのイベントを処理
    if (Math.random() < 0.1) triggerWar();
    if (Math.random() < 0.05) triggerAnnexation();
    nations.forEach(nation => {
        if (Math.random() < 0.01) triggerCollapse(nation);
    });
    drawAllNations();
}

function triggerWar() {
    const nation1 = nations[Math.floor(Math.random() * nations.length)];
    const nation2 = nations[Math.floor(Math.random() * nations.length)];
    if (nation1 && nation2 && nation1 !== nation2 && nation1.alive && nation2.alive) {
        showNotification(`${nation1.name} と ${nation2.name} の間で戦争が発生しました！`);
        const lossFactor = 0.05;
        nation1.population -= Math.floor(nation2.armySize * lossFactor);
        nation2.population -= Math.floor(nation1.armySize * lossFactor);
        nation1.armySize = Math.max(nation1.armySize - nation2.armySize * lossFactor, 0);
        nation2.armySize = Math.max(nation2.armySize - nation1.armySize * lossFactor, 0);
        nation1.population = Math.max(nation1.population, 0);
        nation2.population = Math.max(nation2.population, 0);
    }
}

function triggerAnnexation() {
    const nation1 = nations[Math.floor(Math.random() * nations.length)];
    const nation2 = nations[Math.floor(Math.random() * nations.length)];
    if (nation1 && nation2 && nation1 !== nation2 && nation1.alive && nation2.alive) {
        showNotification(`${nation1.name} が ${nation2.name} を併合しました！`);
        nation1.expandTerritory(nation2.flagSize);
        nation2.alive = false; // 併合された国は滅亡
    }
}

function triggerCollapse(nation) {
    if (nation.alive) {
        showNotification(`${nation.name} が滅亡しました！`);
        nation.alive = false;
    }
}

function moveShips() {
    nations.forEach(nation => {
        nation.ships.forEach(ship => {
            const xOffset = Math.random() * 10 - 5;
            const yOffset = Math.random() * 10 - 5;
            ship.x = Math.max(0, Math.min(canvas.width, ship.x + xOffset));
            ship.y = Math.max(0, Math.min(canvas.height, ship.y + yOffset));
            nations.forEach(otherNation => {
                if (otherNation !== nation && otherNation.alive && isShipInOtherNation(ship, otherNation)) {
                    showNotification(`${nation.name} の船が ${otherNation.name} の領土に侵入しました！`);
                    triggerWar();
                }
            });
        });
    });
}

function isShipInOtherNation(ship, nation) {
    return nation.territory.some(area => {
        const dx = ship.x - area.x;
        const dy = ship.y - area.y;
        return Math.sqrt(dx * dx + dy * dy) < area.radius;
    });
}

function resetGame() {
    nations = [];
    ships = [];
    year = 0;
    drawAllNations();
}

function saveGame() {
    const gameState = {
        nations,
        year
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
    showNotification('ゲームが保存されました。');
}

function loadGame() {
    const gameState = JSON.parse(localStorage.getItem('gameState'));
    if (gameState) {
        nations = gameState.nations.map(nationData => Object.assign(new Nation(), nationData));
        year = gameState.year;
        drawAllNations();
        showNotification('ゲームが読み込まれました。');
    } else {
        showNotification('保存されたゲームが見つかりません。');
    }
}

document.getElementById('toggleIdleMode').addEventListener('click', toggleIdleMode);

// 定期的な更新
setInterval(() => {
    if (isIdleMode) {
        idleModeUpdate();
        moveShips();
    }
    year++;
}, 1000);
