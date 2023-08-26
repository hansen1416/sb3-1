import * as THREE from "three";
import { Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module.js";

let stats;

if (import.meta.env.DEV) {
	stats = new Stats();

	stats.showPanel(1);

	document.body.appendChild(stats.dom);
}

export const SceneProperties = {
	camera_height: 2,
	camera_far_z: 16,
};

Object.freeze(SceneProperties);

let instance;

export default class ThreeScene {
	/**
	 *
	 * @param {HTMLCanvasElement} canvas
	 * @param {number} width
	 * @param {number} height
	 * @returns
	 */
	constructor(canvas, width, height) {
		// make it a singleton, so we only have 1 threejs scene
		if (instance) {
			return instance;
		} else {
			instance = this;
		}

		this.scene = new THREE.Scene();

		this.scene.add(new THREE.AxesHelper(5));

		this.camera = new THREE.PerspectiveCamera(
			75,
			width / height,
			0.01,
			2000
		);

		this.camera.position.set(
			0,
			SceneProperties.camera_height,
			SceneProperties.camera_far_z
		);

		this.camera.updateProjectionMatrix(); // update the camera's projection matrix

		// env light
		this.scene.add(new THREE.AmbientLight(0xffffff, 1));

		/**
		// mimic the sun light. maybe update light position later
		this.light = new THREE.PointLight(0xffffff, 0.7);
		this.light.position.set(0, 100, 0);
		this.light.castShadow = true;
		// this.light.shadow.mapSize.width = 2048;
		// this.light.shadow.mapSize.height = 2048;
 */
		this.light = new THREE.PointLight(0xffffff, 1);
		this.light.position.set(0, 0, 0);
		this.light.castShadow = true;
		// this.scene.add(this.light);

		// this.light.target = new THREE.Object3D();
		// this.light.target.position.set(0, -10, 0);
		// this.scene.add(this.light.target);

		// Create a directional light helper
		// const lightHelper = new THREE.PointLightHelper(this.light, 10);
		// this.scene.add(lightHelper);

		// env fog
		// this.scene.fog = new THREE.Fog(0x000000, 50, 200);

		this.renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true,
			antialias: true,
		});

		this.renderer.shadowMap.enabled = true;
		// this.renderer.shadowMap.type = THREE.BasicShadowMap;
		// this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		// this.renderer.toneMappingExposure = 0.5;

		this.controls = new OrbitControls(this.camera, canvas);

		this.renderer.setSize(width, height);
	}

	onFrameUpdate() {
		this.controls.update();

		this.renderer.render(this.scene, this.camera);

		if (stats) {
			stats.update();
		}
	}

	resetControl() {
		this.controls.reset();
	}

	/**
	 * create a plane buffer geometry
	 *
	 * @param {Float32Array} vertices
	 * @param {number[]} indices
	 * @param {Vector3} position
	 * @param {THREE.Quaternion} rotation
	 * @param {number} color
	 * @returns
	 */
	createBoard(
		vertices,
		indices,
		position = new Vector3(0, 0, 0),
		rotation = new THREE.Quaternion(),
		color = 0xff0000
	) {
		const geometry = new THREE.BufferGeometry();

		geometry.setIndex(indices);
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(vertices, 3)
		);

		const material = new THREE.MeshBasicMaterial({
			color: color,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geometry, material);

		mesh.position.set(position.x, position.y, position.z);
		mesh.rotation.setFromQuaternion(rotation);

		mesh.receiveShadow = true;
		mesh.castShadow = true;

		this.scene.add(mesh);

		return mesh;
	}

	/**
	 * @param {number} size
	 * @returns {THREE.Mesh}
	 */
	createBall(size) {
		const mesh = new THREE.Mesh(
			new THREE.SphereGeometry(size), // @ts-ignore
			new THREE.MeshBasicMaterial({ color: 0xfea1179 })
		);
		mesh.castShadow = true;

		this.scene.add(mesh);

		return mesh;
	}

	createBounceBoard() {
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 0.1), // @ts-ignore
			new THREE.MeshBasicMaterial({ color: 0xffa41b })
		);
		mesh.castShadow = true;

		this.scene.add(mesh);

		return mesh;
	}
}
