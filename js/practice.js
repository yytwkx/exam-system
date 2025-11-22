/**
 * 刷题练习模块
 * 负责顺序刷题和随机刷题的逻辑处理
 */

class LearningManager {
    /**
     * 初始化练习
     * @param {Object} questionBank 题库对象
     * @param {string} mode 练习模式: 'sequential'(顺序) 或 'random'(随机)
     * @param {boolean} reviewMode 是否为背题模式
     */
    static init(questionBank, mode = 'sequential', reviewMode = false) {
        // 保存练习配置
        this.learningConfig = {
            bankId: questionBank.id,
            bankName: questionBank.name,
            mode: mode,
            reviewMode: reviewMode,
            currentQuestionIndex: 0,
            questions: [],
            userAnswers: {},
            reviewedQuestions: new Set(),
            markedQuestions: new Set(),
            startTime: new Date()
        };

        // 根据模式选择题目
        if (mode === 'random') {
            // 随机打乱题目顺序
            this.learningConfig.questions = this.shuffleArray([...questionBank.questions]);
        } else {
            // 顺序模式
            this.learningConfig.questions = [...questionBank.questions];
        }

        // 保存到本地存储
        this.saveLearningProgress();

        // 绑定事件
        this.bindEvents();

        // 生成左侧题目列表
        this.generateQuestionList();

        // 显示第一题
        this.renderCurrentQuestion();

        // 更新进度
        this.updateProgress();
    }

    /**
     * 打乱数组顺序
     * @param {Array} array 要打乱的数组
     * @returns {Array} 打乱后的数组
     */
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 生成左侧题目列表
     */
    static generateQuestionList() {
        const questionListElement = document.getElementById('leftSideQuestionList');
        if (!questionListElement) return;

        questionListElement.innerHTML = '';

        const { questions, userAnswers, reviewedQuestions, markedQuestions } = this.learningConfig;

        questions.forEach((_, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-number-item w-8 h-8 flex items-center justify-center rounded cursor-pointer text-sm transition-all duration-200';
            questionItem.dataset.index = index;
            questionItem.textContent = index + 1;

            // 根据状态设置样式
            if (index === this.learningConfig.currentQuestionIndex) {
                questionItem.classList.add('bg-indigo-200', 'text-indigo-800', 'font-bold');
            } else if (userAnswers.hasOwnProperty(index)) {
                questionItem.classList.add('bg-blue-200', 'text-blue-800');
            } else if (reviewedQuestions.has(index)) {
                questionItem.classList.add('bg-green-200', 'text-green-800');
            } else if (markedQuestions.has(index)) {
                questionItem.classList.add('bg-yellow-200', 'text-yellow-800');
            } else {
                questionItem.classList.add('bg-gray-200', 'text-gray-800');
            }

            // 点击事件
            questionItem.addEventListener('click', () => this.goToQuestion(index));

            questionListElement.appendChild(questionItem);
        });
    }

    /**
     * 更新题目列表中题目的状态
     */
    static updateQuestionListState() {
        const { currentQuestionIndex, userAnswers, reviewedQuestions, markedQuestions } = this.learningConfig;
        const questionItems = document.querySelectorAll('.question-number-item');

        questionItems.forEach((item, index) => {
            // 重置所有样式
            item.className = 'question-number-item w-8 h-8 flex items-center justify-center rounded cursor-pointer text-sm transition-all duration-200';
            item.textContent = index + 1;

            // 根据状态重新设置样式
            if (index === currentQuestionIndex) {
                item.classList.add('bg-indigo-200', 'text-indigo-800', 'font-bold');
            } else if (userAnswers.hasOwnProperty(index)) {
                item.classList.add('bg-blue-200', 'text-blue-800');
            } else if (reviewedQuestions.has(index)) {
                item.classList.add('bg-green-200', 'text-green-800');
            } else if (markedQuestions.has(index)) {
                item.classList.add('bg-yellow-200', 'text-yellow-800');
            } else {
                item.classList.add('bg-gray-200', 'text-gray-800');
            }
        });
    }

    /**
     * 绑定事件
     */
    static bindEvents() {
        // 导航按钮事件
        document.getElementById('prevQuestion')?.addEventListener('click', () => this.prevQuestion());
        document.getElementById('nextQuestion')?.addEventListener('click', () => this.nextQuestion());
        document.getElementById('submitAnswer')?.addEventListener('click', () => this.submitAnswer());
        document.getElementById('jumpButton')?.addEventListener('click', () => this.jumpToQuestion());
        document.getElementById('restartButton')?.addEventListener('click', () => this.restartLearning());
        document.getElementById('exitButton')?.addEventListener('click', () => this.exitLearning());

        // 背题模式切换
        document.getElementById('memorizeMode')?.addEventListener('change', (e) => {
            this.learningConfig.reviewMode = e.target.checked;
            if (e.target.checked) {
                this.showAnswer();
            }
        });
    }

