import { snapshotPilot } from "./pilot-roster.mjs";

const MODULE_ID = "lancer-briefings";
const TITLE = "Lancer Briefings";
const CONTENT_SETTING = "contentEdits";
const FIRST_OPERATION_ID = "solstice-rain";
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
			frame.briefingStore.notifyChanges(briefingState(value));
		},
	});
});

function worldState(value = game.settings.get(MODULE_ID, CONTENT_SETTING)) {
	const stored = foundry.utils.deepClone(value);
	if (stored.operations) return stored;
	return {
		activeOperationId: FIRST_OPERATION_ID,
		operations: [{ id: FIRST_OPERATION_ID, bundled: true, content: stored }],
	};
}

function playerEntries(entries, key = "id") {
	return entries.map(entry => entry.hidden ? { [key]: entry[key], hidden: true } : entry);
}

function briefingState(value) {
	const state = worldState(value);
	if (!game.user.isGM) {
		for (const operation of state.operations) {
			const { content } = operation;
			content.missions = playerEntries(content.missions ?? [], "slug");
			content.events = playerEntries(content.events ?? []);
			content.pois = playerEntries(content.pois ?? []);
			delete operation.resume;
		}
	}
	return state;
}

function checkPrevious(current, previous) {
	if (JSON.stringify(current ?? null) !== JSON.stringify(previous)) {
		throw new Error("This entry changed since you opened it. Reopen the briefing to load the latest version.");
	}
}

let pendingSave = Promise.resolve();

function saveEntry(collection, draft, previous, operationId) {
	const save = pendingSave.then(() => commitEntry(collection, draft, previous, operationId));
	pendingSave = save.catch(() => {});
	return save;
}

async function commitEntry(collection, draft, previous, operationId) {
	if (!game.user.isGM) throw new Error("Only a GM can save briefing content.");
	const state = worldState();
	if (operationId !== state.activeOperationId) {
		if (collection === "pilotRoster" && draft.refreshOnly) return state;
		throw new Error("The active operation changed. Reopen the editor to make your changes in the new operation.");
	}
	const operation = state.operations.find(entry => entry.id === operationId);
	const edits = operation.content;
	if (collection === "operation" || collection === "switchOperation") {
		checkPrevious(edits, previous);
		let next;
		if (collection === "switchOperation") {
			next = state.operations.find(entry => entry.id === draft.targetId);
			if (!next?.archivedAt || next.archivedAt !== draft.archivedAt) {
				throw new Error("The selected archive changed. Reopen Switch active and choose an operation again.");
			}
			next.content = draft.restored;
			delete next.archivedAt;
			delete next.resume;
		} else {
			const name = draft.name.trim();
			if (!name) throw new Error("Enter a name for the operation.");
			const { headerTitle, headerSubtitle, icon, theme } = draft.snapshot.header;
			next = {
				id: foundry.utils.randomID(),
				name,
				content: {
					header: { headerTitle, headerSubtitle, icon, theme, subheaderTitle: name, planet: draft.planet },
					pilotRoster: edits.pilotRoster ?? [],
					removedBundledPilots: edits.removedBundledPilots ?? [],
					bundledPilots: draft.resume.bundledPilots,
				},
			};
		}
		operation.content = draft.snapshot;
		operation.name = draft.archiveName;
		operation.bundled = false;
		operation.archivedAt = new Date().toISOString();
		operation.resume = draft.resume;
		state.operations = [next, ...state.operations.filter(entry => entry.id !== next.id)];
		state.activeOperationId = next.id;
	} else if (collection === "planet") {
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
			return saveWorldState(state);
		}
		if (draft.refreshOnly && !previousLink) return state;
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
			if (edits.pois?.some(entry => entry.id === draft.poiId && entry.deleted)) {
				throw new Error("This POI was deleted while the File Picker was open.");
			}
			const portraits = edits.poiPortraits ?? {};
			checkPrevious(Object.hasOwn(portraits, draft.poiId) ? portraits[draft.poiId] : null, previous);
			edits.poiPortraits = { ...portraits, [draft.poiId]: draft.path };
			if (draft.path === null) delete edits.poiPortraits[draft.poiId];
		} else {
			checkPrevious(edits.planetTexture, previous);
			edits.planetTexture = draft.path;
		}
	} else {
		if (!["missions", "events", "clocks", "reserves", "pois"].includes(collection)) throw new Error("Unknown briefing section.");
		const key = collection === "missions" ? "slug" : "id";
		const entry = key === "id" && !draft.id
			? { ...draft, id: foundry.utils.randomID() }
			: draft;
		const entries = edits[collection] ??= [];
		const index = entries.findIndex(item => item[key] === entry[key]);
		checkPrevious(entries[index], previous);
		if (index === -1) entries.unshift(entry);
		else entries[index] = entry;
		if (collection === "pois" && entry.deleted && edits.poiPortraits) delete edits.poiPortraits[entry.id];
	}

	return saveWorldState(state);
}

async function saveWorldState(state) {
	try {
		return await game.settings.set(MODULE_ID, CONTENT_SETTING, state);
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
	const { activeOperationId, operations } = worldState();
	const active = operations.find(operation => operation.id === activeOperationId);
	if (!active.content.pilotRoster?.some(link => link.actorId === actor.id)) return;
	saveEntry("pilotRoster", { actorId: actor.id, refreshOnly: true }, null, activeOperationId)
		.catch(error => ui.notifications.error(error.message));
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
			? { read: briefingState, save: saveEntry, pickImage, imageUrl, listPilots, openPilotSheet }
			: { read: briefingState, imageUrl };
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
