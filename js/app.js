// 主应用逻辑
(function() {
    'use strict';

    // ==================== 状态管理 ====================
    const state = {
        userId: null,
        userData: null,
        records: [],
        settings: {
            height: null,
            targetWeight: null,
            targetDays: 60,
            weeklyCount: 4,
            minDuration: 30,
            weeklyDuration: 150
        },
        streak: {
            current: 0,
            longest: 0,
            lastDate: null
        },
        chartPeriod: 7,
        weightChart: null,
        exerciseChart: null
    };

    // ==================== 工具函数 ====================
    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDisplayDate(dateStr) {
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[d.getDay()];
        return `${month}月${day}日 周${weekDay}`;
    }

    function getToday() {
        return formatDate(new Date());
    }

    function getWeekStart() {
        const now = new Date();
        const day = now.getDay() || 7;
        now.setDate(now.getDate() - day + 1);
        return formatDate(now);
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // ==================== Firebase 数据操作 ====================
    async function saveUserData(data) {
        if (!state.userId) return;
        try {
            await db.collection('users').doc(state.userId).set(data, { merge: true });
        } catch (error) {
            console.error('保存数据失败:', error);
            showToast('保存失败，请检查网络');
        }
    }

    async function loadUserData() {
        if (!state.userId) return;
        try {
            const doc = await db.collection('users').doc(state.userId).get();
            if (doc.exists) {
                state.userData = doc.data();
                state.settings = { ...state.settings, ...state.userData.settings };
                state.streak = { ...state.streak, ...state.userData.streak };
                
                // 加载记录
                const recordsSnapshot = await db.collection('users').doc(state.userId)
                    .collection('records').orderBy('date', 'desc').get();
                state.records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    async function saveRecord(record) {
        if (!state.userId) return;
        try {
            const docRef = await db.collection('users').doc(state.userId)
                .collection('records').add(record);
            record.id = docRef.id;
            state.records.unshift(record);
        } catch (error) {
            console.error('保存记录失败:', error);
            throw error;
        }
    }

    // ==================== 页面切换 ====================
    window.showPage = function(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navMap = {
            'dashboard-page': 0,
            'history-page': 1,
            'analysis-page': 2,
            'settings-page': 3
        };
        const navItems = document.querySelectorAll('.nav-item');
        if (navMap[pageId] !== undefined) {
            navItems[navMap[pageId]].classList.add('active');
        }

        // 页面特定初始化
        if (pageId === 'history-page') {
            renderHistory();
        } else if (pageId === 'analysis-page') {
            renderAnalysis();
        } else if (pageId === 'settings-page') {
            renderSettings();
        }
    };

    // ==================== Dashboard 初始化 ====================
    async function initDashboard() {
        updateProgress();
        updateStreak();
        updateTodayStatus();
        updateWeekStats();
        initWeightChart();
    }

    function updateProgress() {
        const currentWeight = getCurrentWeight();
        const targetWeight = state.settings.targetWeight;
        const initialWeight = state.userData?.initialWeight || currentWeight;

        if (!currentWeight || !targetWeight) return;

        const totalToLose = initialWeight - targetWeight;
        const lost = initialWeight - currentWeight;
        const progress = Math.min(100, Math.max(0, (lost / totalToLose) * 100));
        const remain = Math.max(0, currentWeight - targetWeight);

        document.getElementById('current-weight').textContent = currentWeight.toFixed(1);
        document.getElementById('target-weight').textContent = targetWeight.toFixed(1);
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = progress.toFixed(0) + '%';
        document.getElementById('weight-lost').textContent = `已减 ${(lost > 0 ? lost : 0).toFixed(1)} kg`;
        document.getElementById('weight-remain').textContent = `还差 ${remain.toFixed(1)} kg`;
    }

    function getCurrentWeight() {
        for (const record of state.records) {
            if (record.weight) return record.weight;
        }
        return state.userData?.initialWeight || null;
    }

    function updateStreak() {
        const today = getToday();
        const streak = state.streak;

        document.getElementById('streak-count').textContent = streak.current;
        document.getElementById('longest-streak').textContent = streak.longest + '天';

        // 计算本月打卡率
        const now = new Date();
        const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const monthRecords = state.records.filter(r => r.date >= monthStart);
        const daysInMonth = now.getDate();
        const rate = Math.round((monthRecords.length / daysInMonth) * 100);
        document.getElementById('monthly-rate').textContent = rate + '%';

        // 更新激励文案
        const message = getStreakMessage(streak.current, today === streak.lastDate);
        document.getElementById('streak-message').textContent = message;
    }

    function getStreakMessage(streak, isTodayChecked) {
        if (!isTodayChecked) {
            if (streak === 0) return '开始你的打卡之旅吧！';
            return '今天还没打卡，连续记录会中断哦！';
        }

        if (streak < 3) return '加油，坚持就是胜利！';
        if (streak < 7) return '太棒了，习惯正在养成！';
        if (streak < 14) return '厉害，已经坚持一周多了！';
        if (streak < 30) return '了不起，你已超过80%的人！';
        return '超级厉害，习惯已经养成！🎉';
    }

    function updateTodayStatus() {
        const today = getToday();
        const todayRecord = state.records.find(r => r.date === today);
        const statusEl = document.getElementById('today-status');
        const checkinBtn = document.getElementById('checkin-btn');

        if (todayRecord) {
            statusEl.className = 'today-status checked';
            statusEl.innerHTML = `
                <span class="status-icon">✅</span>
                <span class="status-text">今日已打卡</span>
            `;
            checkinBtn.classList.add('disabled');
            checkinBtn.onclick = null;
        } else {
            statusEl.className = 'today-status unchecked';
            statusEl.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span class="status-text">今天还没打卡哦</span>
            `;
            checkinBtn.classList.remove('disabled');
            checkinBtn.onclick = showCheckinModal;
        }
    }

    function updateWeekStats() {
        const weekStart = getWeekStart();
        const weekRecords = state.records.filter(r => r.date >= weekStart);
        
        let totalDuration = 0;
        weekRecords.forEach(record => {
            if (record.exercises) {
                record.exercises.forEach(ex => {
                    totalDuration += ex.duration || 0;
                });
            }
        });

        document.getElementById('week-count').textContent = weekRecords.length;
        document.getElementById('week-duration').textContent = totalDuration;
    }

    // ==================== 图表 ====================
    function initWeightChart() {
        const ctx = document.getElementById('weight-chart').getContext('2d');
        const chartEmpty = document.getElementById('chart-empty');
        
        // 获取最近N天的数据
        const period = state.chartPeriod;
        const weightData = [];
        const labels = [];
        
        for (let i = period - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            labels.push(date.getDate() + '日');
            
            const record = state.records.find(r => r.date === dateStr);
            weightData.push(record?.weight || null);
        }

        // 检查是否有数据
        const hasData = weightData.some(w => w !== null);
        if (!hasData) {
            chartEmpty.classList.add('show');
            return;
        }
        chartEmpty.classList.remove('show');

        if (state.weightChart) {
            state.weightChart.destroy();
        }

        state.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '体重 (kg)',
                    data: weightData,
                    borderColor: '#FF6B9D',
                    backgroundColor: 'rgba(255, 107, 157, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#FF6B9D',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#888'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 182, 193, 0.3)'
                        },
                        ticks: {
                            color: '#888'
                        }
                    }
                }
            }
        });
    }

    window.switchChartPeriod = function(days) {
        state.chartPeriod = days;
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        initWeightChart();
    };

    // ==================== 打卡功能 ====================
    window.showCheckinModal = function() {
        document.getElementById('checkin-modal').classList.add('show');
        // 重置表单
        document.getElementById('checkin-weight').value = '';
        document.getElementById('checkin-waist').value = '';
        document.getElementById('checkin-hip').value = '';
        document.getElementById('checkin-note').value = '';
        // 重置运动列表
        const exerciseList = document.getElementById('exercise-list');
        exerciseList.innerHTML = `
            <div class="exercise-item">
                <div class="exercise-type">
                    <select class="exercise-category" onchange="updateExerciseType(this)">
                        <option value="">选择类型</option>
                        <option value="游泳">🏊‍♀️ 游泳</option>
                        <option value="私教课">👩‍🏫 私教课</option>
                        <option value="健身房">🏋️‍♀️ 健身房</option>
                        <option value="居家运动">🏠 居家运动</option>
                        <option value="其他">📌 其他</option>
                    </select>
                    <input type="text" class="exercise-detail" placeholder="具体项目（可选）">
                </div>
                <div class="exercise-duration">
                    <input type="number" class="duration-input" placeholder="时长" min="1" max="480">
                    <span class="duration-unit">分钟</span>
                </div>
                <div class="exercise-intensity">
                    <select class="intensity-select">
                        <option value="low">轻度</option>
                        <option value="medium" selected>中等</option>
                        <option value="high">高强度</option>
                    </select>
                </div>
            </div>
        `;
    };

    window.hideCheckinModal = function() {
        document.getElementById('checkin-modal').classList.remove('show');
    };

    window.updateExerciseType = function(select) {
        // 可以在这里添加类型相关的逻辑
    };

    window.addExerciseItem = function() {
        const exerciseList = document.getElementById('exercise-list');
        const newItem = document.createElement('div');
        newItem.className = 'exercise-item';
        newItem.innerHTML = `
            <div class="exercise-type">
                <select class="exercise-category" onchange="updateExerciseType(this)">
                    <option value="">选择类型</option>
                    <option value="游泳">🏊‍♀️ 游泳</option>
                    <option value="私教课">👩‍🏫 私教课</option>
                    <option value="健身房">🏋️‍♀️ 健身房</option>
                    <option value="居家运动">🏠 居家运动</option>
                    <option value="其他">📌 其他</option>
                </select>
                <input type="text" class="exercise-detail" placeholder="具体项目（可选）">
            </div>
            <div class="exercise-duration">
                <input type="number" class="duration-input" placeholder="时长" min="1" max="480">
                <span class="duration-unit">分钟</span>
            </div>
            <div class="exercise-intensity">
                <select class="intensity-select">
                    <option value="low">轻度</option>
                    <option value="medium" selected>中等</option>
                    <option value="high">高强度</option>
                </select>
            </div>
            <button class="btn-remove-exercise" onclick="removeExerciseItem(this)" style="width:100%;margin-top:8px;padding:8px;background:#fff;border:1px solid #FFB6C1;border-radius:8px;color:#FF6B9D;cursor:pointer;">删除此项</button>
        `;
        exerciseList.appendChild(newItem);
    };

    window.removeExerciseItem = function(btn) {
        const items = document.querySelectorAll('.exercise-item');
        if (items.length > 1) {
            btn.parentElement.remove();
        } else {
            showToast('至少需要一条运动记录');
        }
    };

    window.submitCheckin = async function() {
        // 收集运动数据
        const exerciseItems = document.querySelectorAll('.exercise-item');
        const exercises = [];
        
        exerciseItems.forEach(item => {
            const category = item.querySelector('.exercise-category').value;
            const detail = item.querySelector('.exercise-detail').value.trim();
            const duration = parseInt(item.querySelector('.duration-input').value);
            const intensity = item.querySelector('.intensity-select').value;

            if (category && duration) {
                exercises.push({
                    category,
                    detail: detail || null,
                    duration,
                    intensity
                });
            }
        });

        // 验证：必须有运动记录
        if (exercises.length === 0) {
            showToast('请至少添加一条运动记录');
            return;
        }

        // 收集身体数据
        const weight = parseFloat(document.getElementById('checkin-weight').value) || null;
        const waist = parseFloat(document.getElementById('checkin-waist').value) || null;
        const hip = parseFloat(document.getElementById('checkin-hip').value) || null;
        const note = document.getElementById('checkin-note').value.trim() || null;

        // 创建记录
        const record = {
            date: getToday(),
            weight,
            waist,
            hip,
            exercises,
            note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await saveRecord(record);

            // 更新连续打卡
            await updateStreakAfterCheckin();

            hideCheckinModal();
            showToast('打卡成功！🎉');

            // 刷新页面
            await initDashboard();

            // 检查里程碑
            checkMilestones();

        } catch (error) {
            showToast('打卡失败，请重试');
        }
    };

    async function updateStreakAfterCheckin() {
        const today = getToday();
        const yesterday = formatDate(new Date(Date.now() - 86400000));
        
        if (state.streak.lastDate === yesterday) {
            // 连续打卡
            state.streak.current++;
        } else if (state.streak.lastDate !== today) {
            // 中断了，重新开始
            state.streak.current = 1;
        }
        
        state.streak.lastDate = today;
        state.streak.longest = Math.max(state.streak.longest, state.streak.current);

        await saveUserData({ streak: state.streak });
    }

    // ==================== 里程碑庆祝 ====================
    function checkMilestones() {
        const streak = state.streak.current;
        const initialWeight = state.userData?.initialWeight;
        const currentWeight = getCurrentWeight();
        const weightLost = initialWeight && currentWeight ? initialWeight - currentWeight : 0;

        // 连续打卡里程碑
        const streakMilestones = [7, 14, 30, 60, 100];
        const streakMilestone = streakMilestones.find(m => streak === m);
        
        // 减重里程碑
        const weightMilestones = [1, 3, 5, 10];
        const weightMilestone = weightMilestones.find(m => weightLost >= m && 
            !state.userData?.achievedWeightMilestones?.includes(m));

        if (streakMilestone) {
            showMilestone('🎉', `连续打卡 ${streakMilestone} 天！`, '太厉害了，继续保持！');
            // 记录已达成
            saveUserData({ 
                achievedStreakMilestones: firebase.firestore.FieldValue.arrayUnion(streakMilestone) 
            });
        } else if (weightMilestone) {
            showMilestone('🏆', `成功减重 ${weightMilestone} kg！`, '你的努力有了回报！');
            saveUserData({ 
                achievedWeightMilestones: firebase.firestore.FieldValue.arrayUnion(weightMilestone) 
            });
        }
    }

    function showMilestone(icon, title, message) {
        document.getElementById('milestone-icon').textContent = icon;
        document.getElementById('milestone-title').textContent = title;
        document.getElementById('milestone-message').textContent = message;
        document.getElementById('milestone-modal').classList.add('show');
    }

    window.hideMilestoneModal = function() {
        document.getElementById('milestone-modal').classList.remove('show');
    };

    // ==================== 历史记录 ====================
    function renderHistory() {
        const historyList = document.getElementById('history-list');
        const emptyState = document.getElementById('history-empty');

        if (state.records.length === 0) {
            historyList.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        historyList.innerHTML = state.records.map(record => {
            const exerciseTags = record.exercises?.map(ex => 
                `<span class="exercise-tag">${ex.category} ${ex.duration}分钟</span>`
            ).join('') || '';

            const weightInfo = record.weight ? 
                `<div class="history-weight">体重: ${record.weight} kg</div>` : '';

            const noteInfo = record.note ? 
                `<div class="history-note">"${record.note}"</div>` : '';

            return `
                <div class="history-item">
                    <div class="history-date">${formatDisplayDate(record.date)}</div>
                    ${weightInfo}
                    <div class="history-exercises">${exerciseTags}</div>
                    ${noteInfo}
                </div>
            `;
        }).join('');
    }

    // ==================== 分析页面 ====================
    function renderAnalysis() {
        renderExerciseChart();
        renderTypeStats();
        renderWeekSummary();
    }

    function renderExerciseChart() {
        const ctx = document.getElementById('exercise-chart').getContext('2d');
        
        // 获取最近14天的运动时长
        const labels = [];
        const durationData = [];
        
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            labels.push(date.getDate() + '日');
            
            const record = state.records.find(r => r.date === dateStr);
            let totalDuration = 0;
            if (record?.exercises) {
                record.exercises.forEach(ex => {
                    totalDuration += ex.duration || 0;
                });
            }
            durationData.push(totalDuration);
        }

        if (state.exerciseChart) {
            state.exerciseChart.destroy();
        }

        state.exerciseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '运动时长 (分钟)',
                    data: durationData,
                    backgroundColor: 'rgba(255, 107, 157, 0.6)',
                    borderColor: '#FF6B9D',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#888'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 182, 193, 0.3)'
                        },
                        ticks: {
                            color: '#888'
                        }
                    }
                }
            }
        });
    }

    function renderTypeStats() {
        const typeStats = {};
        state.records.forEach(record => {
            if (record.exercises) {
                record.exercises.forEach(ex => {
                    if (!typeStats[ex.category]) {
                        typeStats[ex.category] = 0;
                    }
                    typeStats[ex.category]++;
                });
            }
        });

        const sortedTypes = Object.entries(typeStats)
            .sort((a, b) => b[1] - a[1]);
        
        const maxCount = sortedTypes[0]?.[1] || 1;

        const container = document.getElementById('type-stats');
        if (sortedTypes.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">暂无数据</div>';
            return;
        }

        container.innerHTML = sortedTypes.map(([type, count]) => `
            <div class="type-stat-item">
                <span class="type-stat-label">${type}</span>
                <div class="type-stat-bar">
                    <div class="type-stat-fill" style="width: ${(count / maxCount) * 100}%"></div>
                </div>
                <span class="type-stat-count">${count}次</span>
            </div>
        `).join('');
    }

    function renderWeekSummary() {
        const weekStart = getWeekStart();
        const weekRecords = state.records.filter(r => r.date >= weekStart);
        
        let totalDuration = 0;
        const types = new Set();
        
        weekRecords.forEach(record => {
            if (record.exercises) {
                record.exercises.forEach(ex => {
                    totalDuration += ex.duration || 0;
                    types.add(ex.category);
                });
            }
        });

        const initialWeight = state.userData?.initialWeight;
        const firstWeight = weekRecords[weekRecords.length - 1]?.weight;
        const lastWeight = weekRecords[0]?.weight;
        const weightChange = (firstWeight && lastWeight) ? (lastWeight - firstWeight) : 0;

        const summary = `
            本周运动 <strong>${weekRecords.length} 次</strong>，
            总时长 <strong>${totalDuration} 分钟</strong>，
            运动类型包括 <strong>${[...types].join('、') || '无'}</strong>。
            ${weightChange !== 0 ? `体重${weightChange > 0 ? '增加' : '减少'} <strong>${Math.abs(weightChange).toFixed(1)} kg</strong>。` : '暂无体重变化数据。'}
            ${weekRecords.length >= state.settings.weeklyCount ? '本周目标已达成！🎉' : `还差 ${state.settings.weeklyCount - weekRecords.length} 次达成周目标。`}
        `;

        document.getElementById('week-summary').innerHTML = summary;
    }

    // ==================== 设置页面 ====================
    function renderSettings() {
        document.getElementById('settings-height').value = state.settings.height || '';
        document.getElementById('settings-current-weight').value = getCurrentWeight() || '';
        document.getElementById('settings-waist').value = state.userData?.currentWaist || '';
        document.getElementById('settings-hip').value = state.userData?.currentHip || '';
        document.getElementById('settings-target-weight').value = state.settings.targetWeight || '';
        document.getElementById('settings-target-days').value = state.settings.targetDays || 60;
        document.getElementById('settings-weekly-count').value = state.settings.weeklyCount || 4;
        document.getElementById('settings-min-duration').value = state.settings.minDuration || 30;
        document.getElementById('settings-weekly-duration').value = state.settings.weeklyDuration || 150;
    }

    window.saveSettings = async function() {
        const targetWeight = parseFloat(document.getElementById('settings-target-weight').value);
        const targetDays = parseInt(document.getElementById('settings-target-days').value);

        if (!targetWeight || !targetDays) {
            showToast('请填写完整');
            return;
        }

        state.settings.targetWeight = targetWeight;
        state.settings.targetDays = targetDays;

        await saveUserData({ settings: state.settings });
        showToast('设置已保存');
        await initDashboard();
    };

    window.saveBehaviorGoals = async function() {
        state.settings.weeklyCount = parseInt(document.getElementById('settings-weekly-count').value) || 4;
        state.settings.minDuration = parseInt(document.getElementById('settings-min-duration').value) || 30;
        state.settings.weeklyDuration = parseInt(document.getElementById('settings-weekly-duration').value) || 150;

        await saveUserData({ settings: state.settings });
        showToast('目标已保存');
    };

    window.saveBasicInfo = async function() {
        const height = parseFloat(document.getElementById('settings-height').value);
        const currentWeight = parseFloat(document.getElementById('settings-current-weight').value);
        const waist = parseFloat(document.getElementById('settings-waist').value) || null;
        const hip = parseFloat(document.getElementById('settings-hip').value) || null;

        if (!height) {
            showToast('请填写身高');
            return;
        }

        state.settings.height = height;
        
        // 如果填写了当前体重，更新初始体重
        const updateData = { settings: state.settings };
        if (currentWeight) {
            if (!state.userData?.initialWeight) {
                // 第一次设置，作为初始体重
                updateData.initialWeight = currentWeight;
                updateData.initialDate = getToday();
            }
            // 更新当前围度
            if (waist) updateData.currentWaist = waist;
            if (hip) updateData.currentHip = hip;
        }

        await saveUserData(updateData);
        showToast('信息已保存');
        await initDashboard();
    };

    // ==================== 数据导出导入 ====================
    window.exportData = function(format) {
        const data = {
            settings: state.settings,
            userData: state.userData,
            records: state.records,
            streak: state.streak,
            exportDate: new Date().toISOString()
        };

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = `fitness-data-${getToday()}.json`;
            mimeType = 'application/json';
        } else {
            // CSV 格式
            const headers = ['日期', '体重(kg)', '腰围(cm)', '臀围(cm)', '运动类型', '运动时长(分钟)', '运动强度', '备注'];
            const rows = state.records.map(r => {
                const exercises = r.exercises?.map(e => `${e.category}${e.detail ? '(' + e.detail + ')' : ''}`).join('; ') || '';
                const durations = r.exercises?.map(e => e.duration).join('; ') || '';
                const intensities = r.exercises?.map(e => e.intensity).join('; ') || '';
                return [r.date, r.weight || '', r.waist || '', r.hip || '', exercises, durations, intensities, r.note || ''];
            });
            
            content = [headers, ...rows].map(row => row.join(',')).join('\n');
            filename = `fitness-data-${getToday()}.csv`;
            mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        showToast('导出成功');
    };

    window.importData = async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.settings) {
                state.settings = { ...state.settings, ...data.settings };
            }
            if (data.userData) {
                state.userData = { ...state.userData, ...data.userData };
            }
            if (data.streak) {
                state.streak = { ...state.streak, ...data.streak };
            }

            // 导入记录
            if (data.records && data.records.length > 0) {
                for (const record of data.records) {
                    if (!record.id) {
                        await saveRecord(record);
                    }
                }
            }

            await saveUserData({
                settings: state.settings,
                streak: state.streak
            });

            showToast('导入成功');
            await initDashboard();

        } catch (error) {
            console.error('导入失败:', error);
            showToast('导入失败，请检查文件格式');
        }

        // 清空文件选择
        event.target.value = '';
    };

    // ==================== 应用初始化 ====================
    async function initApp() {
        try {
            // 尝试从 localStorage 获取已保存的 userId
            let savedUserId = localStorage.getItem('fitness_tracker_user_id');
            
            if (savedUserId) {
                // 使用已保存的 userId
                state.userId = savedUserId;
            } else {
                // 匿名登录获取新的 userId
                await firebaseAuth.signInAnonymously();
                state.userId = firebaseAuth.getUserId();
                // 保存到 localStorage
                localStorage.setItem('fitness_tracker_user_id', state.userId);
            }

            // 加载用户数据
            await loadUserData();

            // 直接进入主页，不再显示初始化页面
            showPage('dashboard-page');
            await initDashboard();
        } catch (error) {
            console.error('初始化失败:', error);
            showToast('初始化失败，请刷新页面');
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();
