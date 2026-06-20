// 题库管理模块
class ManageManager {
    /**
     * 初始化题库管理页面
     */
    static init() {
        console.log('初始化题库管理页面...');
        
        StorageManager.init();
        
        // 清除任何可能存在的当前选中题库状态，确保显示所有题库
        this.currentExportBankId = null;
        this.currentDeleteBankId = null;
        
        // 渲染题库列表（始终显示所有题库）
        this.renderQuestionBankList();
        
        // 绑定事件
        this.bindEvents();
        
        // 暴露更新列表函数到全局
        window.updateQuestionBankList = () => this.renderQuestionBankList();
    }
    
    /**
     * 绑定页面事件
     */
    static bindEvents() {
        // 返回首页按钮
        const backToHomeBtn = document.getElementById('backToHome');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                window.location.href = 'index.html?t=' + Date.now();
            });
        }
        
        // 绑定 manage.html 的导入功能
        this.bindImportEvents();
        
        // 导出确认相关事件
        const cancelExportBtn = document.getElementById('cancelExport');
        const confirmExportBtn = document.getElementById('confirmExport');
        
        // 删除确认相关事件
        const cancelDeleteBtn = document.getElementById('cancelDelete');
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        
        // 取消导出
        if (cancelExportBtn) {
            cancelExportBtn.addEventListener('click', () => {
                this.hideModal('exportConfirmModal');
            });
        }
        
        // 确认导出
        if (confirmExportBtn) {
            confirmExportBtn.addEventListener('click', () => {
                const bankId = this.getCurrentExportBankId();
                if (bankId) {
                    this.exportBank(bankId);
                }
                this.hideModal('exportConfirmModal');
            });
        }
        
        // 取消删除
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.hideModal('deleteConfirmModal');
            });
        }
        
        // 确认删除
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                const bankId = this.getCurrentDeleteBankId();
                if (bankId) {
                    this.deleteBank(bankId);
                }
                this.hideModal('deleteConfirmModal');
            });
        }
    }
    
    /**
     * 绑定 manage.html 的导入事件
     */
    static bindImportEvents() {
        const importFile = document.getElementById('importFile');
        const startImportBtn = document.getElementById('startImport');
        const importProgress = document.getElementById('importProgress');
        
        if (importFile) {
            importFile.addEventListener('change', () => {
                if (importFile.files.length > 0) {
                    console.log('已选择文件:', importFile.files[0].name);
                }
            });
        }
        
        if (startImportBtn) {
            startImportBtn.addEventListener('click', async () => {
                if (!importFile || importFile.files.length === 0) {
                    alert('请先选择要导入的文件');
                    return;
                }
                
                const file = importFile.files[0];
                const fileExtension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
                
                if (!['.csv', '.json'].includes(fileExtension)) {
                    alert('仅支持 CSV 和 JSON 格式的文件');
                    return;
                }
                
                if (importProgress) importProgress.classList.remove('hidden');
                
                try {
                    let questionBank;
                    
                    if (fileExtension === '.json') {
                        questionBank = await ImportManager.parseJsonFileAsync(file);
                    } else {
                        // CSV 使用 Excel 解析方式
                        const questions = await ImportManager.parseExcelFileAsync(file);
                        questionBank = {
                            id: StorageManager.generateUniqueId(),
                            name: file.name.replace(fileExtension, ''),
                            description: `导入自CSV文件，共${questions.length}题`,
                            createTime: Date.now(),
                            updateTime: Date.now(),
                            questions: questions
                        };
                    }
                    
                    // 标准化并保存
                    const standardizedBank = ImportManager.standardizeQuestionBankFormat(questionBank);
                    const success = StorageManager.addQuestionBank(standardizedBank);
                    
                    if (success) {
                        alert(`题库导入成功！共${standardizedBank.questions.length}道题目`);
                        importFile.value = '';
                        // 直接重新渲染列表，不刷新页面（避免缓存问题）
                        ManageManager.renderQuestionBankList();
                    } else {
                        alert('题库保存失败');
                    }
                } catch (error) {
                    console.error('导入失败:', error);
                    alert('导入失败: ' + error.message);
                } finally {
                    if (importProgress) importProgress.classList.add('hidden');
                }
            });
        }
    }
    
    /**
     * 渲染题库列表
     */
    static renderQuestionBankList() {
        const bankListElement = document.getElementById('questionBankList');
        if (!bankListElement) return;
        
        // 获取所有题库，不做任何过滤，与首页显示完全一致
        const banks = StorageManager.getAllQuestionBanks();
        
        // 更新题库数量显示
        const countBadge = document.getElementById('bankCountBadge');
        if (countBadge) {
            countBadge.textContent = `(共 ${banks.length} 个)`;
        }
        
        // 清空容器，准备逐个添加
        bankListElement.innerHTML = '';
        
        if (banks.length === 0) {
            bankListElement.innerHTML = `
                <div class="text-center p-6 text-gray-500">
                    <i class="fa fa-book fa-3x mb-3"></i>
                    <p>暂无题库，请先导入</p>
                </div>
            `;
            return;
        }
        
        // 逐个安全渲染每个题库，一个出错不影响其他
        banks.forEach((bank, index) => {
            try {
                if (!bank || typeof bank !== 'object') {
                    console.warn('跳过无效题库:', index, bank);
                    return;
                }
                
                const questions = bank.questions || [];
                const totalQuestions = questions.length;
                const singleCount = questions.filter(q => q && q.type === 'single').length;
                const multipleCount = questions.filter(q => q && q.type === 'multiple').length;
                const judgeCount = questions.filter(q => q && q.type === 'judge').length;
                
                const createTime = bank.createTime || bank.createdAt || Date.now();
                const createDate = new Date(createTime);
                const createTimeStr = isNaN(createDate.getTime()) 
                    ? '未知' 
                    : createDate.toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                
                // 安全生成题目列表HTML
                let questionsHtml = '';
                try {
                    questionsHtml = questions.map((q, i) => {
                        if (!q || typeof q !== 'object') return '';
                        
                        let optionsHtml = '';
                        if (q.options && typeof q.options === 'object' && q.options !== null) {
                            try {
                                const entries = Object.entries(q.options);
                                if (entries.length > 0) {
                                    optionsHtml = `<div class="mt-1 text-xs text-gray-600">${entries.map(([k, v]) => `<span class="mr-3">${k}. ${v}</span>`).join('')}</div>`;
                                }
                            } catch (e) {}
                        }
                        
                        return `
                            <div class="p-2 bg-gray-50 rounded text-sm">
                                <div class="flex items-start gap-2">
                                    <span class="text-blue-600 font-bold flex-shrink-0">${i + 1}.</span>
                                    <div class="flex-1">
                                        <p class="text-gray-800">${q.content || '无题目内容'}</p>
                                        <div class="mt-1 text-xs text-gray-500">
                                            <span class="inline-block px-2 py-0.5 rounded ${q.type === 'single' ? 'bg-blue-100 text-blue-700' : q.type === 'multiple' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'} mr-2">
                                                ${q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : '判断'}
                                            </span>
                                            <span class="text-green-600 font-medium">答案: ${q.answer || '无'}</span>
                                        </div>
                                        ${optionsHtml}
                                        ${q.analysis ? `<p class="mt-1 text-xs text-orange-600">解析: ${q.analysis}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } catch (e) {
                    console.error('生成题目列表HTML失败:', e);
                    questionsHtml = '<p class="text-gray-500">题目列表加载失败</p>';
                }
                
                const card = document.createElement('div');
                card.className = 'border rounded-lg p-4 hover:shadow-md transition-shadow mb-3';
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="text-xl font-bold text-blue-700 mb-1">${bank.name || '未命名题库'}</h4>
                            <p class="text-sm text-gray-500">
                                <i class="fa fa-clock-o mr-1"></i>创建于 ${createTimeStr}
                            </p>
                        </div>
                        <div class="bg-${bank.type === 'exam' ? 'red' : 'green'}-100 text-${bank.type === 'exam' ? 'red' : 'green'}-700 px-3 py-1 rounded-full text-xs font-bold">
                            ${bank.type === 'exam' ? '考试模式' : '学习模式'}
                        </div>
                    </div>
                    <div class="mt-3 grid grid-cols-4 gap-4">
                        <div class="text-center"><span class="block font-bold text-lg">${totalQuestions}</span><span class="text-xs text-gray-500">总题数</span></div>
                        <div class="text-center"><span class="block font-bold text-lg">${singleCount}</span><span class="text-xs text-gray-500">单选题</span></div>
                        <div class="text-center"><span class="block font-bold text-lg">${multipleCount}</span><span class="text-xs text-gray-500">多选题</span></div>
                        <div class="text-center"><span class="block font-bold text-lg">${judgeCount}</span><span class="text-xs text-gray-500">判断题</span></div>
                    </div>
                    <div class="mt-3 flex justify-end space-x-2">
                        <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm" onclick="ManageManager.showExportConfirm('${bank.id}')">
                            <i class="fa fa-download mr-1"></i>导出
                        </button>
                        <button class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm" onclick="ManageManager.toggleBankDetail('${bank.id}')">
                            <i class="fa fa-info-circle mr-1"></i>详情
                        </button>
                        <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm" onclick="ManageManager.showDeleteConfirm('${bank.id}')">
                            <i class="fa fa-trash mr-1"></i>删除
                        </button>
                    </div>
                    <div id="bankDetail-${bank.id}" class="hidden mt-4 border-t pt-4">
                        <h5 class="font-bold text-gray-700 mb-2">题目列表</h5>
                        <div class="max-h-96 overflow-y-auto space-y-2">
                            ${questionsHtml}
                        </div>
                    </div>
                `;
                
                bankListElement.appendChild(card);
            } catch (error) {
                console.error('渲染题库卡片失败:', index, error, bank);
            }
        });
    }
    
    /**
     * 显示导出确认模态框
     * @param {string} bankId 题库ID
     */
    static showExportConfirm(bankId) {
        // 保存当前要导出的题库ID
        this.currentExportBankId = bankId;
        
        // 显示模态框
        const modal = document.getElementById('exportConfirmModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    /**
     * 获取当前要导出的题库ID
     * @returns {string|null} 题库ID
     */
    static getCurrentExportBankId() {
        return this.currentExportBankId || null;
    }
    
    /**
     * 导出题库
     * @param {string} bankId 题库ID
     */
    static exportBank(bankId) {
        try {
            const bank = StorageManager.getQuestionBank(bankId);
            if (!bank) {
                alert('题库不存在');
                return;
            }
            
            // 导出为JSON格式
            const jsonContent = JSON.stringify(bank, null, 2);
            const fileName = `${bank.name}_${new Date().toISOString().slice(0, 10)}.json`;
            
            // 下载文件
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败: ' + error.message);
        }
    }
    
    /**
     * 显示删除确认模态框
     * @param {string} bankId 题库ID
     */
    static showDeleteConfirm(bankId) {
        // 保存当前要删除的题库ID
        this.currentDeleteBankId = bankId;
        
        // 显示模态框
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    /**
     * 展开/收起题库详情
     * @param {string} bankId 题库ID
     */
    static toggleBankDetail(bankId) {
        const detailPanel = document.getElementById(`bankDetail-${bankId}`);
        if (detailPanel) {
            detailPanel.classList.toggle('hidden');
        }
    }
    
    /**
     * 获取当前要删除的题库ID
     * @returns {string|null} 题库ID
     */
    static getCurrentDeleteBankId() {
        return this.currentDeleteBankId || null;
    }
    
    /**
     * 删除题库
     * @param {string} bankId 题库ID
     */
    static deleteBank(bankId) {
        try {
            // 删除题库
            StorageManager.deleteQuestionBank(bankId);
            
            // 更新题库列表
            this.renderQuestionBankList();
            
            alert('删除成功');
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败: ' + error.message);
        }
    }
    
    /**
     * 隐藏模态框
     * @param {string} modalId 模态框ID
     */
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    ManageManager.init();
});