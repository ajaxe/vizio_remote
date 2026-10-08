<template>
  <div class="px-8 my-4 d-flex align-center justify-center">
    <v-card
      rounded="pill"
      color="surface"
      elevation="6"
      class="d-flex align-center justify-space-between px-2 py-1"
      style="width: 260px; border: 1px solid rgba(255, 255, 255, 0.08);"
    >
      <!-- Volume Down (-) Button -->
      <v-btn
        icon="mdi-minus"
        variant="tonal"
        color="surface-bright"
        size="large"
        class="tactile-btn"
        aria-label="Volume Down"
        @click="$emit('command', 'vol_down')"
      />

      <!-- Mute Button in Center -->
      <v-btn
        icon="mdi-volume-mute"
        variant="text"
        color="warning"
        size="large"
        class="tactile-btn mx-2"
        aria-label="Mute Toggle"
        @click="$emit('command', 'mute')"
      />

      <!-- Volume Up (+) Button -->
      <v-btn
        icon="mdi-plus"
        variant="tonal"
        color="surface-bright"
        size="large"
        class="tactile-btn"
        aria-label="Volume Up"
        @click="$emit('command', 'vol_up')"
      />
    </v-card>
  </div>
</template>

<script setup>
defineEmits(['command']);
</script>
