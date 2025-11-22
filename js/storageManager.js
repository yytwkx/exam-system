/**
 * 存储管理器
 * 负责处理所有本地存储相关的功能
 */

class StorageManager {
    /**
     * 初始化存储模块
     */
    static init() {
        console.log('初始化存储模块...');
        
        // 检查浏览器是否支持本地存储
        if (!this.isLocalStorageSupported()) {
            console.error('浏览器不支持本地存储功能');
            alert('您的浏览器不支持本地存储功能，请使用现代浏览器！');
        }
        
        // 初始化必要的数据结构
        this.initializeDataStructure();
    }

    /**
     * 检查浏览器是否支持本地存储
     * @returns {boolean} 是否支持
     */
    static isLocalStorageSupported() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 初始化数据结构
     */
    static initializeDataStructure() {
        // 初始化题库列表
        if (!localStorage.getItem('question_banks')) {
            localStorage.setItem('question_banks', JSON.stringify([]));
        }
        
        // 初始化学习进度
        if (!localStorage.getItem('learning_progress')) {
            localStorage.setItem('learning_progress', JSON.stringify({}));
        }
        
        // 初始化设置
        if (!localStorage.getItem('app_settings')) {
            const defaultSettings = {
                theme: 'light',
                fontSize: 'medium',
                autoSave: true,
                showAnswerAfterSelection: true,
                showAnalysisAfterSelection: false,
                autoNextQuestion: false
            };
            localStorage.setItem('app_settings', JSON.stringify(defaultSettings));
        }
        
        // 初始化考试记录
        if (!localStorage.getItem('exam_records')) {
            localStorage.setItem('exam_records', JSON.stringify([]));
        }
    }

    /**
     * 获取所有题库
     * @returns {Array} 题库列表
     */
    static getAllQuestionBanks() {
        try {
            const banks = JSON.parse(localStorage.getItem('question_banks') || '[]');
            return Array.isArray(banks) ? banks : [];
        } catch (error) {
            console.error('获取题库列表失败:', error);
            return [];
        }
    }

    /**
     * 获取指定ID的题库
     * @param {string} bankId 题库ID
     * @returns {Object|null} 题库对象或null
     */
    static getQuestionBank(bankId) {
        try {
            const banks = this.getAllQuestionBanks();
            return banks.find(bank => bank.id === bankId) || null;
        } catch (error) {
            console.error('获取题库失败:', error);
            return null;
        }
    }

    /**
     * 添加新题库
     * @param {Object} questionBank 题库对象
     * @returns {boolean} 是否添加成功
     */
    static addQuestionBank(questionBank) {
        try {
            const banks = this.getAllQuestionBanks();
            
            // 检查题库名称是否已存在
            const existingBank = banks.find(bank => 
                bank.name === questionBank.name && bank.id !== questionBank.id
            );
            
            if (existingBank) {
                // 如果名称已存在，添加时间戳后缀
                const timestamp = new Date().getTime();
                questionBank.name = `${questionBank.name}_${timestamp}`;
            }
            
            // 添加到列表
            banks.push(questionBank);
            
            // 保存
            localStorage.setItem('question_banks', JSON.stringify(banks));
            
            // 初始化该题库的学习进度
            this.initializeBankProgress(questionBank.id);
            
            return true;
        } catch (error) {
            console.error('添加题库失败:', error);
            return false;
        }
    }

    /**
     * 更新题库
     * @param {Object} questionBank 更新后的题库对象
     * @returns {boolean} 是否更新成功
     */
    static updateQuestionBank(questionBank) {
        try {
            const banks = this.getAllQuestionBanks();
            const index = banks.findIndex(bank => bank.id === questionBank.id);
            
            if (index === -1) {
                console.error('题库不存在');
                return false;
            }
            
            // 更新题库信息
            questionBank.updateTime = Date.now();
            banks[index] = questionBank;
            
            // 保存
            localStorage.setItem('question_banks', JSON.stringify(banks));
            
            return true;
        } catch (error) {
            console.error('更新题库失败:', error);
            return false;
        }
    }

