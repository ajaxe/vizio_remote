<template>
  <div class="px-3 pt-3 pb-4">
    <div class="d-flex align-center justify-space-between px-3 mb-2">
      <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase" style="letter-spacing: 1.2px;">
        Apps & Streaming
      </span>
      <span class="text-caption text-disabled">
        Scroll &rarr;
      </span>
    </div>

    <!-- Horizontal Side-Scrollable Row -->
    <v-slide-group
      show-arrows="always"
      class="py-1"
    >
      <v-slide-group-item
        v-for="app in apps"
        :key="app.id"
      >
        <v-card
          elevation="4"
          rounded="xl"
          class="ma-2 d-flex flex-column align-center justify-center app-card"
          height="76"
          width="82"
          color="surface"
          :style="{ borderTop: `3.5px solid ${app.color}` }"
          @click="$emit('launch', app)"
        >
          <v-icon
            icon="mdi-play-box-multiple"
            :color="app.color"
            size="24"
            class="mb-1"
          />
          <span class="text-caption font-weight-bold text-center px-1 text-truncate" style="max-width: 76px; font-size: 0.72rem !important;">
            {{ app.name }}
          </span>
        </v-card>
      </v-slide-group-item>
    </v-slide-group>
  </div>
</template>

<script setup>
/**
 * @typedef {Object} Props
 * @property {import('../../types').VizioApp[]} apps
 */

defineProps({
  apps: {
    type: Array,
    default: () => []
  }
});

defineEmits(['launch']);
</script>
