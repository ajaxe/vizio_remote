<template>
  <div class="d-flex justify-space-around px-8 my-2">
    <!-- Back Button -->
    <v-btn
      rounded="pill"
      variant="tonal"
      color="surface-bright"
      size="large"
      class="px-6 tactile-btn"
      aria-label="Back"
      @click="$emit('command', 'back')"
    >
      <v-icon icon="mdi-arrow-left" start size="20" />
      Back
    </v-btn>

    <!-- Home Button -->
    <v-btn
      rounded="pill"
      variant="tonal"
      color="surface-bright"
      size="large"
      class="px-6 tactile-btn"
      aria-label="Home"
      @click="$emit('command', 'home')"
    >
      <v-icon icon="mdi-home" start size="20" />
      Home
    </v-btn>
  </div>
</template>

<script setup>
defineEmits(['command']);
</script>
