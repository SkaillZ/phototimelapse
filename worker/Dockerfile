FROM node:14-alpine

# Copy everything
COPY . .

# Install node modules
RUN npm ci
CMD ["npm", "start"]
