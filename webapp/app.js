// ═══════════════════════════════════
//  TELEGRAM WEB APP INIT
// ═══════════════════════════════════
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');
}

const user = tg?.initDataUnsafe?.user;

// ═══════════════════════════════════
//  PRODUCTS DATA
// ═══════════════════════════════════
const products = [
    { id: 1, name: 'Аккаунт YM Lite', desc: 'Базовый аккаунт с минимальной настройкой', price: 490, emoji: '🔑', category: 'accounts', tag: 'NEW' },
    { id: 2, name: 'Аккаунт YM Standard', desc: 'Готовый аккаунт с полной настройкой', price: 990, emoji: '🔐', category: 'accounts' },
    { id: 3, name: 'Аккаунт YM Pro', desc: 'Премиум аккаунт с расширенными лимитами', price: 1990, oldPrice: 2490, emoji: '👑', category: 'accounts', tag: 'TOP' },
];

// ═══════════════════════════════════
//  STATE
// ═══════════════════════════════════
let cart = [];
let currentCategory = 'all';
let currentPage = 'home';

// ═══════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ═══════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════
function initParticles() {
    const canvas = $('#particles');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const count = 40;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.5,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.5 + 0.1,
            pulse: Math.random() * Math.PI * 2,
        };
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(createParticle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += 0.01;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            const glowOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250, 204, 21, ${glowOpacity})`;
            ctx.fill();

            // glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250, 204, 21, ${glowOpacity * 0.15})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
    animate();
}

// ═══════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════
function navigateTo(page) {
    currentPage = page;

    // Update pages
    $$('.page').forEach(p => p.classList.remove('active'));
    const target = $(`#page-${page}`);
    if (target) target.classList.add('active');

    // Update tabs
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.page === page));

    // Update sidebar links
    $$('.sidebar-link[data-page]').forEach(l => l.classList.toggle('active', l.dataset.page === page));

    // Close sidebar on mobile
    closeSidebar();

    // Render page content
    if (page === 'catalog') renderProducts();
    if (page === 'cart') renderCart();
    if (page === 'orders') renderOrders();

    // Haptic
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

// Tab bar clicks
$$('.tab').forEach(tab => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.page));
});

// Sidebar link clicks
$$('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
});

// Quick action & button clicks
$$('[data-page]').forEach(el => {
    if (!el.classList.contains('tab') && !el.classList.contains('sidebar-link')) {
        el.addEventListener('click', () => navigateTo(el.dataset.page));
    }
});

// ═══════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════
function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#sidebarOverlay').classList.add('open');
    $('#sidebarOverlay').style.display = 'block';
}

function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('open');
    setTimeout(() => { $('#sidebarOverlay').style.display = 'none'; }, 300);
}

$('#menuBtn')?.addEventListener('click', openSidebar);
$('#sidebarOverlay')?.addEventListener('click', closeSidebar);

// ═══════════════════════════════════
//  RENDER PRODUCTS
// ═══════════════════════════════════
function renderProducts() {
    const list = $('#productsList');
    const search = $('#searchInput')?.value?.toLowerCase() || '';

    let filtered = products.filter(p => {
        const matchCat = currentCategory === 'all' || p.category === currentCategory;
        const matchSearch = !search || p.name.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    list.innerHTML = filtered.map((p, i) => {
        const inCart = cart.find(c => c.id === p.id);
        const tagClass = p.tag === 'SALE' ? 'sale' : p.tag === 'TOP' ? 'top' : '';
        return `
            <div class="product-card" style="animation-delay: ${i * 0.05}s" data-id="${p.id}">
                <div class="product-img">
                    ${p.tag ? `<div class="tag ${tagClass}">${p.tag}</div>` : ''}
                    ${p.emoji}
                </div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-desc">${p.desc}</div>
                    <div class="product-bottom">
                        <div>
                            <span class="product-price">₽${p.price.toLocaleString()}</span>
                            ${p.oldPrice ? `<span class="product-old-price">₽${p.oldPrice.toLocaleString()}</span>` : ''}
                        </div>
                        ${inCart ? `
                        <div class="product-qty-controls" data-id="${p.id}">
                            <button class="pqc-btn minus" data-id="${p.id}" data-action="minus">−</button>
                            <span class="pqc-count">${inCart.qty}</span>
                            <button class="pqc-btn plus" data-id="${p.id}" data-action="plus">+</button>
                        </div>
                        ` : `
                        <button class="product-add-btn" data-id="${p.id}">+</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Card click -> modal
    list.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.product-add-btn') || e.target.closest('.product-qty-controls')) return;
            openProductModal(parseInt(card.dataset.id));
        });
    });

    // Add button
    list.querySelectorAll('.product-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(parseInt(btn.dataset.id));
        });
    });

    // Qty controls (minus / plus)
    list.querySelectorAll('.pqc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (btn.dataset.action === 'plus') {
                addToCart(id);
            } else {
                changeQty(id, -1);
                updateProductCard(id);
            }
        });
    });
}

