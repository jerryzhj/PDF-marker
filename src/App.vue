<template>
  <div class="container">
    <div class="left">
      <LeftPanel @file-selected="onFileSelected" @apply-settings="onApplySettings" @clear-page-annotations="onClearPageAnnotations" @undo-annotation="onUndoAnnotation" @save-pdf-editable="onSavePdfEditable" @save-pdf-final="onSavePdfFinal" @export-data="onExportData" />
    </div>
    <div class="right">
      <div class="controls">
            <button @click="annotationMode=!annotationMode" :style="{background: annotationMode ? '#334155' : '#e2e8f0', color: annotationMode ? 'white' : '#475569'}">标注模式{{ annotationMode ? '：开' : '：关' }}</button>
            
            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>

            <button @click="prevPage" :disabled="!pdf || page<=1">上一页</button>
            <button @click="nextPage" :disabled="!pdf || page>=numPages">下一页</button>

            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>

            <button @click="zoomOut" :disabled="!pdf">-</button>
            <button @click="zoomIn" :disabled="!pdf">+</button>
            <input v-model.number="zoomPercent" @input="onZoomInput" type="range" min="50" max="300" style="width:140px" :disabled="!pdf" />
            <div style="min-width:54px;text-align:center">{{ displayPercent }}%</div>

            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>

            <div style="margin-left:8px">第</div>
            <input type="number" v-model.number="pageInput" :min="1" :max="numPages" style="width:80px;margin-left:4px" />
            <button @click="gotoPage" :disabled="!pdf">跳转</button>
            <div style="margin-left:4px">/ {{ numPages || 0 }} 页</div>
            
            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>
            
            <div v-if="fileName" style="display:flex;align-items:center;gap:12px;margin-left:8px;font-size:12px;color:#6b7280">
              <div><strong>文件:</strong> {{ fileName }}</div>
              <div><strong>标签:</strong> {{ totalAnnotations }}</div>
            </div>
            
            <div style="flex:1"></div>
          </div>
      <div class="viewer">
      <PdfViewer :file="file" :page="page" :scale="scale" :annotation-mode="annotationMode" :border-style="borderStyle" :start-number="startNumber" :increment="increment" :prefix="prefix" :suffix="suffix" :font-size="fontSize" ref="pdfViewerRef" @loaded="onLoaded" @scale-changed="onScaleChanged" @wheel-zoom="onWheelZoom" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import LeftPanel from './components/LeftPanel.vue'
import PdfViewer from './components/PdfViewer.vue'
import { generatePdfWithAnnotations, downloadPdf } from './services/pdfGenerator'
import { exportAnnotationsToExcel } from './services/exportData'

const file = ref(null)
const pdf = ref(null)
const numPages = ref(0)
const page = ref(1)
const pageInput = ref(1)
const annotationMode = ref(false)
const pdfViewerRef = ref(null)
const fileName = ref('')

// Store original file bytes for PDF generation
let originalPdfBytes = null

// scale: null means auto fit-to-width; otherwise a numeric scale (e.g. 1.25)
const scale = ref(null)
const zoomPercent = ref(100)
const autoScale = ref(1) // actual auto-fit scale from PdfViewer

// Computed property for display percentage
const displayPercent = computed(() => {
  const currentScale = scale.value !== null ? scale.value : autoScale.value
  return Math.round(currentScale * 100)
})

// Computed property for total annotations
const totalAnnotations = computed(() => {
  if (!pdfViewerRef.value) return 0
  const allAnnotations = pdfViewerRef.value.getAnnotations()
  let count = 0
  for (const pageNum in allAnnotations) {
    count += allAnnotations[pageNum].length
  }
  return count
})

function onFileSelected(f){
  file.value = f
  fileName.value = f.name
  page.value = 1
  pageInput.value = 1
  scale.value = 1
  zoomPercent.value = 100
  
  // Store original PDF bytes
  const reader = new FileReader()
  reader.onload = (e) => {
    originalPdfBytes = e.target.result
  }
  reader.readAsArrayBuffer(f)
}

function onLoaded(info){
  pdf.value = info.pdf
  numPages.value = info.numPages
  page.value = 1
  pageInput.value = 1
}

