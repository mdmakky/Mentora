#!/bin/bash
# Start Mentora Backend (Django)

echo "Starting Mentora Backend..."
cd /home/muse-matrix/Desktop/Mentora/backend

echo "Activating virtual environment..."
source /home/muse-matrix/Desktop/Mentora/venv/bin/activate

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Starting Django server on http://localhost:8000"
python manage.py runserver
