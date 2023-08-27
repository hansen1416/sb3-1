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


class SaveOnBestTrainingRewardCallback(BaseCallback):
    """
    Callback for saving a model (the check is done every ``check_freq`` steps)
    based on the training reward (in practice, we recommend using ``EvalCallback``).

    :param check_freq: (int)
    :param log_dir: (str) Path to the folder where the model will be saved.
      It must contains the file created by the ``Monitor`` wrapper.
    :param verbose: (int)
    """

    def __init__(self, check_freq, log_dir, verbose=1):
        super().__init__(verbose)
        self.check_freq = check_freq
        self.log_dir = log_dir
        self.save_path = os.path.join(log_dir, "best_model")
        self.best_mean_reward = -np.inf

    def _init_callback(self) -> None:
        # Create folder if needed
        if self.save_path is not None:
            os.makedirs(self.save_path, exist_ok=True)

    def _on_step(self) -> bool:

        if self.n_calls % self.check_freq == 0:

            # Retrieve training reward
            x, y = ts2xy(load_results(self.log_dir), "timesteps")
            if len(x) > 0:
                # Mean training reward over the last 100 episodes
                mean_reward = np.mean(y[-100:])
                if self.verbose > 0:
                    print("Num timesteps: {}".format(self.num_timesteps))
                    print(
                        "Best mean reward: {:.2f} - Last mean reward per episode: {:.2f}".format(
                            self.best_mean_reward, mean_reward
                        )
                    )

                # New best model, you could save the agent here
                if mean_reward > self.best_mean_reward:
                    self.best_mean_reward = mean_reward
                    # Example for saving best model
                    if self.verbose > 0:
                        print(
                            "Saving new best model at {} timesteps".format(x[-1]))
                        print("Saving new best model to {}.zip".format(
                            self.save_path))
                    self.model.save(self.save_path)

        return True


class ProgressBarCallback(BaseCallback):
    """
    :param pbar: (tqdm.pbar) Progress bar object
    """

    def __init__(self, pbar):
        super().__init__()
        self._pbar = pbar

    def _on_step(self):
        # Update the progress bar:
        self._pbar.n = self.num_timesteps
        self._pbar.update(0)

# this callback uses the 'with' block, allowing for correct initialisation and destruction


class ProgressBarManager(object):
    def __init__(self, total_timesteps):  # init object with total timesteps
        self.pbar = None
        self.total_timesteps = total_timesteps

    def __enter__(self):  # create the progress bar and callback, return the callback
        self.pbar = tqdm(total=self.total_timesteps)

        return ProgressBarCallback(self.pbar)

    def __exit__(self, exc_type, exc_val, exc_tb):  # close the callback
        self.pbar.n = self.total_timesteps
        self.pbar.update(0)
        self.pbar.close()


models_dir = os.path.join('models', 'bounce-ppo')
logdir = os.path.join('logs', 'bounce-ppo')


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
        self.action_space = spaces.Discrete(5)

        # ball_pos_space = spaces.Box(
        #     low=-1, high=1, shape=(3,), dtype=np.float32)
        # board_pos_space = spaces.Box(
        #     low=-1, high=1, shape=(3,), dtype=np.float32)
        # ball_vel_space = spaces.Box(
        #     low=-1, high=1, shape=(3,), dtype=np.float32)
        # # self.observation_space = spaces.Dict({
        #     'ball_velocity': ball_vel_space,
        #     'ball_position': ball_pos_space,
        #     'board_position': board_pos_space,
        # })
        self.observation_space = spaces.Box(
            low=-1.0, high=1.0, shape=(8,), dtype=float)

        print("__init__ called")

    def __del__(self):
        print("__del__ called")

    def step(self, action):

        # send action to the game
        if action == 0:
            ws.send('')
        elif action == 1:
            ws.send("s")
        elif action == 2:
            ws.send("a")
        elif action == 3:
            ws.send("d")
        elif action == 4:
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

        # self.observation: ObservationDict = {"ball_position": np.array([msg_obs[0], msg_obs[1], msg_obs[2]], dtype=np.float32),
        #                                      "board_position": np.array([msg_obs[3], msg_obs[4], msg_obs[5]], dtype=np.float32),
        #                                      "ball_velocity": np.array([msg_obs[6], msg_obs[7], msg_obs[8]], dtype=np.float32)}

        self.observation = np.array(msg['observation'], dtype=np.float32)

        self.reward = msg['reward']
        info = {}

        return self.observation, msg['reward'], bool(msg['done']), False, info

    def reset(self, seed=None, options=None):
        super().reset(seed=seed, options=options)

        # self.observation: ObservationDict = {"ball_velocity": np.array([0, 0, 0], dtype=np.float32),
        #                                      "ball_position": np.array([0, 0, 0], dtype=np.float32),
        #                                      "board_position": np.array([0, 0, 0], dtype=np.float32)}

        self.observation = np.array([0, 0, 0, 0, 0, 0, 0, 0], dtype=np.float32)

        # Implement reset method
        info = {}
        return self.observation, info


def train_agent():

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

        # model = PPO('MultiInputPolicy', env, verbose=1, tensorboard_log=logdir)
        model = PPO('MlpPolicy', env, verbose=1, tensorboard_log=logdir)

    TIMESTEPS = 10000
    iters = 0
    while True:
        iters += 1

        autosave_callback = SaveOnBestTrainingRewardCallback(
            check_freq=2000, log_dir=os.path.join(logdir, str(TIMESTEPS * iters) + "_0"), verbose=1)

        with ProgressBarManager(TIMESTEPS) as progress_callback:
            model.learn(total_timesteps=TIMESTEPS,
                        reset_num_timesteps=False, tb_log_name=f"{last_iter+TIMESTEPS * iters}",
                        callback=[progress_callback, autosave_callback])

        model.save(f"{models_dir}/{last_iter+TIMESTEPS * iters}")

        if iters > 8:
            break


if __name__ == "__main__":

    # env = BounceEnv()

    # check_env(env)

    train_agent()

    ws.close()
