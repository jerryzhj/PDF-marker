<template>
  <div>
    <h3>设置</h3>
    
    <!-- PDF File Selection -->
    <div style="margin-top:8px">
      <label class="file-label">
        <input type="file" accept="application/pdf" @change="onChange" />
      </label>
    </div>
    <div style="margin-top:12px;color:#6b7280">选择一个 PDF 文件以在右侧查看。</div>

    <!-- Network API Section -->
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

const emit = defineEmits(['file-selected'])

const pdfPath = ref('')
const dataJson = ref('{}')
const loading = ref(false)
const statusMessage = ref('')
const statusType = ref('')

function onChange(e){
  const f = e.target.files && e.target.files[0]
  if(f) emit('file-selected', f)
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
</script>
