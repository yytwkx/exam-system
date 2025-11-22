// 题库管理模块
class ManageManager {
    /**
     * 初始化题库管理页面
     */
    static init() {
        console.log('初始化题库管理页面...');
        
        // 渲染题库列表
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
                window.location.href = 'index.html';
            });
        }
        
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
     * 渲染题库列表
     */
    static renderQuestionBankList() {
        const bankListElement = document.getElementById('questionBankList');
        if (!bankListElement) return;
        
        // 获取所有题库
        const banks = StorageManager.getAllQuestionBanks();
        
        if (banks.length === 0) {
            bankListElement.innerHTML = `
                <div class="text-center p-6 text-gray-500">
                    <i class="fa fa-book fa-3x mb-3"></i>
                    <p>暂无题库，请先导入</p>
                </div>
            `;
            return;
        }
        
        // 渲染每个题库
        bankListElement.innerHTML = banks.map(bank => {
            // 计算各类型题目数量
            const questions = bank.questions || [];
            const totalQuestions = questions.length;
            const singleCount = questions.filter(q => q.type === 'single').length;
            const multipleCount = questions.filter(q => q.type === 'multiple').length;
            const judgeCount = questions.filter(q => q.type === 'judge').length;
            
            // 处理创建时间
            const createTime = bank.createTime || bank.createdAt || Date.now();
            const createDate = new Date(createTime);
            const createTimeStr = isNaN(createDate.getTime()) ? '未知' : createDate.toLocaleString('zh-CN');
            
            return `
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-xl font-bold text-blue-700 mb-1">${bank.name}</h4>
                        <p class="text-sm text-gray-500">
                            <i class="fa fa-clock-o mr-1"></i>创建于 ${createTimeStr}
                        </p>
                    </div>
                    <div class="bg-${bank.type === 'exam' ? 'red' : 'green'}-100 text-${bank.type === 'exam' ? 'red' : 'green'}-700 px-3 py-1 rounded-full text-xs font-bold">
                        ${bank.type === 'exam' ? '考试模式' : '学习模式'}
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-4 gap-4">
                    <div class="text-center">
                        <span class="block font-bold text-lg">${totalQuestions}</span>
                        <span class="text-xs text-gray-500">总题数</span>
                    </div>
                    <div class="text-center">
                        <span class="block font-bold text-lg">${singleCount}</span>
                        <span class="text-xs text-gray-500">单选题</span>
                    </div>
                    <div class="text-center">
                        <span class="block font-bold text-lg">${multipleCount}</span>
                        <span class="text-xs text-gray-500">多选题</span>
                    </div>
                    <div class="text-center">
                        <span class="block font-bold text-lg">${judgeCount}</span>
                        <span class="text-xs text-gray-500">判断题</span>
                    </div>
                </div>
                <div class="mt-3 flex justify-end space-x-2">
                    <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm" onclick="ManageManager.showExportConfirm('${bank.id}')">
                        <i class="fa fa-download mr-1"></i>导出
                    </button>
                    <button class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm" onclick="window.location.href='bankDetail.html?bankId=${bank.id}'">
                        <i class="fa fa-info-circle mr-1"></i>详情
                    </button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm" onclick="ManageManager.showDeleteConfirm('${bank.id}')">
                        <i class="fa fa-trash mr-1"></i>删除
                    </button>
                </div>
            </div>
        `;
        }).join('');
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