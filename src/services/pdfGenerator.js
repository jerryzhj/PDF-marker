import { PDFDocument, rgb } from 'pdf-lib'

/**
 * 生成带有标注的PDF文件
 * @param {ArrayBuffer} pdfBytes - 原始PDF文件的bytes
 * @param {Object} annotations - 标注对象 { pageNum: [{x, y, style, number}, ...], ... }
 * @param {Object} settings - 标注设置 { startNumber, increment, prefix, suffix, fontSize, borderStyle }
 * @returns {Promise<Uint8Array>} 生成后的PDF bytes
 */
export async function generatePdfWithAnnotations(pdfBytes, annotations, settings) {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  const { startNumber, increment, prefix, suffix, fontSize, borderStyle } = settings

  // 遍历每一页
  pages.forEach((page, pageIndex) => {
    const pageNum = pageIndex + 1
    const pageAnnotations = annotations[pageNum] || []

    // 获取页面尺寸
    const { width, height } = page.getSize()

    // 为这一页的每个标注绘制
    pageAnnotations.forEach(ann => {
      // ann.x 和 ann.y 是相对于原始PDF页面的坐标（从上往下，0在顶部）
      // PDF坐标系Y轴反向（0在底部），所以需要翻转Y轴
      const x = ann.x
      const y = height - ann.y

      // 生成标注文本
      const text = prefix + (startNumber + ann.number * increment) + suffix
      // 增大标注框大小，使其更清晰可见
      const boxSize = Math.max(40, fontSize * 6)
      const radius = boxSize / 2 * 0.8

      if (borderStyle === 'circle') {
        // 绘制圆形边框
        page.drawCircle({
          x: x,
          y: y,
          size: radius,
          borderColor: rgb(1, 0, 0),
          borderWidth: 2
        })

        // 绘制文本
        page.drawText(text, {
          x: x - fontSize * text.length / 4,
          y: y - fontSize / 3,
          size: fontSize,
          color: rgb(1, 0, 0)
        })
      } else if (borderStyle === 'rect') {
        // 计算文本宽度，矩形宽度根据文本长度自动调整
        // 使用更准确的字体宽度估算 (Arial bold字体约为0.55-0.65倍的字号)
        const textWidth = fontSize * text.length * 0.62
        const paddingX = fontSize * 0.8
        const paddingY = fontSize * 0.6
        const rectWidth = textWidth + paddingX * 2
        const rectHeight = fontSize * 2.5 + paddingY * 2
        
        // 绘制矩形边框
        page.drawRectangle({
          x: x - rectWidth / 2,
          y: y - rectHeight / 2,
          width: rectWidth,
          height: rectHeight,
          borderColor: rgb(1, 0, 0),
          borderWidth: 2
        })

        // 绘制文本
        page.drawText(text, {
          x: x - textWidth / 2,
          y: y - fontSize / 3,
          size: fontSize,
          color: rgb(1, 0, 0)
        })
      } else {
        // 'none' - 小点 + 文本
        page.drawCircle({
          x: x,
          y: y,
          size: 3,
          color: rgb(1, 0, 0)
        })

        // 绘制文本
        page.drawText(text, {
          x: x + 6,
          y: y - fontSize / 3,
          size: fontSize,
          color: rgb(1, 0, 0)
        })
      }
    })
  })

  // 保存修改后的PDF
  return await pdfDoc.save()
}

/**
 * 下载PDF文件
 * @param {Uint8Array} pdfBytes - PDF文件的bytes
 * @param {string} filename - 下载的文件名
 */
export function downloadPdf(pdfBytes, filename = 'annotated.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
