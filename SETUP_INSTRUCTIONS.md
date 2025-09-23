# EdgeSDM Setup Instructions

## Prerequisites Installation

### 1. Install Node.js

**Option A: Download from Official Website**
1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS version (recommended)
3. Run the installer and follow the setup wizard
4. Restart your terminal/command prompt

**Option B: Using Chocolatey (if installed)**
```powershell
choco install nodejs
```

**Option C: Using Winget (Windows 10/11)**
```powershell
winget install OpenJS.NodeJS
```

### 2. Verify Installation
After installing Node.js, open a new terminal and run:
```bash
node --version
npm --version
```

## Running the EdgeSDM Application

### 1. Navigate to Project Directory
```bash
cd C:\Users\amriks\Desktop\QSC\EdgeSDM
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Application

**Development Mode (with hot reload):**
```bash
npm run start:dev
```

**Production Mode:**
```bash
npm run build
npm run start:prod
```

### 4. Access the Application

- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000

### 5. Default Login Credentials

- **Username**: admin
- **Password**: admin123

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build the application for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Troubleshooting

### Common Issues

1. **"npm is not recognized"**
   - Node.js is not installed or not in PATH
   - Restart terminal after installing Node.js

2. **Port 3000 already in use**
   - Change PORT in .env file
   - Or kill the process using port 3000

3. **Database connection issues**
   - Ensure SQLite is working
   - Check DATABASE_PATH in .env file

### Getting Help

If you encounter any issues:
1. Check the console output for error messages
2. Verify all dependencies are installed correctly
3. Ensure Node.js version is 18 or higher
4. Check the README.md for additional information

## Next Steps

After successfully running the application:
1. Explore the API documentation at http://localhost:3000/api/docs
2. Test the authentication endpoints
3. Try creating devices, packages, and deployments
4. Customize the application according to your needs

---

**Note**: This is a development setup. For production deployment, additional security measures and configurations are required.
