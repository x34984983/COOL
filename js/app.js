// 泰巷打抛饭H5点餐网站 - 完整逻辑
(function() {
    'use strict';

    // ========== Supabase 全局变量（从index.html初始化） ==========
    const supabase = window.supabaseClient || null;
    const isOnline = (supabase !== null);

    // ========== 全局变量 ==========
    let currentPage = 'menu';
    let currentAdminTab = 'stats';
    let currentOrderTab = 'pending';
    let statsMode = 'daily';
    let cart = [];
    let pickupTimer = null;
    let currentPickupIndex = 0;
    let editingDishId = null;

    // ========== 默认菜品数据 ==========
    const defaultDishes = [
        { id: 1, name: '泰式煎蛋饭', price: 12, category: '打抛饭系列', image: './images/dish1-taishijiandanfan.jpg' },
        { id: 2, name: '猪肉打抛饭', price: 19, category: '打抛饭系列', image: './images/dish2-zhuroudapaofan.jpg' },
        { id: 3, name: '鸡肉打抛饭', price: 18, category: '打抛饭系列', image: './images/dish3-jiroudapaofan.jpg' },
        { id: 4, name: '牛肉打抛饭', price: 28, category: '打抛饭系列', image: './images/dish4-niuroudapaofan.jpg' },
        { id: 5, name: '鲜虾猪肉打抛饭', price: 32, category: '打抛饭系列', image: './images/dish5-xianxiazhuroudapaofan.jpg' },
        { id: 6, name: '泰式醉鬼炒面', price: 22, category: '打抛饭系列', image: './images/dish6-taishizuiguichaomian.jpg' },
        { id: 7, name: '加无菌蛋', price: 2, category: '打抛饭系列', image: './images/dish7-jiawujundan.jpg' },
        { id: 8, name: '泰式酸辣拌粉丝', price: 28, category: '凉拌系列', image: './images/dish8-taishisuanlabanfensi.jpg' },
        { id: 9, name: '菠萝芒果脆脆虾', price: 26, category: '凉拌系列', image: './images/dish9-boluomangguocuicuixia.jpg' },
        { id: 10, name: '凉拌荷包蛋', price: 18, category: '凉拌系列', image: './images/dish10-liangbanhebaodan.jpg' },
        { id: 11, name: '泰式奶茶', price: 12, category: '饮品系列', image: './images/dish11-taishinaicha.jpg' }
    ];

    // ========== 存储工具函数 ==========
    function getStorage(key, defaultValue) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    // ========== 初始化数据 ==========
    function initData() {
        // 初始化菜品
        if (!getStorage('dishes', null)) {
            setStorage('dishes', defaultDishes);
        }
        // 初始化购物车
        cart = getStorage('cart', []);
        // 初始化用户ID
        if (!getStorage('userId', null)) {
            setStorage('userId', 'user_' + Date.now());
        }
    }

    // ========== 菜品数据操作 ==========
    function getDishes() {
        return getStorage('dishes', defaultDishes);
    }

    function saveDishes(dishes) {
        setStorage('dishes', dishes);
    }

    // ========== 购物车操作 ==========
    function saveCart() {
        setStorage('cart', cart);
    }

    function getCartItem(dishId) {
        return cart.find(item => item.id === dishId);
    }

    function addToCart(dishId) {
        const dishes = getDishes();
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return;

        const existingItem = getCartItem(dishId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: dish.id,
                name: dish.name,
                price: dish.price,
                image: dish.image,
                quantity: 1
            });
        }
        saveCart();
        renderMenu();
        renderCart();
        updateCheckoutBar();
    }

    function removeFromCart(dishId) {
        const existingItem = getCartItem(dishId);
        if (existingItem) {
            existingItem.quantity--;
            if (existingItem.quantity <= 0) {
                cart = cart.filter(item => item.id !== dishId);
            }
        }
        saveCart();
        renderMenu();
        renderCart();
        updateCheckoutBar();
    }

    function clearCart() {
        cart = [];
        saveCart();
    }

    function calculateCartTotal() {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    function calculateCartCount() {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    // ========== 订单操作 ==========
    function getAllOrders() {
        return getStorage('all_orders', []);
    }

    function saveAllOrders(orders) {
        setStorage('all_orders', orders);
    }

    function generateOrderNo() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        const allOrders = getAllOrders();
        const todayOrders = allOrders.filter(order => {
            const orderDate = new Date(order.createTime);
            const orderYear = orderDate.getFullYear();
            const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
            const orderDay = String(orderDate.getDate()).padStart(2, '0');
            const orderDateStr = `${orderYear}${orderMonth}${orderDay}`;
            return orderDateStr === dateStr;
        });

        const seq = todayOrders.length + 1;
        return `ORD-${dateStr}-${seq}`;
    }

    function generatePickupCode() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        const allOrders = getAllOrders();
        const todayOrders = allOrders.filter(order => {
            const orderDate = new Date(order.createTime);
            const orderYear = orderDate.getFullYear();
            const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
            const orderDay = String(orderDate.getDate()).padStart(2, '0');
            const orderDateStr = `${orderYear}${orderMonth}${orderDay}`;
            return orderDateStr === dateStr;
        });

        const code = todayOrders.length + 1;
        return String(code).padStart(3, '0');
    }

    function createOrder(remark = '') {
        const userId = getStorage('userId', '');
        const order = {
            id: generateOrderNo(),
            pickupCode: generatePickupCode(),
            userId: userId,
            items: [...cart],
            totalPrice: calculateCartTotal(),
            status: 'pending',
            remark: remark,
            createTime: new Date().toISOString(),
            selected: false
        };

        const allOrders = getAllOrders();
        allOrders.unshift(order);
        saveAllOrders(allOrders);
        clearCart();
        return order;
    }

    function getUserOrders() {
        const userId = getStorage('userId', '');
        const allOrders = getAllOrders();
        return allOrders.filter(order => order.userId === userId);
    }

    function updateOrderStatus(orderIds, status) {
        let allOrders = getAllOrders();
        allOrders = allOrders.map(order => {
            if (orderIds.includes(order.id)) {
                return { ...order, status };
            }
            return order;
        });
        saveAllOrders(allOrders);
    }

    function deleteOrders(orderIds) {
        let allOrders = getAllOrders();
        allOrders = allOrders.filter(o => !orderIds.includes(o.id));
        saveAllOrders(allOrders);
    }

    // ========== 页面导航 ==========
    window.navigateTo = function(page) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = document.getElementById('page-' + page);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        currentPage = page;

        // 更新底部导航栏状态
        document.querySelectorAll('.tab-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // 显示/隐藏底部导航栏
        const tabbar = document.getElementById('main-tabbar');
        if (['menu', 'cart', 'chat', 'mine'].includes(page)) {
            tabbar.style.display = 'flex';
            document.getElementById('app').style.paddingBottom = '120px';
        } else {
            tabbar.style.display = 'none';
            document.getElementById('app').style.paddingBottom = '0';
        }

        // 页面进入时的渲染
        if (page === 'menu') {
            renderMenu();
        } else if (page === 'cart') {
            renderCart();
        } else if (page === 'mine') {
            renderMine();
        } else if (page === 'myOrders') {
            renderMyOrders();
        } else if (page === 'admin') {
            renderAdmin();
        }
    };

    // ========== 渲染菜单页面 ==========
    function renderMenu() {
        const dishes = getDishes();
        const dishList = document.getElementById('dish-list');
        
        dishList.innerHTML = dishes.map(dish => {
            const cartItem = getCartItem(dish.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            if (quantity > 0) {
                return `
                    <div class="dish-item">
                        <img class="dish-image" src="${dish.image}" alt="${dish.name}">
                        <div class="dish-info">
                            <div class="dish-name">${dish.name}</div>
                            <div class="dish-price">¥${dish.price}</div>
                        </div>
                        <div class="dish-action">
                            <div class="quantity-control">
                                <div class="quantity-btn" onclick="removeFromCart(${dish.id})">-</div>
                                <div class="quantity-num">${quantity}</div>
                                <div class="quantity-btn active" onclick="addToCart(${dish.id})">+</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="dish-item">
                        <img class="dish-image" src="${dish.image}" alt="${dish.name}">
                        <div class="dish-info">
                            <div class="dish-name">${dish.name}</div>
                            <div class="dish-price">¥${dish.price}</div>
                        </div>
                        <div class="dish-action">
                            <div class="quantity-btn active only-plus" onclick="addToCart(${dish.id})">+</div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        updateCheckoutBar();
    }

    function updateCheckoutBar() {
        const count = calculateCartCount();
        const total = calculateCartTotal();
        
        document.getElementById('total-count').textContent = count;
        document.getElementById('total-price').textContent = total;

        const checkoutBtn = document.getElementById('go-to-cart');
        if (count > 0) {
            checkoutBtn.classList.remove('disabled');
        } else {
            checkoutBtn.classList.add('disabled');
        }
    }

    // ========== 渲染购物车页面 ==========
    function renderCart() {
        const cartList = document.getElementById('cart-list');
        const cartEmpty = document.getElementById('cart-empty');

        if (cart.length === 0) {
            cartList.style.display = 'none';
            cartEmpty.style.display = 'flex';
            return;
        }

        cartList.style.display = 'block';
        cartEmpty.style.display = 'none';

        cartList.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img class="cart-item-image" src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">¥${item.price}</div>
                </div>
                <div class="cart-item-action">
                    <div class="quantity-btn" onclick="removeFromCart(${item.id})">-</div>
                    <div class="quantity-num">${item.quantity}</div>
                    <div class="quantity-btn active" onclick="addToCart(${item.id})">+</div>
                </div>
            </div>
        `).join('');

        document.getElementById('cart-total-price').textContent = calculateCartTotal();
    }

    // ========== 渲染我的页面 ==========
    function renderMine() {
        const userOrders = getUserOrders();
        const pendingOrders = userOrders.filter(order => order.status === 'pending');

        const pickupSection = document.getElementById('pickup-section');
        const noPickupSection = document.getElementById('no-pickup-section');

        // 清除之前的定时器
        if (pickupTimer) {
            clearInterval(pickupTimer);
            pickupTimer = null;
        }

        if (pendingOrders.length === 0) {
            pickupSection.style.display = 'none';
            noPickupSection.style.display = 'block';
        } else {
            pickupSection.style.display = 'block';
            noPickupSection.style.display = 'none';

            // 显示第一个取餐号
            currentPickupIndex = 0;
            document.getElementById('mine-pickup-code').textContent = pendingOrders[0].pickupCode;

            // 多个待完成订单时启动轮播
            if (pendingOrders.length > 1) {
                pickupTimer = setInterval(() => {
                    currentPickupIndex = (currentPickupIndex + 1) % pendingOrders.length;
                    document.getElementById('mine-pickup-code').textContent = pendingOrders[currentPickupIndex].pickupCode;
                }, 5000);
            }
        }
    }

    // ========== 渲染我的订单页面 ==========
    function renderMyOrders() {
        const orders = getUserOrders();
        const ordersList = document.getElementById('orders-list');
        const ordersEmpty = document.getElementById('orders-empty');

        if (orders.length === 0) {
            ordersList.style.display = 'none';
            ordersEmpty.style.display = 'flex';
            return;
        }

        ordersList.style.display = 'block';
        ordersEmpty.style.display = 'none';

        ordersList.innerHTML = orders.map(order => {
            const date = new Date(order.createTime);
            const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            const itemsHtml = order.items.map(item => `
                <div class="order-item">
                    <img class="order-item-image" src="${item.image}" alt="${item.name}">
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-quantity">x${item.quantity}</div>
                    <div class="order-item-price">¥${item.price}</div>
                </div>
            `).join('');

            const remarkHtml = order.remark ? `<div class="order-remark">备注：${order.remark}</div>` : '';

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-id">${order.id}</div>
                        <div class="order-status ${order.status}">${order.status === 'pending' ? '制作中' : '已完成'}</div>
                    </div>
                    <div class="order-pickup">
                        <div class="order-pickup-label">编号</div>
                        <div class="order-pickup-code">${order.pickupCode}</div>
                    </div>
                    <div class="order-time">${timeStr}</div>
                    ${itemsHtml}
                    <div class="order-total">合计：¥${order.totalPrice}</div>
                    ${remarkHtml}
                </div>
            `;
        }).join('');
    }

    // ========== 管理员后台 ==========
    function checkAdminLogin() {
        const adminState = getStorage('adminLoggedIn', null);
        if (adminState && adminState.loggedIn) {
            const daysPassed = (Date.now() - adminState.loginTime) / (1000 * 60 * 60 * 24);
            if (daysPassed < adminState.expireDays) {
                return true;
            }
        }
        return false;
    }

    function renderAdmin() {
        // 切换到统计Tab
        switchAdminTab('stats');
    }

    function switchAdminTab(tab) {
        currentAdminTab = tab;

        // 更新Tab状态
        document.querySelectorAll('.admin-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.tab === tab) {
                t.classList.add('active');
            }
        });

        // 更新内容显示
        document.querySelectorAll('.admin-tab-content').forEach(c => {
            c.classList.remove('active');
        });
        document.getElementById('admin-tab-' + tab).classList.add('active');

        if (tab === 'stats') {
            renderStats();
        } else if (tab === 'orders') {
            renderAdminOrders();
        } else if (tab === 'dishes') {
            renderAdminDishes();
        }
    }

    // ========== 统计页面 ==========
    function renderStats() {
        updateStatsSummary();
        drawChart();
    }

    function updateStatsSummary() {
        const allOrders = getAllOrders();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let filteredOrders;
        if (statsMode === 'daily') {
            filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.createTime);
                const orderYear = orderDate.getFullYear();
                const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
                const orderDay = String(orderDate.getDate()).padStart(2, '0');
                const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
                return orderDateStr === dateStr;
            });
        } else {
            filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.createTime);
                const orderYear = orderDate.getFullYear();
                const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
                return orderYear === year && orderMonth === month;
            });
        }

        const totalOrders = filteredOrders.length;
        const totalSales = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);

        document.getElementById('stat-orders').textContent = totalOrders;
        document.getElementById('stat-sales').textContent = '¥' + totalSales;
    }

    function drawChart() {
        const canvas = document.getElementById('stats-chart');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 获取数据
        const allOrders = getAllOrders();
        const dataPoints = [];
        const labels = [];

        if (statsMode === 'daily') {
            // 最近7天
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const dayOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.createTime);
                    const orderYear = orderDate.getFullYear();
                    const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
                    const orderDay = String(orderDate.getDate()).padStart(2, '0');
                    const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
                    return orderDateStr === dateStr;
                });

                const sales = dayOrders.reduce((sum, o) => sum + o.totalPrice, 0);
                dataPoints.push(sales);
                labels.push(`${month}/${day}`);
            }
        } else {
            // 最近6个月
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');

                const monthOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.createTime);
                    const orderYear = orderDate.getFullYear();
                    const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
                    return orderYear === year && orderMonth === month;
                });

                const sales = monthOrders.reduce((sum, o) => sum + o.totalPrice, 0);
                dataPoints.push(sales);
                labels.push(`${year}-${month}`);
            }
        }

        // 绘制坐标轴
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 计算最大值
        const maxValue = Math.max(...dataPoints, 1);
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        const pointSpacing = chartWidth / (dataPoints.length - 1);

        // 绘制折线
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        ctx.beginPath();

        dataPoints.forEach((value, i) => {
            const x = padding + i * pointSpacing;
            const y = height - padding - (value / maxValue) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // 绘制数据点
        ctx.fillStyle = '#2E7D32';
        dataPoints.forEach((value, i) => {
            const x = padding + i * pointSpacing;
            const y = height - padding - (value / maxValue) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 绘制标签
        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        labels.forEach((label, i) => {
            const x = padding + i * pointSpacing;
            ctx.fillText(label, x, height - padding + 20);
        });
    }

    // ========== 管理员订单管理 ==========
    function switchOrderTab(tab) {
        currentOrderTab = tab;

        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('order-' + tab).classList.add('active');

        renderAdminOrders();
    }

    function renderAdminOrders() {
        const allOrders = getAllOrders();
        const filteredOrders = allOrders.filter(order => order.status === currentOrderTab);

        const ordersList = document.getElementById('admin-orders-list');

        if (filteredOrders.length === 0) {
            ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无订单</div>';
            return;
        }

        ordersList.innerHTML = filteredOrders.map(order => {
            const date = new Date(order.createTime);
            const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            const itemsHtml = order.items.map(item => `
                <div class="admin-order-item-row">
                    <span>${item.name} x${item.quantity}</span>
                    <span>¥${item.price * item.quantity}</span>
                </div>
            `).join('');

            const remarkHtml = order.remark ? `<div class="admin-order-remark">备注：${order.remark}</div>` : '';

            return `
                <div class="admin-order-item">
                    <div class="admin-order-header">
                        <div class="checkbox ${order.selected ? 'checked' : ''}" onclick="toggleOrderSelect('${order.id}')">
                            <span class="checkmark" style="display:${order.selected ? 'block' : 'none'}">✓</span>
                        </div>
                        <div class="admin-order-id">${order.id}</div>
                        <div class="admin-order-pickup">${order.pickupCode}</div>
                    </div>
                    <div class="admin-order-items">
                        ${itemsHtml}
                    </div>
                    <div class="admin-order-time">${timeStr}</div>
                    ${remarkHtml}
                </div>
            `;
        }).join('');
    }

    window.toggleOrderSelect = function(orderId) {
        let allOrders = getAllOrders();
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            order.selected = !order.selected;
            saveAllOrders(allOrders);
            renderAdminOrders();
        }
    };

    function completeSelectedOrders() {
        const allOrders = getAllOrders();
        const selectedIds = allOrders.filter(o => o.selected).map(o => o.id);
        
        if (selectedIds.length === 0) {
            alert('请先选择订单');
            return;
        }

        updateOrderStatus(selectedIds, 'completed');
        
        // 清除选中状态
        let orders = getAllOrders();
        orders = orders.map(o => ({ ...o, selected: false }));
        saveAllOrders(orders);

        renderAdminOrders();
    }

    function deleteSelectedOrders() {
        const allOrders = getAllOrders();
        const selectedIds = allOrders.filter(o => o.selected).map(o => o.id);
        
        if (selectedIds.length === 0) {
            alert('请先选择订单');
            return;
        }

        if (confirm('确定删除选中的订单吗？')) {
            deleteOrders(selectedIds);
            renderAdminOrders();
        }
    }

    // ========== 管理员菜品管理 ==========
    function renderAdminDishes() {
        const dishes = getDishes();
        const dishesList = document.getElementById('admin-dishes-list');

        dishesList.innerHTML = dishes.map(dish => `
            <div class="admin-dish-item">
                <img class="admin-dish-image" src="${dish.image}" alt="${dish.name}">
                <div class="admin-dish-info">
                    <div class="admin-dish-name">${dish.name}</div>
                    <div class="admin-dish-price">¥${dish.price}</div>
                </div>
                <div class="admin-dish-actions">
                    <div class="admin-dish-btn edit" onclick="editDish(${dish.id})">编辑</div>
                    <div class="admin-dish-btn delete" onclick="deleteDish(${dish.id})">删除</div>
                </div>
            </div>
        `).join('');
    }

    window.editDish = function(dishId) {
        const dishes = getDishes();
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return;

        editingDishId = dishId;
        document.getElementById('dish-modal-title').textContent = '编辑宝贝';
        document.getElementById('dish-name').value = dish.name;
        document.getElementById('dish-price').value = dish.price;
        document.getElementById('dish-category').value = dish.category;
        document.getElementById('dish-modal').style.display = 'flex';
    };

    window.deleteDish = function(dishId) {
        if (confirm('确定删除这个宝贝吗？')) {
            let dishes = getDishes();
            dishes = dishes.filter(d => d.id !== dishId);
            saveDishes(dishes);
            renderAdminDishes();
            renderMenu();
        }
    };

    function showAddDishModal() {
        editingDishId = null;
        document.getElementById('dish-modal-title').textContent = '添加宝贝';
        document.getElementById('dish-name').value = '';
        document.getElementById('dish-price').value = '';
        document.getElementById('dish-category').value = '打抛饭系列';
        document.getElementById('dish-modal').style.display = 'flex';
    }

    function hideDishModal() {
        document.getElementById('dish-modal').style.display = 'none';
    }

    function saveDish() {
        const name = document.getElementById('dish-name').value.trim();
        const price = parseFloat(document.getElementById('dish-price').value);
        const category = document.getElementById('dish-category').value;

        if (!name || isNaN(price)) {
            alert('请填写完整信息');
            return;
        }

        let dishes = getDishes();

        if (editingDishId) {
            // 编辑
            const index = dishes.findIndex(d => d.id === editingDishId);
            if (index !== -1) {
                dishes[index] = {
                    ...dishes[index],
                    name,
                    price,
                    category
                };
            }
        } else {
            // 添加
            const maxId = dishes.length > 0 ? Math.max(...dishes.map(d => d.id)) : 0;
            dishes.push({
                id: maxId + 1,
                name,
                price,
                category,
                image: 'images/dish1-泰式煎蛋饭.jpg' // 默认图片
            });
        }

        saveDishes(dishes);
        hideDishModal();
        renderAdminDishes();
        renderMenu();
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        // 底部导航栏
        document.querySelectorAll('.tab-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo(item.dataset.page);
            });
        });

        // 购物车去结算
        document.getElementById('go-to-cart').addEventListener('click', () => {
            if (cart.length > 0) {
                navigateTo('cart');
            }
        });

        // 提交订单
        document.getElementById('submit-order').addEventListener('click', () => {
            if (cart.length === 0) {
                alert('购物车为空');
                return;
            }
            const order = createOrder('');
            document.getElementById('success-pickup-code').textContent = order.pickupCode;
            navigateTo('success');
        });

        // 复制微信号
        document.getElementById('copy-wechat').addEventListener('click', () => {
            navigator.clipboard.writeText('shoudao100bufantan').then(() => {
                alert('微信号已复制');
            }).catch(() => {
                alert('复制成功');
            });
        });

        // 拨打电话
        document.getElementById('call-phone').addEventListener('click', () => {
            window.location.href = 'tel:13644327493';
        });

        // 管理员登录
        document.getElementById('admin-login-btn').addEventListener('click', () => {
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            const rememberMe = document.getElementById('remember-me').checked;

            if (username === 'admin' && password === '123456') {
                if (rememberMe) {
                    setStorage('adminLoggedIn', {
                        loggedIn: true,
                        loginTime: Date.now(),
                        expireDays: 30
                    });
                }
                navigateTo('admin');
            } else {
                alert('账号或密码错误');
            }
        });

        // 管理员Tab切换
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchAdminTab(tab.dataset.tab);
            });
        });

        // 统计日/月切换
        document.getElementById('stats-daily').addEventListener('click', () => {
            statsMode = 'daily';
            document.getElementById('stats-daily').classList.add('active');
            document.getElementById('stats-monthly').classList.remove('active');
            renderStats();
        });

        document.getElementById('stats-monthly').addEventListener('click', () => {
            statsMode = 'monthly';
            document.getElementById('stats-monthly').classList.add('active');
            document.getElementById('stats-daily').classList.remove('active');
            renderStats();
        });

        // 订单Tab切换
        document.getElementById('order-pending').addEventListener('click', () => {
            switchOrderTab('pending');
        });

        document.getElementById('order-completed').addEventListener('click', () => {
            switchOrderTab('completed');
        });

        // 订单操作按钮
        document.getElementById('complete-orders').addEventListener('click', completeSelectedOrders);
        document.getElementById('delete-orders').addEventListener('click', deleteSelectedOrders);

        // 添加菜品
        document.getElementById('add-dish-btn').addEventListener('click', showAddDishModal);
        document.getElementById('cancel-dish').addEventListener('click', hideDishModal);
        document.getElementById('save-dish').addEventListener('click', saveDish);
    }

    // ========== 初始化 ==========
    function init() {
        initData();
        bindEvents();
        navigateTo('menu');
    }

    // 暴露全局函数
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;

    // 启动
    document.addEventListener('DOMContentLoaded', init);
})();
