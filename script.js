// --- Auth System ---
let currentUser = localStorage.getItem('trading_journal_current_user') || null;

// Global state
let trades = [];
let settings = {
    initialCapital: 1000,
    privacyMode: false,
    tickerSymbols: "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT"
};

let db;
const DB_NAME = "TradingJournalDB";
const STORE_NAME = "trade_images";
let currentCalDate = new Date();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authFormLogin = document.getElementById('auth-form-login');
const authFormRegister = document.getElementById('auth-form-register');

// --- Initialization ---
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); // DB Ver 2
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve();
        };
        request.onerror = (e) => reject(e);
    });
}

const refreshIcons = () => lucide.createIcons();

// --- Auth Flow ---
function loadUserData() {
    if (!currentUser) return;
    
    trades = JSON.parse(localStorage.getItem(`trading_journal_trades_${currentUser}`)) || [];
    const savedSettings = JSON.parse(localStorage.getItem(`trading_journal_settings_${currentUser}`));
    
    if (savedSettings) {
        settings = savedSettings;
    } else {
        settings = {
            initialCapital: 1000,
            privacyMode: false,
            tickerSymbols: "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT"
        };
    }
}

function checkAuth() {
    if (currentUser) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'grid'; // App container layout
        document.getElementById('nav-admin').style.display = (currentUser === 'admin') ? 'block' : 'none';
        
        if (currentUser === 'admin') {
            document.getElementById('nav-dashboard').style.display = 'none';
            document.getElementById('nav-journal').style.display = 'none';
            document.getElementById('nav-analytics').style.display = 'none';
            document.getElementById('nav-settings').style.display = 'none';
            document.getElementById('btn-add-trade').style.display = 'none';
            switchView('admin');
        } else {
            document.getElementById('nav-dashboard').style.display = 'block';
            document.getElementById('nav-journal').style.display = 'block';
            document.getElementById('nav-analytics').style.display = 'block';
            document.getElementById('nav-settings').style.display = 'block';
            document.getElementById('btn-add-trade').style.display = 'block';
            loadUserData();
            applyPrivacy();
            renderMarketTicker();
            switchView('dashboard');
        }
        refreshIcons();
    } else {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        refreshIcons();
    }
}

// Auth UI toggles
document.getElementById('link-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    authFormLogin.style.display = 'none';
    authFormRegister.style.display = 'block';
});
document.getElementById('link-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    authFormRegister.style.display = 'none';
    authFormLogin.style.display = 'block';
});

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    
    const users = JSON.parse(localStorage.getItem('trading_journal_users')) || {};
    
    if (users[user] && users[user].password === pass) {
        currentUser = user;
        localStorage.setItem('trading_journal_current_user', currentUser);
        checkAuth();
    } else {
        alert('Sai tên đăng nhập hoặc mật khẩu!');
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const pass = document.getElementById('register-password').value.trim();
    
    const users = JSON.parse(localStorage.getItem('trading_journal_users')) || {};
    
    if (users[user]) {
        alert('Tên đăng nhập đã tồn tại!');
    } else {
        users[user] = { password: pass, email: email };
        localStorage.setItem('trading_journal_users', JSON.stringify(users));
        
        // Auto login
        currentUser = user;
        localStorage.setItem('trading_journal_current_user', currentUser);
        checkAuth();
        alert('Đăng ký thành công!');
    }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('trading_journal_current_user');
    
    // Clear forms
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    authFormRegister.style.display = 'none';
    authFormLogin.style.display = 'block';
    
    checkAuth();
});

// Forgot Password
document.getElementById('link-forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    const username = prompt("Nhập tên đăng nhập của bạn:");
    if (!username) return;

    const users = JSON.parse(localStorage.getItem('trading_journal_users')) || {};
    if (!users[username]) {
        alert("Tên đăng nhập không tồn tại trong hệ thống.");
        return;
    }

    const email = prompt("Nhập email khôi phục đã đăng ký:");
    if (email && email.trim() === users[username].email) {
        alert(`(Mô phỏng Email) Hệ thống đã xác nhận. Mật khẩu của bạn là: ${users[username].password}\nVui lòng đăng nhập và đổi mật khẩu mới trong mục Cài đặt.`);
    } else {
        alert("Email không đúng. Không thể khôi phục mật khẩu.");
    }
});

