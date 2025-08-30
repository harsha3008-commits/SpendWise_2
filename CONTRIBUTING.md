# 🤝 Contributing to SpendWise

Thank you for your interest in contributing to SpendWise! We're excited to welcome new contributors to our privacy-first mobile finance platform.

## 🌟 Code of Conduct

SpendWise is committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, collaborative, and constructive in all interactions.

### Our Values
- **Privacy First**: Always consider user privacy in every decision
- **Security Focused**: Security is not optional, it's fundamental
- **User-Centric**: Build for real user needs and experiences
- **Quality Code**: Write clean, maintainable, and well-tested code
- **Open Collaboration**: Share knowledge and help others succeed

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.11+ and pip
- MongoDB 4.4+
- Git and GitHub account
- Basic knowledge of React Native, FastAPI, and mobile development

### 1. Fork & Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/spendwise.git
cd spendwise
```

### 2. Set Up Development Environment
```bash
# Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration

# Frontend setup  
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Servers
```bash
# Terminal 1: Start MongoDB
mongod --dbpath ./data

# Terminal 2: Start backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3: Start frontend
cd frontend  
npm start
```

### 4. Verify Setup
- Backend API: http://localhost:8001/docs
- Frontend: Follow Expo CLI instructions
- Run tests: `python tests/blockchain_test.py`

---

## 🎯 How to Contribute

### 🐛 Reporting Bugs
1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** with:
   - Clear reproduction steps
   - Expected vs actual behavior
   - Environment details (OS, device, versions)
   - Screenshots/videos if applicable
   - Console logs/error messages

### ✨ Suggesting Features
1. **Check the roadmap** to see if it's already planned
2. **Open a Discussion** before creating issues for major features
3. **Use the feature request template** with:
   - Clear problem statement
   - Proposed solution
   - User stories and use cases
   - Privacy and security considerations

### 🔧 Contributing Code

#### Types of Contributions Welcome
- 🐛 **Bug Fixes**: Fix existing issues
- ✨ **New Features**: Implement planned features
- 📚 **Documentation**: Improve guides and API docs
- 🧪 **Testing**: Add test coverage
- 🎨 **UI/UX**: Improve mobile interface design
- ⚡ **Performance**: Optimize speed and efficiency
- 🔒 **Security**: Enhance privacy and security

#### Development Workflow
1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/amazing-new-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following our coding standards

3. **Write/update tests** for your changes

4. **Test thoroughly**:
   ```bash
   # Backend tests
   python tests/blockchain_test.py
   python tests/backend_test.py
   
   # Frontend tests
   cd frontend && npm test
   
   # Manual testing on mobile
   npm start
   ```

5. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add transaction export functionality"
   # or
   git commit -m "fix: resolve blockchain verification edge case"
   ```

6. **Push and create Pull Request**:
   ```bash
   git push origin feature/amazing-new-feature
   ```

---

## 📝 Coding Standards

### 🏗️ Architecture Principles
- **Privacy by Design**: No unnecessary data collection
- **Local-First**: Core features work offline
- **Security First**: Encrypt sensitive data
- **Mobile-Native**: Touch-friendly, responsive design
- **Performance**: Optimize for mobile devices

### 📱 Frontend (React Native + TypeScript)
```typescript
// Use TypeScript for all new code
interface Transaction {
  id: string;
  amount: number;
  // ... other properties
}

// Follow React Native patterns
const TransactionCard: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.amount}>{transaction.amount}</Text>
    </TouchableOpacity>
  );
};

// Use StyleSheet.create()
const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
});
```

### ⚡ Backend (Python + FastAPI)
```python
# Use type hints and Pydantic models
from pydantic import BaseModel
from typing import List, Optional

class Transaction(BaseModel):
    id: str
    amount: float
    currency: str = "INR"

# Follow FastAPI patterns
@app.get("/transactions", response_model=List[Transaction])
async def get_transactions(skip: int = 0, limit: int = 100):
    return await db.transactions.find().skip(skip).limit(limit).to_list(limit)

# Use async/await for database operations
async def create_transaction(transaction: Transaction) -> Transaction:
    result = await db.transactions.insert_one(transaction.dict())
    return transaction
