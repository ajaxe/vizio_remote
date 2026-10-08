<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    max-width="420"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" color="surface" elevation="12" class="pa-4">
      <v-card-item class="pb-1">
        <template #prepend>
          <v-icon icon="mdi-remote" color="primary" size="32" class="mr-2" />
        </template>
        <v-card-title class="text-h6 font-weight-bold">
          Pair with Vizio TV
        </v-card-title>
        <v-card-subtitle>
          {{ step === 1 ? 'Step 1: Enter your TV IP address' : 'Step 2: Enter the 4-digit PIN on TV' }}
        </v-card-subtitle>
      </v-card-item>

      <v-card-text class="pt-4">
        <!-- Error Alert -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          closable
          density="compact"
          class="mb-4"
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- STEP 1: Enter IP Address -->
        <div v-if="step === 1">
          <v-text-field
            v-model="tvIp"
            label="TV IP Address"
            placeholder="e.g. 192.168.1.150"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-ip-network"
            autofocus
            :rules="[rules.required, rules.ip]"
            @keydown.enter="startPairing"
          />

          <div class="text-caption text-medium-emphasis mt-1">
            <v-icon icon="mdi-information-outline" size="14" class="mr-1" />
            Find your TV IP on your TV screen under:
            <span class="font-weight-medium text-high-emphasis">
              Menu &rarr; Network &rarr; Network Information
            </span>
          </div>
        </div>

        <!-- STEP 2: Enter 4-digit PIN -->
        <div v-else class="text-center">
          <div class="text-body-2 mb-3">
            A 4-digit PIN is now visible on your TV screen at
            <span class="font-weight-bold text-primary">{{ tvIp }}</span>:
          </div>

          <v-otp-input
            v-model="pinCode"
            length="4"
            type="number"
            variant="outlined"
            autofocus
            class="mb-3"
            @finish="submitPin"
          />

          <v-btn
            variant="text"
            size="small"
            color="medium-emphasis"
            @click="step = 1"
          >
            &larr; Change TV IP
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-2 pt-0 justify-end">
        <v-btn
          v-if="allowCancel"
          variant="text"
          :disabled="loading"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </v-btn>

        <v-btn
          v-if="step === 1"
          color="primary"
          variant="flat"
          rounded="lg"
          :loading="loading"
          :disabled="!tvIp"
          @click="startPairing"
        >
          Request PIN
        </v-btn>

        <v-btn
          v-else
          color="primary"
          variant="flat"
          rounded="lg"
          :loading="loading"
          :disabled="pinCode.length < 4"
          @click="submitPin"
        >
          Confirm & Pair
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { initiatePairing, confirmPairing } from '../services/api.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialIp: {
    type: String,
    default: ''
  },
  allowCancel: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'paired']);

const step = ref(1);
const tvIp = ref(props.initialIp || '');
const pinCode = ref('');
const loading = ref(false);
const errorMessage = ref('');
const pairingReqToken = ref(null);

watch(
  () => props.initialIp,
  (newVal) => {
    if (newVal) tvIp.value = newVal;
  }
);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      step.value = 1;
      pinCode.value = '';
      errorMessage.value = '';
      if (props.initialIp) tvIp.value = props.initialIp;
    }
  }
);

const rules = {
  required: (v) => Boolean(v && v.trim()) || 'IP address is required',
  ip: (v) =>
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]{1,5})?$/.test(v && v.trim()) ||
    'Enter a valid IP address (e.g. 192.168.1.150)'
};

async function startPairing() {
  if (!tvIp.value || !rules.ip(tvIp.value)) {
    errorMessage.value = 'Please enter a valid IP address';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await initiatePairing(tvIp.value.trim());
    if (res && res.ITEM && res.ITEM.PAIRING_REQ_TOKEN) {
      pairingReqToken.value = res.ITEM.PAIRING_REQ_TOKEN;
    }
    step.value = 2;
  } catch (err) {
    errorMessage.value = err.message || 'Unable to connect to Vizio TV at this IP';
  } finally {
    loading.value = false;
  }
}

async function submitPin() {
  if (pinCode.value.length < 4) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await confirmPairing(tvIp.value.trim(), pinCode.value.trim(), pairingReqToken.value);
    const authToken = res && res.ITEM && res.ITEM.AUTH_TOKEN ? res.ITEM.AUTH_TOKEN : '';

    emit('paired', { ip: tvIp.value.trim(), token: authToken });
    emit('update:modelValue', false);
  } catch (err) {
    errorMessage.value = err.message || 'Invalid PIN code. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>
