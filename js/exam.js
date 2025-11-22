/**
 * 模拟考试模块
 * 负责模拟考试的逻辑处理
 */

class ExamManager {
    /**
     * 初始化模拟考试
     * @param {Object} questionBank 题库对象
     * @param {number} questionCount 考试题目数量
     * @param {number} duration 考试时长（分钟）
     */
    static init(questionBank, questionCount = 100, duration = 120) {
        // 保存考试配置
        this.examConfig = {
            bankId: questionBank.id,
            bankName: questionBank.name,
            totalQuestions: questionCount,
            duration: duration,
            startTime: new Date(),
            endTime: new Date(Date.now() + duration * 60000),
            currentQuestionIndex: 0,
            questions: [],
            answers: {},
            status: 'in_progress',
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            skippedCount: 0,
            reviewList: []
        };
        
        // 从题库中随机选择题目
        this.examConfig.questions = this.selectRandomQuestions(questionBank.questions, questionCount);
        
        // 保存到本地存储
        this.saveExamProgress();
        
        // 绑定事件
        this.bindEvents();
        
        // 显示第一题
        this.renderCurrentQuestion();
        
        // 启动计时器
        this.startTimer();
        
        // 显示考试信息
        this.updateExamInfo();
    }

    /**
     * 从题库中随机选择指定数量的题目
     * @param {Array} allQuestions 所有题目
     * @param {number} count 需要选择的数量
     * @returns {Array} 选择的题目数组
     */
    static selectRandomQuestions(allQuestions, count) {
        // 复制数组以避免修改原数组
        const questions = [...allQuestions];
        
        // 如果题库题目数量少于请求数量，使用全部题目
        if (questions.length <= count) {
            return questions;
        }
        
        // 随机排序
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        
        // 返回前count个题目
        return questions.slice(0, count);
    }

    /**
     * 绑定考试相关事件
     */
    static bindEvents() {
        // 选项点击事件
        document.querySelectorAll('.question-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleOptionSelect(e));
        });
        
        // 导航按钮事件
        document.getElementById('prevQuestion')?.addEventListener('click', () => this.prevQuestion());
        document.getElementById('nextQuestion')?.addEventListener('click', () => this.nextQuestion());
        document.getElementById('submitExam')?.addEventListener('click', () => this.showSubmitConfirm());
        document.getElementById('confirmSubmit')?.addEventListener('click', () => this.submitExam());
        document.getElementById('cancelSubmit')?.addEventListener('click', () => this.hideSubmitConfirm());
        document.getElementById('restartExam')?.addEventListener('click', () => this.restartExam());
        document.getElementById('exitExam')?.addEventListener('click', () => this.exitExam());
        
