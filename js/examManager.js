/**
 * 考试管理器
 * 负责处理模拟考试相关的所有逻辑
 */

class ExamManager {
    static candidateName = '';
    static examConfig = null;
    static _scoreModalBound = false;
    
    static setCandidateName(name) {
        this.candidateName = (name || '').trim();
    }
    /**
     * 初始化考试
     * @param {Object} bank 题库对象
     * @param {number} singleCount 单选题数量（新方式）或题目总数（旧方式）
     * @param {number} multipleCount 多选题数量（新方式）或时长（旧方式）
     * @param {number} judgeCount 判断题数量（新方式，可选）
     * @param {number} duration 考试时长（分钟，新方式，可选）
     * @param {number} singleScore 单选题每题得分（可选）
     * @param {number} multipleScore 多选题每题得分（可选）
     * @param {number} judgeScore 判断题每题得分（可选）
     */
    static init(bank, singleCount, multipleCount, judgeCount, duration, singleScore, multipleScore, judgeScore) {
        // 判断调用方式：如果参数数量为3，则是旧方式（bank, questionCount, duration）
        // 如果参数数量为5，则是新方式（bank, singleCount, multipleCount, judgeCount, duration）
        const useLegacyMode = arguments.length === 3;
        let actualSingleCount, actualMultipleCount, actualJudgeCount, actualDuration;
        
        if (useLegacyMode) {
            // 旧方式：init(bank, questionCount, duration)
            actualDuration = multipleCount; // 第二个参数是duration
            actualSingleCount = 0;
            actualMultipleCount = 0;
            actualJudgeCount = 0;
            // 使用旧的generateExamQuestions方式
            this.examQuestions = this.generateExamQuestions(bank.questions, singleCount);
        } else {
            // 新方式：init(bank, singleCount, multipleCount, judgeCount, duration)
            actualSingleCount = singleCount || 0;
            actualMultipleCount = multipleCount || 0;
            actualJudgeCount = judgeCount || 0;
            actualDuration = duration || 120;
            // 使用新的generateExamQuestions方式
            this.examQuestions = this.generateExamQuestionsByType(bank.questions, actualSingleCount, actualMultipleCount, actualJudgeCount);
        }
        
        // 获取每题得分（从参数或默认值）
        const actualSingleScore = singleScore || parseFloat(localStorage.getItem('examSingleScore')) || 1;
        const actualMultipleScore = multipleScore || parseFloat(localStorage.getItem('examMultipleScore')) || 2;
        const actualJudgeScore = judgeScore || parseFloat(localStorage.getItem('examJudgeScore')) || 1;
        
        this.examConfig = {
            mode: useLegacyMode ? 'legacy' : 'typed',
            singleCount: actualSingleCount,
            multipleCount: actualMultipleCount,
            judgeCount: actualJudgeCount,
            totalCount: useLegacyMode ? singleCount : this.examQuestions.length,
            durationMinutes: actualDuration,
            singleScore: actualSingleScore,
            multipleScore: actualMultipleScore,
            judgeScore: actualJudgeScore
        };
        
        console.log('初始化考试...', { 
            bank: bank.name, 
            singleCount: actualSingleCount, 
            multipleCount: actualMultipleCount, 
            judgeCount: actualJudgeCount, 
            duration: actualDuration,
            totalQuestions: this.examQuestions.length
        });
        
        // 保存当前题库信息
        this.currentBank = bank;
        
        // 初始化答案记录
        this.answers = {};
        this.markedQuestions = new Set(); // 标记的题目
        this.examSubmitted = false; // 是否已交卷
        this.questionResults = {}; // 交卷后的答题结果
        this._eventsBound = false; // 标记事件是否已绑定
        this._processingNextQuestion = false; // 标记是否正在处理下一题
        
        // 初始化考试状态
        this.currentQuestionIndex = 0;
        this.startTime = Date.now();
        this.duration = actualDuration * 60 * 1000; // 转换为毫秒
        this.candidateName = (this.candidateName || '').trim();
        
        // 渲染界面
        this.renderExamHeader();
        this.renderCurrentQuestion();
        this.renderQuestionNavigation();
        this.renderTimer();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化下一题/交卷按钮（必须在bindEvents之后）
        this.updateNextButton();
        
        // 更新进度
        this.updateProgress();
        
        // 保存考试进度
        this.saveProgress();
        
        // 启动计时器
        this.startTimer();
        
        console.log('考试初始化完成', { questionCount: this.examQuestions.length });
    }

    /**
     * 生成考试题目（旧方式，兼容）
     * @param {Array} allQuestions 题库所有题目
     * @param {number} count 需要的题目数量
     * @returns {Array} 考试题目列表
     */
    static generateExamQuestions(allQuestions, count) {
        // 深拷贝题目列表
        const questions = JSON.parse(JSON.stringify(allQuestions));
        
        // 按题型分类
        const singleQuestions = questions.filter(q => q.type === 'single');
        const multipleQuestions = questions.filter(q => q.type === 'multiple');
        const judgeQuestions = questions.filter(q => q.type === 'judge');
        
        // 分别随机打乱
        this.shuffleArray(singleQuestions);
        this.shuffleArray(multipleQuestions);
        this.shuffleArray(judgeQuestions);
        
        // 按顺序合并：单选、多选、判断
        const sortedQuestions = [...singleQuestions, ...multipleQuestions, ...judgeQuestions];
        
        // 返回指定数量的题目
        return sortedQuestions.slice(0, count);
    }
    
