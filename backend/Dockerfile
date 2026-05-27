FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Create uploads directory
RUN mkdir -p uploads

# Command to run the application
CMD ["python", "server.py"]