    /**
     * 删除题库
     * @param {string} bankId 题库ID
     * @returns {boolean} 是否删除成功
     */
    static deleteQuestionBank(bankId) {
        try {
            // 删除题库
            let banks = this.getAllQuestionBanks();
            banks = banks.filter(bank => bank.id !== bankId);
            localStorage.setItem('question_banks', JSON.stringify(banks));
            
            // 删除相关的学习进度
            this.deleteBankProgress(bankId);
            
            // 删除相关的考试记录
            this.deleteBankExamRecords(bankId);
            
            return true;
        } catch (error) {
            console.error('删除题库失败:', error);
            return false;
        }
    }

    /**
     * 重命名题库
     * @param {string} bankId 题库ID
     * @param {string} newName 新名称
     * @returns {boolean} 是否重命名成功
     */
    static renameQuestionBank(bankId, newName) {
        try {
            const bank = this.getQuestionBank(bankId);
            if (!bank) {
                return false;
            }
            
            // 检查新名称是否已存在
            const banks = this.getAllQuestionBanks();
            const existingBank = banks.find(b => 
                b.name === newName && b.id !== bankId
            );
            
            if (existingBank) {
                console.error('题库名称已存在');
                return false;
            }
            
            // 更新名称
            bank.name = newName;
            bank.updateTime = Date.now();
            
            // 保存
            return this.updateQuestionBank(bank);
        } catch (error) {
            console.error('重命名题库失败:', error);
            return false;
        }
    }

    /**
     * 复制题库
     * @param {string} bankId 要复制的题库ID
     * @returns {string|null} 新题库ID或null
     */
    static copyQuestionBank(bankId) {
        try {
            const originalBank = this.getQuestionBank(bankId);
            if (!originalBank) {
                return null;
            }
            
            // 创建副本
            const newBank = JSON.parse(JSON.stringify(originalBank));
            newBank.id = this.generateUniqueId();
            newBank.name = `${originalBank.name}_副本`;
            newBank.createTime = Date.now();
            newBank.updateTime = Date.now();
            
            // 添加副本
            if (this.addQuestionBank(newBank)) {
                return newBank.id;
            }
            
            return null;
        } catch (error) {
            console.error('复制题库失败:', error);
            return null;
        }
    }

    /**
     * 获取题库统计信息
     * @param {string} bankId 题库ID
     * @returns {Object} 统计信息
     */
    static getQuestionBankStats(bankId) {
        try {
            const bank = this.getQuestionBank(bankId);
            if (!bank) {
                return null;
            }
            
            const progress = this.getBankProgress(bankId);
            
            return {
                totalQuestions: bank.questions.length,
                completed: progress?.completed || 0,
                correct: progress?.correct || 0,
                incorrect: progress?.incorrect || 0,
                accuracy: bank.questions.length > 0 ? 
                    ((progress?.correct || 0) / bank.questions.length * 100).toFixed(1) : 
                    '0.0',
                lastStudied: progress?.lastStudied || null
            };
        } catch (error) {
            console.error('获取题库统计信息失败:', error);
            return null;
        }
    }

    /**
     * 获取所有题库的统计信息
     * @returns {Object} 总体统计信息
     */
    static getAllStats() {
        try {
            const banks = this.getAllQuestionBanks();
            let totalBanks = banks.length;
            let totalQuestions = 0;
            let totalCompleted = 0;
            let totalCorrect = 0;
            let totalIncorrect = 0;
            
            banks.forEach(bank => {
                totalQuestions += bank.questions.length;
                const progress = this.getBankProgress(bank.id);
                totalCompleted += progress?.completed || 0;
                totalCorrect += progress?.correct || 0;
                totalIncorrect += progress?.incorrect || 0;
            });
            
            const totalAnswered = totalCorrect + totalIncorrect;
            
            return {
                totalBanks: totalBanks,
                totalQuestions: totalQuestions,
                totalCompleted: totalCompleted,
                totalAnswered: totalAnswered,
                totalCorrect: totalCorrect,
                totalIncorrect: totalIncorrect,
                accuracy: totalAnswered > 0 ? 
                    (totalCorrect / totalAnswered * 100).toFixed(1) : 
                    '0.0',
                completionRate: totalQuestions > 0 ?
                    (totalCompleted / totalQuestions * 100).toFixed(1) :
                    '0.0'
            };
        } catch (error) {
            console.error('获取总体统计信息失败:', error);
            return null;
        }
    }

