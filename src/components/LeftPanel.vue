<template>
  <div>
    <!-- 设置操作（文件相关） -->
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">
      <h3 style="margin:0 0 12px 0">设置</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        <!-- hidden input to pick pdf via Open PDF -->
        <input ref="fileInput" type="file" accept="application/pdf" @change="onChange" style="display:none" />
        <button class="btn-primary" @click="onOpenPdf">打开PDF</button>
        <button class="btn-success" @click="emit('save-pdf-editable')">保存PDF（标注可编辑）</button>
        <button class="btn-success" @click="emit('saveas-pdf-editable')">另存为PDF（标注可编辑）</button>
        <button class="btn-success" @click="emit('save-pdf-final')">最终PDF保存（标注不可编辑）</button>
        <button class="btn-secondary" @click="emit('export-data')">导出数据</button>
        <button class="btn-secondary" @click="emit('undo-annotation')">撤销上一标注</button>
        <button class="btn-danger" @click="onClearPageAnnotations">清除本页标注</button>
        <button class="btn-danger" @click="emit('delete-selected-annotation')">删除选中标注</button>
      </div>
    </div>

      <!-- 标注设置表单 -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="min-width:70px">起始编号:</label>
            <input v-model.number="startNumber" type="number" min="0" style="flex:1" />
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="min-width:70px">增量:</label>
            <input v-model.number="increment" type="number" min="1" style="flex:1" />
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="min-width:70px">前缀:</label>
            <input v-model="prefix" type="text" style="flex:1" />
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="min-width:70px">后缀:</label>
            <input v-model="suffix" type="text" style="flex:1" />
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="min-width:70px">字体大小:</label>
            <input v-model.number="fontSize" type="number" min="6" max="72" step="1" style="width:120px" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <label style="min-width:70px">边框样式:</label>
            <label><input type="radio" value="none" v-model="borderStyle" /> 无</label>
            <label><input type="radio" value="circle" v-model="borderStyle" /> 圆形</label>
            <label><input type="radio" value="rect" v-model="borderStyle" /> 矩形</label>
          </div>
        </div>
        <button @click="applySettings" style="width:100%;padding:10px;background:#334155;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-top:8px">应用设置</button>
      </div>



    <!-- 网络接口 -->
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">
      <h4 style="margin:0 0 12px 0">网络接口</h4>
      
      <!-- PDF Path Input -->
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;margin-bottom:4px;color:#6b7280">PDF 目录路径</label>
        <input v-model="pdfPath" type="text" placeholder="/path/to/pdf" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px" />
      </div>

      <!-- Data JSON Input -->
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;margin-bottom:4px;color:#6b7280">数据 (JSON)</label>
        <textarea v-model="dataJson" placeholder='{"key":"value"}' style="width:100%;height:100px;padding:6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical" />
      </div>

      <!-- Submit Button -->
      <button @click="submitToApi" style="width:100%;padding:8px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px" :disabled="!pdfPath || !dataJson">
        {{ loading ? '提交中...' : '提交数据' }}
      </button>

      <!-- Status Message -->
      <div v-if="statusMessage" :style="{ marginTop: '8px', padding: '8px', borderRadius: '4px', fontSize: '12px', color: statusType === 'success' ? '#10b981' : '#ef4444', background: statusType === 'success' ? '#d1fae5' : '#fee2e2' }">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue'
import { submitPdfData } from '../services/api'

const emit = defineEmits([
  'file-selected',
  'open-pdf',
  'save-pdf-editable',
  'saveas-pdf-editable',
  'save-pdf-final',
  'export-data',
  'undo-annotation',
  'clear-page-annotations',
  'delete-selected-annotation',
  'apply-settings'
])

const fileInput = ref(null)
const startNumber = ref(1)
const increment = ref(1)
const prefix = ref('GB')
const suffix = ref('XX')
const fontSize = ref(10)
const borderStyle = ref('rect')
const highDpi = ref(true)
const pdfPath = ref('')
const dataJson = ref('{}')
const loading = ref(false)
const statusMessage = ref('')
const statusType = ref('')

function onChange(e){
  const f = e.target.files && e.target.files[0]
  if(f) emit('file-selected', f)
}

function onOpenPdf(){
  // re-use hidden file input to pick and emit
  if(fileInput.value){
    fileInput.value.value = ''
    fileInput.value.click()
  }
  emit('open-pdf')
}

function applySettings(){
  emit('apply-settings', {
    startNumber: startNumber.value,
    increment: increment.value,
    prefix: prefix.value,
    suffix: suffix.value,
    fontSize: fontSize.value,
    borderStyle: borderStyle.value,
    highDpi: !!highDpi.value
  })
  alert('设置已应用')
}

async function submitToApi(){
  if(!pdfPath.value || !dataJson.value.trim()) return
  
  loading.value = true
  statusMessage.value = ''
  
  try {
    // Parse JSON data
    let data
    try {
      data = JSON.parse(dataJson.value)
    } catch(e) {
      throw new Error('JSON 格式错误: ' + e.message)
    }

    // Call API
    const result = await submitPdfData(data, pdfPath.value)
    statusMessage.value = '提交成功！'
    statusType.value = 'success'
    console.log('API Response:', result)
  } catch(error) {
    statusMessage.value = '错误: ' + (error.message || '网络请求失败')
    statusType.value = 'error'
    console.error('Submit failed:', error)
  } finally {
    loading.value = false
  }
}

function onClearPageAnnotations(){
  const confirmed = confirm('确定要清除本页所有标注吗？此操作不可撤销。')
  if(confirmed){
    emit('clear-page-annotations')
  }
}
</script>
