const CONFIG = {
    url: 'https://ianyjorqghznxuaplvnx.supabase.co',
    key: 'sb_publishable_I6tMpBtuOZ_PO4EsJBNXHA_MLLv0jDS',
    adminUsername: '123457',
    adminPassword: '123457'
};

let sb = null;
let isOnline = false;
let cart = [];
let currentOrderTab = 'pending';
let currentStatsTab = 'day';
let statsChart = null;
let editingDishId = null;
let selectedOrders = new Set();
let modalTempImage = '';

let userId = localStorage.getItem('userId') || 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('userId', userId);

let dishes = [
    { id: 1, name: '泰式煎蛋饭', price: 12, image: 'images/1.jpg' },
    { id: 2, name: '猪肉打抛饭', price: 19, image: 'images/2.jpg' },
    { id: 3, name: '鸡肉打抛饭', price: 18, image: 'images/3.jpg' },
    { id: 4, name: '牛肉打抛饭', price: 28, image: 'images/4.jpg' },
    { id: 5, name: '鲜虾猪肉打抛饭', price: 32, image: 'images/5.jpg' },
    { id: 6, name: '泰式醉鬼炒面', price: 22, image: 'images/6.jpg' },
    { id: 7, name: '加无菌蛋', price: 2, image: 'images/7.jpg' },
    { id: 8, name: '泰式酸辣拌粉丝', price: 28, image: 'images/8.jpg' },
    { id: 9, name: '菠萝芒果脆脆虾', price: 26, image: 'images/9.jpg' },
    { id: 10, name: '凉拌荷包蛋', price: 18, image: 'images/10.jpg' },
    { id: 11, name: '泰式奶茶', price: 12, image: 'images/11.jpg' }
];

async function init() {
    console.log('🚀 系统启动...');
    
    // ✅ 第一步：无论网络如何，先渲染本地菜品
    renderDishes();
    loadCart();
    updateCartUI();
    
    try {
        sb = window.supabase.createClient(CONFIG.url, CONFIG.key);
        isOnline = true;
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) syncStatus.classList.remove('show');
        console.log('✅ 连接成功');
        
        // 订阅实时更新
        sb.channel('orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                const adminTab = document.getElementById('admin-tab-orders');
                if (adminTab && adminTab.classList.contains('active')) {
                    loadAdminOrders();
                }
            })
            .subscribe();
        
        // 自动清理（仅在线时）
        autoCleanOldOrders();
            
    } catch (e) {
        console.log('❌ 连接失败:', e);
        isOnline = false;
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) syncStatus.classList.add('show');
    }
}

