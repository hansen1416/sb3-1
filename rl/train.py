from stable_baselines3 import PPO
import os
from pathlib import Path
import websocket

from BounceEnv import BounceEnv, ProgressBarManager


def train_agent(ws):

    models_dir = os.path.join(os.path.dirname(
        __file__), 'models', 'bounce-ppo')
    logdir = os.path.join(os.path.dirname(__file__), 'logs', 'bounce-ppo')

    if not os.path.exists(models_dir):
        os.makedirs(models_dir)

    if not os.path.exists(logdir):
        os.makedirs(logdir)

    paths = sorted(Path(models_dir).iterdir(), key=os.path.getmtime)

    last_model = None
    last_iter = 0

    env = BounceEnv(ws_connection=ws)
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

        with ProgressBarManager(TIMESTEPS) as progress_callback:
            model.learn(total_timesteps=TIMESTEPS,
                        reset_num_timesteps=False, tb_log_name=f"{last_iter+TIMESTEPS * iters}",
                        callback=[progress_callback])

        model.save(f"{models_dir}/{last_iter+TIMESTEPS * iters}")

        if iters > 3:
            break


if __name__ == "__main__":

    ws = websocket.WebSocket()
    ws.connect("ws://127.0.0.1:5174", timeout=5)

    train_agent(ws)

    ws.close()
