from stable_baselines3 import PPO
import websocket

from BounceEnv import BounceEnv


def test_agent(ws):

    env = BounceEnv(ws_connection=ws)
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

    ws = websocket.WebSocket()
    ws.connect("ws://127.0.0.1:5174", timeout=5)
    
    test_agent(ws)

    ws.close()
