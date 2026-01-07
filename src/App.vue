<template>
  <div class="container">
    <div class="left">
      <LeftPanel @file-selected="onFileSelected" />
    </div>
    <div class="right">
          <div class="controls">
            <button @click="prevPage" :disabled="!pdf || page<=1">上一页</button>
            <button @click="nextPage" :disabled="!pdf || page>=numPages">下一页</button>

            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>

            <button @click="zoomOut" :disabled="!pdf">-</button>
            <button @click="zoomIn" :disabled="!pdf">+</button>
            <input v-model.number="zoomPercent" @input="onZoomInput" type="range" min="50" max="300" style="width:140px" :disabled="!pdf" />
            <div style="min-width:54px;text-align:center">{{ Math.round((scale||autoScale)*100) }}%</div>

            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>

            <button @click="rotateLeft" :disabled="!pdf">旋转 -90°</button>
            <button @click="rotateRight" :disabled="!pdf">旋转 +90°</button>

            <div style="width:1px;background:#e5e7eb;height:24px;margin:0 8px"></div>

            <div style="margin-left:8px">第</div>
            <input type="number" v-model.number="pageInput" @keyup.enter="gotoPage" :min="1" :max="numPages" style="width:80px;margin-left:4px" />
            <div style="margin-left:4px">/ {{ numPages || 0 }} 页</div>
          </div>
      <div class="viewer">
        <PdfViewer :file="file" :page="page" @loaded="onLoaded" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import LeftPanel from './components/LeftPanel.vue'
import PdfViewer from './components/PdfViewer.vue'

const file = ref(null)
const pdf = ref(null)
const numPages = ref(0)
const page = ref(1)
const pageInput = ref(1)

// scale: null means auto fit-to-width; otherwise a numeric scale (e.g. 1.25)
const scale = ref(null)
const rotation = ref(0)
const zoomPercent = ref(100)
const autoScale = 1 // placeholder for display when scale is null; PdfViewer computes fit when scale is null

function onFileSelected(f){
  file.value = f
  page.value = 1
  pageInput.value = 1
  scale.value = null
  rotation.value = 0
  zoomPercent.value = 100
}

function onLoaded(info){
  pdf.value = info.pdf
  numPages.value = info.numPages
  page.value = 1
  pageInput.value = 1
}

function prevPage(){ if(page.value>1) { page.value--; pageInput.value=page.value } }
function nextPage(){ if(page.value < numPages.value){ page.value++; pageInput.value=page.value } }
function gotoPage(){ if(pageInput.value>=1 && pageInput.value<=numPages.value) page.value = pageInput.value }

function zoomIn(){
  if(scale.value===null) scale.value = 1
  scale.value = Math.min(3, +(scale.value * 1.2).toFixed(2))
  zoomPercent.value = Math.round(scale.value * 100)
}
function zoomOut(){
  if(scale.value===null) scale.value = 1
  scale.value = Math.max(0.5, +(scale.value / 1.2).toFixed(2))
  zoomPercent.value = Math.round(scale.value * 100)
}
function onZoomInput(){
  scale.value = +(zoomPercent.value/100)
}
function rotateLeft(){ rotation.value = (rotation.value - 90) % 360 }
function rotateRight(){ rotation.value = (rotation.value + 90) % 360 }

watch(page, (v)=>{/* page prop passed to PdfViewer */})
</script>