    /**
     * 初始化题库的学习进度
     * @param {string} bankId 题库ID
     */
    static initializeBankProgress(bankId) {
        try {
            const progress = this.getLearningProgress();
            
            if (!progress[bankId]) {
                progress[bankId] = {
                    completed: 0,
                    correct: 0,
                    incorrect: 0,
                    answeredQuestions: {},
                    lastStudied: null,
                    studyCount: 0,
                    lastExamScore: null,
                    lastExamTime: null
                };
                
                localStorage.setItem('learning_progress', JSON.stringify(progress));
            }
        } catch (error) {
            console.error('初始化学习进度失败:', error);
        }
    }

    /**
     * 获取学习进度
     * @returns {Object} 学习进度对象
     */
    static getLearningProgress() {
        try {
            return JSON.parse(localStorage.getItem('learning_progress') || '{}');
        } catch (error) {
            console.error('获取学习进度失败:', error);
            return {};
        }
    }

    /**
     * 获取指定题库的学习进度
     * @param {string} bankId 题库ID
     * @returns {Object|null} 学习进度或null
     */
    static getBankProgress(bankId) {
        try {
            const progress = this.getLearningProgress();
            if (!progress[bankId]) {
                this.initializeBankProgress(bankId);
                return this.getLearningProgress()[bankId];
            }
            return progress[bankId];
        } catch (error) {
            console.error('获取题库学习进度失败:', error);
            return null;
        }
    }

    /**
     * 更新题目回答状态
     * @param {string} bankId 题库ID
     * @param {string} questionId 题目ID
     * @param {string} userAnswer 用户答案
     * @param {string} correctAnswer 正确答案
     */
    static updateQuestionStatus(bankId, questionId, userAnswer, correctAnswer) {
        try {
            const progress = this.getLearningProgress();
            
            // 确保进度对象存在
            if (!progress[bankId]) {
                this.initializeBankProgress(bankId);
                return this.updateQuestionStatus(bankId, questionId, userAnswer, correctAnswer);
            }
            
            const isCorrect = userAnswer === correctAnswer;
            const bankProgress = progress[bankId];
            const questionAnsweredBefore = bankProgress.answeredQuestions[questionId] !== undefined;
            const wasCorrectBefore = questionAnsweredBefore && 
                bankProgress.answeredQuestions[questionId].correct;
            
            // 更新题目回答状态
            bankProgress.answeredQuestions[questionId] = {
                answer: userAnswer,
                correct: isCorrect,
                answeredAt: Date.now()
            };
            
            // 更新统计信息
            if (!questionAnsweredBefore) {
                bankProgress.completed++;
            } else if (wasCorrectBefore !== isCorrect) {
                // 答案从正确变为错误或从错误变为正确
                if (isCorrect) {
                    bankProgress.correct++;
                    bankProgress.incorrect--;
                } else {
                    bankProgress.correct--;
                    bankProgress.incorrect++;
                }
            }
            
            // 如果是第一次回答且正确
            if (!questionAnsweredBefore && isCorrect) {
                bankProgress.correct++;
            }
            // 如果是第一次回答且错误
            else if (!questionAnsweredBefore && !isCorrect) {
                bankProgress.incorrect++;
            }
            
            // 更新最后学习时间和学习次数
            bankProgress.lastStudied = Date.now();
            bankProgress.studyCount = (bankProgress.studyCount || 0) + 1;
            
            // 保存
            localStorage.setItem('learning_progress', JSON.stringify(progress));
        } catch (error) {
            console.error('更新题目回答状态失败:', error);
        }
    }