    /**
     * 根据各类型数量生成考试题目（新方式）
     * @param {Array} allQuestions 题库所有题目
     * @param {number} singleCount 单选题数量
     * @param {number} multipleCount 多选题数量
     * @param {number} judgeCount 判断题数量
     * @returns {Array} 考试题目列表
     */
    static generateExamQuestionsByType(allQuestions, singleCount, multipleCount, judgeCount) {
        // 深拷贝题目列表
        const questions = JSON.parse(JSON.stringify(allQuestions));
        
        // 按题型分类
        const singleQuestions = questions.filter(q => q.type === 'single');
        const multipleQuestions = questions.filter(q => q.type === 'multiple');
        const judgeQuestions = questions.filter(q => q.type === 'judge');
        
        // 分别随机打乱
        this.shuffleArray(singleQuestions);
        this.shuffleArray(multipleQuestions);
        this.shuffleArray(judgeQuestions);
        
        // 按指定数量取题
        const selectedSingle = singleQuestions.slice(0, singleCount);
        const selectedMultiple = multipleQuestions.slice(0, multipleCount);
        const selectedJudge = judgeQuestions.slice(0, judgeCount);
        
        // 按顺序合并：单选、多选、判断
        return [...selectedSingle, ...selectedMultiple, ...selectedJudge];
    }

    /**
     * 渲染考试头部信息
     */
    static renderExamHeader() {
        // 更新考试标题
        const examTitle = document.getElementById('examTitle');
        if (examTitle) {
            examTitle.textContent = `模拟考试 - ${this.currentBank.name}`;
        }
        
        const candidateDisplay = document.getElementById('candidateNameDisplay');
        if (candidateDisplay) {
            candidateDisplay.textContent = `考生：${this.candidateName || '--'}`;
        }
        
        // 更新题目信息（已在renderCurrentQuestion中更新）
        // 这里可以更新其他头部信息
    }

    /**
     * 渲染当前题目
     */
    static renderCurrentQuestion() {
        // 更新题目信息
        const currentQuestionInfo = document.getElementById('currentQuestionInfo');
        const questionContent = document.getElementById('questionContent');
        const optionsArea = document.getElementById('optionsArea');
        
        if (!questionContent || !optionsArea) return;
        
        const currentQuestion = this.examQuestions[this.currentQuestionIndex];
        if (!currentQuestion) return;
        
        // 更新题目编号（格式：第 1/70 题）
        if (currentQuestionInfo) {
            currentQuestionInfo.textContent = `第 ${this.currentQuestionIndex + 1}/${this.examQuestions.length} 题`;
        }
        
        // 更新题目类型和分值
        const questionTypeInfo = document.getElementById('questionTypeInfo');
        const questionScoreInfo = document.getElementById('questionScoreInfo');
        
        if (questionTypeInfo) {
            const typeMap = {
                'single': '单选题',
                'multiple': '多选题',
                'judge': '判断题'
            };
            questionTypeInfo.textContent = typeMap[currentQuestion.type] || '单选题';
        }
        
        // 更新分值（单独显示，带绿色标签）
        if (questionScoreInfo) {
            let questionScore = 0;
            if (currentQuestion.type === 'single') {
                questionScore = this.examConfig?.singleScore || 1;
            } else if (currentQuestion.type === 'multiple') {
                questionScore = this.examConfig?.multipleScore || 2;
            } else if (currentQuestion.type === 'judge') {
                questionScore = this.examConfig?.judgeScore || 1;
            }
            questionScoreInfo.textContent = `${questionScore}分`;
        }
        
        // 格式化题目内容
        const formattedContent = this.formatQuestionContent(currentQuestion.content);
        questionContent.innerHTML = formattedContent;
        
        // 渲染选项
        optionsArea.innerHTML = '';
        const optionsHTML = this.renderOptions(currentQuestion.options, currentQuestion);
        optionsArea.innerHTML = optionsHTML;
        
        // 设置已选答案
        const selectedAnswer = this.answers[this.currentQuestionIndex];
        if (selectedAnswer) {
            // 处理多选题（答案可能是逗号分隔的）
            const selectedAnswers = selectedAnswer.split(',').map(a => a.trim());
            selectedAnswers.forEach(ans => {
                const input = document.querySelector(`input[name="option"][value="${ans}"]`);
                if (input) {
                    input.checked = true;
                }
            });
        }
        
        // 如果已交卷，显示答案对比
        if (this.examSubmitted) {
            this.renderAnswerComparison(currentQuestion, selectedAnswer);
        } else {
            // 未交卷时隐藏答案对比区域
            const answerComparison = document.getElementById('answerComparison');
            if (answerComparison) {
                answerComparison.classList.add('hidden');
            }
        }
        
        // 更新标记按钮文本
        this.updateMarkButton();
        
        // 更新下一题/交卷按钮
        this.updateNextButton();
        
        // 更新进度
        this.updateProgress();
    }
    
