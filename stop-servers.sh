#!/bin/bash
# Stop all Mentora servers

echo "Stopping Mentora servers..."

# Stop Django backend
echo "Stopping Django backend..."
pkill -f "manage.py runserver"

# Stop React frontend  
echo "Stopping React frontend..."
pkill -f "react-scripts start"

echo "All Mentora servers stopped."
