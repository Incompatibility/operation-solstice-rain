<template>
	<dialog ref="dialog" class="briefing-editor" aria-labelledby="briefing-editor-title"
		@cancel.prevent="cancel" @keydown.stop>
		<form @submit.prevent="confirmingDelete ? remove() : save()">
			<h2 id="briefing-editor-title">
				{{ isSwitchOperation ? "Switch active operation" : dialogTitle }}
			</h2>
			<p v-if="confirmingDelete">{{ removalAction }} “{{ entry.callsign || entry.name || entry.title }}” from this world's briefing?</p>
			<template v-else>
				<template v-if="isOperation">
					<label>Operation name <input v-model.trim="draft.name" required /></label>
					<label>Planet <input v-model.trim="draft.planet" /></label>
					<p>Starting this operation archives {{ archiveTitle }} and carries its pilot roster forward.</p>
				</template>
				<template v-if="isSwitchOperation">
					<label>
						Operation to activate
						<select v-model="draft.targetId" required>
							<option disabled value="">Choose an operation</option>
							<option v-for="operation in archivedOperations" :key="operation.id" :value="operation.id">
								{{ operation.title }}
							</option>
						</select>
					</label>
					<p>Switching archives {{ archiveTitle }} and resumes the selected operation with its saved pilot roster.</p>
				</template>
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
				<template v-if="isPoi">
					<div class="briefing-editor-metadata">
						<label v-for="[key, label] in poiFields" :key="key">
							{{ label }}
							<input v-model.trim="draft[key]" :required="key === 'name'" />
						</label>
					</div>
					<label>Personnel overview <textarea v-model.trim="draft.summary" rows="3"></textarea></label>
					<label>Background (separate paragraphs with a blank line)
						<textarea v-model="poiBackground" rows="5"></textarea>
					</label>
				</template>
				<label v-if="isMission || isLog || isPoi" class="briefing-editor-checkbox">
					<input type="checkbox" :checked="!draft.hidden" @change="draft.hidden = !$event.target.checked" />
					Show to players
				</label>
				<template v-if="collection === 'header'">
					<div class="briefing-editor-metadata">
						<label v-for="[key, label] in headerFields" :key="key">
							{{ label }}
							<input v-model.trim="draft[key]" />
						</label>
					</div>
					<div class="briefing-appearance">
						<fieldset v-if="pickHeaderIcon" class="briefing-icon-field">
							<legend>Header icon</legend>
							<div class="briefing-edit-actions">
								<img :src="headerIconUrl(draft.icon)" alt="" width="40" height="40" />
								<button type="button" :disabled="saving || pickingIcon" @click="chooseIcon">Change icon</button>
								<button v-if="draft.icon" type="button" :disabled="saving || pickingIcon"
									@click="resetIcon">Use default icon</button>
							</div>
						</fieldset>
						<label>
							Color theme
							<select v-model="draft.theme" :disabled="saving" @change="emit('preview-theme', $event.target.value)">
								<option v-for="(name, value) in briefingThemes" :key="value" :value="value">{{ name }}</option>
							</select>
						</label>
					</div>
				</template>
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
					<button v-if="entry && (isMission || isLog || isPoi || isStatusEntry)" type="button" class="briefing-delete"
						:disabled="saving" @click="confirmDelete">Delete {{ entryType }}</button>
					<button type="button" :disabled="saving || pickingIcon" @click="cancel">Cancel</button>
					<button type="submit" :disabled="saving || pickingIcon">
						{{ saving ? "Saving…" : saveAction }}
					</button>
				</template>
			</div>
		</form>
	</dialog>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { briefingThemes } from "@/utils/briefingThemes.js";

const props = defineProps({
	collection: { type: String, required: true },
	entry: { type: Object, default: null },
	missions: { type: Array, required: true },
	saveEntry: { type: Function, required: true },
	deleteEntry: { type: Function, required: true },
	archiveTitle: { type: String, default: "" },
	archivedOperations: { type: Array, default: () => [] },
	headerIconUrl: { type: Function, required: true },
	pickHeaderIcon: { type: Function, default: null },
});
const emit = defineEmits(["close", "preview-theme"]);
const isMission = props.collection === "missions";
const isLog = props.collection === "events";
const isPoi = props.collection === "pois";
const isOperation = props.collection === "operation";
const isSwitchOperation = props.collection === "switchOperation";
const isPilotRemoval = props.collection === "pilotRoster";
const removalAction = isPilotRemoval ? "Remove" : "Delete";
const isStatusEntry = props.collection === "reserves" || props.collection === "clocks";
const hasMarkdown = isMission || isLog || props.collection === "planet";
const entryType = { missions: "mission", events: "log", planet: "planetary description",
	header: "header", reserves: "reserve", clocks: "clock", pilotRoster: "pilot", pois: "POI",
	operation: "operation", switchOperation: "operation" }[props.collection];
