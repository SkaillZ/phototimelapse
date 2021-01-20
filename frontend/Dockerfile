FROM node:14-alpine

# Copy everything
COPY . .

RUN npm ci
EXPOSE 3000

CMD ["npm", "start"]