// Update a single product card's button area without re-rendering the whole list
function updateProductCard(id) {
    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (!card) return;

    const bottom = card.querySelector('.product-bottom');
    if (!bottom) return;

    const inCart = cart.find(c => c.id === id);
    const p = products.find(pr => pr.id === id);
    if (!p) return;

    // Rebuild only the button part (keep price)
    const priceHtml = `<div>
        <span class="product-price">₽${p.price.toLocaleString()}</span>
        ${p.oldPrice ? `<span class="product-old-price">₽${p.oldPrice.toLocaleString()}</span>` : ''}
    </div>`;

    const btnHtml = inCart ? `
        <div class="product-qty-controls" data-id="${p.id}">
            <button class="pqc-btn minus" data-id="${p.id}" data-action="minus">−</button>
            <span class="pqc-count">${inCart.qty}</span>
            <button class="pqc-btn plus" data-id="${p.id}" data-action="plus">+</button>
        </div>
    ` : `
        <button class="product-add-btn" data-id="${p.id}">+</button>
    `;

    bottom.innerHTML = priceHtml + btnHtml;

    // Re-bind events for this card
    const addBtn = bottom.querySelector('.product-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(id);
        });
    }

    bottom.querySelectorAll('.pqc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.action === 'plus') {
                addToCart(id);
            } else {
                changeQty(id, -1);
                updateProductCard(id);
            }
        });
    });
}

// ═══════════════════════════════════
//  PRODUCT MODAL
// ═══════════════════════════════════
function openProductModal(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;

    const inCart = cart.find(c => c.id === p.id);
    const modal = $('#productModal');
    const body = $('#modalBody');

    body.innerHTML = `
        <div class="modal-product-img">${p.emoji}</div>
        <div class="modal-product-name">${p.name}</div>
        <div class="modal-product-cat">${getCategoryName(p.category)}</div>
        <div class="modal-product-desc">${p.desc}</div>
        <div class="modal-product-price">
            ₽${p.price.toLocaleString()}
            ${p.oldPrice ? `<span class="product-old-price" style="font-size:16px">₽${p.oldPrice.toLocaleString()}</span>` : ''}
        </div>
        <button class="modal-add-btn" id="modalAddBtn">
            ${inCart ? '✓ В корзине' : 'Добавить в корзину'}
        </button>
    `;

    modal.classList.add('open');

    $('#modalAddBtn').addEventListener('click', () => {
        addToCart(p.id);
        closeProductModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProductModal();
    });

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeProductModal() {
    $('#productModal').classList.remove('open');
}

function getCategoryName(cat) {
    const names = { accounts: 'Аккаунты' };
    return names[cat] || cat;
}

// ═══════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════
$$('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        currentCategory = chip.dataset.cat;
        $$('.cat-chip').forEach(c => c.classList.toggle('active', c === chip));
        renderProducts();
        if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
});

// ═══════════════════════════════════
//  SEARCH
// ═══════════════════════════════════
$('#searchInput')?.addEventListener('input', () => {
    renderProducts();
});

