/**
 * 本地存储管理模块
 * 负责题库和用户数据的本地存储操作
 */

const STORAGE_KEYS = {
    QUESTION_BANKS: 'question_banks',
    STUDY_RECORDS: 'study_records',
    USER_SETTINGS: 'user_settings',
    EXAM_HISTORY: 'exam_history',
    LEARNING_PROGRESS: 'learning_progress',
    EXAM_PROGRESS: 'exam_progress'
};

class StorageManager {
    /**
     * 初始化存储
     */
    static init() {
        // 确保存储结构存在
        this.ensureStorageStructure();
        
        // 添加示例题库（如果没有题库）
        this.addExampleBankIfEmpty();
    }

    /**
     * 确保存储结构存在
     */
    static ensureStorageStructure() {
        // 检查并初始化题库存储
        if (!localStorage.getItem(STORAGE_KEYS.QUESTION_BANKS)) {
            localStorage.setItem(STORAGE_KEYS.QUESTION_BANKS, JSON.stringify([]));
        }
        
        // 检查并初始化考试历史
        if (!localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY)) {
            localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify([]));
        }
    }

    /**
     * 添加示例题库（如果没有题库）
     */
    static addExampleBankIfEmpty() {
        const banks = this.getQuestionBanks();
        
        if (banks.length === 0) {
            const exampleBank = this.getExampleQuestionBank();
            this.addQuestionBank(exampleBank);
        }
    }

    /**
     * 获取示例题库
     * @returns {Object} 示例题库对象
     */
    static getExampleQuestionBank() {
        return {
            id: 'bank_' + Date.now() + '_example',
            name: '示例题库',
            description: '这是一个示例题库，包含一些简单的题目',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            questions: [
                {
                    id: 'q1',
                    content: '1 + 1 = ?',
                    optionA: '1',
                    optionB: '2',
                    optionC: '3',
                    optionD: '4',
                    correctAnswer: 'B',
                    explanation: '1加1等于2',
                    type: 'single'
                },
                {
                    id: 'q2',
                    content: '下列哪个是中国的首都？',
                    optionA: '上海',
                    optionB: '北京',
                    optionC: '广州',
                    optionD: '深圳',
                    correctAnswer: 'B',
                    explanation: '北京是中华人民共和国的首都',
                    type: 'single'
                },
                {
                    id: 'q3',
                    content: '下列哪些是编程语言？（多选）',
                    optionA: 'JavaScript',
                    optionB: 'HTML',
                    optionC: 'CSS',
                    optionD: 'Python',
                    correctAnswer: 'AD',
                    explanation: 'JavaScript和Python是编程语言，HTML和CSS是标记语言',
                    type: 'multiple'
                },
                {
                    id: 'q4',
                    content: '水的化学式是什么？',
                    optionA: 'H2O',
                    optionB: 'CO2',
                    optionC: 'O2',
                    optionD: 'N2',
                    correctAnswer: 'A',
                    explanation: '水的化学式是H2O，表示由2个氢原子和1个氧原子组成',
                    type: 'single'
                },
                {
                    id: 'q5',
                    content: '以下哪位是著名的科学家？',
                    optionA: '爱因斯坦',
                    optionB: '莎士比亚',
                    optionC: '牛顿',
                    optionD: '贝多芬',
                    correctAnswer: 'AC',
                    explanation: '爱因斯坦和牛顿是著名的科学家，莎士比亚是文学家，贝多芬是音乐家',
                    type: 'multiple'
                }
            ]
        };
    }

    /**
     * 获取所有题库
     * @returns {Array} 题库数组
     */
    static getQuestionBanks() {
        try {
            const banks = localStorage.getItem(STORAGE_KEYS.QUESTION_BANKS);
            return banks ? JSON.parse(banks) : [];
        } catch (error) {
            console.error('获取题库失败:', error);
            return [];
        }
    }

    /**
     * 保存题库数组
     * @param {Array} banks 题库数组
     * @returns {boolean} 是否保存成功
     */
    static saveQuestionBanks(banks) {
        try {
            localStorage.setItem(STORAGE_KEYS.QUESTION_BANKS, JSON.stringify(banks));
            return true;
        } catch (error) {
            console.error('保存题库失败:', error);
            return false;
        }
    }

    /**
     * 添加新题库
     * @param {Object} bank 题库对象
     * @returns {boolean} 是否添加成功
     */
    static addQuestionBank(bank) {
        try {
            const banks = this.getQuestionBanks();
            
            // 检查是否已存在同名题库
            const existingIndex = banks.findIndex(b => b.name === bank.name && b.id !== bank.id);
            if (existingIndex !== -1) {
                // 如果存在，使用覆盖模式
                const overwrite = confirm(`题库"${bank.name}"已存在，是否覆盖？`);
                if (!overwrite) {
                    return false;
                }
                // 保留原ID
                bank.id = banks[existingIndex].id;
                bank.createTime = banks[existingIndex].createTime;
                bank.updateTime = new Date().toISOString();
                banks[existingIndex] = bank;
            } else {
                // 生成唯一ID
                bank.id = 'bank_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                bank.createTime = new Date().toISOString();
                bank.updateTime = new Date().toISOString();
                banks.push(bank);
            }
            
            return this.saveQuestionBanks(banks);
        } catch (error) {
            console.error('添加题库失败:', error);
            return false;
        }
    }

    /**
     * 根据ID获取题库
     * @param {string} id 题库ID
     * @returns {Object|null} 题库对象或null
     */
    static getQuestionBankById(id) {
        try {
            const banks = this.getQuestionBanks();
            return banks.find(bank => bank.id === id) || null;
        } catch (error) {
            console.error('获取题库失败:', error);
            return null;
        }
    }

    /**
     * 更新题库
     * @param {string} id 题库ID
     * @param {Object} updatedBank 更新的题库数据
     * @returns {boolean} 是否更新成功
     */
    static updateQuestionBank(id, updatedBank) {
        try {
            const banks = this.getQuestionBanks();
            const index = banks.findIndex(bank => bank.id === id);
            if (index !== -1) {
                banks[index] = { ...banks[index], ...updatedBank, updateTime: new Date().toISOString() };
                return this.saveQuestionBanks(banks);
            }
            return false;
        } catch (error) {
            console.error('更新题库失败:', error);
            return false;
        }
    }

    /**
     * 删除题库
     * @param {string} id 题库ID
     * @returns {boolean} 是否删除成功
     */
    static deleteQuestionBank(id) {
        try {
            let banks = this.getQuestionBanks();
            banks = banks.filter(bank => bank.id !== id);
            return this.saveQuestionBanks(banks);
        } catch (error) {
            console.error('删除题库失败:', error);
            return false;
        }
    }

    /**
     * 保存学习记录
     * @param {Object} record 学习记录对象
     * @returns {boolean} 是否保存成功
     */
    static saveStudyRecord(record) {
        try {
            const records = this.getStudyRecords();
            record.id = 'record_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            record.createTime = new Date().toISOString();
            records.push(record);
            // 只保留最近50条记录
            if (records.length > 50) {
                records.splice(0, records.length - 50);
            }
            localStorage.setItem(STORAGE_KEYS.STUDY_RECORDS, JSON.stringify(records));
            return true;
        } catch (error) {
            console.error('保存学习记录失败:', error);
            return false;
        }
    }

    /**
     * 获取所有学习记录
     * @returns {Array} 学习记录数组
     */
    static getStudyRecords() {
        try {
            const records = localStorage.getItem(STORAGE_KEYS.STUDY_RECORDS);
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('获取学习记录失败:', error);
            return [];
        }
    }

    /**
     * 保存用户设置
     * @param {Object} settings 设置对象
     * @returns {boolean} 是否保存成功
     */
    static saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取用户设置
     * @returns {Object} 设置对象
     */
    static getSettings() {
        try {
            const settings = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
            return settings ? JSON.parse(settings) : {
                memorizeMode: false,
                autoSaveProgress: true,
                showTimer: true
            };
        } catch (error) {
            console.error('获取设置失败:', error);
            return {
                memorizeMode: false,
                autoSaveProgress: true,
                showTimer: true
            };
        }
    }

    /**
     * 清空所有数据
     * @returns {boolean} 是否清空成功
     */
    static clearAllData() {
        try {
            localStorage.removeItem(STORAGE_KEYS.QUESTION_BANKS);
            localStorage.removeItem(STORAGE_KEYS.STUDY_RECORDS);
            localStorage.removeItem(STORAGE_KEYS.USER_SETTINGS);
            localStorage.removeItem(STORAGE_KEYS.EXAM_HISTORY);
            localStorage.removeItem(STORAGE_KEYS.LEARNING_PROGRESS);
            localStorage.removeItem(STORAGE_KEYS.EXAM_PROGRESS);
            
            // 重新初始化，添加示例题库
            this.init();
            
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }

    /**
     * 导出题库为JSON
     * @param {string} id 题库ID
     * @returns {Object|null} 导出的数据对象或null
     */
    static exportQuestionBank(id) {
        try {
            const bank = this.getQuestionBankById(id);
            if (bank) {
                return bank;
            }
            return null;
        } catch (error) {
            console.error('导出题库失败:', error);
            return null;
        }
    }

    /**
     * 导入题库数据
     * @param {Object} bankData 题库数据
     * @returns {boolean} 是否导入成功
     */
    static importQuestionBank(bankData) {
        try {
            // 重新生成ID以避免冲突
            delete bankData.id;
            return this.addQuestionBank(bankData);
        } catch (error) {
            console.error('导入题库失败:', error);
            return false;
        }
    }

    /**
     * 检查存储是否可用
     * @returns {boolean} 存储是否可用
     */
    static isStorageAvailable() {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 获取存储使用情况
     * @returns {Object} 存储使用情况
     */
    static getStorageUsage() {
        try {
            let totalSize = 0;
            const details = {};
            
            // 计算每个键的大小
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const size = localStorage[key].length + key.length;
                    totalSize += size;
                    details[key] = {
                        size: size,
                        type: this.getStorageKeyType(key)
                    };
                }
            }
            
            return {
                used: totalSize,
                usedMB: (totalSize / 1024 / 1024).toFixed(2),
                availableMB: '大约5MB（浏览器限制）',
                details: details,
                itemCount: localStorage.length
            };
        } catch (error) {
            console.error('获取存储使用情况失败:', error);
            return null;
        }
    }

    /**
     * 获取存储键的类型
     * @param {string} key 存储键名
     * @returns {string} 类型描述
     */
    static getStorageKeyType(key) {
        for (const [type, storageKey] of Object.entries(STORAGE_KEYS)) {
            if (key === storageKey) {
                return type;
            }
        }
        return 'unknown';
    }

    /**
     * 重命名题库
     * @param {string} id 题库ID
     * @param {string} newName 新名称
     * @returns {boolean} 是否重命名成功
     */
    static renameQuestionBank(id, newName) {
        const bank = this.getQuestionBankById(id);
        if (bank) {
            bank.name = newName;
            return this.updateQuestionBank(id, bank);
        }
        return false;
    }

    /**
     * 获取考试历史记录
     * @param {number} limit 限制数量
     * @returns {Array} 考试历史数组
     */
    static getExamHistory(limit = 10) {
        try {
            const history = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
            const historyArray = history ? JSON.parse(history) : [];
            return historyArray.slice(0, limit);
        } catch (error) {
            console.error('获取考试历史失败:', error);
            return [];
        }
    }

    /**
     * 保存考试历史记录
     * @param {Object} record 考试记录
     */
    static saveExamHistory(record) {
        try {
            const history = this.getExamHistory(100); // 获取所有历史记录
            history.unshift({
                ...record,
                id: 'exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString()
            });
            
            // 只保留最近10条记录
            const limitedHistory = history.slice(0, 10);
            localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(limitedHistory));
        } catch (error) {
            console.error('保存考试历史失败:', error);
        }
    }
}