const headerFields = [
	["headerTitle", "Header title"], ["headerSubtitle", "Header subtitle"],
	["subheaderTitle", "Operation title"], ["subheaderSubtitle", "Mission subtitle"],
	["planet", "Planet"], ["year", "Year"], ["system", "System"], ["gate", "Gate"], ["ring", "Ring"],
];
const poiFields = [
	["name", "Name"], ["title", "Title"], ["pronouns", "Pronouns"],
	["affiliation", "Affiliation"], ["assignment", "Assignment"], ["role", "Role"],
];
const initialEntry = {
	operation: { name: "", planet: "" },
	switchOperation: { targetId: "" },
	missions: { slug: "", name: "", status: "start", hidden: false },
	events: { title: "", location: "", time: "", thumbnail: "", hidden: false },
	pois: { name: "", title: "", pronouns: "", affiliation: "", assignment: "", role: "", summary: "", hidden: false },
	reserves: { type: "Reserve", name: "", description: "", callsign: "" },
	clocks: { type: "Operation Progress", name: "", description: "", max: 4, value: 0, color: "#EA534C" },
}[props.collection];
const draft = ref({ ...(hasMarkdown ? { content: "" } : {}), ...initialEntry, ...props.entry });
const poiBackground = ref(isPoi ? props.entry?.details?.join("\n\n") ?? "" : "");
const dialog = ref(null);
const backButton = ref(null);
const error = ref("");
const saving = ref(false);
const pickingIcon = ref(false);
const confirmingDelete = ref(isPilotRemoval);
const dialogTitle = computed(() => [confirmingDelete.value ? removalAction : props.entry ? "Edit" : "New", entryType].join(" "));
const saveAction = { operation: "Start operation", switchOperation: "Switch operation" }[props.collection] ?? "Save to world";

onMounted(() => dialog.value.showModal());

function close() {
	dialog.value.close();
	emit("close");
}

function cancel() {
	if (!saving.value && !pickingIcon.value) close();
}

async function chooseIcon() {
	pickingIcon.value = true;
	error.value = "";
	try {
		const path = await props.pickHeaderIcon(draft.value.icon);
		if (path) draft.value.icon = path;
	} catch (cause) {
		error.value = cause.message;
	} finally {
		pickingIcon.value = false;
	}
}

function resetIcon() {
	error.value = "";
	draft.value.icon = null;
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
	if (saving.value || pickingIcon.value) return;
	error.value = "";
	if (hasMarkdown && !draft.value.content.trim()) {
		error.value = "Enter briefing text before saving.";
		return;
	}
	if (isMission && !props.entry && props.missions.some(mission => Number(mission.slug) === Number(draft.value.slug))) {
		error.value = "That mission number already exists.";
		return;
	}

	const entry = { ...draft.value };
	if (isPoi) {
		if (!entry.name) {
			error.value = "Enter a name for this POI.";
			return;
		}
		entry.details = poiBackground.value.split(/\r?\n\s*\r?\n/).map(paragraph => paragraph.trim()).filter(Boolean);
	}
	await commit(() => props.saveEntry(entry));
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
	background: var(--briefing-panel);
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

.briefing-appearance {
	display: flex;
	flex-wrap: wrap;
	align-items: end;
	gap: 0.75rem;
}

.briefing-icon-field {
	flex: 1 1 17rem;
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

.briefing-icon-field legend {
	padding: 0;
	margin-bottom: 0.5rem;
}

.briefing-icon-field .briefing-edit-actions {
	justify-content: flex-start;
	align-items: center;
}

.briefing-icon-field img {
	background: var(--primary-color);
	padding: 0.25rem;
	object-fit: contain;
}

.briefing-appearance label {
	flex: 1 1 10rem;
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
