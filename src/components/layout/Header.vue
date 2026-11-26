<template>
	<header>
		<div class="title clipped-x-large-forward">
			<img class="logo" :src="iconUrl" alt="" />
			<div class="title-container">
				<div id="title-first-line" class="title-row">
					<span id="title-header">{{ header.headerTitle }}</span>
					<span id="title-subheader">{{ header.headerSubtitle }}</span>
				</div>
				<div class="title-row">
					<span id="subtitle-header">{{ header.subheaderTitle }}</span>
					<span id="subtitle-subheader">// {{ header.subheaderSubtitle }}</span>
				</div>
			</div>
		</div>
		<div class="rhombus"></div>
		<div class="planet-location-container">
			<button
			type="button"
			class="planet-launch"
			:title="planet.name ? `Inspect ${planet.name}` : 'Open planetary viewer'"
			aria-label="Open planetary viewer"
			@click="viewerOpen = true"
			>
			<PlanetGlobe v-if="artwork.planetTexture" :texture-url="artwork.planetTexture" :bundled-planet="artwork.bundledPlanet" />
			<img v-else class="planet-icon" src="/icons/orbital.svg" alt="" />
			</button>
			<div class="location-info">
				<div id="planet-year" class="location-row">
					<div id="year">
						<h4>Year</h4>
						<span class="subtitle">{{ header.year }}</span>
					</div>
					<div id="planet">
						<h4>Deployment Info</h4>
						<span class="subtitle">{{ header.planet }}</span>
					</div>
				</div>
				<div id="system-gate-ring" class="location-row">
					<div id="ring">
						<h4>Ring</h4>
						<span class="subtitle">{{ header.ring }}</span>
					</div>
					<div id="gate">
						<h4>Gate</h4>
						<span class="subtitle">{{ header.gate }}</span>
					</div>
					<div id="system">
						<h4>System</h4>
						<span class="subtitle">{{ header.system }}</span>
					</div>
				</div>
			</div>
		</div>

		<PlanetViewer
		v-if="viewerOpen"
		:planet="planet"
		:editable="editable"
		:artwork="artwork"
		@edit-description="$emit('edit-planet')"
		@close="viewerOpen = false"
		/>

	</header>
</template>



<script>
import PlanetGlobe from "@/components/PlanetGlobe.vue";
import PlanetViewer from "@/components/PlanetViewer.vue";

export default {
  emits: ["edit-planet"],
  components: {
    PlanetGlobe,
    PlanetViewer
  },

  props: {
    iconUrl: { type: String, required: true },
    artwork: { type: Object, required: true },
    planet: { type: Object, required: true },
    editable: { type: Boolean, default: false },
    header: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      viewerOpen: false
    };
  }
};
</script>




<style scoped>
.planet-launch {
  display: block;
  width: 90px;
  height: 90px;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  cursor: zoom-in;
}

.planet-launch:hover {
  filter: brightness(1.15);
}

.planet-launch:focus-visible {
  outline: 2px solid var(--primary-color, #ea534c);
  outline-offset: 3px;
}

.planet-icon {
  width: 40px;
  margin: auto;
  filter: invert(1);
}
</style>