// --- Dynamic Ticker ---
function renderMarketTicker() {
    const container = document.getElementById('market-ticker');
    if (!container) return;
    
    container.innerHTML = '';
    
    const symbols = settings.tickerSymbols.split(',').map(s => {
        const sym = s.trim();
        if (sym.includes(':')) {
            const parts = sym.split(':');
            return { proName: sym, title: parts[1] };
        }
        return { proName: `BINANCE:${sym}`, title: sym.replace('USDT', '') + '/USDT' };
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container';
    widgetDiv.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.textContent = JSON.stringify({
        "symbols": symbols,
        "showSymbolLogo": true,
        "colorTheme": "dark",
        "isTransparent": true,
        "displayMode": "adaptive",
        "locale": "vi"
    });
    
    widgetDiv.appendChild(script);
    container.appendChild(widgetDiv);
}

// Layout Elements
const dashboardView = document.getElementById('view-dashboard');
const journalView = document.getElementById('view-journal');
const analyticsView = document.getElementById('view-analytics');
const settingsView = document.getElementById('view-settings');
const modalTrade = document.getElementById('modal-trade');
const modalCloseTrade = document.getElementById('modal-close-trade');
const modalDetail = document.getElementById('modal-detail');
const modalConfirmDelete = document.getElementById('modal-confirm-delete');
const tradeForm = document.getElementById('trade-form');
const closeTradeForm = document.getElementById('close-trade-form');
const fullJournalList = document.getElementById('full-journal-list');
const recentTradesList = document.getElementById('recent-trades-list');
const privacyBtn = document.getElementById('btn-privacy-toggle');

// Navigation
document.getElementById('nav-dashboard').addEventListener('click', () => switchView('dashboard'));
document.getElementById('nav-journal').addEventListener('click', () => switchView('journal'));
document.getElementById('nav-analytics').addEventListener('click', () => switchView('analytics'));
document.getElementById('nav-settings').addEventListener('click', () => switchView('settings'));
document.getElementById('nav-admin').addEventListener('click', () => switchView('admin'));

const adminView = document.getElementById('view-admin');

function switchView(view) {
    if (!currentUser) return;
    [dashboardView, journalView, analyticsView, settingsView, adminView].forEach(v => { if(v) v.style.display = 'none'; });
    document.querySelectorAll('nav li').forEach(li => li.classList.remove('active'));
    
    if (view === 'dashboard') {
        dashboardView.style.display = 'block';
        document.getElementById('nav-dashboard').classList.add('active');
        renderDashboard();
    } else if (view === 'journal') {
        journalView.style.display = 'block';
        document.getElementById('nav-journal').classList.add('active');
        renderJournal();
    } else if (view === 'analytics') {
        analyticsView.style.display = 'block';
        document.getElementById('nav-analytics').classList.add('active');
        renderAnalytics();
    } else if (view === 'admin') {
        adminView.style.display = 'block';
        document.getElementById('nav-admin').classList.add('active');
        document.getElementById('page-title').innerText = `Khu vực Quản trị`;
        renderAdminUsers();
    } else {
        settingsView.style.display = 'block';
        document.getElementById('nav-settings').classList.add('active');
        document.getElementById('setting-initial-capital').value = settings.initialCapital;
        document.getElementById('setting-ticker-symbols').value = settings.tickerSymbols || "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT";
    }
}

// --- Admin Features ---
function renderAdminUsers() {
    const users = JSON.parse(localStorage.getItem('trading_journal_users')) || {};
    const tbody = document.getElementById('admin-users-list');
    tbody.innerHTML = '';
    
    for (const [username, userData] of Object.entries(users)) {
        if (username === 'admin') continue;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 1rem; border-bottom: 1px solid var(--card-border);">${username}</td>
            <td style="padding: 1rem; border-bottom: 1px solid var(--card-border);">${userData.email || 'N/A'}</td>
            <td style="padding: 1rem; border-bottom: 1px solid var(--card-border);">***</td>
            <td style="padding: 1rem; border-bottom: 1px solid var(--card-border);">
                <input type="password" id="admin-pass-${username}" placeholder="Mật khẩu mới..." style="padding: 0.5rem; width: 100%;">
            </td>
            <td style="padding: 1rem; border-bottom: 1px solid var(--card-border);">
                <button class="btn-primary" onclick="adminChangePassword('${username}')" style="padding: 0.5rem 1rem;">Lưu</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

window.adminChangePassword = function(username) {
    const newPass = document.getElementById(`admin-pass-${username}`).value;
    if (!newPass) {
        alert('Vui lòng nhập mật khẩu mới!');
        return;
    }
    const users = JSON.parse(localStorage.getItem('trading_journal_users')) || {};
    if (users[username]) {
        users[username].password = newPass;
        localStorage.setItem('trading_journal_users', JSON.stringify(users));
        alert('Đã đổi mật khẩu cho user: ' + username);
        document.getElementById(`admin-pass-${username}`).value = '';
    }
};

// Settings
document.getElementById('btn-save-settings').addEventListener('click', () => {
    settings.initialCapital = parseFloat(document.getElementById('setting-initial-capital').value) || 0;
    settings.tickerSymbols = document.getElementById('setting-ticker-symbols').value;
    saveSettings();
    renderMarketTicker();
    renderDashboard();
    alert("Đã lưu cấu hình!");
});

// Change Password
document.getElementById('change-password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const oldPass = document.getElementById('setting-old-password').value;
    const newPass = document.getElementById('setting-new-password').value;
    
    const users = JSON.parse(localStorage.getItem('trading_journal_users')) || {};
    
    if (users[currentUser].password === oldPass) {
        users[currentUser].password = newPass;
        localStorage.setItem('trading_journal_users', JSON.stringify(users));
        alert('Đổi mật khẩu thành công!');
        document.getElementById('change-password-form').reset();
    } else {
        alert('Mật khẩu cũ không chính xác!');
    }
});

function saveSettings() {
    if (!currentUser) return;
    localStorage.setItem(`trading_journal_settings_${currentUser}`, JSON.stringify(settings));
}

// Privacy Mode
privacyBtn.addEventListener('click', () => {
    settings.privacyMode = !settings.privacyMode;
    applyPrivacy();
    saveSettings();
});

function applyPrivacy() {
    if (settings.privacyMode) {
        document.body.classList.add('privacy-active');
        privacyBtn.innerHTML = '<i data-lucide="eye-off"></i>';
    } else {
        document.body.classList.remove('privacy-active');
        privacyBtn.innerHTML = '<i data-lucide="eye"></i>';
    }
    refreshIcons();
}

// Modal handling
document.getElementById('btn-add-trade').addEventListener('click', () => {
    tradeForm.reset();
    document.getElementById('input-trade-id').value = '';
    document.getElementById('trade-modal-title').innerText = 'Thêm lệnh mới';
    document.getElementById('calculated-volume').innerText = '0.00';
    document.getElementById('predicted-profit-display').innerText = '$0.00';
    document.getElementById('predicted-r-value').innerText = '0.00R';
    modalTrade.style.display = 'flex';
});
document.getElementById('btn-close-modal').addEventListener('click', () => modalTrade.style.display = 'none');
document.getElementById('btn-cancel').addEventListener('click', () => modalTrade.style.display = 'none');
document.getElementById('btn-close-close-modal').addEventListener('click', () => modalCloseTrade.style.display = 'none');
document.getElementById('btn-cancel-close').addEventListener('click', () => modalCloseTrade.style.display = 'none');
document.getElementById('btn-close-detail-modal').addEventListener('click', () => modalDetail.style.display = 'none');

// --- Calculations ---

function getTotalAssets() {
    let totalPLProfit = 0;
    trades.forEach(t => {
        if (t.pl !== null) {
            totalPLProfit += (t.profitAmount || 0);
        }
    });
    return settings.initialCapital + totalPLProfit;
}

function calculateVolume() {
    const entry = parseFloat(document.getElementById('input-entry').value);
    const sl = parseFloat(document.getElementById('input-sl').value);
    const riskPercent = parseFloat(document.getElementById('input-risk-percent').value);
    const calcCapital = parseFloat(document.getElementById('input-calc-capital').value); // Margin input
    
    if (entry && sl && riskPercent && entry !== sl) {
        // Calculate risk amount dynamically based on ACTUAL TOTAL ASSETS, not inputted margin
        const totalAssets = getTotalAssets();
        const riskAmount = (totalAssets * riskPercent) / 100;
        
        // Volume = riskAmount / SL_distance
        const slDistance = Math.abs(entry - sl);
        const volume = riskAmount / slDistance;
        document.getElementById('calculated-volume').innerText = volume.toFixed(4);
        
        // Leverage = (Volume * EntryPrice) / Margin
        if (calcCapital > 0) {
            const leverage = (volume * entry) / calcCapital;
            document.getElementById('calculated-leverage').innerText = leverage.toFixed(1) + 'x';
        } else {
            document.getElementById('calculated-leverage').innerText = '0.0x';
        }
        
        const tp = parseFloat(document.getElementById('input-tp').value);
        if (tp) {
            const rewardDistance = Math.abs(tp - entry);
            const rValue = (rewardDistance / slDistance).toFixed(2);
            document.getElementById('predicted-r-value').innerText = rValue + 'R';
            
            const predictedProfit = volume * rewardDistance;
            document.getElementById('predicted-profit-display').innerText = `$${predictedProfit.toFixed(2)}`;
        } else {
            document.getElementById('predicted-profit-display').innerText = '$0.00';
            document.getElementById('predicted-r-value').innerText = '0.00R';
        }
    }
}

['input-entry', 'input-sl', 'input-risk-percent', 'input-tp', 'input-calc-capital'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateVolume);
});

// Image Persistence (Namespaced)
async function saveImage(id, file) {
    if (!currentUser) return;
    const dbKey = `${currentUser}_${id}`;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(file, dbKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject();
    });
}

