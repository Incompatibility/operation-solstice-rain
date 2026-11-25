import { readFileSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL("./module.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));

export const moduleOutDir = `dist-foundry/${manifest.id}`;

const notices = {
	"big-shoulders-display": "@fontsource/big-shoulders-display/LICENSE",
	inconsolata: "@fontsource/inconsolata/LICENSE",
	raleway: "@fontsource/raleway/LICENSE",
	roboto: "@fontsource/roboto/LICENSE",
	"titillium-web": "@fontsource/titillium-web/LICENSE",
	"material-design-icons": "@mdi/font/LICENSE",
	three: "three/LICENSE",
};

export function packageModule() {
	return {
		name: "package-foundry-module",
		async writeBundle({ dir }) {
			const licenseDir = join(dir, "licenses");
			await mkdir(licenseDir, { recursive: true });
			await Promise.all([
				copyFile(manifestUrl, join(dir, "module.json")),
				...[...manifest.esmodules, ...manifest.styles, "pilot-roster.mjs"].map(file =>
					copyFile(new URL(file, manifestUrl), join(dir, file))
				),
				...[manifest.license, manifest.readme, "AGENTS.md"].map(file =>
					copyFile(new URL(file, root), join(dir, file))
				),
				copyFile(new URL("src/assets/scripts/VANTA-LICENSE.txt", root), join(licenseDir, "vanta.txt")),
				...Object.entries(notices).map(([name, file]) =>
					copyFile(new URL(`node_modules/${file}`, root), join(licenseDir, `${name}.txt`))
				),
			]);
		},
	};
}