function renderDishes() {
    const container = document.getElementById('dish-list');
    container.innerHTML = dishes.map(dish => {
        const cartItem = cart.find(c => c.id === dish.id);
        const qty = cartItem ? cartItem.qty : 0;
        return `
            <div class="dish-item">
                <img src="${dish.image}" class="dish-img" alt="${dish.name}">
                <div class="dish-info">
                    <div class="dish-name">${dish.name}</div>
                    <div class="dish-price">¥${dish.price}</div>
                </div>
                <div class="dish-actions">
                    ${qty > 0 ? `<button class="qty-btn" onclick="removeFromCart(${dish.id})">-</button>` : ''}
                    ${qty > 0 ? `<div class="qty">${qty}</div>` : ''}
                    <button class="qty-btn" onclick="addToCart(${dish.id})">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    renderDishManage();
}

function renderDishManage() {
    const container = document.getElementById('dish-manage-list');
    if (!container) return;
    container.innerHTML = dishes.map(dish => `
        <div class="dish-manage-item">
            <img src="${dish.image}" class="dish-manage-img" alt="${dish.name}" data-dish-id="${dish.id}">
            <div class="dish-manage-info">
                <div class="dish-manage-name">${dish.name}</div>
                <div class="dish-manage-price">¥${dish.price}</div>
            </div>
            <div class="dish-manage-actions">
                <button class="edit-btn" onclick="openEditDishModal(${dish.id})">编辑</button>
                <button class="delete-btn" onclick="deleteDish(${dish.id})">删除</button>
            </div>
        </div>
    `).join('');
    
    // 绑定图片点击事件（100%可靠方式）
    setTimeout(() => {
        document.querySelectorAll('.dish-manage-img').forEach(img => {
            img.onclick = function() {
                const dishId = parseInt(this.dataset.dishId);
                triggerImageUpload(dishId);
            };
        });
    }, 50);
}

function triggerImageUpload(dishId) {
    // 纯JS动态创建input - 100%兼容所有浏览器
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = function() {
        const file = input.files[0];
        if (!file) {
            document.body.removeChild(input);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const dish = dishes.find(d => d.id === dishId);
            dish.image = e.target.result;
            renderDishes();
            document.body.removeChild(input);
            alert('图片已更换成功！');
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

function addToCart(dishId) {
    const dish = dishes.find(d => d.id === dishId);
    const existing = cart.find(c => c.id === dishId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id: dishId, name: dish.name, price: dish.price, image: dish.image, qty: 1 });
    }
    saveCart();
    renderDishes();
    updateCartUI();
}

function removeFromCart(dishId) {
    const existing = cart.find(c => c.id === dishId);
    if (existing) {
        existing.qty--;
        if (existing.qty <= 0) {
            cart = cart.filter(c => c.id !== dishId);
        }
    }
    saveCart();
    renderDishes();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) cart = JSON.parse(saved);
}

function updateCartUI() {
    const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const count = cart.reduce((sum, c) => sum + c.qty, 0);
    
    document.getElementById('cart-count').textContent = count;
    document.getElementById('cart-total').textContent = total.toFixed(2);
    document.getElementById('cart-total-2').textContent = total.toFixed(2);
    
    const btn = document.getElementById('checkout-btn');
    if (count > 0) {
        btn.classList.remove('disabled');
    } else {
        btn.classList.add('disabled');
    }
    
    renderCartList();
}

function renderCartList() {
    const container = document.getElementById('cart-list');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '';
        document.getElementById('cart-empty').style.display = 'block';
        document.getElementById('cart-bottom-bar').style.display = 'none';
        return;
    }
    
    document.getElementById('cart-empty').style.display = 'none';
    document.getElementById('cart-bottom-bar').style.display = 'flex';
    
    let remarkHtml = `
        <div style="padding:15px;background:#fff;border-radius:8px;margin:10px 15px;">
            <div style="font-weight:bold;margin-bottom:8px;">备注</div>
            <textarea id="order-remark" placeholder="请输入备注信息（如：少辣、不要香菜等）" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;min-height:60px;resize:none;"></textarea>
        </div>
    `;
    
    container.innerHTML = remarkHtml + cart.map(item => `
        <div class="dish-item">
            <div class="dish-info">
                <div class="dish-name">${item.name}</div>
                <div class="dish-price">¥${item.price}</div>
            </div>
            <div class="dish-actions">
                <button class="qty-btn" onclick="removeFromCart(${item.id});renderCartList();">-</button>
                <div class="qty">${item.qty}</div>
                <button class="qty-btn" onclick="addToCart(${item.id});renderCartList();">+</button>
            </div>
        </div>
    `).join('');
}

async function confirmOrder() {
    if (!isOnline) {
        alert('网络不佳，请稍后');
        return;
    }
    
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayOrders, error: queryError } = await sb
            .from('orders')
            .select('id')
            .gte('created_at', today + 'T00:00:00');
        
        if (queryError) {
            console.error('查询订单失败:', queryError);
            alert('下单失败，请重试');
            return;
        }
        
        const pickupCode = String(todayOrders.length + 1).padStart(3, '0');
        const orderNumber = 'ORD' + Date.now();
        const remarkInput = document.getElementById('order-remark');
        const remark = remarkInput ? remarkInput.value : '';
        
        const { error: insertError } = await sb.from('orders').insert({
            order_id: orderNumber,
            pickup_code: pickupCode,
            items: cart,
            total_price: total,
            status: 'pending',
            remark: remark,
            user_id: userId
        });
        
        if (insertError) {
            console.error('写入订单失败:', insertError);
            alert('下单失败：' + insertError.message);
            return;
        }
        
        console.log('✅ 订单写入成功:', orderNumber);
        
        localStorage.setItem('lastPickupCode', pickupCode);
        
        cart = [];
        saveCart();
        renderDishes();
        updateCartUI();
        
        document.getElementById('success-pickup-code').textContent = pickupCode;
        showPage('success');
        
    } catch (e) {
        console.error('下单异常:', e);
        alert('下单异常，请重试');
    }
}

async function loadMyOrders() {
    if (!isOnline) return;
    
    const { data } = await sb
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('my-orders-list');
    
    if (!data || data.length === 0) {
        container.innerHTML = '';
        document.getElementById('orders-empty').style.display = 'block';
        return;
    }
    
    document.getElementById('orders-empty').style.display = 'none';
    
    container.innerHTML = data.map(order => {
        const itemsHtml = order.items.map(i => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                <img src="${i.image}" style="width:30px;height:30px;border-radius:4px;object-fit:cover;">
                <span>${i.name}</span>
                <span style="color:#999;">x${i.qty}</span>
            </div>
        `).join('');
        
        const status = order.status === 'pending' ? '制作中' : '已完成';
        const statusColor = order.status === 'pending' ? '#f57c00' : '#4caf50';
        
        return `
            <div class="my-order-item">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;align-items:center;">
                    <div>
                        <div style="font-weight:bold;font-size:18px;">取餐号：${order.pickup_code}</div>
                        <div style="font-size:12px;color:#999;">订单号：${order.order_id || '-'}</div>
                    </div>
                    <span style="color:${statusColor};font-weight:bold;">${status}</span>
                </div>
                <div style="font-size:12px;color:#999;margin-bottom:10px;">${new Date(order.created_at).toLocaleString()}</div>
                <div style="margin-bottom:10px;">${itemsHtml}</div>
                ${order.remark ? `<div style="font-size:13px;color:#666;margin-bottom:8px;">备注：${order.remark}</div>` : ''}
                <div style="color:#e53935;font-weight:bold;font-size:16px;">合计：¥${order.total_price}</div>
            </div>
        `;
    }).join('');
}

