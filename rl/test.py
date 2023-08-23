import websocket

ws = websocket.WebSocket()
ws.connect("ws://127.0.0.1:5174")
ws.send("w")
ws.send("a")
ws.send("s")
ws.send("d")
# 19
# print(ws.recv())
# echo.websocket.events sponsored by Lob.com
ws.close()