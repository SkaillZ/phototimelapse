FROM node:14-alpine

# Copy everything
COPY . .

# Install node modules
RUN npm ci
EXPOSE 3001

VOLUME /uploads

CMD ["npm", "start"]
