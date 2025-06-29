<script setup lang="ts">
const props = defineProps<{
    description: string
}>()
</script>
<template>
    <div class="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
        <div class="flex items-start gap-4">
        <i class="pi pi-info-circle text-sm mt-0.5"></i>
        <div class="text-xs text-white">
            <span>{{ props.description }}</span>
        </div>
        </div>
    </div>
</template>