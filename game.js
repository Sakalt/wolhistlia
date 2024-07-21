const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let nations = [];
let ships = [];
let isIdleMode = false;
let currentYear = 0;
let currentMonth = 0;

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

// 船が目的地に到達した時の処理
function handleShipArrival(ship) {
    // 例: 目的地に到着した船の処理
    // ここで戦争や貿易などの処理を追加可能
}

// ポリゴン内の点を判定する関数
function isPointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > y) !== (yj > y)) &&
                          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 戦争を発生させる関数
function startWar() {
    nations.forEach(nation => {
        Object.keys(nation.relationships).forEach(otherNationName => {
            const relationship = nation.relationships[otherNationName];
            if (relationship === '敵対') {
                // 戦争を発生させる
                const otherNation = nations.find(n => n.name === otherNationName);
                if (otherNation) {
                    handleWar(nation, otherNation);
                }
            }
        });
    });
}

// 戦争処理
function handleWar(nation1, nation2) {
    // 戦争発生
    showNotification(`${nation1.name} と ${nation2.name} が戦争を開始しました！`);

    // 戦争の結果を決定
    if (Math.random() > 0.5) {
        nation1.population -= Math.floor(nation1.population * 0.1);
        nation2.population -= Math.floor(nation2.population * 0.1);
    } else {
        nation1.population -= Math.floor(nation1.population * 0.1);
        nation2.population -= Math.floor(nation2.population * 0.1);
    }

    // 国の生死を判定
    nation1.alive = nation1.population > 0;
    nation2.alive = nation2.population > 0;

    // 死亡した国の領土を削除
    if (!nation1.alive) {
        nations = nations.filter(n => n !== nation1);
    }
    if (!nation2.alive) {
        nations = nations.filter(n => n !== nation2);
    }
}

// 全てを描画する関数
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0);

    nations.forEach(nation => nation.draw());
    ships.forEach(ship => {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// 国を作成する関数
document.getElementById('createNation').addEventListener('click', () => {
    const name = document.getElementById('nationName').value;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const strength = parseInt(document.getElementById('nationStrength').value);
    const population = parseInt(document.getElementById('nationPopulation').value);
    const peaceLevel = parseInt(document.getElementById('nationPeaceLevel').value);
    const colorR = parseInt(document.getElementById('nationColorR').value);
    const colorG = parseInt(document.getElementById('nationColorG').value);
    const colorB = parseInt(document.getElementById('nationColorB').value);
    const color = `${colorR},${colorG},${colorB}`;
    const armySize = parseInt(document.getElementById('nationArmySize').value);
    const shipCount = parseInt(document.getElementById('nationShips').value);
    const flagSize = parseInt(document.getElementById('flagSize').value);

    const newNation = new Nation(name, x, y, strength, population, peaceLevel, color, armySize, shipCount, flagSize);
    nations.push(newNation);
    drawAll();
});

// ゲームをリセットする関数
document.getElementById('resetGame').addEventListener('click', () => {
    nations = [];
    ships = [];
    drawAll();
});

// ゲームを保存する関数
document.getElementById('saveGame').addEventListener('click', () => {
    localStorage.setItem('nations', JSON.stringify(nations));
    localStorage.setItem('ships', JSON.stringify(ships));
    showNotification('ゲームが保存されました');
});

// ゲームを読み込む関数
document.getElementById('loadGame').addEventListener('click', () => {
    nations = JSON.parse(localStorage.getItem('nations')) || [];
    ships = JSON.parse(localStorage.getItem('ships')) || [];
    drawAll();
});

// 船を追加する関数
document.getElementById('addShip').addEventListener('click', () => {
    const nation = nations[0]; // 例として最初の国を選択
    const ship = new Ship(Math.random() * canvas.width, Math.random() * canvas.height, nation);
    ships.push(ship);
});

// 放置モードのトグル
document.getElementById('toggleIdleMode').addEventListener('click', (event) => {
    isIdleMode = !isIdleMode;
    event.target.textContent = `放置モード: ${isIdleMode ? 'オン' : 'オフ'}`;
    if (isIdleMode) {
        setInterval(() => {
            nations.forEach(nation => nation.expandTerritory(5));
            drawAll();
        }, 2000); // 2秒ごとに領土拡大
    }
});

// 戦争開始ボタンのイベント
document.getElementById('startWar').addEventListener('click', startWar);

// 年月の表示更新
function updateDate() {
    currentMonth += 1;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
    }
    document.getElementById('dateDisplay').textContent = `年月: ${currentYear}年${currentMonth}月`;
}
setInterval(updateDate, 1000); // 1秒ごとに年月更新

// 通知を表示する関数
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 描画と動作を初期化
drawAll();
