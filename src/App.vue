<template>
	<div class="page-wrapper">
		<Header :key="operation?.id" :class="{ animate: animate }" :header="header" :icon-url="headerIconUrl(header.icon)"
			:planet="planet" :editable="canEditBriefings" :artwork="artwork"
			@edit-planet="openEditor('planet', { content: planet.briefing })" />
		<Sidebar :animate="animate" :class="{ animate: animate }" />
	</div>
	<div id="router-view-container" :class="{ 'has-operations': world }">
		<div v-if="world" class="briefing-edit-actions operation-toolbar">
			<label for="briefing-operation">Operation</label>
			<select id="briefing-operation" :value="operation.id" @change="viewOperation($event.target.value)">
				<option v-for="item in world.operations" :key="item.id" :value="item.id">
					{{ operationTitle(item) }}{{ item.archivedAt ? " (Archived)" : " (Active)" }}
				</option>
			</select>
			<button v-if="canEditBriefings" type="button" @click="openEditor('operation')">New operation</button>
			<button v-if="canEditBriefings && archivedOperations.length" type="button"
				@click="openEditor('switchOperation')">Switch active</button>
		</div>
		<router-view :key="operation?.id" :animate="animate" :initial-slug="initialSlug" :missions="missions" :events="events"
			:pilots="pilots" :clocks="clocks" :reserves="reserves" :persons="persons" :editable="canEditBriefings" :artwork="artwork"
			:header="header" :pilot-sync="pilotSync"
			@edit-content="openEditor" @remove-pilot="openPilotRemoval" />
	</div>
	<BriefingEditor v-if="editor" :collection="editor.collection" :entry="editor.entry"
		:missions="missions" :save-entry="saveBriefingEntry" :delete-entry="deleteBriefingEntry"
		:archive-title="editor.archiveTitle" :archived-operations="archivedOperations"
		:header-icon-url="headerIconUrl" :pick-header-icon="artwork.editable ? pickArtwork : null"
		@preview-theme="previewTheme = $event" @close="closeEditor" />
	<svg style="visibility: hidden; position: absolute" width="0" height="0" xmlns="http://www.w3.org/2000/svg"
		version="1.1">
		<defs>
			<filter id="round">
				<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
				<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -5"
					result="goo" />
				<feComposite in="SourceGraphic" in2="goo" operator="atop" />
			</filter>
		</defs>
	</svg>
	<audio autoplay>
		<source src="/startup.ogg" type="audio/ogg" />
	</audio>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import BriefingEditor from "./components/BriefingEditor.vue";
import Config from "@/assets/info/general-config.json";
import defaultPersons from "@/assets/info/poi-profiles.json";
import defaultPlanetLocations from "@/assets/info/planet-locations.json";
import cressidiumBriefing from "@/assets/planet-briefings/cressidium.md?raw";
import { playMenuClick } from "@/utils/uiSounds.js";
import { publicAssetUrl } from "@/utils/publicAssetUrl.js";
import { mergeEntries } from "@/utils/briefingContent.js";
import { briefingTheme } from "@/utils/briefingThemes.js";

function pilotClocks(pilots) {
	return pilots.flatMap(pilot => (pilot.clocks ?? []).map((clock, index) => ({
		id: `pilot-${pilot.id}-${clock.id || index}`, type: `Pilot Project // ${pilot.callsign}`,
		name: clock.title, description: clock.description, value: clock.progress, max: clock.segments, color: "#3CB043",
	})));
}

function pilotReserves(pilots) {
	return pilots.flatMap(pilot => (pilot.reserves ?? []).map((reserve, index) => ({
		...reserve, id: `pilot-${pilot.id}-${reserve.id || index}`, callsign: pilot.callsign.toUpperCase(),
	})));
}

function resumableSupport(snapshot, derived, edits) {
	const derivedIds = new Set(derived.map(entry => entry.id));
	return [
		...snapshot.filter(entry => !derivedIds.has(entry.id)),
		...edits.filter(entry => derivedIds.has(entry.id) || entry.deleted),
	];
}