    /**
     * 渲染当前题目
     */
    static renderCurrentQuestion() {
        const { questions, currentQuestionIndex, userAnswers } = this.learningConfig;
        const question = questions[currentQuestionIndex];

        if (!question) return;

        // 更新题目信息
        document.getElementById('currentQuestionNum').textContent = `第 ${currentQuestionIndex + 1} 题`;
        document.getElementById('totalQuestionNum').textContent = `共 ${questions.length} 题`;
        document.getElementById('questionType').textContent = this.getQuestionTypeText(question.type);
        document.getElementById('questionScore').textContent = `${question.score}分`;

        // 更新题目内容
        document.getElementById('questionContent').innerHTML = question.content;

        // 更新选项
        const optionsArea = document.getElementById('optionsArea');
        optionsArea.innerHTML = '';

        for (const [key, value] of Object.entries(question.options)) {
            const optionElement = document.createElement('div');
            optionElement.className = 'question-option p-3 border rounded mb-2 cursor-pointer flex items-start';
            optionElement.dataset.option = key;

            optionElement.innerHTML = `
                <div class="option-checkbox w-5 h-5 border rounded-full mr-3 mt-1 flex-shrink-0"></div>
                <div class="option-content">
                    <span class="font-semibold mr-2">${key}.</span>
                    <span>${value}</span>
                </div>
            `;

            // 绑定点击事件
            optionElement.addEventListener('click', (e) => this.handleOptionSelect(e, key));

            // 如果已有答案，显示选中状态
            const userAnswer = userAnswers[currentQuestionIndex];
            if (userAnswer && userAnswer.includes(key)) {
                this.markOptionAsSelected(optionElement);
            }

            optionsArea.appendChild(optionElement);
        }

        // 更新答案解析区域
        const analysisArea = document.getElementById('analysisArea');
        const answered = userAnswers.hasOwnProperty(currentQuestionIndex);
        const reviewed = this.learningConfig.reviewedQuestions.has(currentQuestionIndex);

        if (answered || reviewed || this.learningConfig.reviewMode) {
            analysisArea.classList.remove('hidden');
            document.getElementById('questionAnalysis').textContent = question.analysis || '暂无解析';
            if (this.learningConfig.reviewMode) {
                this.showAnswer();
            }
        } else {
            analysisArea.classList.add('hidden');
        }

        // 更新提交按钮状态
        const submitButton = document.getElementById('submitAnswer');
        if (answered) {
            submitButton.textContent = '修改答案';
        } else {
            submitButton.textContent = '提交答案';
        }

        // 更新题目列表状态
        this.updateQuestionListState();
    }

    /**
     * 处理选项选择
     * @param {Event} e 点击事件
     * @param {string} option 选项字母
     */
    static handleOptionSelect(e, option) {
        const question = this.learningConfig.questions[this.learningConfig.currentQuestionIndex];
        const isMultiple = question.type === 'multiple';
        const currentAnswers = this.learningConfig.userAnswers[this.learningConfig.currentQuestionIndex] || '';

        // 清除所有选项选中状态
        if (!isMultiple) {
            document.querySelectorAll('.question-option').forEach(opt => {
                this.unmarkOptionAsSelected(opt);
            });
        }

        // 标记当前选项
        const optionElement = e.currentTarget;
        if (currentAnswers.includes(option)) {
            // 取消选中
            this.unmarkOptionAsSelected(optionElement);
            this.learningConfig.userAnswers[this.learningConfig.currentQuestionIndex] = currentAnswers.replace(option, '').replace(',', '');
        } else {
            // 选中选项
            this.markOptionAsSelected(optionElement);
            const newAnswers = isMultiple ? 
                [...new Set([...currentAnswers.split(','), option])].filter(Boolean).join(',') : 
                option;
            this.learningConfig.userAnswers[this.learningConfig.currentQuestionIndex] = newAnswers;
        }
    }

    /**
     * 标记选项为选中状态
     * @param {HTMLElement} optionElement 选项元素
     */
    static markOptionAsSelected(optionElement) {
        optionElement.classList.add('bg-blue-50', 'border-blue-300');
        const checkbox = optionElement.querySelector('.option-checkbox');
        checkbox.classList.add('bg-blue-500', 'border-blue-500');
        checkbox.innerHTML = '<i class="fa fa-check text-white text-xs"></i>';
    }

    /**
     * 取消选项选中状态
     * @param {HTMLElement} optionElement 选项元素
     */
    static unmarkOptionAsSelected(optionElement) {
        optionElement.classList.remove('bg-blue-50', 'border-blue-300');
        const checkbox = optionElement.querySelector('.option-checkbox');
        checkbox.classList.remove('bg-blue-500', 'border-blue-500');
        checkbox.innerHTML = '';
    }

