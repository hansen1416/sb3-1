use pyo3::prelude::*;
use rapier3d::prelude::*;
use rapier3d::na::{ Vector3 };

/// Formats the sum of two numbers as string.
#[pyfunction]
pub fn sum_as_string(a: usize, b: usize) -> PyResult<String> {
    Ok((a + b).to_string())
}

pub fn create_board(position: Vector3<f32>) {
    let mut bodies = RigidBodySet::new();

    let rb_desc = RigidBodyBuilder::fixed().translation(position);
    // .rotation(rotation);
    let _handle = bodies.insert(rb_desc);
}

#[pyfunction]
fn run_ball() {
    let mut rigid_body_set = RigidBodySet::new();
    let mut collider_set = ColliderSet::new();

    /* Create the ground. */
    let collider = ColliderBuilder::cuboid(100.0, 0.1, 100.0).build();
    collider_set.insert(collider);

    /* Create the bounding ball. */
    let rigid_body = RigidBodyBuilder::dynamic().translation(vector![0.0, 10.0, 0.0]).build();
    let collider = ColliderBuilder::ball(0.5).restitution(0.7).build();
    let ball_body_handle = rigid_body_set.insert(rigid_body);
    collider_set.insert_with_parent(collider, ball_body_handle, &mut rigid_body_set);

    /* Create other structures necessary for the simulation. */
    let gravity = vector![0.0, -9.81, 0.0];
    let integration_parameters = IntegrationParameters::default();
    let mut physics_pipeline = PhysicsPipeline::new();
    let mut island_manager = IslandManager::new();
    let mut broad_phase = BroadPhase::new();
    let mut narrow_phase = NarrowPhase::new();
    let mut impulse_joint_set = ImpulseJointSet::new();
    let mut multibody_joint_set = MultibodyJointSet::new();
    let mut ccd_solver = CCDSolver::new();
    let physics_hooks = ();
    let event_handler = ();

    /* Run the game loop, stepping the simulation once per frame. */
    for _ in 0..200 {
        physics_pipeline.step(
            &gravity,
            &integration_parameters,
            &mut island_manager,
            &mut broad_phase,
            &mut narrow_phase,
            &mut rigid_body_set,
            &mut collider_set,
            &mut impulse_joint_set,
            &mut multibody_joint_set,
            &mut ccd_solver,
            None,
            &physics_hooks,
            &event_handler
        );

        let ball_body = &rigid_body_set[ball_body_handle];
        println!("Ball altitude: {}", ball_body.translation().y);
    }
}

/// A Python module implemented in Rust.
#[pymodule]
fn bouncer(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(sum_as_string, m)?)?;
    m.add_function(wrap_pyfunction!(run_ball, m)?)?;
    Ok(())
}