# Collaborative Editor

Real-time collaborative text editor with chat functionality built using Flask, Socket.IO, and TinyMCE.

## Features

- Real-time document collaboration
- Integrated chat system
- Dark/Light mode support
- Document export (TXT/DOC)
- Secure room-based editing
- User presence indicators
- Modern, responsive UI

## Tech Stack

**Backend**: Flask, Flask-SocketIO, Flask-CORS  
**Frontend**: TinyMCE, Socket.IO, Tailwind CSS

## Quick Start

1. **Clone & Install**
```bash
git clone <repository-url>
cd collaborative-app

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
npm run build:css

cd backend
python app.py



Open http://localhost:5000 in your browser
Usage
Create/Join Room

Create a new room or join existing one
Share room code with collaborators
Collaborate

Edit documents in real-time
Chat with team members
Toggle dark/light mode
Export work as needed

### Future Implementations
Security Enhancements
Editor Features
File Management
Collaboration Tools
User Experience
Admin Features
Performance
Contributing
Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request