    /**
     * 提交答案
     */
    static submitAnswer() {
        const { currentQuestionIndex, questions } = this.learningConfig;
        const userAnswer = this.learningConfig.userAnswers[currentQuestionIndex];
        const question = questions[currentQuestionIndex];

        if (!userAnswer) {
            alert('请选择至少一个选项');
            return;
        }

        // 标记为已查看答案
        this.learningConfig.reviewedQuestions.add(currentQuestionIndex);

        // 显示答案解析
        const analysisArea = document.getElementById('analysisArea');
        analysisArea.classList.remove('hidden');
        document.getElementById('questionAnalysis').textContent = question.analysis || '暂无解析';

        // 显示正确答案
        this.showAnswer();

        // 保存进度
        this.saveLearningProgress();

        // 更新进度
        this.updateProgress();

        // 更新提交按钮状态
        document.getElementById('submitAnswer').textContent = '已提交';
        document.getElementById('submitAnswer').disabled = true;

        // 更新题目列表
        this.updateQuestionListState();
    }

    /**
     * 显示答案
     */
    static showAnswer() {
        const { currentQuestionIndex, questions } = this.learningConfig;
        const question = questions[currentQuestionIndex];
        const correctAnswer = question.answer;

        // 标记正确答案和错误答案
        document.querySelectorAll('.question-option').forEach(option => {
            const optionKey = option.dataset.option;
            
            // 清除之前的标记
            option.classList.remove('bg-green-100', 'border-green-300', 'bg-red-100', 'border-red-300');
            
            // 标记正确答案
            if (correctAnswer.includes(optionKey)) {
                option.classList.add('bg-green-100', 'border-green-300');
            }
            // 标记错误选择
            else if (this.learningConfig.userAnswers[currentQuestionIndex] && 
                     this.learningConfig.userAnswers[currentQuestionIndex].includes(optionKey)) {
                option.classList.add('bg-red-100', 'border-red-300');
            }
        });
    }

    /**
     * 上一题
     */
    static prevQuestion() {
        if (this.learningConfig.currentQuestionIndex > 0) {
            this.learningConfig.currentQuestionIndex--;
            this.renderCurrentQuestion();
        }
    }

    /**
     * 下一题
     */
    static nextQuestion() {
        if (this.learningConfig.currentQuestionIndex < this.learningConfig.questions.length - 1) {
            this.learningConfig.currentQuestionIndex++;
            this.renderCurrentQuestion();
        }
    }

    /**
     * 跳转到指定题目
     */
    static goToQuestion(index) {
        if (index >= 0 && index < this.learningConfig.questions.length) {
            this.learningConfig.currentQuestionIndex = index;
            this.renderCurrentQuestion();
        }
    }

    /**
     * 通过输入框跳转到题目
     */
    static jumpToQuestion() {
        const jumpInput = document.getElementById('jumpToQuestion');
        const targetQuestion = parseInt(jumpInput.value) - 1;
        
        if (!isNaN(targetQuestion) && targetQuestion >= 0 && targetQuestion < this.learningConfig.questions.length) {
            this.goToQuestion(targetQuestion);
            jumpInput.value = '';
        } else {
            alert('请输入有效的题目编号');
        }
    }

    /**
     * 更新进度
     */
    static updateProgress() {
        const { questions, userAnswers } = this.learningConfig;
        const answeredCount = Object.keys(userAnswers).length;
        const progressPercentage = (answeredCount / questions.length) * 100;

        document.getElementById('progressText').textContent = `${Math.round(progressPercentage)}%`;
        document.getElementById('progressBar').style.width = `${progressPercentage}%`;
    }

    /**
     * 获取题目类型文本
     * @param {string} type 题目类型
     * @returns {string} 中文类型文本
     */
    static getQuestionTypeText(type) {
        const typeMap = {
            'single': '单选题',
            'multiple': '多选题',
            'judge': '判断题'
        };
        return typeMap[type] || type;
    }

    /**
     * 保存学习进度
     */
    static saveLearningProgress() {
        localStorage.setItem('learning_progress', JSON.stringify(this.learningConfig));
    }

    /**
     * 恢复学习进度
     */
    static loadLearningProgress() {
        const savedProgress = localStorage.getItem('learning_progress');

        if (savedProgress) {
            try {
                this.learningConfig = JSON.parse(savedProgress);
                return true;
            } catch (error) {
                console.error('加载学习进度失败:', error);
                return false;
            }
        }

        return false;
    }

    /**
     * 继续上次学习
     */
    static continueLearning() {
        if (this.loadLearningProgress()) {
            // 绑定事件
            this.bindEvents();

            // 生成题目列表
            this.generateQuestionList();

            // 渲染当前题目
            this.renderCurrentQuestion();

            // 更新进度
            this.updateProgress();

            return true;
        }

        return false;
    }

    /**
     * 重新开始学习
     */
    static restartLearning() {
        if (confirm('确定要重新开始吗？当前进度将被清除。')) {
            // 清除进度
            localStorage.removeItem('learning_progress');

            // 重新加载页面
            location.reload();
        }
    }

    /**
     * 退出学习
     */
    static exitLearning() {
        // 保存进度
        this.saveLearningProgress();

        if (confirm('确定要退出学习吗？当前进度已保存。')) {
            window.location.href = 'index.html';
        }
    }
}