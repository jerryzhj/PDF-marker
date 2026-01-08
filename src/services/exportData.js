/**
 * 将标注数据导出为Excel格式
 * @param {Object} annotations - 标注对象 { pageNum: [{x, y, style, number}, ...], ... }
 * @param {Object} settings - 标注设置 { startNumber, increment, prefix, suffix }
 * @param {string} fileName - PDF文件名
 */
export function exportAnnotationsToExcel(annotations, settings, fileName) {
  const { startNumber, increment, prefix, suffix } = settings

  // 准备数据
  const rows = []
  rows.push(['页码', '标签', 'X坐标', 'Y坐标', '边框样式'])

  // 遍历所有页面的标注
  for (const pageNum in annotations) {
    const pageAnnotations = annotations[pageNum]
    if (Array.isArray(pageAnnotations)) {
      pageAnnotations.forEach(ann => {
        const label = prefix + (startNumber + ann.number * increment) + suffix
        rows.push([
          pageNum,
          label,
          Math.round(ann.x * 100) / 100,
          Math.round(ann.y * 100) / 100,
          ann.style
        ])
      })
    }
  }

  // 生成CSV内容（Excel也支持CSV）
  const csvContent = rows.map(row => 
    row.map(cell => {
      // 如果单元格包含逗号、引号或换行符，需要加引号
      const cellStr = String(cell)
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')
  ).join('\n')

  // 添加BOM以支持Excel正确显示中文
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // 创建下载链接
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `${fileName.replace(/\.[^.]+$/, '')}_annotations.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
