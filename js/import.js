/**
 * 题库导入模块
 * 负责Excel文件解析和题库导入功能
 */

class ImportManager {
    /**
     * 初始化导入功能
     */
    static init() {
        // 绑定导入按钮事件
        document.getElementById('importBtn')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('cancelImport')?.addEventListener('click', () => this.hideImportModal());
        document.getElementById('confirmImport')?.addEventListener('click', () => this.handleImport());
        
        // 文件选择变化事件
        document.getElementById('excelFile')?.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    /**
     * 显示导入对话框
     */
    static showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.remove('hidden');
            // 清空输入
            document.getElementById('bankName').value = '';
            document.getElementById('excelFile').value = '';
        }
    }

    /**
     * 隐藏导入对话框
     */
    static hideImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * 处理文件选择
     * @param {Event} e 文件选择事件
     */
    static handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            // 自动根据文件名设置题库名称
            const bankNameInput = document.getElementById('bankName');
            if (bankNameInput && !bankNameInput.value) {
                const fileName = file.name.replace(/\.(xlsx|xls)$/i, '');
                bankNameInput.value = fileName;
            }
        }
    }

    /**
     * 处理导入逻辑
     */
    static async handleImport() {
        const bankName = document.getElementById('bankName').value.trim();
        const fileInput = document.getElementById('excelFile');
        
        // 验证输入
        if (!bankName) {
            this.showToast('请输入题库名称');
            return;
        }
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showToast('请选择Excel文件');
            return;
        }
        
        const file = fileInput.files[0];
        
        // 验证文件类型
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            this.showToast('请选择Excel格式的文件');
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
            // 解析Excel文件
            const questions = await this.parseExcelFile(file);
            
            if (questions.length === 0) {
                this.showToast('未从文件中解析出有效题目');
                this.hideLoading();
                return;
            }
            
            // 创建题库对象
            const questionBank = {
                name: bankName,
                description: `导入自Excel文件，共${questions.length}题`,
                totalQuestions: questions.length,
                questions: questions
            };
            
            // 保存到本地存储
            const success = StorageManager.addQuestionBank(questionBank);
            
            if (success) {
                this.showToast('题库导入成功');
                this.hideImportModal();
                // 更新题库列表
                AppManager.updateQuestionBankList();
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
     * 解析Excel文件
     * @param {File} file Excel文件对象
     * @returns {Promise<Array>} 解析后的题目数组
     */
    static parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 获取第一个工作表
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // 转换为JSON格式
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (!jsonData || jsonData.length === 0) {
                        reject(new Error('文件内容为空'));
                        return;
                    }
                    
                    // 生成题目
                    const result = QuestionManager.generateQuestionsFromExcel(jsonData);
                    
                    if (result.errors.length > 0) {
                        // 显示解析错误，但仍然导入成功的题目
                        console.warn('解析过程中发现错误:', result.errors);
                        if (result.questions.length === 0) {
                            reject(new Error('未能解析出有效题目，请检查Excel格式'));
                            return;
                        }
                    }
                    
                    resolve(result.questions);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 导出题库为JSON文件
     * @param {Object} questionBank 题库对象
     */
    static exportQuestionBank(questionBank) {
        try {
            const dataStr = JSON.stringify(questionBank, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // 创建下载链接
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${questionBank.name}.json`;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 释放URL对象
            URL.revokeObjectURL(url);
            
            this.showToast('题库导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            this.showToast('题库导出失败');
        }
    }

    /**
     * 显示加载提示
     * @param {string} text 提示文本
     */
    static showLoading(text = '处理中...') {
        const loadingModal = document.getElementById('loadingModal');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingModal && loadingText) {
            loadingText.textContent = text;
            loadingModal.classList.remove('hidden');
        }
    }

    /**
     * 隐藏加载提示
     */
    static hideLoading() {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.classList.add('hidden');
        }
    }

    /**
     * 显示提示消息
     * @param {string} message 消息内容
     * @param {number} duration 持续时间（毫秒）
     */
    static showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            
            // 显示提示
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            
            // 设置定时器隐藏
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-20', 'opacity-0');
            }, duration);
        }
    }

    /**
     * 预览Excel文件内容
     * @param {File} file Excel文件对象
     * @returns {Promise<Object>} 预览数据
     */
    static previewExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 获取工作表信息
                    const sheetsInfo = workbook.SheetNames.map(name => {
                        const worksheet = workbook.Sheets[name];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        return {
                            name,
                            rows: jsonData.length,
                            sampleData: jsonData.slice(0, 5) // 只返回前5行作为样本
                        };
                    });
                    
                    resolve({
                        fileName: file.name,
                        size: file.size,
                        sheets: sheetsInfo
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 验证Excel文件格式
     * @param {Object} previewData 预览数据
     * @returns {Object} 验证结果
     */
    static validateExcelFormat(previewData) {
        const requiredColumns = ['题目', '选项A', '选项B', '选项C', '选项D', '正确答案', '题目类型'];
        const issues = [];
        
        if (previewData.sheets.length === 0) {
            issues.push('文件中没有找到工作表');
            return { valid: false, issues };
        }
        
        // 检查第一个工作表的表头
        const firstSheet = previewData.sheets[0];
        if (firstSheet.sampleData.length > 0) {
            const headers = firstSheet.sampleData[0];
            const headerText = headers.join(' ');
            
            // 检查是否包含必要的列
            const missingColumns = requiredColumns.filter(col => 
                !headers.some(header => header && header.toString().includes(col))
            );
            
            if (missingColumns.length > 0) {
                issues.push(`可能缺少必要的列: ${missingColumns.join(', ')}`);
            }
            
            if (firstSheet.rows <= 1) {
                issues.push('文件中没有题目数据');
            }
        } else {
            issues.push('工作表为空');
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }
}