<script>
	import { onDestroy, onMount } from "svelte";
	import { Quaternion, Vector3 } from "three";
	// @ts-ignore
	// import { cloneDeep } from "lodash";

	import ThreeScene from "../lib/ThreeScene";
	import RapierWorld from "../lib/RapierWorld";
	import SceneManager from "../lib/SceneManager";

	/** @type {ThreeScene} */
	let threeScene;
	/** @type {RapierWorld} */
	let physicsWorld;
	/** @type {SceneManager} */
	let sceneManager;

	let canvas;

	let assetReady = false,
		wssReady = false,
		animationPointer;

	let ballUUID;

	let wss;

	const sceneWidth = document.documentElement.clientWidth;
	const sceneHeight = document.documentElement.clientHeight;

	onMount(() => {
		threeScene = new ThreeScene(canvas, sceneWidth, sceneHeight);
		/** @ts-ignore */
		// threeScene.camera.position.set(0, 2000, 2000);

		Promise.all([import("@dimforge/rapier3d")]).then(([RAPIER]) => {
			physicsWorld = new RapierWorld(RAPIER);

			sceneManager = new SceneManager(threeScene, physicsWorld);
			// a box with one side empty
			sceneManager.addBox(10);
			// bounce board to catch the ball
			sceneManager.addBounceBoard();
			// ball gets recycled when its out of the box range
			ballUUID = sceneManager.addBall();

			window.addEventListener("keydown", (e) => {
				sceneManager.moveBounceBoard(e.key);
			});

			// create a new WebSocket object
			wss = new WebSocket(
				"ws://" + import.meta.env.VITE_WS_HOST + ":5174"
			);

			// handle the open event
			wss.addEventListener("open", function (event) {
				console.log("WebSocket connection established");
				wssReady = true;
			});

			// handle the message event
			wss.addEventListener("message", function (event) {
				console.log("WebSocket message received:", event.data);
			});

			// handle the close event
			wss.addEventListener("close", function (event) {
				console.log("WebSocket connection closed");
			});

			// handle the error event
			wss.addEventListener("error", function (event) {
				console.error("WebSocket error:", event);
			});

			assetReady = true;
		});
	});

	onDestroy(() => {
		cancelAnimationFrame(animationPointer);

		if (wss) {
			wss.close();
		}
	});

	// when mannequin, model and camera are erady, start animation loop
	$: if (assetReady && wssReady) {
		animate();
		// set player pos, camera pos, control target
		// we need the animation to update at least once to let raycasting work
		// playerController.initPLayerPos({ x: 0, z: 0 });
	}

	function animate() {
		// update physics world and threejs renderer
		physicsWorld.onFrameUpdate();
		threeScene.onFrameUpdate();

		sceneManager.onFrameUpdate();

		if (
			sceneManager.item_meshes[ballUUID] &&
			// @ts-ignore
			sceneManager.item_meshes[ballUUID].position.z > 6
		) {
			// todo, ball is out of box, clear its mesh and rigid body
			sceneManager.clearBall(ballUUID);

			// ballUUID = sceneManager.addBall();
		}

		// todo, send the Observation to stablebaseline3

		animationPointer = requestAnimationFrame(animate);
	}
</script>

<div class="bg">
	<canvas bind:this={canvas} />

	<div class="controls">
		<div>
			<button
				on:click={() => {
					threeScene.resetControl();
				}}>Reset Control</button
			>
		</div>
	</div>
</div>

<style>
	.bg {
		background-color: #0c0228;
	}

	.controls {
		position: absolute;
		bottom: 10px;
		right: 10px;
	}

	.controls button {
		padding: 2px 4px;
		font-size: 18px;
		text-transform: capitalize;
	}
</style>
