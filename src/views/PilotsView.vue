<template>
	<div class="section-content-container" :class="{ animate: animateView }" :style="{ 'animation-delay': animationDelay }" id="pilots">
		<form v-if="pilotSync" class="briefing-edit-actions pilot-sync-actions" @submit.prevent="publishPilot">
			<label>
				Foundry pilot
				<select v-model="selectedActor" @focus="loadFoundryPilots">
					<option value="">Choose a pilot actor</option>
					<option v-for="actor in foundryPilots" :key="actor.id" :value="actor.id">
						{{ actor.callsign ? `${actor.callsign} (${actor.name})` : actor.name }}{{ actor.missing ? " — actor removed" : "" }}
					</option>
				</select>
			</label>
			<button type="button" :disabled="!selectedActor || selectedMissing || syncing" @click="pilotSync.open(selectedActor)">Open pilot sheet</button>
			<button type="submit" :disabled="!selectedActor || selectedMissing || syncing">{{ pilotSync.linked.includes(selectedActor) ? "Refresh pilot" : "Link pilot" }}</button>
			<button v-if="pilotSync.linked.includes(selectedActor)" type="button" :disabled="syncing" @click="publishPilot(true)">Unlink pilot</button>
			<p v-if="syncError" class="briefing-action-error" role="alert">{{ syncError }}</p>
		</form>
		<div class="pilot-list-container">
			<p v-if="!pilots.length" class="briefing-empty">No pilots available.</p>
			<div v-for="item in pilots" :key="item.id" class="pilot-list-entry">
				<Pilot :pilot="item" :animate="animate" />
				<div v-if="pilotSync" class="briefing-edit-actions">
					<button type="button" :disabled="syncing" :aria-label="`Remove pilot ${item.callsign}`"
						@click="$emit('remove-pilot', item)">Remove pilot</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import Pilot from "@/components/Pilot.vue";


export default {
	emits: ["remove-pilot"],
	components: {
		VueMarkdownIt,
		Pilot,
	},
	props: {
		pilotSync: { type: Object, default: null },
		animate: {
			type: Boolean,
			required: true,
		},
		pilots: {
			type: Array,
			required: true,
		},
	},
	data() {
		return {
			foundryPilots: [], selectedActor: "", syncing: false, syncError: "",
			animateView: this.animate,
			animationDelay: "0s",
			clockAnimationDelay: "2500",
		};
	},
	computed: {
		selectedMissing() { return this.foundryPilots.find(actor => actor.id === this.selectedActor)?.missing; },
	},
	mounted() {
		this.loadFoundryPilots();
	},
	methods: {
		loadFoundryPilots() {
			if (this.pilotSync) this.foundryPilots = this.pilotSync.list();
		},
		async publishPilot(unlink = false) {
			if (!this.selectedActor || this.syncing) return;
			this.syncing = true;
			this.syncError = "";
			try { await this.pilotSync.publish(this.selectedActor, unlink === true); this.loadFoundryPilots(); }
			catch (error) { this.syncError = error.message; }
			finally { this.syncing = false; }
		},
		setAnimate() {
			if (this.animate) {
				this.animateView = true;
			}
			let statusAnimated = window.sessionStorage.getItem("statusAnimated");
			if (statusAnimated) {
				this.animationDelay = "0s";
			}
			if (statusAnimated === null) {
				window.sessionStorage.setItem("statusAnimated", true);
			}
		}
	}
};
</script>

<style scoped>
.pilot-sync-actions {
	align-items: end;
}

.pilot-sync-actions label {
	display: grid;
	color: var(--text-location);
}

.pilot-sync-actions select {
	padding: 0.3em;
	background: #191e20;
	color: #eee;
}

.pilot-list-container {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	padding: 1em;
	gap: 1em;
}

.pilot-list-entry {
	flex: 1 1 45%;
	min-width: 0;
}

@media (max-width: 1000px) {
	.pilot-list-entry {
		flex-basis: 100%;
	}
}

.section-content-container {
	height: calc(100vh - var(--briefing-header-height));
	margin-top: 0;
	border: 0;
}
</style>
