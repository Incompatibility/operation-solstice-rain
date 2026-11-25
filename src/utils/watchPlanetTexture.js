import { SRGBColorSpace, TextureLoader } from "three";
import { watch } from "vue";

export function watchPlanetTexture(url, material, { onStart, onLoad, onError }) {
	const loader = new TextureLoader();
	const stop = watch(url, (path, _previous, onCleanup) => {
		let active = true;
		onStart?.();
		const pending = loader.load(path, texture => {
			if (!active) return;
			material.map?.dispose();
			material.map = texture;
			material.needsUpdate = true;
			onLoad();
		}, undefined, error => {
			if (active) onError(error);
		});
		pending.colorSpace = SRGBColorSpace;
		onCleanup(() => {
			active = false;
			if (pending !== material.map) pending.dispose();
		});
	}, { immediate: true });
	return () => {
		stop();
		material.map?.dispose();
	};
}
