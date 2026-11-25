function plainText(html) {
	const fragment = document.createElement("template");
	fragment.innerHTML = typeof html === "string" ? html : "";
	return fragment.content.textContent.trim();
}

function itemRecord(item) {
	return { id: item.system.lid || item.id, name: item.name, rank: item.system.curr_rank ?? item.system.rank ?? 1,
		source: item.system.source?.name ?? (typeof item.system.source === "string" ? item.system.source : "") };
}

function mechRecord(actor) {
	const loadout = actor.system.loadout;
	const frame = loadout?.frame?.value;
	return {
		id: actor.id,
		name: actor.name,
		frame: frame?.system.lid,
		frame_name: frame?.name ?? "Unassigned frame",
		frame_description: plainText(frame?.system.description),
		manufacturer: frame?.system.source?.name ?? "",
		portrait: actor.img,
		active_loadout_index: 0,
		loadouts: [{
			mounts: (loadout?.weapon_mounts ?? []).map(mount => ({
				mount_type: mount.type,
				slots: mount.slots.map(slot => ({ weapon: slot.weapon?.value ? itemRecord(slot.weapon.value) : null })),
			})),
			systems: (loadout?.systems ?? []).flatMap(reference => reference?.value ? [itemRecord(reference.value)] : []),
		}],
	};
}

export function snapshotPilot(actor) {
	const system = actor.system;
	const items = actor.itemTypes;
	const mechs = game.actors.filter(mech => mech.type === "mech" && mech.system.pilot?.value?.id === actor.id);
	return {
		id: actor.id,
		actorId: actor.id,
		name: actor.name,
		callsign: system.callsign?.trim() || actor.name,
		portrait: actor.img,
		background: plainText(system.background),
		history: plainText(system.history),
		text_appearance: plainText(system.text_appearance),
		level: system.level,
		mechSkills: [system.hull, system.agi, system.sys, system.eng],
		lastModified: new Date(actor._stats.modifiedTime ?? Date.now()).toISOString(),
		skills: (items.skill ?? []).map(itemRecord),
		talents: (items.talent ?? []).map(itemRecord),
		licenses: (items.license ?? []).map(itemRecord),
		state: { active_mech_id: system.active_mech?.value?.id },
		mechs: mechs.map(mechRecord),
		clocks: (system.bond_state?.clocks ?? []).map(clock => ({
			id: clock.lid, title: clock.name, segments: clock.max, progress: clock.value, description: "",
		})),
		reserves: (items.reserve ?? []).map(item => ({
			id: item.system.lid || item.id, type: item.system.type || "RESERVE", name: item.name, description: plainText(item.system.description),
		})),
	};
}
