// ============================================================
// Firebase Imports
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQmXl0d7oQ3Vb2gpwvgqK-Uq-6OPJapjk",
    authDomain: "trading-8748a.firebaseapp.com",
    projectId: "trading-8748a",
    storageBucket: "trading-8748a.firebasestorage.app",
    messagingSenderId: "653276026261",
    appId: "1:653276026261:web:639a0202ab1c7af8f8d29c",
    measurementId: "G-XFXN2L9NVG"
};

const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

// ============================================================
// Global State
// ============================================================
let currentUser = null;   // Firebase User object
let trades = [];
let settings = {
    initialCapital: 1000,
    privacyMode: false,
    tickerSymbols: "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT"
};

// IndexedDB for images (Firebase Storage requires billing; keep IndexedDB for images)
let db;
const DB_NAME = "TradingJournalDB";
const STORE_NAME = "trade_images";
let currentCalDate = new Date();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authFormLogin = document.getElementById('auth-form-login');
const authFormRegister = document.getElementById('auth-form-register');

// ============================================================
// Utility Helpers
// ============================================================
const refreshIcons = () => lucide.createIcons();

function showToast(msg, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.style.cssText = `
            position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
            padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 600;
            z-index: 9999; transition: opacity 0.3s; font-size: 0.9rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
    }
    toast.style.background = type === 'error' ? '#ff4444' : '#22c55e';
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    toast.innerText = msg;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ============================================================
// IndexedDB (Images)
// ============================================================
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = (e) => {
            const dbInst = e.target.result;
            if (!dbInst.objectStoreNames.contains(STORE_NAME)) {
                dbInst.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(); };
        request.onerror = (e) => reject(e);
    });
}

async function saveImage(id, file) {
    if (!currentUser) return;
    const dbKey = `${currentUser.uid}_${id}`;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(file, dbKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject();
    });
}

async function getImage(id) {
    if (!currentUser) return null;
    const dbKey = `${currentUser.uid}_${id}`;
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(dbKey);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

// ============================================================
// Firestore Data Layer
// ============================================================
async function loadUserData() {
    if (!currentUser) return;
    const uid = currentUser.uid;

    // Load settings
    const settingSnap = await getDoc(doc(firestore, `users/${uid}/config/settings`));
    if (settingSnap.exists()) {
        settings = settingSnap.data();
    } else {
        settings = { initialCapital: 1000, privacyMode: false, tickerSymbols: "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT" };
    }

    // Load trades
    const tradesCol = collection(firestore, `users/${uid}/trades`);
    const q = query(tradesCol, orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    trades = snap.docs.map(d => d.data());
}

async function saveTrades(tradeData) {
    if (!currentUser) return;
    const uid = currentUser.uid;
    await setDoc(doc(firestore, `users/${uid}/trades/${tradeData.id}`), tradeData);
}

async function deleteTrade(id) {
    if (!currentUser) return;
    const uid = currentUser.uid;
    await deleteDoc(doc(firestore, `users/${uid}/trades/${String(id)}`));
    trades = trades.filter(t => t.id !== id);
    if (db) {
        const dbKey = `${uid}_${id}`;
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(dbKey);
    }
    renderDashboard();
    renderJournal();
}

async function saveSettings() {
    if (!currentUser) return;
    await setDoc(doc(firestore, `users/${currentUser.uid}/config/settings`), settings);
}

// ============================================================
// Auth Flow
// ============================================================
function setupUI(user) {
    currentUser = user;
    if (user) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'grid';

        const isAdmin = (user.email === 'admin@vci.com');
        document.getElementById('nav-admin').style.display = isAdmin ? 'block' : 'none';

        if (isAdmin) {
            ['nav-dashboard', 'nav-journal', 'nav-analytics', 'nav-settings'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
            document.getElementById('btn-add-trade').style.display = 'none';
            loadAdminView();
            switchView('admin');
        } else {
            ['nav-dashboard', 'nav-journal', 'nav-analytics', 'nav-settings'].forEach(id => {
                document.getElementById(id).style.display = 'block';
            });
            document.getElementById('btn-add-trade').style.display = 'block';
            loadUserData().then(() => {
                applyPrivacy();
                renderMarketTicker();
                switchView('dashboard');
            });
        }
        refreshIcons();
    } else {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        refreshIcons();
    }
}

// Listen to Firebase Auth state
onAuthStateChanged(auth, (user) => {
    setupUI(user);
});

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

// Login with Firebase Auth
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged will call setupUI
    } catch (err) {
        showToast('Sai email hoặc mật khẩu!', 'error');
    }
});

// Register with Firebase Auth
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const pass = document.getElementById('register-password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        showToast('Đăng ký thành công!');
    } catch (err) {
        const msg = err.code === 'auth/email-already-in-use' ? 'Email đã được sử dụng!' :
                    err.code === 'auth/weak-password' ? 'Mật khẩu quá yếu (tối thiểu 6 ký tự)!' :
                    'Lỗi đăng ký: ' + err.message;
        showToast(msg, 'error');
    }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
    await signOut(auth);
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    authFormRegister.style.display = 'none';
    authFormLogin.style.display = 'block';
});

// Forgot Password (real email via Firebase)
document.getElementById('link-forgot-password').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-username').value.trim();
    if (!email) {
        showToast('Nhập email của bạn vào ô đăng nhập trước!', 'error');
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast(`Email khôi phục đã được gửi đến ${email}!`);
    } catch (err) {
        showToast('Email không tồn tại trong hệ thống!', 'error');
    }
});

// ============================================================
// Admin View (list all users - Firestore based)
// ============================================================
async function loadAdminView() {
    switchView('admin');
}

async function renderAdminUsers() {
    const tbody = document.getElementById('admin-users-list');
    tbody.innerHTML = '<tr><td colspan="5" style="padding:1rem; color:var(--text-secondary);">Đang tải danh sách người dùng...</td></tr>';

    try {
        const snap = await getDocs(collection(firestore, 'user_profiles'));
        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:1rem; color:var(--text-secondary);">Chưa có người dùng nào đăng ký.</td></tr>';
            return;
        }
        snap.docs.forEach(d => {
            const data = d.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:1rem;border-bottom:1px solid var(--card-border);">${data.displayName || 'N/A'}</td>
                <td style="padding:1rem;border-bottom:1px solid var(--card-border);">${data.email}</td>
                <td style="padding:1rem;border-bottom:1px solid var(--card-border);">Firebase Auth</td>
                <td style="padding:1rem;border-bottom:1px solid var(--card-border);">
                    <a href="https://console.firebase.google.com/project/trading-8748a/authentication/users" 
                       target="_blank" style="color:var(--accent-color);font-size:0.85rem;">Quản lý trên Firebase Console →</a>
                </td>
                <td style="padding:1rem;border-bottom:1px solid var(--card-border);color:var(--text-secondary);font-size:0.8rem;">
                    ${new Date(data.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:1rem;color:var(--danger-color);">
            Lỗi tải dữ liệu. Truy cập <a href="https://console.firebase.google.com/project/trading-8748a/authentication/users" target="_blank" style="color:var(--accent-color);">Firebase Console</a> để quản lý.
        </td></tr>`;
    }
}

