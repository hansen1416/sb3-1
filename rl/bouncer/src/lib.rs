use pyo3::prelude::*;
use rapier3d::prelude::*;
// use nalgebra::{ Vector3, UnitQuaternion, Isometry3 };
use rapier3d::na::{ Vector3, UnitQuaternion, Isometry3 };

// Define a struct with fields
#[pyclass]
pub struct BouncerGame {
    // A physics pipeline that executes one simulation step
    pub physics_pipeline: PhysicsPipeline,
    // A rigid body set that contains all the rigid bodies of the scene
    rigid_body_set: RigidBodySet,
    // A collider set that contains all the colliders of the scene
    collider_set: ColliderSet,
    // A ball as a rigid body handle
    ball_body_handle: RigidBodyHandle,

    gravity: Vector3<f32>,
    integration_parameters: IntegrationParameters,
    island_manager: IslandManager,
    broad_phase: BroadPhase,
    narrow_phase: NarrowPhase,
    impulse_joint_set: ImpulseJointSet,
    multibody_joint_set: MultibodyJointSet,
    ccd_solver: CCDSolver,
}

#[pymethods]
impl BouncerGame {
    #[new]
    pub fn new() -> Self {
        let physics_pipeline = PhysicsPipeline::new();

        /* Create other structures necessary for the simulation. */
        let gravity = vector![0.0, -9.81, 0.0];
        let mut integration_parameters = IntegrationParameters::default();

        // Change some parameters, for example the timestep length.
        integration_parameters.dt = 1.0 / 1.0;

        let island_manager = IslandManager::new();
        let broad_phase = BroadPhase::new();
        let narrow_phase = NarrowPhase::new();
        let impulse_joint_set = ImpulseJointSet::new();
        let multibody_joint_set = MultibodyJointSet::new();
        let ccd_solver = CCDSolver::new();

        let mut rigid_body_set = RigidBodySet::new();
        let mut collider_set = ColliderSet::new();
        let ball_body_handle = RigidBodyHandle::from_raw_parts(0, 0);

        /* Create the ground. */
        let ground_body = RigidBodyBuilder::fixed().build();
        let ground_handle = rigid_body_set.insert(ground_body);
        let collider = ColliderBuilder::cuboid(100.0, 0.1, 100.0).build();
        collider_set.insert_with_parent(collider, ground_handle, &mut rigid_body_set);

        return BouncerGame {
            physics_pipeline,
            rigid_body_set,
            collider_set,
            ball_body_handle,
            gravity,
            integration_parameters,
            island_manager,
            broad_phase,
            narrow_phase,
            impulse_joint_set,
            multibody_joint_set,
            ccd_solver,
        };
    }

    fn build_scene(&mut self) -> PyResult<()> {
        // let _ = self.create_board("right");
        // let _ = self.create_board("back");
        // let _ = self.create_board("left");
        // let _ = self.create_board("top");
        // let _ = self.create_board("bottom");

        let _ = self.create_ball();

        Ok(())
    }

    fn create_ball(&mut self) -> PyResult<()> {
        /* Create the bounding ball. */
        let ball_rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![0.0, 10.0, 1.0])
            .build();
        let ball_collider = ColliderBuilder::ball(0.5).build();
        self.ball_body_handle = self.rigid_body_set.insert(ball_rigid_body);
        self.collider_set.insert_with_parent(
            ball_collider,
            self.ball_body_handle,
            &mut self.rigid_body_set
        );

