FROM node:14-alpine

# Copy everything
COPY . .

# Install node modules
RUN npm ci
EXPOSE 3000

CMD ["npm", "start"]