function checkAdminLogin() {
    const loginData = localStorage.getItem('adminLogin');
    if (loginData) {
        try {
            const { expireTime } = JSON.parse(loginData);
            if (Date.now() < expireTime) {
                showPage('admin');
                return true;
            } else {
                localStorage.removeItem('adminLogin');
            }
        } catch (e) {
            localStorage.removeItem('adminLogin');
        }
    }
    return false;
}

function adminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
    if (username === CONFIG.adminUsername && password === CONFIG.adminPassword) {
        // 登录成功，自动保存30天免登录
        const expireTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('adminLogin', JSON.stringify({ expireTime }));
        showPage('admin');
        loadAdminOrders();
    } else {
        alert('账号或密码错误');
    }
}

function adminLogout() {
    localStorage.removeItem('adminLogin');
    showPage('mine');
}

async function loadAdminOrders() {
    if (!isOnline) return;
    selectedOrders.clear();
    
    const { data } = await sb
        .from('orders')
        .select('*')
        .eq('status', currentOrderTab)
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('admin-orders-list');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">暂无订单</div></div>';
        return;
    }
    
    container.innerHTML = data.map(order => {
        const itemsHtml = order.items.map(i => `
            <div style="display:flex;align-items:center;gap:8px;padding:2px 0;font-size:13px;">
                <img src="${i.image}" style="width:24px;height:24px;border-radius:3px;object-fit:cover;">
                <span>${i.name}</span>
                <span style="color:#999;">x${i.qty}</span>
            </div>
        `).join('');
        
        return `
            <div class="admin-order-item">
                <input type="checkbox" class="order-checkbox" data-id="${order.id}" onchange="toggleOrderSelection('${order.id}')">
                <div class="order-content" style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div>
                            <span style="font-size:22px;font-weight:bold;color:#2E7D32;">${order.pickup_code}号</span>
                            <span style="font-size:12px;color:#999;margin-left:10px;">${order.order_id || ''}</span>
                        </div>
                        <span style="color:#e53935;font-weight:bold;">¥${order.total_price}</span>
                    </div>
                    <div style="font-size:12px;color:#999;margin-bottom:8px;">${new Date(order.created_at).toLocaleString()}</div>
                    <div style="margin-bottom:6px;">${itemsHtml}</div>
                    ${order.remark ? `<div style="font-size:12px;color:#666;">备注：${order.remark}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function toggleOrderSelection(orderId) {
    if (selectedOrders.has(orderId)) {
        selectedOrders.delete(orderId);
    } else {
        selectedOrders.add(orderId);
    }
    updateSelectAllCheckbox();
}

function selectAllOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const selectAll = document.getElementById('select-all').checked;
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll;
        if (selectAll) {
            selectedOrders.add(cb.dataset.id);
        } else {
            selectedOrders.delete(cb.dataset.id);
        }
    });
}

