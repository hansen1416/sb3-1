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

	let reward = 0;

	let received_action = false;

	const sceneWidth = document.documentElement.clientWidth;
	const sceneHeight = document.documentElement.clientHeight;

	onMount(() => {
		threeScene = new ThreeScene(canvas, sceneWidth, sceneHeight);
		/** @ts-ignore */
		// threeScene.camera.position.set(0, 2000, 2000);

		Promise.all([import("@dimforge/rapier3d")]).then(([RAPIER]) => {
			physicsWorld = new RapierWorld(RAPIER);

			sceneManager = new SceneManager(threeScene, physicsWorld);

			ballUUID = sceneManager.buildScene();

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
				// console.log("WebSocket message received:", event.data);
				sceneManager.moveBounceBoard(event.data);

				received_action = true;
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

	function onBallHitBounceBoard() {
		// console.log("onBallHitBounceBoard");
		// todo, send the Observation to stablebaseline3
		reward += 1;
	}

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
		// sync rigid body and threejs mesh
		sceneManager.onFrameUpdate();

		if (received_action) {
			let done = 0;
			let ball_vel = { x: 0, y: 0, z: 0 };
			let ball_pos = { x: 0, y: 0, z: 0 };
			let board_pos = { x: 0, y: 0, z: 0 };

			if (sceneManager.item_rigid[ballUUID]) {
				// when ball hit the bounce board, update reward
				physicsWorld.ballHitBoard(onBallHitBounceBoard);

				// todo, send the Observation to stablebaseline3
				// console.log(
				// 	reward,
				// 	physicsWorld.getBallVelocity(),
				// 	physicsWorld.getBallPosition(),
				// 	physicsWorld.getBounceBoardPosition()
				// );

				ball_vel = physicsWorld.getBallVelocity();
				ball_pos = physicsWorld.getBallPosition();
				board_pos = physicsWorld.getBounceBoardPosition();

				if (
					// @ts-ignore
					sceneManager.item_rigid[ballUUID].translation().z > 6
				) {
					// reset env
					//  ball is out of box, clear its mesh and rigid body
					sceneManager.clearBall(ballUUID);

					ballUUID = sceneManager.addBall();

					reward = 0;

					done = 1;
				}
			}

			// send observations
			wss.send(
				JSON.stringify({
					observation: [
						ball_vel.x,
						ball_vel.y,
						ball_vel.z,
						ball_pos.x,
						ball_pos.y,
						ball_pos.z,
						board_pos.x,
						board_pos.y,
						board_pos.z,
					],
					reward: reward,
					done: done,
				})
			);

			received_action = false;
		}

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
