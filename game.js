const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let nations = [];
let ships = [];
let isIdleMode = false;

// 背景画像の設定
const backgroundImage = new Image();
backgroundImage.src = 'world.png';
backgroundImage.onload = () => {
    drawAll();
};

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
    this.territory = this.generatePolygonTerritory();
    this.exclaves = [];
    this.alive = true;
    this.relationships = {}; // 他国との関係性（友好度/敵対度）
    this.generateRelationships();
}

// ポリゴンの領土を生成
Nation.prototype.generatePolygonTerritory = function() {
    const vertices = Math.floor(Math.random() * 6) + 3; // 3〜8辺のポリゴン
    const radius = this.flagSize / 2;
    const points = [];
    for (let i = 0; i < vertices; i++) {
        const angle = (i / vertices) * 2 * Math.PI;
        const x = this.x + radius * Math.cos(angle);
        const y = this.y + radius * Math.sin(angle);
        points.push({ x, y });
    }
    return points;
};

// ポリゴンの領土を拡大
Nation.prototype.expandTerritory = function(expansionAmount) {
    const newPoints = [];
    this.territory.forEach((point, index) => {
        const nextPoint = this.territory[(index + 1) % this.territory.length];
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;

        newPoints.push({
            x: point.x + normalizedDx * expansionAmount,
            y: point.y + normalizedDy * expansionAmount
        });
    });
    this.territory = newPoints;
};

// ポリゴンで領土を描画
Nation.prototype.draw = function() {
    if (!this.alive) return; // 死亡している国は描画しない

    // 領土の描画
    ctx.fillStyle = `rgba(${this.color}, 0.5)`; // 半透明
    ctx.beginPath();
    this.territory.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.closePath();
    ctx.fill();

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

    // 船の描画
    // No need to draw here, ships are handled separately
};

// 国同士の関係性生成
Nation.prototype.generateRelationships = function() {
    nations.forEach(otherNation => {
        if (otherNation !== this) {
            this.relationships[otherNation.name] = Math.random() > 0.5 ? '友好' : '敵対';
        }
    });
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
        isPointInPolygon(ship.x, ship.y, nation.territory)
    );
    if (targetNation) {
        // 国に侵攻する
        handleInvasion(ship, targetNation);
    }
    // 目的地をクリア
    ship.target = null;
}

// ポリゴン内に点があるかをチェックする関数
function isPointInPolygon(x, y, polygon) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

// ポリゴンが重なっているかどうかを判定する関数
function polygonsOverlap(polygon1, polygon2) {
    for (let i = 0; i < polygon1.length; i++) {
        const p1 = polygon1[i];
        const p2 = polygon1[(i + 1) % polygon1.length];
        for (let j = 0; j < polygon2.length; j++) {
            const q1 = polygon2[j];
            const q2 = polygon2[(j + 1) % polygon2.length];
            if (linesIntersect(p1, p2, q1, q2)) {
                return true;
            }
        }
    }
    return false;
}

// 線分が交差しているかどうかを判定する関数
function linesIntersect(p1, p2, q1, q2) {
    function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }
    return ccw(p1, q1, q2) != ccw(p2, q1, q2) && ccw(p1, p2, q1) != ccw(p1, p2, q2);
}

// 領土が重なった場合の処理
function handleTerritoryOverlap() {
    for (let i = 0; i < nations.length; i++) {
        for (let j = i + 1; j < nations.length; j++) {
            if (polygonsOverlap(nations[i].territory, nations[j].territory)) {
                // 領土が重なった場合の処理
                // ここでは簡単に両方の領土を一時的に縮小する例
                nations[i].expandTerritory(-10);
                nations[j].expandTerritory(-10);
            }
        }
    }
}

// 国に対する侵攻処理
function handleInvasion(ship, nation) {
    if (nation.relationships[ship.nation.name] === '敵対') {
        // 簡単な侵攻ロジック：攻撃側の国力と防御側の国力を比較
        if (ship.nation.strength > nation.strength) {
            // 防御側の国を滅ぼす
            nation.alive = false;
        } else {
            // 攻撃側の国が敗北
            ship.nation.alive = false;
        }
    }
}

// 国を生成する関数
function createNation() {
    const name = document.getElementById('nationName').value;
    const strength = parseInt(document.getElementById('nationStrength').value, 10);
    const population = parseInt(document.getElementById('nationPopulation').value, 10);
    const peaceLevel = parseInt(document.getElementById('nationPeaceLevel').value, 10);
    const colorR = parseInt(document.getElementById('nationColorR').value, 10);
    const colorG = parseInt(document.getElementById('nationColorG').value, 10);
    const colorB = parseInt(document.getElementById('nationColorB').value, 10);
    const armySize = parseInt(document.getElementById('nationArmySize').value, 10);
    const shipCount = parseInt(document.getElementById('nationShips').value, 10);
    const flagSize = parseInt(document.getElementById('flagSize').value, 10);

    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;

    const color = `${colorR}, ${colorG}, ${colorB}`;
    const newNation = new Nation(name, x, y, strength, population, peaceLevel, color, armySize, shipCount, flagSize);
    nations.push(newNation);
    drawAll();
}

// ゲームをリセットする関数
function resetGame() {
    nations = [];
    ships = [];
    drawAll();
}

// ゲームを保存する関数
function saveGame() {
    const gameData = {
        nations: nations,
        ships: ships
    };
    localStorage.setItem('gameData', JSON.stringify(gameData));
    showNotification('ゲームデータが保存されました');
}

// ゲームを読み込む関数
function loadGame() {
    const gameData = JSON.parse(localStorage.getItem('gameData'));
    if (gameData) {
        nations = gameData.nations;
        ships = gameData.ships;
        drawAll();
        showNotification('ゲームデータが読み込まれました');
    } else {
        showNotification('保存されたゲームデータが見つかりません');
    }
}

// 新しい船を追加する関数
function addShip() {
    if (nations.length > 0) {
        const randomNation = nations[Math.floor(Math.random() * nations.length)];
        const ship = new Ship(randomNation.x, randomNation.y, randomNation);
        ships.push(ship);
        drawAll();
    }
}

// 放置モードを切り替える関数
function toggleIdleMode() {
    isIdleMode = !isIdleMode;
    document.getElementById('toggleIdleMode').textContent = `放置モード: ${isIdleMode ? 'オン' : 'オフ'}`;
}

// 通知を表示する関数
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

// 全ての描画を行う関数
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    nations.forEach(nation => nation.draw());
    // ここで船の描画を追加する
    ships.forEach(ship => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(ship.x, ship.y, 5, 5);
    });
}

// 各ボタンのイベントリスナーを設定
document.getElementById('createNation').addEventListener('click', createNation);
document.getElementById('resetGame').addEventListener('click', resetGame);
document.getElementById('saveGame').addEventListener('click', saveGame);
document.getElementById('loadGame').addEventListener('click', loadGame);
document.getElementById('addShip').addEventListener('click', addShip);
document.getElementById('toggleIdleMode').addEventListener('click', toggleIdleMode);

// ゲームの初期描画
drawAll();
