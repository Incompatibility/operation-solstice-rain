<template>
	<dialog ref="dialog" class="briefing-editor" aria-labelledby="briefing-editor-title"
		@cancel.prevent="cancel" @keydown.stop>
		<form @submit.prevent="confirmingDelete ? remove() : save()">
			<h2 id="briefing-editor-title">
				{{ confirmingDelete ? removalAction : entry ? "Edit" : "New" }} {{ entryType }}
			</h2>
			<p v-if="confirmingDelete">{{ removalAction }} “{{ entry.callsign || entry.name || entry.title }}” from this world's briefing?</p>
			<template v-else>
				<div v-if="isMission" class="briefing-editor-metadata">
					<label>
						Mission number
						<input v-model.trim="draft.slug" :readonly="Boolean(entry)" required
							:pattern="entry ? undefined : '[0-9]+'" inputmode="numeric" placeholder="002" />
					</label>
					<label>
						Status
						<select v-model="draft.status" required>
							<option value="start">Current briefing</option>
							<option value="partial-success">Partial success</option>
							<option value="success">Success</option>
							<option value="failure">Failure</option>
						</select>
					</label>
				</div>
				<label v-if="isMission || isLog">
					Title
					<input v-model.trim="draft[isMission ? 'name' : 'title']" required />
				</label>
				<template v-if="isLog">
					<div class="briefing-editor-metadata">
						<label>
							Location
							<input v-model.trim="draft.location" />
						</label>
						<label>
							Time
							<input v-model.trim="draft.time" />
						</label>
					</div>
					<label>
						Thumbnail URL or bundled path
						<input v-model.trim="draft.thumbnail" placeholder="/icons/orbital.svg" />
					</label>
				</template>
				<label v-if="isMission || isLog" class="briefing-editor-checkbox">
					<input type="checkbox" :checked="!draft.hidden" @change="draft.hidden = !$event.target.checked" />
					Show to players
				</label>
				<div v-if="collection === 'header'" class="briefing-editor-metadata">
					<label v-for="[key, label] in headerFields" :key="key">
						{{ label }}
						<input v-model.trim="draft[key]" />
					</label>
				</div>
				<template v-if="isStatusEntry">
					<label>Type <input v-model.trim="draft.type" required /></label>
					<label>Name <input v-model.trim="draft.name" required /></label>
					<label>Description <textarea v-model="draft.description" rows="4"></textarea></label>
					<label v-if="collection === 'reserves'">Pilot callsign <input v-model.trim="draft.callsign" /></label>
					<template v-else>
						<div class="briefing-editor-metadata">
							<label>Segments <input v-model.number="draft.max" type="number" min="1" max="100" required /></label>
							<label>Filled <input v-model.number="draft.value" type="number" min="0" :max="draft.max" required /></label>
						</div>
						<label>Color <input v-model="draft.color" type="color" /></label>
					</template>
				</template>
				<label v-if="hasMarkdown">
					Briefing text (Markdown)
					<textarea v-model="draft.content" rows="10" required></textarea>
				</label>
			</template>
			<p v-if="error" class="briefing-editor-error" role="alert">{{ error }}</p>
			<div class="briefing-edit-actions">
				<template v-if="confirmingDelete">
					<button v-if="isPilotRemoval" type="button" :disabled="saving" @click="cancel">Cancel</button>
					<button v-else ref="backButton" type="button" :disabled="saving" @click="backToEditing">Back</button>
					<button type="submit" :disabled="saving">{{ saving ? "Saving…" : `Confirm ${removalAction.toLowerCase()} ${entryType}` }}</button>
				</template>
				<template v-else>
					<button v-if="entry && (isMission || isLog || isStatusEntry)" type="button" class="briefing-delete"
						:disabled="saving" @click="confirmDelete">Delete {{ entryType }}</button>
					<button type="button" :disabled="saving" @click="cancel">Cancel</button>
					<button type="submit" :disabled="saving">{{ saving ? "Saving…" : "Save to world" }}</button>
				</template>
			</div>
		</form>
	</dialog>
</template>

<script setup>
import { nextTick, onMounted, ref } from "vue";

