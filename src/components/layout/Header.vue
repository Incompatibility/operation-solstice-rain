<template>
	<header>
		<div class="title clipped-x-large-forward">
			<img class="logo" src="/faction-logos/union.svg" />
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
			title="Inspect Cressidium"
			aria-label="Open Cressidium planetary viewer"
			@click="viewerOpen = true"
			>
			<PlanetGlobe :texture-url="artwork.planetTexture" />
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
		:briefing="planetBriefing"
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
    artwork: { type: Object, required: true },
    planetBriefing: { type: String, required: true },
    editable: { type: Boolean, default: false },
    planetPath: {
      type: String,
      required: true
    },
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
</style>

