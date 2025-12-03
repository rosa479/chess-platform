FROM node:18-alpine

# Optional: curl if you ever need HTTP calls from inside container
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3011

CMD ["npm", "start"]
