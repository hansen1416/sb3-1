import gymnasium as gym
from gymnasium import spaces
import numpy as np
import cv2
import random
import time
from collections import deque
from stable_baselines3.common.env_checker import check_env
from stable_baselines3 import PPO
from stable_baselines3.common.evaluation import evaluate_policy
import os
from pathlib import Path
from typing import TypedDict
from numpy.typing import ArrayLike
import websocket
import json

"""
game env is a 3D game, the ball is bouncing in a 3D cuboid with one side be empty, the board is trying to catch the ball
if the ball is bounced out of the cuboid, the game is over.
the board can move in 4 directions, left, right, up, down
the ball is bouncing in a random direction, when the game is over, 
the ball will be reset to the center of the cuboid with a random velocity

when the board catches the ball, the reward is 1
when the ball is bounced out of the cuboid, the reward is -1

"""


class ObservationDict(TypedDict):
    ball_position: ArrayLike
    board_position: ArrayLike
    ball_velocity: ArrayLike


ws = websocket.WebSocket()
ws.connect("ws://127.0.0.1:5174", timeout=5)


class BounceEnv(gym.Env):
    """Custom Environment that follows gym interface"""

    def __init__(self):

        super(BounceEnv, self).__init__()
        # Define action and observation space
        # They must be gym.spaces objects
        # Example when using discrete actions:
        # self.action_space = spaces.Discrete(N_DISCRETE_ACTIONS)
        self.action_space = spaces.Discrete(4)

        ball_pos_space = spaces.Box(
            low=-1, high=1, shape=(3,), dtype=np.float32)
        board_pos_space = spaces.Box(
            low=-1, high=1, shape=(3,), dtype=np.float32)
        ball_vel_space = spaces.Box(
            low=-1, high=1, shape=(3,), dtype=np.float32)
        self.observation_space = spaces.Dict({
            'ball_velocity': ball_vel_space,
            'ball_position': ball_pos_space,
            'board_position': board_pos_space,
        })

        print("__init__ called")

    def __del__(self):
        print("__del__ called")

    def step(self, action):

        # self.prev_actions.append(action)

        # send action to the game
        if action == 0:
            ws.send("s")
        elif action == 1:
            ws.send("a")
        elif action == 2:
            ws.send("d")
        elif action == 3:
            ws.send("w")

        try:
            msg = ws.recv()
        except websocket.WebSocketTimeoutException:
            print("Timeout occurred")
            return self.observation, self.reward, False, False, {}

        try:
            msg = json.loads(msg)
        except:
            print("Illegal message")
            print(msg)
            return self.observation, self.reward, False, False, {}

        msg_obs = msg['observation']

        self.observation: ObservationDict = {"ball_position": np.array([msg_obs[0], msg_obs[1], msg_obs[2]], dtype=np.float32),
                                             "board_position": np.array([msg_obs[3], msg_obs[4], msg_obs[5]], dtype=np.float32),
                                             "ball_velocity": np.array([msg_obs[6], msg_obs[7], msg_obs[8]], dtype=np.float32)}
        self.reward = msg['reward']
        info = {}

        return self.observation, msg['reward'], bool(msg['done']), False, info

    def reset(self, seed=None, options=None):
        super().reset(seed=seed, options=options)

        print("reset called")

        self.observation: ObservationDict = {"ball_velocity": np.array([0, 0, 0], dtype=np.float32),
                                             "ball_position": np.array([0, 0, 0], dtype=np.float32),
                                             "board_position": np.array([0, 0, 0], dtype=np.float32)}
        # Implement reset method
        info = {}
        return self.observation, info


def train_agent():

    models_dir = os.path.join('models', 'bounce-ppo')
    logdir = os.path.join('logs', 'bounce-ppo')

    if not os.path.exists(models_dir):
        os.makedirs(models_dir)

    if not os.path.exists(logdir):
        os.makedirs(logdir)

    paths = sorted(Path(models_dir).iterdir(), key=os.path.getmtime)

    last_model = None
    last_iter = 0

    env = BounceEnv()
    env.reset()

    if len(paths) > 0:
        # get last model file
        last_model = paths[-1]

        # get last iteration
        last_iter = int(os.path.splitext(last_model.name)[0])

        last_model = PPO.load(last_model, env, verbose=1,
                              tensorboard_log=logdir)

    if last_model:
        model = last_model
    else:

        model = PPO('MultiInputPolicy', env, verbose=1, tensorboard_log=logdir)

    TIMESTEPS = 10000
    iters = 0
    while True:
        iters += 1
        model.learn(total_timesteps=TIMESTEPS,
                    reset_num_timesteps=False, tb_log_name=f"{last_iter+TIMESTEPS * iters}")
        model.save(f"{models_dir}/{last_iter+TIMESTEPS * iters}")

        if iters > 8:
            break


if __name__ == "__main__":

    # env = BounceEnv()

    # check_env(env)

    train_agent()

    ws.close()
