# Use Node.js 18 as base
FROM node:18-bullseye

# Install Python 3.9 and LibreOffice
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Copy application files
COPY . .

# Create output directories
RUN mkdir -p /app/out /app/temp

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