async function getImage(id) {
    if (!currentUser) return null;
    const dbKey = `${currentUser}_${id}`;
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(dbKey);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

function calculateDisciplineScore(actualPLPercent, entry, sl, tp) {
    if (actualPLPercent === null) return null;
    const plannedProfitPercent = (Math.abs(tp - entry) / entry) * 100;
    const plannedLossPercent = (Math.abs(entry - sl) / entry) * 100;

    if (actualPLPercent >= 0) {
        const ratio = actualPLPercent / (plannedProfitPercent || 1);
        return Math.min(Math.round(ratio * 100), 100); 
    } else {
        const ratio = Math.abs(actualPLPercent) / (plannedLossPercent || 1);
        return ratio > 1.1 ? 50 : 100; 
    }
}

// Form submission (Add/Edit)
tradeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const tradeIdStr = document.getElementById('input-trade-id').value;
    const tradeId = tradeIdStr ? parseInt(tradeIdStr) : Date.now();
    const isEdit = !!tradeIdStr;
    
    const pair = document.getElementById('input-pair').value.toUpperCase();
    const position = document.getElementById('input-position').value;
    const entry = parseFloat(document.getElementById('input-entry').value);
    const sl = parseFloat(document.getElementById('input-sl').value);
    const tp = parseFloat(document.getElementById('input-tp').value);
    const riskPercent = parseFloat(document.getElementById('input-risk-percent').value);
    const calcCapital = parseFloat(document.getElementById('input-calc-capital').value);
    
    const plValue = document.getElementById('input-pl').value ? parseFloat(document.getElementById('input-pl').value) : null;

    const slDistance = Math.abs(entry - sl);
    const totalAssets = getTotalAssets();
    const riskAmount = (totalAssets * riskPercent) / 100;
    const volume = riskAmount / slDistance;
    const leverage = (volume * entry) / calcCapital;
    const plannedR = parseFloat((Math.abs(tp - entry) / slDistance).toFixed(2));

    let finalPLPercent = plValue; 
    let profitAmount = 0;
    if (plValue !== null) {
        const oldTrade = trades.find(t => t.id === tradeId);
        profitAmount = oldTrade ? (oldTrade.profitAmount || 0) : 0;
    }

    const tradeData = {
        id: tradeId,
        pair: pair,
        position: position,
        entry: entry,
        sl: sl,
        tp: tp,
        calcCapital: calcCapital,
        riskPercent: riskPercent,
        volume: volume,
        leverage: leverage,
        plannedR: plannedR,
        setup: document.getElementById('input-setup').value,
        reason: isEdit ? (trades.find(t => t.id === tradeId).reason) : "",
        exitReason: isEdit ? (trades.find(t => t.id === tradeId).exitReason) : "",
        pl: finalPLPercent,
        profitAmount: profitAmount,
        mistake: document.getElementById('input-mistake').value,
        timestamp: isEdit ? (trades.find(t => t.id === tradeId).timestamp) : new Date().toISOString(),
        hasImage: !!document.getElementById('input-chart-file').files[0] || (isEdit && trades.find(t => t.id === tradeId).hasImage),
        disciplineScore: finalPLPercent !== null ? calculateDisciplineScore(finalPLPercent, entry, sl, tp) : null
    };

    if (!!document.getElementById('input-chart-file').files[0]) {
        await saveImage(tradeData.id, document.getElementById('input-chart-file').files[0]);
    }

    if (isEdit) {
        const index = trades.findIndex(t => t.id === tradeData.id);
        trades[index] = tradeData;
    } else {
        trades.unshift(tradeData);
    }

    saveTrades();
    
    // Immediate updates for both views
    renderDashboard();
    renderJournal();
    
    modalTrade.style.display = 'none';
    tradeForm.reset();
});

