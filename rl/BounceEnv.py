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


class BounceEnv(gym.Env):
    """Custom Environment that follows gym interface"""

    def __init__(self):

        super(BounceEnv, self).__init__()
        # Define action and observation space
        # They must be gym.spaces objects
        # Example when using discrete actions:
        # self.action_space = spaces.Discrete(N_DISCRETE_ACTIONS)
        self.action_space = spaces.Discrete(4)
        
        ball_pos_space = spaces.Box(low=-1, high=1, shape=(3,), dtype=np.float32)
        board_pos_space = spaces.Box(low=-1, high=1, shape=(3,), dtype=np.float32)
        ball_vel_space = spaces.Box(low=-1, high=1, shape=(3,), dtype=np.float32)
        self.observation_space = spaces.Dict({
            'ball_position': ball_pos_space,
            'board_position': board_pos_space,
            'ball_velocity': ball_vel_space
        })

        self.ws = websocket.WebSocket()
        self.ws.connect("ws://127.0.0.1:5174")

    def __del__(self):
        self.ws.close()

    def step(self, action):

        # self.prev_actions.append(action)

        # send action to the game
        if action == 0:
            self.ws.send("s")
        elif action == 1:
            self.ws.send("a")
        elif action == 2:
            self.ws.send("d")
        elif action == 3:
            self.ws.send("w")

        observation: ObservationDict = {"ball_position": np.array([0,0,0], dtype=np.float32), "board_position": np.array([0,0,0], dtype=np.float32), "ball_velocity": np.array([0,0,0], dtype=np.float32)}
        reward = 0
        done = False
        info = {}
        
        msg = self.ws.recv()

        print(msg)

        return observation, reward, done, False, info

    def reset(self, seed=None, options=None):
        observation: ObservationDict = {"ball_position": np.array([0,0,0], dtype=np.float32), "board_position": np.array([0,0,0], dtype=np.float32), "ball_velocity": np.array([0,0,0], dtype=np.float32)}
        # Implement reset method
        info = {}
        return observation, info
    


env = BounceEnv()

check_env(env)