<script setup lang="ts"></script>

<template>
  <header class="relative w-full mb-4">
    <!-- Background gradient -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-emerald-900/8 via-transparent to-blue-900/8 rounded-xl blur-xl"
    ></div>

    <!-- Main header content -->
    <div
      class="relative flex flex-col items-center justify-center p-4 md:p-5 backdrop-blur-sm bg-zinc-900/40 rounded-lg border border-zinc-700/50 shadow-lg"
    >
      <!-- Logo and title section -->
      <div class="flex items-center gap-4 mb-3">
        <div class="relative group">
          <div
            class="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-full blur opacity-50 group-hover:opacity-70 transition duration-500"
          ></div>
          <div
            class="relative bg-zinc-800 rounded-full p-2 border border-zinc-600 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center overflow-hidden"
          >
            <img
              src="/logo.png"
              alt="Melody Mate Logo"
              class="w-8 h-8 md:w-10 md:h-10 object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        </div>

        <div class="text-center md:text-left">
          <h1
            class="text-2xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent"
          >
            Melody Mate
          </h1>
        </div>
      </div>

      <!-- Description -->
      <div class="text-center max-w-2xl">
        <p class="text-sm md:text-base text-zinc-300 leading-relaxed">
          Create melodies or basslines based on
          <span class="text-emerald-400 font-medium">stochastic processes</span> using
          <span class="text-cyan-400 font-medium">rhythm presets</span>,
          <span class="text-cyan-500 font-medium">custom rhythms</span> or
          <span class="text-cyan-600 font-medium">Euclidean rhythms</span>
          and export them as MIDI files.
        </p>
      </div>
    </div>

    <!-- Decorative elements -->
    <div class="absolute -top-2 -left-2 w-16 h-16 bg-emerald-500/4 rounded-full blur-xl animate-pulse"></div>
    <div
      class="absolute -bottom-2 -right-2 w-20 h-20 bg-blue-500/4 rounded-full blur-xl animate-pulse delay-1000"
    ></div>
  </header>
</template>