// Close Trade logic (Exit Price)
closeTradeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const id = parseInt(document.getElementById('close-trade-id').value);
    const exitPrice = parseFloat(document.getElementById('close-input-exit-price').value);
    
    const tradeIndex = trades.findIndex(t => t.id === id);
    if (tradeIndex !== -1) {
        const t = trades[tradeIndex];
        let profit = 0;
        if (t.position === 'long') {
            profit = t.volume * (exitPrice - t.entry);
        } else {
            profit = t.volume * (t.entry - exitPrice);
        }
        
        const totalAssetsAtTime = t.calcCapital ? t.calcCapital : getTotalAssets(); // fallback
        const riskAmount = (totalAssetsAtTime * t.riskPercent) / 100;
        const slDist = Math.abs(t.entry - t.sl);
        const calcVol = riskAmount / slDist;
        const riskValue = t.volume ? (t.volume * slDist) : riskAmount;
        
        const plPercent = (profit / (riskValue || 1)) * 100;
        
        trades[tradeIndex].exitPrice = exitPrice;
        trades[tradeIndex].pl = plPercent;
        trades[tradeIndex].profitAmount = profit;
        trades[tradeIndex].reason = document.getElementById('close-input-entry-reason').value;
        trades[tradeIndex].exitReason = document.getElementById('close-input-exit-reason').value;
        trades[tradeIndex].mistake = document.getElementById('close-input-mistake').value;
        trades[tradeIndex].disciplineScore = calculateDisciplineScore(plPercent, t.entry, t.sl, t.tp);
        
        saveTrades();
        renderDashboard();
        renderJournal();
        modalCloseTrade.style.display = 'none';
        closeTradeForm.reset();
    }
});

