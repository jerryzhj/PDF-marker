<template>
  <div class="canvas-wrapper" :style="{ cursor: isPanning ? 'grabbing' : 'grab' }"
       @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @wheel.prevent="onWheel">
    <canvas ref="canvas" :style="{ transform: `translate(${offset.x}px, ${offset.y}px)` }"></canvas>
    <div v-if="!file" style="color:#9ca3af">请从左侧选择一个 PDF 文件。</div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick, defineExpose } from 'vue'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'

const props = defineProps({
  file: File,
  page: { type: Number, default: 1 },
  scale: { type: Number, default: null },
  annotationMode: { type: Boolean, default: false },
  borderStyle: { type: String, default: 'rect' },
  startNumber: { type: Number, default: 1 },
  increment: { type: Number, default: 1 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  fontSize: { type: Number, default: 10 }
})
const emit = defineEmits(['loaded', 'scale-changed', 'wheel-zoom'])

const canvas = ref(null)
let pdfDoc = null
let currentRenderTask = null
let fileUrl = null
const offset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
let panStart = null
const lastAutoScale = ref(1)
const annotations = ref({})  // Store annotations by page: { pageNum: [{x, y, style}, ...] }
let pageWidth = 0  // Original PDF page width (scale 1.0)
let pageHeight = 0  // Original PDF page height (scale 1.0)
let currentScale = 1  // Current zoom scale

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

  // compute desired scale: if props.scale is null, compute fit-to-container (both width and height)
  let desiredScale = props.scale

  // get a 1.0 viewport (no scaling) to measure page dimensions
  const unscaledViewport = pageObj.getViewport({ scale: 1 })
  
  // Save original page dimensions for annotation coordinate calculation
  pageWidth = unscaledViewport.width
  pageHeight = unscaledViewport.height

  if(!desiredScale){
    // Fit to container size accurately with minimal padding
    const container = canvas.value && canvas.value.parentElement
    const availableWidth = (container && container.clientWidth) ? container.clientWidth - 24 : unscaledViewport.width
    const availableHeight = (container && container.clientHeight) ? container.clientHeight - 24 : unscaledViewport.height
    
    const scaleByWidth = availableWidth / unscaledViewport.width
    const scaleByHeight = availableHeight / unscaledViewport.height
    
    // Use the smaller scale to ensure the entire page fits within the container
    desiredScale = Math.min(scaleByWidth, scaleByHeight)
  }

  const outputScale = window.devicePixelRatio || 1
  const renderViewport = pageObj.getViewport({ scale: desiredScale * outputScale })

  // Save current scale for annotation coordinate calculation
  currentScale = desiredScale

  // Emit the actual scale being used
  if(props.scale === null) {
    emit('scale-changed', desiredScale)
  }

  // Track last auto scale for wheel zoom baseline
  lastAutoScale.value = desiredScale

  const c = canvas.value
  c.width = Math.floor(renderViewport.width)
  c.height = Math.floor(renderViewport.height)
  c.style.width = Math.floor(renderViewport.width / outputScale) + 'px'
  c.style.height = Math.floor(renderViewport.height / outputScale) + 'px'

  // Reset pan when re-rendering to keep page visible
  offset.value = { x: 0, y: 0 }

  const ctx = c.getContext('2d')
  const renderContext = { canvasContext: ctx, viewport: renderViewport }
  currentRenderTask = pageObj.render(renderContext)
  await currentRenderTask.promise
  currentRenderTask = null
  
  // Redraw all annotations after PDF render
  redrawAnnotations()
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

onBeforeUnmount(()=>{ if(fileUrl) URL.revokeObjectURL(fileUrl) })

function onMouseDown(e){
  if(!pdfDoc) return
  
  // Handle annotation drawing
  if(props.annotationMode && !isPanning.value){
    drawAnnotation(e)
    return
  }
  
  isPanning.value = true
  panStart = { x: e.clientX - offset.value.x, y: e.clientY - offset.value.y }
}

function onMouseMove(e){
  if(!isPanning.value) return
  offset.value = {
    x: e.clientX - panStart.x,
    y: e.clientY - panStart.y
  }
}

function onMouseUp(){
  isPanning.value = false
}

function onWheel(e){
  if(!pdfDoc) return
  const baseScale = props.scale !== null ? props.scale : lastAutoScale.value
  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const nextScale = Math.max(0.5, Math.min(3, +(baseScale * factor).toFixed(3)))
  emit('wheel-zoom', nextScale)
}

function redrawAnnotations(){
  if(!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  const boxSize = Math.max(50, props.fontSize * 5)  // Annotation box size
  const devicePixelRatio = window.devicePixelRatio || 1
  
  // Only draw annotations for current page
  const pageAnnotations = annotations.value[props.page] || []
  pageAnnotations.forEach(ann => {
    // Convert PDF page coordinates back to canvas pixels
    const pixelX = ann.x * currentScale * devicePixelRatio
    const pixelY = ann.y * currentScale * devicePixelRatio
    
    // Generate annotation text
    const text = props.prefix + (props.startNumber + ann.number * props.increment) + props.suffix
    
    if(ann.style === 'circle'){
      // Draw circle
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pixelX, pixelY, boxSize / 2, 0, Math.PI * 2)
      ctx.stroke()
      
      // Draw text inside circle
      ctx.fillStyle = '#ff0000'
      ctx.font = `bold ${props.fontSize * devicePixelRatio}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, pixelX, pixelY)
    } else if(ann.style === 'rect'){
      // Draw rectangle
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.strokeRect(pixelX - boxSize / 2, pixelY - boxSize / 2, boxSize, boxSize)
      
      // Draw text inside rectangle
      ctx.fillStyle = '#ff0000'
      ctx.font = `bold ${props.fontSize * devicePixelRatio}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, pixelX, pixelY)
    } else {
      // 'none' - small dot with text label
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(pixelX, pixelY, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw text next to dot
      ctx.fillStyle = '#ff0000'
      ctx.font = `bold ${props.fontSize * devicePixelRatio}px Arial`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, pixelX + 8, pixelY)
    }
  })
}

