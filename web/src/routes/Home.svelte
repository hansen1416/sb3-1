<script>
	import { onDestroy, onMount } from "svelte";
	import { Quaternion, Vector3 } from "three";
	// @ts-ignore
	// import { cloneDeep } from "lodash";

	import ThreeScene from "../lib/ThreeScene";
	import RapierWorld from "../lib/RapierWorld";
	import SceneManager from "../lib/SceneManager";

	/**
	 * what do I need?
	 *
	 * class to build the scene, add objects
	 * 		this class will need ThreeScene and PhysicsWorld
	 * 		how does it handle moving object?
	 *
	 * class to map the joints to character rotations, only uppder body
	 * 		this class take model bones and pose3d as parameter
	 *
	 * class to record and watch a series of joints positions, only hands for now
	 * 		this class take pose3d as pamameter
	 * 		it determine toss and running
	 * 		how to pass the result to character and world?
	 *
	 * class to watch the pose, do running, defend and toss
	 * 		this class take model bones and pose3d as parameter
	 * 		how does it pass result to world?
	 *
	 *
	 * Factory Pattern:
	 * Use the factory pattern to create instances of game objects, such as items and characters.
	 * This will allow you to easily create new instances with different configurations without having to modify the constructor functions.
	 *
	 * Singleton Pattern:
	 * If you have any components that should only have a single instance throughout the game,
	 * such as a game manager or a resource manager,
	 * use the singleton pattern to ensure that only one instance is created.
	 *
	 * Observer Pattern:
	 * Use the observer pattern to handle user pose events and interactions between the player's model and the objects in the 3D scene.
	 * This pattern allows you to decouple the event source (user pose) from the event listeners (player's model and game objects),
	 * making it easier to add, remove,
	 * or modify event listeners without affecting the event source.
	 *
	 * use Observer for Architect
	 */

	/** @type {ThreeScene} */
	let threeScene;
	/** @type {RapierWorld} */
	let physicsWorld;
	/** @type {SceneManager} */
	let sceneManager;

	let canvas;

	let assetReady = false,
		animationPointer;

	let ballMesh;

	const sceneWidth = document.documentElement.clientWidth;
	const sceneHeight = document.documentElement.clientHeight;

	onMount(() => {
		threeScene = new ThreeScene(canvas, sceneWidth, sceneHeight);
		/** @ts-ignore */
		// threeScene.camera.position.set(0, 2000, 2000);

		Promise.all([import("@dimforge/rapier3d")]).then(([RAPIER]) => {
			physicsWorld = new RapierWorld(RAPIER);

			sceneManager = new SceneManager(threeScene, physicsWorld);

			const size = 10;

			sceneManager.addBoard(
				size,
				new Vector3(size / 2, 0, 0),
				new Quaternion().setFromAxisAngle(
					new Vector3(0, 0, 1),
					Math.PI / 2
				),
				0x0000ff
			);

			sceneManager.addBoard(
				size,
				new Vector3(0, 0, -size / 2),
				new Quaternion().setFromAxisAngle(
					new Vector3(1, 0, 0),
					Math.PI / 2
				),
				0x0000ff
			);

			sceneManager.addBoard(
				size,
				new Vector3(size / -2, 0, 0),
				new Quaternion().setFromAxisAngle(
					new Vector3(0, 0, 1),
					-Math.PI / 2
				),
				0x0000ff
			);

			sceneManager.addBoard(
				size,
				new Vector3(0, size / 2, 0),
				new Quaternion(),
				0x0000ff
			);

			sceneManager.addBoard(
				size,
				new Vector3(0, size / -2, 0),
				new Quaternion().setFromAxisAngle(
					new Vector3(0, 0, 1),
					Math.PI
				),
				0x0000ff
			);

			ballMesh = sceneManager.addBall();

			assetReady = true;
		});
	});

	onDestroy(() => {
		cancelAnimationFrame(animationPointer);
	});

	// when mannequin, model and camera are erady, start animation loop
	$: if (assetReady) {
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

		if (ballMesh.position.z > 5) {
			// todo, ball is out of box, clear its mesh and rigid body
			threeScene.clearBallMesh(ballMesh);
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
