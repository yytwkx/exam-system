/**
 * 学习管理器
 * 负责处理顺序刷题、随机刷题和背题模式的所有逻辑
 */

class LearningManager {
    /**
     * 初始化学习模式
     * @param {Object} bank 题库对象
     * @param {string} mode 学习模式：sequential（顺序）或random（随机）
     * @param {boolean} reviewMode 是否为背题模式
     */
    static init(bank, mode = 'sequential', reviewMode = false) {
        console.log('初始化学习模式...', { bank, mode, reviewMode });
        
        // 保存当前题库信息
        this.currentBank = bank;
        
        // 保存学习模式
        this.mode = mode;
        
        // 保存背题模式状态
        this.reviewMode = reviewMode;
        
        // 根据模式生成题目列表
        this.learningQuestions = this.generateLearningQuestions(bank.questions, mode);
        
        // 初始化用户答案记录
        this.answers = {};
        
        // 初始化学习状态
        this.currentQuestionIndex = 0;
        this.viewedAnswers = {}; // 记录哪些题目已经查看过答案
        this.markedQuestions = new Set(); // 标记的题目
        this.questionResults = {}; // 记录每道题的答题结果 {index: {correct: boolean, userAnswer: string}}
        this._optionEventsBound = false; // 标记选项事件是否已绑定
        this._eventsBound = false; // 标记按钮事件是否已绑定
        
        // 渲染界面
        this.renderLearningHeader();
        this.renderCurrentQuestion();
        this.renderQuestionNavigation();
        
        // 更新按钮状态
        this.updateShowAnswerButton();
        
        // 绑定事件
        this.bindEvents();
        this.bindOptionEvents();
        
        // 保存学习进度
        this.saveProgress();
        
        console.log('学习模式初始化完成', { 
            totalQuestions: this.learningQuestions.length,
            mode: this.mode,
            reviewMode: this.reviewMode
        });
    }

    /**
     * 生成学习题目列表
     * @param {Array} allQuestions 题库所有题目
     * @param {string} mode 学习模式
     * @returns {Array} 学习题目列表
     */
    static generateLearningQuestions(allQuestions, mode) {
        // 深拷贝题目列表
        const questions = JSON.parse(JSON.stringify(allQuestions));
        
        if (mode === 'random') {
            // 按题型分类
            const singleQuestions = questions.filter(q => q.type === 'single');
            const multipleQuestions = questions.filter(q => q.type === 'multiple');
            const judgeQuestions = questions.filter(q => q.type === 'judge');
            
            // 分别随机打乱（在同一类题型里面进行随机）
            this.shuffleArray(singleQuestions);
            this.shuffleArray(multipleQuestions);
            this.shuffleArray(judgeQuestions);
            
            // 按顺序合并：单选、多选、判断
            return [...singleQuestions, ...multipleQuestions, ...judgeQuestions];
        }
        
        return questions;
    }

