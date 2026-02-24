# Contributing to Agentic App Template

Thank you for your interest in contributing! 🎉

## 🎯 About This Template

This is a **template repository** designed to be **forked and customized** for building your own AI-powered agentic applications. We encourage you to:

- ✅ Fork this repo
- ✅ Customize it for your needs
- ✅ Build amazing apps
- ✅ Share your creations with the community

## 🐛 Reporting Issues

Found a bug or have a feature suggestion? We'd love to hear from you!

### Before Opening an Issue

1. Check if the issue already exists
2. Make sure you're using the latest version
3. Gather relevant information:
   - Python version
   - Operating system
   - Steps to reproduce
   - Error messages or logs

### Opening an Issue

[Open an issue](../../issues/new) with:
- **Clear title** - Describe the problem concisely
- **Description** - Detailed explanation of the issue
- **Steps to reproduce** - How can we recreate it?
- **Expected behavior** - What should happen?
- **Actual behavior** - What actually happens?
- **Environment** - OS, Python version, etc.
- **Logs** - Any relevant error messages

## 💡 Feature Requests

Have an idea to improve the template?

1. [Open a feature request](../../issues/new)
2. Describe the feature and its use case
3. Explain why it would be valuable
4. Consider if it fits the template's purpose

## 🔧 Pull Requests

Want to contribute code? Awesome! Here's how:

### 1. Fork & Clone

```bash
# Fork this repo on GitHub first
git clone https://github.com/YOUR_USERNAME/agentic-app-seed.git
cd agentic-app-seed
```

### 2. Create a Branch

```bash
git checkout -b feature/my-awesome-feature
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Follow existing code style
- Add tests if applicable
- Update documentation
- Keep commits focused and clear

### 4. Test Your Changes

```bash
# Run the backend
docker-compose up

# Test your changes
curl http://localhost:8000/health

# Run any existing tests
cd clarity_sdk
python tests/examples/simple_agent_example.py
```

### 5. Submit Pull Request

```bash
git add .
git commit -m "feat: add awesome feature"
git push origin feature/my-awesome-feature
```

Then open a PR on GitHub with:
- Clear description of changes
- Why the change is needed
- Any breaking changes
- Screenshots (if UI changes)

## 📝 Coding Guidelines

### Python Style

- Follow [PEP 8](https://pep8.org/)
- Use type hints
- Write docstrings for functions
- Keep functions focused and small

```python
# Good ✅
async def execute(self, context: AgentContext) -> AgentResult:
    """Execute the agent with the given context.

    Args:
        context: The agent execution context

    Returns:
        AgentResult with success status and data
    """
    pass

# Bad ❌
def execute(context):
    pass
```

### Documentation

- Update README if adding features
- Add code comments for complex logic
- Keep documentation in sync with code

### Commit Messages

Use conventional commits:

```
feat: add new agent decorator
fix: resolve database connection issue
docs: update README with examples
refactor: simplify workflow executor
test: add tests for trigger system
```

## 🚀 Development Setup

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/agentic-app-seed.git
cd agentic-app-seed

# Install SDK in editable mode
cd clarity_sdk
pip install -e .

# Install backend dependencies
cd ../backend
pip install -r requirements.txt

# Start PostgreSQL
docker-compose up postgres

# Run backend
python main.py
```

### Using Docker

```bash
# Start everything
docker-compose up

# Rebuild after changes
docker-compose up --build
```

## ❓ Questions?

- 📖 Read the [documentation](README.md)
- 💬 Open a [discussion](../../discussions)
- 📧 Email support: support@clarity.ai

## 🙏 Thank You!

Every contribution, no matter how small, helps make this template better for everyone. We appreciate your support!

---

**Happy coding!** 🚀

*Built with ❤️ by the Clarity community*
