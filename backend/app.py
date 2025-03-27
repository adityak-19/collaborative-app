from flask import Flask, render_template, request, session, redirect, url_for
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_cors import CORS
import random
from string import ascii_uppercase
from datetime import datetime

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')
app.config["SECRET_KEY"] = "ahvaffas24afsdf"  # Replace with a more secure secret key in production
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO with CORS support
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)

rooms = {}

def generate_unique_code(length):
    while True:
        code = "".join(random.choice(ascii_uppercase) for _ in range(length))
        if code not in rooms:
            return code

@app.route("/", methods=["GET", "POST"])
def home():
    session.clear()  # Clear previous session data
    if request.method == "POST":
        create = request.form.get("create")
        join = request.form.get("join")
        
        if create:
            name = request.form.get("create_name")
            if not name:
                return render_template("home.html", error="Please enter a name to create a room.")
            
            room_code = generate_unique_code(4)
            rooms[room_code] = {
                "members": 0,
                "messages": [],
                "editor_content": "",
                "users": []
            }
            session["room"] = room_code
            session["name"] = name
            return redirect(url_for("room"))
        
        elif join:
            name = request.form.get("join_name")
            code = request.form.get("code")
            
            if not name:
                return render_template("home.html", error="Please enter a name to join the room.")
            if not code:
                return render_template("home.html", error="Please enter a room code.")
            
            code = code.upper()
            if code not in rooms:
                return render_template("home.html", error="Room does not exist.")
            
            session["room"] = code
            session["name"] = name
            return redirect(url_for("room"))

    return render_template("home.html")

@app.route("/room")
def room():
    room = session.get("room")
    name = session.get("name")
    if room is None or name is None or room not in rooms:
        return redirect(url_for("home"))
    
    return render_template(
        "room.html",
        code=room,
        name=name,
        editor_content=rooms[room]["editor_content"],
        messages=rooms[room]["messages"],
        users=rooms[room]["users"]
    )

@socketio.on("connect")
def connect(auth=None):  # Add auth parameter to fix TypeError
    room = session.get("room")
    name = session.get("name")
    if not room or not name:
        return
    
    if room not in rooms:  # Add check if room exists
        rooms[room] = {
            "members": 0,
            "messages": [],
            "editor_content": "",
            "users": []
        }
    
    # Check for duplicate names
    base_name = name
    counter = 1
    while name in rooms[room]["users"]:
        name = f"{base_name}_{counter}"
        counter += 1
    
    session["name"] = name  # Update session with new name if changed
    
    join_room(room)
    rooms[room]["members"] += 1
    rooms[room]["users"].append(name)
    
    emit("user_joined", {
        "name": name,
        "users": rooms[room]["users"],
        "message": f"{name} has joined the room"
    }, to=room)
    
    print(f"{name} joined room {room}")

@socketio.on("disconnect")
def disconnect():
    room = session.get("room")
    name = session.get("name")
    if room in rooms:
        leave_room(room)
        if name in rooms[room]["users"]:
            rooms[room]["users"].remove(name)
            rooms[room]["members"] -= 1
        
        if rooms[room]["members"] <= 0:
            del rooms[room]
        else:
            emit("user_left", {
                "name": name,
                "users": rooms[room]["users"],
                "message": f"{name} has left the room"
            }, to=room)
    
    print(f"{name} has left the room {room}")

@socketio.on("message")
def message(data):
    room = session.get("room")
    name = session.get("name")
    if room not in rooms:
        return
    
    content = {
        "name": name,
        "message": data["message"],
        "timestamp": datetime.now().strftime("%H:%M")
    }
    rooms[room]["messages"].append(content)
    emit("message", content, to=room)

@socketio.on("editor_update")
def editor_update(data):
    room = session.get("room")
    if room not in rooms:
        return
    
    rooms[room]["editor_content"] = data["content"]
    emit("editor_update", data, to=room, include_self=False)

@app.route("/api/room/<code>")
def get_room_info(code):
    if code not in rooms:
        return {"error": "Room not found"}, 404
    
    return {
        "members": rooms[code]["members"],
        "users": rooms[code]["users"]
    }

if __name__ == "__main__":
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)