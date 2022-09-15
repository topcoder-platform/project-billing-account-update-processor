# Use the base image with Node.js
FROM node:16.15

# Copy the current directory into the Docker image
COPY . /project-billing-account-update-processor

# Set working directory for future use
WORKDIR /project-billing-account-update-processor

# Install the dependencies from package.json
RUN npm install

CMD npm start
