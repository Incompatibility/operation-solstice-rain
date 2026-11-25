<template>
	<div class="page-wrapper">
		<Header :planet-path="planetPath" :class="{ animate: animate }" :header="header"
			:planet-briefing="planetBriefing" :editable="canEditBriefings" :artwork="artwork"
			@edit-planet="openEditor('planet', { content: planetBriefing })" />
		<Sidebar :animate="animate" :class="{ animate: animate }" />
	</div>
	<div id="router-view-container">
		<router-view :animate="animate" :initial-slug="initialSlug" :missions="missions" :events="events"
			:pilots="pilots" :clocks="clocks" :reserves="reserves" :editable="canEditBriefings" :artwork="artwork"
			:header="header" :pilot-sync="pilotSync"
			@edit-content="openEditor" @remove-pilot="openPilotRemoval" />
	</div>
	<BriefingEditor v-if="editor" :collection="editor.collection" :entry="editor.entry"
		:missions="missions" :save-entry="saveBriefingEntry" :delete-entry="deleteBriefingEntry"
		@close="editor = null" />
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
import cressidiumBriefing from "@/assets/planet-briefings/cressidium.md?raw";
import { playMenuClick } from "@/utils/uiSounds.js";
import { publicAssetUrl } from "@/utils/publicAssetUrl.js";
import { mergeEntries } from "@/utils/briefingContent.js";


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
			planetPath: Config.planetPath,
			defaultClocks: [],
			defaultEvents: [],
			defaultMissions: [],
			edits: this.briefingStore?.read() ?? { missions: [], events: [] },
			artworkBusy: false,
			artworkError: null,
			editor: null,
			bundledPilots: [],
			defaultReserves: [],
		};
	},
	computed: {
		canEditBriefings() {
			return typeof this.briefingStore?.save === "function";
		},
		header() {
			return { ...Config.header, ...this.edits.header };
		},
		pilotSync() {
			if (typeof this.briefingStore?.listPilots !== "function") return null;
			return { list: this.listFoundryPilots, open: this.briefingStore.openPilotSheet,
				publish: this.publishPilot, linked: (this.edits.pilotRoster ?? []).map(link => link.actorId) };
		},
		pilots() {
			const links = this.edits.pilotRoster ?? [];
			const linked = links.map(({ pilot }) => ({
				...pilot,
				portraitUrl: pilot.portrait && this.briefingStore.imageUrl(pilot.portrait),
				mechs: pilot.mechs.map(mech => ({ ...mech, portraitUrl: mech.portrait && this.briefingStore.imageUrl(mech.portrait) })),
			}));
			const replaced = new Set([...links.map(link => link.replaces), ...(this.edits.removedBundledPilots ?? [])]);
			return [...this.bundledPilots.filter(pilot => !replaced.has(pilot.callsign.toUpperCase())), ...linked];
		},
		clocks() {
			const pilotClocks = this.pilots.flatMap(pilot => (pilot.clocks ?? []).map((clock, index) => ({
				id: `pilot-${pilot.id}-${clock.id || index}`, type: `Pilot Project // ${pilot.callsign}`,
				name: clock.title, description: clock.description, value: clock.progress, max: clock.segments, color: "#3CB043",
			})));
			return mergeEntries([...this.defaultClocks, ...pilotClocks], this.edits.clocks ?? [], "id");
		},
		reserves() {
			const pilotReserves = this.pilots.flatMap(pilot => (pilot.reserves ?? []).map((reserve, index) => ({
				...reserve, id: `pilot-${pilot.id}-${reserve.id || index}`, callsign: pilot.callsign.toUpperCase(),
			})));
			return mergeEntries([...this.defaultReserves, ...pilotReserves], this.edits.reserves ?? [], "id");
		},
		missions() {
			return mergeEntries(this.defaultMissions, this.edits.missions, "slug")
				.filter(entry => this.canEditBriefings || !entry.hidden)
				.sort((a, b) => Number(b.slug) - Number(a.slug));
		},
		events() {
			return mergeEntries(this.defaultEvents, this.edits.events, "id")
				.filter(entry => this.canEditBriefings || !entry.hidden);
		},
		planetBriefing() {
			return this.edits.planetBriefing ?? cressidiumBriefing;
		},
		artwork() {
			const planetPath = this.edits.planetTexture;
			const portraits = Object.entries(this.edits.poiPortraits ?? {});
			return {
				editable: typeof this.briefingStore?.pickImage === "function",
				busy: this.artworkBusy,
				error: this.artworkError,
				customPlanetTexture: Boolean(planetPath),
				planetTexture: planetPath ? this.briefingStore.imageUrl(planetPath) : publicAssetUrl("/planets/cressidium.png"),
				portraits: Object.fromEntries(portraits.map(([id, path]) => [id, this.briefingStore.imageUrl(path)])),
				change: this.changeArtwork,
			};
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
	if (this.briefingStore) this.briefingStore.notifyChanges = changes => Object.assign(this.edits, changes);
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
		listFoundryPilots() {
			const actors = this.briefingStore.listPilots();
			const missing = (this.edits.pilotRoster ?? []).filter(link => !actors.some(actor => actor.id === link.actorId));
			return [...actors, ...missing.map(({ pilot }) => ({ id: pilot.actorId, name: pilot.name, callsign: pilot.callsign, missing: true }))];
		},
		async publishPilot(actorId, unlink = false) {
			this.edits = await this.briefingStore.save("pilotRoster", { actorId, unlink });
		},
		async changeArtwork(poiId = null, reset = false) {
			if (!this.artwork.editable || this.artworkBusy) return;
			const previous = (poiId ? this.edits.poiPortraits?.[poiId] : this.edits.planetTexture) ?? null;
			this.artworkError = null;
			this.artworkBusy = true;
			try {
				const path = reset ? null : await this.briefingStore.pickImage(previous ?? "");
				if (!reset && (!path || path === previous)) return;
				if (path) {
					const image = new Image();
					if (!poiId) image.crossOrigin = "anonymous";
					image.src = this.briefingStore.imageUrl(path);
					try {
						await image.decode();
					} catch {
						throw new Error("The selected image could not be loaded.");
					}
				}
				this.edits = await this.briefingStore.save("artwork", { poiId, path }, previous);
			} catch (error) {
				this.artworkError = { poiId, message: error.message };
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
			this.editor = { collection, entry, previous };
		},
		openPilotRemoval(pilot) {
			if (this.pilotSync) this.editor = { collection: "pilotRoster", entry: pilot };
		},
		async saveBriefingEntry(entry) {
			const { collection, entry: original } = this.editor;
			let previous = this.editor.previous;
			if (collection === "missions" && !original) {
				const deleted = this.findEntryEdit(collection, entry);
				if (deleted?.deleted) previous = deleted;
			}
			this.edits = await this.briefingStore.save(collection, entry, previous);
		},
		async deleteBriefingEntry() {
			const { collection, entry, previous } = this.editor;
			if (collection === "pilotRoster") {
				this.edits = await this.briefingStore.save(collection, {
					actorId: entry.actorId, callsign: entry.callsign, removeFromBriefing: true,
				});
				return;
			}
			const key = collection === "missions" ? "slug" : "id";
			this.edits = await this.briefingStore.save(collection, { [key]: entry[key], deleted: true }, previous);
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