// Change Password
document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const oldPass = document.getElementById('setting-old-password').value;
    const newPass = document.getElementById('setting-new-password').value;
    try {
        const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPass);
        showToast('Đổi mật khẩu thành công!');
        document.getElementById('change-password-form').reset();
    } catch(err) {
        showToast('Mật khẩu cũ không chính xác!', 'error');
    }
});

// ============================================================
// Dynamic Ticker
// ============================================================
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

// ============================================================
// Layout & Navigation
// ============================================================
const dashboardView = document.getElementById('view-dashboard');
const journalView = document.getElementById('view-journal');
const analyticsView = document.getElementById('view-analytics');
const settingsView = document.getElementById('view-settings');
const adminView = document.getElementById('view-admin');
const modalTrade = document.getElementById('modal-trade');
const modalCloseTrade = document.getElementById('modal-close-trade');
const modalDetail = document.getElementById('modal-detail');
const modalConfirmDelete = document.getElementById('modal-confirm-delete');
const tradeForm = document.getElementById('trade-form');
const closeTradeForm = document.getElementById('close-trade-form');
const fullJournalList = document.getElementById('full-journal-list');
const recentTradesList = document.getElementById('recent-trades-list');
const privacyBtn = document.getElementById('btn-privacy-toggle');

document.getElementById('nav-dashboard').addEventListener('click', () => switchView('dashboard'));
document.getElementById('nav-journal').addEventListener('click', () => switchView('journal'));
document.getElementById('nav-analytics').addEventListener('click', () => switchView('analytics'));
document.getElementById('nav-settings').addEventListener('click', () => switchView('settings'));
document.getElementById('nav-admin').addEventListener('click', () => switchView('admin'));

