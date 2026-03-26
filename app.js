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
    { id: 1, name: 'Premium аккаунт', desc: 'Полный доступ ко всем функциям на 30 дней', price: 990, oldPrice: 1490, emoji: '👑', category: 'premium', tag: 'TOP' },
    { id: 2, name: 'Starter Pack', desc: 'Базовый набор для начала работы', price: 490, emoji: '⚡', category: 'digital', tag: 'NEW' },
    { id: 3, name: 'VIP подписка', desc: 'Эксклюзивные функции и приоритетная поддержка', price: 2990, oldPrice: 4990, emoji: '💎', category: 'premium', tag: 'SALE' },
    { id: 4, name: 'Аккаунт Pro', desc: 'Готовый аккаунт с полной настройкой', price: 1490, emoji: '🔑', category: 'accounts' },
    { id: 5, name: 'Базовый аккаунт', desc: 'Аккаунт с минимальной настройкой', price: 290, emoji: '📦', category: 'accounts' },
    { id: 6, name: 'Консультация', desc: 'Персональная консультация 60 минут', price: 1990, emoji: '💬', category: 'services' },
    { id: 7, name: 'Настройка под ключ', desc: 'Полная настройка и конфигурация', price: 4990, emoji: '🛠', category: 'services', tag: 'TOP' },
    { id: 8, name: 'Mega Bundle', desc: 'Все продукты в одном пакете', price: 7990, oldPrice: 12990, emoji: '🚀', category: 'premium', tag: 'SALE' },
    { id: 9, name: 'Аккаунт Lite', desc: 'Лёгкая версия для быстрого старта', price: 190, emoji: '✨', category: 'accounts', tag: 'NEW' },
    { id: 10, name: 'Техподдержка 24/7', desc: 'Круглосуточная поддержка на месяц', price: 790, emoji: '🛡', category: 'services' },
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
                        <button class="product-add-btn ${inCart ? 'added' : ''}" data-id="${p.id}">
                            ${inCart ? '✓' : '+'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Card click -> modal
    list.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.product-add-btn')) return;
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
    const names = { digital: 'Цифровые', accounts: 'Аккаунты', services: 'Услуги', premium: 'Премиум' };
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
    if (currentPage === 'catalog') renderProducts();
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

    // Tab badge could be added here
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

    if (tg) {
        // Send data to bot
        const orderData = {
            items: cart.map(item => {
                const p = products.find(pr => pr.id === item.id);
                return { id: item.id, name: p?.name, price: p?.price, qty: item.qty };
            }),
            total: getCartTotal(),
            userId: user?.id,
        };
        tg.sendData(JSON.stringify(orderData));
    } else {
        showToast('Заказ оформлен!');
        cart = [];
        updateCartUI();
        renderCart();
        navigateTo('orders');
    }
});

// ═══════════════════════════════════
//  TOPUP
// ═══════════════════════════════════
$$('.topup-amount').forEach(btn => {
    btn.addEventListener('click', () => {
        const amount = parseInt(btn.dataset.amount);
        handleTopup(amount);
    });
});

$('#topupSubmit')?.addEventListener('click', () => {
    const val = parseInt($('#topupInput')?.value);
    if (val && val > 0) handleTopup(val);
});

function handleTopup(amount) {
    if (tg) {
        tg.sendData(JSON.stringify({ action: 'topup', amount }));
    } else {
        showToast(`Пополнение на ₽${amount.toLocaleString()}`);
    }
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
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
}

document.addEventListener('DOMContentLoaded', init);