function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    document.getElementById('select-all').checked = allChecked;
}

async function batchComplete() {
    if (selectedOrders.size === 0) {
        alert('请先选择订单');
        return;
    }
    if (!confirm('标记为已完成？')) return;
    
    for (const id of selectedOrders) {
        await sb.from('orders').update({ status: 'completed' }).eq('id', id);
    }
    loadAdminOrders();
}

async function batchDelete() {
    if (selectedOrders.size === 0) {
        alert('请先选择订单');
        return;
    }
    if (!confirm('确定删除选中的订单？')) return;
    
    for (const id of selectedOrders) {
        await sb.from('orders').delete().eq('id', id);
    }
    loadAdminOrders();
}

// 自动清理：只保留最近30天的已完成订单
async function autoCleanOldOrders() {
    if (!isOnline) return;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
        const { error } = await sb
            .from('orders')
            .delete()
            .eq('status', 'completed')
            .lt('created_at', thirtyDaysAgo.toISOString());
            
        if (!error) {
            console.log('✅ 自动清理完成：已删除30天前的已完成订单');
        }
    } catch (e) {
        console.log('自动清理跳过');
    }
}

// 导出订单数据为CSV文件
async function exportOrdersToCSV() {
    if (!isOnline) return;
    
    try {
        const { data } = await sb
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!data || data.length === 0) {
            alert('暂无订单数据可导出');
            return;
        }
        
        // 构建CSV内容
        let csv = '\uFEFF'; // BOM for Excel中文
        csv += '取餐号,订单号,下单时间,菜品,总价,状态,备注\n';
        
        data.forEach(order => {
            const items = order.items.map(i => `${i.name}x${i.qty}`).join('; ');
            const status = order.status === 'pending' ? '待完成' : '已完成';
            const time = new Date(order.created_at).toLocaleString();
            csv += `"${order.pickup_code}","${order.order_id || ''}","${time}","${items}",${order.total_price},"${status}","${order.remark || ''}"\n`;
        });
        
        // 下载文件
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `泰巷打抛饭-订单数据-${new Date().toLocaleDateString()}.csv`;
        link.click();
        
        alert(`✅ 导出成功！共导出 ${data.length} 条订单`);
        
    } catch (e) {
        alert('导出失败');
    }
}

// 手动清理：管理员一键清理
async function loadCleanupStats() {
    if (!isOnline) return;
    
    const { data } = await sb
        .from('orders')
        .select('*')
        .eq('status', 'completed');
    
    const count = data ? data.length : 0;
    const estimatedSize = (count * 0.5).toFixed(1);
    
    document.getElementById('total-completed-orders').textContent = count;
    document.getElementById('db-estimated-size').textContent = estimatedSize + ' KB';
}

async function cleanupOrders(days = 30) {
    if (!isOnline) return;
    
    let msg = '';
    if (days === 0) {
        msg = '确定清理【所有】已完成订单？\n\n⚠️ 此操作不可恢复！将删除全部历史数据！';
    } else {
        msg = `确定清理${days}天前的所有已完成订单？\n\n⚠️ 此操作不可恢复！`;
    }
    
    if (!confirm(msg)) return;
    
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    try {
        let query = sb.from('orders').delete().eq('status', 'completed');
        if (days > 0) {
            query = query.lt('created_at', date.toISOString());
        }
        
        const { error } = await query;
            
        if (error) {
            alert('清理失败：' + error.message);
            return;
        }
        
        alert('✅ 清理完成！');
        loadCleanupStats();
        loadStats();
        loadAdminOrders();
    } catch (e) {
        alert('清理失败');
    }
}

async function cleanOldOrders(days = 30) {
    await cleanupOrders(days);
}

