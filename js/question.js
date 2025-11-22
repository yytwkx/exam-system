/**
 * 题目处理模块
 * 负责题目的解析、格式化、验证等操作
 */

class QuestionManager {
    /**
     * 格式化题目数据
     * @param {Object} question 原始题目对象
     * @returns {Object} 格式化后的题目对象
     */
    static formatQuestion(question) {
        return {
            id: question.id || Date.now(),
            content: question.content || '',
            type: this.normalizeQuestionType(question.type),
            options: this.normalizeOptions(question.options),
            answer: this.normalizeAnswer(question.answer),
            analysis: question.analysis || '暂无解析',
            score: question.score || 1
        };
    }

    /**
     * 标准化题目类型
     * @param {string} type 原始类型
     * @returns {string} 标准化的类型
     */
    static normalizeQuestionType(type) {
        const typeMap = {
            '单选': 'single',
            '单选题': 'single',
            'multiple': 'multiple',
            '多选': 'multiple',
            '多选题': 'multiple',
            '判断': 'judge',
            '判断题': 'judge',
            '是非': 'judge',
            '是非题': 'judge'
        };
        return typeMap[type] || typeMap['单选'] || 'single';
    }

    /**
     * 标准化选项
     * @param {Object|Array} options 原始选项
     * @returns {Object} 标准化的选项对象
     */
    static normalizeOptions(options) {
        const normalizedOptions = {};
        
        if (typeof options === 'object' && options !== null) {
            // 如果是对象格式 {A: '选项A', B: '选项B'}
            for (let key in options) {
                if (options[key]) {
                    normalizedOptions[key.toUpperCase()] = options[key].trim();
                }
            }
        } else if (Array.isArray(options)) {
            // 如果是数组格式 ['选项A', '选项B']
            const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            options.forEach((option, index) => {
                if (option && index < optionKeys.length) {
                    normalizedOptions[optionKeys[index]] = option.trim();
                }
            });
        }
        
        return normalizedOptions;
    }

    /**
     * 标准化答案
     * @param {string|Array} answer 原始答案
     * @returns {string} 标准化的答案字符串
     */
    static normalizeAnswer(answer) {
        if (!answer) return '';
        
        if (Array.isArray(answer)) {
            // 数组格式转换为逗号分隔的字符串
            return answer.map(a => a.toUpperCase()).sort().join(',');
        } else if (typeof answer === 'string') {
            // 字符串格式，处理各种可能的分隔符
            answer = answer.toUpperCase();
            // 移除所有非字母字符，只保留A-Z
            const letters = answer.match(/[A-Z]/g) || [];
            // 去重并排序
            const uniqueLetters = [...new Set(letters)].sort();
            return uniqueLetters.join(',');
        }
        
        return String(answer).toUpperCase();
    }

