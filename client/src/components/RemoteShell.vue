<template>
  <v-card
    class="remote-container mx-auto d-flex flex-column justify-space-between py-2"
    color="surface"
    elevation="12"
  >
    <!-- Top Header: TV Brand, Connection Status, Power, Settings -->
    <div>
      <slot name="header" />
      <v-divider class="my-1 border-opacity-25" />
    </div>

    <!-- Main Remote Controls Body -->
    <div class="flex-grow-1 d-flex flex-column justify-center py-2">
      <slot name="controls" />
    </div>

    <!-- Bottom Streaming Apps Tray -->
    <div>
      <v-divider class="my-1 border-opacity-25" />
      <slot name="apps" />
    </div>
  </v-card>
</template>

<script setup>
</script>