function restoreLegacySupport(snapshot, derived) {
	const defaults = new Map(derived.map(entry => [entry.id, entry]));
	const savedIds = new Set(snapshot.map(entry => entry.id));
	return [
		...snapshot.filter(entry => JSON.stringify(entry) !== JSON.stringify(defaults.get(entry.id))),
		...derived.filter(entry => !savedIds.has(entry.id)).map(({ id }) => ({ id, deleted: true })),
	];
}

function restoreOperation({ content, resume }) {
	const { pilotSnapshot, ...snapshot } = content;
	const links = resume?.pilotLinks ?? pilotSnapshot.filter(pilot => pilot.actorId)
		.map(pilot => ({ actorId: pilot.actorId, replaces: pilot.callsign.toUpperCase() }));
	const pilotsByActor = new Map(pilotSnapshot.map(pilot => [pilot.actorId, pilot]));
	return {
		...snapshot,
		pilotRoster: links.map(link => ({ ...link, pilot: pilotsByActor.get(link.actorId) })),
		bundledPilots: resume?.bundledPilots ?? pilotSnapshot.filter(pilot => !pilot.actorId),
		removedBundledPilots: resume?.removedBundledPilots ?? [],
		clocks: resume?.clocks ?? restoreLegacySupport(snapshot.clocks, pilotClocks(pilotSnapshot)),
		reserves: resume?.reserves ?? restoreLegacySupport(snapshot.reserves, pilotReserves(pilotSnapshot)),
	};
}

