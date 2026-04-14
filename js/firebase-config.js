// Firebase 配置文件
// 请将下面的配置替换为你自己的 Firebase 项目配置

const firebaseConfig = {
    apiKey: "AIzaSyDdcaj4oIsX3oZ5h2qrrpQ1Mr5_5E2fuok",
    authDomain: "icelyn-fitness.firebaseapp.com",
    projectId: "icelyn-fitness",
    storageBucket: "icelyn-fitness.firebasestorage.app",
    messagingSenderId: "839295799381",
    appId: "1:839295799381:web:a8388f1ca0852d4ae504dc",
    measurementId: "G-TMVVWMS94Q"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 获取 Firestore 和 Auth 实例
const db = firebase.firestore();
const auth = firebase.auth();

// 尝试启用离线持久化（不阻塞初始化）
db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
    // 忽略错误，不影响正常使用
    console.log('离线持久化不可用:', err.message);
});

// 使用匿名登录
async function signInAnonymously() {
    try {
        const userCredential = await auth.signInAnonymously();
        console.log('匿名登录成功:', userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error('匿名登录失败:', error);
        throw error;
    }
}

// 获取当前用户
function getCurrentUser() {
    return auth.currentUser;
}

// 获取用户 ID
function getUserId() {
    const user = auth.currentUser;
    return user ? user.uid : null;
}

// 导出
window.firebaseAuth = {
    signInAnonymously,
    getCurrentUser,
    getUserId
};

window.db = db;
