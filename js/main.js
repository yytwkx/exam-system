/**
 * 主程序入口
 * 负责初始化系统和协调各个模块
 */

class AppManager {
    /**
     * 初始化应用
     */
    static init() {
        console.log('本地独立刷题系统初始化中...');
        
        // 初始化存储
        StorageManager.init();
        
        // 检查并初始化默认数据
        if (typeof DefaultDataManager !== 'undefined') {
            DefaultDataManager.checkAndInitDefaultData();
        }
        
        // 根据页面路径执行不同的初始化
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('index.html') || currentPath === '/') {
            // 首页初始化
            this.initHomePage();
        } else if (currentPath.includes('exam.html')) {
            // 考试页面初始化
            this.initExamPage();
        } else if (currentPath.includes('learning.html')) {
            // 学习页面初始化
            this.initLearningPage();
        } else if (currentPath.includes('random.html')) {
            // 随机刷题页面初始化
            this.initRandomPage();
        } else if (currentPath.includes('manage.html')) {
            // 管理页面初始化
            this.initManagePage();
        }
        
        // 初始化通用功能
        this.initCommonFeatures();
        
        console.log('系统初始化完成');
    }

    /**
     * 初始化首页
     */
    static initHomePage() {
        console.log('初始化首页...');
        
        // 绑定首页事件
        this.bindHomePageEvents();
        
        // 显示欢迎信息
        this.showWelcomeMessage();
        
        // 延迟加载题库列表，确保 StorageManager 已初始化
        setTimeout(() => {
            this.updateQuestionBankList();
        }, 50);
        
        // 也立即尝试加载一次（如果 StorageManager 已经准备好）
        this.updateQuestionBankList();
    }

    /**
     * 初始化考试页面
     */
    static initExamPage() {
        console.log('初始化考试页面...');
        
        // 尝试继续上次考试
        if (this.continuePreviousExam()) {
            return;
        }
        
        // 从URL参数获取题库ID
        const urlParams = new URLSearchParams(window.location.search);
        const bankId = urlParams.get('bankId');
        const candidateName = urlParams.get('candidate') || '';
        if (candidateName) {
            ExamManager.setCandidateName(candidateName);
        } else {
            ExamManager.setCandidateName(localStorage.getItem('lastCandidateName') || '');
        }
        
        // 优先读取分别设置的各类型题目数量
        const singleCount = parseInt(urlParams.get('single') || '0');
        const multipleCount = parseInt(urlParams.get('multiple') || '0');
        const judgeCount = parseInt(urlParams.get('judge') || '0');
        const singleScore = parseFloat(urlParams.get('singleScore') || '0');
        const multipleScore = parseFloat(urlParams.get('multipleScore') || '0');
        const judgeScore = parseFloat(urlParams.get('judgeScore') || '0');
        
        // 如果没有分别设置，则使用旧的count参数（兼容旧版本）
        const questionCount = parseInt(urlParams.get('count') || '0');
        const duration = parseInt(urlParams.get('duration') || '120');
        
        if (bankId) {
            // 开始新考试
            if (singleCount > 0 || multipleCount > 0 || judgeCount > 0) {
                // 使用分别设置的各类型题目数量和得分
                this.startNewExam(bankId, singleCount, multipleCount, judgeCount, duration, singleScore, multipleScore, judgeScore);
            } else if (questionCount > 0) {
                // 使用旧的count参数（兼容旧版本）
                this.startNewExam(bankId, questionCount, duration);
            } else {
                alert('请先设置考试题目数量');
                window.location.href = 'index.html';
            }
        } else {
            // 显示错误信息并返回首页
            alert('请先选择一个题库');
            window.location.href = 'index.html';
        }
    }

    /**
     * 初始化学习页面
     */
    static initLearningPage() {
        console.log('初始化学习页面...');
        
        // 尝试继续上次学习
        if (this.continuePreviousLearning()) {
            return;
        }
        
        // 从URL参数获取题库ID和模式
        const urlParams = new URLSearchParams(window.location.search);
        const bankId = urlParams.get('bankId');
        const mode = urlParams.get('mode') || 'sequential'; // sequential 或 random
        const reviewMode = urlParams.get('reviewMode') === 'true';
        
        if (bankId) {
            // 开始新学习
            this.startNewLearning(bankId, mode, reviewMode);
        } else {
            // 显示错误信息并返回首页
            alert('请先选择一个题库');
            window.location.href = 'index.html';
        }
    }

    /**
     * 初始化随机刷题页面
     */
    static initRandomPage() {
        console.log('初始化随机刷题页面...');
        
        // 尝试继续上次学习
        if (this.continuePreviousLearning()) {
            return;
        }
        
        // 从URL参数获取题库ID，模式默认为random
        const urlParams = new URLSearchParams(window.location.search);
        const bankId = urlParams.get('bankId');
        const mode = 'random'; // 固定为random模式
        const reviewMode = urlParams.get('reviewMode') === 'true';
        
        if (bankId) {
            // 开始新学习
            this.startNewLearning(bankId, mode, reviewMode);
        } else {
            // 显示错误信息并返回首页
            alert('请先选择一个题库');
            window.location.href = 'index.html';
        }
    }

    /**
     * 初始化管理页面
     */
    static initManagePage() {
        console.log('初始化管理页面...');
        
        // 初始化导入模块
        ImportManager.init();
        
        // 加载题库列表
        this.updateQuestionBankList();
        
        // 绑定管理页面事件
        this.bindManagePageEvents();
        
        // 显示统计信息
        this.showStatistics();
    }

    /**
     * 初始化通用功能
     */
    static initCommonFeatures() {
        console.log('初始化通用功能...');
        
        // 绑定退出按钮事件
        document.getElementById('exitButton')?.addEventListener('click', () => this.confirmExit());
        
        // 绑定返回首页按钮事件
        document.getElementById('backToHome')?.addEventListener('click', () => this.backToHome());
        
        // 初始化提示功能
        this.initToast();
    }

    /**
     * 更新题库列表
     */
    static updateQuestionBankList() {
        const bankListElement = document.getElementById('questionBankList');
        if (!bankListElement) return;
        
        // 获取所有题库
        const questionBanks = StorageManager.getAllQuestionBanks();
        
        if (questionBanks.length === 0) {
            // 显示空状态
            bankListElement.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-gray-500">暂无题库，请先导入题库</p>
                    <button onclick="window.location.href='manage.html'" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                        前往管理页面
                    </button>
                </div>
            `;
            return;
        }
        
        // 清空列表
        bankListElement.innerHTML = '';
        
        // 添加每个题库
        questionBanks.forEach(bank => {
            const bankItem = document.createElement('div');
            bankItem.className = 'bank-item bg-white p-4 rounded-lg shadow mb-3 cursor-pointer hover:bg-gray-50 transition';
            bankItem.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">${bank.name}</h3>
                        <p class="text-sm text-gray-500 mt-1">${bank.description || '暂无描述'}</p>
                        <div class="flex items-center mt-2 text-sm text-gray-600">
                            <span>共${bank.questions?.length || 0}题</span>
                            <span class="mx-2">·</span>
                            <span>${new Date(bank.createTime || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button class="exam-btn px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition" data-id="${bank.id}">
                            模拟考试
                        </button>
                        <button class="learn-btn px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition" data-id="${bank.id}">
                            顺序刷题
                        </button>
                        <button class="random-btn px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition" data-id="${bank.id}">
                            随机刷题
                        </button>
                    </div>
                </div>
            `;
            
            bankListElement.appendChild(bankItem);
        });
        
        // 重新绑定按钮事件
        this.bindBankItemEvents();
    }

    /**
     * 绑定题库项的事件
     */
    static bindBankItemEvents() {
        // 模拟考试按钮
        document.querySelectorAll('.exam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bankId = btn.dataset.id;
                this.startExam(bankId);
            });
        });
        
        // 顺序刷题按钮
        document.querySelectorAll('.learn-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bankId = btn.dataset.id;
                this.startLearning(bankId, 'sequential');
            });
        });
        
        // 随机刷题按钮
        document.querySelectorAll('.random-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bankId = btn.dataset.id;
                this.startLearning(bankId, 'random');
            });
        });
    }

    /**
     * 绑定首页事件
     */
    static bindHomePageEvents() {
        // 模拟考试按钮
        document.getElementById('startExam')?.addEventListener('click', () => {
            this.showBankSelectionDialog('exam');
        });
        
        // 顺序刷题按钮
        document.getElementById('startSequence')?.addEventListener('click', () => {
            this.showBankSelectionDialog('sequential');
        });
        
        // 随机刷题按钮
        document.getElementById('startRandom')?.addEventListener('click', () => {
            this.showBankSelectionDialog('random');
        });
        
        // 导入题库按钮
        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.showImportModal();
        });
        
        // 导航按钮
        document.getElementById('btnHome')?.addEventListener('click', () => {
            this.showPage('homePage');
        });
        document.getElementById('btnExam')?.addEventListener('click', () => {
            this.showBankSelectionDialog('exam');
        });
        document.getElementById('btnSequence')?.addEventListener('click', () => {
            this.showBankSelectionDialog('sequential');
        });
        document.getElementById('btnRandom')?.addEventListener('click', () => {
            this.showBankSelectionDialog('random');
        });
        document.getElementById('btnManage')?.addEventListener('click', () => {
            window.location.href = 'manage.html';
        });
        
        // 移动端导航按钮
        document.getElementById('mobileBtnHome')?.addEventListener('click', () => {
            this.showPage('homePage');
            this.toggleMobileMenu();
        });
        document.getElementById('mobileBtnExam')?.addEventListener('click', () => {
            this.showBankSelectionDialog('exam');
            this.toggleMobileMenu();
        });
        document.getElementById('mobileBtnSequence')?.addEventListener('click', () => {
            this.showBankSelectionDialog('sequential');
            this.toggleMobileMenu();
        });
        document.getElementById('mobileBtnRandom')?.addEventListener('click', () => {
            this.showBankSelectionDialog('random');
            this.toggleMobileMenu();
        });
        document.getElementById('mobileBtnManage')?.addEventListener('click', () => {
            window.location.href = 'manage.html';
        });
        
        // 移动端菜单切换
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });
        
        // 返回首页按钮
        document.getElementById('backToHome')?.addEventListener('click', () => {
            this.showPage('homePage');
        });
        
        // 导入对话框事件
        document.getElementById('cancelImport')?.addEventListener('click', () => {
            this.hideImportModal();
        });
        document.getElementById('confirmImport')?.addEventListener('click', () => {
            this.handleImport();
        });
        
        // 快速导入示例题库按钮
        document.getElementById('quickImportBtn')?.addEventListener('click', () => {
            this.quickImportExampleBank();
        });
    }
    
    /**
     * 显示题库选择对话框
     * @param {string} mode 模式：exam, sequential, random
     */
    static showBankSelectionDialog(mode) {
        const banks = StorageManager.getAllQuestionBanks();
        
        if (banks.length === 0) {
            alert('请先导入题库');
            this.showImportModal();
            return;
        }
        
        // 显示题库选择页面
        const selectBankPage = document.getElementById('selectBankPage');
        const homePage = document.getElementById('homePage');
        
        if (selectBankPage && homePage) {
            homePage.classList.add('hidden');
            selectBankPage.classList.remove('hidden');
            
            // 渲染题库列表
            const bankSelectList = document.getElementById('bankSelectList');
            if (bankSelectList) {
                bankSelectList.innerHTML = banks.map(bank => `
                    <div class="bank-item bg-white p-4 rounded-lg shadow mb-3 cursor-pointer hover:bg-gray-50 transition" data-bank-id="${bank.id}">
                        <h3 class="text-lg font-semibold text-gray-800">${bank.name}</h3>
                        <p class="text-sm text-gray-500 mt-1">${bank.description || '暂无描述'}</p>
                        <div class="flex items-center mt-2 text-sm text-gray-600">
                            <span>共${bank.questions?.length || 0}题</span>
                            <span class="mx-2">·</span>
                            <span>${new Date(bank.createTime || bank.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('');
                
                // 绑定点击事件
                bankSelectList.querySelectorAll('.bank-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const bankId = item.dataset.bankId;
                        if (mode === 'exam') {
                            this.startExam(bankId);
                        } else {
                            this.startLearning(bankId, mode);
                        }
                    });
                });
            }
        } else {
            // 如果页面元素不存在，使用简单的选择方式
            const bankNames = banks.map(b => b.name);
            const selectedIndex = prompt(`请选择题库（输入1-${banks.length}）:\n${bankNames.map((n, i) => `${i+1}. ${n}`).join('\n')}`);
            
            if (selectedIndex) {
                const index = parseInt(selectedIndex) - 1;
                if (index >= 0 && index < banks.length) {
                    const bankId = banks[index].id;
                    if (mode === 'exam') {
                        this.startExam(bankId);
                    } else {
                        this.startLearning(bankId, mode);
                    }
                }
            }
        }
    }
    
    /**
     * 显示页面
     * @param {string} pageId 页面ID
     */
    static showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        // 如果显示的是首页，刷新题库列表
        if (pageId === 'homePage') {
            this.updateQuestionBankList();
        }
    }
    
    /**
     * 切换移动端菜单
     */
    static toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.classList.toggle('hidden');
        }
    }
    
    /**
     * 显示导入对话框
     */
    static showImportModal() {
        const importModal = document.getElementById('importModal');
        if (importModal) {
            importModal.classList.remove('hidden');
        }
    }
    
    /**
     * 隐藏导入对话框
     */
    static hideImportModal() {
        const importModal = document.getElementById('importModal');
        if (importModal) {
            importModal.classList.add('hidden');
        }
    }
    
    /**
     * 处理导入
     */
    static handleImport() {
        if (typeof ImportManager !== 'undefined') {
            ImportManager.handleImport();
        } else {
            alert('导入功能未初始化');
        }
    }
    
    /**
     * 快速导入示例题库
     */
    static quickImportExampleBank() {
        // 读取示例题库文件
        fetch('示例题库.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法读取示例题库文件');
                }
                return response.json();
            })
            .then(data => {
                // 导入题库
                const success = StorageManager.addQuestionBank(data);
                if (success) {
                    this.showToast('示例题库导入成功！');
                    this.updateQuestionBankList();
                } else {
                    this.showToast('导入失败，请稍后重试');
                }
            })
            .catch(error => {
                console.error('导入失败:', error);
                this.showToast('导入失败：' + error.message);
            });
    }

    /**
     * 绑定管理页面事件
     */
    static bindManagePageEvents() {
        // 删除题库按钮
        document.querySelectorAll('.delete-bank-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bankId = btn.dataset.id;
                this.deleteQuestionBank(bankId);
            });
        });
        
        // 导出题库按钮
        document.querySelectorAll('.export-bank-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bankId = btn.dataset.id;
                this.exportQuestionBank(bankId);
            });
        });
    }

    /**
     * 开始考试
     * @param {string} bankId 题库ID
     */
    static startExam(bankId) {
        // 获取题库信息
        const bank = StorageManager.getQuestionBank(bankId);
        if (!bank) {
            alert('题库不存在');
            return;
        }
        
        // 显示考试设置对话框
        this.showExamSettingsDialog(bankId, bank);
    }

    /**
     * 开始学习
     * @param {string} bankId 题库ID
     * @param {string} mode 学习模式
     */
    static startLearning(bankId, mode = 'sequential') {
        // 获取题库信息
        const bank = StorageManager.getQuestionBank(bankId);
        if (!bank) {
            alert('题库不存在');
            return;
        }
        
        // 对于顺序刷题，询问是否开启背题模式
        let reviewMode = false;
        if (mode === 'sequential') {
            reviewMode = confirm('是否开启背题模式？\n（背题模式下会自动显示答案）');
        }
        
        // 跳转到学习页面
        if (mode === 'random') {
            window.location.href = `random.html?bankId=${bankId}&mode=${mode}&reviewMode=${reviewMode}`;
        } else {
            window.location.href = `learning.html?bankId=${bankId}&mode=${mode}&reviewMode=${reviewMode}`;
        }
    }

    /**
     * 显示考试设置对话框
     * @param {string} bankId 题库ID
     * @param {Object} bank 题库对象
     */
    static showExamSettingsDialog(bankId, bank) {
        // 显示设置页面
        const examSettingsPage = document.getElementById('examSettingsPage');
        const homePage = document.getElementById('homePage');
        
        if (examSettingsPage && homePage) {
            homePage.classList.add('hidden');
            examSettingsPage.classList.remove('hidden');
            
            // 统计各类型题目数量
            const singleCount = bank.questions?.filter(q => q.type === 'single').length || 0;
            const multipleCount = bank.questions?.filter(q => q.type === 'multiple').length || 0;
            const judgeCount = bank.questions?.filter(q => q.type === 'judge').length || 0;
            
            // 设置默认值
            const singleCountInput = document.getElementById('examSingleCount');
            const multipleCountInput = document.getElementById('examMultipleCount');
            const judgeCountInput = document.getElementById('examJudgeCount');
            const singleScoreInput = document.getElementById('examSingleScore');
            const multipleScoreInput = document.getElementById('examMultipleScore');
            const judgeScoreInput = document.getElementById('examJudgeScore');
            const durationInput = document.getElementById('examDuration');
            const candidateInput = document.getElementById('candidateNameInput');
            
            if (singleCountInput) {
                singleCountInput.value = Math.min(30, singleCount);
                singleCountInput.max = singleCount;
            }
            if (multipleCountInput) {
                multipleCountInput.value = Math.min(20, multipleCount);
                multipleCountInput.max = multipleCount;
            }
            if (judgeCountInput) {
                judgeCountInput.value = Math.min(20, judgeCount);
                judgeCountInput.max = judgeCount;
            }
            if (singleScoreInput) {
                singleScoreInput.value = localStorage.getItem('examSingleScore') || '1';
            }
            if (multipleScoreInput) {
                multipleScoreInput.value = localStorage.getItem('examMultipleScore') || '2';
            }
            if (judgeScoreInput) {
                judgeScoreInput.value = localStorage.getItem('examJudgeScore') || '1';
            }
            if (durationInput) {
                durationInput.value = 120;
            }
            if (candidateInput) {
                candidateInput.value = localStorage.getItem('lastCandidateName') || '';
            }
            
            // 绑定确认按钮
            const confirmBtn = document.getElementById('confirmExamSettings');
            const cancelBtn = document.getElementById('cancelExamSettings');
            
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const single = parseInt(singleCountInput.value) || 0;
                    const multiple = parseInt(multipleCountInput.value) || 0;
                    const judge = parseInt(judgeCountInput.value) || 0;
                    const singleScore = parseFloat(singleScoreInput?.value) || 1;
                    const multipleScore = parseFloat(multipleScoreInput?.value) || 2;
                    const judgeScore = parseFloat(judgeScoreInput?.value) || 1;
                    const duration = parseInt(durationInput.value) || 120;
                    const candidateName = candidateInput?.value.trim();
                    
                    if (!candidateName) {
                        alert('请输入考生姓名');
                        return;
                    }
                    
                    if (single < 0 || single > singleCount) {
                        alert(`单选题数量应在0-${singleCount}之间`);
                        return;
                    }
                    
                    if (multiple < 0 || multiple > multipleCount) {
                        alert(`多选题数量应在0-${multipleCount}之间`);
                        return;
                    }
                    
                    if (judge < 0 || judge > judgeCount) {
                        alert(`判断题数量应在0-${judgeCount}之间`);
                        return;
                    }
                    
                    if (single + multiple + judge === 0) {
                        alert('至少需要选择一种题型的题目');
                        return;
                    }
                    
                    if (singleScore <= 0 || multipleScore <= 0 || judgeScore <= 0) {
                        alert('每题得分必须大于0');
                        return;
                    }
                    
                    if (duration < 1 || duration > 360) {
                        alert('请输入有效的时长（1-360分钟）');
                        return;
                    }
                    
                    localStorage.setItem('lastCandidateName', candidateName);
                    localStorage.setItem('examSingleScore', singleScore.toString());
                    localStorage.setItem('examMultipleScore', multipleScore.toString());
                    localStorage.setItem('examJudgeScore', judgeScore.toString());
                    
                    // 跳转到考试页面，传递各类型题目数量和得分
                    const candidateParam = encodeURIComponent(candidateName);
                    window.location.href = `exam.html?bankId=${bankId}&candidate=${candidateParam}&single=${single}&multiple=${multiple}&judge=${judge}&singleScore=${singleScore}&multipleScore=${multipleScore}&judgeScore=${judgeScore}&duration=${duration}`;
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    examSettingsPage.classList.add('hidden');
                    homePage.classList.remove('hidden');
                };
            }
        } else {
            // 如果页面元素不存在，使用prompt方式
            const candidateName = prompt('请输入考生姓名：', localStorage.getItem('lastCandidateName') || '');
            if (candidateName === null || candidateName.trim() === '') {
                alert('必须输入考生姓名才能开始考试');
                return;
            }
            localStorage.setItem('lastCandidateName', candidateName.trim());
            
            const questionCount = prompt(`请输入考试题目数量（1-${bank.questions?.length || 0}）:`, Math.min(100, bank.questions?.length || 0));
            if (questionCount === null) return;
            
            const count = parseInt(questionCount);
            if (isNaN(count) || count < 1 || count > (bank.questions?.length || 0)) {
                alert('请输入有效的题目数量');
                return;
            }
            
            const duration = prompt('请输入考试时长（分钟）:', '120');
            if (duration === null) return;
            
            const minutes = parseInt(duration);
            if (isNaN(minutes) || minutes < 1 || minutes > 360) {
                alert('请输入有效的时长（1-360分钟）');
                return;
            }
            
            const candidateParam = encodeURIComponent(candidateName.trim());
            window.location.href = `exam.html?bankId=${bankId}&candidate=${candidateParam}&count=${count}&duration=${minutes}`;
        }
    }

    /**
     * 开始新考试
     * @param {string} bankId 题库ID
     * @param {number} singleCount 单选题数量（新方式）或题目总数（旧方式）
     * @param {number} multipleCount 多选题数量（新方式）或时长（旧方式）
     * @param {number} judgeCount 判断题数量（新方式，可选）
     * @param {number} duration 时长（分钟，新方式，可选）
     * @param {number} singleScore 单选题每题得分（可选）
     * @param {number} multipleScore 多选题每题得分（可选）
     * @param {number} judgeScore 判断题每题得分（可选）
     */
    static startNewExam(bankId, singleCount, multipleCount, judgeCount, duration, singleScore, multipleScore, judgeScore) {
        // 获取题库
        const bank = StorageManager.getQuestionBank(bankId);
        if (!bank) {
            alert('题库不存在');
            window.location.href = 'index.html';
            return;
        }
        
        // 判断调用方式：如果参数数量为3，则是旧方式（bankId, questionCount, duration）
        // 如果参数数量为5，则是新方式（bankId, singleCount, multipleCount, judgeCount, duration）
        let actualSingleCount, actualMultipleCount, actualJudgeCount, actualDuration;
        
        if (arguments.length === 3) {
            // 旧方式：startNewExam(bankId, questionCount, duration)
            actualDuration = multipleCount; // 第二个参数是duration
            actualSingleCount = 0;
            actualMultipleCount = 0;
            actualJudgeCount = 0;
            // 使用旧的generateExamQuestions方式
            ExamManager.init(bank, singleCount, actualDuration);
            return;
        } else {
            // 新方式：startNewExam(bankId, singleCount, multipleCount, judgeCount, duration, singleScore, multipleScore, judgeScore)
            actualSingleCount = singleCount;
            actualMultipleCount = multipleCount;
            actualJudgeCount = judgeCount || 0;
            actualDuration = duration || 120;
            
            // 初始化考试（使用新的方式，传递各类型题目数量和得分）
            ExamManager.init(bank, actualSingleCount, actualMultipleCount, actualJudgeCount, actualDuration, singleScore, multipleScore, judgeScore);
        }
    }

    /**
     * 继续上次考试
     * @returns {boolean} 是否成功继续
     */
    static continuePreviousExam() {
        return ExamManager.continueExam();
    }

    /**
     * 开始新学习
     * @param {string} bankId 题库ID
     * @param {string} mode 学习模式
     * @param {boolean} reviewMode 是否为背题模式
     */
    static startNewLearning(bankId, mode, reviewMode) {
        // 获取题库
        const bank = StorageManager.getQuestionBank(bankId);
        if (!bank) {
            alert('题库不存在');
            window.location.href = 'index.html';
            return;
        }
        
        // 初始化学习
        if (typeof LearningManager !== 'undefined') {
            LearningManager.init(bank, mode, reviewMode);
        } else {
            // 如果LearningManager不存在，使用旧的practice.js
            if (typeof LearningManager !== 'undefined') {
                LearningManager.init(bank, mode, reviewMode);
            }
        }
    }

    /**
     * 继续上次学习
     * @returns {boolean} 是否成功继续
     */
    static continuePreviousLearning() {
        return LearningManager.continueLearning();
    }

    /**
     * 删除题库
     * @param {string} bankId 题库ID
     */
    static deleteQuestionBank(bankId) {
        // 确认删除
        if (!confirm('确定要删除这个题库吗？此操作不可恢复。')) {
            return;
        }
        
        // 执行删除
        const success = StorageManager.deleteQuestionBank(bankId);
        
        if (success) {
            this.showToast('题库删除成功');
            this.updateQuestionBankList();
        } else {
            this.showToast('题库删除失败');
        }
    }

    /**
     * 导出题库
     * @param {string} bankId 题库ID
     */
    static exportQuestionBank(bankId) {
        const bank = StorageManager.getQuestionBank(bankId);
        if (!bank) {
            this.showToast('题库不存在');
            return;
        }
        
        if (typeof ImportManager !== 'undefined') {
            ImportManager.exportQuestionBank(bank);
        }
    }

    /**
     * 显示考试历史
     */
    static showExamHistory() {
        const history = StorageManager.getExamHistory();
        
        if (history.length === 0) {
            alert('暂无考试记录');
            return;
        }
        
        let historyText = '考试历史记录\n\n';
        
        history.forEach((record, index) => {
            historyText += `${index + 1}. ${record.bankName || '未知题库'}\n`;
            historyText += `   分数: ${record.score || 0}分\n`;
            historyText += `   答对: ${record.correctCount || 0}题  答错: ${record.wrongCount || 0}题  未答: ${record.skippedCount || 0}题\n`;
            historyText += `   时间: ${new Date(record.completedTime || record.timestamp || Date.now()).toLocaleString()}\n\n`;
        });
        
        alert(historyText);
    }

    /**
     * 显示统计信息
     */
    static showStatistics() {
        const statsElement = document.getElementById('statisticsPanel');
        if (!statsElement) return;
        
        const banks = StorageManager.getAllQuestionBanks();
        const totalBanks = banks.length;
        const totalQuestions = banks.reduce((sum, bank) => sum + (bank.questions?.length || 0), 0);
        const storageInfo = StorageManager.checkStorageSpace();
        
        statsElement.innerHTML = `
            <div class="statistics-card bg-white p-4 rounded-lg shadow mb-4">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">系统统计</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="stat-item">
                        <p class="text-gray-600">题库总数</p>
                        <p class="text-2xl font-bold text-blue-600">${totalBanks}</p>
                    </div>
                    <div class="stat-item">
                        <p class="text-gray-600">题目总数</p>
                        <p class="text-2xl font-bold text-green-600">${totalQuestions}</p>
                    </div>
                    <div class="stat-item">
                        <p class="text-gray-600">存储使用</p>
                        <p class="text-2xl font-bold text-purple-600">${storageInfo?.usedMB || '0.00'} MB</p>
                    </div>
                    <div class="stat-item">
                        <p class="text-gray-600">可用空间</p>
                        <p class="text-2xl font-bold text-gray-600">${storageInfo?.totalMB || 5} MB</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示欢迎信息
     */
    static showWelcomeMessage() {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (!welcomeElement) return;
        
        const now = new Date();
        const hours = now.getHours();
        let greeting = '';
        
        if (hours < 6) {
            greeting = '夜深了';
        } else if (hours < 12) {
            greeting = '早上好';
        } else if (hours < 14) {
            greeting = '中午好';
        } else if (hours < 18) {
            greeting = '下午好';
        } else if (hours < 22) {
            greeting = '晚上好';
        } else {
            greeting = '夜深了';
        }
        
        welcomeElement.textContent = `${greeting}，欢迎使用本地独立刷题系统！`;
    }

    /**
     * 确认退出
     */
    static confirmExit() {
        if (confirm('确定要退出系统吗？未保存的进度将会丢失。')) {
            // 清除临时数据
            localStorage.removeItem('exam_progress');
            localStorage.removeItem('learning_progress');
            
            // 关闭窗口或返回首页
            if (window.close) {
                window.close();
            } else {
                window.location.href = 'about:blank';
            }
        }
    }

    /**
     * 返回首页
     */
    static backToHome() {
        // 询问是否保存进度
        if (confirm('确定要返回首页吗？当前进度将被保存。')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * 初始化提示功能
     */
    static initToast() {
        // 检查是否已存在toast元素
        if (!document.getElementById('toast')) {
            const toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 translate-y-20 opacity-0 text-white px-4 py-2 rounded z-50 transition-all duration-300';
            toast.innerHTML = '<span id="toastMessage"></span>';
            document.body.appendChild(toast);
        }
    }

    /**
     * 显示提示消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型：'success'（绿色）、'error'（红色）、'info'（灰色，默认）
     * @param {number} duration 持续时间（毫秒）
     */
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            
            // 根据类型设置背景颜色
            toast.classList.remove('bg-gray-800', 'bg-green-600', 'bg-red-600');
            if (type === 'success') {
                toast.classList.add('bg-green-600');
            } else if (type === 'error') {
                toast.classList.add('bg-red-600');
            } else {
                toast.classList.add('bg-gray-800');
            }
            
            // 显示提示
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            
            // 设置定时器隐藏
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-20', 'opacity-0');
            }, duration);
        }
    }

    /**
     * 获取系统信息
     * @returns {Object} 系统信息
     */
    static getSystemInfo() {
        return {
            version: '1.0.0',
            browser: navigator.userAgent,
            storageAvailable: StorageManager.isStorageAvailable(),
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        };
    }

    /**
     * 检查系统兼容性
     * @returns {boolean} 是否兼容
     */
    static checkCompatibility() {
        // 检查localStorage支持
        if (!StorageManager.isLocalStorageSupported()) {
            alert('您的浏览器不支持本地存储功能，系统无法正常运行。');
            return false;
        }
        
        // 检查屏幕尺寸
        if (window.innerWidth < 640) {
            alert('警告：您的屏幕尺寸较小，部分功能可能显示不完整。');
        }
        
        return true;
    }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    // 检查兼容性
    if (AppManager.checkCompatibility()) {
        // 初始化应用
        AppManager.init();
    }
});

// 页面可见性变化时刷新列表（从其他页面返回时）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const currentPath = window.location.pathname;
        if ((currentPath.includes('index.html') || currentPath === '/') && typeof AppManager !== 'undefined') {
            // 延迟一下确保页面完全可见
            setTimeout(() => {
                AppManager.updateQuestionBankList();
            }, 100);
        }
    }
});

// 页面获得焦点时刷新列表（从其他标签页返回时）
window.addEventListener('focus', () => {
    const currentPath = window.location.pathname;
    if ((currentPath.includes('index.html') || currentPath === '/') && typeof AppManager !== 'undefined') {
        AppManager.updateQuestionBankList();
    }
});

// 页面显示时刷新列表（浏览器前进/后退时）
window.addEventListener('pageshow', (event) => {
    // 如果是从缓存中恢复的页面，也需要刷新
    if (event.persisted) {
        const currentPath = window.location.pathname;
        if ((currentPath.includes('index.html') || currentPath === '/') && typeof AppManager !== 'undefined') {
            AppManager.updateQuestionBankList();
        }
    }
});