// 导出订单数据为CSV文件（Excel可打开）
async function exportOrdersToCSV() {
    if (!isOnline) return;
    
    try {
        const { data } = await sb
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!data || data.length === 0) {
            alert('暂无订单数据可导出');
            return;
        }
        
        // 构建CSV内容（带BOM支持Excel中文）
        let csv = '\uFEFF';
        csv += '取餐号,订单号,下单时间,菜品明细,总价(元),状态,备注\n';
        
        data.forEach(order => {
            const items = order.items.map(i => `${i.name}×${i.qty}`).join('；');
            const status = order.status === 'pending' ? '制作中' : '已完成';
            const time = new Date(order.created_at).toLocaleString('zh-CN');
            csv += `"${order.pickup_code}","${order.order_id || ''}","${time}","${items}",${order.total_price},"${status}","${order.remark || ''}"\n`;
        });
        
        // 下载文件
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `泰巷打抛饭-订单数据-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
        link.click();
        
        alert(`✅ 导出成功！共导出 ${data.length} 条订单记录\n\n文件可用 Excel / WPS 打开`);
        
    } catch (e) {
        console.error('导出失败:', e);
        alert('导出失败，请重试');
    }
}

async function loadStats() {
    if (!isOnline) return;
    
    const { data } = await sb
        .from('orders')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });
    
    if (!data || data.length === 0) {
        document.getElementById('total-orders').textContent = '0';
        document.getElementById('total-sales').textContent = '¥0';
        return;
    }
    
    const totalOrders = data.length;
    const totalSales = data.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
    
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-sales').textContent = '¥' + totalSales.toFixed(0);
    
    let labels, salesAmounts;
    
    if (currentStatsTab === 'day') {
        const dayMap = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString();
            dayMap[dayStr] = 0;
        }
        data.forEach(o => {
            const day = new Date(o.created_at).toLocaleDateString();
            if (dayMap[day] !== undefined) {
                dayMap[day] += parseFloat(o.total_price);
            }
        });
        labels = Object.keys(dayMap);
        salesAmounts = Object.values(dayMap);
    } else if (currentStatsTab === 'month') {
        const monthMap = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            monthMap[monthStr] = 0;
        }
        data.forEach(o => {
            const d = new Date(o.created_at);
            const month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (monthMap[month] !== undefined) {
                monthMap[month] += parseFloat(o.total_price);
            }
        });
        labels = Object.keys(monthMap);
        salesAmounts = Object.values(monthMap);
    } else {
        const yearMap = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const yearStr = String(today.getFullYear() - i);
            yearMap[yearStr] = 0;
        }
        data.forEach(o => {
            const year = new Date(o.created_at).getFullYear().toString();
            if (yearMap[year] !== undefined) {
                yearMap[year] += parseFloat(o.total_price);
            }
        });
        labels = Object.keys(yearMap);
        salesAmounts = Object.values(yearMap);
    }
    
    const ctx = document.getElementById('stats-chart').getContext('2d');
    if (statsChart) statsChart.destroy();
    
    statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '销售额',
                data: salesAmounts,
                backgroundColor: 'rgba(46, 125, 50, 0.85)',
                borderColor: '#2E7D32',
                borderWidth: 0,
                borderRadius: 6,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function openAddDishModal() {
    editingDishId = null;
    modalTempImage = '';
    document.getElementById('modal-title').textContent = '添加菜品';
    document.getElementById('dish-name-input').value = '';
    document.getElementById('dish-price-input').value = '';
    updateImagePreview('');
    document.getElementById('dish-modal').classList.add('show');
}

function openEditDishModal(dishId) {
    const dish = dishes.find(d => d.id === dishId);
    editingDishId = dishId;
    modalTempImage = dish.image;
    document.getElementById('modal-title').textContent = '编辑菜品';
    document.getElementById('dish-name-input').value = dish.name;
    document.getElementById('dish-price-input').value = dish.price;
    updateImagePreview(dish.image);
    document.getElementById('dish-modal').classList.add('show');
}

function updateImagePreview(url) {
    const preview = document.getElementById('img-preview');
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="预览">`;
        preview.classList.add('has-img');
    } else {
        preview.innerHTML = '点击选择图片';
        preview.classList.remove('has-img');
    }
}

function closeDishModal() {
    document.getElementById('dish-modal').classList.remove('show');
}

function saveDish() {
    const name = document.getElementById('dish-name-input').value;
    const price = parseFloat(document.getElementById('dish-price-input').value);
    const image = modalTempImage || 'images/1.jpg';
    
    if (!name || !price) {
        alert('请填写完整信息');
        return;
    }
    
    if (editingDishId) {
        const dish = dishes.find(d => d.id === editingDishId);
        dish.name = name;
        dish.price = price;
        dish.image = image;
    } else {
        const newId = Math.max(...dishes.map(d => d.id)) + 1;
        dishes.push({ id: newId, name, price, image });
    }
    
    closeDishModal();
    renderDishes();
}

function triggerModalImageUpload() {
    document.getElementById('modal-image-file').click();
}

