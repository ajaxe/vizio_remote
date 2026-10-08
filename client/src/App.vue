<template>
  <v-app>
    <v-main class="d-flex align-center justify-center pa-0 pa-sm-4">
      <RemoteShell>
        <!-- Header slot -->
        <template #header>
          <StatusBar
            :ip="activeIp"
            :paired="isPaired"
            @open-settings="showSettingsDialog = true"
            @power-toggle="handlePowerToggle"
          />
        </template>

        <!-- Controls slot -->
        <template #controls>
          <SystemControls @command="handleCommand" />
          <DPad @command="handleCommand" />
          <VolumeRocker @command="handleCommand" />
        </template>

        <!-- Apps slot -->
        <template #apps>
          <AppCarousel
            :apps="apps"
            @launch="handleLaunchApp"
          />
        </template>
      </RemoteShell>

      <!-- Pairing Dialog -->
      <PairingDialog
        v-model="showPairingDialog"
        :initial-ip="activeIp"
        :allow-cancel="isPaired"
        @paired="handlePaired"
      />

      <!-- Settings Dialog -->
      <SettingsDialog
        v-model="showSettingsDialog"
        :current-ip="activeIp"
        @update-ip="handleUpdateIp"
        @re-pair="handleRePair"
        @clear-pairing="handleClearPairing"
      />

      <!-- Feedback Toast Notification -->
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        :timeout="2500"
        location="top"
        rounded="pill"
      >
        <div class="d-flex align-center justify-center font-weight-medium">
          <v-icon
            :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'"
            class="mr-2"
            size="18"
          />
          {{ snackbar.text }}
        </div>
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import RemoteShell from './components/RemoteShell.vue';
import StatusBar from './components/StatusBar.vue';
import DPad from './components/DPad.vue';
import VolumeRocker from './components/VolumeRocker.vue';
import SystemControls from './components/SystemControls.vue';
import AppCarousel from './components/AppCarousel.vue';
import PairingDialog from './components/PairingDialog.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import { getSavedTvIp, saveTvIp, clearSavedTvIp } from './services/storage.js';
import {
  checkTvStatus,
  sendRemoteCommand,
  fetchApps,
  launchTvApp
} from './services/api.js';

const activeIp = ref('');
const isPaired = ref(false);
const showPairingDialog = ref(false);
const showSettingsDialog = ref(false);
const apps = ref([]);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

function showToast(text, color = 'success') {
  snackbar.value = { show: true, text, color };
}

onMounted(async () => {
  // Load saved IP from localStorage
  const savedIp = getSavedTvIp();
  if (savedIp) {
    activeIp.value = savedIp;
    await verifyPairingStatus(savedIp);
  } else {
    showPairingDialog.value = true;
  }

  // Load streaming apps catalog
  try {
    apps.value = await fetchApps();
  } catch (err) {
    console.warn('Failed to load apps catalog:', err);
  }
});

async function verifyPairingStatus(ip) {
  try {
    const status = await checkTvStatus(ip);
    isPaired.value = Boolean(status && status.paired);
    if (!isPaired.value) {
      showPairingDialog.value = true;
    }
  } catch (err) {
    console.warn('TV status check failed:', err);
    isPaired.value = false;
    showPairingDialog.value = true;
  }
}

async function handleCommand(action) {
  if (!activeIp.value) {
    showPairingDialog.value = true;
    return;
  }

  try {
    await sendRemoteCommand(activeIp.value, action);
  } catch (err) {
    if (err && err.status === 401) {
      isPaired.value = false;
      showToast('TV requires pairing', 'warning');
      showPairingDialog.value = true;
    } else {
      showToast(err.message || 'Command failed', 'error');
    }
  }
}

async function handlePowerToggle() {
  await handleCommand('power');
}

async function handleLaunchApp(app) {
  if (!activeIp.value) {
    showPairingDialog.value = true;
    return;
  }

  try {
    await launchTvApp(activeIp.value, app.appId, app.nameSpace);
    showToast(`Launching ${app.name}...`, 'success');
  } catch (err) {
    if (err && err.status === 401) {
      isPaired.value = false;
      showPairingDialog.value = true;
    } else {
      showToast(err.message || `Failed to launch ${app.name}`, 'error');
    }
  }
}

function handlePaired({ ip }) {
  activeIp.value = ip;
  saveTvIp(ip);
  isPaired.value = true;
  showToast('Vizio TV paired successfully!', 'success');
}

async function handleUpdateIp(newIp) {
  activeIp.value = newIp;
  saveTvIp(newIp);
  await verifyPairingStatus(newIp);
  showToast(`Switched to TV at ${newIp}`, 'info');
}

function handleRePair() {
  showSettingsDialog.value = false;
  showPairingDialog.value = true;
}

function handleClearPairing() {
  clearSavedTvIp();
  activeIp.value = '';
  isPaired.value = false;
  showSettingsDialog.value = false;
  showPairingDialog.value = true;
  showToast('Stored TV configuration cleared', 'info');
}
</script>
