/**
 * 学习模式模块
 * 负责顺序刷题和随机刷题功能
 */

class LearningManager {
    /**
     * 初始化学习模式
     * @param {Object} bank 题库对象
     * @param {string} mode 模式：'sequential' 顺序刷题，'random' 随机刷题
     * @param {boolean} reviewMode 是否为背题模式
     */
    static init(bank, mode = 'sequential', reviewMode = false) {
        if (!bank) {
            // 从URL参数获取题库ID
            const urlParams = new URLSearchParams(window.location.search);
            const bankId = urlParams.get('bankId');
            
            if (bankId) {
                // 获取题库
                bank = StorageManager.getQuestionBank(bankId);
                
                if (!bank) {
                    alert('题库不存在');
                    window.location.href = 'index.html';
                    return;
                }
            } else {
                alert('请选择题库');
                window.location.href = 'index.html';
                return;
            }
        }
        
        // 保存学习配置
        this.learningConfig = {
            bankId: bank.id,
            bankName: bank.name,
            mode: mode,
            reviewMode: reviewMode,
            currentQuestionIndex: 0,
            questions: [...bank.questions], // 复制题目数组
            answers: {},
            wrongQuestions: [],
            correctQuestions: [],
            totalQuestions: bank.questions.length
        };
        
        // 如果是随机模式，打乱题目顺序
        if (mode === 'random') {
            this.shuffleQuestions();
        }
        
        // 保存到本地存储
        this.saveProgress();
        
        // 绑定事件
        this.bindEvents();
        
        // 显示第一题
        this.renderCurrentQuestion();
        
        // 更新学习信息
        this.updateLearningInfo();
        
        // 更新背题模式状态
        this.updateReviewModeStatus();
    }

    /**
     * 打乱题目顺序
     */
    static shuffleQuestions() {
        const questions = this.learningConfig.questions;
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
    }

    /**
     * 绑定学习相关事件
     */
    static bindEvents() {
        // 选项点击事件
        document.querySelectorAll('.question-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleOptionSelect(e));
        });
        
        // 导航按钮事件
        document.getElementById('prevQuestion')?.addEventListener('click', () => this.prevQuestion());
        document.getElementById('nextQuestion')?.addEventListener('click', () => this.nextQuestion());
        document.getElementById('checkAnswer')?.addEventListener('click', () => this.checkAnswer());
        document.getElementById('showAnswer')?.addEventListener('click', () => this.showAnswer());
        document.getElementById('toggleReviewMode')?.addEventListener('click', () => this.toggleReviewMode());
        document.getElementById('restartLearning')?.addEventListener('click', () => this.restartLearning());
        document.getElementById('exitLearning')?.addEventListener('click', () => this.exitLearning());
        
