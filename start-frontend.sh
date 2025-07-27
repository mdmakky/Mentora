#!/bin/bash
# Start Mentora Frontend (React)

echo "Starting Mentora Frontend..."
cd /home/muse-matrix/Desktop/Mentora/frontend

echo "Installing/updating dependencies..."
npm install

echo "Starting React development server on http://localhost:3000"
npm start
