# 瘦身打卡日记 - 部署指南

一个可爱的个人减肥运动记录网站，支持云同步，移动端友好。

## 功能特性

- 连续打卡系统（不允许补打卡，最强约束）
- 目标进度追踪
- 体重趋势图表
- 运动时长统计
- 里程碑庆祝动画
- 数据导出（JSON/CSV）
- 云同步（Firebase）

## 部署步骤

### 第一步：创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击「添加项目」
3. 输入项目名称（如：fitness-tracker）
4. 按照向导完成创建（可以关闭 Google Analytics）

### 第二步：配置 Firestore 数据库

1. 在 Firebase 控制台左侧菜单中，点击「Firestore Database」
2. 点击「创建数据库」
3. 选择「以测试模式启动」（方便开发，后续可以设置安全规则）
4. 选择离你最近的区域，点击「启用」

### 第三步：启用匿名登录

1. 在左侧菜单中，点击「Authentication」
2. 点击「开始使用」
3. 在「Sign-in method」标签页中，找到「匿名」
4. 点击启用，然后保存

### 第四步：获取 Firebase 配置信息

1. 点击左上角的齿轮图标 ⚙️ → 「项目设置」
2. 滚动到「您的应用」部分
3. 点击「添加应用」→ 选择「Web (</>)」
4. 输入应用昵称（如：fitness-tracker-web）
5. 复制显示的配置信息，类似：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 第五步：更新项目配置

1. 打开 `js/firebase-config.js` 文件
2. 将 `firebaseConfig` 对象中的值替换为你刚才复制的配置

```javascript
const firebaseConfig = {
    apiKey: "你的_API_KEY",
    authDomain: "你的项目ID.firebaseapp.com",
    projectId: "你的项目ID",
    storageBucket: "你的项目ID.appspot.com",
    messagingSenderId: "你的发送者ID",
    appId: "你的应用ID"
};
```

### 第六步：部署到 GitHub Pages

1. 在 GitHub 上创建一个新仓库（如：fitness-tracker）

2. 初始化 Git 并推送代码：

```bash
cd fitness-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/fitness-tracker.git
git push -u origin main
```

3. 启用 GitHub Pages：
   - 进入仓库的「Settings」
   - 左侧菜单找到「Pages」
   - Source 选择「Deploy from a branch」
   - Branch 选择「main」，文件夹选择「/ (root)」
   - 点击「Save」

4. 等待几分钟后，访问 `https://你的用户名.github.io/fitness-tracker/` 即可使用

## 使用说明

### 首次使用

1. 打开网站后，填写基础信息（身高、当前体重、腰围、臀围）
2. 设置目标（目标体重、计划天数）
3. 点击「开始我的蜕变之旅」

### 每日打卡

1. 点击首页的「今日打卡」按钮
2. **必须**添加至少一条运动记录：
   - 选择运动类型（游泳、私教课、健身房、居家运动、其他）
   - 可选填写具体项目
   - 填写运动时长
   - 选择运动强度
3. 可选填写体重、腰围、臀围
4. 可选填写备注
5. 点击「完成打卡」

### 注意事项

- **不允许补打卡**：当天必须完成打卡，否则连续记录会中断
- **运动记录必填**：至少需要一条运动记录才能完成打卡
- **体重可选**：如果当天没有称体重，可以不填

## 文件结构

```
fitness-tracker/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── firebase-config.js  # Firebase 配置
│   └── app.js          # 主应用逻辑
└── README.md           # 说明文档
```

## 技术栈

- 纯前端实现（HTML + CSS + JavaScript）
- Firebase Firestore（数据存储）
- Firebase Auth（匿名登录）
- Chart.js（图表展示）
- 部署在 GitHub Pages

## 数据安全

- 使用 Firebase 匿名登录，无需注册账号
- 数据存储在 Firebase Firestore，自动云同步
- 支持导出 JSON/CSV 备份

## 自定义修改

### 修改颜色主题

编辑 `css/style.css` 文件顶部的 CSS 变量：

```css
:root {
    --primary-color: #FF6B9D;      /* 主色调 */
    --primary-light: #FFB6C1;      /* 浅色调 */
    --primary-dark: #E91E63;       /* 深色调 */
    --bg-color: #FFF5F8;           /* 背景色 */
    /* ... */
}
```

### 添加运动类型

编辑 `index.html` 文件中的运动类型下拉选项：

```html
<select class="exercise-category">
    <option value="">选择类型</option>
    <option value="游泳">🏊‍♀️ 游泳</option>
    <option value="私教课">👩‍🏫 私教课</option>
    <option value="健身房">🏋️‍♀️ 健身房</option>
    <option value="居家运动">🏠 居家运动</option>
    <option value="其他">📌 其他</option>
    <!-- 在这里添加新类型 -->
</select>
```

## 常见问题

### Q: 数据会丢失吗？
A: 数据存储在 Firebase 云端，不会丢失。但建议定期导出备份。

### Q: 换手机后数据还在吗？
A: 是的，数据会自动同步。但注意：Firebase 使用匿名登录，如果清除浏览器数据，可能会生成新的用户 ID。建议保存好导出的备份文件。

### Q: 如何查看历史数据？
A: 点击底部导航的「记录」页面，可以看到所有打卡记录。

### Q: 连续打卡断了怎么办？
A: 本系统设计为最强约束模式，不允许补打卡。这是为了激励每天坚持运动。断了就重新开始计数，加油！

## License

MIT License - 自由使用和修改