function openCloseModal(id) {
    const trade = trades.find(t => t.id === id);
    document.getElementById('close-trade-id').value = id;
    document.getElementById('close-input-entry-reason').value = trade.reason || "";
    document.getElementById('close-input-exit-reason').value = trade.exitReason || "";
    modalCloseTrade.style.display = 'flex';
}

function editTrade(id) {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    document.getElementById('input-trade-id').value = trade.id;
    document.getElementById('trade-modal-title').innerText = 'Chỉnh sửa lệnh';
    document.getElementById('input-pair').value = trade.pair;
    document.getElementById('input-position').value = trade.position;
    document.getElementById('input-entry').value = trade.entry;
    document.getElementById('input-sl').value = trade.sl;
    document.getElementById('input-tp').value = trade.tp;
    document.getElementById('input-calc-capital').value = trade.calcCapital || 1000;
    document.getElementById('input-risk-percent').value = trade.riskPercent || 1;
    document.getElementById('input-setup').value = trade.setup;
    document.getElementById('input-pl').value = trade.pl !== null ? trade.pl.toFixed(2) : '';
    document.getElementById('input-mistake').value = trade.mistake;

    calculateVolume();
    modalTrade.style.display = 'flex';
}

async function viewDetail(id) {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    document.getElementById('detail-title').innerText = `Chi tiết lệnh: ${trade.pair}`;
    document.getElementById('detail-position').innerHTML = `<span class="badge ${trade.position}">${trade.position}</span>`;
    document.getElementById('detail-setup').innerText = trade.setup;
    document.getElementById('detail-prices').innerHTML = `Entry: ${trade.entry} | SL: ${trade.sl} | TP: ${trade.tp}<br>
        ${trade.exitPrice ? `<strong>Exit: ${trade.exitPrice}</strong><br>` : ''}
        <span style="font-size: 0.8rem; color: var(--text-secondary);">Vốn vào: $${trade.calcCapital || 0} | Đòn bẩy: ${(trade.leverage || 0).toFixed(1)}x</span>`;
    
    const plClass = trade.pl === null ? '' : (trade.pl >= 0 ? 'profit' : 'loss');
    const plDisplay = trade.pl === null ? 'Đang chạy' : `$${(trade.profitAmount || 0).toFixed(2)}`;
    document.getElementById('detail-pl').innerHTML = `<span class="${plClass}">${plDisplay}</span>`;
    
    document.getElementById('detail-date').innerText = new Date(trade.timestamp).toLocaleString();
    document.getElementById('detail-reason').innerText = trade.reason || "Chưa ghi chú lý do vào";
    document.getElementById('detail-exit-reason').innerText = trade.exitReason || "Chưa ghi chú lý do chốt";

    const container = document.getElementById('detail-chart-container');
    container.innerHTML = '';
    if (trade.hasImage) {
        const file = await getImage(trade.id);
        if (file) {
            const url = URL.createObjectURL(file);
            container.innerHTML = `<img src="${url}" alt="Trade Chart">`;
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary);">Hình ảnh không tồn tại</p>';
        }
    } else {
        container.innerHTML = '<p style="color: var(--text-secondary);">Không có hình ảnh biểu đồ</p>';
    }

    modalDetail.style.display = 'flex';
}

