<template>
  <div class="d-flex align-center justify-space-between px-4 py-3">
    <!-- Brand Title & Connection Chip -->
    <div class="d-flex align-center">
      <v-icon
        icon="mdi-television"
        color="primary"
        class="mr-2"
        size="26"
      />
      <div>
        <div class="text-subtitle-2 font-weight-black tracking-wide text-uppercase" style="letter-spacing: 1.5px;">
          VIZIO
        </div>
        <div class="text-caption text-medium-emphasis text-truncate" style="max-width: 130px;">
          {{ ip || 'No TV Selected' }}
        </div>
      </div>
    </div>

    <!-- Status & Action Buttons -->
    <div class="d-flex align-center">
      <!-- Paired State Badge -->
      <v-chip
        size="x-small"
        :color="paired ? 'success' : 'warning'"
        variant="tonal"
        class="mr-2 font-weight-bold"
      >
        <v-icon
          start
          :icon="paired ? 'mdi-check-circle' : 'mdi-alert-circle'"
          size="12"
        />
        {{ paired ? 'PAIRED' : 'UNPAIRED' }}
      </v-chip>

      <!-- Settings Button -->
      <v-btn
        icon="mdi-cog"
        variant="text"
        size="small"
        color="medium-emphasis"
        class="mr-1"
        @click="$emit('open-settings')"
      />

      <!-- Power Button -->
      <v-btn
        icon="mdi-power"
        color="error"
        variant="tonal"
        size="small"
        class="tactile-btn"
        @click="$emit('power-toggle')"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * @typedef {Object} Props
 * @property {string} ip
 * @property {boolean} paired
 * @property {boolean} [connecting]
 */

defineProps({
  ip: {
    type: String,
    default: ''
  },
  paired: {
    type: Boolean,
    default: false
  },
  connecting: {
    type: Boolean,
    default: false
  }
});

defineEmits(['open-settings', 'power-toggle']);
</script>