// ═══════════════════════════════════
//  CART LOGIC
// ═══════════════════════════════════
function addToCart(id) {
    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, qty: 1 });
    }
    updateCartUI();
    showToast('Добавлено в корзину');
    if (currentPage === 'catalog') updateProductCard(id);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    updateCartUI();
    renderCart();
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(id);
        return;
    }
    updateCartUI();
    renderCart();
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function getCartTotal() {
    return cart.reduce((sum, item) => {
        const p = products.find(pr => pr.id === item.id);
        return sum + (p ? p.price * item.qty : 0);
    }, 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
    const count = getCartCount();
    const total = getCartTotal();

    // Stats
    const statCart = $('#statCart');
    if (statCart) statCart.textContent = count;

    // Tab badge
    const tabBadge = $('#tabCartBadge');
    if (tabBadge) {
        tabBadge.textContent = count;
        tabBadge.classList.toggle('show', count > 0);
    }

    // Sidebar badge
    const badge = $('#sidebarBadge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);
    }
}

// ═══════════════════════════════════
//  RENDER CART
// ═══════════════════════════════════
function renderCart() {
    const container = $('#cartItems');
    const footer = $('#cartFooter');
    const empty = $('#cartEmpty');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state" id="cartEmpty">
                <div class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                </div>
                <div class="empty-title">Корзина пуста</div>
                <div class="empty-sub">Добавьте товары из каталога</div>
                <button class="empty-btn" onclick="navigateTo('catalog')">Перейти в каталог</button>
            </div>
        `;
        footer.classList.remove('show');
        return;
    }

    container.innerHTML = cart.map(item => {
        const p = products.find(pr => pr.id === item.id);
        if (!p) return '';
        return `
            <div class="cart-item">
                <div class="cart-item-img">${p.emoji}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${p.name}</div>
                    <div class="cart-item-price">₽${(p.price * item.qty).toLocaleString()}</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
                        <span class="qty-value">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
                        <button class="cart-item-remove" onclick="removeFromCart(${p.id})">Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    footer.classList.add('show');
    $('#cartCount').textContent = getCartCount();
    $('#cartTotal').textContent = `₽${getCartTotal().toLocaleString()}`;
}

// ═══════════════════════════════════
//  CHECKOUT
// ═══════════════════════════════════
$('#checkoutBtn')?.addEventListener('click', () => {
    if (cart.length === 0) return;

    const orderItems = cart.map(item => {
        const p = products.find(pr => pr.id === item.id);
        return { id: item.id, name: p?.name, price: p?.price, qty: item.qty, emoji: p?.emoji };
    });
    const order = {
        id: Math.floor(100000 + Math.random() * 900000),
        items: orderItems,
        total: getCartTotal(),
        date: new Date().toISOString(),
        status: 'completed',
    };
    saveOrder(order);

    if (tg) {
        const orderData = { ...order, userId: user?.id };
        tg.sendData(JSON.stringify(orderData));
    }

    showToast('Заказ оформлен!');
    cart = [];
    updateCartUI();
    renderCart();
    navigateTo('orders');
});

// ═══════════════════════════════════
//  TOPUP (CRYPTO)
// ═══════════════════════════════════
const USDT_RATE = 83.0; // 1 USDT = X RUB
let selectedUsdt = 10;

let converterLock = false;

function updateConverterFromUsdt() {
    if (converterLock) return;
    converterLock = true;
    const val = parseFloat($('#usdtInput')?.value) || 0;
    selectedUsdt = val;
    const rub = Math.round(val * USDT_RATE);
    const rubInput = $('#rubInput');
    if (rubInput) rubInput.value = rub || '';
    converterLock = false;
}

function updateConverterFromRub() {
    if (converterLock) return;
    converterLock = true;
    const rub = parseFloat($('#rubInput')?.value) || 0;
    const usdt = rub / USDT_RATE;
    selectedUsdt = usdt;
    const usdtInput = $('#usdtInput');
    if (usdtInput) usdtInput.value = usdt ? parseFloat(usdt.toFixed(2)) : '';
    converterLock = false;
}

$('#usdtInput')?.addEventListener('input', updateConverterFromUsdt);
$('#rubInput')?.addEventListener('input', updateConverterFromRub);

// Quick amount buttons
$$('.topup-amount').forEach(btn => {
    btn.addEventListener('click', () => {
        const usdt = parseFloat(btn.dataset.usdt);
        if (usdt) {
            selectedUsdt = usdt;
            const input = $('#usdtInput');
            if (input) input.value = usdt;
            updateConverterFromUsdt();
        }
        // Highlight selected
        $$('.topup-amount').forEach(b => b.style.borderColor = '');
        btn.style.borderColor = 'var(--accent)';
        if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
});

const WALLET_ADDRESS = 'TPav18k2LjP3wbPR6sHNFg19GBjxpiwLqX';
let currentPayment = null;

$('#topupSubmit')?.addEventListener('click', () => {
    if (selectedUsdt <= 0) return;
    openPaymentModal(selectedUsdt);
});

function generateRequestId() {
    return Math.floor(100000 + Math.random() * 900000);
}

function generateUniqueAmount(baseUsdt) {
    const suffix = Math.floor(Math.random() * 9) + 1; // 1-9
    return parseFloat((baseUsdt + suffix / 100).toFixed(2));
}

function openPaymentModal(baseUsdt) {
    const uniqueUsdt = generateUniqueAmount(baseUsdt);
    const rubAmount = Math.round(uniqueUsdt * USDT_RATE);
    const reqId = generateRequestId();

    currentPayment = { usdt: uniqueUsdt, rub: rubAmount, reqId };

    // Fill modal
    $('#payReqId').textContent = reqId;
    $('#payAmount').textContent = `${uniqueUsdt.toFixed(2)} USDT`;
    $('#payAmountRub').textContent = `≈ ${rubAmount.toLocaleString()} ₽`;
    $('#payAddress').textContent = WALLET_ADDRESS;

    // QR Code (using free API)
    const qrData = WALLET_ADDRESS;
    const qrContainer = $('#payQR');
    qrContainer.innerHTML = `
        <div class="payment-qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}&bgcolor=111111&color=fbbf24&margin=0" alt="QR" width="180" height="180">
            <div class="payment-qr-label">Сканируйте для оплаты</div>
        </div>
    `;

    // Reset status
    const statusEl = $('#paymentStatus');
    statusEl.className = 'payment-status';
    statusEl.textContent = '';
    const confirmBtn = $('#payConfirmBtn');
    confirmBtn.textContent = 'Я оплатил';
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('paid');

    // Open modal
    $('#paymentModal').classList.add('open');
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function closePaymentModal() {
    $('#paymentModal').classList.remove('open');
    currentPayment = null;
}

// Copy address
$('#payCopyBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(WALLET_ADDRESS).then(() => {
        showToast('Адрес скопирован');
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }).catch(() => {
        // Fallback
        const el = $('#payAddress');
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        showToast('Выделите и скопируйте адрес');
    });
});

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRONGRID_API = 'https://api.trongrid.io';
let checkingPayment = false;

async function checkTronGrid(expectedUsdt) {
    const url = `${TRONGRID_API}/v1/accounts/${WALLET_ADDRESS}/transactions/trc20`;
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const params = new URLSearchParams({
        only_confirmed: 'true',
        limit: '30',
        contract_address: USDT_CONTRACT,
        only_to: 'true',
        min_timestamp: fiveMinAgo.toString(),
    });

    const resp = await fetch(`${url}?${params}`);
    const data = await resp.json();
    const transfers = data.data || [];

    for (const tx of transfers) {
        const amount = parseInt(tx.value) / 1_000_000;
        const rounded = Math.round(amount * 100) / 100;
        if (rounded === expectedUsdt) {
            return { found: true, txHash: tx.transaction_id };
        }
    }
    return { found: false };
}

// Confirm payment — check TronGrid
$('#payConfirmBtn')?.addEventListener('click', async () => {
    if (!currentPayment || checkingPayment) return;
    checkingPayment = true;

    const btn = $('#payConfirmBtn');
    const statusEl = $('#paymentStatus');
    btn.textContent = 'Проверяю...';
    btn.disabled = true;
    statusEl.className = 'payment-status checking';
    statusEl.textContent = 'Ищем транзакцию в сети TRON...';

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    try {
        const result = await checkTronGrid(currentPayment.usdt);

        if (result.found) {
            // Payment found!
            statusEl.className = 'payment-status success';
            statusEl.textContent = 'Оплата подтверждена!';
            btn.textContent = 'Оплачено ✓';
            btn.classList.add('paid');

            // Success animation
            launchConfetti();
            const statusIcon = $('.payment-status-icon');
            if (statusIcon) {
                statusIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>';
                statusIcon.classList.add('payment-success-anim');
            }

            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

            // Send to bot for balance credit
            if (tg) {
                setTimeout(() => {
                    tg.sendData(JSON.stringify({
                        action: 'topup',
                        usdt: currentPayment.usdt,
                        rub: currentPayment.rub,
                        reqId: currentPayment.reqId,
                        txHash: result.txHash,
                        method: 'USDT_TRC20'
                    }));
                }, 2000);
            }
        } else {
            // Not found yet
            statusEl.className = 'payment-status pending';
            statusEl.textContent = 'Платёж пока не найден. Подождите 1-2 минуты и попробуйте снова.';
            btn.textContent = 'Проверить ещё раз';
            btn.disabled = false;
            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }
    } catch (e) {
        statusEl.className = 'payment-status pending';
        statusEl.textContent = 'Ошибка проверки. Попробуйте ещё раз.';
        btn.textContent = 'Проверить ещё раз';
        btn.disabled = false;
    }

    checkingPayment = false;
});

// Cancel payment
$('#payCancelBtn')?.addEventListener('click', () => {
    closePaymentModal();
});

// Close on overlay click
$('#paymentModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'paymentModal') closePaymentModal();
});

