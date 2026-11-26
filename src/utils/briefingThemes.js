import Config from "@/assets/info/general-config.json";

export const briefingThemes = {
	union: "Union Red",
	cobalt: "Cobalt Blue",
	emerald: "Emerald Green",
	amber: "Amber Gold",
};

export function briefingTheme(value) {
	if (Object.hasOwn(briefingThemes, value)) return value;
	return Object.hasOwn(briefingThemes, Config.theme) ? Config.theme : "union";
}
