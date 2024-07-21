const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let nations = [];
let ships = [];
let isIdleMode = false;
const backgroundImage = new Image(); // 背景画像のオブジェクト
backgroundImage.src = 'world.png';   // 画像ファイルのパスを設定
let backgroundLoaded = false;

// 画像の読み込み
backgroundImage.src = 'world.png';
backgroundImage.onload = function() {
    backgroundLoaded = true;
    drawAll(); // 画像が読み込まれた後に描画を開始
};

// すべての国と船を描画
function drawAll() {
    if (!backgroundLoaded) return; // 背景画像が読み込まれていない場合は描画しない

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height); // 背景画像を描画

    nations.forEach(nation => nation.draw());
    ships.forEach(ship => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(ship.x, ship.y, 10, 5);
    });
}

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

// 新しい国を作成
function createNation() {
    const name = document.getElementById('nationName').value || generateRandomName();
    const x = Math.random() * (canvas.width - 100);
    const y = Math.random() * (canvas.height - 100);
    const strength = parseInt(document.getElementById('nationStrength').value) || 0;
    const population = parseInt(document.getElementById('nationPopulation').value) || 0;
    const peaceLevel = parseInt(document.getElementById('nationPeaceLevel').value) || 0;
    const color = `${document.getElementById('nationColorR').value || 0},${document.getElementById('nationColorG').value || 0},${document.getElementById('nationColorB').value || 0}`;
    const armySize = parseInt(document.getElementById('nationArmySize').value) || 0;
    const shipCount = parseInt(document.getElementById('nationShips').value) || 0;
    const flagSize = parseInt(document.getElementById('flagSize').value) || 20;

    const newNation = new Nation(name, x, y, strength, population, peaceLevel, color, armySize, shipCount, flagSize);
    nations.push(newNation);
    drawAll();
}

// 国をリセット
function resetGame() {
    nations = [];
    ships = [];
    drawAll();
}

// ゲームの状態を保存
function saveGame() {
    const gameState = {
        nations: nations.map(nation => ({
            name: nation.name,
            x: nation.x,
            y: nation.y,
            strength: nation.strength,
            population: nation.population,
            peaceLevel: nation.peaceLevel,
            color: nation.color,
            armySize: nation.armySize,
            ships: nation.ships,
            flagSize: nation.flagSize,
            territory: nation.territory,
            exclaves: nation.exclaves,
            alive: nation.alive,
            relationships: nation.relationships
        })),
        ships: ships
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
    showNotification('ゲームが保存されました。');
}

// ゲームの状態を読み込む
function loadGame() {
    const gameState = JSON.parse(localStorage.getItem('gameState'));
    if (gameState) {
        nations = gameState.nations.map(nation => new Nation(
            nation.name,
            nation.x,
            nation.y,
            nation.strength,
            nation.population,
            nation.peaceLevel,
            nation.color,
            nation.armySize,
            nation.ships,
            nation.flagSize
        ));
        ships = gameState.ships.map(ship => new Ship(ship.x, ship.y, nations.find(nation => nation.name === ship.nation.name)));
        drawAll();
        showNotification('ゲームが読み込まれました。');
    } else {
        showNotification('保存されたゲームがありません。');
    }
}

// 新しい船を追加
function addShip() {
    const nationName = prompt('船を追加する国の名前を入力してください:');
    const nation = nations.find(n => n.name === nationName);
    if (nation) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        createShip(x, y, nation);
        drawAll();
        showNotification(`国 ${nationName} に新しい船が追加されました。`);
    } else {
        showNotification('指定された国が見つかりません。');
    }
}

// 通知を表示する関数
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// ランダムな国名を生成する関数（例）
function generateRandomName() {
    const names = ['エルドリア', 'アストラ', 'ザリオン', 'フェリシア', 'ノヴァ'];
    return names[Math.floor(Math.random() * names.length)];
}

// ゲームループの設定
function gameLoop() {
    if (!isIdleMode) {
        moveShips();
    }
    handleTerritoryOverlap(); // 領土の重なりチェック
    nations.forEach(nation => {
        if (nation.alive) {
            nation.expandTerritory(0.1); // 領土の拡大
        }
    });
    drawAll();
    requestAnimationFrame(gameLoop);
}

// ボタンのイベントリスナーを設定
document.getElementById('toggleIdleMode').addEventListener('click', () => {
    isIdleMode = !isIdleMode;
    document.getElementById('toggleIdleMode').textContent = `放置モード: ${isIdleMode ? 'オン' : 'オフ'}`;
});

// 初期化とゲームループの開始
gameLoop();