    /**
     * 更新下一题/交卷按钮
     */
    static updateNextButton() {
        const nextBtn = document.getElementById('nextQuestionBtn');
        if (!nextBtn) return;
        
        const isLastQuestion = this.currentQuestionIndex === this.examQuestions.length - 1;
        
        // 先移除之前的事件监听器（通过设置onclick为null）
        nextBtn.onclick = null;
        
        if (isLastQuestion && !this.examSubmitted) {
            // 最后一题且未交卷，显示"交卷"按钮
            nextBtn.innerHTML = '<i class="fa fa-check mr-2"></i>交卷';
            nextBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            nextBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            // 使用一次性函数包装，确保不会重复触发
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.confirmSubmit();
            };
        } else if (!this.examSubmitted) {
            // 不是最后一题，显示"下一题"按钮
            nextBtn.innerHTML = '下一题 <i class="fa fa-arrow-right ml-2"></i>';
            nextBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
            nextBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
            // 使用一次性函数包装，确保不会重复触发
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.nextQuestion();
            };
        }
    }
    
    /**
     * 渲染答案对比（交卷后显示）
     * @param {Object} question 题目对象
     * @param {string} userAnswer 用户答案
     */
    static renderAnswerComparison(question, userAnswer) {
        const answerComparison = document.getElementById('answerComparison');
        if (!answerComparison) return;
        
        const result = this.questionResults[this.currentQuestionIndex];
        const correctAnswer = question.answer;
        const userAnswerText = userAnswer || '未作答';
        const isCorrect = result && result.correct;
        
        // 显示答案对比区域
        answerComparison.classList.remove('hidden');
        answerComparison.className = 'mb-6 p-4 bg-gray-50 rounded-lg border-2';
        answerComparison.innerHTML = `
            <h4 class="font-bold text-lg mb-3 text-gray-800">答案对比</h4>
            <div class="space-y-3">
                <div class="flex items-center">
                    <span class="font-semibold text-gray-700 mr-3 min-w-[100px]">您的答案：</span>
                    <span class="text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'} font-bold">${userAnswerText}</span>
                    ${isCorrect ? '<span class="ml-2 text-green-600">✓</span>' : '<span class="ml-2 text-red-600">✗</span>'}
                </div>
                <div class="flex items-center">
                    <span class="font-semibold text-gray-700 mr-3 min-w-[100px]">正确答案：</span>
                    <span class="text-lg text-green-600 font-bold">${correctAnswer}</span>
                </div>
                ${question.analysis ? `
                <div class="mt-3 pt-3 border-t border-gray-300">
                    <span class="font-semibold text-gray-700 block mb-2">解析：</span>
                    <p class="text-gray-700">${question.analysis}</p>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 更新标记按钮文本
     */
    static updateMarkButton() {
        const markButton = document.getElementById('markQuestion');
        if (!markButton) return;
        
        // 如果已交卷，禁用标记功能
        if (this.examSubmitted) {
            markButton.disabled = true;
            markButton.classList.add('opacity-50', 'cursor-not-allowed');
            markButton.innerHTML = '<i class="fa fa-flag"></i> 标记（已交卷）';
            return;
        }
        
        // 未交卷时，根据标记状态更新按钮
        markButton.disabled = false;
        markButton.classList.remove('opacity-50', 'cursor-not-allowed');
        
        const isMarked = this.markedQuestions.has(this.currentQuestionIndex);
        if (isMarked) {
            markButton.innerHTML = '<i class="fa fa-flag"></i> 取消标记';
            markButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
            markButton.classList.add('bg-orange-500', 'hover:bg-orange-600');
        } else {
            markButton.innerHTML = '<i class="fa fa-flag"></i> 标记';
            markButton.classList.remove('bg-orange-500', 'hover:bg-orange-600');
            markButton.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
        }
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
        const isMultiple = question.type === 'multiple';
        const inputType = isMultiple ? 'checkbox' : 'radio';
        const result = this.examSubmitted ? this.questionResults[this.currentQuestionIndex] : null;
        const userAnswer = this.answers[this.currentQuestionIndex];
        const correctAnswer = question.answer;
        const correctAnswers = correctAnswer ? correctAnswer.split(',').map(a => a.trim().toUpperCase()) : [];
        
        // 遍历选项
        Object.entries(options).forEach(([key, value]) => {
            const keyUpper = key.toUpperCase();
            let labelClass = 'flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition mb-2';
            
            // 如果已交卷，标记正确和错误选项
            if (this.examSubmitted) {
                if (correctAnswers.includes(keyUpper)) {
                    labelClass += ' bg-green-50 border-green-300';
                } else if (userAnswer && userAnswer.toUpperCase().split(',').map(a => a.trim()).includes(keyUpper)) {
                    labelClass += ' bg-red-50 border-red-300';
                }
            }
            
            // 单选题和判断题支持双击跳转（未交卷时）
            const doubleClickAttr = (!this.examSubmitted && (question.type === 'single' || question.type === 'judge')) 
                ? 'ondblclick="ExamManager.handleOptionDoubleClick(event)"' 
                : '';
            
            html += `
                <label class="${labelClass}" ${doubleClickAttr}>
                    <input type="${inputType}" name="option" value="${key}" class="mr-3 w-4 h-4" ${this.examSubmitted ? 'disabled' : ''}>
                    <span class="option-key font-medium mr-2">${key}.</span>
                    <span class="option-value">${value}</span>
                    ${this.examSubmitted && correctAnswers.includes(keyUpper) ? '<span class="ml-2 text-green-600 font-medium">✓ 正确答案</span>' : ''}
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
        // 如果已交卷，不处理双击
        if (this.examSubmitted) return;
        
        // 获取当前题目
        const currentQuestion = this.examQuestions[this.currentQuestionIndex];
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
        if (this.currentQuestionIndex < this.examQuestions.length - 1) {
            // 延迟一小段时间，让用户看到选项被选中
            setTimeout(() => {
                this.nextQuestion();
            }, 200);
        } else {
            // 如果是最后一题，提示可以交卷
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('已选择答案，可以交卷了', 'info');
            }
        }
    }

    /**
     * 渲染题目导航
     */
    static renderQuestionNavigation() {
        const navElement = document.getElementById('questionListContainer');
        if (!navElement) return;
        
        navElement.innerHTML = '';
        
        // 生成导航按钮
        this.examQuestions.forEach((question, index) => {
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
        
        // 如果已交卷，显示结果图例
        if (this.examSubmitted) {
            const legend = document.getElementById('examResultLegend');
            if (legend) {
                legend.classList.remove('hidden');
            }
        }
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
        
        // 如果已交卷，显示答题结果
        if (this.examSubmitted) {
            const result = this.questionResults[index];
            if (result && result.correct) {
                // 答对：绿色
                button.classList.add('bg-green-500', 'text-white');
            } else if (result && !result.correct) {
                // 答错：红色
                button.classList.add('bg-red-500', 'text-white');
            } else {
                // 未作答：灰色
                button.classList.add('bg-gray-200', 'text-gray-700');
            }
            return;
        }
        
        // 考试中：标记的题目（黄色，优先级较高）
        if (this.markedQuestions.has(index)) {
            button.classList.add('bg-yellow-400', 'text-gray-800');
            return;
        }
        
        // 已作答：蓝色
        if (this.answers[index] !== undefined) {
            button.classList.add('bg-blue-500', 'text-white');
            return;
        }
        
        // 未作答：灰色
        button.classList.add('bg-gray-200', 'text-gray-700');
    }
    
    /**
     * 更新进度条
     */
    static updateProgress() {
        const total = this.examQuestions.length;
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
        
        if (this.examSubmitted) {
            const result = this.questionResults[index];
            if (result && result.correct) {
                return 'correct';
            } else if (result && !result.correct) {
                return 'incorrect';
            }
            return 'unanswered';
        }
        
        if (this.markedQuestions.has(index)) {
            return 'marked';
        }
        
        if (this.answers[index] !== undefined) {
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
                return 'bg-green-200 font-bold';
            case 'answered':
                return 'bg-blue-200';
            case 'marked':
                return 'bg-yellow-200';
            default:
                return 'bg-gray-200';
        }
    }

    /**
     * 渲染计时器
     */
    static renderTimer() {
        const timerElement = document.getElementById('examTimer');
        if (!timerElement) return;
        
        // 立即更新一次时间
        this.updateTimer();
    }

    /**
     * 更新计时器显示
     */
    static updateTimer() {
        const timerDisplay = document.getElementById('timerDisplay');
        const remainingTimeElement = document.getElementById('remainingTime');
        
        const elapsedTime = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.duration - elapsedTime);
        
        // 计算剩余小时、分钟和秒数
        const hours = Math.floor(remainingTime / 3600000);
        const minutes = Math.floor((remainingTime % 3600000) / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        
        // 格式化时间显示
        let formattedTime;
        if (hours > 0) {
            formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // 更新导航栏计时器
        if (timerDisplay) {
            timerDisplay.textContent = formattedTime;
            
            // 设置不同时间的颜色提醒
            if (remainingTime < 5 * 60 * 1000) { // 5分钟以内
                timerDisplay.classList.add('text-red-600');
                timerDisplay.classList.remove('text-orange-600', 'text-gray-800');
            } else if (remainingTime < 30 * 60 * 1000) { // 30分钟以内
                timerDisplay.classList.add('text-orange-600');
                timerDisplay.classList.remove('text-red-600', 'text-gray-800');
            } else {
                timerDisplay.classList.add('text-gray-800');
                timerDisplay.classList.remove('text-red-600', 'text-orange-600');
            }
        }
        
        // 更新内容区域的剩余时间
        if (remainingTimeElement) {
            remainingTimeElement.textContent = `剩余时间: ${formattedTime}`;
            
            // 设置不同时间的颜色提醒
            if (remainingTime < 5 * 60 * 1000) {
                remainingTimeElement.classList.add('text-red-600');
                remainingTimeElement.classList.remove('text-orange-600');
            } else if (remainingTime < 30 * 60 * 1000) {
                remainingTimeElement.classList.add('text-orange-600');
                remainingTimeElement.classList.remove('text-red-600');
            }
        }
        
        // 检查是否时间到
        if (remainingTime <= 0) {
            this.handleTimeUp();
        }
    }

    /**
     * 开始计时器
     */
    static startTimer() {
        // 清除之前的计时器（如果有）
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // 设置新的计时器，每秒更新一次
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    /**
     * 绑定事件
     */
    static bindEvents() {
        // 防止重复绑定
        if (this._eventsBound) return;
        
        // 选项选择事件（动态绑定，因为选项是动态生成的）
        document.addEventListener('change', (e) => {
            if (e.target.name === 'option' && !this.examSubmitted) {
                const question = this.examQuestions[this.currentQuestionIndex];
                const isMultiple = question && question.type === 'multiple';
                
                if (isMultiple) {
                    // 多选题：收集所有选中的选项
                    const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked'))
                        .map(opt => opt.value)
                        .sort()
                        .join(',');
                    this.saveAnswer(this.currentQuestionIndex, selectedOptions);
                } else {
                    // 单选题或判断题：直接保存
                    this.saveAnswer(this.currentQuestionIndex, e.target.value);
                }
                
                this.renderQuestionNavigation();
            }
        });
        
        // 上一题按钮
        document.getElementById('prevQuestion')?.addEventListener('click', () => {
            this.prevQuestion();
        });
        document.getElementById('prevQuestionBtn')?.addEventListener('click', () => {
            this.prevQuestion();
        });
        
        // 下一题按钮（只绑定nextQuestion，nextQuestionBtn由updateNextButton动态控制）
        document.getElementById('nextQuestion')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        // nextQuestionBtn 的点击事件由 updateNextButton() 动态设置，不在这里绑定
        
        // 提交试卷按钮
        document.getElementById('submitExam')?.addEventListener('click', () => {
            this.confirmSubmit();
        });
        document.getElementById('submitExamBtn')?.addEventListener('click', () => {
            this.confirmSubmit();
        });
        
        // 标记题目按钮
        document.getElementById('markQuestion')?.addEventListener('click', () => {
            this.markQuestion();
        });
        document.getElementById('markQuestionBtn')?.addEventListener('click', () => {
            this.markQuestion();
        });
        
        // 随机跳转按钮
        document.getElementById('randomJumpBtn')?.addEventListener('click', () => {
            this.randomJump();
        });
        
        // 返回按钮
        document.getElementById('backToExamList')?.addEventListener('click', () => {
            if (confirm('确定要返回吗？当前进度将被保存。')) {
                this.saveProgress();
                window.location.href = 'index.html';
            }
        });

        // 快速跳转功能
        document.getElementById('jumpToQuestion')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.jumpToSpecificQuestion();
            }
        });

        document.getElementById('jumpButton')?.addEventListener('click', () => {
            this.jumpToSpecificQuestion();
        });
        
        // 题型筛选
        document.querySelectorAll('.questionTypeFilter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.filterQuestionsByType(type);
                // 更新按钮样式
                document.querySelectorAll('.questionTypeFilter').forEach(b => {
                    b.classList.remove('bg-blue-500', 'text-white');
                    b.classList.add('bg-gray-200', 'text-gray-700');
                });
                e.target.classList.remove('bg-gray-200', 'text-gray-700');
                e.target.classList.add('bg-blue-500', 'text-white');
            });
        });
        
        // 标记事件已绑定
        this._eventsBound = true;
        
        // 返回首页按钮
        document.getElementById('backToHome')?.addEventListener('click', () => {
            this.saveProgress();
            AppManager.backToHome();
        });
        
        // 键盘快捷键：左右箭头键切换题目
        document.addEventListener('keydown', (e) => {
            // 如果正在输入框中输入，不处理快捷键
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            // 如果已交卷，不处理快捷键
            if (this.examSubmitted) return;
            
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
    }

    /**
     * 保存答案
     * @param {number} questionIndex 题目索引
     * @param {string} answer 答案值
     */
    static saveAnswer(questionIndex, answer) {
        this.answers[questionIndex] = answer;
        this.saveProgress();
        // 更新导航栏显示
        this.renderQuestionNavigation();
    }
    
    /**
     * 保存当前题目的答案
     */
    static saveCurrentAnswer() {
        const question = this.examQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        const isMultiple = question.type === 'multiple';
        let answer = '';
        
        if (isMultiple) {
            // 多选题：收集所有选中的选项
            const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked'))
                .map(opt => opt.value)
                .sort()
                .join(',');
            answer = selectedOptions;
        } else {
            // 单选题或判断题：获取选中的选项
            const selectedInput = document.querySelector('input[name="option"]:checked');
            if (selectedInput) {
                answer = selectedInput.value;
            }
        }
        
        if (answer) {
            this.saveAnswer(this.currentQuestionIndex, answer);
        }
    }

    /**
     * 跳转到上一题
     */
    static prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            // 保存当前题目的答案
            this.saveCurrentAnswer();
            
            this.currentQuestionIndex--;
            this.renderExamHeader();
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
            // 更新标记按钮状态
            this.updateMarkButton();
            // 更新下一题/交卷按钮
            this.updateNextButton();
        }
    }

    /**
     * 跳转到下一题
     */
    static nextQuestion() {
        // 防止重复调用（如果正在处理中，直接返回）
        if (this._processingNextQuestion) {
            console.log('正在处理下一题，忽略重复调用');
            return;
        }
        
        if (this.currentQuestionIndex < this.examQuestions.length - 1) {
            // 设置处理标记
            this._processingNextQuestion = true;
            
            // 保存当前题目的答案
            this.saveCurrentAnswer();
            
            // 跳转到下一题（只增加1）
            this.currentQuestionIndex++;
            
            // 使用 requestAnimationFrame 确保渲染顺序
            requestAnimationFrame(() => {
                this.renderExamHeader();
                this.renderCurrentQuestion();
                this.renderQuestionNavigation();
                // 更新标记按钮状态
                this.updateMarkButton();
                // 更新下一题/交卷按钮
                this.updateNextButton();
                
                // 清除处理标记
                this._processingNextQuestion = false;
            });
        } else {
            this._processingNextQuestion = false;
        }
    }

    /**
     * 跳转到指定题目
     * @param {number} index 题目索引
     */
    static jumpToQuestion(index) {
        if (index >= 0 && index < this.examQuestions.length) {
            // 保存当前题目的答案
            this.saveCurrentAnswer();
            
            this.currentQuestionIndex = index;
            this.renderExamHeader();
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
            // 更新标记按钮状态
            this.updateMarkButton();
            // 更新下一题/交卷按钮
            this.updateNextButton();
        }
    }

    static jumpToSpecificQuestion() {
        const inputElement = document.getElementById('jumpToQuestion');
        if (!inputElement) return;

        const questionNumber = parseInt(inputElement.value.trim());
        if (isNaN(questionNumber)) {
            AppManager.showToast('请输入有效的数字');
            return;
        }

        const index = questionNumber - 1;
        if (index < 0 || index >= this.examQuestions.length) {
            AppManager.showToast(`请输入1-${this.examQuestions.length}之间的数字`);
            return;
        }

        this.jumpToQuestion(index);
        inputElement.value = ''; // 清空输入框
    }

    /**
     * 标记题目
     */
    static markQuestion() {
        if (this.examSubmitted) {
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('考试已结束，无法标记');
            }
            return;
        }
        
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
        
        // 更新标记按钮状态
        this.updateMarkButton();
        
        // 重新渲染导航以显示标记状态
        this.renderQuestionNavigation();
        this.saveProgress();
    }

    /**
     * 随机跳转
     */
    static randomJump() {
        const availableIndexes = [];
        
        // 找出所有未作答的题目
        for (let i = 0; i < this.examQuestions.length; i++) {
            if (this.answers[i] === undefined) {
                availableIndexes.push(i);
            }
        }
        
        // 如果有未作答的题目，随机跳转到其中一个
        if (availableIndexes.length > 0) {
            const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
            this.jumpToQuestion(randomIndex);
            AppManager.showToast(`已跳转到未作答的题目：第${randomIndex + 1}题`);
        } else {
            // 如果所有题目都已作答，随机跳转到任意一题
            const randomIndex = Math.floor(Math.random() * this.examQuestions.length);
            this.jumpToQuestion(randomIndex);
            AppManager.showToast(`所有题目都已作答，随机跳转到：第${randomIndex + 1}题`);
        }
    }

    /**
     * 确认提交
     */
    static confirmSubmit() {
        // 检查是否有未作答的题目
        const unansweredCount = this.getUnansweredCount();
        const totalCount = this.examQuestions.length;
        const answeredCount = totalCount - unansweredCount;
        
        let message = '';
        if (unansweredCount > 0) {
            message = `答题进度：已作答 ${answeredCount}/${totalCount} 题，还有 ${unansweredCount} 道题目未作答。\n\n确定要提交吗？`;
        } else {
            message = `答题进度：已作答 ${answeredCount}/${totalCount} 题。\n\n确定要提交试卷吗？`;
        }
        
        // 使用自定义确认对话框（更及时响应）
        if (window.confirm(message)) {
            // 提交试卷
            this.submitExam();
        }
    }

    /**
     * 提交试卷
     */
    static submitExam() {
        // 清除计时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // 标记为已交卷
        this.examSubmitted = true;
        
        // 计算分数
        const result = this.calculateScore();
        
        // 保存考试记录
        this.saveExamRecord(result);
        
        // 重新渲染导航以显示答题结果
        this.renderQuestionNavigation();
        
        // 清除考试进度
        this.clearProgress();
        
        // 显示考试结果
        this.showExamResult(result);
    }

    /**
     * 计算分数
     * @returns {Object} 考试结果
     */
    static calculateScore() {
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        let totalScore = 0; // 总分
        let maxScore = 0; // 满分
        const wrongQuestions = [];
        
        // 获取每题得分配置
        const singleScore = this.examConfig?.singleScore || 1;
        const multipleScore = this.examConfig?.multipleScore || 2;
        const judgeScore = this.examConfig?.judgeScore || 1;
        
        // 统计答题情况并保存结果
        this.questionResults = {};
        
        this.examQuestions.forEach((question, index) => {
            // 根据题型获取每题得分
            let questionScore = 0;
            if (question.type === 'single') {
                questionScore = singleScore;
            } else if (question.type === 'multiple') {
                questionScore = multipleScore;
            } else if (question.type === 'judge') {
                questionScore = judgeScore;
            }
            
            maxScore += questionScore;
            
            const userAnswer = this.answers[index];
            
            if (userAnswer === undefined) {
                skippedCount++;
                this.questionResults[index] = {
                    correct: false,
                    userAnswer: null,
                    correctAnswer: question.answer,
                    score: 0,
                    maxScore: questionScore
                };
                wrongQuestions.push({
                    question: question,
                    userAnswer: null,
                    correctAnswer: question.answer
                });
            } else {
                // 检查答案是否正确（支持多选题）
                const isCorrect = this.checkAnswer(userAnswer, question.answer);
                
                if (isCorrect) {
                    correctCount++;
                    totalScore += questionScore;
                } else {
                    wrongCount++;
                }
                
                this.questionResults[index] = {
                    correct: isCorrect,
                    userAnswer: userAnswer,
                    correctAnswer: question.answer,
                    score: isCorrect ? questionScore : 0,
                    maxScore: questionScore
                };
                
                if (!isCorrect) {
                    wrongQuestions.push({
                        question: question,
                        userAnswer: userAnswer,
                        correctAnswer: question.answer
                    });
                }
            }
        });
        
        // 计算总分（保留两位小数）
        const score = Math.round(totalScore * 100) / 100;
        const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        
        return {
            score,
            maxScore,
            scorePercent,
            correctCount,
            wrongCount,
            skippedCount,
            totalQuestions: this.examQuestions.length,
            wrongQuestions
        };
    }
    
    /**
     * 检查答案是否正确
     * @param {string} userAnswer 用户答案
     * @param {string} correctAnswer 正确答案
     * @returns {boolean} 是否正确
     */
    static checkAnswer(userAnswer, correctAnswer) {
        if (!userAnswer || !correctAnswer) return false;
        
        // 标准化答案（去除空格，转大写，排序）
        const normalize = (ans) => {
            if (typeof ans === 'string') {
                return ans.toUpperCase().replace(/\s+/g, '').split(',').sort().join(',');
            }
            return String(ans).toUpperCase().replace(/\s+/g, '');
        };
        
        return normalize(userAnswer) === normalize(correctAnswer);
    }

    /**
     * 显示考试结果
     * @param {Object} result 考试结果
     */
    static showExamResult(result) {
        // 显示结果模态框或结果区域
        const examResult = document.getElementById('examResult');
        if (examResult) {
            examResult.classList.remove('hidden');
            
            // 更新结果信息
            const finalScore = document.getElementById('finalScore');
            const accuracy = document.getElementById('accuracy');
            
            if (finalScore) {
                // 显示得分/满分
                if (result.maxScore && result.maxScore > 0) {
                    finalScore.textContent = `${result.score} / ${result.maxScore}`;
                } else {
                    finalScore.textContent = result.score;
                }
            }
            if (accuracy) {
                // 正确率 = 正确题数 / 总题数
                const accuracyPercent = result.totalQuestions > 0 
                    ? Math.round((result.correctCount / result.totalQuestions) * 100) 
                    : 0;
                accuracy.textContent = `${accuracyPercent}%`;
            }
            
            // 绑定结果页面事件
            this.bindResultEvents();
        }
        
        // 重新渲染当前题目以显示答案对比
        this.renderCurrentQuestion();
        this.renderQuestionNavigation();
        
        // 显示提示
        if (typeof AppManager !== 'undefined') {
            AppManager.showToast(`考试完成！得分：${result.score}分`);
        }
        
        this.showScoreModal(result.score);
    }
    
    /**
     * 显示成绩弹窗
     * @param {number} score 分数
     * @param {number} maxScore 满分（可选）
     */
    static showScoreModal(score, maxScore) {
        const modal = document.getElementById('scoreModal');
        if (!modal) return;
        
        const title = document.getElementById('scoreModalTitle');
        const scoreText = document.getElementById('scoreModalScore');
        
        if (title) {
            title.textContent = `${this.candidateName || '考生'} 考试完成！`;
        }
        
        if (scoreText) {
            const displayScore = maxScore && maxScore > 0 
                ? `${score} / ${maxScore} 分` 
                : `${score} 分`;
            scoreText.textContent = `您的得分：${displayScore}`;
        }
        if (scoreText) {
            scoreText.textContent = `您的得分：${score} 分`;
        }
        
        modal.classList.remove('hidden');
        
        if (!this._scoreModalBound) {
            document.getElementById('scoreModalClose')?.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
            this._scoreModalBound = true;
        }
    }

    /**
     * 渲染错题列表
     * @param {Array} wrongQuestions 错题列表
     * @returns {string} HTML字符串
     */
    static renderWrongQuestions(wrongQuestions) {
        let html = `<div class="wrong-questions max-h-60 overflow-y-auto">`;
        
        wrongQuestions.slice(0, 10).forEach((item, index) => {
            html += `
                <div class="wrong-question-item border-b pb-4 mb-4">
                    <p class="font-medium">${index + 1}. ${item.question.content}</p>
                    <div class="mt-2 flex">
                        <span class="text-red-500 mr-4">您的答案: ${item.userAnswer || '未作答'}</span>
                        <span class="text-green-500">正确答案: ${item.correctAnswer}</span>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        if (wrongQuestions.length > 10) {
            html += `<p class="text-gray-500 mt-2 text-center">显示前10题，共${wrongQuestions.length}题</p>`;
        }
        
        return html;
    }

    /**
     * 绑定结果页面事件
     */
    static bindResultEvents() {
        // 查看答案按钮
        document.getElementById('reviewAnswers')?.addEventListener('click', () => {
            // 跳转到第一题查看答案
            this.currentQuestionIndex = 0;
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // 重新考试按钮
        document.getElementById('restartExam')?.addEventListener('click', () => {
            if (confirm('确定要重新开始考试吗？')) {
                this.restartExam();
            }
        });
        
        // 返回首页按钮
        document.getElementById('returnToHome')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /**
     * 查看错题
     */
    static reviewWrongQuestions() {
        // 这里可以实现错题回顾功能
        AppManager.showToast('错题回顾功能开发中');
    }

    /**
     * 重新考试
     */
    static restartExam() {
        // 清除考试进度
        this.clearProgress();
        
        const duration = this.examConfig?.durationMinutes || (this.duration / 60000);
        
        if (this.examConfig && this.examConfig.mode === 'typed') {
            this.init(
                this.currentBank,
                this.examConfig.singleCount,
                this.examConfig.multipleCount,
                this.examConfig.judgeCount,
                duration,
                this.examConfig.singleScore,
                this.examConfig.multipleScore,
                this.examConfig.judgeScore
            );
        } else {
            const totalCount = this.examConfig?.totalCount || this.examQuestions.length;
            this.init(this.currentBank, totalCount, duration);
        }
        
        // 隐藏结果页面和答案对比
        const examResult = document.getElementById('examResult');
        if (examResult) {
            examResult.classList.add('hidden');
        }
        const answerComparison = document.getElementById('answerComparison');
        if (answerComparison) {
            answerComparison.classList.add('hidden');
        }
        document.getElementById('scoreModal')?.classList.add('hidden');
    }

    /**
     * 获取未作答的题目数量
     * @returns {number} 未作答数量
     */
    static getUnansweredCount() {
        let count = 0;
        
        for (let i = 0; i < this.examQuestions.length; i++) {
            if (this.answers[i] === undefined) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * 保存考试记录
     * @param {Object} result 考试结果
     */
    static saveExamRecord(result) {
        const record = {
            bankId: this.currentBank.id,
            bankName: this.currentBank.name,
            candidateName: this.candidateName,
            score: result.score,
            correctCount: result.correctCount,
            wrongCount: result.wrongCount,
            skippedCount: result.skippedCount,
            totalQuestions: result.totalQuestions,
            completedTime: Date.now(),
            duration: this.duration / 60000 // 分钟
        };
        
        // 保存到历史记录
        StorageManager.saveExamRecord(record);
    }

    /**
     * 保存考试进度
     */
    static saveProgress() {
        const progress = {
            bankId: this.currentBank.id,
            examQuestions: this.examQuestions,
            answers: this.answers,
            currentQuestionIndex: this.currentQuestionIndex,
            startTime: this.startTime,
            duration: this.duration,
            markedQuestions: Array.from(this.markedQuestions),
            examSubmitted: this.examSubmitted,
            questionResults: this.questionResults,
            candidateName: this.candidateName,
            examConfig: this.examConfig
        };
        
        localStorage.setItem('exam_progress', JSON.stringify(progress));
    }

    /**
     * 继续考试
     * @returns {boolean} 是否成功继续
     */
    static continueExam() {
        const progressStr = localStorage.getItem('exam_progress');
        
        if (!progressStr) {
            return false;
        }
        
        try {
            const progress = JSON.parse(progressStr);
            
            // 先恢复考试状态（不渲染）
            this.currentBank = StorageManager.getQuestionBank(progress.bankId);
            this.examQuestions = progress.examQuestions;
            this.answers = progress.answers || {};
            this.currentQuestionIndex = progress.currentQuestionIndex || 0;
            this.startTime = progress.startTime;
            this.duration = progress.duration;
            this.markedQuestions = new Set(progress.markedQuestions || []);
            this.examSubmitted = progress.examSubmitted || false;
            this.questionResults = progress.questionResults || {};
            this.candidateName = (progress.candidateName || '').trim();
            this.examConfig = progress.examConfig || null;
            
            // 重置事件绑定标记（因为可能重新初始化）
            this._eventsBound = false;
            this._processingNextQuestion = false;
            
            // 先渲染界面，确保UI正常显示
            this.renderExamHeader();
            this.renderCurrentQuestion();
            this.renderQuestionNavigation();
            this.renderTimer();
            
            // 绑定事件
            this.bindEvents();
            
            // 初始化下一题/交卷按钮（必须在bindEvents之后）
            this.updateNextButton();
            
            // 延迟显示确认对话框，确保UI已经渲染完成
            setTimeout(() => {
                // 询问是否继续上次的考试
                if (confirm('检测到未完成的考试，是否继续？')) {
                    // UI已经渲染，启动计时器即可
                    this.startTimer();
                    return true;
                } else {
                    // 清除进度并重新加载页面
                    this.clearProgress();
                    window.location.reload();
                    return false;
                }
            }, 100);
            
            return true;
        } catch (error) {
            console.error('继续考试失败:', error);
            // 清除损坏的进度
            this.clearProgress();
            return false;
        }
    }

    /**
     * 清除考试进度
     */
    static clearProgress() {
        localStorage.removeItem('exam_progress');
    }

    /**
     * 处理时间到
     */
    static handleTimeUp() {
        // 清除计时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        alert('考试时间到！');
        this.submitExam();
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
     * 获取考试统计信息
     * @returns {Object} 统计信息
     */
    static getExamStats() {
        return {
            currentQuestion: this.currentQuestionIndex + 1,
            totalQuestions: this.examQuestions.length,
            answeredCount: Object.keys(this.answers).length,
            remainingTime: Math.max(0, Math.floor((this.startTime + this.duration - Date.now()) / 1000))
        };
    }
    
    /**
     * 按题型筛选题目
     * @param {string} type 题型
     */
    static filterQuestionsByType(type) {
        const buttons = document.querySelectorAll('.question-nav-btn');
        
        buttons.forEach((btn, index) => {
            const question = this.examQuestions[index];
            if (type === 'all' || question.type === type) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });
    }
}