use bouncer::Physics;
use rapier3d::prelude::*;
use rapier3d::na::{ Vector3 };

fn main() {
    // let position: Vector3<f32> = vector![0.0, 1.0, 0.0];
    // let rotation: Vector3<f32> = vector![0.0, 0.0, 0.0];

    // create_board(position, rotation);

    // Create a new Physics using the static method
    let mut physics = Physics::new();

    // Call the instance method to update the physics and get the ball's translation
    let translation = physics.update();
    println!("ball position: {:?}", translation);

    // println!("{}", "main finished");
}
