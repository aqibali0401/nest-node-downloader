# EdgeSDM - Edge Software Deployment Manager

A clean, well-structured NestJS application for managing software deployments across edge devices.

## 🏗️ Project Structure

```
src/
├── common/                    # Shared utilities and common code
│   ├── base/                 # Base classes for services and controllers
│   │   ├── base.service.ts   # Abstract base service class
│   │   └── base.controller.ts # Abstract base controller class
│   ├── interfaces/           # Common interfaces
│   │   └── base.interface.ts # Base interfaces for entities, services, etc.
│   └── types/                # Common types and type definitions
│       └── common.types.ts   # Shared types, enums, and interfaces
├── core/                     # Core application functionality
│   └── config/               # Configuration services
│       └── app.config.ts     # Application configuration service
├── modules/                  # Feature modules (to be added)
├── app.module.ts             # Root application module
└── main.ts                   # Application entry point
```

## 🚀 Features

- **Clean Architecture**: Well-structured codebase with proper separation of concerns
- **Base Classes**: Reusable base classes for services and controllers
- **Type Safety**: Comprehensive TypeScript interfaces and types
- **Configuration Management**: Centralized configuration with validation
- **Error Handling**: Consistent error handling patterns
- **Logging**: Structured logging throughout the application

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EdgeSDM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

## 🏃‍♂️ Development

```bash
# Start in development mode
npm run start:dev

# Build the application
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Format code
npm run format
```

## 🔧 Configuration

The application uses environment variables for configuration:

```env
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database (optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edgesdm
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

## 📚 Architecture

### Base Classes

- **BaseService**: Provides common functionality for all services
  - Logging methods
  - Error handling
  - Validation helpers

- **BaseController**: Provides common functionality for all controllers
  - Standardized API responses
  - Error handling
  - Response formatting

### Interfaces

- **IBaseEntity**: Base interface for all entities
- **IBaseService**: Base interface for all services
- **IBaseRepository**: Base interface for all repositories
- **IBaseController**: Base interface for all controllers
- **IBaseConfig**: Base interface for configuration

### Types

- **ApiResponse**: Standardized API response format
- **PaginationOptions**: Pagination configuration
- **AppConfig**: Application configuration structure
- **Environment**: Supported environments
- **LogLevel**: Logging levels

## 🧪 Testing

```bash
# Unit tests
npm run test

# Tests in watch mode
npm run test:watch

# Test coverage
npm run test:cov
```

## 📦 Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔒 Security

- Environment-based configuration
- Input validation patterns
- Error handling without information leakage
- Type safety throughout the application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the established patterns
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the QSC team.

---

**EdgeSDM** - A clean, well-structured foundation for edge device software deployment management.