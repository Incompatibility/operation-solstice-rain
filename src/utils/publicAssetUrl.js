const assetBase = import.meta.env.MODE === "foundry" ? import.meta.env.BASE_URL : "/";

// Content files store local public paths from the site root. External URLs pass through.
export function publicAssetUrl(path) {
	if (!path?.startsWith("/") || path.startsWith("//")) return path;
	return `${assetBase}${path.slice(1)}`;
}
