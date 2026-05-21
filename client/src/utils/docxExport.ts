const TYPE_LABELS: Record<string, string> = {
  dashboard: '数据总览',
  channel: '渠道分析',
  merchant: '期商分析',
}

function parseMarkdownToHTML(analysis: string): string {
  const lines = analysis.split('\n')
  let html = ''
  let listItems: string[] = []
  let listTag = 'ul'

  const flushList = () => {
    if (listItems.length > 0) {
      html += `<${listTag} style="padding-left:20px;margin:8px 0;">`
      for (const item of listItems) {
        html += item
      }
      html += `</${listTag}>`
      listItems = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('## ')) {
      flushList()
      html += `<h2 style="font-size:16px;margin:16px 0 8px;font-weight:600;color:#1a1a1a;">${escapeHTML(trimmed.replace('## ', ''))}</h2>`
      continue
    }

    if (trimmed.startsWith('### ')) {
      flushList()
      html += `<h3 style="font-size:14px;margin:12px 0 6px;font-weight:600;color:#333;">${escapeHTML(trimmed.replace('### ', ''))}</h3>`
      continue
    }

    if (trimmed.startsWith('- ')) {
      listTag = 'ul'
      listItems.push(`<li style="margin-bottom:6px;line-height:1.7;">${parseInlineHTML(trimmed.replace('- ', ''))}</li>`)
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      listTag = 'ol'
      listItems.push(`<li style="margin-bottom:6px;line-height:1.7;">${parseInlineHTML(trimmed.replace(/^\d+\.\s/, ''))}</li>`)
      continue
    }

    flushList()
    html += `<p style="margin:6px 0;line-height:1.8;">${parseInlineHTML(trimmed)}</p>`
  }

  flushList()
  return html
}

function parseInlineHTML(text: string): string {
  return escapeHTML(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#CF1322;">$1</strong>')
}

function escapeHTML(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildDataHTML(type: string, dataSnapshot?: Record<string, any>): string {
  if (!dataSnapshot) return ''

  const entries: [string, string][] = []

  if (type === 'dashboard') {
    if (dataSnapshot.yesterday) {
      entries.push(['昨日花费', `¥${dataSnapshot.yesterday.cost?.toLocaleString() ?? '-'}`])
      entries.push(['昨日激活', `${dataSnapshot.yesterday.activations?.toLocaleString() ?? '-'}`])
      entries.push(['昨日开户', `${dataSnapshot.yesterday.accounts?.toLocaleString() ?? '-'}`])
      entries.push(['昨日ROI', `${dataSnapshot.yesterday.roi ?? '-'}`])
    }
    if (dataSnapshot.weekly) {
      entries.push(['本周花费', `¥${dataSnapshot.weekly.cost?.toLocaleString() ?? '-'}`])
      entries.push(['本周激活', `${dataSnapshot.weekly.activations?.toLocaleString() ?? '-'}`])
    }
  } else if (type === 'channel') {
    entries.push(['总花费', `¥${dataSnapshot.totalCost?.toLocaleString() ?? '-'}`])
    entries.push(['总激活', `${dataSnapshot.totalActivations?.toLocaleString() ?? '-'}`])
    entries.push(['总开户', `${dataSnapshot.totalAccounts?.toLocaleString() ?? '-'}`])
    entries.push(['平均ROI', `${dataSnapshot.avgRoi ?? '-'}`])
    entries.push(['选中渠道', `${dataSnapshot.channelCount ?? '-'}`])
  } else if (type === 'merchant') {
    entries.push(['总消耗', `¥${dataSnapshot.totalCost?.toLocaleString() ?? '-'}`])
    entries.push(['总留资', `${dataSnapshot.totalLeads?.toLocaleString() ?? '-'}`])
    entries.push(['总开户', `${dataSnapshot.totalAccounts?.toLocaleString() ?? '-'}`])
    entries.push(['开户率', `${dataSnapshot.accountRate ? (dataSnapshot.accountRate * 100).toFixed(2) + '%' : '-'}`])
  }

  if (entries.length === 0) return ''

  let tableHTML = `<h2 style="font-size:16px;margin:16px 0 8px;font-weight:600;">数据摘要</h2>`
  tableHTML += '<table style="width:100%;border-collapse:collapse;margin:12px 0;">'
  tableHTML += '<tr style="background:#f0f0f0;"><th style="border:1px solid #ddd;padding:8px;text-align:left;">指标</th><th style="border:1px solid #ddd;padding:8px;text-align:left;">数值</th></tr>'
  for (const [label, value] of entries) {
    tableHTML += `<tr><td style="border:1px solid #ddd;padding:8px;">${label}</td><td style="border:1px solid #ddd;padding:8px;">${value}</td></tr>`
  }
  tableHTML += '</table>'

  return tableHTML
}

export async function exportAnalysisToDocx(
  title: string,
  type: string,
  analysis: string,
  dataSnapshot?: Record<string, any>,
): Promise<void> {
  const now = new Date().toLocaleString('zh-CN')
  const dataHTML = buildDataHTML(type, dataSnapshot)
  const analysisHTML = parseMarkdownToHTML(analysis)

  const docHTML = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
@page { size: A4; margin: 2cm; }
body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 12pt; color: #333; line-height: 1.8; }
h1 { font-size: 20pt; text-align: center; margin-bottom: 16pt; font-weight: bold; }
h2 { font-size: 14pt; margin: 16pt 0 8pt; font-weight: bold; }
h3 { font-size: 12pt; margin: 12pt 0 6pt; font-weight: bold; }
p { margin: 6pt 0; }
table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
th { background: #f0f0f0; border: 1px solid #ddd; padding: 6pt; text-align: left; }
td { border: 1px solid #ddd; padding: 6pt; }
ul, ol { padding-left: 20pt; margin: 8pt 0; }
li { margin-bottom: 5pt; }
strong { color: #CF1322; }
.header-line { border-bottom: 1px solid #ddd; padding-bottom: 8pt; margin-bottom: 16pt; color: #999; font-size: 10pt; text-align: center; }
.footer-line { border-top: 1px solid #ddd; padding-top: 8pt; margin-top: 24pt; color: #999; font-size: 9pt; text-align: center; }
</style>
</head>
<body>
<div class="header-line">阿浪个人工作台 &middot; AI 分析报告</div>
<h1>${escapeHTML(title)}</h1>
<p style="color:#666;font-size:10pt;">分析类型：${TYPE_LABELS[type] || type}</p>
<p style="color:#666;font-size:10pt;">生成时间：${now}</p>
${dataHTML}
${analysisHTML}
<div class="footer-line">数据来源：端外买断工作台</div>
</body>
</html>`

  const blob = new Blob(['﻿' + docHTML], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
