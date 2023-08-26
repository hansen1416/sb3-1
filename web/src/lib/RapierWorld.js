/**
 * @typedef {import('../../node_modules/@dimforge/rapier3d/pipeline/world').World} World
 * @typedef {import('../../node_modules/@dimforge/rapier3d/geometry/collider').Collider} Collider
 * @typedef {import('../../node_modules/@dimforge/rapier3d/geometry/collider').ColliderDesc} ColliderDesc
 * @typedef {import('../../node_modules/@dimforge/rapier3d/dynamics/rigid_body').RigidBody} RigidBody
 * @typedef {import('../../node_modules/@dimforge/rapier3d/dynamics/rigid_body').RigidBodyDesc} RigidBodyDesc
 * @typedef {import('../../node_modules/@dimforge/rapier3d/dynamics/coefficient_combine_rule').CoefficientCombineRule} CoefficientCombineRule
 * @typedef {import('../../node_modules/@dimforge/rapier3d/control/character_controller').KinematicCharacterController} KinematicCharacterController
 * @typedef {import('../../node_modules/@dimforge/rapier3d/geometry/ray').Ray} Ray
 * @typedef {import('../../node_modules/@dimforge/rapier3d/pipeline/query_pipeline').QueryFilterFlags} QueryFilterFlags
 * @typedef {import('../../node_modules/@dimforge/rapier3d/pipeline/event_queue').ActiveEvents} ActiveEvents
 * @typedef {{x: number, y: number, z: number}} vec3
 */

import { Vector3, Quaternion } from "three";
import { randomVecWithinAngelDistance } from "../utils/ropes";

let instance;

export default class RapierWorld {
	/**
	 *  Larger values of the damping coefficients lead to a stronger slow-downs. Their default values are 0.0 (no damping at all).
	 */
	liner_damping = 0;

	/**
	 * A friction coefficient of 0 implies no friction at all (completely sliding contact)
	 * and a coefficient greater or equal to 1 implies a very strong friction. Values greater than 1 are allowed.
	 */
	friction = 0;

	/**
	 * A restitution coefficient set to 1 (fully elastic contact) implies that
	 * the exit velocity at a contact has the same magnitude as the entry velocity along the contact normal:
	 * it is as if you drop a bouncing ball and it gets back to the same height after the bounce.
	 *
	 * A restitution coefficient set ot 0 implies that
	 * the exit velocity at a contact will be zero along the contact normal:
	 * it's as if you drop a ball but it doesn't bounce at all.
	 */

	restitution = 1;

	/**
	 * @type {RigidBody}
	 */
	ball_rigid;

	/**
	 * @type {RigidBody}
	 */
	bounce_board_rigid;

	/**
	 * @type {Collider}
	 */
	ball_collider;

	/**
	 * @type {Collider}
	 */
	bounce_board_collider;

	/**
	 *
	 * @param {module} RAPIER
	 */
	constructor(RAPIER) {
		// make it a singleton, so we only have 1 threejs scene
		if (instance) {
			return instance;
		} else {
			instance = this;
		}

		const gravity = { x: 0.0, y: -9.81, z: 0.0 };
		/** @type {World} */
		this.world = new RAPIER.World(gravity);
		/** @type {ColliderDesc} */
		this.ColliderDesc = RAPIER.ColliderDesc;
		/** @type {RigidBodyDesc} */
		this.RigidBodyDesc = RAPIER.RigidBodyDesc;
		/** @type {CoefficientCombineRule} */
		this.CoefficientCombineRule = RAPIER.CoefficientCombineRule;
		/** @type {Ray} */
		this.Ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
		/** @type {QueryFilterFlags} */
		this.QueryFilterFlags = RAPIER.QueryFilterFlags;
		/** @type {ActiveEvents} */
		this.events = RAPIER.ActiveEvents;
	}

	/**
	 * called in each `requestAnimationFrame`
	 */
	onFrameUpdate() {
		this.world.step();
	}

	destructor() {
		this.world.free();
	}

