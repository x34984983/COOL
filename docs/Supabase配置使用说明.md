# 泰巷打抛饭 - Supabase云端同步版配置说明

## 📋 目录
1. [注册Supabase账号](#1-注册supabase账号)
2. [创建新项目](#2-创建新项目)
3. [创建数据库表](#3-创建数据库表)
4. [配置RLS行级安全策略](#4-配置rls行级安全策略)
5. [获取API配置](#5-获取api配置)
6. [替换代码中的配置](#6-替换代码中的配置)
7. [部署网站](#7-部署网站)

---

## 1. 注册Supabase账号

### 步骤1：访问Supabase官网
打开浏览器访问：https://supabase.com

### 步骤2：注册账号
1. 点击右上角 "Start your project"
2. 使用 GitHub 账号登录（推荐）
3. 或使用邮箱注册

---

## 2. 创建新项目

### 步骤1：新建项目
1. 登录后进入 Dashboard
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: `thai-food-ordering`（或自定义名称）
   - **Database Password**: 设置一个强密码（请保存好）
   - **Region**: 选择离你最近的区域（推荐：Southeast Asia (Singapore)）
   - **Pricing Plan**: Free（免费版足够使用）

### 步骤2：等待项目创建
创建过程约需2分钟，请耐心等待。

---

## 3. 创建数据库表

### 方法一：使用SQL编辑器（推荐）
1. 左侧菜单 → SQL Editor → New query
2. 复制粘贴 `create_tables.sql` 文件中的全部SQL语句
3. 点击 "Run" 执行

### 方法二：手动创建表

#### 表1：orders（订单表）
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| id | uuid | uuid_generate_v4() | 主键 |
| order_id | text | - | 订单编号 |
| pickup_code | text | - | 取餐号 |
| items | jsonb | - | 菜品明细 |
| total_price | numeric | - | 总价 |
| status | text | 'pending' | 状态：pending/completed |
| remark | text | - | 备注 |
| created_at | timestamptz | now() | 创建时间 |

#### 表2：dishes（菜品表）
| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| id | uuid | uuid_generate_v4() | 主键 |
| name | text | - | 菜品名称 |
| price | numeric | - | 价格 |
| category | text | - | 分类 |
| image | text | - | 图片URL |
| created_at | timestamptz | now() | 创建时间 |

---

## 4. 配置RLS行级安全策略

### 启用RLS（必须！）
1. 左侧菜单 → Table Editor
2. 选择 `orders` 表 → 右侧 "No active RLS policies" → Enable RLS
3. 选择 `dishes` 表 → 同样启用RLS

### 创建策略（允许所有操作）
在SQL Editor中执行：

```sql
-- orders表策略
CREATE POLICY "Allow all operations on orders" 
ON orders FOR ALL USING (true) WITH CHECK (true);

-- dishes表策略
CREATE POLICY "Allow all operations on dishes" 
ON dishes FOR ALL USING (true) WITH CHECK (true);
```

> ⚠️ **注意**：生产环境建议配置更严格的策略，这里为了简化使用开放全部权限。

---

## 5. 获取API配置

### 步骤1：获取 Project URL 和 Anon Key
1. 左侧菜单 → Settings → API
2. 复制以下信息：
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......`

### 步骤2：保存配置信息
```
SUPABASE_URL = https://你的项目ID.supabase.co
SUPABASE_ANON_KEY = 你的anon_key
```

---

## 6. 替换代码中的配置

### 编辑 index.html
打开 `index.html` 文件，找到约第300行的配置区域：

```javascript
// ==========================================
// 🎯 Supabase 配置 - 用户请替换为自己的配置
// ==========================================
const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',           // ← 替换为你的 Supabase URL
    key: 'your-anon-key-here'                          // ← 替换为你的 Supabase Anon Key
};
```

### 替换示例：
```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijklmnopqrst.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk0MzIwMDAsImV4cCI6MjAzNTAwODAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};
```

---

## 7. 部署网站

### 方式一：GitHub Pages（免费）
1. 将代码上传到 GitHub 仓库
2. 仓库 Settings → Pages
3. Source: Deploy from a branch
4. Branch: main / root
5. 点击 Save

### 方式二：Vercel（推荐，免费）
1. 访问 https://vercel.com
2. Import Git 仓库
3. 一键部署

### 方式三：任何静态网站托管
- Netlify
- Cloudflare Pages
- 自己的服务器

---

## ✅ 验证配置是否成功

1. 打开部署后的网站
2. 顶部状态栏应该显示：🟢 云端同步中
3. 如果显示 🔴 离线模式，请检查：
   - URL 和 Key 是否正确
   - 数据库表是否创建
   - RLS是否启用并配置策略
   - 网络连接是否正常

---

## 📊 功能说明

### 云端同步功能
- ✅ 所有订单自动同步到云端数据库
- ✅ 多设备实时同步（管理员后台每5秒自动刷新）
- ✅ 顾客扫码下单 → 厨师平板立即看到
- ✅ 厨师标记完成 → 顾客端立即更新状态

### 降级方案
- 如果网络断开或Supabase连接失败
- 自动降级使用本地 localStorage
- 网站始终可用，不影响营业

---

## ❓ 常见问题

### Q: 免费版有什么限制？
A: Supabase免费版包含：
- 500MB数据库空间
- 每月5GB带宽
- 足够小型餐饮使用

### Q: 如何导入默认菜品？
A: 首次运行会自动创建11个默认菜品，也可以在管理员后台手动添加。

### Q: 取餐号会重复吗？
A: 不会。取餐号按天统计，每天从001开始递增。

### Q: 可以多台设备同时使用吗？
A: 可以！这就是云端同步版的核心优势。所有设备实时同步数据。

---

## 📞 技术支持
如有配置问题，请参考 Supabase 官方文档：https://supabase.com/docs
