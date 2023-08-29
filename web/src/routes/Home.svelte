<script>
	import { onDestroy, onMount } from "svelte";
	import { Quaternion, Vector3 } from "three";
	// @ts-ignore
	// import { cloneDeep } from "lodash";

	import { roundToTwo } from "../utils/ropes";
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

	let wss;
	// when call hit bounce board, reward+=1
	let reward = 0;
	let dropout = 0;
	let bonus_reward = 0;

	let reset_threshold = 20;
	// when message received from stablebaseline3, set received_action to true
	// and send observation data back to stablebaseline3
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

			sceneManager.buildScene();

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
				// the action could be "a", "d", "w", "s" or do nothing
				if (
					event.data === "a" ||
					event.data === "d" ||
					event.data === "w" ||
					event.data === "s"
				) {
					// make move punishable
					reward -= 0.01;

					sceneManager.moveBounceBoard(event.data);
				}

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

		let done = 0;
		// let ball_vel = { x: 0, y: 0, z: 0 };
		// let ball_pos = { x: 0, y: 0, z: 0 };
		// let board_pos = { x: 0, y: 0, z: 0 };

		// this statement shall always be true
		// if (sceneManager.item_rigid[ballUUID]) {

		// when ball hit the bounce board, update reward
		physicsWorld.ballHitBoard(() => {
			// when board catch the ball, reward up, make it bigger to see if it learn better
			reward += 3;
		});

		const ball_pos = physicsWorld.getBallPosition();

		if (
			// @ts-ignore
			ball_pos.z > 0
		) {
			// reset env
			//  ball is out of box, clear its mesh and rigid body
			sceneManager.renewBall();

			dropout += 1;
			// when board catch the ball, reward down
			reward -= 1;
		}
		// }

		if (dropout > reset_threshold) {
			// ball is out of box, clear its mesh and rigid body
			dropout = 0;

			reward = 0;
			// reset env
			done = 1;

			sceneManager.resetBounceBoard();
		}

		const board_pos = physicsWorld.getBounceBoardPosition();

		bonus_reward =
			Math.max(
				0,
				15 -
					Math.sqrt(
						(ball_pos.x - board_pos.x) ** 2 +
							(ball_pos.y - board_pos.y) ** 2
					)
			) / 10;

		if (received_action) {
			assembleObservation();
			// send the Observation to stablebaseline3 env
			wss.send(
				JSON.stringify({
					observation: assembleObservation(),
					reward: reward + bonus_reward,
					done: done,
				})
			);

			received_action = false;
		}

		animationPointer = requestAnimationFrame(animate);
	}

	function assembleObservation() {
		let ball_vel = physicsWorld.getBallVelocity();
		let ball_pos = physicsWorld.getBallPosition();
		let board_pos = physicsWorld.getBounceBoardPosition();

		ball_vel = new Vector3(ball_vel.x, ball_vel.y, ball_vel.z).normalize();
		ball_pos = new Vector3(ball_pos.x, ball_pos.y, ball_pos.z).normalize();
		board_pos = new Vector3(
			board_pos.x,
			board_pos.y,
			board_pos.z
		).normalize();

		return [
			ball_vel.x,
			ball_vel.y,
			ball_vel.z,
			ball_pos.x,
			ball_pos.y,
			ball_pos.z,
			board_pos.x,
			board_pos.y,
			// board_pos.z,
		];
	}
</script>

<div class="bg">
	<canvas bind:this={canvas} />

	<div class="controls">
		<div>
			<span class="score">{reward}</span>
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

	.controls .score {
		color: azure;
		font-size: 30px;
	}

	.controls button {
		padding: 2px 4px;
		font-size: 18px;
		text-transform: capitalize;
	}
</style>
