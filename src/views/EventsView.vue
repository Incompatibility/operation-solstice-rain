<template>
	<div id="eventsView" :class="{ animate: animateView }" :style="{ 'animation-delay': animationDelay }" class="content-container">
		<section id="events" :class="{ animate: animate }" class="section-container">
			<div class="section-header clipped-medium-backward">
				<img src="/icons/clockwork.svg" />
				<h1>BEATS</h1>
			</div>
			<div class="section-content-container">
				<div v-if="editable" class="briefing-edit-actions">
					<button type="button" @click="$emit('edit-content', 'events')">New log</button>
					<button v-if="selectedEvent" type="button" @click="$emit('edit-content', 'events', selectedEvent)">Edit log</button>
				</div>
				<div class="events-list-container">
					<p v-if="events.length === 0" class="briefing-empty">No logs available.</p>
					<Event
						v-for="item in events"
						:key="item.id"
						:event="item"
						:animate="animate"
						@select-event="selectedEventId = item.id" />
				</div>
			</div>
		</section>
		<section id="events-logs" :class="{ animate: animate }" class="section-container">
			<div style="height: 52px; overflow: hidden">
				<div class="section-header clipped-medium-backward-events-logs">
					<img src="/icons/conversation.svg" />
					<h1>EVENT LOG</h1>
				</div>
				<div class="rhombus-back">&nbsp;</div>
			</div>
			<div class="section-content-container extra-margins">
				<div class="event" v-if="selectedEvent">
					<div class="name">
						<h1 v-if="selectedEvent.location || selectedEvent.time">
							{{ [selectedEvent.location, selectedEvent.time].filter(Boolean).join(" // ") }}
						</h1>
						<h2>{{ selectedEvent.title }}</h2>
					</div>
					<vue-markdown-it :source="selectedEvent.content" class="markdown" />
				</div>
			</div>
		</section>
	</div>
</template>

<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import Event from "@/components/Event.vue";

export default {
	emits: ["edit-content"],
	components: {
		VueMarkdownIt,
		Event,
	},
	props: {
		editable: { type: Boolean, default: false },
		animate: {
			type: Boolean,
			required: true,
		},
		events: {
			type: Array,
			required: true,
		},
	},
	data() {
		return { selectedEventId: null };
	},
	computed: {
		selectedEvent() {
			return this.events.find(event => event.id === this.selectedEventId);
		},
	},
};
</script>