```

### 🧪 Testing Requirements
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database operations
- **Mobile Tests**: Test UI components and user flows
- **Security Tests**: Test encryption and blockchain features

```python
# Example test structure
def test_transaction_hash_computation(self):
    """Test that transaction hashes are computed correctly"""
    transaction = create_test_transaction()
    hash_result = compute_transaction_hash(transaction)
    
    self.assertIsNotNone(hash_result)
    self.assertEqual(len(hash_result), 64)  # SHA-256 length
```

### 📚 Documentation Standards
- **README Updates**: Update for new features
- **API Documentation**: Use FastAPI automatic docs
- **Code Comments**: Explain complex blockchain logic
- **Type Annotations**: Use TypeScript/Python type hints

---

## 🔒 Security Guidelines

### Privacy Protection
- **No Telemetry**: Don't add tracking or analytics
- **Local Storage**: Keep sensitive data on device
- **Encryption**: Encrypt all user data at rest
- **Minimal Permissions**: Request only necessary permissions

### Code Security
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries
- **Authentication**: Secure API endpoints properly
- **Error Handling**: Don't expose sensitive info in errors

### Blockchain Security
- **Hash Verification**: Always verify transaction hashes
- **Chain Integrity**: Maintain proper blockchain linking
- **Crypto Libraries**: Use well-tested crypto functions
- **Key Management**: Handle private keys securely

---

## 📋 Pull Request Process

### 1. Pre-Submit Checklist
- [ ] Code follows style guidelines
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No sensitive data in commits
- [ ] Branch up to date with main
- [ ] Self-review completed

### 2. Pull Request Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)  
- [ ] Breaking change (fix or feature that changes existing functionality)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Mobile testing on iOS/Android

## Privacy & Security
- [ ] No new data collection
- [ ] Proper encryption used
- [ ] Security review completed

## Screenshots (if UI changes)
Add screenshots or GIFs showing changes.
```

### 3. Review Process
1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainer reviews code quality
3. **Privacy Review**: Ensure privacy-first principles
4. **Security Review**: Check for security implications
5. **Mobile Testing**: Test on actual devices
6. **Final Approval**: Merge when all checks pass

---

## 🎯 Feature Development Guidelines

### 🔄 Blockchain Features
When working with blockchain functionality:
- Maintain backward compatibility with existing chains
- Thoroughly test hash computation changes
- Consider performance impact on mobile devices
- Verify cryptographic security

### 💳 Payment Features
When working with payment integration:
- Test with Razorpay test keys only
- Never commit real payment credentials
- Handle all error cases gracefully
- Follow PCI compliance guidelines

### 📱 Mobile Features
When developing mobile UI:
- Test on multiple screen sizes
- Ensure accessibility compliance
- Optimize for touch interaction
- Consider offline functionality

---

## 🌍 Community

### 💬 Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code review and collaboration
- **Email**: security@spendwise.app for security issues

### 🎓 Learning Resources
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Expo Documentation**: https://docs.expo.dev/
- **MongoDB Docs**: https://docs.mongodb.com/
- **Blockchain Basics**: Understanding hash chains and Merkle trees

### 🏆 Recognition
Contributors will be recognized in:
- README acknowledgments
- Release notes for significant contributions
- Special contributor badge
- Annual contributor highlights

---

## 📞 Getting Help

### 🤔 Questions?
- Check existing GitHub Issues and Discussions
- Review documentation in `/docs`
- Ask in GitHub Discussions for general questions

### 🐛 Stuck on a Bug?
- Search existing issues first
- Provide detailed reproduction steps
- Include relevant logs and screenshots

### 🔒 Security Concerns?
- **DO NOT** post security issues publicly
- Email: security@spendwise.app
- We'll respond within 24 hours

---

## 🙏 Thank You!

Every contribution helps make SpendWise better for privacy-conscious users worldwide. Whether you're fixing a small bug or adding a major feature, your effort is valued and appreciated.

**Together, we're building the future of private, secure, and user-controlled financial management. 🚀**

---

*Last updated: August 2024*
*For questions about contributing, please open a Discussion or email: contribute@spendwise.app*