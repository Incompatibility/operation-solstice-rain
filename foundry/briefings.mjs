import { snapshotPilot } from "./pilot-roster.mjs";

const MODULE_ID = "lancer-briefings";
const TITLE = "Lancer Briefings";
const CONTENT_SETTING = "contentEdits";
const briefingUrl = new URL("./index.html", import.meta.url);
const { ApplicationV2 } = foundry.applications.api;
const { FilePicker } = foundry.applications.apps;

Hooks.once("init", () => {
	game.settings.register(MODULE_ID, CONTENT_SETTING, {
		scope: "world",
		config: false,
		type: Object,
		default: { missions: [], events: [], planetBriefing: null },
		onChange: value => {
			const frame = briefing?.rendered && briefing.element.querySelector("iframe");
			if (!frame?.briefingStore?.notifyChanges) return;
			const changes = {
				pilotRoster: value?.pilotRoster ?? [],
				removedBundledPilots: value?.removedBundledPilots ?? [],
			};
			if (!game.user.isGM) changes.missions = playerMissions(value?.missions ?? []);
			frame.briefingStore.notifyChanges(foundry.utils.deepClone(changes));
		},
	});
});

function readEdits() {
	return foundry.utils.deepClone(game.settings.get(MODULE_ID, CONTENT_SETTING));
}

function playerMissions(missions) {
	return missions.map(entry => entry.hidden ? { slug: entry.slug, hidden: true } : entry);
}

function readPlayerEdits() {
	const edits = readEdits();
	edits.missions = playerMissions(edits.missions);
	edits.events = edits.events.map(entry => entry.hidden ? { id: entry.id, hidden: true } : entry);
	return edits;
}

function checkPrevious(current, previous) {
	if (JSON.stringify(current ?? null) !== JSON.stringify(previous)) {
		throw new Error("This entry changed since you opened it. Reopen the briefing to load the latest version.");
	}
}

let pendingSave = Promise.resolve();

function saveEntry(collection, draft, previous) {
	const save = pendingSave.then(() => commitEntry(collection, draft, previous));
	pendingSave = save.catch(() => {});
	return save;
}

async function commitEntry(collection, draft, previous) {
	if (!game.user.isGM) throw new Error("Only a GM can save briefing content.");
	const edits = readEdits();
	if (collection === "planet") {
		checkPrevious(edits.planetBriefing, previous);
		edits.planetBriefing = draft.content;
	} else if (collection === "header") {
		checkPrevious(edits.header, previous);
		edits.header = draft;
	} else if (collection === "pilotRoster") {
		const links = edits.pilotRoster ?? [];
		const previousLink = links.find(link => link.actorId === draft.actorId);
		if (draft.unlink || draft.removeFromBriefing) {
			edits.pilotRoster = links.filter(link => link.actorId !== draft.actorId);
			if (draft.removeFromBriefing) {
				const callsign = previousLink?.replaces ?? draft.callsign.toUpperCase();
				edits.removedBundledPilots = [...new Set([...(edits.removedBundledPilots ?? []), callsign])];
			}
			return saveWorldEdits(edits);
		}
		if (draft.refreshOnly && !previousLink) return edits;
		const actor = game.actors.get(draft.actorId);
		if (actor?.type !== "pilot") throw new Error("Select a LANCER pilot actor.");
		const pilot = snapshotPilot(actor);
		const replaces = previousLink?.replaces ?? pilot.callsign.toUpperCase();
		const link = { actorId: actor.id, replaces, pilot };
		edits.pilotRoster = previousLink
			? links.map(item => item.actorId === actor.id ? link : item)
			: [...links, link];
	} else if (collection === "artwork") {
		if (draft.poiId) {
			const portraits = edits.poiPortraits ?? {};
			checkPrevious(Object.hasOwn(portraits, draft.poiId) ? portraits[draft.poiId] : null, previous);
			edits.poiPortraits = { ...portraits, [draft.poiId]: draft.path };
			if (draft.path === null) delete edits.poiPortraits[draft.poiId];
		} else {
			checkPrevious(edits.planetTexture, previous);
			edits.planetTexture = draft.path;
		}
	} else {
		if (!["missions", "events", "clocks", "reserves"].includes(collection)) throw new Error("Unknown briefing section.");
		const key = collection === "missions" ? "slug" : "id";
		const entry = key === "id" && !draft.id
			? { ...draft, id: foundry.utils.randomID() }
			: draft;
		const entries = edits[collection] ??= [];
		const index = entries.findIndex(item => item[key] === entry[key]);
		checkPrevious(entries[index], previous);
		if (index === -1) entries.unshift(entry);
		else entries[index] = entry;
	}

	return saveWorldEdits(edits);
}