	/**
	 * create a rigid body with a collider, of shape plane
	 *
	 * @param {Float32Array} vertices
	 * @param {number[]} indices
	 * @param {vec3} position
	 * @returns
	 */
	createBoard(
		vertices,
		indices,
		position = { x: 0, y: 0, z: 0 },
		rotation = { x: 0, y: 0, z: 0, w: 0 }
	) {
		// @ts-ignore
		const rbDesc = this.RigidBodyDesc.fixed()
			.setTranslation(position.x, position.y, position.z)
			.setRotation(rotation, true);

		const rigid = this.world.createRigidBody(rbDesc);

		// @ts-ignore
		const clDesc = this.ColliderDesc.trimesh(vertices, indices)
			.setFriction(this.friction)
			.setRestitution(this.restitution);

		this.world.createCollider(clDesc, rigid);

		return rigid;
	}

	/**
	 *
	 * @param {number} size
	 * @param {vec3} pos
	 * @returns {[RigidBody, Collider]}
	 */
	createBall(size, pos) {
		const speed = 10;
		const velocity = randomVecWithinAngelDistance().multiplyScalar(speed);

		// @ts-ignore
		const rbDesc = this.RigidBodyDesc.dynamic()
			.setTranslation(pos.x, pos.y, pos.z)
			.setLinearDamping(this.liner_damping)
			.setLinvel(velocity.x, velocity.y, velocity.z)
			// .restrictRotations(false, true, false) // Y-axis only
			.setCcdEnabled(true);
		this.ball_rigid = this.world.createRigidBody(rbDesc);

		// @ts-ignore
		const clDesc = this.ColliderDesc.ball(size)
			.setFriction(this.friction) // @ts-ignore
			.setFrictionCombineRule(this.CoefficientCombineRule.Max)
			// .setTranslation(0, 0, 0)
			.setRestitution(this.restitution) // @ts-ignore
			.setRestitutionCombineRule(this.CoefficientCombineRule.Max);
		// .setCollisionGroups(CollisionMask.ActorMask | CollisionMask.TouchActor);
		this.ball_collider = this.world.createCollider(clDesc, this.ball_rigid);

		return [this.ball_rigid, this.ball_collider];
	}

	/**
	 * @param {number} size
	 * @returns {RigidBody}
	 */
	createBounceBoard(size) {
		const pos = new Vector3(0, 0, 0);
		const rot = new Quaternion();

		// @ts-ignore
		const rbDesc = this.RigidBodyDesc.fixed()
			.setTranslation(pos.x, pos.y, pos.z)
			.setRotation(rot, true);

		this.bounce_board_rigid = this.world.createRigidBody(rbDesc);

		// @ts-ignore
		const clDesc = this.ColliderDesc.cuboid(size / 2, size / 2, 0.05)
			// @ts-ignore
			.setActiveEvents(this.events.COLLISION_EVENTS)
			.setFriction(this.friction)
			.setRestitution(this.restitution);

		this.bounce_board_collider = this.world.createCollider(
			clDesc,
			this.bounce_board_rigid
		);

		/* Set the active events after the collider creation. */
		// this.bounce_board_collider.setActiveEvents(
		// 	RAPIER.ActiveEvents.COLLISION_EVENTS
		// );

		return this.bounce_board_rigid;
	}

	/**
	 * when ball and bounce board collide
	 *
	 * @param {function} callback
	 */
	ballHitBoard(callback) {
		this.world.contactPair(
			this.ball_collider,
			this.bounce_board_collider,
			(manifold, flipped) => {
				// Contact information can be read from `manifold`.
				// console.log(manifold, flipped);

				callback();
			}
		);
	}

	/**
	 *
	 * @returns {vec3}
	 */
	getBounceBoardPosition() {
		return this.bounce_board_rigid.translation();
	}

	/**
	 *
	 * @returns {vec3 | boolean}
	 */
	getBallPosition() {
		if (!this.ball_rigid) {
			return false;
		}
		return this.ball_rigid.translation();
	}

	getBallVelocity() {
		if (!this.ball_rigid) {
			return false;
		}
		return this.ball_rigid.linvel();
	}
}