        // 答题卡点击事件
        document.querySelectorAll('.answer-card-item').forEach(item => {
            item.addEventListener('click', (e) => this.goToQuestion(parseInt(e.currentTarget.dataset.index)));
        });
    }

    /**
     * 显示当前题目
     */
    static renderCurrentQuestion() {
        const { questions, currentQuestionIndex, answers, reviewMode } = this.learningConfig;
        const question = questions[currentQuestionIndex];
        
        if (!question) return;
        
        // 更新题目内容
        document.getElementById('questionNumber').textContent = `第${currentQuestionIndex + 1}题/${questions.length}题`;
        document.getElementById('questionContent').textContent = question.content;
        
        // 更新选项
        const options = document.querySelectorAll('.question-option');
        const optionLetters = ['A', 'B', 'C', 'D'];
        
        options.forEach((option, index) => {
            const letter = optionLetters[index];
            const optionContent = question[`option${letter}`] || '';
            
            option.textContent = `${letter}. ${optionContent}`;
            option.dataset.option = letter;
            option.dataset.correct = letter === question.correctAnswer;
            
            // 重置样式
            option.classList.remove('bg-blue-100', 'border-blue-500', 'bg-green-100', 'border-green-500', 'bg-red-100', 'border-red-500');
            option.classList.add('border-gray-300');
            
            // 如果已经有答案，高亮显示
            const selectedAnswer = answers[currentQuestionIndex];
            if (selectedAnswer) {
                // 显示正确/错误状态
                if (selectedAnswer === question.correctAnswer) {
                    option.classList.add('bg-green-100', 'border-green-500');
                } else {
                    option.classList.add('bg-red-100', 'border-red-500');
                    // 同时高亮正确答案
                    const correctOption = Array.from(options).find(opt => opt.dataset.option === question.correctAnswer);
                    if (correctOption) {
                        correctOption.classList.add('bg-green-100', 'border-green-500');
                    }
                }
            }
        });
        
        // 背题模式下自动显示答案
        if (reviewMode) {
            this.showAnswer();
        }
        
        // 更新当前题目指示器
        this.updateCurrentIndicator();
        
        // 更新按钮状态
        this.updateButtonStates();
    }

    /**
     * 处理选项选择
     * @param {Event} e 点击事件
     */
    static handleOptionSelect(e) {
        if (this.learningConfig.reviewMode) return; // 背题模式下不能选择
        
        const option = e.currentTarget;
        const selectedOption = option.dataset.option;
        const { currentQuestionIndex, questions } = this.learningConfig;
        const question = questions[currentQuestionIndex];
        
        // 保存答案
        this.learningConfig.answers[currentQuestionIndex] = selectedOption;
        
        // 判断对错
        if (selectedOption === question.correctAnswer) {
            this.learningConfig.correctQuestions.push(currentQuestionIndex);
        } else {
            this.learningConfig.wrongQuestions.push(currentQuestionIndex);
        }
        
        // 显示结果
        this.renderCurrentQuestion();
        
        // 更新答题卡状态
        this.updateAnswerCard();
        
        // 保存进度
        this.saveProgress();
    }

    /**
     * 检查答案
     */
    static checkAnswer() {
        const { currentQuestionIndex, questions } = this.learningConfig;
        
        // 如果已经回答过，直接显示结果
        if (this.learningConfig.answers.hasOwnProperty(currentQuestionIndex)) {
            this.renderCurrentQuestion();
            return;
        }
        
        // 否则显示正确答案
        this.showAnswer();
    }

    /**
     * 显示答案
     */
    static showAnswer() {
        const { currentQuestionIndex, questions } = this.learningConfig;
        const question = questions[currentQuestionIndex];
        const options = document.querySelectorAll('.question-option');
        
        // 高亮正确答案
        options.forEach(option => {
            option.classList.remove('bg-blue-100', 'border-blue-500', 'bg-green-100', 'border-green-500', 'bg-red-100', 'border-red-500');
            
            if (option.dataset.option === question.correctAnswer) {
                option.classList.add('bg-green-100', 'border-green-500');
            } else {
                option.classList.add('border-gray-300');
            }
        });
        
        // 保存查看记录
        this.learningConfig.answers[currentQuestionIndex] = '_viewed'; // 标记为已查看
        
        // 更新答题卡
        this.updateAnswerCard();
        
        // 保存进度
        this.saveProgress();
    }

    /**
     * 上一题
     */
    static prevQuestion() {
        if (this.learningConfig.currentQuestionIndex > 0) {
            this.learningConfig.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateCurrentIndicator();
        }
    }

    /**
     * 下一题
     */
    static nextQuestion() {
        if (this.learningConfig.currentQuestionIndex < this.learningConfig.questions.length - 1) {
            this.learningConfig.currentQuestionIndex++;
            this.renderCurrentQuestion();
            this.updateCurrentIndicator();
        } else {
            // 完成学习
            this.completeLearning();
        }
    }

    /**
     * 跳转到指定题目
     * @param {number} index 题目索引
     */
    static goToQuestion(index) {
        if (index >= 0 && index < this.learningConfig.questions.length) {
            this.learningConfig.currentQuestionIndex = index;
            this.renderCurrentQuestion();
            this.updateCurrentIndicator();
        }
    }

    /**
     * 更新当前题目指示器
     */
    static updateCurrentIndicator() {
        document.querySelectorAll('.answer-card-item').forEach((item, index) => {
            item.classList.remove('ring-2', 'ring-blue-500');
            if (index === this.learningConfig.currentQuestionIndex) {
                item.classList.add('ring-2', 'ring-blue-500');
            }
        });
    }

    /**
     * 更新答题卡状态
     */
    static updateAnswerCard() {
        const answerCard = document.getElementById('answerCard');
        if (!answerCard) return;
        
        answerCard.innerHTML = '';
        
        const { questions, answers, correctQuestions, wrongQuestions } = this.learningConfig;
        
        questions.forEach((_, index) => {
            const item = document.createElement('div');
            item.className = 'answer-card-item w-8 h-8 flex items-center justify-center rounded cursor-pointer text-sm';
            item.dataset.index = index;
            item.textContent = index + 1;
            
            // 根据答题状态设置样式
            if (answers.hasOwnProperty(index)) {
                if (answers[index] === '_viewed') {
                    // 已查看但未作答
                    item.classList.add('bg-yellow-100', 'text-yellow-700');
                } else if (correctQuestions.includes(index)) {
                    // 答对
                    item.classList.add('bg-green-100', 'text-green-700');
                } else if (wrongQuestions.includes(index)) {
                    // 答错
                    item.classList.add('bg-red-100', 'text-red-700');
                }
            } else {
                // 未作答
                item.classList.add('bg-gray-100', 'text-gray-700');
            }
            
            // 点击事件
            item.addEventListener('click', () => this.goToQuestion(index));
            
            answerCard.appendChild(item);
        });
    }

    /**
     * 更新学习信息
     */
    static updateLearningInfo() {
        const { bankName, mode } = this.learningConfig;
        const modeText = mode === 'sequential' ? '顺序刷题' : '随机刷题';
        
        const learningTitleElement = document.getElementById('learningTitle');
        if (learningTitleElement) {
            learningTitleElement.textContent = `${modeText} - ${bankName}`;
        }
    }

    /**
     * 更新背题模式状态
     */
    static updateReviewModeStatus() {
        const { reviewMode } = this.learningConfig;
        const toggleBtn = document.getElementById('toggleReviewMode');
        
        if (toggleBtn) {
            toggleBtn.textContent = reviewMode ? '退出背题模式' : '开启背题模式';
            toggleBtn.className = reviewMode ? 
                'px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600' : 
                'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600';
        }
        
        // 在背题模式下禁用选项点击
        document.querySelectorAll('.question-option').forEach(option => {
            option.style.pointerEvents = reviewMode ? 'none' : 'auto';
        });
    }

    /**
     * 切换背题模式
     */
    static toggleReviewMode() {
        this.learningConfig.reviewMode = !this.learningConfig.reviewMode;
        
        // 重新渲染当前题目
        this.renderCurrentQuestion();
        
        // 更新状态
        this.updateReviewModeStatus();
        
        // 保存配置
        this.saveProgress();
    }

    /**
     * 更新按钮状态
     */
    static updateButtonStates() {
        const { currentQuestionIndex, questions, answers } = this.learningConfig;
        
        // 上一题按钮
        document.getElementById('prevQuestion').disabled = currentQuestionIndex === 0;
        
        // 下一题按钮
        document.getElementById('nextQuestion').disabled = currentQuestionIndex === questions.length - 1;
        
        // 检查答案按钮
        const hasAnswered = answers.hasOwnProperty(currentQuestionIndex);
        document.getElementById('checkAnswer').disabled = hasAnswered;
        
        // 显示答案按钮
        document.getElementById('showAnswer').disabled = answers.hasOwnProperty(currentQuestionIndex) && answers[currentQuestionIndex] !== '_viewed';
    }

    /**
     * 保存学习进度
     */
    static saveProgress() {
        localStorage.setItem('learning_progress', JSON.stringify(this.learningConfig));
    }

    /**
     * 加载学习进度
     */
    static loadProgress() {
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
     * 继续学习
     */
    static continueLearning() {
        if (this.loadProgress()) {
            // 绑定事件
            this.bindEvents();
            
            // 渲染当前题目
            this.renderCurrentQuestion();
            
            // 生成答题卡
            this.updateAnswerCard();
            
            // 更新学习信息
            this.updateLearningInfo();
            
            // 更新背题模式状态
            this.updateReviewModeStatus();
            
            return true;
        }
        
        return false;
    }

    /**
     * 完成学习
     */
    static completeLearning() {
        const { correctQuestions, wrongQuestions, totalQuestions } = this.learningConfig;
        const correctCount = correctQuestions.length;
        const wrongCount = wrongQuestions.length;
        const unAnsweredCount = totalQuestions - correctCount - wrongCount;
        
        // 显示完成提示
        if (confirm(`学习完成！\n\n答对: ${correctCount}题\n答错: ${wrongCount}题\n未答: ${unAnsweredCount}题\n\n是否重新开始？`)) {
            this.restartLearning();
        } else {
            this.exitLearning();
        }
    }

    /**
     * 重新开始学习
     */
    static restartLearning() {
        // 清除进度
        localStorage.removeItem('learning_progress');
        
        // 重新加载页面
        location.reload();
    }

    /**
     * 退出学习
     */
    static exitLearning() {
        // 保存进度
        this.saveProgress();
        
        // 返回首页
        window.location.href = 'index.html';
    }

    /**
     * 生成学习报告
     * @returns {Object} 学习报告数据
     */
    static generateReport() {
        const { correctQuestions, wrongQuestions, totalQuestions, questions } = this.learningConfig;
        
        // 计算正确率
        const correctRate = totalQuestions > 0 ? (correctQuestions.length / totalQuestions) * 100 : 0;
        
        // 收集错题
        const wrongQuestionsList = wrongQuestions.map(index => ({
            index: index,
            question: questions[index]
        }));
        
        return {
            totalQuestions,
            correctCount: correctQuestions.length,
            wrongCount: wrongQuestions.length,
            correctRate: Math.round(correctRate),
            wrongQuestions: wrongQuestionsList,
            completed: correctQuestions.length + wrongQuestions.length === totalQuestions
        };
    }

    /**
     * 只复习错题
     */
    static reviewWrongQuestions() {
        const { wrongQuestions, questions } = this.learningConfig;
        
        if (wrongQuestions.length === 0) {
            alert('没有错题需要复习！');
            return;
        }
        
        // 提取错题
        const wrongQuestionsList = wrongQuestions.map(index => questions[index]);
        
        // 更新配置
        this.learningConfig.questions = wrongQuestionsList;
        this.learningConfig.currentQuestionIndex = 0;
        this.learningConfig.answers = {};
        this.learningConfig.wrongQuestions = [];
        this.learningConfig.correctQuestions = [];
        
        // 重新渲染
        this.renderCurrentQuestion();
        this.updateAnswerCard();
        this.saveProgress();
    }
}