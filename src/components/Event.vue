<template>
	<div class="event">
		<div class="name">
			<h1 v-if="event.location || event.time">{{ [event.location, event.time].filter(Boolean).join(" // ") }}</h1>
			<h2>{{ event.title }}</h2>
		</div>
		<p v-if="event.hidden" class="briefing-visibility">Hidden from players</p>
		<img v-if="thumbnailUrl" class="thumbnail" :src="thumbnailUrl" alt="" />
		<div class="preview">
			{{ getPreview }}
		</div>
		<a @click.prevent="selectEvent">Read More</a>
	</div>
</template>

<script>
import EventModal from "@/components/modals/EventModal.vue";

import removeMd from "remove-markdown";
import { publicAssetUrl } from "@/utils/publicAssetUrl.js";

export default {
	name: "Event",
	components: {
		EventModal,
	},
	props: {
		event: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			removeMd,
		};
	},
	computed: {
		thumbnailUrl() {
			return publicAssetUrl(this.event.thumbnail);
		},
		getPreview() {
			return this.removeMd(this.event.content).substring(0, 200) + "...";
		},
	},
	methods: {
		selectEvent() {
			this.$emit('select-event', this.event)
		}
	}
}
</script>