// ═══════════════════════════════════
//  SUPPORT
// ═══════════════════════════════════
$('#supportTgBtn')?.addEventListener('click', () => {
    const url = 'https://t.me/adreatlik';
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
});

// ═══════════════════════════════════
//  ORDERS (localStorage)
// ═══════════════════════════════════
function getOrders() {
    try {
        return JSON.parse(localStorage.getItem('ym_orders') || '[]');
    } catch { return []; }
}

function saveOrder(order) {
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem('ym_orders', JSON.stringify(orders));
}

function renderOrders() {
    const container = $('#ordersList');
    const orders = getOrders();

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
                <div class="empty-title">Нет заказов</div>
                <div class="empty-sub">Ваши заказы появятся здесь</div>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Заказ #${o.id}</div>
                    <div class="order-date">${new Date(o.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="order-status ${o.status}">${o.status === 'completed' ? 'Выполнен' : 'В обработке'}</div>
            </div>
            <div class="order-items-list">
                ${o.items.map(item => `
                    <div class="order-item-row">
                        <span class="order-item-name">${item.emoji || '📦'} ${item.name} × ${item.qty}</span>
                        <span>₽${(item.price * item.qty).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-total-row">
                <span>Итого</span>
                <span>₽${o.total.toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════
function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#22c55e', '#fbbf24', '#ef4444', '#3b82f6', '#a855f7', '#ffffff'];
    const particles = [];

    for (let i = 0; i < 80; i++) {
        particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 60,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 16,
            vy: -Math.random() * 18 - 4,
            size: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 12,
            gravity: 0.4 + Math.random() * 0.2,
            opacity: 1,
        });
    }

    let frame = 0;
    const maxFrames = 150;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;

        particles.forEach(p => {
            p.x += p.vx;
            p.vy += p.gravity;
            p.y += p.vy;
            p.vx *= 0.99;
            p.rotation += p.rotSpeed;
            if (frame > maxFrames - 40) p.opacity -= 0.025;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });

        if (frame < maxFrames) {
            requestAnimationFrame(animate);
        } else {
            canvas.remove();
        }
    }

    animate();
}

// ═══════════════════════════════════
//  TOAST
// ═══════════════════════════════════
let toastTimer;
function showToast(text) {
    const toast = $('#toast');
    $('#toastText').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ═══════════════════════════════════
//  BALANCE
// ═══════════════════════════════════
const BOT_API_URL = 'http://localhost:8080';
let userBalance = 0;

async function loadBalance() {
    const userId = user?.id;
    if (!userId) return;

    try {
        const resp = await fetch(`${BOT_API_URL}/api/balance?user_id=${userId}`);
        const data = await resp.json();
        if (data.ok) {
            userBalance = data.balance;
            updateBalanceDisplay();
        }
    } catch (e) {
        // API not available — keep cached balance
    }
}

function updateBalanceDisplay() {
    const formatted = `₽${Math.floor(userBalance).toLocaleString()}`;
    const bal = $('#balanceAmount');
    if (bal) bal.textContent = formatted;
    const topupBal = $('#topupBalance');
    if (topupBal) topupBal.textContent = formatted;
}

// ═══════════════════════════════════
//  INIT
// ═══════════════════════════════════
function init() {
    // Set user info
    if (user) {
        const name = user.first_name || 'User';
        const sName = $('#sidebarUserName');
        const sId = $('#sidebarUserId');
        const sAvatar = $('#sidebarAvatar');
        if (sName) sName.textContent = name;
        if (sId) sId.textContent = `ID: ${user.id}`;
        if (sAvatar) sAvatar.textContent = name.charAt(0).toUpperCase();
    }

    initParticles();
    renderProducts();
    updateCartUI();
    loadBalance();

    // Stats from localStorage
    const statOrders = $('#statOrders');
    if (statOrders) statOrders.textContent = getOrders().length;
}

document.addEventListener('DOMContentLoaded', init);
