# 🏦 SpendWise - AI-Powered Personal Finance Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

> **A comprehensive, privacy-first personal finance app with AI-powered insights, blockchain security, and automated transaction detection.**

![SpendWise Demo](https://via.placeholder.com/800x400/2E3440/81A1C1?text=SpendWise+Finance+Tracker)

## 🌟 Features

### 🤖 **AI-Powered Financial Intelligence**
- **Smart Transaction Analysis**: GPT-4 powered spending pattern analysis
- **Personalized Insights**: AI-generated recommendations for better financial health  
- **Monthly Reports**: Automated financial summaries with actionable advice
- **Expense Categorization**: Intelligent automatic categorization

### 📱 **Automated Transaction Management**
- **SMS Auto-Detection**: Automatically parse bank SMS for transaction details
- **Real-time Sync**: Instant transaction recording and categorization
- **Blockchain Security**: Hash-chained ledger for tamper-proof financial records
- **Multi-currency Support**: Handle multiple currencies with real-time conversion

### 💡 **Smart Features**
- **Bill Reminders**: Never miss a payment with intelligent notifications
- **Budget Tracking**: Visual budget management with progress indicators
- **WhatsApp Reports**: Send monthly reports directly to WhatsApp
- **Data Export**: Export financial data in PDF/CSV formats
- **Dark Mode**: Beautiful dark/light theme with system sync

### 🔒 **Privacy & Security**
- **Local-First**: All processing happens on your device
- **End-to-End Encryption**: AES-256 encryption for sensitive data
- **No Data Mining**: Your financial data stays private
- **Blockchain Verification**: Cryptographic proof of data integrity

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- MongoDB
- Expo CLI
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/spendwise.git
cd spendwise
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python server.py
```

3. **Frontend Setup**  
```bash
cd frontend
npm install
# or
yarn install

# Start development server
expo start
```

4. **Database Setup**
```bash
# Start MongoDB
mongod --dbpath ./data/db
```

### Environment Variables

#### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=spendwise_db
JWT_SECRET_KEY=your-jwt-secret-key
EMERGENT_LLM_KEY=your-emergent-llm-key
RAZORPAY_KEY_ID=your-razorpay-key
POLYGON_RPC_URL=your-polygon-rpc-url
```

#### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native + Expo Router
- **Backend**: FastAPI + Python 3.9
- **Database**: MongoDB with Motor (async)
- **AI**: Emergent LLM Integration (GPT-4, Claude, Gemini)
- **Blockchain**: Custom hash-chained ledger + Polygon integration
- **Authentication**: JWT with refresh tokens
- **State Management**: React Context + AsyncStorage

### Project Structure
```
spendwise/
├── frontend/                 # React Native + Expo app
│   ├── app/                 # Expo Router pages
│   ├── components/          # Reusable components  
│   ├── contexts/           # React contexts
│   ├── lib/                # Utilities & services
│   └── types/              # TypeScript definitions
├── backend/                # FastAPI server
│   ├── server.py           # Main application
│   ├── models.py           # Pydantic models
│   └── utils/              # Helper functions
└── tests/                  # Test suites
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/refresh` - Token refresh

### Transactions
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### AI Features
- `POST /api/ai/analyze` - AI spending analysis
- `GET /api/analytics/monthly-report` - Monthly financial report

### Premium Features (Free for All Users)
- `GET /api/premium/status` - Check premium status  
- `POST /api/premium/upgrade` - Upgrade to premium

## 🧪 Testing

### Run Test Suite
```bash
# Backend API testing
python spendwise_local_tester.py

# Frontend testing
cd frontend && npm test
```

### Test Results Summary
```
✅ PASS - Register User (HTTP 200)
✅ PASS - Login User (HTTP 200)  
✅ PASS - Premium Status (HTTP 200) - All features FREE
✅ PASS - Create Transaction (HTTP 200)
✅ PASS - Monthly Report (HTTP 200) - AI-powered
✅ PASS - Upgrade Premium (HTTP 200)
```

## 📊 Key Features in Detail

### 🤖 AI Financial Advisor
- **Spending Pattern Analysis**: Identifies trends and anomalies
- **Personalized Recommendations**: Tailored advice based on your habits
- **Budget Optimization**: AI suggests optimal budget allocations
- **Financial Health Score**: Track your financial wellness over time

### 📱 Mobile-First Design
- **Responsive UI**: Optimized for all screen sizes
- **Native Performance**: 60fps animations and smooth interactions
- **Offline Support**: Works without internet connection
- **Cross-Platform**: iOS and Android support

### 🔗 Blockchain Integration
- **Hash-Chained Ledger**: Each transaction cryptographically linked
- **Immutable Records**: Tamper-proof financial history
- **Polygon Anchoring**: Optional on-chain verification
- **Data Integrity**: Cryptographic proof of authenticity

## 🚀 Deployment

### Production Deployment
```bash
# Build frontend
cd frontend && expo build

# Deploy backend
cd backend
docker build -t spendwise-api .
docker run -p 8001:8001 spendwise-api
```

### Environment Setup
- **Development**: Local MongoDB + Expo Dev Client
- **Staging**: Cloud MongoDB + Expo Preview
- **Production**: MongoDB Atlas + Expo EAS Build

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Emergent LLM** for AI integration capabilities
- **Expo Team** for the excellent React Native tooling
- **FastAPI** for the high-performance backend framework
- **MongoDB** for flexible document storage

## 📞 Support

- **Email**: support@spendwise.app
- **Discord**: [Join our community](https://discord.gg/spendwise)
- **Documentation**: [docs.spendwise.app](https://docs.spendwise.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/spendwise/issues)

---

<div align="center">
  <strong>Built with ❤️ for financial freedom</strong>
  <br>
  <sub>Making personal finance management intelligent and accessible</sub>
</div>