    /**
     * 验证题目数据的完整性
     * @param {Object} question 题目对象
     * @returns {Object} 验证结果 {valid: boolean, errors: Array}
     */
    static validateQuestion(question) {
        const errors = [];
        
        if (!question.content || question.content.trim() === '') {
            errors.push('题目内容不能为空');
        }
        
        if (!question.options || Object.keys(question.options).length === 0) {
            errors.push('题目必须包含选项');
        }
        
        if (!question.answer || question.answer.trim() === '') {
            errors.push('题目必须有答案');
        } else {
            // 验证答案是否有效
            const validOptions = Object.keys(question.options).map(key => key.toUpperCase());
            const answerLetters = question.answer.split(',').map(a => a.trim());
            for (const letter of answerLetters) {
                if (!validOptions.includes(letter)) {
                    errors.push(`答案中包含无效选项: ${letter}`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 从Excel数据生成题目数组
     * @param {Array} excelData Excel解析后的数据数组
     * @returns {Object} {questions: Array, errors: Array}
     */
    static generateQuestionsFromExcel(excelData) {
        const questions = [];
        const errors = [];
        
        // 假设第一行是标题行
        const headers = this.extractHeaders(excelData[0]);
        
        for (let i = 1; i < excelData.length; i++) {
            const row = excelData[i];
            const question = this.createQuestionFromRow(row, headers);
            
            if (question) {
                const validation = this.validateQuestion(question);
                if (validation.valid) {
                    questions.push(this.formatQuestion(question));
                } else {
                    errors.push(`第${i+1}行题目验证失败: ${validation.errors.join(', ')}`);
                }
            }
        }
        
        return { questions, errors };
    }

    /**
     * 提取Excel表头并映射到标准字段
     * @param {Object} headerRow 表头行
     * @returns {Object} 字段映射
     */
    static extractHeaders(headerRow) {
        const headers = {};
        const fieldMap = {
            '题目': 'content',
            '问题': 'content',
            '题干': 'content',
            '选项A': 'optionA',
            '选项B': 'optionB',
            '选项C': 'optionC',
            '选项D': 'optionD',
            '正确答案': 'answer',
            '答案': 'answer',
            '参考答案': 'answer',
            '题目类型': 'type',
            '类型': 'type',
            '题型': 'type',
            '解析': 'analysis',
            '答案解析': 'analysis',
            '分值': 'score',
            '分数': 'score'
        };
        
        for (let key in headerRow) {
            if (headerRow.hasOwnProperty(key)) {
                const headerText = headerRow[key];
                for (let field in fieldMap) {
                    if (headerText && headerText.includes(field)) {
                        headers[fieldMap[field]] = key;
                        break;
                    }
                }
            }
        }
        
        return headers;
    }

    /**
     * 从Excel行数据创建题目对象
     * @param {Object} row 行数据
     * @param {Object} headers 字段映射
     * @returns {Object|null} 题目对象
     */
    static createQuestionFromRow(row, headers) {
        try {
            const question = {
                content: row[headers.content] || '',
                type: row[headers.type] || '单选题',
                options: {},
                answer: row[headers.answer] || '',
                analysis: row[headers.analysis] || '',
                score: parseInt(row[headers.score]) || 1
            };
            
            // 添加选项
            if (headers.optionA) question.options['A'] = row[headers.optionA] || '';
            if (headers.optionB) question.options['B'] = row[headers.optionB] || '';
            if (headers.optionC) question.options['C'] = row[headers.optionC] || '';
            if (headers.optionD) question.options['D'] = row[headers.optionD] || '';
            
            // 如果是判断题，确保只有A和B两个选项
            if (this.normalizeQuestionType(question.type) === 'judge') {
                question.options = {
                    'A': '正确',
                    'B': '错误'
                };
                // 标准化判断题答案
                const answerText = String(question.answer).trim().toUpperCase();
                if (answerText === '√' || answerText === '对' || answerText === '正确' || answerText === '是' || answerText === 'T' || answerText === 'TRUE') {
                    question.answer = 'A';
                } else if (answerText === '×' || answerText === '错' || answerText === '错误' || answerText === '否' || answerText === 'F' || answerText === 'FALSE') {
                    question.answer = 'B';
                }
            }
            
            return question;
        } catch (error) {
            console.error('从行数据创建题目失败:', error);
            return null;
        }
    }

    /**
     * 检查答案是否正确
     * @param {string} userAnswer 用户答案
     * @param {string} correctAnswer 正确答案
     * @returns {boolean} 是否正确
     */
    static checkAnswer(userAnswer, correctAnswer) {
        // 标准化答案格式后比较
        const normalizedUserAnswer = this.normalizeAnswer(userAnswer);
        const normalizedCorrectAnswer = this.normalizeAnswer(correctAnswer);
        return normalizedUserAnswer === normalizedCorrectAnswer;
    }

    /**
     * 计算得分
     * @param {Array} answers 用户答题记录
     * @param {Array} questions 题目数组
     * @returns {number} 得分
     */
    static calculateScore(answers, questions) {
        let totalScore = 0;
        const maxScore = questions.reduce((sum, q) => sum + q.score, 0);
        
        answers.forEach(answer => {
            const question = questions.find(q => q.id === answer.questionId);
            if (question && this.checkAnswer(answer.userAnswer, question.answer)) {
                totalScore += question.score;
            }
        });
        
        // 计算百分比得分
        return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    }

    /**
     * 随机打乱题目数组
     * @param {Array} questions 题目数组
     * @returns {Array} 打乱后的题目数组
     */
    static shuffleQuestions(questions) {
        const shuffled = [...questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 随机打乱选项顺序
     * @param {Object} options 选项对象
     * @returns {Object} 打乱后的选项对象
     */
    static shuffleOptions(options) {
        const keys = Object.keys(options);
        const values = Object.values(options);
        
        // 打乱值数组
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        
        // 重新构建选项对象，保持原键名
        const shuffledOptions = {};
        keys.forEach((key, index) => {
            shuffledOptions[key] = values[index];
        });
        
        return shuffledOptions;
    }

    /**
     * 获取题目类型的中文名称
     * @param {string} type 题目类型
     * @returns {string} 中文名称
     */
    static getQuestionTypeLabel(type) {
        const typeMap = {
            'single': '单选题',
            'multiple': '多选题',
            'judge': '判断题'
        };
        return typeMap[type] || type;
    }
}