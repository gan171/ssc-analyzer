# Use a specific version of the official Python runtime as a parent image
FROM python:3.11.9-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Update the package list and install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libglib2.0-0 \
    libnss3 \
    libgconf-2-4 \
    libfontconfig1 \
    wget \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container
COPY . .

# Make port 10000 available to the world outside this container
EXPOSE 10000

# Run the app using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "run:app"]