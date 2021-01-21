FROM node:14-alpine

# Install ffmpeg
RUN apk add  --no-cache ffmpeg

# Copy everything
COPY . .

# Install node modules
RUN npm ci
CMD ["npm", "start"]
