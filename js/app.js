// 主应用逻辑 - ES5 兼容版本
(function() {
    'use strict';

    // ==================== 状态管理 ====================
    var state = {
        userId: null,
        userData: null,
        records: [],
        nickname: '小可爱',
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

    // ==================== 搞怪风每日一句 ====================
    var dailyQuotes = [
        '再不运动，肉肉就要占领地球了！',
        '你的马甲线正在角落里默默哭泣...',
        '脂肪说：今天又没运动，我安心了～',
        '动起来！别让脂肪太嚣张！',
        '每运动一分钟，就离女神近一步！',
        '躺平很舒服，但瘦下来更爽！',
        '今天不动，明天肉痛！',
        '你的自律，是脂肪最大的敌人！',
        '运动一时累，不运动一直胖，选吧！',
        '脂肪：你不动，我就长！哼～',
        '今天的汗水，是明天的笑容！',
        '别找借口了，脂肪不会等你准备好！',
        '运动是最好的医美，省钱又有效！',
        '你的坚持，会让脂肪绝望！',
        '每次想放弃时，想想镜子里瘦下来的自己！'
    ];

    function getDailyQuote() {
        var today = getToday();
        var parts = today.split('-');
        var sum = 0;
        for (var i = 0; i < parts.length; i++) {
            sum += parseInt(parts[i]);
        }
        return dailyQuotes[sum % dailyQuotes.length];
    }

    // ==================== 工具函数 ====================
    function formatDate(date) {
        var d = new Date(date);
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        return year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    }

    function formatDisplayDate(dateStr) {
        var d = new Date(dateStr);
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        return month + '月' + day + '日 周' + weekDays[d.getDay()];
    }

    function getToday() {
        return formatDate(new Date());
    }

    function getWeekStart() {
        var now = new Date();
        var day = now.getDay() || 7;
        now.setDate(now.getDate() - day + 1);
        return formatDate(now);
    }

    function showToast(message) {
        var toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(function() {
            toast.classList.remove('show');
        }, 2500);
    }

    // ==================== 本地缓存 ====================
    var CACHE_KEY = 'fitness_tracker_cache';
    
    function saveToCache() {
        try {
            var cacheData = {
                nickname: state.nickname,
                settings: state.settings,
                streak: state.streak,
                userData: state.userData,
                records: state.records.slice(0, 100),
                cacheTime: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {}
    }
    
    function loadFromCache() {
        try {
            var cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                var data = JSON.parse(cached);
                state.nickname = data.nickname || '小可爱';
                if (data.settings) {
                    for (var key in data.settings) {
                        state.settings[key] = data.settings[key];
                    }
                }
                if (data.streak) {
                    for (var key in data.streak) {
                        state.streak[key] = data.streak[key];
                    }
                }
                state.userData = data.userData || null;
                state.records = data.records || [];
                return true;
            }
        } catch (e) {}
        return false;
    }

    // ==================== Firebase 数据操作 ====================
    function saveUserData(data) {
        if (!state.userId) return;
        db.collection('users').doc(state.userId).set(data, { merge: true }).then(function() {
            saveToCache();
        }).catch(function(error) {
            console.error('保存数据失败:', error);
            showToast('保存失败，请检查网络');
        });
    }

    function loadUserData(callback) {
        if (!state.userId) {
            callback(false);
            return;
        }
        db.collection('users').doc(state.userId).get().then(function(doc) {
            if (doc.exists) {
                state.userData = doc.data();
                if (state.userData.settings) {
                    for (var key in state.userData.settings) {
                        state.settings[key] = state.userData.settings[key];
                    }
                }
                if (state.userData.streak) {
                    for (var key in state.userData.streak) {
                        state.streak[key] = state.userData.streak[key];
                    }
                }
                state.nickname = state.userData.nickname || '小可爱';
                
                // 加载记录
                db.collection('users').doc(state.userId)
                    .collection('records').orderBy('date', 'desc').limit(100).get()
                    .then(function(snapshot) {
                        state.records = [];
                        snapshot.forEach(function(doc) {
                            var record = doc.data();
                            record.id = doc.id;
                            state.records.push(record);
                        });
                        saveToCache();
                        callback(true);
                    }).catch(function() {
                        callback(false);
                    });
            } else {
                callback(true);
            }
        }).catch(function(error) {
            console.error('加载数据失败:', error);
            callback(false);
        });
    }

    // ==================== 页面切换 ====================
    window.showPage = function(pageId) {
        var pages = document.querySelectorAll('.page');
        for (var i = 0; i < pages.length; i++) {
            pages[i].classList.remove('active');
        }
        document.getElementById(pageId).classList.add('active');

        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.remove('active');
        }
        var navMap = {
            'dashboard-page': 0,
            'history-page': 1,
            'analysis-page': 2,
            'settings-page': 3
        };
        if (navMap[pageId] !== undefined) {
            navItems[navMap[pageId]].classList.add('active');
        }

        if (pageId === 'history-page') {
            renderHistory();
        } else if (pageId === 'analysis-page') {
            renderAnalysis();
        } else if (pageId === 'settings-page') {
            renderSettings();
        }
    };

    // ==================== Dashboard 初始化 ====================
    function initDashboard() {
        updatePageTitle();
        updateDailyQuote();
        updateProgress();
        updateStreak();
        updateTodayStatus();
        updateWeekStats();
        initWeightChart();
    }

    function updatePageTitle() {
        var name = state.nickname;
        document.getElementById('page-title').textContent = name + ' 的瘦身日记';
        document.getElementById('header-title').textContent = name + ' 的瘦身日记';
    }

    function updateDailyQuote() {
        document.getElementById('quote-text').textContent = getDailyQuote();
    }

    function updateProgress() {
        var currentWeight = getCurrentWeight();
        var targetWeight = state.settings.targetWeight;
        var initialWeight = (state.userData && state.userData.initialWeight) || currentWeight;

        if (!currentWeight || !targetWeight) return;

        var totalToLose = initialWeight - targetWeight;
        var lost = initialWeight - currentWeight;
        var progress = Math.min(100, Math.max(0, (lost / totalToLose) * 100));
        var remain = Math.max(0, currentWeight - targetWeight);

        document.getElementById('current-weight').textContent = currentWeight.toFixed(1);
        document.getElementById('target-weight').textContent = targetWeight.toFixed(1);
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = progress.toFixed(0) + '%';
        document.getElementById('weight-lost').textContent = '已减 ' + (lost > 0 ? lost : 0).toFixed(1) + ' kg';
        document.getElementById('weight-remain').textContent = '还差 ' + remain.toFixed(1) + ' kg';
    }

    function getCurrentWeight() {
        for (var i = 0; i < state.records.length; i++) {
            if (state.records[i].weight) return state.records[i].weight;
        }
        return (state.userData && state.userData.initialWeight) || null;
    }

    function updateStreak() {
        var today = getToday();
        var streak = state.streak;

        document.getElementById('streak-count').textContent = streak.current;
        document.getElementById('longest-streak').textContent = streak.longest + '天';

        var now = new Date();
        var monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        var monthRecords = [];
        for (var i = 0; i < state.records.length; i++) {
            if (state.records[i].date >= monthStart) {
                monthRecords.push(state.records[i]);
            }
        }
        var daysInMonth = now.getDate();
        var rate = Math.round((monthRecords.length / daysInMonth) * 100);
        document.getElementById('monthly-rate').textContent = rate + '%';

        var message = getStreakMessage(streak.current, today === streak.lastDate);
        document.getElementById('streak-message').textContent = message;
    }

    function getStreakMessage(streak, isTodayChecked) {
        var name = state.nickname;
        if (!isTodayChecked) {
            if (streak === 0) return name + '，开始你的打卡之旅吧！别让脂肪太嚣张！';
            return name + '，今天还没打卡，脂肪正在偷笑呢！';
        }
        if (streak < 3) return name + '，坚持住！脂肪已经开始慌了！';
        if (streak < 7) return name + '，太棒了！脂肪正在瑟瑟发抖！';
        if (streak < 14) return name + '，厉害了！脂肪已经打包准备跑路了！';
        if (streak < 30) return name + '，你已超过80%的人！脂肪彻底绝望！';
        return name + '，你是自律王者！脂肪已经放弃抵抗！';
    }

    function updateTodayStatus() {
        var today = getToday();
        var todayRecords = [];
        for (var i = 0; i < state.records.length; i++) {
            if (state.records[i].date === today) {
                todayRecords.push(state.records[i]);
            }
        }
        var statusEl = document.getElementById('today-status');
        var checkinBtn = document.getElementById('checkin-btn');
        var name = state.nickname;

        var totalDuration = 0;
        var exerciseCount = 0;
        var exerciseTypes = [];
        
        for (var i = 0; i < todayRecords.length; i++) {
            var record = todayRecords[i];
            if (record.exercises) {
                for (var j = 0; j < record.exercises.length; j++) {
                    var ex = record.exercises[j];
                    totalDuration += ex.duration || 0;
                    exerciseCount++;
                    if (ex.category && exerciseTypes.indexOf(ex.category) === -1) {
                        exerciseTypes.push(ex.category);
                    }
                }
            }
        }

        if (todayRecords.length > 0) {
            statusEl.className = 'today-status checked';
            var message = '';
            if (todayRecords.length === 1) {
                message = name + ' 今天动了，脂肪很受伤！';
            } else {
                message = name + ' 今天动了 ' + todayRecords.length + ' 次，脂肪已崩溃！';
            }
            var detail = '';
            if (exerciseCount > 0) {
                detail = '运动 ' + exerciseCount + ' 项，共 ' + totalDuration + ' 分钟';
                if (exerciseTypes.length > 0) {
                    detail += ' (' + exerciseTypes.join('、') + ')';
                }
            }
            statusEl.innerHTML = '<span class="status-icon">✅</span><span class="status-text">' + message + '</span><div class="today-detail">' + detail + '</div>';
        } else {
            statusEl.className = 'today-status unchecked';
            statusEl.innerHTML = '<span class="status-icon">⚠️</span><span class="status-text">' + name + '，今天还没动，脂肪在偷笑！</span>';
        }
        
        checkinBtn.classList.remove('disabled');
        checkinBtn.onclick = showCheckinModal;
    }

    function updateWeekStats() {
        var weekStart = getWeekStart();
        var weekRecords = [];
        for (var i = 0; i < state.records.length; i++) {
            if (state.records[i].date >= weekStart) {
                weekRecords.push(state.records[i]);
            }
        }
        
        var totalDuration = 0;
        for (var i = 0; i < weekRecords.length; i++) {
            var record = weekRecords[i];
            if (record.exercises) {
                for (var j = 0; j < record.exercises.length; j++) {
                    totalDuration += record.exercises[j].duration || 0;
                }
            }
        }

        document.getElementById('week-count').textContent = weekRecords.length;
        document.getElementById('week-duration').textContent = totalDuration;
    }

    // ==================== 图表 ====================
    function initWeightChart() {
        var ctx = document.getElementById('weight-chart').getContext('2d');
        var chartEmpty = document.getElementById('chart-empty');
        
        var period = state.chartPeriod;
        var weightData = [];
        var labels = [];
        
        for (var i = period - 1; i >= 0; i--) {
            var date = new Date();
            date.setDate(date.getDate() - i);
            var dateStr = formatDate(date);
            labels.push(date.getDate() + '日');
            
            var record = null;
            for (var j = 0; j < state.records.length; j++) {
                if (state.records[j].date === dateStr) {
                    record = state.records[j];
                    break;
                }
            }
            weightData.push(record && record.weight ? record.weight : null);
        }

        var hasData = false;
        for (var i = 0; i < weightData.length; i++) {
            if (weightData[i] !== null) {
                hasData = true;
                break;
            }
        }
        
        if (!hasData) {
            chartEmpty.classList.add('show');
            chartEmpty.innerHTML = '<span class="empty-icon">📈</span><span class="empty-text">' + state.nickname + '，打卡后就能看到趋势啦～</span>';
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
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#888' } },
                    y: { grid: { color: 'rgba(255, 182, 193, 0.3)' }, ticks: { color: '#888' } }
                }
            }
        });
    }

    window.switchChartPeriod = function(days) {
        state.chartPeriod = days;
        var tabs = document.querySelectorAll('.chart-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
        }
        event.target.classList.add('active');
        initWeightChart();
    };

    // ==================== 打卡功能 ====================
    window.showCheckinModal = function() {
        document.getElementById('checkin-modal').classList.add('show');
        document.getElementById('checkin-weight').value = '';
        document.getElementById('checkin-waist').value = '';
        document.getElementById('checkin-hip').value = '';
        document.getElementById('checkin-note').value = '';
        document.getElementById('exercise-list').innerHTML = '<div class="exercise-item"><div class="exercise-type"><select class="exercise-category"><option value="">选择类型</option><option value="游泳">游泳</option><option value="私教课">私教课</option><option value="健身房">健身房</option><option value="居家运动">居家运动</option><option value="其他">其他</option></select><input type="text" class="exercise-detail" placeholder="具体项目（可选）"></div><div class="exercise-duration"><input type="number" class="duration-input" placeholder="时长" min="1" max="480"><span class="duration-unit">分钟</span></div><div class="exercise-intensity"><select class="intensity-select"><option value="low">轻度</option><option value="medium" selected>中等</option><option value="high">高强度</option></select></div></div>';
    };

    window.hideCheckinModal = function() {
        document.getElementById('checkin-modal').classList.remove('show');
    };

    window.addExerciseItem = function() {
        var exerciseList = document.getElementById('exercise-list');
        var newItem = document.createElement('div');
        newItem.className = 'exercise-item';
        newItem.innerHTML = '<div class="exercise-type"><select class="exercise-category"><option value="">选择类型</option><option value="游泳">游泳</option><option value="私教课">私教课</option><option value="健身房">健身房</option><option value="居家运动">居家运动</option><option value="其他">其他</option></select><input type="text" class="exercise-detail" placeholder="具体项目（可选）"></div><div class="exercise-duration"><input type="number" class="duration-input" placeholder="时长" min="1" max="480"><span class="duration-unit">分钟</span></div><div class="exercise-intensity"><select class="intensity-select"><option value="low">轻度</option><option value="medium" selected>中等</option><option value="high">高强度</option></select></div><button class="btn-remove-exercise" onclick="removeExerciseItem(this)" style="width:100%;margin-top:8px;padding:8px;background:#fff;border:1px solid #FFB6C1;border-radius:8px;color:#FF6B9D;cursor:pointer;">删除此项</button>';
        exerciseList.appendChild(newItem);
    };

    window.removeExerciseItem = function(btn) {
        var items = document.querySelectorAll('.exercise-item');
        if (items.length > 1) {
            btn.parentElement.remove();
        } else {
            showToast('至少需要一条运动记录');
        }
    };

    window.submitCheckin = function() {
        var exerciseItems = document.querySelectorAll('.exercise-item');
        var exercises = [];
        
        for (var i = 0; i < exerciseItems.length; i++) {
            var item = exerciseItems[i];
            var category = item.querySelector('.exercise-category').value;
            var detail = item.querySelector('.exercise-detail').value.trim();
            var duration = parseInt(item.querySelector('.duration-input').value);
            var intensity = item.querySelector('.intensity-select').value;

            if (category && duration) {
                exercises.push({
                    category: category,
                    detail: detail || null,
                    duration: duration,
                    intensity: intensity
                });
            }
        }

        if (exercises.length === 0) {
            showToast('请至少添加一条运动记录');
            return;
        }

        var weight = parseFloat(document.getElementById('checkin-weight').value) || null;
        var waist = parseFloat(document.getElementById('checkin-waist').value) || null;
        var hip = parseFloat(document.getElementById('checkin-hip').value) || null;
        var note = document.getElementById('checkin-note').value.trim() || null;

        var record = {
            date: getToday(),
            weight: weight,
            waist: waist,
            hip: hip,
            exercises: exercises,
            note: note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('users').doc(state.userId).collection('records').add(record).then(function(docRef) {
            record.id = docRef.id;
            state.records.unshift(record);
            saveToCache();
            
            updateStreakAfterCheckin();
            hideCheckinModal();
            
            var messages = [
                state.nickname + ' 又变美了一点点！',
                state.nickname + ' 真的超级自律！',
                '太棒了！' + state.nickname + ' 离目标更近了！',
                state.nickname + '，脂肪正在瑟瑟发抖！'
            ];
            showToast(messages[Math.floor(Math.random() * messages.length)]);
            
            initDashboard();
            checkMilestones();
        }).catch(function(error) {
            showToast('打卡失败，请重试');
        });
    };

    function updateStreakAfterCheckin() {
        var today = getToday();
        var yesterday = formatDate(new Date(Date.now() - 86400000));
        
        if (state.streak.lastDate === today) return;
        
        if (state.streak.lastDate === yesterday) {
            state.streak.current++;
        } else {
            state.streak.current = 1;
        }
        
        state.streak.lastDate = today;
        state.streak.longest = Math.max(state.streak.longest, state.streak.current);
        saveUserData({ streak: state.streak });
    }

    function checkMilestones() {
        var streak = state.streak.current;
        var initialWeight = state.userData && state.userData.initialWeight;
        var currentWeight = getCurrentWeight();
        var weightLost = initialWeight && currentWeight ? initialWeight - currentWeight : 0;
        var name = state.nickname;

        var streakMilestones = [7, 14, 30, 60, 100];
        var streakMilestone = null;
        for (var i = 0; i < streakMilestones.length; i++) {
            if (streak === streakMilestones[i]) {
                streakMilestone = streakMilestones[i];
                break;
            }
        }
        
        var weightMilestones = [1, 3, 5, 10];
        var weightMilestone = null;
        var achievedWeight = state.userData && state.userData.achievedWeightMilestones ? state.userData.achievedWeightMilestones : [];
        for (var i = 0; i < weightMilestones.length; i++) {
            if (weightLost >= weightMilestones[i] && achievedWeight.indexOf(weightMilestones[i]) === -1) {
                weightMilestone = weightMilestones[i];
                break;
            }
        }

        if (streakMilestone) {
            var messages = {
                7: { title: name + ' 太厉害了！', msg: '连续打卡 7 天！脂肪已经开始害怕你了！' },
                14: { title: name + ' 真的很强！', msg: '连续打卡 14 天！脂肪正在打包跑路！' },
                30: { title: name + ' 是自律王者！', msg: '连续打卡 30 天！习惯已经刻进 DNA 了！' },
                60: { title: name + ' 简直无敌！', msg: '连续打卡 60 天！脂肪已经放弃抵抗！' },
                100: { title: name + ' 是传说！', msg: '连续打卡 100 天！你就是健身界的神话！' }
            };
            showMilestone('🎉', messages[streakMilestone].title, messages[streakMilestone].msg);
            saveUserData({ achievedStreakMilestones: firebase.firestore.FieldValue.arrayUnion(streakMilestone) });
        } else if (weightMilestone) {
            var messages = {
                1: { title: name + ' 初战告捷！', msg: '成功减重 1kg！脂肪开始慌了！' },
                3: { title: name + ' 越来越美了！', msg: '成功减重 3kg！镜子里的你不一样了！' },
                5: { title: name + ' 蜕变成功！', msg: '成功减重 5kg！你简直是励志典范！' },
                10: { title: name + ' 是女神！', msg: '成功减重 10kg！你就是行走的励志书！' }
            };
            showMilestone('🏆', messages[weightMilestone].title, messages[weightMilestone].msg);
            saveUserData({ achievedWeightMilestones: firebase.firestore.FieldValue.arrayUnion(weightMilestone) });
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
        var historyList = document.getElementById('history-list');
        var emptyState = document.getElementById('history-empty');

        if (state.records.length === 0) {
            historyList.innerHTML = '';
            emptyState.classList.add('show');
            emptyState.innerHTML = '<span class="empty-icon">📝</span><span class="empty-text">' + state.nickname + ' 还没有打卡记录，开始第一次吧！</span>';
            return;
        }

        emptyState.classList.remove('show');
        var html = '';
        for (var i = 0; i < state.records.length; i++) {
            var record = state.records[i];
            var exerciseTags = '';
            if (record.exercises) {
                for (var j = 0; j < record.exercises.length; j++) {
                    var ex = record.exercises[j];
                    exerciseTags += '<span class="exercise-tag">' + ex.category + ' ' + ex.duration + '分钟</span>';
                }
            }
            var weightInfo = record.weight ? '<div class="history-weight">体重: ' + record.weight + ' kg</div>' : '';
            var noteInfo = record.note ? '<div class="history-note">"' + record.note + '"</div>' : '';
            html += '<div class="history-item"><div class="history-date">' + formatDisplayDate(record.date) + '</div>' + weightInfo + '<div class="history-exercises">' + exerciseTags + '</div>' + noteInfo + '</div>';
        }
        historyList.innerHTML = html;
    }

    // ==================== 分析页面 ====================
    function renderAnalysis() {
        renderExerciseChart();
        renderTypeStats();
        renderWeekSummary();
    }

    function renderExerciseChart() {
        var ctx = document.getElementById('exercise-chart').getContext('2d');
        var labels = [];
        var durationData = [];
        
        for (var i = 13; i >= 0; i--) {
            var date = new Date();
            date.setDate(date.getDate() - i);
            var dateStr = formatDate(date);
            labels.push(date.getDate() + '日');
            
            var record = null;
            for (var j = 0; j < state.records.length; j++) {
                if (state.records[j].date === dateStr) {
                    record = state.records[j];
                    break;
                }
            }
            var totalDuration = 0;
            if (record && record.exercises) {
                for (var k = 0; k < record.exercises.length; k++) {
                    totalDuration += record.exercises[k].duration || 0;
                }
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
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#888' } },
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 182, 193, 0.3)' }, ticks: { color: '#888' } }
                }
            }
        });
    }

    function renderTypeStats() {
        var typeStats = {};
        for (var i = 0; i < state.records.length; i++) {
            var record = state.records[i];
            if (record.exercises) {
                for (var j = 0; j < record.exercises.length; j++) {
                    var ex = record.exercises[j];
                    if (!typeStats[ex.category]) {
                        typeStats[ex.category] = 0;
                    }
                    typeStats[ex.category]++;
                }
            }
        }

        var sortedTypes = [];
        for (var type in typeStats) {
            sortedTypes.push([type, typeStats[type]]);
        }
        sortedTypes.sort(function(a, b) { return b[1] - a[1]; });
        
        var maxCount = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;

        var container = document.getElementById('type-stats');
        if (sortedTypes.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">暂无数据</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < sortedTypes.length; i++) {
            var type = sortedTypes[i][0];
            var count = sortedTypes[i][1];
            html += '<div class="type-stat-item"><span class="type-stat-label">' + type + '</span><div class="type-stat-bar"><div class="type-stat-fill" style="width: ' + (count / maxCount * 100) + '%"></div></div><span class="type-stat-count">' + count + '次</span></div>';
        }
        container.innerHTML = html;
    }

    function renderWeekSummary() {
        var weekStart = getWeekStart();
        var weekRecords = [];
        for (var i = 0; i < state.records.length; i++) {
            if (state.records[i].date >= weekStart) {
                weekRecords.push(state.records[i]);
            }
        }
        
        var totalDuration = 0;
        var types = [];
        for (var i = 0; i < weekRecords.length; i++) {
            var record = weekRecords[i];
            if (record.exercises) {
                for (var j = 0; j < record.exercises.length; j++) {
                    totalDuration += record.exercises[j].duration || 0;
                    if (types.indexOf(record.exercises[j].category) === -1) {
                        types.push(record.exercises[j].category);
                    }
                }
            }
        }

        var initialWeight = state.userData && state.userData.initialWeight;
        var firstWeight = weekRecords.length > 0 ? weekRecords[weekRecords.length - 1].weight : null;
        var lastWeight = weekRecords.length > 0 ? weekRecords[0].weight : null;
        var weightChange = (firstWeight && lastWeight) ? (lastWeight - firstWeight) : 0;

        var summary = '本周运动 <strong>' + weekRecords.length + ' 次</strong>，总时长 <strong>' + totalDuration + ' 分钟</strong>，运动类型包括 <strong>' + (types.length > 0 ? types.join('、') : '无') + '</strong>。';
        if (weightChange !== 0) {
            summary += '体重' + (weightChange > 0 ? '增加' : '减少') + ' <strong>' + Math.abs(weightChange).toFixed(1) + ' kg</strong>。';
        } else {
            summary += '暂无体重变化数据。';
        }
        if (weekRecords.length >= state.settings.weeklyCount) {
            summary += '本周目标已达成！';
        } else {
            summary += '还差 ' + (state.settings.weeklyCount - weekRecords.length) + ' 次达成周目标。';
        }

        document.getElementById('week-summary').innerHTML = summary;
    }

    // ==================== 设置页面 ====================
    function renderSettings() {
        document.getElementById('settings-nickname').value = state.nickname || '';
        document.getElementById('settings-height').value = state.settings.height || '';
        document.getElementById('settings-current-weight').value = getCurrentWeight() || '';
        document.getElementById('settings-waist').value = (state.userData && state.userData.currentWaist) || '';
        document.getElementById('settings-hip').value = (state.userData && state.userData.currentHip) || '';
        document.getElementById('settings-target-weight').value = state.settings.targetWeight || '';
        document.getElementById('settings-target-days').value = state.settings.targetDays || 60;
        document.getElementById('settings-weekly-count').value = state.settings.weeklyCount || 4;
        document.getElementById('settings-min-duration').value = state.settings.minDuration || 30;
        document.getElementById('settings-weekly-duration').value = state.settings.weeklyDuration || 150;
    }

    window.saveNickname = function() {
        var nickname = document.getElementById('settings-nickname').value.trim();
        if (!nickname) {
            showToast('请输入昵称');
            return;
        }
        state.nickname = nickname;
        saveUserData({ nickname: nickname });
        updatePageTitle();
        showToast('昵称已保存');
        initDashboard();
    };

    window.saveSettings = function() {
        var targetWeight = parseFloat(document.getElementById('settings-target-weight').value);
        var targetDays = parseInt(document.getElementById('settings-target-days').value);

        if (!targetWeight || !targetDays) {
            showToast('请填写完整');
            return;
        }

        state.settings.targetWeight = targetWeight;
        state.settings.targetDays = targetDays;
        saveUserData({ settings: state.settings });
        showToast('设置已保存');
        initDashboard();
    };

    window.saveBehaviorGoals = function() {
        state.settings.weeklyCount = parseInt(document.getElementById('settings-weekly-count').value) || 4;
        state.settings.minDuration = parseInt(document.getElementById('settings-min-duration').value) || 30;
        state.settings.weeklyDuration = parseInt(document.getElementById('settings-weekly-duration').value) || 150;
        saveUserData({ settings: state.settings });
        showToast('目标已保存');
    };

    window.saveBasicInfo = function() {
        var height = parseFloat(document.getElementById('settings-height').value);
        var currentWeight = parseFloat(document.getElementById('settings-current-weight').value);
        var waist = parseFloat(document.getElementById('settings-waist').value) || null;
        var hip = parseFloat(document.getElementById('settings-hip').value) || null;

        if (!height) {
            showToast('请填写身高');
            return;
        }

        state.settings.height = height;
        var updateData = { settings: state.settings };
        if (currentWeight) {
            if (!state.userData || !state.userData.initialWeight) {
                updateData.initialWeight = currentWeight;
                updateData.initialDate = getToday();
            }
            if (waist) updateData.currentWaist = waist;
            if (hip) updateData.currentHip = hip;
        }

        saveUserData(updateData);
        showToast('信息已保存');
        initDashboard();
    };

    // ==================== 数据导出导入 ====================
    window.exportData = function(format) {
        var data = {
            settings: state.settings,
            userData: state.userData,
            records: state.records,
            streak: state.streak,
            exportDate: new Date().toISOString()
        };

        var content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = 'fitness-data-' + getToday() + '.json';
            mimeType = 'application/json';
        } else {
            var headers = ['日期', '体重(kg)', '腰围(cm)', '臀围(cm)', '运动类型', '运动时长(分钟)', '运动强度', '备注'];
            var rows = [];
            for (var i = 0; i < state.records.length; i++) {
                var r = state.records[i];
                var exercises = '';
                var durations = '';
                var intensities = '';
                if (r.exercises) {
                    for (var j = 0; j < r.exercises.length; j++) {
                        var e = r.exercises[j];
                        exercises += (j > 0 ? '; ' : '') + e.category + (e.detail ? '(' + e.detail + ')' : '');
                        durations += (j > 0 ? '; ' : '') + e.duration;
                        intensities += (j > 0 ? '; ' : '') + e.intensity;
                    }
                }
                rows.push([r.date, r.weight || '', r.waist || '', r.hip || '', exercises, durations, intensities, r.note || '']);
            }
            content = [headers].concat(rows).map(function(row) { return row.join(','); }).join('\n');
            filename = 'fitness-data-' + getToday() + '.csv';
            mimeType = 'text/csv';
        }

        var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功');
    };

    window.importData = function(event) {
        var file = event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                if (data.settings) {
                    for (var key in data.settings) {
                        state.settings[key] = data.settings[key];
                    }
                }
                if (data.userData) {
                    state.userData = data.userData;
                }
                if (data.streak) {
                    for (var key in data.streak) {
                        state.streak[key] = data.streak[key];
                    }
                }
                if (data.records && data.records.length > 0) {
                    for (var i = 0; i < data.records.length; i++) {
                        if (!data.records[i].id) {
                            db.collection('users').doc(state.userId).collection('records').add(data.records[i]);
                        }
                    }
                }
                saveUserData({ settings: state.settings, streak: state.streak });
                showToast('导入成功');
                initDashboard();
            } catch (error) {
                showToast('导入失败，请检查文件格式');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // ==================== 应用初始化 ====================
    function initApp() {
        var loadingPage = document.getElementById('loading-page');
        var loadingText = loadingPage.querySelector('.loading-text');
        
        // 先从本地缓存加载
        var hasCache = loadFromCache();
        if (hasCache) {
            loadingText.textContent = state.nickname + ' 准备好了！';
            setTimeout(function() {
                loadingPage.classList.add('hidden');
            }, 100);
            showPage('dashboard-page');
            initDashboard();
            syncFromCloud();
            return;
        }
        
        // 没有缓存，从云端加载
        loadingText.textContent = '首次加载中...';
        initFromCloud(loadingPage, loadingText, 0);
    }
    
    function initFromCloud(loadingPage, loadingText, retryCount) {
        var MAX_RETRIES = 3;
        
        var savedUserId = localStorage.getItem('fitness_tracker_user_id');
        
        var proceed = function() {
            loadUserData(function(success) {
                if (success) {
                    loadingText.textContent = state.nickname + ' 准备好了！';
                    setTimeout(function() {
                        loadingPage.classList.add('hidden');
                    }, 100);
                    showPage('dashboard-page');
                    initDashboard();
                } else {
                    if (retryCount < MAX_RETRIES) {
                        loadingText.textContent = '加载失败，重试中... (' + (retryCount + 1) + '/' + MAX_RETRIES + ')';
                        setTimeout(function() {
                            initFromCloud(loadingPage, loadingText, retryCount + 1);
                        }, 1000);
                    } else {
                        loadingPage.classList.add('hidden');
                        showPage('dashboard-page');
                        initDashboard();
                        showToast('网络连接失败，数据将在网络恢复后同步');
                    }
                }
            });
        };
        
        if (savedUserId) {
            state.userId = savedUserId;
            proceed();
        } else {
            firebaseAuth.signInAnonymously().then(function() {
                state.userId = firebaseAuth.getUserId();
                localStorage.setItem('fitness_tracker_user_id', state.userId);
                proceed();
            }).catch(function(error) {
                if (retryCount < MAX_RETRIES) {
                    loadingText.textContent = '连接失败，重试中... (' + (retryCount + 1) + '/' + MAX_RETRIES + ')';
                    setTimeout(function() {
                        initFromCloud(loadingPage, loadingText, retryCount + 1);
                    }, 1000);
                } else {
                    loadingPage.classList.add('hidden');
                    showPage('dashboard-page');
                    initDashboard();
                    showToast('网络连接失败，请检查网络');
                }
            });
        }
    }
    
    function syncFromCloud() {
        var savedUserId = localStorage.getItem('fitness_tracker_user_id');
        
        var sync = function() {
            db.collection('users').doc(state.userId).get().then(function(doc) {
                if (doc.exists) {
                    var cloudData = doc.data();
                    state.userData = cloudData;
                    if (cloudData.settings) {
                        for (var key in cloudData.settings) {
                            state.settings[key] = cloudData.settings[key];
                        }
                    }
                    if (cloudData.streak) {
                        for (var key in cloudData.streak) {
                            state.streak[key] = cloudData.streak[key];
                        }
                    }
                    state.nickname = cloudData.nickname || '小可爱';
                    
                    db.collection('users').doc(state.userId)
                        .collection('records').orderBy('date', 'desc').limit(100).get()
                        .then(function(snapshot) {
                            state.records = [];
                            snapshot.forEach(function(doc) {
                                var record = doc.data();
                                record.id = doc.id;
                                state.records.push(record);
                            });
                            saveToCache();
                            updatePageTitle();
                            updateDailyQuote();
                            updateProgress();
                            updateStreak();
                            updateTodayStatus();
                            updateWeekStats();
                        });
                }
            }).catch(function(error) {
                console.warn('后台同步失败:', error);
            });
        };
        
        if (savedUserId) {
            state.userId = savedUserId;
            sync();
        } else {
            firebaseAuth.signInAnonymously().then(function() {
                state.userId = firebaseAuth.getUserId();
                localStorage.setItem('fitness_tracker_user_id', state.userId);
                sync();
            });
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();
