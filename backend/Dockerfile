# Use a more stable Debian "buster" image as the base
FROM python:3.9-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for pytesseract and selenium
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

# Command to run the application
CMD ["gunicorn", "run:app", "--bind", "0.0.0.0:10000"]