export function mergeEntries(defaults, edits, key) {
	const overrides = new Map(edits.map(entry => [entry[key], entry]));
	const entries = defaults.map(entry => {
		const updated = overrides.get(entry[key]) ?? entry;
		overrides.delete(entry[key]);
		return updated;
	});
	return [...overrides.values(), ...entries].filter(entry => !entry.deleted);
}
