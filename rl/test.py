import gymnasium as gym
from gymnasium import spaces
import numpy as np
from stable_baselines3.common.env_checker import check_env
from stable_baselines3 import PPO
import os
from pathlib import Path
from typing import TypedDict
from numpy.typing import ArrayLike
import websocket
import json
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.results_plotter import load_results, ts2xy
from tqdm.auto import tqdm

from BounceEnv import BounceEnv


def test_agent():

    env = BounceEnv()
    env.reset()

    model = PPO.load("models/bounce-ppo/90000.zip")

    # print(model)

    obs, _ = env.reset()

    # print(obs)
    while True:
        action, _ = model.predict(obs)
        obs, rewards, dones, truncate, info = env.step(action)

        print(obs)
        # print(_states)
        # print(rewards)
        # env.render()


if __name__ == "__main__":

    test_agent()
