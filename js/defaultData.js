/**
 * 默认数据管理器
 * 用于初始化系统默认数据
 */
class DefaultDataManager {
    /**
     * 检查并初始化默认数据
     */
    static checkAndInitDefaultData() {
        console.log('检查并初始化默认数据...');
        
        // 检查本地存储是否已初始化或为空
        const questionBanks = localStorage.getItem('questionBanks');
        if (!questionBanks || JSON.parse(questionBanks).length === 0) {
            console.log('本地存储未初始化或为空，开始初始化默认数据...');
            
            // 初始化默认数据
            const defaultData = this.getDefaultData();
            
            // 保存到本地存储
            localStorage.setItem('questionBanks', JSON.stringify(defaultData.questionBanks));
            localStorage.setItem('learningProgress', JSON.stringify(defaultData.learningProgress));
            localStorage.setItem('examRecords', JSON.stringify(defaultData.examRecords));
            localStorage.setItem('appSettings', JSON.stringify(defaultData.appSettings));
            
            console.log('默认数据初始化完成');
        } else {
            console.log('本地存储已初始化，跳过默认数据加载');
        }
    }
    
    /**
     * 获取默认数据
     * @returns {Object} 默认数据对象
     */
    static getDefaultData() {
        // 示例题库数据
        const defaultQuestionBanks = [
            {
                id: 'default-bank-1',
                name: '默认题库-初级',
                description: '包含一些基础题目',
                subject: '数学',
                grade: '初中',
                questionCount: 5,
                questions: [
                    {
                        id: 'q1',
                        content: '1 + 1 = ?',
                        type: 'single',
                        options: {
                            A: '1',
                            B: '2',
                            C: '3',
                            D: '4'
                        },
                        answer: 'B',
                        analysis: '基础算术题，1加1等于2',
                        score: 2,
                        createTime: new Date().toISOString(),
                        updateTime: new Date().toISOString()
                    },
                    {
                        id: 'q2',
                        content: '2 × 3 = ?',
                        type: 'single',
                        options: {
                            A: '5',
                            B: '6',
                            C: '7',
                            D: '8'
                        },
                        answer: 'B',
                        analysis: '乘法运算，2乘以3等于6',
                        score: 2,
                        createTime: new Date().toISOString(),
                        updateTime: new Date().toISOString()
                    },
                    {
                        id: 'q3',
                        content: '圆的面积公式是？',
                        type: 'single',
                        options: {
                            A: 'πr²',
                            B: '2πr',
                            C: 'πd',
                            D: 'a²'
                        },
                        answer: 'A',
                        analysis: '圆的面积公式为圆周率乘以半径的平方',
                        score: 2,
                        createTime: new Date().toISOString(),
                        updateTime: new Date().toISOString()
                    },
                    {
                        id: 'q4',
                        content: '三角形的内角和是多少度？',
                        type: 'single',
                        options: {
                            A: '90度',
                            B: '180度',
                            C: '270度',
                            D: '360度'
                        },
                        answer: 'B',
                        analysis: '三角形内角和定理，所有三角形内角和为180度',
                        score: 2,
                        createTime: new Date().toISOString(),
                        updateTime: new Date().toISOString()
                    },
                    {
                        id: 'q5',
                        content: '什么是质数？',
                        type: 'multiple',
                        options: {
                            A: '大于1的自然数',
                            B: '只能被1和自身整除的数',
                            C: '包含1的数',
                            D: '偶数都是质数'
                        },
                        answer: ['A', 'B'],
                        analysis: '质数定义：大于1的自然数，除了1和它自身外，不能被其他自然数整除',
                        score: 3,
                        createTime: new Date().toISOString(),
                        updateTime: new Date().toISOString()
                    }
                ],
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            }
        ];
        
        // 示例学习进度数据
        const defaultLearningProgress = [];
        
        // 示例考试记录数据
        const defaultExamRecords = [];
        
        // 示例应用设置数据
        const defaultAppSettings = {
            theme: 'light',
            autoSave: true,
            timerSound: true,
            notification: true,
            fontSize: 'medium'
        };
        
        return {
            questionBanks: defaultQuestionBanks,
            learningProgress: defaultLearningProgress,
            examRecords: defaultExamRecords,
            appSettings: defaultAppSettings
        };
    }
}