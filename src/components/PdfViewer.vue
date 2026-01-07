<template>
  <div>
    <canvas ref="canvas"></canvas>
    <div v-if="!file" style="color:#9ca3af">请从左侧选择一个 PDF 文件。</div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'

const props = defineProps({
  file: File,
  page: { type: Number, default: 1 },
  scale: { type: Number, default: null },
  rotation: { type: Number, default: 0 }
})
const emit = defineEmits(['loaded'])

const canvas = ref(null)
let pdfDoc = null
let currentRenderTask = null
let fileUrl = null

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'

async function loadPdfFromFile(f){
  if(fileUrl){ URL.revokeObjectURL(fileUrl); fileUrl = null }
  fileUrl = URL.createObjectURL(f)
  const loadingTask = pdfjsLib.getDocument(fileUrl)
  pdfDoc = await loadingTask.promise
  emit('loaded', { pdf: pdfDoc, numPages: pdfDoc.numPages })
  await renderPage(props.page)
}

async function renderPage(pageNum){
  if(!pdfDoc) return
  if(currentRenderTask){ try{ currentRenderTask.cancel() }catch(e){} }
  const pageObj = await pdfDoc.getPage(pageNum)

  // compute desired scale: if props.scale is null, compute fit-to-width
  let desiredScale = props.scale

  // get a 1.0 viewport (no scaling) to measure page dimensions with rotation
  const unscaledViewport = pageObj.getViewport({ scale: 1, rotation: props.rotation || 0 })

  if(!desiredScale){
    // compute available width from parent container
    const container = canvas.value && canvas.value.parentElement
    const availableWidth = (container && container.clientWidth) ? container.clientWidth : unscaledViewport.width
    desiredScale = availableWidth / unscaledViewport.width
  }

  const outputScale = window.devicePixelRatio || 1
  const renderViewport = pageObj.getViewport({ scale: desiredScale * outputScale, rotation: props.rotation || 0 })

  const c = canvas.value
  c.width = Math.floor(renderViewport.width)
  c.height = Math.floor(renderViewport.height)
  c.style.width = Math.floor(renderViewport.width / outputScale) + 'px'
  c.style.height = Math.floor(renderViewport.height / outputScale) + 'px'

  const ctx = c.getContext('2d')
  const renderContext = { canvasContext: ctx, viewport: renderViewport }
  currentRenderTask = pageObj.render(renderContext)
  await currentRenderTask.promise
  currentRenderTask = null
}

watch(()=>props.file, (f)=>{
  if(f) loadPdfFromFile(f)
})

watch(()=>props.page, (p)=>{
  if(pdfDoc) renderPage(p)
})

watch(()=>props.scale, (s)=>{
  if(pdfDoc) {
    // wait a tick to ensure layout updates when fitting
    nextTick().then(()=>renderPage(props.page))
  }
})

watch(()=>props.rotation, (r)=>{
  if(pdfDoc) renderPage(props.page)
})

onBeforeUnmount(()=>{ if(fileUrl) URL.revokeObjectURL(fileUrl) })
</script>
