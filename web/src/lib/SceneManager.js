import * as THREE from "three";
import { Vector3, Mesh } from "three";
import ThreeScene from "./ThreeScene";
import RapierWorld from "./RapierWorld";

let instance;

export default class SceneManager {
	/**
	 * @type {Mesh[]}
	 */
	item_meshes = [];

	/**
	 * @type {import("./RapierWorld").RigidBody[]}
	 */
	item_rigid = [];

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
		for (let i in this.item_rigid) {
			const t = this.item_rigid[i].translation();
			this.item_meshes[i].position.set(t.x, t.y, t.z);

			const r = this.item_rigid[i].rotation();
			this.item_meshes[i].setRotationFromQuaternion(
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

		this.item_rigid.push(rigid);
		this.item_meshes.push(mesh);
	}

	addBall() {
		const size = 0.1

		const mesh = this.renderer.createBall(size);
		const rigid = this.physics.createBall(size);

		this.item_rigid.push(rigid);
		this.item_meshes.push(mesh);
	}
}
