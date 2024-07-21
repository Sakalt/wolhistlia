const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let nations = [];
let ships = [];
let isIdleMode = false;
let year = 0;

// 背景画像の初期化
const worldImage = new Image();
worldImage.src = 'world.png'; // 背景画像のパス

// 国のコンストラクタ
function Nation(name, x, y, strength, population, peaceLevel, color, armySize, shipCount, flagSize) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.strength = strength;
    this.population = population;
    this.peaceLevel = peaceLevel;
    this.color = color; // RGB形式
    this.armySize = armySize;
    this.ships = shipCount;
    this.flagSize = flagSize;
    this.territory = [{ x: x, y: y, radius: flagSize / 2 }];
    this.exclaves = [];
    this.generateExclave();
    this.alive = true;
    this.relationships = {}; // 他国との関係性（友好度/敵対度）
    this.generateRelationships();
}

// 飛地生成
Nation.prototype.generateExclave = function() {
    const numExclaves = Math.floor(Math.random() * 3); // 最大で3つの飛地
    for (let i = 0; i < numExclaves; i++) {
        const xOffset = Math.random() * 200 - 100;
        const yOffset = Math.random() * 200 - 100;
        this.exclaves.push({ x: this.x + xOffset, y: this.y + yOffset });
    }
};

// 国同士の関係性生成
Nation.prototype.generateRelationships = function() {
    nations.forEach(otherNation => {
        if (otherNation !== this) {
            this.relationships[otherNation.name] = Math.random() > 0.5 ? '友好' : '敵対';
        }
    });
};

// 領土拡大
Nation.prototype.expandTerritory = function(amount) {
    this.territory.forEach(area => {
        area.radius += amount;
    });
};

// ポリゴンで領土を描画
Nation.prototype.draw = function() {
    if (!this.alive) return; // 死亡している国は描画しない

    // 領土の描画
    ctx.fillStyle = `rgba(${this.color}, 0.5)`; // 半透明
    this.territory.forEach(area => {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    });

    // 飛地の描画
    this.exclaves.forEach(exclave => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(exclave.x, exclave.y, 20, 20);
    });

    // 国旗の描画
    ctx.fillStyle = `rgb(${this.color})`;
    ctx.fillRect(this.x, this.y, this.flagSize, this.flagSize);
    ctx.strokeRect(this.x, this.y, this.flagSize, this.flagSize);

    // 国名の描画
    ctx.fillStyle = '#000';
    ctx.fillText(this.name, this.x + 5, this.y + this.flagSize / 2);
};

// 船のコンストラクタ
function Ship(x, y, nation) {
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.target = null; // 目的地
}

// 船を移動させる関数
function moveShips() {
    ships.forEach(ship => {
        if (ship.target) {
            const dx = ship.target.x - ship.x;
            const dy = ship.target.y - ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 1) {
                // 目的地に到達
                handleShipArrival(ship);
                return;
            }
            // 移動速度
            const speed = 1;
            ship.x += dx / distance * speed;
            ship.y += dy / distance * speed;
        }
    });
}

// 船が目的地に到達したときの処理
function handleShipArrival(ship) {
    const targetNation = nations.find(nation => 
        nation.x < ship.x && ship.x < nation.x + nation.flagSize &&
        nation.y < ship.y && ship.y < nation.y + nation.flagSize
    );
    if (targetNation) {
        // 国に侵攻する
        handleInvasion(ship, targetNation);
    }
    // 目的地をクリア
    ship.target = null;
}

// 国に対する侵攻処理
function handleInvasion(ship, nation) {
    if (nation.relationships[ship.nation.name] === '敵対') {
        // 戦争が起こる
        const battleOutcome = Math.random();
        if (battleOutcome < 0.5) {
            // 勝利
            nation.alive = false;
            showNotification(`${nation.name} が滅亡しました！`);
        } else {
            // 敗北
            showNotification(`${ship.nation.name} が敗北しました！`);
        }
    } else {
        showNotification(`${ship.nation.name} は ${nation.name} に侵攻しましたが、戦争にはなりませんでした。`);
    }
}

// 船の目的地を設定する関数
function setShipTarget(ship, x, y) {
    ship.target = { x, y };
}

// 新しい船を作成
function createShip(x, y, nation) {
    const newShip = new Ship(x, y, nation);
    ships.push(newShip);
    return newShip;
}

// すべての国と船を描画
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(worldImage, 0, 0, canvas.width, canvas.height); // 背景画像を描画
    nations.forEach(nation => nation.draw());
    ships.forEach(ship => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(ship.x, ship.y, 10, 5);
    });
}

// 新しい国を作成
function createNation() {
    const name = document.getElementById('nationName').value || generateRandomName();
    const x = Math.random() * (canvas.width - 100);
    const y = Math.random() * (canvas.height - 100);
    const strength = parseInt(document.getElementById('nationStrength').value);
    const population = parseInt(document.getElementById('nationPopulation').value);
    const peaceLevel = parseInt(document.getElementById('nationPeaceLevel').value);
    const color = `${document.getElementById('nationColorR').value},${document.getElementById('nationColorG').value},${document.getElementById('nationColorB').value}`;
    const armySize = parseInt(document.getElementById('nationArmySize').value);
    const shipCount = parseInt(document.getElementById('nationShips').value);
    const flagSize = parseInt(document.getElementById('flagSize').value);
    
    const newNation = new Nation(name, x, y, strength, population, peaceLevel, color, armySize, shipCount, flagSize);
    nations.push(newNation);
    drawAll();
}

// ランダムな国名生成
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

// リセット
function resetGame() {
    nations = [];
    ships = [];
    drawAll();
}

// 保存
function saveGame() {
    localStorage.setItem('nations', JSON.stringify(nations));
    localStorage.setItem('ships', JSON.stringify(ships));
    showNotification('ゲームデータを保存しました。');
}

// 読み込み
function loadGame() {
    nations = JSON.parse(localStorage.getItem('nations')) || [];
    ships = JSON.parse(localStorage.getItem('ships')) || [];
    drawAll();
}

// 通知表示
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}

// 放置モードのトグル
document.getElementById('toggleIdleMode').addEventListener('click', () => {
    isIdleMode = !isIdleMode;
    document.getElementById('toggleIdleMode').textContent = isIdleMode ? 'オフ' : 'オン';
});

// 定期的なゲーム進行
function gameLoop() {
    if (isIdleMode) {
        moveShips();
        nations.forEach(nation => {
            if (nation.alive) {
                nation.expandTerritory(0.1); // 小さな領土拡大
            }
        });
        drawAll();
    }
    requestAnimationFrame(gameLoop);
}

// 初期化
worldImage.onload = () => {
    // 初期化
    gameLoop();
};

// 新しい船を作成して目的地を設定するサンプル
function addShip() {
    const nation = nations[0]; // 仮に最初の国にする
    const x = nation.x;
    const y = nation.y;
    const newShip = createShip(x, y, nation);
    setShipTarget(newShip, Math.random() * canvas.width, Math.random() * canvas.height);
}
