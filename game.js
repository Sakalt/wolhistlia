const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let nations = [];
let ships = [];
let isIdleMode = false;
let currentYear = 0;
let currentMonth = 0;
let selectedNation = null; // 選択された国

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
    this.capital = { x: x, y: y }; // 首都の位置
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

    // 首都の描画
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.capital.x, this.capital.y, 5, 0, 2 * Math.PI);
    ctx.fill();
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
        isPointInPolygon(ship.target.x, ship.target.y, nation.territory)
    );
    if (targetNation && targetNation !== ship.nation) {
        targetNation.exclaves.push({ x: ship.target.x, y: ship.target.y });
        // もし首都が陥落した場合、国が滅亡する
        if (Math.hypot(targetNation.capital.x - ship.target.x, targetNation.capital.y - ship.target.y) < 10) {
            targetNation.alive = false;
        }
    }
}

// ポリゴン内の点の判定
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

// 全ての国を描画
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    nations.forEach(nation => nation.draw());
    ships.forEach(ship => {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
    // 年月の表示
    document.getElementById('dateDisplay').textContent = `年月: ${currentYear}年${currentMonth + 1}月`;

    // 国の詳細を表示
    if (selectedNation) {
        const infoDiv = document.getElementById('nationInfo');
        infoDiv.innerHTML = `
            <h2>${selectedNation.name}の詳細</h2>
            <p>国力: ${selectedNation.strength}</p>
            <p>人口: ${selectedNation.population}</p>
            <p>平和度: ${selectedNation.peaceLevel}</p>
            <p>軍隊規模: ${selectedNation.armySize}</p>
            <p>船の数: ${selectedNation.ships}</p>
            <p>国旗のサイズ: ${selectedNation.flagSize}</p>
        `;
    } else {
        document.getElementById('nationInfo').innerHTML = '';
    }
}

// 国をクリックしたときの処理
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickedNation = nations.find(nation => isPointInPolygon(x, y, nation.territory));
    selectedNation = clickedNation || null;
    drawAll();
});

// 戦争による人口減少
function handleWar() {
    nations.forEach(nation => {
        if (nation.alive) {
            // 人口の減少
            nation.population -= Math.floor(nation.armySize / 2 * 0.01); // 1秒ごとに減少
            if (nation.population <= 0) {
                nation.alive = false;
            }
        }
    });
}

// ゲームのリセット
function resetGame() {
    nations = [];
    ships = [];
    currentYear = 0;
    currentMonth = 0;
    selectedNation = null;
    drawAll();
}

// ゲームの保存
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
            shipCount: nation.ships,
            flagSize: nation.flagSize,
            capital: nation.capital,
            territory: nation.territory,
            exclaves: nation.exclaves,
            relationships: nation.relationships,
            alive: nation.alive
        })),
        ships: ships,
        currentYear: currentYear,
        currentMonth: currentMonth
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// ゲームの読み込み
function loadGame() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        nations = gameState.nations.map(data => {
            const nation = new Nation(data.name, data.x, data.y, data.strength, data.population, data.peaceLevel, data.color, data.armySize, data.shipCount, data.flagSize);
            nation.capital = data.capital;
            nation.territory = data.territory;
            nation.exclaves = data.exclaves;
            nation.relationships = data.relationships;
            nation.alive = data.alive;
            return nation;
        });
        ships = gameState.ships;
        currentYear = gameState.currentYear;
        currentMonth = gameState.currentMonth;
        drawAll();
    }
}

// 船を追加
function addShip() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const nation = nations[Math.floor(Math.random() * nations.length)];
    ships.push(new Ship(x, y, nation));
}

// 放置モードの切り替え
function toggleIdleMode() {
    isIdleMode = !isIdleMode;
    document.getElementById('toggleIdleMode').textContent = `放置モード: ${isIdleMode ? 'オン' : 'オフ'}`;
}

// ゲームの更新
function gameLoop() {
    moveShips();
    handleWar();
    drawAll();
    if (isIdleMode) {
        if (Math.random() < 1 / 36.5) { // 2日ごとに領土を拡大
            nations.forEach(nation => nation.expandTerritory(10));
            drawAll();
        }
    }
    requestAnimationFrame(gameLoop);
}

// イベントリスナー
document.getElementById('createNation').addEventListener('click', createNation);
document.getElementById('resetGame').addEventListener('click', resetGame);
document.getElementById('saveGame').addEventListener('click', saveGame);
document.getElementById('loadGame').addEventListener('click', loadGame);
document.getElementById('addShip').addEventListener('click', addShip);
document.getElementById('toggleIdleMode').addEventListener('click', toggleIdleMode);

gameLoop();
