FROM node:20-alpine

WORKDIR /app

# Copy source code
COPY . .

# Expose web application port
EXPOSE 5000

# Volume persistence for uploaded chapters and manga database
VOLUME ["/app/data", "/app/wwwroot/uploads"]

ENV PORT=5000
ENV HOST=0.0.0.0

CMD ["node", "server.js"]