const props = defineProps({
	collection: { type: String, required: true },
	entry: { type: Object, default: null },
	missions: { type: Array, required: true },
	saveEntry: { type: Function, required: true },
	deleteEntry: { type: Function, required: true },
});
const emit = defineEmits(["close"]);
const isMission = props.collection === "missions";
const isLog = props.collection === "events";
const isPilotRemoval = props.collection === "pilotRoster";
const removalAction = isPilotRemoval ? "Remove" : "Delete";
const isStatusEntry = props.collection === "reserves" || props.collection === "clocks";
const hasMarkdown = isMission || isLog || props.collection === "planet";
const entryType = { missions: "mission", events: "log", planet: "planetary description",
	header: "header", reserves: "reserve", clocks: "clock", pilotRoster: "pilot" }[props.collection];
const headerFields = [
	["headerTitle", "Header title"], ["headerSubtitle", "Header subtitle"],
	["subheaderTitle", "Operation title"], ["subheaderSubtitle", "Mission subtitle"],
	["planet", "Planet"], ["year", "Year"], ["system", "System"], ["gate", "Gate"], ["ring", "Ring"],
];
const initialEntry = {
	missions: { slug: "", name: "", status: "start", hidden: false },
	events: { title: "", location: "", time: "", thumbnail: "", hidden: false },
	reserves: { type: "Reserve", name: "", description: "", callsign: "" },
	clocks: { type: "Operation Progress", name: "", description: "", max: 4, value: 0, color: "#EA534C" },
}[props.collection];
const draft = ref({ ...(hasMarkdown ? { content: "" } : {}), ...initialEntry, ...props.entry });
const dialog = ref(null);
const backButton = ref(null);
const error = ref("");
const saving = ref(false);
const confirmingDelete = ref(isPilotRemoval);

onMounted(() => dialog.value.showModal());

function close() {
	dialog.value.close();
	emit("close");
}

function cancel() {
	if (!saving.value) close();
}

async function confirmDelete() {
	error.value = "";
	confirmingDelete.value = true;
	await nextTick();
	backButton.value?.focus();
}

function backToEditing() {
	error.value = "";
	confirmingDelete.value = false;
}

async function save() {
	if (saving.value) return;
	error.value = "";
	if (hasMarkdown && !draft.value.content.trim()) {
		error.value = "Enter briefing text before saving.";
		return;
	}
	if (isMission && !props.entry && props.missions.some(mission => Number(mission.slug) === Number(draft.value.slug))) {
		error.value = "That mission number already exists.";
		return;
	}

	await commit(() => props.saveEntry({ ...draft.value }));
}

async function remove() {
	await commit(props.deleteEntry);
}

async function commit(operation) {
	if (saving.value) return;
	error.value = "";
	saving.value = true;
	try {
		await operation();
		close();
	} catch (cause) {
		error.value = cause.message;
	} finally {
		saving.value = false;
	}
}
</script>

<style scoped>
.briefing-editor {
	width: min(40rem, calc(100% - 2rem));
	max-height: calc(100% - 2rem);
	padding: 1.25rem;
	border: 1px solid var(--primary-color);
	background: #191e20;
	color: #eee;
	color-scheme: dark;
	font-family: "Titillium Web", sans-serif;
}

.briefing-editor::backdrop {
	background: rgb(0 0 0 / 70%);
}

.briefing-editor h2 {
	font-family: "Big Shoulders Display", sans-serif;
	font-size: 1.75rem;
}

.briefing-editor form,
.briefing-editor label {
	display: grid;
	gap: 0.5rem;
}

.briefing-editor form {
	gap: 0.85rem;
}

.briefing-editor input,
.briefing-editor select,
.briefing-editor textarea {
	width: 100%;
	min-width: 0;
	padding: 0.5rem;
	border: 1px solid #62696b;
	background: #101416;
	color: inherit;
}

.briefing-editor .briefing-editor-checkbox {
	display: flex;
	align-items: center;
}

.briefing-editor-checkbox input {
	width: auto;
	accent-color: var(--primary-color);
}

.briefing-editor textarea {
	font-family: "Inconsolata", monospace;
	resize: vertical;
}

.briefing-editor-metadata {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
}

.briefing-editor-error {
	color: #ff9a95;
}

.briefing-editor .briefing-edit-actions {
	justify-content: flex-end;
	padding: 0;
}

.briefing-delete {
	margin-right: auto;
}
</style>