        // 答题卡点击事件
        document.querySelectorAll('.answer-card-item').forEach(item => {
            item.addEventListener('click', (e) => this.goToQuestion(parseInt(e.currentTarget.dataset.index)));
        });
    }

    /**
     * 显示当前题目
     */
    static renderCurrentQuestion() {
        const { questions, currentQuestionIndex, answers } = this.examConfig;
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
            
            // 重置样式
            option.classList.remove('bg-blue-100', 'border-blue-500', 'bg-green-100', 'border-green-500', 'bg-red-100', 'border-red-500');
            option.classList.add('border-gray-300');
            
            // 如果已经有答案，高亮显示
            const selectedAnswer = answers[currentQuestionIndex];
            if (selectedAnswer) {
                option.classList.add('bg-blue-100', 'border-blue-500');
            }
        });
        
        // 更新当前题目指示器
        this.updateCurrentIndicator();
    }

    /**
     * 处理选项选择
     * @param {Event} e 点击事件
     */
    static handleOptionSelect(e) {
        const option = e.currentTarget;
        const selectedOption = option.dataset.option;
        const { currentQuestionIndex } = this.examConfig;
        
        // 保存答案
        this.examConfig.answers[currentQuestionIndex] = selectedOption;
        
        // 高亮选中的选项
        document.querySelectorAll('.question-option').forEach(opt => {
            opt.classList.remove('bg-blue-100', 'border-blue-500');
            opt.classList.add('border-gray-300');
        });
        
        option.classList.add('bg-blue-100', 'border-blue-500');
        
        // 更新答题卡状态
        this.updateAnswerCard();
        
        // 保存进度
        this.saveExamProgress();
    }

    /**
     * 上一题
     */
    static prevQuestion() {
        if (this.examConfig.currentQuestionIndex > 0) {
            this.examConfig.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateCurrentIndicator();
        }
    }

    /**
     * 下一题
     */
    static nextQuestion() {
        if (this.examConfig.currentQuestionIndex < this.examConfig.questions.length - 1) {
            this.examConfig.currentQuestionIndex++;
            this.renderCurrentQuestion();
            this.updateCurrentIndicator();
        }
    }

    /**
     * 跳转到指定题目
     * @param {number} index 题目索引
     */
    static goToQuestion(index) {
        if (index >= 0 && index < this.examConfig.questions.length) {
            this.examConfig.currentQuestionIndex = index;
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
            if (index === this.examConfig.currentQuestionIndex) {
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
        
        const { questions, answers } = this.examConfig;
        
        questions.forEach((_, index) => {
            const item = document.createElement('div');
            item.className = 'answer-card-item w-8 h-8 flex items-center justify-center rounded cursor-pointer text-sm';
            item.dataset.index = index;
            item.textContent = index + 1;
            
            // 根据答题状态设置样式
            if (answers.hasOwnProperty(index)) {
                item.classList.add('bg-blue-100', 'text-blue-700');
            } else {
                item.classList.add('bg-gray-100', 'text-gray-700');
            }
            
            // 点击事件
            item.addEventListener('click', () => this.goToQuestion(index));
            
            answerCard.appendChild(item);
        });
    }

    /**
     * 启动计时器
     */
    static startTimer() {
        this.timerInterval = setInterval(() => {
            const now = new Date();
            const remaining = this.examConfig.endTime - now;
            
            if (remaining <= 0) {
                // 时间到，自动提交
                clearInterval(this.timerInterval);
                this.submitExam();
                return;
            }
            
            // 计算剩余时间
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            // 更新显示
            document.getElementById('examTime').textContent = 
                `剩余时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // 剩余30分钟时显示警告
            if (remaining < 30 * 60 * 1000) {
                document.getElementById('examTime').classList.add('text-red-500');
            }
        }, 1000);
    }

    /**
     * 更新考试信息
     */
    static updateExamInfo() {
        const { bankName, totalQuestions, duration } = this.examConfig;
        
        const examTitleElement = document.getElementById('examTitle');
        if (examTitleElement) {
            examTitleElement.textContent = `模拟考试 - ${bankName}`;
        }
        const examInfoElement = document.getElementById('examInfo');
        if (examInfoElement) {
            examInfoElement.textContent = `共${totalQuestions}题，考试时长${duration}分钟`;
        }
    }

    /**
     * 保存考试进度
     */
    static saveExamProgress() {
        localStorage.setItem('exam_progress', JSON.stringify(this.examConfig));
    }

    /**
     * 恢复考试进度
     */
    static loadExamProgress() {
        const savedProgress = localStorage.getItem('exam_progress');
        
        if (savedProgress) {
            try {
                this.examConfig = JSON.parse(savedProgress);
                
                // 检查考试是否已结束
                if (this.examConfig.status === 'completed') {
                    return false;
                }
                
                // 检查时间是否已过期
                const now = new Date();
                if (now > new Date(this.examConfig.endTime)) {
                    return false;
                }
                
                // 重新计算剩余时间
                this.examConfig.endTime = new Date(
                    new Date(this.examConfig.startTime).getTime() + 
                    this.examConfig.duration * 60000
                );
                
                return true;
            } catch (error) {
                console.error('加载考试进度失败:', error);
                return false;
            }
        }
        
        return false;
    }

    /**
     * 继续考试
     */
    static continueExam() {
        if (this.loadExamProgress()) {
            // 绑定事件
            this.bindEvents();
            
            // 渲染当前题目
            this.renderCurrentQuestion();
            
            // 生成答题卡
            this.updateAnswerCard();
            
            // 启动计时器
            this.startTimer();
            
            // 更新考试信息
            this.updateExamInfo();
            
            return true;
        }
        
        return false;
    }

    /**
     * 显示提交确认对话框
     */
    static showSubmitConfirm() {
        const submitModal = document.getElementById('submitConfirmModal');
        if (submitModal) {
            submitModal.classList.remove('hidden');
            
            // 计算已答题数量
            const answeredCount = Object.keys(this.examConfig.answers).length;
            const totalCount = this.examConfig.questions.length;
            const unansweredCount = totalCount - answeredCount;
            
            const submitInfoElement = document.getElementById('submitInfo');
            if (submitInfoElement) {
                submitInfoElement.textContent = `您已回答${answeredCount}/${totalCount}题，还有${unansweredCount}题未回答，确定要提交吗？`;
            }
        }
    }

    /**
     * 隐藏提交确认对话框
     */
    static hideSubmitConfirm() {
        const submitModal = document.getElementById('submitConfirmModal');
        if (submitModal) {
            submitModal.classList.add('hidden');
        }
    }

    /**
     * 提交考试
     */
    static submitExam() {
        // 停止计时器
        clearInterval(this.timerInterval);
        
        // 计算成绩
        this.calculateScore();
        
        // 更新考试状态
        this.examConfig.status = 'completed';
        this.examConfig.completedTime = new Date();
        
        // 保存结果
        this.saveExamResult();
        
        // 显示结果页面
        this.showExamResult();
        
        // 隐藏提交确认对话框
        this.hideSubmitConfirm();
    }

    /**
     * 计算考试成绩
     */
    static calculateScore() {
        const { questions, answers } = this.examConfig;
        let correctCount = 0;
        
        questions.forEach((question, index) => {
            const userAnswer = answers[index];
            if (userAnswer === question.correctAnswer) {
                correctCount++;
            }
        });
        
        this.examConfig.correctCount = correctCount;
        this.examConfig.wrongCount = Object.keys(answers).length - correctCount;
        this.examConfig.skippedCount = questions.length - Object.keys(answers).length;
        this.examConfig.score = Math.round((correctCount / questions.length) * 100);
    }

    /**
     * 保存考试结果
     */
    static saveExamResult() {
        // 保存到结果历史
        const historyKey = 'exam_history';
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        history.unshift({
            id: Date.now(),
            bankName: this.examConfig.bankName,
            totalQuestions: this.examConfig.totalQuestions,
            score: this.examConfig.score,
            correctCount: this.examConfig.correctCount,
            wrongCount: this.examConfig.wrongCount,
            skippedCount: this.examConfig.skippedCount,
            duration: this.examConfig.duration,
            startTime: this.examConfig.startTime,
            completedTime: this.examConfig.completedTime
        });
        
        // 只保留最近10次考试记录
        if (history.length > 10) {
            history.splice(10);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(history));
        
        // 清除进度
        localStorage.removeItem('exam_progress');
    }

    /**
     * 显示考试结果
     */
    static showExamResult() {
        const { score, correctCount, wrongCount, skippedCount, totalQuestions } = this.examConfig;
        
        // 隐藏考试界面，显示结果界面
        document.getElementById('examContent')?.classList.add('hidden');
        document.getElementById('examResult')?.classList.remove('hidden');
        
        // 更新结果数据
        document.getElementById('resultScore').textContent = score;
        document.getElementById('resultCorrect').textContent = correctCount;
        document.getElementById('resultWrong').textContent = wrongCount;
        document.getElementById('resultSkipped').textContent = skippedCount;
        document.getElementById('resultTotal').textContent = totalQuestions;
        
        // 根据分数设置评级
        const rating = this.getScoreRating(score);
        document.getElementById('resultRating').textContent = rating.text;
        document.getElementById('resultRating').className = `text-2xl font-bold ${rating.className}`;
    }

    /**
     * 根据分数获取评级
     * @param {number} score 分数
     * @returns {Object} 评级信息
     */
    static getScoreRating(score) {
        if (score >= 90) {
            return { text: '优秀', className: 'text-green-600' };
        } else if (score >= 80) {
            return { text: '良好', className: 'text-blue-600' };
        } else if (score >= 60) {
            return { text: '及格', className: 'text-yellow-600' };
        } else {
            return { text: '不及格', className: 'text-red-600' };
        }
    }

    /**
     * 重新开始考试
     */
    static restartExam() {
        // 清除历史记录
        localStorage.removeItem('exam_progress');
        
        // 重新加载页面
        location.reload();
    }

    /**
     * 退出考试
     */
    static exitExam() {
        if (confirm('确定要退出考试吗？当前进度将被保存。')) {
            // 保存进度
            this.saveExamProgress();
            
            // 返回首页
            window.location.href = 'index.html';
        }
    }
}