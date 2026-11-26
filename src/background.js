import * as THREE from "three";
import "@/assets/scripts/vanta.globe.min.js";

try {
	window.VANTA.GLOBE({
		THREE,
		el: document.body,
		mouseControls: false,
		touchControls: false,
		gyroControls: false,
		minHeight: 200,
		minWidth: 200,
		scale: 1,
		scaleMobile: 1,
		color: 0x694f5d,
		color2: 0x68a691,
		backgroundColor: 0x0c090d,
		backgroundAlpha: 0,
		size: 2,
		sphereRotation: -0.002,
		meshRotation: 0.004,
	});
} catch (error) {
	console.warn("Animated briefing background unavailable:", error);
} finally {
	// Vanta sets an inline fallback color when WebGL is unavailable.
	document.body.style.removeProperty("background");
}