// 弹窗图片上传处理
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('modal-image-file');
    if (fileInput) {
        fileInput.onchange = function() {
            const file = fileInput.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                modalTempImage = e.target.result;
                const preview = document.getElementById('img-preview');
                preview.innerHTML = `<img src="${modalTempImage}" alt="预览">`;
                preview.classList.add('has-img');
            };
            reader.readAsDataURL(file);
        };
    }
});

function deleteDish(dishId) {
    if (!confirm('确定删除此菜品？')) return;
    dishes = dishes.filter(d => d.id !== dishId);
    renderDishes();
}

function switchTab(tab) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if (tab === 'menu') showPage('menu');
    if (tab === 'cart') { renderCartList(); showPage('cart'); }
    if (tab === 'chat') showPage('chat');
    if (tab === 'mine') {
        checkAndShowPickupCode();
        showPage('mine');
    }
}

// 检查并显示取餐号（只有待完成订单才显示）
async function checkAndShowPickupCode() {
    // 默认隐藏取餐号区域
    document.getElementById('pickup-section').style.display = 'none';
    document.getElementById('no-pickup-section').style.display = 'block';
    
    if (!isOnline) return;
    
    try {
        // 查询该用户是否有待完成的订单
        const { data } = await sb
            .from('orders')
            .select('pickup_code')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (data && data.length > 0) {
            // 有待完成订单，显示取餐号
            document.getElementById('pickup-section').style.display = 'block';
            document.getElementById('no-pickup-section').style.display = 'none';
            document.getElementById('mine-pickup-code').textContent = data[0].pickup_code;
        }
    } catch (e) {
        console.log('检查取餐号失败');
    }
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
}

function goToMenu() { switchTab('menu'); }
function goToCart() { if (cart.length > 0) switchTab('cart'); }
function goToMine() { showPage('mine'); }
function goToMyOrders() { showPage('myOrders'); loadMyOrders(); }
function goToAdminLogin() { if (!checkAdminLogin()) showPage('adminLogin'); }

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('admin-tab-' + tab).classList.add('active');
    
    if (tab === 'orders') loadAdminOrders();
    if (tab === 'stats') loadStats();
    if (tab === 'dishes') renderDishManage();
    if (tab === 'cleanup') loadCleanupStats();
}

async function loadCleanupStats() {
    if (!isOnline) return;
    
    const { data } = await sb
        .from('orders')
        .select('id, created_at')
        .eq('status', 'completed');
    
    const count = data ? data.length : 0;
    const estimatedSize = Math.round(count * 0.5); // 预估每条订单约0.5KB
    
    document.getElementById('total-completed-orders').textContent = count;
    document.getElementById('db-estimated-size').textContent = estimatedSize + ' KB';
}

async function cleanupOrders(days) {
    if (!isOnline) {
        alert('网络不佳，请稍后');
        return;
    }
    
    let confirmMsg = '';
    let dateFilter = null;
    
    if (days === 0) {
        confirmMsg = '确定要清理【全部已完成订单】吗？\n\n此操作不可恢复！';
    } else {
        confirmMsg = `确定要清理【${days}天前】的所有已完成订单吗？\n\n此操作不可恢复！`;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        dateFilter = cutoffDate.toISOString();
    }
    
    if (!confirm(confirmMsg)) return;
    
    try {
        let query = sb.from('orders').delete().eq('status', 'completed');
        
        if (dateFilter) {
            query = query.lt('created_at', dateFilter);
        }
        
        const { error } = await query;
        
        if (error) {
            console.error('清理失败:', error);
            alert('清理失败：' + error.message);
            return;
        }
        
        alert('✅ 清理成功！数据库空间已释放');
        loadCleanupStats();
        loadStats();
        
    } catch (e) {
        console.error('清理异常:', e);
        alert('清理异常，请重试');
    }
}

function switchOrderTab(tab) {
    currentOrderTab = tab;
    document.querySelectorAll('.order-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('order-' + tab + '-btn').classList.add('active');
    loadAdminOrders();
}

function switchStatsTab(tab) {
    currentStatsTab = tab;
    document.querySelectorAll('.stats-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('stats-' + tab + '-btn').classList.add('active');
    loadStats();
}

function copyWechat() {
    navigator.clipboard.writeText('shoudao100bufantan');
    alert('已复制');
}

function makeCall() {
    window.location.href = 'tel:13644327493';
}

window.onload = init;

