<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" color="surface" elevation="10" class="pa-4">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-cog" color="primary" size="28" class="mr-2" />
        </template>
        <v-card-title class="text-h6 font-weight-bold">
          Remote Settings
        </v-card-title>
      </v-card-item>

      <v-card-text class="pt-3">
        <v-text-field
          v-model="editIp"
          label="Target TV IP Address"
          placeholder="e.g. 192.168.1.150"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-ip-network"
          class="mb-3"
        />

        <div class="d-flex flex-column gap-2">
          <v-btn
            color="primary"
            variant="tonal"
            block
            prepend-icon="mdi-sync"
            class="mb-2"
            @click="handleSaveIp"
          >
            Switch to this TV IP
          </v-btn>

          <v-btn
            color="warning"
            variant="tonal"
            block
            prepend-icon="mdi-remote"
            class="mb-2"
            @click="$emit('re-pair')"
          >
            Start Re-Pairing Flow
          </v-btn>

          <v-btn
            color="error"
            variant="text"
            block
            prepend-icon="mdi-delete-outline"
            @click="$emit('clear-pairing')"
          >
            Clear Stored TV IP
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="justify-end px-4">
        <v-btn
          variant="text"
          @click="$emit('update:modelValue', false)"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  currentIp: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'update-ip', 're-pair', 'clear-pairing']);

const editIp = ref(props.currentIp);

watch(
  () => props.currentIp,
  (val) => {
    editIp.value = val;
  }
);

function handleSaveIp() {
  if (editIp.value && editIp.value.trim()) {
    emit('update-ip', editIp.value.trim());
    emit('update:modelValue', false);
  }
}
</script>