function drawAnnotation(e){
  const canvasElement = canvas.value
  if(!canvasElement || pageWidth === 0) return
  
  // Get canvas bounding rect (CSS coordinates)
  const canvasRect = canvasElement.getBoundingClientRect()
  
  // Mouse position in CSS coordinates relative to canvas
  const mouseXCSS = e.clientX - canvasRect.left
  const mouseYCSS = e.clientY - canvasRect.top
  
  // Account for pan offset (which is applied via CSS transform)
  const offsetX = mouseXCSS - offset.value.x
  const offsetY = mouseYCSS - offset.value.y
  
  // Get device pixel ratio for proper scaling
  const devicePixelRatio = window.devicePixelRatio || 1
  
  // Convert CSS pixels to actual canvas pixels
  const mouseXPixels = offsetX * devicePixelRatio
  const mouseYPixels = offsetY * devicePixelRatio
  
  // Convert canvas pixels to PDF page coordinates
  // canvas pixels = PDF page size * current scale * device pixel ratio
  const x = mouseXPixels / (currentScale * devicePixelRatio)
  const y = mouseYPixels / (currentScale * devicePixelRatio)
  
  // Validate coordinates are within page bounds
  if(x < 0 || y < 0 || x > pageWidth || y > pageHeight) return
  
  // Initialize page annotations if not exists
  if(!annotations.value[props.page]){
    annotations.value[props.page] = []
  }
  
  // Store annotation data with PDF page coordinates
  annotations.value[props.page].push({
    x: x,
    y: y,
    style: props.borderStyle,
    number: annotations.value[props.page].length  // Track annotation sequence number
  })
  
  // Redraw annotations
  redrawAnnotations()
}

function clearCurrentPageAnnotations(){
  if(annotations.value[props.page]){
    annotations.value[props.page] = []
  }
  // Force re-render by redrawing and also re-render the PDF page
  redrawAnnotations()
  if(pdfDoc){
    renderPage(props.page)
  }
}

function undoLastAnnotation(){
  if(annotations.value[props.page] && annotations.value[props.page].length > 0){
    annotations.value[props.page].pop()
    redrawAnnotations()
    if(pdfDoc){
      renderPage(props.page)
    }
  }
}

defineExpose({
  clearCurrentPageAnnotations,
  undoLastAnnotation
})
</script>