    /**
     * 渲染学习头部信息
     */
    static renderLearningHeader() {
        const headerElement = document.getElementById('learningHeader');
        if (!headerElement) return;
        
        headerElement.innerHTML = `
            <div class="learning-info bg-white p-4 rounded-lg shadow mb-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">${this.currentBank.name}</h2>
                        <div class="flex items-center mt-2 space-x-4">
                            <span class="text-gray-600">
                                <span id="currentQuestionNumber">第${this.currentQuestionIndex + 1}题</span>
                                <span> / </span>
                                <span>共${this.learningQuestions.length}题</span>
                            </span>
                            <span class="text-blue-600">
                                ${this.mode === 'sequential' ? '顺序刷题' : '随机刷题'}
                            </span>
                            ${this.reviewMode ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">背题模式</span>' : ''}
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button id="toggleReviewModeBtn" class="px-3 py-1 ${this.reviewMode ? 'bg-yellow-500' : 'bg-green-500'} text-white rounded text-sm hover:opacity-90 transition">
                            ${this.reviewMode ? '关闭背题' : '开启背题'}
                        </button>
                        <button id="toggleModeBtn" class="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:opacity-90 transition">
                            切换为${this.mode === 'sequential' ? '随机' : '顺序'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染当前题目
     */
    static renderCurrentQuestion() {
        // 更新题目编号和类型
        const questionNumber = document.getElementById('questionNumber');
        const questionType = document.getElementById('questionType');
        const questionContent = document.getElementById('questionContent');
        const optionsArea = document.getElementById('optionsArea');
        const explanation = document.getElementById('explanation');
        
        if (!questionContent || !optionsArea) return;
        
        const currentQuestion = this.learningQuestions[this.currentQuestionIndex];
        if (!currentQuestion) return;
        
        // 更新题目信息
        if (questionNumber) {
            questionNumber.textContent = `第 ${this.currentQuestionIndex + 1}/${this.learningQuestions.length} 题`;
        }
        
        if (questionType) {
            const typeMap = {
                'single': '单选题',
                'multiple': '多选题',
                'judge': '判断题'
            };
            questionType.textContent = typeMap[currentQuestion.type] || '单选题';
        }
        
        // 更新题目状态（未作答/已作答）
        const questionStatus = document.getElementById('questionStatus');
        if (questionStatus) {
            const userAnswer = this.answers[this.currentQuestionIndex];
            if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
                questionStatus.textContent = '已作答';
                questionStatus.classList.remove('bg-green-100');
                questionStatus.classList.add('bg-blue-100');
            } else {
                questionStatus.textContent = '未作答';
                questionStatus.classList.remove('bg-blue-100');
                questionStatus.classList.add('bg-green-100');
            }
        }
        
        // 格式化题目内容
        const formattedContent = this.formatQuestionContent(currentQuestion.content);
        questionContent.innerHTML = formattedContent;
        
        // 渲染选项
        optionsArea.innerHTML = '';
        const optionsHTML = this.renderOptions(currentQuestion.options, currentQuestion);
        optionsArea.innerHTML = optionsHTML;
        
        // 检查是否显示答案和解析（只有在查看答案或背题模式下才显示）
        const showAnswer = this.reviewMode || this.viewedAnswers[this.currentQuestionIndex] === true;
        const result = this.questionResults[this.currentQuestionIndex];
        const userAnswer = this.answers[this.currentQuestionIndex];
        
        if (explanation) {
            if (showAnswer) {
                let answerDisplay = '';
                if (result && userAnswer) {
                    // 已经判定过，显示答案对比
                    const isCorrect = result.correct;
                    answerDisplay = `
                        <div class="mt-2 flex items-center flex-wrap">
                            <span class="font-semibold text-gray-700 mr-2">您的答案：</span>
                            <span class="text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'} font-bold mr-4">${userAnswer}</span>
                            <span class="font-semibold text-gray-700 mr-2">正确答案：</span>
                            <span class="text-lg text-green-600 font-bold">${currentQuestion.answer}</span>
                        </div>
                    `;
                } else if (userAnswer) {
                    // 有答案但还没判定，只显示正确答案
                    answerDisplay = `
                        <div class="mt-2 flex items-center flex-wrap">
                            <span class="font-semibold text-gray-700 mr-2">您的答案：</span>
                            <span class="text-lg text-gray-600 font-bold mr-4">${userAnswer}</span>
                            <span class="font-semibold text-gray-700 mr-2">正确答案：</span>
                            <span class="text-lg text-green-600 font-bold">${currentQuestion.answer}</span>
                        </div>
                    `;
                } else {
                    // 没有答案，只显示正确答案
                    answerDisplay = `<p class="mt-2 text-green-600 font-semibold">正确答案：${currentQuestion.answer}</p>`;
                }
                
                explanation.innerHTML = `
                    <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h4 class="font-bold mb-2">答案解析：</h4>
                        <p class="text-gray-700">${currentQuestion.analysis || '暂无解析'}</p>
                        ${answerDisplay}
                    </div>
                `;
            } else {
                // 不显示答案
                explanation.innerHTML = '';
            }
        }
        
        // 设置已选答案
        const selectedAnswer = this.answers[this.currentQuestionIndex];
        if (selectedAnswer) {
            // 处理多选题（答案可能是逗号分隔的）
            const selectedAnswers = selectedAnswer.split(',').map(a => a.trim());
            selectedAnswers.forEach(ans => {
                // 尝试精确匹配
                let input = document.querySelector(`input[name="option"][value="${ans}"]`);
                // 如果精确匹配失败，尝试大小写不敏感匹配
                if (!input) {
                    const allInputs = document.querySelectorAll(`input[name="option"]`);
                    allInputs.forEach(inp => {
                        if (inp.value.toUpperCase() === ans.toUpperCase()) {
                            input = inp;
                        }
                    });
                }
                if (input) {
                    input.checked = true;
                } else {
                    console.warn('找不到对应的选项:', ans, '当前题目选项:', Object.keys(currentQuestion.options || {}));
                }
            });
        }
        
        // 如果是背题模式，自动显示答案
        if (this.reviewMode && !this.viewedAnswers[this.currentQuestionIndex]) {
            this.viewedAnswers[this.currentQuestionIndex] = true;
            // 重新渲染以显示答案
            this.renderCurrentQuestion();
        }
        
        // 更新标记按钮状态
        this.updateMarkButton();
        
        // 更新查看答案按钮文本
        this.updateShowAnswerButton();
        
        // 重新绑定选项事件
        this.bindOptionEvents();
    }
    
    /**
     * 更新查看答案按钮文本和切换模式按钮
     */
    static updateShowAnswerButton() {
        const showAnswerBtn = document.getElementById('showAnswerBtn');
        const toggleReviewModeBtn = document.getElementById('toggleReviewModeBtn');
        
        const isViewing = this.viewedAnswers[this.currentQuestionIndex] === true;
        
        // 更新查看答案按钮
        if (showAnswerBtn) {
            if (isViewing) {
                showAnswerBtn.innerHTML = '<i class="fa fa-eye-slash mr-2"></i>隐藏答案';
                showAnswerBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                showAnswerBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
            } else {
                showAnswerBtn.innerHTML = '<i class="fa fa-eye mr-2"></i>查看答案';
                showAnswerBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                showAnswerBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
            }
        }
        
        // 更新切换模式按钮
        if (toggleReviewModeBtn) {
            if (this.reviewMode) {
                toggleReviewModeBtn.innerHTML = '<i class="fa fa-edit mr-2"></i>刷题模式';
                toggleReviewModeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                toggleReviewModeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
            } else {
                toggleReviewModeBtn.innerHTML = '<i class="fa fa-book mr-2"></i>背题模式';
                toggleReviewModeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                toggleReviewModeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            }
        }
    }
    
    /**
     * 绑定选项事件（使用全局事件委托，避免重复绑定）
     */
    static bindOptionEvents() {
        // 使用全局事件委托，这样即使DOM更新也不会丢失事件
        // 只在第一次调用时绑定
        if (this._optionEventsBound) return;
        
        document.addEventListener('change', (e) => {
            if (e.target.name === 'option' && e.target.closest('#optionsArea')) {
                try {
                    const question = this.learningQuestions[this.currentQuestionIndex];
                    if (!question) return;
                    
                    const isMultiple = question.type === 'multiple';
                    
                    if (isMultiple) {
                        // 多选题：收集所有选中的选项
                        const optionsArea = document.getElementById('optionsArea');
                        if (optionsArea) {
                            const selectedOptions = Array.from(optionsArea.querySelectorAll('input[name="option"]:checked'))
                                .map(opt => opt.value)
                                .sort()
                                .join(',');
                            if (selectedOptions) {
                                this.saveAnswer(this.currentQuestionIndex, selectedOptions);
                            }
                        }
                    } else {
                        // 单选题或判断题：直接保存
                        this.saveAnswer(this.currentQuestionIndex, e.target.value);
                    }
                    
                    // 更新导航栏（使用 requestAnimationFrame 优化性能，不阻塞）
                    requestAnimationFrame(() => {
                        this.renderQuestionNavigation();
                    });
                } catch (error) {
                    console.error('选项选择事件处理出错:', error);
                }
            }
        });
        
        this._optionEventsBound = true;
    }

    /**
     * 格式化题目内容
     * @param {string} content 题目内容
     * @returns {string} 格式化后的内容
     */
    static formatQuestionContent(content) {
        if (!content) return '';
        
        // 替换换行符为<br>
        return content.replace(/\n/g, '<br>');
    }

    /**
     * 渲染选项
     * @param {Object} options 选项数据
     * @param {Object} question 题目对象
     * @returns {string} HTML字符串
     */
    static renderOptions(options, question) {
        if (!options || Object.keys(options).length === 0) {
            return '<p class="text-red-500">题目缺少选项</p>';
        }
        
        let html = '';
        const showAnswer = this.reviewMode || this.viewedAnswers[this.currentQuestionIndex] === true;
        const userAnswer = this.answers[this.currentQuestionIndex];
        const isMultiple = question.type === 'multiple';
        const inputType = isMultiple ? 'checkbox' : 'radio';
        
        // 处理正确答案（可能是逗号分隔的）
        const correctAnswers = question.answer.split(',').map(a => a.trim().toUpperCase());
        
        // 遍历选项
        Object.entries(options).forEach(([key, value]) => {
            const keyUpper = key.toUpperCase();
            let labelClass = 'flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition mb-2';
            
            // 如果显示答案，标记正确和错误选项
            if (showAnswer) {
                if (correctAnswers.includes(keyUpper)) {
                    labelClass += ' bg-green-50 border-green-300';
                } else if (userAnswer && userAnswer.toUpperCase().includes(keyUpper)) {
                    labelClass += ' bg-red-50 border-red-300';
                }
            }
            
            // 单选题和判断题支持双击跳转（非背题模式）
            const doubleClickAttr = (!this.reviewMode && (question.type === 'single' || question.type === 'judge')) 
                ? 'ondblclick="LearningManager.handleOptionDoubleClick(event)"' 
                : '';
            
            html += `
                <label class="${labelClass}" ${doubleClickAttr}>
                    <input type="${inputType}" name="option" value="${key}" class="mr-3 w-4 h-4" ${this.reviewMode ? 'disabled' : ''}>
                    <span class="option-key font-medium mr-2">${key}.</span>
                    <span class="option-value">${value}</span>
                    ${showAnswer && correctAnswers.includes(keyUpper) ? '<span class="ml-2 text-green-600 font-medium">✓ 正确答案</span>' : ''}
                </label>
            `;
        });
        
        return html;
    }
    
    /**
     * 处理选项双击事件（单选题和判断题双击后自动跳转下一题）
     * @param {Event} event 事件对象
     */
    static handleOptionDoubleClick(event) {
        // 如果是背题模式，不处理双击
        if (this.reviewMode) return;
        
        // 获取当前题目
        const currentQuestion = this.learningQuestions[this.currentQuestionIndex];
        if (!currentQuestion) return;
        
        // 只处理单选题和判断题
        if (currentQuestion.type !== 'single' && currentQuestion.type !== 'judge') return;
        
        // 阻止事件冒泡
        event.stopPropagation();
        
        // 获取被双击的选项
        const label = event.currentTarget;
        const input = label.querySelector('input[name="option"]');
        if (!input) return;
        
        // 选中该选项
        input.checked = true;
        
        // 保存答案
        this.saveAnswer(this.currentQuestionIndex, input.value);
        
        // 更新导航栏
        this.renderQuestionNavigation();
        
        // 如果不是最后一题，自动跳转到下一题
        if (this.currentQuestionIndex < this.learningQuestions.length - 1) {
            // 延迟一小段时间，让用户看到选项被选中
            setTimeout(() => {
                this.nextQuestion();
            }, 200);
        } else {
            // 如果是最后一题，提示已完成
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('已是最后一题', 'info');
            }
        }
    }

    /**
     * 渲染答案
     * @param {string} correctAnswer 正确答案
     * @param {string} userAnswer 用户答案
     * @returns {string} HTML字符串
     */
    static renderAnswer(correctAnswer, userAnswer) {
        const isCorrect = userAnswer === correctAnswer;
        
        return `
            <div class="answer-section mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
                <div class="flex items-center mb-2">
                    <h4 class="font-semibold text-gray-800">答案解析</h4>
                </div>
                <p class="mb-2">
                    <span class="font-medium">正确答案: </span>
                    <span class="${isCorrect ? 'text-green-600' : 'text-green-600 font-bold'}">${correctAnswer}</span>
                </p>
                ${userAnswer && userAnswer !== correctAnswer ? `
                <p>
                    <span class="font-medium">您的答案: </span>
                    <span class="text-red-600">${userAnswer}</span>
                </p>
                ` : ''}
                ${isCorrect ? '<p class="text-green-600 mt-2">恭喜你答对了！</p>' : '<p class="text-red-600 mt-2">再接再厉！</p>'}
            </div>
        `;
    }

    /**
     * 渲染题目导航
     */
    static renderQuestionNavigation() {
        const navElement = document.getElementById('questionListContainer');
        if (!navElement) return;
        
        navElement.innerHTML = '';
        
        // 生成导航按钮
        this.learningQuestions.forEach((question, index) => {
            const button = document.createElement('button');
            button.className = 'question-nav-btn w-8 h-8 rounded text-xs font-medium transition-all duration-200 hover:scale-110';
            button.textContent = index + 1;
            button.dataset.index = index;
            
            // 获取题目状态并设置颜色
            const status = this.getQuestionStatus(index);
            this.applyQuestionButtonStyle(button, status, index);
            
            // 绑定点击事件
            button.addEventListener('click', () => {
                this.jumpToQuestion(index);
            });
            
            navElement.appendChild(button);
        });
        
        // 更新进度条
        this.updateProgress();
    }
    
    /**
     * 应用题目按钮样式
     * @param {HTMLElement} button 按钮元素
     * @param {string} status 状态
     * @param {number} index 题目索引
     */
    static applyQuestionButtonStyle(button, status, index) {
        // 清除所有状态类
        button.className = 'question-nav-btn w-8 h-8 rounded text-xs font-medium transition-all duration-200 hover:scale-110';
        
        // 当前题目
        if (index === this.currentQuestionIndex) {
            button.classList.add('bg-indigo-500', 'text-white', 'ring-2', 'ring-indigo-300', 'ring-offset-2');
            return;
        }
        
        // 标记的题目（黄色，优先级较高）
        if (this.markedQuestions.has(index)) {
            button.classList.add('bg-yellow-400', 'text-gray-800');
            return;
        }
        
        // 已作答的题目
        if (this.answers[index] !== undefined) {
            const result = this.questionResults[index];
            if (result) {
                // 已经判定过
                if (result.correct) {
                    // 答对：蓝色
                    button.classList.add('bg-blue-500', 'text-white');
                } else {
                    // 答错：红色
                    button.classList.add('bg-red-500', 'text-white');
                }
            } else {
                // 已作答但未判定：显示为已作答（浅蓝色）
                button.classList.add('bg-blue-200', 'text-gray-700');
            }
            return;
        }
        
        // 未作答：灰色
        button.classList.add('bg-gray-200', 'text-gray-700');
    }
    
    /**
     * 更新进度条
     */
    static updateProgress() {
        const total = this.learningQuestions.length;
        const answered = Object.keys(this.answers).length;
        const progress = total > 0 ? Math.round((answered / total) * 100) : 0;
        
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
    }

    /**
     * 获取题目状态
     * @param {number} index 题目索引
     * @returns {string} 状态
     */
    static getQuestionStatus(index) {
        if (index === this.currentQuestionIndex) {
            return 'current';
        }
        
        if (this.markedQuestions.has(index)) {
            return 'marked';
        }
        
        if (this.answers[index] !== undefined) {
            const result = this.questionResults[index];
            if (result && result.correct) {
                return 'correct';
            } else if (result && !result.correct) {
                return 'incorrect';
            }
            return 'answered';
        }
        
        return 'unanswered';
    }

    /**
     * 获取状态对应的CSS类
     * @param {string} status 状态
     * @returns {string} CSS类名
     */
    static getStatusClass(status) {
        switch (status) {
            case 'current':
                return 'bg-indigo-200 font-bold';
            case 'viewed':
                return 'bg-green-200';
            case 'answered':
                return 'bg-blue-200';
            case 'marked':
                return 'bg-yellow-200';
            default:
                return 'bg-gray-200';
        }
    }

    /**
     * 绑定事件（使用事件委托，避免重复绑定问题）
     */
    static bindEvents() {
        // 使用事件委托，避免重复绑定问题
        // 只在第一次调用时绑定全局事件
        if (this._eventsBound) return;
        
        // 使用事件委托绑定所有按钮点击事件（直接绑定，不使用延迟）
        document.addEventListener('click', (e) => {
            const target = e.target;
            const targetId = target.id;
            const targetParent = target.closest('button');
            const parentId = targetParent?.id;
            
            try {
                // 上一题按钮
                if (targetId === 'prevQuestionBtn' || parentId === 'prevQuestionBtn') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.prevQuestion();
                    return;
                }
                
                // 下一题按钮
                if (targetId === 'nextQuestionBtn' || parentId === 'nextQuestionBtn') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextQuestion();
                    return;
                }
                
                // 显示答案按钮
                if (targetId === 'showAnswerBtn' || parentId === 'showAnswerBtn') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAnswer();
                    return;
                }
                
                // 标记题目按钮
                if (targetId === 'markQuestionBtn' || parentId === 'markQuestionBtn') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMark();
                    return;
                }
            } catch (error) {
                console.error('按钮点击事件处理出错:', error);
            }
        });
        
        this._eventsBound = true;
        
        // 键盘快捷键：左右箭头键切换题目
        document.addEventListener('keydown', (e) => {
            // 如果正在输入框中输入，不处理快捷键
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            // 左箭头键：上一题
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevQuestion();
            }
            // 右箭头键：下一题
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextQuestion();
            }
        });
        
        // 其他按钮的事件绑定（使用事件委托）
        document.addEventListener('click', (e) => {
            // 跳转按钮
            if (e.target.id === 'jumpButton' || e.target.closest('#jumpButton')) {
                e.preventDefault();
                this.jumpToSpecificQuestion();
                return;
            }
            
            // 重新开始按钮
            if (e.target.id === 'restartButton' || e.target.closest('#restartButton')) {
                e.preventDefault();
                this.restartLearning();
                return;
            }
            
            // 退出按钮
            if (e.target.id === 'exitButton' || e.target.closest('#exitButton')) {
                e.preventDefault();
                this.exitLearning();
                return;
            }
            
            // 重置进度按钮
            if (e.target.id === 'resetProgressBtn' || e.target.closest('#resetProgressBtn')) {
                e.preventDefault();
                this.resetProgress();
                return;
            }
            
            // 复习标记题按钮
            if (e.target.id === 'reviewMarkedBtn' || e.target.closest('#reviewMarkedBtn')) {
                e.preventDefault();
                this.reviewMarkedQuestions();
                return;
            }
            
            // 切换背题模式按钮
            if (e.target.id === 'toggleReviewModeBtn' || e.target.closest('#toggleReviewModeBtn')) {
                e.preventDefault();
                this.toggleReviewMode();
                return;
            }
            
            // 切换学习模式按钮
            if (e.target.id === 'toggleModeBtn' || e.target.closest('#toggleModeBtn')) {
                e.preventDefault();
                this.toggleLearningMode();
                return;
            }
            
            // 返回首页按钮
            if (e.target.id === 'backToHome' || e.target.closest('#backToHome')) {
                e.preventDefault();
                this.saveProgress();
                AppManager.backToHome();
                return;
            }
            
            // 切换为随机模式按钮（顺序刷题页面）
            if (e.target.id === 'toggleRandomMode' || e.target.closest('#toggleRandomMode')) {
                e.preventDefault();
                this.toggleLearningMode();
                return;
            }
            
            // 切换为顺序模式按钮（随机刷题页面）
            if (e.target.id === 'toggleSequentialMode' || e.target.closest('#toggleSequentialMode')) {
                e.preventDefault();
                this.toggleLearningMode();
                return;
            }
            
            // 查看进度按钮（顺序刷题页面）
            if (
                e.target.id === 'viewProgress' || 
                e.target.closest('#viewProgress') ||
                e.target.id === 'viewProgressSide' ||
                e.target.closest('#viewProgressSide')
            ) {
                e.preventDefault();
                this.showProgressModal();
                return;
            }
            
            // 统计数据按钮（随机刷题页面）
            if (
                e.target.id === 'viewStatistics' || 
                e.target.closest('#viewStatistics') ||
                e.target.id === 'viewStatisticsPanel' ||
                e.target.closest('#viewStatisticsPanel')
            ) {
                e.preventDefault();
                this.showProgressModal();
                return;
            }
        });
        
        // 跳转到题目输入框回车事件
        document.getElementById('jumpToQuestion')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.jumpToSpecificQuestion();
            }
        });
        
        // 题型筛选（需要单独绑定，因为按钮是动态生成的）
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('questionTypeFilter')) {
                e.preventDefault();
                const type = e.target.dataset.type;
                this.filterQuestionsByType(type);
                // 更新按钮样式
                document.querySelectorAll('.questionTypeFilter').forEach(b => {
                    b.classList.remove('bg-blue-500', 'text-white');
                    b.classList.add('bg-gray-200', 'text-gray-700');
                });
                e.target.classList.remove('bg-gray-200', 'text-gray-700');
                e.target.classList.add('bg-blue-500', 'text-white');
            }
        });
    }
    
    /**
     * 显示进度模态框
     */
    static showProgressModal() {
        const modal = document.getElementById('progressModal');
        if (!modal) return;
        
        const total = this.learningQuestions.length;
        const answered = Object.keys(this.answers).length;
        const correct = Object.values(this.questionResults).filter(r => r && r.correct).length;
        const wrong = Object.values(this.questionResults).filter(r => r && !r.correct).length;
        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        
        // 更新进度信息
        const completedCount = document.getElementById('completedCount');
        const accuracyElement = document.getElementById('accuracy');
        const averageTime = document.getElementById('averageTime');
        const closeProgressModal = document.getElementById('closeProgressModal');
        
        if (completedCount) {
            completedCount.textContent = `${answered}/${total}`;
        }
        if (accuracyElement) {
            accuracyElement.textContent = `${accuracy}%`;
        }
        if (averageTime) {
            averageTime.textContent = '0分钟'; // 可以后续添加时间统计
        }
        
        // 显示模态框
        modal.classList.remove('hidden');
        
        // 绑定关闭按钮
        if (closeProgressModal) {
            closeProgressModal.onclick = () => {
                modal.classList.add('hidden');
            };
        }
    }

    /**
     * 保存答案（只保存，不判定）
     * @param {number} questionIndex 题目索引
     * @param {string} answer 答案值
     */
    static saveAnswer(questionIndex, answer) {
        this.answers[questionIndex] = answer;
        
        // 只保存答案，不判定（判定在点击下一题或查看答案时进行）
        // 如果已经有判定结果，不要覆盖（保持已判定的状态）
        if (!this.questionResults[questionIndex]) {
            // 只保存答案，不判定
            this.saveProgress();
            // 更新导航栏（显示为已作答，但不显示对错）
            requestAnimationFrame(() => {
                this.renderQuestionNavigation();
            });
        } else {
            // 如果已经有判定结果，更新答案并重新判定（因为答案可能改变了）
            this.questionResults[questionIndex].userAnswer = answer;
            const question = this.learningQuestions[questionIndex];
            if (question) {
                const isCorrect = this.checkAnswer(answer, question.answer);
                this.questionResults[questionIndex].correct = isCorrect;
                this.questionResults[questionIndex].correctAnswer = question.answer;
            }
            this.saveProgress();
            requestAnimationFrame(() => {
                this.renderQuestionNavigation();
            });
        }
    }
    
    /**
     * 判定并保存答案结果
     * @param {number} questionIndex 题目索引
     * @param {string} answer 答案值
     */
    static checkAndSaveAnswer(questionIndex, answer) {
        this.answers[questionIndex] = answer;
        
        // 判定答案
        const question = this.learningQuestions[questionIndex];
        if (question) {
            const correctAnswer = question.answer;
            const isCorrect = this.checkAnswer(answer, correctAnswer);
            
            // 保存答题结果
            this.questionResults[questionIndex] = {
                correct: isCorrect,
                userAnswer: answer,
                correctAnswer: correctAnswer
            };
            
            // 更新学习进度到存储
            if (this.currentBank && typeof StorageManager !== 'undefined') {
                StorageManager.updateQuestionStatus(
                    this.currentBank.id,
                    question.id,
                    answer,
                    correctAnswer
                );
            }
        }
        
        this.saveProgress();
        this.renderQuestionNavigation();
    }
    
    /**
     * 检查答案是否正确
     * @param {string} userAnswer 用户答案
     * @param {string} correctAnswer 正确答案
     * @returns {boolean} 是否正确
     */
    static checkAnswer(userAnswer, correctAnswer) {
        if (!userAnswer || !correctAnswer) {
            console.warn('答案判定失败：缺少答案', { userAnswer, correctAnswer });
            return false;
        }
        
        // 标准化答案（去除空格，转大写，排序）
        const normalize = (ans) => {
            if (typeof ans === 'string') {
                // 去除所有空格，转大写
                let normalized = ans.toUpperCase().replace(/\s+/g, '');
                // 如果包含逗号，说明是多选题，需要排序
                if (normalized.includes(',')) {
                    return normalized.split(',').map(s => s.trim()).filter(s => s).sort().join(',');
                }
                // 单选题或判断题，直接返回（去除首尾空格）
                return normalized.trim();
            }
            // 非字符串类型，转为字符串后处理
            return String(ans).toUpperCase().replace(/\s+/g, '').trim();
        };
        
        const normalizedUser = normalize(userAnswer);
        const normalizedCorrect = normalize(correctAnswer);
        
        // 调试输出（开发时使用）
        console.log('答案判定:', {
            userAnswer: String(userAnswer),
            correctAnswer: String(correctAnswer),
            normalizedUser,
            normalizedCorrect,
            isCorrect: normalizedUser === normalizedCorrect,
            userType: typeof userAnswer,
            correctType: typeof correctAnswer
        });
        
        const isCorrect = normalizedUser === normalizedCorrect;
        
        if (!isCorrect) {
            console.warn('答案不匹配:', {
                userAnswer: String(userAnswer),
                correctAnswer: String(correctAnswer),
                normalizedUser,
                normalizedCorrect
            });
        } else {
            console.log('答案匹配成功:', {
                userAnswer: String(userAnswer),
                correctAnswer: String(correctAnswer),
                normalizedUser,
                normalizedCorrect
            });
        }
        
        return isCorrect;
    }

    /**
     * 显示答案
     */
    static showAnswer() {
        const isViewing = this.viewedAnswers[this.currentQuestionIndex] === true;
        
        if (isViewing) {
            // 取消查看答案
            this.viewedAnswers[this.currentQuestionIndex] = false;
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('已隐藏答案');
            }
        } else {
            // 显示答案
            this.viewedAnswers[this.currentQuestionIndex] = true;
            
            // 如果还没有判定答案，先判定（如果有答案）
            const currentIndex = this.currentQuestionIndex;
            if (this.answers[currentIndex] && !this.questionResults[currentIndex]) {
                this.autoCheckAnswer(currentIndex);
            }
            
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('已显示答案');
            }
        }
        
        // 重新渲染当前题目
        this.renderCurrentQuestion();
        this.renderQuestionNavigation();
        
        // 更新按钮状态
        this.updateShowAnswerButton();
    }
    
    /**
     * 检查答案（已废弃，使用 showAnswer 代替）
     */
    static checkAnswerOld() {
        // 先保存当前答案
        this.saveCurrentAnswer();

        // 然后显示答案
        this.showAnswer();
    }

    /**
     * 上一题
     */
    static prevQuestion() {
        if (this.currentQuestionIndex <= 0) return;
        
        // 保存当前题目的答案
        const currentIndex = this.currentQuestionIndex;
        this.saveCurrentAnswer();
        
        // 判定答案并显示结果（如果有答案且还没有判定过）
        if (this.answers[currentIndex] && !this.questionResults[currentIndex]) {
            this.autoCheckAnswer(currentIndex);
            this.showAnswerResult(currentIndex);
        }
        
        // 跳转到上一题（立即执行，不延迟）
        this.currentQuestionIndex--;
        // 使用 requestAnimationFrame 优化渲染性能
        requestAnimationFrame(() => {
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
        });
    }

    /**
     * 下一题
     */
    static nextQuestion() {
        if (this.currentQuestionIndex >= this.learningQuestions.length - 1) return;
        
        // 保存当前题目的答案
        const currentIndex = this.currentQuestionIndex;
        this.saveCurrentAnswer();
        
        // 判定答案并显示结果（如果有答案且还没有判定过）
        if (this.answers[currentIndex] && !this.questionResults[currentIndex]) {
            this.autoCheckAnswer(currentIndex);
            this.showAnswerResult(currentIndex);
        }
        
        // 跳转到下一题（立即执行，不延迟）
        this.currentQuestionIndex++;
        // 使用 requestAnimationFrame 优化渲染性能
        requestAnimationFrame(() => {
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
        });
    }
    
    /**
     * 显示答案判定结果
     * @param {number} questionIndex 题目索引
     */
    static showAnswerResult(questionIndex) {
        const result = this.questionResults[questionIndex];
        if (!result) return;
        
        // 自动显示答案（如果答错了）
        if (!result.correct) {
            this.viewedAnswers[questionIndex] = true;
        }
        
        // 显示提示信息（异步显示，不阻塞跳转）
        if (typeof AppManager !== 'undefined') {
            setTimeout(() => {
                if (result.correct) {
                    AppManager.showToast('✓ 回答正确！', 'success');
                } else {
                    AppManager.showToast('✗ 回答错误，已自动显示正确答案', 'error');
                }
            }, 50);
        }
    }
    
    /**
     * 自动判定答案（切换题目时自动判定指定题目）
     * @param {number} questionIndex 要判定的题目索引
     */
    static autoCheckAnswer(questionIndex) {
        const question = this.learningQuestions[questionIndex];
        if (!question) return;
        
        const userAnswer = this.answers[questionIndex];
        if (!userAnswer) return;
        
        // 如果已经判定过，不再重复判定
        if (this.questionResults[questionIndex]) return;
        
        // 检查答案是否正确
        let isCorrect;
        try {
            isCorrect = this.checkAnswer(userAnswer, question.answer);
            // 确保 isCorrect 是布尔值
            if (typeof isCorrect !== 'boolean') {
                console.error('checkAnswer 返回了非布尔值:', isCorrect, typeof isCorrect);
                isCorrect = Boolean(isCorrect);
            }
        } catch (error) {
            console.error('检查答案时出错:', error);
            isCorrect = false;
        }
        
        // 调试输出
        console.log('自动判定答案:', {
            questionIndex,
            userAnswer,
            correctAnswer: question.answer,
            isCorrect: isCorrect,
            isCorrectType: typeof isCorrect
        });
        
        // 保存答题结果
        this.questionResults[questionIndex] = {
            correct: isCorrect,
            userAnswer: userAnswer,
            correctAnswer: question.answer
        };
        
        // 如果答错了，自动显示答案（只在切换题目时，不在选择选项时）
        if (!isCorrect && !this.reviewMode) {
            this.viewedAnswers[questionIndex] = true;
        }
        
        // 更新导航栏（使用 requestAnimationFrame 优化性能）
        requestAnimationFrame(() => {
            this.renderQuestionNavigation();
        });
    }
    
    /**
     * 保存当前题目的答案
     */
    static saveCurrentAnswer() {
        try {
            if (this.reviewMode) return;
            
            const question = this.learningQuestions[this.currentQuestionIndex];
            if (!question) return;
            
            const isMultiple = question.type === 'multiple';
            
            if (isMultiple) {
                // 多选题：收集所有选中的选项
                const optionsArea = document.getElementById('optionsArea');
                if (optionsArea) {
                    const selectedOptions = Array.from(optionsArea.querySelectorAll('input[name="option"]:checked'))
                        .map(opt => opt.value)
                        .sort()
                        .join(',');
                    if (selectedOptions) {
                        this.saveAnswer(this.currentQuestionIndex, selectedOptions);
                    }
                }
            } else {
                // 单选题或判断题：直接保存
                const selectedInput = document.querySelector('input[name="option"]:checked');
                if (selectedInput) {
                    this.saveAnswer(this.currentQuestionIndex, selectedInput.value);
                }
            }
        } catch (error) {
            console.error('保存当前答案时出错:', error);
            // 即使出错也不阻止跳转
        }
    }

    /**
     * 跳转到指定题目
     * @param {number} index 题目索引
     */
    static jumpToQuestion(index) {
        if (index >= 0 && index < this.learningQuestions.length) {
            // 保存当前题目的答案
            this.saveCurrentAnswer();
            
            this.currentQuestionIndex = index;
            this.renderLearningHeader();
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
        }
    }

    /**
     * 跳转到特定题目
     */
    static jumpToSpecificQuestion() {
        const inputElement = document.getElementById('jumpToQuestion');
        if (!inputElement) return;
        
        const questionNumber = parseInt(inputElement.value.trim());
        
        if (isNaN(questionNumber)) {
            AppManager.showToast('请输入有效的题目编号');
            return;
        }
        
        const index = questionNumber - 1;
        
        if (index < 0 || index >= this.learningQuestions.length) {
            AppManager.showToast(`请输入1-${this.learningQuestions.length}之间的数字`);
            return;
        }
        
        this.jumpToQuestion(index);
        inputElement.value = '';
    }

    /**
     * 切换标记状态
     */
    static toggleMark() {
        const index = this.currentQuestionIndex;
        
        if (this.markedQuestions.has(index)) {
            this.markedQuestions.delete(index);
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('已取消标记');
            }
        } else {
            this.markedQuestions.add(index);
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('已标记此题');
            }
        }
        
        // 更新标记按钮文本
        this.updateMarkButton();
        
        // 重新渲染导航以显示标记状态
        this.renderQuestionNavigation();
        this.saveProgress();
    }
    
    /**
     * 更新标记按钮文本（学习模式）
     */
    static updateMarkButton() {
        const markButton = document.getElementById('markQuestionBtn');
        if (!markButton) return;
        
        const isMarked = this.markedQuestions.has(this.currentQuestionIndex);
        if (isMarked) {
            markButton.innerHTML = '<i class="fa fa-flag mr-2"></i>取消标记';
            markButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
            markButton.classList.add('bg-orange-500', 'hover:bg-orange-600');
        } else {
            markButton.innerHTML = '<i class="fa fa-flag mr-2"></i>标记';
            markButton.classList.remove('bg-orange-500', 'hover:bg-orange-600');
            markButton.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
        }
    }

    /**
     * 切换背题模式
     */
    static toggleReviewMode() {
        this.reviewMode = !this.reviewMode;
        
        // 如果开启背题模式，自动显示当前题答案
        if (this.reviewMode) {
            this.viewedAnswers[this.currentQuestionIndex] = true;
        } else {
            // 如果关闭背题模式，隐藏当前题答案（除非用户已经手动查看过）
            // 这里不自动隐藏，让用户自己决定是否隐藏
        }
        
        // 重新渲染界面
        this.renderLearningHeader();
        this.renderCurrentQuestion();
        this.updateShowAnswerButton();
        this.bindEvents();
        
        AppManager.showToast(`${this.reviewMode ? '已开启' : '已关闭'}背题模式`);
        this.saveProgress();
    }

    /**
     * 切换学习模式
     */
    static toggleLearningMode() {
        const newMode = this.mode === 'sequential' ? 'random' : 'sequential';
        
        if (confirm(`确定要切换为${newMode === 'sequential' ? '顺序' : '随机'}刷题模式吗？当前进度将被重置。`)) {
            // 保存当前题库
            const bank = this.currentBank;
            const reviewMode = this.reviewMode;
            
            // 清除当前进度
            localStorage.removeItem('learning_progress');
            
            // 初始化新模式
            this.init(bank, newMode, reviewMode);
            
            // 重新绑定所有事件
            this.bindEvents();
            this.bindOptionEvents();
            
            // 根据模式跳转到对应页面
            if (newMode === 'random') {
                window.location.href = 'random.html?bankId=' + bank.id;
            } else {
                window.location.href = 'learning.html?bankId=' + bank.id;
            }
            
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast(`已切换为${newMode === 'sequential' ? '顺序' : '随机'}刷题模式`);
            }
        }
    }

    /**
     * 重置进度
     */
    static resetProgress() {
        if (confirm('确定要重置学习进度吗？这将清除所有已答题记录和答案查看记录。')) {
            this.answers = {};
            this.viewedAnswers = {};
            this.markedQuestions.clear();
            this.questionResults = {};
            this.currentQuestionIndex = 0;
            
            // 重新渲染界面
            this.renderLearningHeader();
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
            this.bindEvents();
            
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('学习进度已重置');
            }
            this.saveProgress();
        }
    }
    
    /**
     * 按题型筛选题目
     * @param {string} type 题型
     */
    static filterQuestionsByType(type) {
        const buttons = document.querySelectorAll('.question-nav-btn');
        
        buttons.forEach((btn, index) => {
            const question = this.learningQuestions[index];
            if (type === 'all' || question.type === type) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });
    }
    
    /**
     * 重新开始学习
     */
    static restartLearning() {
        if (confirm('确定要重新开始吗？当前进度将被清除。')) {
            localStorage.removeItem('learning_progress');
            location.reload();
        }
    }
    
    /**
     * 退出学习
     */
    static exitLearning() {
        this.saveProgress();
        if (confirm('确定要退出学习吗？当前进度已保存。')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * 复习标记题
     */
    static reviewMarkedQuestions() {
        // 这里可以实现复习标记题功能
        AppManager.showToast('复习标记题功能开发中');
    }

    /**
     * 保存学习进度
     */
    static saveProgress() {
        const progress = {
            bankId: this.currentBank.id,
            learningQuestions: this.learningQuestions,
            answers: this.answers,
            viewedAnswers: this.viewedAnswers,
            currentQuestionIndex: this.currentQuestionIndex,
            mode: this.mode,
            reviewMode: this.reviewMode,
            markedQuestions: Array.from(this.markedQuestions),
            questionResults: this.questionResults
        };
        
        localStorage.setItem('learning_progress', JSON.stringify(progress));
    }

    /**
     * 继续学习
     * @returns {boolean} 是否成功继续
     */
    static continueLearning() {
        const progressStr = localStorage.getItem('learning_progress');
        
        if (!progressStr) {
            return false;
        }
        
        try {
            const progress = JSON.parse(progressStr);
            
            // 先恢复学习状态（不渲染）
            this.currentBank = StorageManager.getQuestionBank(progress.bankId);
            this.learningQuestions = progress.learningQuestions;
            this.answers = progress.answers || {};
            this.viewedAnswers = progress.viewedAnswers || {};
            this.currentQuestionIndex = progress.currentQuestionIndex || 0;
            this.mode = progress.mode || 'sequential';
            this.reviewMode = progress.reviewMode || false;
            this.markedQuestions = new Set(progress.markedQuestions || []);
            this.questionResults = progress.questionResults || {};
            
            // 先渲染界面，确保UI正常显示
            this.renderLearningHeader();
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
            this.bindEvents();
            
            // 延迟显示确认对话框，确保UI已经渲染完成
            setTimeout(() => {
                // 询问是否继续上次的学习
                if (!confirm('检测到未完成的学习进度，是否继续？')) {
                    // 清除进度并重新初始化
                    this.clearProgress();
                    // 重新加载页面
                    window.location.reload();
                }
                // 如果选择继续，UI已经渲染，不需要额外操作
            }, 100);
            
            return true;
        } catch (error) {
            console.error('继续学习失败:', error);
            // 清除损坏的进度
            this.clearProgress();
            return false;
        }
    }

    /**
     * 清除学习进度
     */
    static clearProgress() {
        localStorage.removeItem('learning_progress');
    }

    /**
     * 打乱数组顺序
     * @param {Array} array 要打乱的数组
     */
    static shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 获取学习统计信息
     * @returns {Object} 统计信息
     */
    static getLearningStats() {
        const totalQuestions = this.learningQuestions.length;
        const answeredCount = Object.keys(this.answers).length;
        const viewedAnswersCount = Object.keys(this.viewedAnswers).filter(key => this.viewedAnswers[key] === true).length;
        
        return {
            currentQuestion: this.currentQuestionIndex + 1,
            totalQuestions,
            answeredCount,
            viewedAnswersCount,
            progressPercentage: Math.round((this.currentQuestionIndex / totalQuestions) * 100)
        };
    }

    /**
     * 显示学习统计
     */
    static showLearningStats() {
        const stats = this.getLearningStats();
        
        const statsMessage = `
        当前进度: 第${stats.currentQuestion}/${stats.totalQuestions}题 (${stats.progressPercentage}%)
        已答题数: ${stats.answeredCount}
        已查看答案: ${stats.viewedAnswersCount}
        学习模式: ${this.mode === 'sequential' ? '顺序' : '随机'}
        背题模式: ${this.reviewMode ? '开启' : '关闭'}
        `;
        
        alert(statsMessage);
    }
}