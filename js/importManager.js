/**
 * 导入管理器
 * 负责处理题库导入、导出和格式转换
 */

class ImportManager {
    /**
     * 初始化导入模块
     */
    static init() {
        console.log('初始化导入模块...');
        
        // 绑定文件上传事件
        this.bindUploadEvents();
        
        // 初始化导入历史记录
        this.renderImportHistory();
    }

    /**
     * 绑定上传事件
     */
    static bindUploadEvents() {
        // 获取文件上传元素
        const fileInput = document.getElementById('questionBankFile');
        const uploadBtn = document.getElementById('uploadQuestionBankBtn');
        const templateDownloadBtn = document.getElementById('downloadTemplateBtn');
        
        // 绑定文件选择变化事件
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.validateUploadFile(e.target.files[0]);
            });
        }
        
        // 绑定上传按钮点击事件
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                if (fileInput && fileInput.files.length > 0) {
                    this.uploadQuestionBank(fileInput.files[0]);
                } else {
                    AppManager.showToast('请先选择要上传的文件');
                }
            });
        }
        
        // 绑定模板下载按钮点击事件
        if (templateDownloadBtn) {
            templateDownloadBtn.addEventListener('click', () => {
                this.downloadTemplate();
            });
        }
    }

    /**
     * 验证上传文件
     * @param {File} file 上传的文件
     * @returns {boolean} 是否有效
     */
    static validateUploadFile(file) {
        if (!file) {
            AppManager.showToast('请选择文件');
            return false;
        }
        
        // 检查文件类型
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json'
        ];
        
        const validExtensions = ['.xlsx', '.xls', '.json'];
        const fileExtension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
        
        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            AppManager.showToast('仅支持Excel(.xlsx, .xls)和JSON格式的文件');
            return false;
        }
        
        // 检查文件大小（限制为5MB）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            AppManager.showToast('文件大小不能超过5MB');
            return false;
        }
        
        // 显示文件信息
        const fileInfoElement = document.getElementById('fileInfo');
        if (fileInfoElement) {
            fileInfoElement.innerHTML = `
                <div class="file-info bg-green-50 p-3 rounded-lg">
                    <p class="text-green-700">已选择: ${file.name}</p>
                    <p class="text-sm text-gray-600">大小: ${(file.size / 1024).toFixed(2)} KB</p>
                </div>
            `;
        }
        
        return true;
    }

    /**
     * 处理导入逻辑（从导入对话框）
     */
    static async handleImport() {
        const bankNameInput = document.getElementById('bankName');
        const fileInput = document.getElementById('excelFile');
        
        if (!bankNameInput || !fileInput) {
            this.showToast('导入对话框未正确初始化');
            return;
        }
        
        const bankName = bankNameInput.value.trim();
        
        // 验证输入
        if (!bankName) {
            this.showToast('请输入题库名称');
            return;
        }
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showToast('请选择文件');
            return;
        }
        
        const file = fileInput.files[0];
        
        // 验证文件类型
        const fileExtension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
        if (!['.xlsx', '.xls', '.json'].includes(fileExtension)) {
            this.showToast('请选择Excel或JSON格式的文件');
            return;
        }
        
        // 验证文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('文件大小不能超过10MB');
            return;
        }
        
        // 显示加载提示
        this.showLoading('正在解析文件...');
        
        try {
            let questionBank;
            
            if (fileExtension === '.json') {
                // 处理JSON文件
                questionBank = await this.parseJsonFileAsync(file);
            } else {
                // 处理Excel文件
                const questions = await this.parseExcelFileAsync(file);
                questionBank = {
                    id: StorageManager.generateUniqueId(),
                    name: bankName,
                    description: `导入自Excel文件，共${questions.length}题`,
                    createTime: Date.now(),
                    updateTime: Date.now(),
                    questions: questions
                };
            }
            
            // 设置题库名称
            questionBank.name = bankName;
            
            // 保存到本地存储
            const success = StorageManager.addQuestionBank(questionBank);
            
            if (success) {
                this.showToast(`题库导入成功！共${questionBank.questions.length}道题目`);
                this.hideImportModal();
                // 更新题库列表
                if (typeof AppManager !== 'undefined') {
                    AppManager.updateQuestionBankList();
                }
                // 重置文件输入
                fileInput.value = '';
                bankNameInput.value = '';
            } else {
                this.showToast('题库保存失败，请稍后重试');
            }
        } catch (error) {
            console.error('导入失败:', error);
            this.showToast('文件解析失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 异步解析JSON文件
     * @param {File} file JSON文件
     * @returns {Promise<Object>} 题库对象
     */
    static parseJsonFileAsync(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    
                    // 验证JSON格式
                    if (this.validateQuestionBankFormat(jsonData)) {
                        // 标准化题库格式
                        const standardizedBank = this.standardizeQuestionBankFormat(jsonData);
                        resolve(standardizedBank);
                    } else {
                        reject(new Error('JSON文件格式不正确，请检查是否符合题库格式要求'));
                    }
                } catch (error) {
                    reject(new Error('解析JSON文件失败: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * 确保已加载xlsx库
     * @returns {Promise<void>}
     */
    static ensureXlsxLibraryLoaded() {
        if (typeof XLSX !== 'undefined') {
            return Promise.resolve();
        }

        if (this._xlsxLoadingPromise) {
            return this._xlsxLoadingPromise;
        }

        const localSrc = 'libs/xlsx.full.min.js';
        const cdnSrc = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

        this._xlsxLoadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = localSrc;
            script.onload = () => resolve();
            script.onerror = () => {
                console.warn('本地 xlsx.full.min.js 加载失败，即将尝试 CDN 资源');
                const fallback = document.createElement('script');
                fallback.src = cdnSrc;
                fallback.onload = () => resolve();
                fallback.onerror = () => reject(new Error('加载Excel解析库失败，请确认已运行 scripts/download-libs.ps1 或检查网络连接'));
                document.head.appendChild(fallback);
            };
            document.head.appendChild(script);
        }).catch((error) => {
            this._xlsxLoadingPromise = null;
            throw error;
        });

        return this._xlsxLoadingPromise;
    }

    /**
     * 异步解析Excel文件
     * @param {File} file Excel文件
     * @returns {Promise<Array>} 题目数组
     */
    static parseExcelFileAsync(file) {
        return new Promise((resolve, reject) => {
            if (typeof XLSX === 'undefined') {
                this.ensureXlsxLibraryLoaded()
                    .then(() => this._processExcelFileAsync(file, resolve, reject))
                    .catch(reject);
            } else {
                this._processExcelFileAsync(file, resolve, reject);
            }
        });
    }
    
    /**
     * 异步处理Excel文件
     * @param {File} file Excel文件
     * @param {Function} resolve Promise resolve
     * @param {Function} reject Promise reject
     */
    static _processExcelFileAsync(file, resolve, reject) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                // 读取Excel数据
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // 转换为JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // 转换Excel数据为标准题库格式
                const questions = [];
                jsonData.forEach((row, index) => {
                    const question = this.extractQuestionFromRow(row, index);
                    if (question && question.content) {
                        questions.push(question);
                    }
                });
                
                if (questions.length === 0) {
                    reject(new Error('Excel文件中没有找到有效的题目数据'));
                } else {
                    resolve(questions);
                }
            } catch (error) {
                console.error('解析Excel文件失败:', error);
                reject(new Error('解析Excel文件失败: ' + error.message));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('读取文件失败'));
        };
        
        reader.readAsArrayBuffer(file);
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
     * 上传题库文件（保留兼容性）
     * @param {File} file 上传的文件
     */
    static uploadQuestionBank(file) {
        if (!this.validateUploadFile(file)) {
            return;
        }
        
        // 显示加载状态
        this.showLoading('正在解析文件...');
        
        const fileExtension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
        
        if (fileExtension === '.json') {
            // 处理JSON文件
            this.parseJsonFile(file);
        } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            // 处理Excel文件
            this.parseExcelFile(file);
        }
    }

    /**
     * 解析JSON文件（同步方法，保留兼容性）
     * @param {File} file JSON文件
     */
    static parseJsonFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                // 验证JSON格式
                if (this.validateQuestionBankFormat(jsonData)) {
                    // 保存题库
                    this.saveQuestionBank(jsonData);
                } else {
                    if (typeof AppManager !== 'undefined') {
                        AppManager.showToast('JSON文件格式不正确，请检查是否符合题库格式要求');
                    }
                    this.hideLoading();
                }
            } catch (error) {
                console.error('解析JSON文件失败:', error);
                if (typeof AppManager !== 'undefined') {
                    AppManager.showToast('解析JSON文件失败: ' + error.message);
                }
                this.hideLoading();
            }
        };
        
        reader.onerror = () => {
            if (typeof AppManager !== 'undefined') {
                AppManager.showToast('读取文件失败');
            }
            this.hideLoading();
        };
        
        reader.readAsText(file);
    }

    /**
     * 解析Excel文件
     * @param {File} file Excel文件
     */
    static parseExcelFile(file) {
        // 检查是否支持Excel解析
        if (typeof XLSX === 'undefined') {
            this.ensureXlsxLibraryLoaded()
                .then(() => this._processExcelFile(file))
                .catch((error) => {
                    console.error(error);
                    AppManager.showToast(error.message || '加载Excel解析库失败，请确认已运行依赖下载脚本');
                    this.hideLoading();
                });
        } else {
            this._processExcelFile(file);
        }
    }

    /**
     * 处理Excel文件
     * @param {File} file Excel文件
     */
    static _processExcelFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                // 读取Excel数据
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // 转换为JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // 转换Excel数据为标准题库格式
                const questionBank = this.convertExcelToQuestionBank(jsonData);
                
                // 保存题库
                this.saveQuestionBank(questionBank);
            } catch (error) {
                console.error('解析Excel文件失败:', error);
                AppManager.showToast('解析Excel文件失败: ' + error.message);
                this.hideLoading();
            }
        };
        
        reader.onerror = () => {
            AppManager.showToast('读取文件失败');
            this.hideLoading();
        };
        
        reader.readAsArrayBuffer(file);
    }

    /**
     * 将Excel数据转换为标准题库格式
     * @param {Array} excelData Excel数据
     * @returns {Object} 标准题库对象
     */
    static convertExcelToQuestionBank(excelData) {
        // 创建题库对象
        const questionBank = {
            id: StorageManager.generateUniqueId(),
            name: '新导入题库_' + new Date().toLocaleDateString(),
            description: '通过Excel文件导入的题库',
            createTime: Date.now(),
            questions: []
        };
        
        // 处理每一行数据
        excelData.forEach((row, index) => {
            // 提取题目信息
            const question = this.extractQuestionFromRow(row, index);
            
            if (question && question.content) {
                questionBank.questions.push(question);
            }
        });
        
        return questionBank;
    }

    /**
     * 从Excel行提取题目信息
     * @param {Object} row Excel行数据
     * @param {number} index 行索引
     * @returns {Object} 题目对象
     */
    static extractQuestionFromRow(row, index) {
        // 支持多种列名格式（中文列名）
        const content = row['题目'] || row['题目内容'] || row['题干'] || '';
        const options = this.extractOptions(row);
        const answer = row['答案'] || row['正确答案'] || '';
        const analysis = row['解析'] || row['答案解析'] || '';
        const type = row['题型'] || row['类型'] || 'single'; // 默认单选题
        
        // 创建题目对象
        return {
            id: StorageManager.generateUniqueId(),
            index: index + 1,
            content: content,
            options: options,
            answer: answer.toUpperCase().trim(), // 标准化答案
            analysis: analysis,
            type: type || 'single',
            score: 2 // 默认分值
        };
    }

    /**
     * 从Excel行提取选项信息
     * @param {Object} row Excel行数据
     * @returns {Object} 选项对象
     */
    static extractOptions(row) {
        const options = {};
        
        // 支持多种选项格式
        // 格式1: 直接提供A/B/C/D列
        if (row['A'] || row['B'] || row['C'] || row['D']) {
            if (row['A']) options['A'] = row['A'];
            if (row['B']) options['B'] = row['B'];
            if (row['C']) options['C'] = row['C'];
            if (row['D']) options['D'] = row['D'];
            if (row['E']) options['E'] = row['E'];
        }
        // 格式2: 提供选项A/选项B等列（中文列名）
        else if (row['选项A'] || row['选项B'] || row['选项C'] || row['选项D']) {
            if (row['选项A']) options['A'] = row['选项A'];
            if (row['选项B']) options['B'] = row['选项B'];
            if (row['选项C']) options['C'] = row['选项C'];
            if (row['选项D']) options['D'] = row['选项D'];
            if (row['选项E']) options['E'] = row['选项E'];
        }
        // 格式3: 提供选项1/选项2等列
        else if (row['选项1'] || row['选项2'] || row['选项3'] || row['选项4']) {
            const optionKeys = ['A', 'B', 'C', 'D', 'E'];
            for (let i = 1; i <= 10; i++) {
                if (row[`选项${i}`]) {
                    const key = optionKeys[i - 1] || `选项${i}`;
                    options[key] = row[`选项${i}`];
                }
            }
        }
        // 格式4: 提供选项字符串
        else if (row['选项']) {
            try {
                // 尝试解析JSON字符串
                options = JSON.parse(row['选项']);
            } catch (e) {
                // 简单解析格式如: A.选项A|B.选项B|C.选项C
                const optionString = row['选项'];
                const optionParts = optionString.split(/[|，]/); // 支持|或中文逗号分隔
                
                optionParts.forEach((part, i) => {
                    const match = part.match(/^(\w+)\s*[.:：]\s*(.+)$/);
                    if (match) {
                        options[match[1]] = match[2];
                    } else {
                        // 如果格式不匹配，使用字母作为键
                        const key = String.fromCharCode(65 + i); // A, B, C, ...
                        options[key] = part.trim();
                    }
                });
            }
        }
        
        return options;
    }

    /**
     * 验证题库格式
     * @param {Object} questionBank 题库对象
     * @returns {boolean} 是否有效
     */
    static validateQuestionBankFormat(questionBank) {
        // 检查必要字段
        if (!questionBank || typeof questionBank !== 'object') {
            return false;
        }
        
        // 如果是数组，视为直接的题目列表
        if (Array.isArray(questionBank)) {
            return questionBank.length > 0 && questionBank.every(q => this.validateQuestionFormat(q));
        }
        
        // 标准题库格式
        if (!Array.isArray(questionBank.questions) || questionBank.questions.length === 0) {
            return false;
        }
        
        // 验证每个题目
        return questionBank.questions.every(q => this.validateQuestionFormat(q));
    }

    /**
     * 验证题目格式
     * @param {Object} question 题目对象
     * @returns {boolean} 是否有效
     */
    static validateQuestionFormat(question) {
        // 至少需要题目内容和答案
        return question && 
               question.content && 
               question.answer &&
               typeof question.content === 'string' &&
               typeof question.answer === 'string';
    }

    /**
     * 保存题库
     * @param {Object} questionBank 题库对象
     */
    static saveQuestionBank(questionBank) {
        try {
            // 标准化题库格式
            const standardizedBank = this.standardizeQuestionBankFormat(questionBank);
            
            // 询问用户确认题库信息
            const userConfirmed = this.confirmQuestionBankInfo(standardizedBank);
            
            if (!userConfirmed) {
                this.hideLoading();
                return;
            }
            
            // 保存到本地存储
            StorageManager.addQuestionBank(standardizedBank);
            
            // 记录导入历史
            this.addImportHistory({
                fileName: standardizedBank.name,
                questionCount: standardizedBank.questions.length,
                importTime: Date.now(),
                success: true
            });
            
            // 更新界面
            if (typeof AppManager !== 'undefined') {
                AppManager.updateQuestionBankList();
                AppManager.showStatistics();
            }
            
            this.hideLoading();
            AppManager.showToast(`题库导入成功！共${standardizedBank.questions.length}道题目`);
            
            // 重置文件选择
            const fileInput = document.getElementById('questionBankFile');
            if (fileInput) {
                fileInput.value = '';
            }
            
        } catch (error) {
            console.error('保存题库失败:', error);
            
            // 记录失败历史
            this.addImportHistory({
                fileName: questionBank.name || '未知文件',
                importTime: Date.now(),
                success: false,
                error: error.message
            });
            
            this.hideLoading();
            AppManager.showToast('保存题库失败: ' + error.message);
        }
    }

    /**
     * 标准化题库格式
     * @param {Object} questionBank 题库对象
     * @returns {Object} 标准化后的题库对象
     */
    static standardizeQuestionBankFormat(questionBank) {
        // 如果是直接的题目列表，转换为标准格式
        if (Array.isArray(questionBank)) {
            return {
                id: this.generateUniqueId(),
                name: '新导入题库_' + new Date().toLocaleDateString(),
                description: '导入的题库',
                createTime: Date.now(),
                questions: questionBank.map((q, index) => ({
                    ...q,
                    id: q.id || this.generateUniqueId(),
                    index: q.index || index + 1
                }))
            };
        }
        
        // 确保必要字段存在
        return {
            id: questionBank.id || this.generateUniqueId(),
            name: questionBank.name || '未命名题库',
            description: questionBank.description || '',
            createTime: questionBank.createTime || Date.now(),
            updateTime: Date.now(),
            questions: questionBank.questions.map((q, index) => ({
                ...q,
                id: q.id || this.generateUniqueId(),
                index: q.index || index + 1
            }))
        };
    }

    /**
     * 确认题库信息
     * @param {Object} questionBank 题库对象
     * @returns {boolean} 用户是否确认
     */
    static confirmQuestionBankInfo(questionBank) {
        // 显示确认对话框
        const name = prompt('请输入题库名称:', questionBank.name);
        
        if (name === null) return false; // 用户取消
        
        if (!name.trim()) {
            AppManager.showToast('题库名称不能为空');
            return false;
        }
        
        const description = prompt('请输入题库描述:', questionBank.description || '');
        
        if (description === null) return false; // 用户取消
        
        // 更新题库信息
        questionBank.name = name.trim();
        questionBank.description = description.trim();
        
        return true;
    }

    /**
     * 导出题库
     * @param {Object} questionBank 题库对象
     */
    static exportQuestionBank(questionBank) {
        try {
            // 创建要导出的数据
            const exportData = {
                id: questionBank.id,
                name: questionBank.name,
                description: questionBank.description,
                createTime: questionBank.createTime,
                updateTime: Date.now(),
                version: '1.0',
                questions: questionBank.questions
            };
            
            // 转换为JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // 创建Blob对象
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${questionBank.name}_${new Date().toISOString().slice(0, 10)}.json`;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
            
            AppManager.showToast('题库导出成功');
        } catch (error) {
            console.error('导出题库失败:', error);
            AppManager.showToast('导出题库失败: ' + error.message);
        }
    }

    /**
     * 下载模板文件
     */
    static downloadTemplate() {
        // 创建模板数据
        const templateData = [
            { 题目: '示例题目1', A: '选项A', B: '选项B', C: '选项C', D: '选项D', 答案: 'A', 解析: '这是示例解析1' },
            { 题目: '示例题目2', A: '选项A', B: '选项B', C: '选项C', D: '选项D', 答案: 'B', 解析: '这是示例解析2' }
        ];
        
        // 创建工作簿
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '题库');
        
        // 导出文件
        XLSX.writeFile(wb, '题库导入模板.xlsx');
        
        AppManager.showToast('模板下载成功');
    }

    /**
     * 添加导入历史
     * @param {Object} history 历史记录
     */
    static addImportHistory(history) {
        let importHistory = JSON.parse(localStorage.getItem('import_history') || '[]');
        
        // 添加新记录
        importHistory.unshift(history);
        
        // 限制历史记录数量
        if (importHistory.length > 20) {
            importHistory = importHistory.slice(0, 20);
        }
        
        // 保存历史记录
        localStorage.setItem('import_history', JSON.stringify(importHistory));
    }

    /**
     * 渲染导入历史
     */
    static renderImportHistory() {
        const historyElement = document.getElementById('importHistory');
        if (!historyElement) return;
        
        let importHistory = JSON.parse(localStorage.getItem('import_history') || '[]');
        
        if (importHistory.length === 0) {
            historyElement.innerHTML = '<p class="text-gray-500 text-center py-4">暂无导入历史</p>';
            return;
        }
        
        let html = '<div class="history-list">';
        
        importHistory.forEach((record, index) => {
            html += `
                <div class="history-item p-3 border-b flex justify-between items-center">
                    <div>
                        <div class="font-medium">${record.fileName}</div>
                        <div class="text-sm text-gray-600">
                            ${new Date(record.importTime).toLocaleString()}
                            ${record.questionCount ? ` · ${record.questionCount}题` : ''}
                        </div>
                    </div>
                    <div class="${record.success ? 'text-green-600' : 'text-red-600'}">
                        ${record.success ? '成功' : '失败'}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        historyElement.innerHTML = html;
    }

    /**
     * 显示加载状态
     * @param {string} message 加载消息
     */
    static showLoading(message) {
        const loadingElement = document.createElement('div');
        loadingElement.id = 'importLoading';
        loadingElement.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingElement.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <div class="flex items-center">
                    <div class="w-6 h-6 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mr-3"></div>
                    <p>${message || '正在处理...'}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingElement);
    }

    /**
     * 隐藏加载状态
     */
    static hideLoading() {
        const loadingElement = document.getElementById('importLoading');
        if (loadingElement) {
            document.body.removeChild(loadingElement);
        }
    }

    /**
     * 生成唯一ID（使用StorageManager的方法）
     * @returns {string} 唯一ID
     */
    static generateUniqueId() {
        if (typeof StorageManager !== 'undefined' && StorageManager.generateUniqueId) {
            return StorageManager.generateUniqueId();
        }
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 清理导入缓存
     */
    static clearImportCache() {
        localStorage.removeItem('import_history');
        this.renderImportHistory();
        AppManager.showToast('导入缓存已清理');
    }

    /**
     * 验证题库兼容性
     * @param {Object} questionBank 题库对象
     * @returns {Object} 兼容性检查结果
     */
    static checkQuestionBankCompatibility(questionBank) {
        const issues = [];
        
        // 检查题目数量
        if (!questionBank.questions || questionBank.questions.length === 0) {
            issues.push('题库中没有题目');
        }
        
        // 检查每个题目
        questionBank.questions.forEach((question, index) => {
            if (!question.content) {
                issues.push(`第${index + 1}题缺少题目内容`);
            }
            
            if (!question.answer) {
                issues.push(`第${index + 1}题缺少正确答案`);
            }
            
            if (!question.options || Object.keys(question.options).length === 0) {
                issues.push(`第${index + 1}题缺少选项`);
            }
        });
        
        return {
            compatible: issues.length === 0,
            issues: issues,
            questionCount: questionBank.questions?.length || 0
        };
    }
}