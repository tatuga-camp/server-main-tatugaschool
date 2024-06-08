# Base image
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
ENV NODE_ENV=production
RUN npm install --production
COPY prisma ./prisma/
RUN npx prisma generate
RUN npm install -g @nestjs/cli
# Bundle app source
COPY . .

# Copy the .env and .env.development files


# Creates a "dist" folder with the production build
RUN npm run build



# Start the server using the production build
CMD ["npm", "run", "start:prod"]