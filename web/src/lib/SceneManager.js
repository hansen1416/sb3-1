import * as THREE from "three";
import { Vector3, Mesh } from "three";
import ThreeScene from "./ThreeScene";
import RapierWorld from "./RapierWorld";

let instance;

export default class SceneManager {
	/**
	 * @type {{[key: string]: Mesh}}
	 */
	item_meshes = {};

	/**
	 * @type {{[key: string]: import("./RapierWorld").RigidBody}}
	 */
	item_rigid = {};

	/**
	 * @type {{[key: string]: import("./RapierWorld").Collider}}
	 * @description this is a reference to the collider, so we can remove it from the physics world
	 * when we remove the rigid body
	 * @see {@link https://www.npmjs.com/package/@dimforge/rapier3d#colliders}
	 */
	item_collider = {};

	/**
	 * @type {import("./RapierWorld").RigidBody}
	 */
	bounce_board;

	/**
	 *
	 * @param {ThreeScene} renderer
	 * @param {RapierWorld} physics
	 */
	constructor(renderer, physics) {
		if (instance) {
			return instance;
		} else {
			instance = this;
		}

		this.renderer = renderer;
		this.physics = physics;
	}

	onFrameUpdate() {
		for (let k in this.item_rigid) {
			const t = this.item_rigid[k].translation();
			this.item_meshes[k].position.set(t.x, t.y, t.z);

			const r = this.item_rigid[k].rotation();
			this.item_meshes[k].setRotationFromQuaternion(
				new THREE.Quaternion(r.x, r.y, r.z, r.w)
			);
		}

		if (import.meta.env.DEV) {
			if (!this.lines) {
				let material = new THREE.LineBasicMaterial({
					color: 0xffffff,
				});
				let geometry = new THREE.BufferGeometry();
				this.lines = new THREE.LineSegments(geometry, material);
				this.renderer.scene.add(this.lines);
			}

			let buffers = this.physics.world.debugRender();
			this.lines.geometry.setAttribute(
				"position",
				new THREE.BufferAttribute(buffers.vertices, 3)
			);
			this.lines.geometry.setAttribute(
				"color",
				new THREE.BufferAttribute(buffers.colors, 4)
			);
		}
	}

	/**
	 * create a plane, with a rigid body, collider, and mesh
	 *
	 * @param {number} size
	 * @param {Vector3} position
	 * @param {THREE.Quaternion} rotation
	 * @param {number} color
	 */
	addBoard(
		size,
		position,
		rotation = new THREE.Quaternion(),
		color = 0xff0000
	) {
		const a = new Vector3(size / -2, 0, size / -2);
		const b = new Vector3(size / -2, 0, size / 2);
		const c = new Vector3(size / 2, 0, size / -2);
		const d = new Vector3(size / 2, 0, size / 2);

		const vertices = new Float32Array([
			a.x,
			a.y,
			a.z,
			b.x,
			b.y,
			b.z,
			c.x,
			c.y,
			c.z,
			d.x,
			d.y,
			d.z,
		]);
		const indices = [0, 1, 2, 2, 3, 1];

		const mesh = this.renderer.createBoard(
			vertices,
			indices,
			position,
			rotation,
			color
		);

		const rigid = this.physics.createBoard(
			vertices,
			indices,
			position,
			rotation
		);

		this.item_rigid[mesh.uuid] = rigid;
		this.item_meshes[mesh.uuid] = mesh;
	}

	/**
	 *
	 * @returns {string}
	 */
	addBall() {
		const size = 0.1;

		const mesh = this.renderer.createBall(size);
		const [rigid, collider] = this.physics.createBall(size);

		this.item_rigid[mesh.uuid] = rigid;
		this.item_meshes[mesh.uuid] = mesh;
		this.item_collider[mesh.uuid] = collider;

		return mesh.uuid;
	}

	/**
	 *
	 * @param {string} uuid
	 */
	clearBall(uuid) {
		// Dispose of the mesh's geometry and material
		this.item_meshes[uuid].geometry.dispose();
		// @ts-ignore
		this.item_meshes[uuid].material.dispose();

		// Remove the mesh from the scene
		this.renderer.scene.remove(this.item_meshes[uuid]);

		// remove collider from physics world
		this.physics.world.removeCollider(this.item_collider[uuid], false);

		// remove rigid body from physics world
		this.physics.world.removeRigidBody(this.item_rigid[uuid]);

		// remove from our references
		delete this.item_meshes[uuid];
		delete this.item_collider[uuid];
		delete this.item_rigid[uuid];

		// this.renderer.renderer.renderLists.dispose();
	}

	addBounceBoard() {
		const mesh = this.renderer.createBounceBoard();

		this.bounce_board = this.physics.createBounceBoard();

		this.item_rigid[mesh.uuid] = this.bounce_board;
		this.item_meshes[mesh.uuid] = mesh;
	}

	/**
	 *
	 * @param {string} direction
	 */
	moveBounceBoard(direction) {
		const t = this.bounce_board.translation();

		switch (direction) {
			case "w": // w key
				t.y += 0.5;

				break;
			case "a": // a key
				t.x -= 0.5;
				break;
			case "s": // s key
				t.y -= 0.5;
				break;
			case "d": // d key
				t.x += 0.5;
				break;
		}

		this.bounce_board.setTranslation(t, true);
	}
}
