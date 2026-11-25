<template>
	<div id="status" :class="{ animate: animateView }" :style="{ 'animation-delay': animationDelay }"
		class="content-container">
		<section id="missions" class="section-container" :style="{ 'animation-delay': animationDelay }">
			<div class="section-header clipped-medium-backward">
				<img src="/icons/campaign.svg" />
				<h1>Mission Log</h1>
			</div>
			<div class="section-content-container">
				<div v-if="editable" class="briefing-edit-actions">
					<button type="button" @click="$emit('edit-content', 'header', header)">Edit header</button>
					<button type="button" @click="$emit('edit-content', 'missions')">New mission</button>
					<button v-if="selectedMission" type="button" @click="$emit('edit-content', 'missions', selectedMission)">Edit mission</button>
				</div>
				<div class="mission-list-container">
					<p v-if="missions.length === 0" class="briefing-empty">No missions available.</p>
					<Mission v-for="item in missions" :key="item.slug" :mission="item" :selected="selectedMission.slug"
						@click="missionSlug = item.slug" />
				</div>
			</div>
		</section>
		<section id="assignment" class="section-container" :style="{ 'animation-delay': animationDelay }">
			<div class="section-header clipped-medium-backward">
				<img src="/icons/deployable.svg" />
				<h1>Current Assignment</h1>
			</div>
			<div class="section-content-container">
				<vue-markdown-it v-if="selectedMission" :source="selectedMission.content" class="markdown" />
			</div>
		</section>
		<div class="status-support">
			<section id="reserves" class="section-container" :style="{ 'animation-delay': animationDelay }">
				<div class="section-header clipped-medium-backward">
					<img src="/icons/squad.svg" />
					<h1>Reserves</h1>
				</div>
				<div class="section-content-container">
					<div v-if="editable" class="briefing-edit-actions">
						<button type="button" @click="$emit('edit-content', 'reserves')">New reserve</button>
					</div>
					<div class="reserves-list-container">
						<template v-for="item in reserves" :key="item.id">
							<Reserve :reserve="item" :pilots="pilots" />
							<div v-if="editable" class="briefing-edit-actions">
								<button type="button" :aria-label="`Edit reserve ${item.name}`" @click="$emit('edit-content', 'reserves', item)">Edit reserve</button>
							</div>
						</template>
					</div>
				</div>
			</section>
			<section id="clocks" class="section-container" :style="{ 'animation-delay': animationDelay }">
				<div class="section-header clipped-medium-backward">
					<img src="/icons/protocol.svg" />
					<h1>Clocks</h1>
				</div>
				<div class="section-content-container">
					<div v-if="editable" class="briefing-edit-actions">
						<button type="button" @click="$emit('edit-content', 'clocks')">New clock</button>
					</div>
					<div class="clocks-list-container">
						<template v-for="item in clocks" :key="item.id">
							<Clock :clock="item" :animate="animate" :animation-delay="clockAnimationDelay" />
							<div v-if="editable" class="briefing-edit-actions">
								<button type="button" :aria-label="`Edit clock ${item.name}`" @click="$emit('edit-content', 'clocks', item)">Edit clock</button>
							</div>
						</template>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import Mission from "@/components/Mission.vue";
import Event from "@/components/Event.vue";
import Clock from "@/components/Clock.vue";
import Reserve from "@/components/Reserve.vue";

export default {
	emits: ["edit-content"],
	components: {
		VueMarkdownIt,
		Mission,
		Event,
		Clock,
		Reserve,
	},
	props: {
		header: { type: Object, required: true },
		editable: { type: Boolean, default: false },
		animate: {
			type: Boolean,
			required: true,
		},
		initialSlug: {
			type: String,
			required: true,
		},
		missions: {
			type: Array,
			required: true,
		},
		events: {
			type: Array,
			required: true,
		},
		pilots: {
			type: Array,
			required: true,
		},
		clocks: {
			type: Array,
			required: true,
		},
		reserves: {
			type: Array,
			required: true,
		},
	},
	data() {
		return {
			missionSlug: this.initialSlug,
			animateView: this.animate,
			animationDelay: "1.75s",
			clockAnimationDelay: "2500",
		};
	},
	computed: {
		selectedMission() {
			return this.missions.find(mission => mission.slug === this.missionSlug) ?? this.missions[0];
		},
	},
	created() {
		this.setAnimate();
		this.setClockAnimateDelay();
	},
	methods: {
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
		},
		setClockAnimateDelay() {
			let delayToFloat = parseFloat(this.animationDelay.replace("s", ""));
			let finalClockDelay = delayToFloat * 600 + 600;
			this.clockAnimationDelay = finalClockDelay.toString();
		},
	},
};
</script>