export default {
	components: {
		Header,
		Sidebar,
		BriefingEditor,
	},
	props: {
		briefingStore: { type: Object, default: null },
	},

	data() {
		return {
			animate: Config.animate,
			initialSlug: Config.initialSlug,
			defaultClocks: [],
			defaultEvents: [],
			defaultMissions: [],
			world: this.briefingStore?.read() ?? null,
			archiveId: null,
			artworkBusy: false,
			artworkError: null,
			editor: null,
			previewTheme: null,
			bundledPilots: [],
			defaultReserves: [],
		};
	},
	computed: {
		operation() {
			return this.world?.operations.find(item => item.id === (this.archiveId ?? this.world.activeOperationId));
		},
		archivedOperations() {
			return (this.world?.operations ?? []).filter(item => item.archivedAt)
				.map(item => ({ id: item.id, title: this.operationTitle(item) }));
		},
		edits() {
			return this.operation?.content ?? {};
		},
		usesBundledDefaults() {
			return !this.world || this.operation.bundled;
		},
		isGM() {
			return typeof this.briefingStore?.save === "function";
		},
		canEditBriefings() {
			return this.isGM && this.operation.id === this.world.activeOperationId;
		},
		header() {
			const header = { ...(this.usesBundledDefaults ? Config.header : {}), ...this.edits.header };
			return { ...header, theme: briefingTheme(header.theme) };
		},
		activeTheme() {
			return this.previewTheme ?? this.header.theme;
		},
		pilotSync() {
			if (!this.canEditBriefings || typeof this.briefingStore?.listPilots !== "function") return null;
			return { list: this.listFoundryPilots, open: this.briefingStore.openPilotSheet,
				publish: this.publishPilot, linked: (this.edits.pilotRoster ?? []).map(link => link.actorId) };
		},
		bundledRoster() {
			return this.usesBundledDefaults ? this.bundledPilots : this.edits.bundledPilots ?? [];
		},
		pilotRecords() {
			if (this.operation?.archivedAt) return this.edits.pilotSnapshot;
			const links = this.edits.pilotRoster ?? [];
			const replaced = new Set([...links.map(link => link.replaces), ...(this.edits.removedBundledPilots ?? [])]);
			return [...this.bundledRoster.filter(pilot => !replaced.has(pilot.callsign.toUpperCase())), ...links.map(link => link.pilot)];
		},
		pilots() {
			return this.pilotRecords.map(pilot => pilot.actorId ? {
				...pilot,
				portraitUrl: pilot.portrait && this.briefingStore.imageUrl(pilot.portrait),
				mechs: pilot.mechs.map(mech => ({ ...mech, portraitUrl: mech.portrait && this.briefingStore.imageUrl(mech.portrait) })),
			} : pilot);
		},
		clocks() {
			if (this.operation?.archivedAt) return this.edits.clocks;
			return mergeEntries([...(this.usesBundledDefaults ? this.defaultClocks : []), ...pilotClocks(this.pilotRecords)],
				this.edits.clocks ?? [], "id");
		},
		reserves() {
			if (this.operation?.archivedAt) return this.edits.reserves;
			return mergeEntries([...(this.usesBundledDefaults ? this.defaultReserves : []), ...pilotReserves(this.pilotRecords)],
				this.edits.reserves ?? [], "id");
		},
		missions() {
			return mergeEntries(this.usesBundledDefaults ? this.defaultMissions : [], this.edits.missions ?? [], "slug")
				.filter(entry => this.isGM || !entry.hidden)
				.sort((a, b) => Number(b.slug) - Number(a.slug));
		},
		events() {
			return mergeEntries(this.usesBundledDefaults ? this.defaultEvents : [], this.edits.events ?? [], "id")
				.filter(entry => this.isGM || !entry.hidden);
		},
		persons() {
			return mergeEntries(this.usesBundledDefaults ? defaultPersons : [], this.edits.pois ?? [], "id")
				.filter(entry => this.isGM || !entry.hidden);
		},
		planet() {
			return {
				name: this.header.planet,
				system: this.header.system,
				ship: this.header.headerSubtitle,
				operation: this.operationTitle(this.operation),
				briefing: this.edits.planetBriefing ?? (this.usesBundledDefaults ? cressidiumBriefing : ""),
				locations: this.edits.planetLocations ?? (this.usesBundledDefaults ? defaultPlanetLocations : []),
				area: this.edits.planetArea ?? (this.usesBundledDefaults ? "Nov Elysia" : ""),
			};
		},
		defaultPlanetTexture() {
			return this.edits.defaultPlanetTexture ?? (this.usesBundledDefaults ? "/planets/cressidium.png" : "");
		},
		artwork() {
			const planetPath = this.edits.planetTexture;
			const portraits = Object.entries(this.edits.poiPortraits ?? {});
			return {
				editable: this.canEditBriefings && typeof this.briefingStore?.pickImage === "function",
				busy: this.artworkBusy === this.operation?.id,
				error: this.artworkError?.operationId === this.operation?.id ? this.artworkError : null,
				customPlanetTexture: Boolean(planetPath),
				planetTexture: planetPath ? this.briefingStore.imageUrl(planetPath) : publicAssetUrl(this.defaultPlanetTexture),
				bundledPlanet: Boolean(this.defaultPlanetTexture),
				portraits: Object.fromEntries(portraits.map(([id, path]) => [id, this.briefingStore.imageUrl(path)])),
				change: this.changeArtwork,
			};
		},
	},
	watch: {
		"world.activeOperationId"(id) {
			if (id === this.archiveId) this.archiveId = null;
		},
		activeTheme: {
			immediate: true,
			handler(theme) {
				document.documentElement.dataset.briefingTheme = theme;
			},
		},
	},
	created() {
		this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);
		this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: '?raw', import: 'default', eager: true }));
		this.importEvents(import.meta.glob("@/assets/events/*.md", { query: '?raw', import: 'default', eager: true }));
		this.defaultClocks = this.importRows(import.meta.glob("@/assets/clocks/*.json", { eager: true, import: "default" }));
		this.defaultReserves = this.importRows(import.meta.glob("@/assets/reserves/*.json", { eager: true, import: "default" }));
		const pilots = import.meta.glob("@/assets/pilots/*.json", { eager: true, import: "default" });
		this.bundledPilots = Object.values(pilots).map(pilot => ({
			...pilot, name: pilot.name.replace("※", ""), callsign: pilot.callsign.replace("※", ""),
			...Config.pilotSpecialInfo[pilot.callsign.replace("※", "").toUpperCase()],
		}));
	},

	mounted() {
	if (this.briefingStore) this.briefingStore.notifyChanges = state => { this.world = state; };
	document.addEventListener(
		"click",
		this.handleMenuClick
	);
	},

	beforeUnmount() {
	if (this.briefingStore) delete this.briefingStore.notifyChanges;
	document.removeEventListener(
		"click",
		this.handleMenuClick
	);
	},

	methods: {
		operationTitle(operation) {
			return operation?.content.header?.subheaderTitle || operation?.name || Config.header.subheaderTitle;
		},
		viewOperation(id) {
			this.archiveId = id === this.world.activeOperationId ? null : id;
		},
		async changeOperation(collection, entry, operationId) {
			if (operationId !== this.world.activeOperationId) {
				throw new Error("The active operation changed. Reopen the operation dialog to try again.");
			}
			const snapshot = {
				header: this.header,
				missions: this.missions,
				events: this.events,
				pois: this.persons,
				clocks: this.clocks,
				reserves: this.reserves,
				pilotSnapshot: this.pilotRecords,
				poiPortraits: this.edits.poiPortraits,
				planetBriefing: this.planet.briefing,
				planetLocations: this.planet.locations,
				planetArea: this.planet.area,
				planetTexture: this.edits.planetTexture,
				defaultPlanetTexture: this.defaultPlanetTexture,
			};
			const resume = {
				bundledPilots: this.bundledRoster,
				pilotLinks: (this.edits.pilotRoster ?? []).map(({ actorId, replaces }) => ({ actorId, replaces })),
				removedBundledPilots: this.edits.removedBundledPilots ?? [],
				clocks: resumableSupport(snapshot.clocks, pilotClocks(this.pilotRecords), this.edits.clocks ?? []),
				reserves: resumableSupport(snapshot.reserves, pilotReserves(this.pilotRecords), this.edits.reserves ?? []),
			};
			const draft = { ...entry, snapshot, resume, archiveName: this.operationTitle(this.operation) };
			if (collection === "switchOperation") {
				const target = this.world.operations.find(item => item.id === entry.targetId && item.archivedAt);
				if (!target) throw new Error("Choose an archived operation.");
				draft.archivedAt = target.archivedAt;
				draft.restored = restoreOperation(target);
			}
			this.world = await this.briefingStore.save(collection, JSON.parse(JSON.stringify(draft)), this.edits, operationId);
		},
		listFoundryPilots() {
			const actors = this.briefingStore.listPilots();
			const missing = (this.edits.pilotRoster ?? []).filter(link => !actors.some(actor => actor.id === link.actorId));
			return [...actors, ...missing.map(({ pilot }) => ({ id: pilot.actorId, name: pilot.name, callsign: pilot.callsign, missing: true }))];
		},
		async publishPilot(actorId, unlink = false) {
			this.world = await this.briefingStore.save("pilotRoster", { actorId, unlink }, null, this.operation.id);
		},
		headerIconUrl(path) {
			return path ? this.briefingStore?.imageUrl(path) ?? publicAssetUrl(path) : publicAssetUrl(Config.icon);
		},
		async pickArtwork(previous, crossOrigin = false) {
			const path = await this.briefingStore.pickImage(previous ?? "");
			if (!path || path === previous) return null;

			const image = new Image();
			if (crossOrigin) image.crossOrigin = "anonymous";
			image.src = this.briefingStore.imageUrl(path);
			try {
				await image.decode();
			} catch {
				throw new Error("The selected image could not be loaded.");
			}
			return path;
		},
		async changeArtwork(poiId = null, reset = false) {
			if (!this.artwork.editable || this.artworkBusy) return;
			const operationId = this.operation.id;
			const previous = (poiId ? this.edits.poiPortraits?.[poiId] : this.edits.planetTexture) ?? null;
			this.artworkError = null;
			this.artworkBusy = operationId;
			try {
				const path = reset ? null : await this.pickArtwork(previous, !poiId);
				if (!reset && !path) return;
				this.world = await this.briefingStore.save("artwork", { poiId, path }, previous, operationId);
			} catch (error) {
				this.artworkError = { operationId, poiId, message: error.message };
			} finally {
				this.artworkBusy = false;
			}
		},
		findEntryEdit(collection, entry) {
			const key = collection === "missions" ? "slug" : "id";
			return this.edits[collection]?.find(item => item[key] === entry[key]) ?? null;
		},
		openEditor(collection, entry = null) {
			if (!this.canEditBriefings) return;
			let previous;
			if (collection === "planet") previous = this.edits.planetBriefing ?? null;
			else if (collection === "header") previous = this.edits.header ?? null;
			else previous = entry && this.findEntryEdit(collection, entry);
			this.editor = { collection, entry, previous, operationId: this.operation.id, archiveTitle: this.operationTitle(this.operation) };
		},
		closeEditor() {
			this.previewTheme = null;
			this.editor = null;
		},
		openPilotRemoval(pilot) {
			if (this.pilotSync) this.editor = { collection: "pilotRoster", entry: pilot, operationId: this.operation.id };
		},
		async saveBriefingEntry(entry) {
			const { collection, entry: original, operationId } = this.editor;
			if (collection === "operation" || collection === "switchOperation") {
				return this.changeOperation(collection, entry, operationId);
			}
			let previous = this.editor.previous;
			if (collection === "missions" && !original) {
				const deleted = this.findEntryEdit(collection, entry);
				if (deleted?.deleted) previous = deleted;
			}
			this.world = await this.briefingStore.save(collection, entry, previous, operationId);
		},
		async deleteBriefingEntry() {
			const { collection, entry, previous, operationId } = this.editor;
			if (collection === "pilotRoster") {
				this.world = await this.briefingStore.save(collection, {
					actorId: entry.actorId, callsign: entry.callsign, removeFromBriefing: true,
				}, null, operationId);
				return;
			}
			const key = collection === "missions" ? "slug" : "id";
			this.world = await this.briefingStore.save(collection, { [key]: entry[key], deleted: true }, previous, operationId);
		},
		handleMenuClick(event) {
		const target = event.target;

		if (!(target instanceof Element)) return;

		const interactive = target.closest(`
			button,
			a,
			[role="button"],
			.mission,
			.clock-container,
			.poi-entry
		`);

		if (!interactive) return;

		// Ignore disabled controls.
		if (
			interactive.matches(
			':disabled, [aria-disabled="true"]'
			)
		) {
			return;
		}

		playMenuClick();
		},

		setTitleFavicon(title, favicon) {
			document.title = title;
			let headEl = document.querySelector('head');
			let faviconEl = document.createElement('link');
			faviconEl.setAttribute('rel', 'shortcut icon');
			faviconEl.setAttribute('href', publicAssetUrl(favicon));
			headEl.appendChild(faviconEl);
		},
		importMissions(files) {
			this.defaultMissions = Object.values(files).map(markdown => {
				const [slug, name, status, ...body] = markdown.split(/\r?\n/);
				return { slug, name, status, content: body.join("\n") };
			});
		},
		importEvents(files) {
			this.defaultEvents = Object.entries(files).map(([path, markdown]) => {
				const [title, location, time, thumbnail, ...body] = markdown.split(/\r?\n/);
				const id = path.split("/").pop();
				return { id, title, location, time, thumbnail, content: body.join("\n") };
			}).reverse();
		},
		importRows(files) {
			return Object.entries(files).flatMap(([path, rows]) => rows.map((row, index) => ({ ...row, id: row.id ?? `${path}:${index}` })));
		},
	},
};
</script>

<style>
#app {
	min-height: 100vh;
	overflow: hidden !important;
	/* border-right: 1px solid #ff0;
	border-bottom: 1px solid #ff0; */
}
</style>
