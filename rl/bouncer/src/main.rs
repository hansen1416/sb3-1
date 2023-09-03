use bouncer::create_board;
use rapier3d::prelude::*;
use rapier3d::na::{ Vector3 };

fn main() {
    let position: Vector3<f32> = vector![0.0, 1.0, 0.0];
    let rotation: Vector3<f32> = vector![0.0, 0.0, 0.0];

    create_board(position, rotation);

    println!("{}", "main finished");
}
