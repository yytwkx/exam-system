/**
 * 试卷生成器
 * 负责从题库随机抽题并生成 Word 文档（.doc）
 */

class PaperGenerator {
    static STORAGE_KEY = 'paper_generation_schemes';

    static getSchemes() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    static saveScheme(scheme) {
        const schemes = this.getSchemes();
        const newScheme = {
            id: 'scheme_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: scheme.name || '未命名方案',
            bankId: scheme.bankId,
            bankName: scheme.bankName,
            singleCount: parseInt(scheme.singleCount) || 0,
            multipleCount: parseInt(scheme.multipleCount) || 0,
            judgeCount: parseInt(scheme.judgeCount) || 0,
            singleScore: parseFloat(scheme.singleScore) || 1,
            multipleScore: parseFloat(scheme.multipleScore) || 2,
            judgeScore: parseFloat(scheme.judgeScore) || 1,
            createTime: new Date().toISOString()
        };
        schemes.push(newScheme);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(schemes));
        return newScheme;
    }

    static deleteScheme(id) {
        let schemes = this.getSchemes();
        schemes = schemes.filter(s => s.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(schemes));
    }

    static generateQuestions(bank, config) {
        const questions = JSON.parse(JSON.stringify(bank.questions || []));
        const single = questions.filter(q => q.type === 'single');
        const multiple = questions.filter(q => q.type === 'multiple');
        const judge = questions.filter(q => q.type === 'judge');
        this._shuffle(single);
        this._shuffle(multiple);
        this._shuffle(judge);

        if (single.length < config.singleCount) {
            throw new Error(`单选题数量不足，题库中只有 ${single.length} 道单选题`);
        }
        if (multiple.length < config.multipleCount) {
            throw new Error(`多选题数量不足，题库中只有 ${multiple.length} 道多选题`);
        }
        if (judge.length < config.judgeCount) {
            throw new Error(`判断题数量不足，题库中只有 ${judge.length} 道判断题`);
        }

        const selected = [
            ...single.slice(0, config.singleCount),
            ...multiple.slice(0, config.multipleCount),
            ...judge.slice(0, config.judgeCount)
        ];
        selected.forEach(q => {
            if (q.type === 'single') q.score = config.singleScore;
            else if (q.type === 'multiple') q.score = config.multipleScore;
            else if (q.type === 'judge') q.score = config.judgeScore;
        });
        return selected;
    }

    static _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    static generateWord(bank, questions, config) {
        const html = this._buildWordHtml(bank, questions, config);
        const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const filename = `${this._sanitizeFilename(bank.name)}_试卷_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    static _buildWordHtml(bank, questions, config) {
        const totalScore = (config.singleCount * config.singleScore)
            + (config.multipleCount * config.multipleScore)
            + (config.judgeCount * config.judgeScore);

        const singleQuestions = questions.filter(q => q.type === 'single');
        const multipleQuestions = questions.filter(q => q.type === 'multiple');
        const judgeQuestions = questions.filter(q => q.type === 'judge');

        // 题目内容按顺序生成（分栏会自动处理从左到右、从上到下的流动）
        let questionContent = '';
        let num = 1;

        if (singleQuestions.length > 0) {
            questionContent += `<div class="section-title">一、单选题（共 ${singleQuestions.length} 题，每题 ${config.singleScore} 分）</div>`;
            singleQuestions.forEach(q => { questionContent += this._renderQuestion(q, num++); });
        }
        if (multipleQuestions.length > 0) {
            questionContent += `<div class="section-title">二、多选题（共 ${multipleQuestions.length} 题，每题 ${config.multipleScore} 分）</div>`;
            multipleQuestions.forEach(q => { questionContent += this._renderQuestion(q, num++); });
        }
        if (judgeQuestions.length > 0) {
            questionContent += `<div class="section-title">三、判断题（共 ${judgeQuestions.length} 题，每题 ${config.judgeScore} 分）</div>`;
            judgeQuestions.forEach(q => { questionContent += this._renderQuestion(q, num++); });
        }

        const answerContent = `<div class="answer-page-title">参考答案</div>` + this._buildAnswerKey(questions);

        return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${this._escapeHtml(bank.name)} 试卷</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
<w:PageSetup>
<w:PaperSize w:val="A3"/>
<w:Orientation w:val="Landscape"/>
<w:Margin w:top="1134" w:right="1134" w:bottom="850" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/>
<w:Columns w:num="2" w:space="567"/>
</w:PageSetup>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
    mso-page-orientation: landscape;
    mso-page-width: 420mm;
    mso-page-height: 297mm;
    margin: 2cm 2cm 1.5cm 2.5cm;
    mso-header-margin: .5cm;
    mso-footer-margin: .5cm;
}
body {
    font-family: "宋体", SimSun, serif;
    font-size: 9pt;
    line-height: 1.2;
    color: #000;
    mso-page-width: 420mm;
    mso-page-height: 297mm;
    mso-page-orientation: landscape;
    mso-column-count: 2;
    mso-column-gap: 0.6cm;
    column-count: 2;
    column-gap: 0.6cm;
    -webkit-column-count: 2;
    -webkit-column-gap: 0.6cm;
    -moz-column-count: 2;
    -moz-column-gap: 0.6cm;
}
.span-all {
    mso-column-span: all;
    column-span: all;
    -webkit-column-span: all;
}
.paper-title {
    font-size: 15pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 4pt;
    font-family: "黑体", SimHei, sans-serif;
}
.info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4pt;
}
.info-table td {
    width: 33%;
    padding: 1pt 0;
    font-size: 9pt;
    border: none;
    text-align: left;
}
.section-title {
    font-size: 10pt;
    font-weight: bold;
    margin-top: 3pt;
    margin-bottom: 1pt;
    font-family: "黑体", SimHei, sans-serif;
    break-after: avoid;
    page-break-after: avoid;
}
.question {
    margin-bottom: 1pt;
    text-align: justify;
    break-inside: avoid;
    page-break-inside: avoid;
}
.question-text {
    margin-bottom: 0pt;
    font-size: 9pt;
    line-height: 1.2;
}
.options-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0pt;
    margin-left: 12pt;
}
.options-table td {
    width: 50%;
    padding: 0pt 0;
    font-size: 8.5pt;
    border: none;
    vertical-align: top;
    line-height: 1.15;
}
.answer-page-title {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    margin-top: 14pt;
    margin-bottom: 8pt;
    font-family: "黑体", SimHei, sans-serif;
    page-break-before: always;
    mso-column-span: all;
    column-span: all;
    -webkit-column-span: all;
}
.answer-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4pt;
}
.answer-table td {
    width: 25%;
    padding: 1pt 3pt;
    font-size: 9pt;
    border: none;
    line-height: 1.4;
}
</style>
</head>
<body>

<div class="span-all">
<div class="paper-title">${this._escapeHtml(bank.name)} 模拟试卷</div>
<table class="info-table">
<tr>
<td>单位：______________</td>
<td>姓名：______________</td>
<td>得分：__________ / ${totalScore}分</td>
</tr>
</table>
</div>

${questionContent}

${answerContent}

<div style="mso-element:footer">
<p style="text-align:center; font-size:8pt; color:#333; margin:0;">
<span style="mso-field-code:' PAGE \\* MERGEFORMAT '">1</span>
<span style="mso-spacerun:yes"> </span>/<span style="mso-spacerun:yes"> </span>
<span style="mso-field-code:' NUMPAGES \\* MERGEFORMAT '">1</span>
</p>
</div>

</body>
</html>`;
    }

    static _renderQuestion(q, num) {
        let html = `<div class="question">`;

        if (q.type === 'judge') {
            html += `<div class="question-text">（&nbsp;）${num}. ${this._escapeHtml(q.content)}</div>`;
        } else {
            html += `<div class="question-text">${num}. ${this._escapeHtml(q.content)}</div>`;
        }

        if (q.type === 'judge') {
            html += '</div>';
            return html;
        }

        let options = {};
        if (q.options && typeof q.options === 'object' && Object.keys(q.options).length > 0) {
            options = q.options;
        } else {
            if (q.optionA !== undefined && q.optionA !== '') options['A'] = q.optionA;
            if (q.optionB !== undefined && q.optionB !== '') options['B'] = q.optionB;
            if (q.optionC !== undefined && q.optionC !== '') options['C'] = q.optionC;
            if (q.optionD !== undefined && q.optionD !== '') options['D'] = q.optionD;
            if (q.optionE !== undefined && q.optionE !== '') options['E'] = q.optionE;
            if (q.optionF !== undefined && q.optionF !== '') options['F'] = q.optionF;
        }

        const optionKeys = Object.keys(options).sort();
        if (optionKeys.length > 0) {
            html += '<table class="options-table"><tr>';
            let count = 0;
            optionKeys.forEach((key) => {
                if (count > 0 && count % 2 === 0) {
                    html += '</tr><tr>';
                }
                html += `<td>${key}. ${this._escapeHtml(options[key])}</td>`;
                count++;
            });
            if (count % 2 === 1) {
                html += '<td></td>';
            }
            html += '</tr></table>';
        }

        html += '</div>';
        return html;
    }

    static _buildAnswerKey(questions) {
        let html = '<table class="answer-table">';
        let count = 0;
        questions.forEach((q, index) => {
            if (count % 4 === 0) {
                if (count > 0) html += '</tr>';
                html += '<tr>';
            }
            const answer = this._normalizeAnswer(q);
            html += `<td>${index + 1}. ${answer}</td>`;
            count++;
        });
        if (count % 4 !== 0) {
            while (count % 4 !== 0) {
                html += '<td></td>';
                count++;
            }
        }
        html += '</tr></table>';
        return html;
    }

    static _normalizeAnswer(q) {
        let ans = q.answer || '';
        if (typeof ans === 'string') {
            ans = ans.toUpperCase().trim();
        }
        if (q.type === 'judge') {
            const a = ans.replace(/[^AB]/g, '');
            if (a === 'A') return '正确';
            if (a === 'B') return '错误';
            return ans;
        }
        return ans.replace(/[^A-Z,]/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '') || '—';
    }

    static _escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    static _sanitizeFilename(name) {
        return String(name).replace(/[\\/:*?"<>|]/g, '_');
    }
}