        Ok(())
    }

    fn create_board(&mut self, side: &str) -> PyResult<()> {
        let size: f32 = 10.0;

        let mut translation = vector![0.0, 0.0, 0.0];
        let mut rotation = UnitQuaternion::from_axis_angle(
            &Vector3::y_axis(),
            std::f32::consts::PI / 2.0
        );

        match side {
            "right" => {
                translation = vector![size / 2.0, 0.0, size / -2.0];
                rotation = UnitQuaternion::from_axis_angle(
                    &Vector3::y_axis(),
                    std::f32::consts::PI / 2.0
                );
            }
            "back" => {
                translation = vector![0.0, 0.0, -size];
                rotation = UnitQuaternion::from_axis_angle(&Vector3::x_axis(), 0.0);
            }
            "left" => {
                translation = vector![size / -2.0, 0.0, size / -2.0];
                rotation = UnitQuaternion::from_axis_angle(
                    &Vector3::y_axis(),
                    std::f32::consts::PI / -2.0
                );
            }
            "top" => {
                translation = vector![0.0, size / 2.0, size / -2.0];
                rotation = UnitQuaternion::from_axis_angle(
                    &Vector3::x_axis(),
                    std::f32::consts::PI / -2.0
                );
            }
            "bottom" => {
                translation = vector![0.0, size / -2.0, size / -2.0];
                rotation = UnitQuaternion::from_axis_angle(
                    &Vector3::x_axis(),
                    std::f32::consts::PI / 2.0
                );
            }

            &_ => {
                println!("Invalid side");
            }
        }

        let isometry = Isometry3::from_parts(translation.into(), rotation);

        let rigid_body = RigidBodyBuilder::fixed()
            .position(isometry)
            // .translation(vector![0.0, 0.0, 0.0])
            // .rotation(&rotation1)
            // All done, actually build the rigid-body.
            .build();

        let rigid_body_handle = self.rigid_body_set.insert(rigid_body);

        let friction: f32 = 0.0;
        let restitution: f32 = 1.0;

        // The default density is 1.0, we are setting 2.0 for this example.
        let collider = ColliderBuilder::cuboid(size / 2.0, size / 2.0, 0.01)
            .friction(friction)
            .restitution(restitution)
            .build();

        // When the collider is attached, the rigid-body's mass and angular
        // inertia is automatically updated to take the collider into account.
        let _collider_handle = self.collider_set.insert_with_parent(
            collider,
            rigid_body_handle,
            &mut self.rigid_body_set
        );

        Ok(())
    }

    fn step(&mut self) -> PyResult<[f32; 3]> {
        let physics_hooks = ();
        let event_handler = ();

        // Execute one step of the physics simulation
        self.physics_pipeline.step(
            &self.gravity,
            &self.integration_parameters,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_body_set,
            &mut self.collider_set,
            &mut self.impulse_joint_set,
            &mut self.multibody_joint_set,
            &mut self.ccd_solver,
            None,
            &physics_hooks,
            &event_handler
        );

        // Get the ball's rigid body from its handle
        let ball_rigid_body = self.rigid_body_set.get(self.ball_body_handle).unwrap();

        let trans = ball_rigid_body.translation();

        // Return the ball's translation (position)

        Ok([trans.x, trans.y, trans.z])
    }

    #[classattr]
    fn my_attribute() -> String {
        "hello".to_string()
    }
}

#[pymodule]
fn bouncer(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<BouncerGame>()?;
    Ok(())
}

// #[pyfunction]
// fn run_ball() {
//     let mut rigid_body_set = RigidBodySet::new();
//     let mut collider_set = ColliderSet::new();

//     /* Create the ground. */
//     let collider = ColliderBuilder::cuboid(100.0, 0.1, 100.0).build();
//     collider_set.insert(collider);

//     /* Create the bounding ball. */
//     let rigid_body = RigidBodyBuilder::dynamic().translation(vector![0.0, 10.0, 0.0]).build();
//     let collider = ColliderBuilder::ball(0.5).restitution(0.7).build();
//     let ball_body_handle = rigid_body_set.insert(rigid_body);
//     collider_set.insert_with_parent(collider, ball_body_handle, &mut rigid_body_set);

//     /* Create other structures necessary for the simulation. */
//     let gravity = vector![0.0, -9.81, 0.0];
//     let integration_parameters = IntegrationParameters::default();
//     let mut physics_pipeline = PhysicsPipeline::new();
//     let mut island_manager = IslandManager::new();
//     let mut broad_phase = BroadPhase::new();
//     let mut narrow_phase = NarrowPhase::new();
//     let mut impulse_joint_set = ImpulseJointSet::new();
//     let mut multibody_joint_set = MultibodyJointSet::new();
//     let mut ccd_solver = CCDSolver::new();
//     let physics_hooks = ();
//     let event_handler = ();

//     /* Run the game loop, stepping the simulation once per frame. */
//     for _ in 0..200 {
//         physics_pipeline.step(
//             &gravity,
//             &integration_parameters,
//             &mut island_manager,
//             &mut broad_phase,
//             &mut narrow_phase,
//             &mut rigid_body_set,
//             &mut collider_set,
//             &mut impulse_joint_set,
//             &mut multibody_joint_set,
//             &mut ccd_solver,
//             None,
//             &physics_hooks,
//             &event_handler
//         );

//         let ball_body = &rigid_body_set[ball_body_handle];
//         println!("Ball altitude: {}", ball_body.translation().y);
//     }
// }

// /// A Python module implemented in Rust.
// #[pymodule]
// fn bouncer(_py: Python, m: &PyModule) -> PyResult<()> {
//     // m.add_function(wrap_pyfunction!(sum_as_string, m)?)?;
//     // m.add_function(wrap_pyfunction!(bounce_ball, m)?)?;
//     Ok(())
// }
