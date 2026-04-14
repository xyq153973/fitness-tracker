// Firebase 配置文件
var firebaseConfig = {
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
var db = firebase.firestore();
var auth = firebase.auth();

// iOS Safari 可能不支持 enablePersistence，跳过它

// 使用匿名登录
function signInAnonymously() {
    return auth.signInAnonymously().then(function(userCredential) {
        return userCredential.user;
    });
}

// 获取当前用户
function getCurrentUser() {
    return auth.currentUser;
}

// 获取用户 ID
function getUserId() {
    var user = auth.currentUser;
    return user ? user.uid : null;
}

// 导出
window.firebaseAuth = {
    signInAnonymously: signInAnonymously,
    getCurrentUser: getCurrentUser,
    getUserId: getUserId
};

window.db = db;