function switchView(view) {
    if (!currentUser) return;
    [dashboardView, journalView, analyticsView, settingsView, adminView].forEach(v => { if (v) v.style.display = 'none'; });
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
        document.getElementById('page-title').innerText = 'Khu vực Quản trị';
        renderAdminUsers();
    } else {
        settingsView.style.display = 'block';
        document.getElementById('nav-settings').classList.add('active');
        document.getElementById('setting-initial-capital').value = settings.initialCapital;
        document.getElementById('setting-ticker-symbols').value = settings.tickerSymbols || "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT";
    }
}

// ============================================================
// Settings
// ============================================================
document.getElementById('btn-save-settings').addEventListener('click', async () => {
    settings.initialCapital = parseFloat(document.getElementById('setting-initial-capital').value) || 0;
    settings.tickerSymbols = document.getElementById('setting-ticker-symbols').value;
    await saveSettings();
    renderMarketTicker();
    renderDashboard();
    showToast('Đã lưu cấu hình!');
});

// ============================================================
// Privacy Mode
// ============================================================
privacyBtn.addEventListener('click', async () => {
    settings.privacyMode = !settings.privacyMode;
    applyPrivacy();
    await saveSettings();
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

// ============================================================
// Calculations
// ============================================================
function getTotalAssets() {
    let totalPLProfit = 0;
    trades.forEach(t => {
        if (t.pl !== null) totalPLProfit += (t.profitAmount || 0);
    });
    return settings.initialCapital + totalPLProfit;
}

function calculateVolume() {
    const entry = parseFloat(document.getElementById('input-entry').value);
    const sl = parseFloat(document.getElementById('input-sl').value);
    const riskPercent = parseFloat(document.getElementById('input-risk-percent').value);
    const calcCapital = parseFloat(document.getElementById('input-calc-capital').value);

    if (entry && sl && riskPercent && entry !== sl) {
        const totalAssets = getTotalAssets();
        const riskAmount = (totalAssets * riskPercent) / 100;
        const slDistance = Math.abs(entry - sl);
        const volume = riskAmount / slDistance;
        document.getElementById('calculated-volume').innerText = volume.toFixed(4);

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

// ============================================================
// Modal Handling
// ============================================================
document.getElementById('btn-add-trade').addEventListener('click', () => {
    tradeForm.reset();
    document.getElementById('input-trade-id').value = '';
    document.getElementById('trade-modal-title').innerText = 'Thêm lệnh mới';
    document.getElementById('calculated-volume').innerText = '0.00';
    document.getElementById('calculated-leverage').innerText = '1.0x';
    document.getElementById('predicted-profit-display').innerText = '$0.00';
    document.getElementById('predicted-r-value').innerText = '0.00R';
    modalTrade.style.display = 'flex';
});
document.getElementById('btn-close-modal').addEventListener('click', () => modalTrade.style.display = 'none');
document.getElementById('btn-cancel').addEventListener('click', () => modalTrade.style.display = 'none');
document.getElementById('btn-close-close-modal').addEventListener('click', () => modalCloseTrade.style.display = 'none');
document.getElementById('btn-cancel-close').addEventListener('click', () => modalCloseTrade.style.display = 'none');
document.getElementById('btn-close-detail-modal').addEventListener('click', () => modalDetail.style.display = 'none');

// ============================================================
// Add / Edit Trade (Firestore)
// ============================================================
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
    const leverage = calcCapital > 0 ? (volume * entry) / calcCapital : 0;
    const plannedR = parseFloat((Math.abs(tp - entry) / slDistance).toFixed(2));

    let profitAmount = 0;
    if (plValue !== null) {
        const oldTrade = trades.find(t => t.id === tradeId);
        profitAmount = oldTrade ? (oldTrade.profitAmount || 0) : 0;
    }

    const existingTrade = isEdit ? trades.find(t => t.id === tradeId) : null;

    const tradeData = {
        id: tradeId,
        pair, position, entry, sl, tp,
        calcCapital, riskPercent, volume, leverage, plannedR,
        setup: document.getElementById('input-setup').value,
        reason: document.getElementById('input-reason').value,
        exitReason: existingTrade ? (existingTrade.exitReason || "") : "",
        pl: plValue,
        profitAmount,
        mistake: existingTrade ? (existingTrade.mistake || "none") : "none",
        timestamp: isEdit ? (existingTrade.timestamp) : new Date().toISOString(),
        hasImage: !!document.getElementById('input-chart-file').files[0] || (isEdit && existingTrade && existingTrade.hasImage),
        disciplineScore: plValue !== null ? calculateDisciplineScore(plValue, entry, sl, tp) : null
    };

    if (document.getElementById('input-chart-file').files[0]) {
        await saveImage(tradeData.id, document.getElementById('input-chart-file').files[0]);
    }

    await saveTrades(tradeData);

    if (isEdit) {
        const index = trades.findIndex(t => t.id === tradeData.id);
        if (index !== -1) trades[index] = tradeData;
        else trades.unshift(tradeData);
    } else {
        trades.unshift(tradeData);
    }

    renderDashboard();
    renderJournal();
    modalTrade.style.display = 'none';
    tradeForm.reset();
    showToast(isEdit ? 'Đã cập nhật lệnh!' : 'Đã lưu lệnh mới!');
});

// ============================================================
// Close Trade
// ============================================================
closeTradeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const id = parseInt(document.getElementById('close-trade-id').value);
    const exitPrice = parseFloat(document.getElementById('close-input-exit-price').value);

    const tradeIndex = trades.findIndex(t => t.id === id);
    if (tradeIndex !== -1) {
        const t = trades[tradeIndex];
        let profit = t.position === 'long'
            ? t.volume * (exitPrice - t.entry)
            : t.volume * (t.entry - exitPrice);

        const riskValue = t.volume ? (t.volume * Math.abs(t.entry - t.sl)) : ((t.calcCapital * t.riskPercent) / 100);
        const plPercent = (profit / (riskValue || 1)) * 100;

        trades[tradeIndex] = {
            ...t,
            exitPrice,
            pl: plPercent,
            profitAmount: profit,
            reason: document.getElementById('close-input-entry-reason').value,
            exitReason: document.getElementById('close-input-exit-reason').value,
            mistake: document.getElementById('close-input-mistake').value,
            disciplineScore: calculateDisciplineScore(plPercent, t.entry, t.sl, t.tp)
        };

        await saveTrades(trades[tradeIndex]);
        renderDashboard();
        renderJournal();
        modalCloseTrade.style.display = 'none';
        closeTradeForm.reset();
        showToast('Đã chốt lệnh thành công!');
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
    document.getElementById('input-reason').value = trade.reason || '';
    document.getElementById('input-pl').value = trade.pl !== null ? trade.pl.toFixed(2) : '';
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
        <span style="font-size:0.8rem;color:var(--text-secondary);">Vốn vào: $${trade.calcCapital || 0} | Đòn bẩy: ${(trade.leverage || 0).toFixed(1)}x</span>`;

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
            container.innerHTML = '<p style="color:var(--text-secondary);">Hình ảnh không tồn tại trong cache trình duyệt</p>';
        }
    } else {
        container.innerHTML = '<p style="color:var(--text-secondary);">Không có hình ảnh biểu đồ</p>';
    }
    modalDetail.style.display = 'flex';
}

// ============================================================
// Delete Confirmation
// ============================================================
let tradeToDelete = null;
function confirmDeleteTrade(id) {
    tradeToDelete = id;
    modalConfirmDelete.style.display = 'flex';
    refreshIcons();
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    if (tradeToDelete) {
        await deleteTrade(tradeToDelete);
        tradeToDelete = null;
        modalConfirmDelete.style.display = 'none';
        showToast('Đã xóa lệnh!');
    }
});

document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    tradeToDelete = null;
    modalConfirmDelete.style.display = 'none';
});

// ============================================================
// Equity Chart
// ============================================================
let equityChartInstance = null;

function renderEquityChart() {
    const ctx = document.getElementById('equityChart').getContext('2d');
    if (equityChartInstance) equityChartInstance.destroy();

    let currentEquity = settings.initialCapital;
    const closedTrades = [...trades].reverse().filter(t => t.pl !== null);
    const labels = ["Bắt đầu", ...closedTrades.map((t, i) => `Trade ${i + 1}`)];
    const dataPoints = [settings.initialCapital];
    closedTrades.forEach(t => { currentEquity += (t.profitAmount || 0); dataPoints.push(currentEquity); });

    equityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Tài sản (USD)',
                data: dataPoints,
                borderColor: '#3d7eff',
                backgroundColor: 'rgba(61,126,255,0.1)',
                fill: true, tension: 0.4,
                pointRadius: closedTrades.length > 20 ? 0 : 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ============================================================
// Analytics
// ============================================================
function renderAnalytics() { renderProfitCalendar(); }

function renderProfitCalendar() {
    const calendarEl = document.getElementById('profit-calendar');
    calendarEl.innerHTML = '';
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    document.getElementById('calendar-month-year').innerText = `Tháng ${month + 1}, ${year}`;

    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.innerText = d;
        calendarEl.appendChild(h);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calendarEl.appendChild(document.createElement('div'));

    const dailyPL = {};
    trades.filter(t => t.pl !== null).forEach(t => {
        const d = new Date(t.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const key = d.getDate();
            dailyPL[key] = (dailyPL[key] || 0) + (t.profitAmount || 0);
        }
    });

    for (let day = 1; day <= daysInMonth; day++) {
        const pl = dailyPL[day] || 0;
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${pl > 0 ? 'day-profit' : (pl < 0 ? 'day-loss' : '')}`;
        dayEl.innerHTML = `<div class="date">${day}</div><div class="day-pl">${pl !== 0 ? (pl > 0 ? '+' : '') + pl.toFixed(0) : ''}</div>`;
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

// ============================================================
// Dashboard
// ============================================================
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
    document.getElementById('page-title').innerText = `Chào, ${currentUser?.email?.split('@')[0] || 'Trader'}!`;

    recentTradesList.innerHTML = '';
    trades.slice(0, 5).forEach(trade => {
        const div = document.createElement('div');
        div.className = 'trade-row';
        div.style.cssText = 'grid-template-columns:1.5fr 1fr 1fr;padding:0.7rem;border-radius:12px;background:rgba(255,255,255,0.02);cursor:pointer;';
        div.onclick = () => viewDetail(trade.id);
        const plClass = trade.pl === null ? '' : (trade.pl >= 0 ? 'profit' : 'loss');
        const plDisplay = trade.pl === null ? 'Đang chạy' : `${trade.pl > 0 ? '+' : ''}$${(trade.profitAmount || 0).toFixed(2)}`;
        div.innerHTML = `
            <div style="font-weight:600;">${trade.pair} <span class="badge ${trade.position}">${trade.position}</span></div>
            <div class="value ${plClass}" style="font-size:0.9rem;">${plDisplay}</div>
            <div style="text-align:right;color:var(--text-secondary);font-size:0.7rem;">${new Date(trade.timestamp).toLocaleDateString()}</div>
        `;
        recentTradesList.appendChild(div);
    });

    renderEquityChart();
    refreshIcons();
}

// ============================================================
// Journal
// ============================================================
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

        let unrealizedPlHtml = '-';
        if (trade.pl === null) {
            unrealizedPlHtml = `<div id="unrealized-pl-${trade.id}"><span style="font-size:0.75rem;color:var(--text-secondary);">Đang tải...</span></div>`;
        }

        row.innerHTML = `
            <div style="font-weight:600;cursor:pointer;" onclick="viewDetail(${trade.id})">${trade.pair} <span class="badge ${trade.position}">${trade.position}</span></div>
            <div>$${trade.entry}</div>
            <div style="font-family:'Roboto Mono',monospace;font-size:0.8rem;">${(trade.volume || 0).toFixed(4)}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);">SL: ${trade.sl}<br>TP: ${trade.tp}</div>
            <div style="color:var(--accent-color);font-weight:600;">${trade.plannedR || '0'}R</div>
            <div class="value ${plClass}">${plDisplay}</div>
            <div style="text-align:center;">${unrealizedPlHtml}</div>
            <div style="text-align:center;">${resultHtml}</div>
            <div style="display:flex;gap:0.5rem;align-items:center;justify-self:end;">
                ${trade.pl === null
                    ? `<button onclick="openCloseModal(${trade.id})" class="btn-sm btn-outline-success">Chốt</button>`
                    : `<div style="font-size:0.75rem;color:var(--text-secondary);">${(trade.leverage || 0).toFixed(1)}x</div>`}
                <button class="btn-sm btn-icon-sm" onclick="editTrade(${trade.id})" title="Sửa"><i data-lucide="edit-3"></i></button>
                <button class="btn-sm btn-icon-sm" onclick="confirmDeleteTrade(${trade.id})" style="color:var(--danger-color);" title="Xóa"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        fullJournalList.appendChild(row);
    }
    refreshIcons();
    setupRealtimePL();
}

// ============================================================
// Realtime P/L WebSocket
// ============================================================
let binanceWs = null;

async function setupRealtimePL() {
    if (binanceWs) {
        binanceWs.close();
        binanceWs = null;
    }
    const unclosedPairsArray = [];
    trades.forEach(t => { 
        if (t.pl === null) {
            const cleanPair = t.pair.replace(/[^A-Z0-9]/ig, '').toUpperCase();
            if (cleanPair && !unclosedPairsArray.includes(cleanPair)) {
                unclosedPairsArray.push(cleanPair);
            }
        }
    });
    
    if (unclosedPairsArray.length === 0) return;

    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price');
        const data = await response.json();
        
        data.forEach(item => {
            if (unclosedPairsArray.includes(item.symbol)) {
                const currentPrice = parseFloat(item.price);
                updateUnrealizedPLDOM(item.symbol, currentPrice);
            }
        });
    } catch (e) {
        console.error("Lỗi fetch REST realtime:", e);
    }

    const streams = unclosedPairsArray.map(p => `${p.toLowerCase()}@ticker`).join('/');
    binanceWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    
    binanceWs.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            if(!payload.data) return;
            const symbol = payload.data.s;
            const currentPrice = parseFloat(payload.data.c);
            updateUnrealizedPLDOM(symbol, currentPrice);
        } catch (e) {}
    };
}

function updateUnrealizedPLDOM(symbol, currentPrice) {
    trades.forEach(t => {
        if (t.pl === null && t.pair.replace(/[^A-Z0-9]/ig, '').toUpperCase() === symbol) {
            const el = document.getElementById(`unrealized-pl-${t.id}`);
            if (el) {
                let unrealizedProfit = t.position === 'long' 
                    ? t.volume * (currentPrice - t.entry)
                    : t.volume * (t.entry - currentPrice);
                const uPlClass = unrealizedProfit >= 0 ? 'profit' : 'loss';
                el.innerHTML = `<span class="${uPlClass}" style="font-weight: 700;">${unrealizedProfit >= 0 ? '+' : ''}$${unrealizedProfit.toFixed(2)}</span><br><span style="font-size:0.75rem;color:var(--text-secondary);">Giá: ${currentPrice}</span>`;
            }
        }
    });
}

// ============================================================
// Expose to window (ES module scope fix)
// ============================================================
window.openCloseModal = openCloseModal;
window.editTrade = editTrade;
window.viewDetail = viewDetail;
window.deleteTrade = confirmDeleteTrade;
window.confirmDeleteTrade = confirmDeleteTrade;
window.loadUserData = loadUserData;
window.renderJournal = renderJournal;

// ============================================================
// Initialize
// ============================================================
window.onload = async () => {
    await initDB();
    // onAuthStateChanged will handle UI once Firebase resolves session
};