    /**
     * 获取用户对特定题目的回答记录
     * @param {string} bankId 题库ID
     * @param {string} questionId 题目ID
     * @returns {Object|null} 回答记录或null
     */
    static getUserAnswer(bankId, questionId) {
        try {
            const progress = this.getLearningProgress();
            if (!progress[bankId] || !progress[bankId].answeredQuestions) {
                return null;
            }
            return progress[bankId].answeredQuestions[questionId] || null;
        } catch (error) {
            console.error('获取用户回答记录失败:', error);
            return null;
        }
    }

    /**
     * 获取未回答的题目ID列表
     * @param {string} bankId 题库ID
     * @returns {Array} 未回答的题目ID列表
     */
    static getUnansweredQuestions(bankId) {
        try {
            const bank = this.getQuestionBank(bankId);
            if (!bank) {
                return [];
            }
            
            const progress = this.getBankProgress(bankId);
            const answeredIds = new Set(Object.keys(progress.answeredQuestions));
            
            return bank.questions
                .filter(q => !answeredIds.has(q.id))
                .map(q => q.id);
        } catch (error) {
            console.error('获取未回答题目失败:', error);
            return [];
        }
    }

    /**
     * 获取回答错误的题目ID列表
     * @param {string} bankId 题库ID
     * @returns {Array} 回答错误的题目ID列表
     */
    static getIncorrectQuestions(bankId) {
        try {
            const progress = this.getBankProgress(bankId);
            if (!progress || !progress.answeredQuestions) {
                return [];
            }
            
            return Object.entries(progress.answeredQuestions)
                .filter(([_, data]) => !data.correct)
                .map(([id]) => id);
        } catch (error) {
            console.error('获取错误题目失败:', error);
            return [];
        }
    }

    /**
     * 保存考试记录
     * @param {Object} examRecord 考试记录
     */
    static saveExamRecord(examRecord) {
        try {
            const records = JSON.parse(localStorage.getItem('exam_records') || '[]');
            
            // 确保是数组
            const safeRecords = Array.isArray(records) ? records : [];
            
            // 添加新记录
            const newRecord = {
                ...examRecord,
                id: this.generateUniqueId(),
                date: Date.now()
            };
            
            safeRecords.unshift(newRecord);
            
            // 限制记录数量（最多保存50条）
            const limitedRecords = safeRecords.slice(0, 50);
            
            // 保存
            localStorage.setItem('exam_records', JSON.stringify(limitedRecords));
            
            // 更新题库的最后考试成绩
            const progress = this.getLearningProgress();
            if (progress[examRecord.bankId]) {
                progress[examRecord.bankId].lastExamScore = examRecord.score;
                progress[examRecord.bankId].lastExamTime = Date.now();
                localStorage.setItem('learning_progress', JSON.stringify(progress));
            }
            
            return newRecord.id;
        } catch (error) {
            console.error('保存考试记录失败:', error);
            return null;
        }
    }

    /**
     * 获取考试记录
     * @param {string} bankId 可选，题库ID
     * @returns {Array} 考试记录列表
     */
    static getExamRecords(bankId = null) {
        try {
            const records = JSON.parse(localStorage.getItem('exam_records') || '[]');
            const safeRecords = Array.isArray(records) ? records : [];
            
            if (bankId) {
                return safeRecords.filter(record => record.bankId === bankId);
            }
            
            return safeRecords;
        } catch (error) {
            console.error('获取考试记录失败:', error);
            return [];
        }
    }

    /**
     * 获取设置
     * @returns {Object} 设置对象
     */
    static getSettings() {
        try {
            return JSON.parse(localStorage.getItem('app_settings') || '{}');
        } catch (error) {
            console.error('获取设置失败:', error);
            return {};
        }
    }