function saveTrades() {
    if (!currentUser) return;
    localStorage.setItem(`trading_journal_trades_${currentUser}`, JSON.stringify(trades));
}

// Chart Instance
let equityChartInstance = null;

function renderEquityChart() {
    const ctx = document.getElementById('equityChart').getContext('2d');
    if (equityChartInstance) equityChartInstance.destroy();

    let currentEquity = settings.initialCapital;
    const closedTrades = [...trades].reverse().filter(t => t.pl !== null);
    
    const labels = ["Bắt đầu", ...closedTrades.map((t, index) => `Trade ${index + 1}`)];
    const dataPoints = [settings.initialCapital];
    
    closedTrades.forEach(t => {
        currentEquity += (t.profitAmount || 0);
        dataPoints.push(currentEquity);
    });

    equityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tài sản (USD)',
                data: dataPoints,
                borderColor: '#3d7eff',
                backgroundColor: 'rgba(61, 126, 255, 0.1)',
                fill: true, tension: 0.4, pointRadius: closedTrades.length > 20 ? 0 : 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, 
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderAnalytics() {
    renderProfitCalendar();
}

function renderProfitCalendar() {
    const calendarEl = document.getElementById('profit-calendar');
    calendarEl.innerHTML = '';
    
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    document.getElementById('calendar-month-year').innerText = `Tháng ${month + 1}, ${year}`;

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.innerText = d;
        calendarEl.appendChild(h);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        calendarEl.appendChild(document.createElement('div'));
    }

    const dailyPL = {};
    trades.filter(t => t.pl !== null).forEach(t => {
        const d = new Date(t.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const dateKey = d.getDate();
            dailyPL[dateKey] = (dailyPL[dateKey] || 0) + (t.profitAmount || 0);
        }
    });

    for (let day = 1; day <= daysInMonth; day++) {
        const pl = dailyPL[day] || 0;
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${pl > 0 ? 'day-profit' : (pl < 0 ? 'day-loss' : '')}`;
        
        dayEl.innerHTML = `
            <div class="date">${day}</div>
            <div class="day-pl">${pl !== 0 ? (pl > 0 ? '+' : '') + pl.toFixed(0) : ''}</div>
        `;
        calendarEl.appendChild(dayEl);
    }
}

document.getElementById('btn-prev-month').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderProfitCalendar();
});
document.getElementById('btn-next-month').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderProfitCalendar();
});

// Dashboard rendering
function renderDashboard() {
    const closedTrades = trades.filter(t => t.pl !== null);
    const winningTrades = closedTrades.filter(t => t.pl > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length * 100).toFixed(1) : 0;
    
    let totalProfit = 0;
    closedTrades.forEach(t => totalProfit += (t.profitAmount || 0));

    const totalAssets = settings.initialCapital + totalProfit;

    document.getElementById('stat-total-trades').innerText = trades.length;
    document.getElementById('stat-win-rate').innerText = `${winRate}%`;
    document.getElementById('stat-total-pl').innerText = `$${totalProfit.toFixed(2)}`;
    document.getElementById('stat-total-assets').innerText = `$${totalAssets.toFixed(2)}`;
    
    document.getElementById('page-title').innerText = `Chào buổi sáng, ${currentUser}!`;

    recentTradesList.innerHTML = '';
    trades.slice(0, 5).forEach(trade => {
        const div = document.createElement('div');
        div.className = 'trade-row';
        div.style.gridTemplateColumns = '1.5fr 1fr 1fr';
        div.style.padding = '0.7rem';
        div.style.borderRadius = '12px';
        div.style.background = 'rgba(255,255,255,0.02)';
        div.style.cursor = 'pointer';
        div.onclick = () => viewDetail(trade.id);
        
        const plClass = trade.pl === null ? '' : (trade.pl >= 0 ? 'profit' : 'loss');
        const plDisplay = trade.pl === null ? 'Đang chạy' : `${trade.pl > 0 ? '+' : ''}$${(trade.profitAmount || 0).toFixed(2)}`;

        div.innerHTML = `
            <div style="font-weight: 600;">${trade.pair} <span class="badge ${trade.position}">${trade.position}</span></div>
            <div class="value ${plClass}" style="font-size: 0.9rem;">${plDisplay}</div>
            <div style="text-align: right; color: var(--text-secondary); font-size: 0.7rem;">
                ${new Date(trade.timestamp).toLocaleDateString()}
            </div>
        `;
        recentTradesList.appendChild(div);
    });
    
    renderEquityChart();
    refreshIcons();
}

async function renderJournal() {
    fullJournalList.innerHTML = '';
    for (const trade of trades) {
        const row = document.createElement('div');
        row.className = 'trade-row';
        const plClass = trade.pl === null ? '' : (trade.pl >= 0 ? 'profit' : 'loss');
        const plDisplay = trade.pl === null ? 'Đang chạy' : `${trade.pl > 0 ? '+' : ''}$${(trade.profitAmount || 0).toFixed(2)}`;
        
        let resultHtml = '-';
        if (trade.pl !== null) {
            if (trade.pl > 0) resultHtml = '<span class="badge-result badge-win">WIN</span>';
            else if (trade.pl < 0) resultHtml = '<span class="badge-result badge-loss">LOSS</span>';
            else resultHtml = '<span class="badge-result badge-be">BE</span>';
        }

        row.innerHTML = `
            <div style="font-weight: 600; cursor: pointer;" onclick="viewDetail(${trade.id})">${trade.pair} <span class="badge ${trade.position}">${trade.position}</span></div>
            <div>$${trade.entry}</div>
            <div style="font-family: 'Roboto Mono', monospace; font-size: 0.8rem;">${(trade.volume || 0).toFixed(4)}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">SL: ${trade.sl}<br>TP: ${trade.tp}</div>
            <div style="color: var(--accent-color); font-weight: 600;">${trade.plannedR || '0'}R</div>
            <div class="value ${plClass}">${plDisplay}</div>
            <div style="text-align: center;">${resultHtml}</div>
            <div style="display: flex; gap: 0.5rem; align-items: center; justify-self: end;">
                ${trade.pl === null ? `<button onclick="openCloseModal(${trade.id})" class="btn-sm btn-outline-success">Chốt</button>` : `<div style="font-size: 0.75rem; color: var(--text-secondary);">${(trade.leverage || 0).toFixed(1)}x</div>`}
                <button class="btn-sm btn-icon-sm" onclick="editTrade(${trade.id})" title="Sửa"><i data-lucide="edit-3"></i></button>
                <button class="btn-sm btn-icon-sm" onclick="deleteTrade(${trade.id})" style="color: var(--danger-color);" title="Xóa"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        fullJournalList.appendChild(row);
    }
    refreshIcons();
}

let tradeToDelete = null;
function deleteTrade(id) {
    tradeToDelete = id;
    modalConfirmDelete.style.display = 'flex';
    refreshIcons();
}

document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (tradeToDelete) {
        trades = trades.filter(t => t.id !== tradeToDelete);
        saveTrades();
        
        if (currentUser) {
            const dbKey = `${currentUser}_${tradeToDelete}`;
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(dbKey);
        }
        
        tradeToDelete = null;
        modalConfirmDelete.style.display = 'none';
        
        renderDashboard();
        renderJournal();
    }
});

document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    tradeToDelete = null;
    modalConfirmDelete.style.display = 'none';
});

window.onload = async () => {
    await initDB();
    checkAuth();
};