function onScaleChanged(actualScale){
  autoScale.value = actualScale
}

function onWheelZoom(newScale){
  scale.value = newScale
  zoomPercent.value = Math.round(newScale * 100)
}

// Receive borderStyle from LeftPanel apply-settings event
const borderStyle = ref('none')
const startNumber = ref(1)
const increment = ref(1)
const prefix = ref('GB')
const suffix = ref('XX')
const fontSize = ref(10)

function onApplySettings(settings){
  borderStyle.value = settings.borderStyle
  startNumber.value = settings.startNumber
  increment.value = settings.increment
  prefix.value = settings.prefix
  suffix.value = settings.suffix
  fontSize.value = settings.fontSize
}

function prevPage(){ if(page.value>1) { page.value--; pageInput.value=page.value } }
function nextPage(){ if(page.value < numPages.value){ page.value++; pageInput.value=page.value } }
function gotoPage(){ if(pageInput.value>=1 && pageInput.value<=numPages.value) page.value = pageInput.value }

function zoomIn(){
  if(scale.value===null) scale.value = autoScale.value
  scale.value = Math.min(3, +(scale.value * 1.2).toFixed(2))
  zoomPercent.value = Math.round(scale.value * 100)
}
function zoomOut(){
  if(scale.value===null) scale.value = autoScale.value
  scale.value = Math.max(0.5, +(scale.value / 1.2).toFixed(2))
  zoomPercent.value = Math.round(scale.value * 100)
}
function onZoomInput(){
  scale.value = +(zoomPercent.value/100)
}

function onClearPageAnnotations(){
  if(pdfViewerRef.value){
    pdfViewerRef.value.clearCurrentPageAnnotations()
  }
}

function onUndoAnnotation(){
  if(pdfViewerRef.value){
    pdfViewerRef.value.undoLastAnnotation()
  }
}

async function onSavePdfEditable(){
  if(!originalPdfBytes || !pdfViewerRef.value) {
    alert('请先打开PDF文件')
    return
  }
  
  try {
    const annotations = pdfViewerRef.value.getAnnotations()
    const pdfBytes = await generatePdfWithAnnotations(
      originalPdfBytes,
      annotations,
      {
        startNumber: startNumber.value,
        increment: increment.value,
        prefix: prefix.value,
        suffix: suffix.value,
        fontSize: fontSize.value,
        borderStyle: borderStyle.value
      }
    )
    downloadPdf(pdfBytes, `annotated_${Date.now()}.pdf`)
    alert('PDF已生成并下载')
  } catch(error) {
    console.error('Failed to generate PDF:', error)
    alert('生成PDF失败: ' + error.message)
  }
}

async function onSavePdfFinal(){
  if(!originalPdfBytes || !pdfViewerRef.value) {
    alert('请先打开PDF文件')
    return
  }
  
  try {
    const annotations = pdfViewerRef.value.getAnnotations()
    const pdfBytes = await generatePdfWithAnnotations(
      originalPdfBytes,
      annotations,
      {
        startNumber: startNumber.value,
        increment: increment.value,
        prefix: prefix.value,
        suffix: suffix.value,
        fontSize: fontSize.value,
        borderStyle: borderStyle.value
      }
    )
    downloadPdf(pdfBytes, `final_${Date.now()}.pdf`)
    alert('PDF已生成并下载')
  } catch(error) {
    console.error('Failed to generate PDF:', error)
    alert('生成PDF失败: ' + error.message)
  }
}

function onExportData(){
  if(!pdfViewerRef.value || !fileName.value) {
    alert('请先打开PDF文件')
    return
  }
  
  try {
    const annotations = pdfViewerRef.value.getAnnotations()
    exportAnnotationsToExcel(
      annotations,
      {
        startNumber: startNumber.value,
        increment: increment.value,
        prefix: prefix.value,
        suffix: suffix.value
      },
      fileName.value
    )
    alert('数据已导出')
  } catch(error) {
    console.error('Failed to export data:', error)
    alert('导出数据失败: ' + error.message)
  }
}

// no rotation controls

watch(page, (v)=>{/* page prop passed to PdfViewer */})
</script>