    /**
     * 保存设置
     * @param {Object} settings 设置对象
     */
    static saveSettings(settings) {
        try {
            localStorage.setItem('app_settings', JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }

    /**
     * 清除所有数据
     * @returns {boolean} 是否清除成功
     */
    static clearAllData() {
        try {
            localStorage.removeItem('question_banks');
            localStorage.removeItem('learning_progress');
            localStorage.removeItem('app_settings');
            localStorage.removeItem('exam_records');
            localStorage.removeItem('import_history');
            
            // 重新初始化数据结构
            this.initializeDataStructure();
            
            return true;
        } catch (error) {
            console.error('清除数据失败:', error);
            return false;
        }
    }

    /**
     * 删除题库的学习进度
     * @param {string} bankId 题库ID
     */
    static deleteBankProgress(bankId) {
        try {
            const progress = this.getLearningProgress();
            if (progress[bankId]) {
                delete progress[bankId];
                localStorage.setItem('learning_progress', JSON.stringify(progress));
            }
        } catch (error) {
            console.error('删除学习进度失败:', error);
        }
    }

    /**
     * 删除题库的考试记录
     * @param {string} bankId 题库ID
     */
    static deleteBankExamRecords(bankId) {
        try {
            const records = JSON.parse(localStorage.getItem('exam_records') || '[]');
            const safeRecords = Array.isArray(records) ? records : [];
            
            const filteredRecords = safeRecords.filter(record => record.bankId !== bankId);
            localStorage.setItem('exam_records', JSON.stringify(filteredRecords));
        } catch (error) {
            console.error('删除考试记录失败:', error);
        }
    }

    /**
     * 重置题库的学习进度
     * @param {string} bankId 题库ID
     */
    static resetBankProgress(bankId) {
        try {
            const progress = this.getLearningProgress();
            
            if (progress[bankId]) {
                progress[bankId] = {
                    completed: 0,
                    correct: 0,
                    incorrect: 0,
                    answeredQuestions: {},
                    lastStudied: null,
                    studyCount: 0,
                    lastExamScore: null,
                    lastExamTime: null
                };
                
                localStorage.setItem('learning_progress', JSON.stringify(progress));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('重置学习进度失败:', error);
            return false;
        }
    }

    /**
     * 导出所有数据
     * @returns {string} JSON格式的数据字符串
     */
    static exportAllData() {
        try {
            const allData = {
                exportTime: Date.now(),
                version: '1.0',
                questionBanks: this.getAllQuestionBanks(),
                learningProgress: this.getLearningProgress(),
                settings: this.getSettings(),
                examRecords: this.getExamRecords()
            };
            
            return JSON.stringify(allData, null, 2);
        } catch (error) {
            console.error('导出数据失败:', error);
            return null;
        }
    }

    /**
     * 导入所有数据
     * @param {string} jsonData JSON格式的数据字符串
     * @returns {boolean} 是否导入成功
     */
    static importAllData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // 验证数据格式
            if (!data.questionBanks || !Array.isArray(data.questionBanks)) {
                console.error('导入数据格式不正确');
                return false;
            }
            
            // 保存数据
            if (data.questionBanks) {
                localStorage.setItem('question_banks', JSON.stringify(data.questionBanks));
            }
            
            if (data.learningProgress) {
                localStorage.setItem('learning_progress', JSON.stringify(data.learningProgress));
            }
            
            if (data.settings) {
                localStorage.setItem('app_settings', JSON.stringify(data.settings));
            }
            
            if (data.examRecords) {
                localStorage.setItem('exam_records', JSON.stringify(data.examRecords));
            }
            
            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    static generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 检查存储空间
     * @returns {Object} 存储空间信息
     */
    static checkStorageSpace() {
        try {
            // 估算已使用的存储空间
            let totalSize = 0;
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            
            // 估算总存储空间（通常为5MB）
            const totalStorage = 5 * 1024 * 1024; // 5MB
            const usedPercentage = (totalSize / totalStorage * 100).toFixed(2);
            
            return {
                usedBytes: totalSize,
                usedMB: (totalSize / (1024 * 1024)).toFixed(2),
                totalMB: 5,
                percentageUsed: parseFloat(usedPercentage)
            };
        } catch (error) {
            console.error('检查存储空间失败:', error);
            return null;
        }
    }
}