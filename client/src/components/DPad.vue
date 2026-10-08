<template>
  <div class="my-4 d-flex justify-center">
    <div class="dpad-cluster">
      <!-- UP Button -->
      <v-btn
        icon="mdi-chevron-up"
        variant="text"
        size="large"
        class="dpad-btn dpad-btn-up tactile-btn"
        aria-label="Navigate Up"
        @click="$emit('command', 'up')"
      />

      <!-- DOWN Button -->
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="large"
        class="dpad-btn dpad-btn-down tactile-btn"
        aria-label="Navigate Down"
        @click="$emit('command', 'down')"
      />

      <!-- LEFT Button -->
      <v-btn
        icon="mdi-chevron-left"
        variant="text"
        size="large"
        class="dpad-btn dpad-btn-left tactile-btn"
        aria-label="Navigate Left"
        @click="$emit('command', 'left')"
      />

      <!-- RIGHT Button -->
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        size="large"
        class="dpad-btn dpad-btn-right tactile-btn"
        aria-label="Navigate Right"
        @click="$emit('command', 'right')"
      />

      <!-- CENTER OK / SELECT Button -->
      <v-btn
        color="primary"
        variant="flat"
        class="dpad-btn-center tactile-btn"
        aria-label="Select OK"
        @click="$emit('command', 'ok')"
      >
        OK
      </v-btn>
    </div>
  </div>
</template>

<script setup>
/**
 * Emits 'command' event with 'up', 'down', 'left', 'right', or 'ok'.
 */
defineEmits(['command']);
</script>
