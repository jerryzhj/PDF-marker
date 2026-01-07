<template>
  <div>
    <h3>设置</h3>
    <div style="margin-top:8px">
      <label class="file-label">
        <input type="file" accept="application/pdf" @change="onChange" />
      </label>
    </div>
    <div style="margin-top:12px;color:#6b7280">选择一个 PDF 文件以在右侧查看。</div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'
const emit = defineEmits(['file-selected'])

function onChange(e){
  const f = e.target.files && e.target.files[0]
  if(f) emit('file-selected', f)
}
</script>
