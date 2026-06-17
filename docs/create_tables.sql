-- ==========================================
-- 泰巷打抛饭 - Supabase 数据库建表SQL
-- ==========================================

-- 启用uuid扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. 创建订单表 orders
-- ==========================================
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT,
    pickup_code TEXT,
    items JSONB,
    total_price NUMERIC,
    status TEXT DEFAULT 'pending', -- pending:待完成, completed:已完成
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. 创建菜品表 dishes
-- ==========================================
CREATE TABLE dishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT,
    price NUMERIC,
    category TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. 插入默认菜品数据（11个）
-- ==========================================
INSERT INTO dishes (name, price, category, image) VALUES
('泰式煎蛋饭', 12, '打抛饭系列', './images/dish1-taishijiandanfan.jpg'),
('猪肉打抛饭', 19, '打抛饭系列', './images/dish2-zhuroudapaofan.jpg'),
('鸡肉打抛饭', 18, '打抛饭系列', './images/dish3-jiroudapaofan.jpg'),
('牛肉打抛饭', 28, '打抛饭系列', './images/dish4-niuroudapaofan.jpg'),
('鲜虾猪肉打抛饭', 32, '打抛饭系列', './images/dish5-xianxiazhuroudapaofan.jpg'),
('泰式醉鬼炒面', 22, '打抛饭系列', './images/dish6-taishizuiguichaomian.jpg'),
('加无菌蛋', 2, '打抛饭系列', './images/dish7-jiawujundan.jpg'),
('泰式酸辣拌粉丝', 28, '凉拌系列', './images/dish8-taishisuanlabanfensi.jpg'),
('菠萝芒果脆脆虾', 26, '凉拌系列', './images/dish9-boluomangguocuicuixia.jpg'),
('凉拌荷包蛋', 18, '凉拌系列', './images/dish10-liangbanhebaodan.jpg'),
('泰式奶茶', 12, '饮品系列', './images/dish11-taishinaicha.jpg');

-- ==========================================
-- 4. 启用RLS行级安全
-- ==========================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. 创建RLS策略（开放所有权限，便于使用）
-- ==========================================
-- orders表策略
CREATE POLICY "Allow all operations on orders" 
ON orders FOR ALL USING (true) WITH CHECK (true);

-- dishes表策略
CREATE POLICY "Allow all operations on dishes" 
ON dishes FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 执行完成！
-- ==========================================
-- 接下来请在 index.html 中替换你的 Supabase URL 和 Anon Key
-- ==========================================