async function saveWorldEdits(edits) {
	try {
		return await game.settings.set(MODULE_ID, CONTENT_SETTING, edits);
	} catch (error) {
		console.error(`${TITLE} could not save world content.`, error);
		throw new Error("Foundry could not save the change. Please try again.");
	}
}

function imageUrl(path) {
	if (/^(https?:)?\/\//i.test(path)) return path;
	return foundry.utils.getRoute(path);
}

function listPilots() {
	if (!game.user.isGM) return [];
	return game.actors.filter(actor => actor.type === "pilot")
		.map(actor => ({ id: actor.id, name: actor.name, callsign: actor.system.callsign }));
}

function openPilotSheet(id) {
	const actor = game.actors.get(id);
	if (game.user.isGM && actor?.type === "pilot") actor.sheet.render(true);
}

Hooks.on("updateActor", (actor, changes) => {
	if (actor.type !== "pilot" || game.users.activeGM?.id !== game.user.id) return;
	if (!foundry.utils.getProperty(changes, "system.last_cloud_update") && !changes["system.last_cloud_update"]) return;
	if (!readEdits().pilotRoster?.some(link => link.actorId === actor.id)) return;
	saveEntry("pilotRoster", { actorId: actor.id, refreshOnly: true }).catch(error => ui.notifications.error(error.message));
});

function pickImage(current) {
	return new Promise((resolve, reject) => {
		if (!game.user.isGM || !game.user.can("FILES_BROWSE")) {
			reject(new Error("Foundry file browsing permission is required."));
			return;
		}
		const picker = new FilePicker.implementation({ type: "image", current, callback: resolve });
		picker.addEventListener("close", () => resolve(null), { once: true });
		picker.browse().catch(reject);
	});
}

class BriefingsWindow extends ApplicationV2 {
	static DEFAULT_OPTIONS = {
		id: MODULE_ID,
		classes: [MODULE_ID],
		window: { title: TITLE, icon: "fa-solid fa-clipboard-list", resizable: true },
		position: { width: 1200, height: 800 },
	};

	async _renderHTML() {
		const frame = document.createElement("iframe");
		frame.title = TITLE;
		frame.allow = "autoplay";
		frame.briefingStore = game.user.isGM
			? { read: readEdits, save: saveEntry, pickImage, imageUrl, listPilots, openPilotSheet }
			: { read: readPlayerEdits, imageUrl };
		frame.src = briefingUrl.href;
		return frame;
	}

	_replaceHTML(frame, content) {
		content.replaceChildren(frame);
	}
}

let briefing;

async function openBriefings() {
	briefing ??= new BriefingsWindow();
	if (!briefing.rendered) {
		await briefing.render({ force: true });
		return;
	}
	if (briefing.minimized) await briefing.maximize();
	briefing.bringToFront();
}

Hooks.on("getSceneControlButtons", controls => {
	const tools = controls.tokens?.tools;
	if (!tools) return;

	tools[MODULE_ID] = {
		name: MODULE_ID,
		title: TITLE,
		icon: "fa-solid fa-clipboard-list",
		order: Object.keys(tools).length,
		button: true,
		visible: true,
		onChange: openBriefings,
	};
});
