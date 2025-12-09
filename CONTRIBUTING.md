# Contributing to Office Ninja Pro

Thanks for your interest in contributing! Here's how to get started.

## Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature or fix
4. **Make changes** and test them
5. **Submit a pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/OfficeNinjaDimmer.git
cd OfficeNinjaDimmer

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the project folder
```

No build tools required — it's all vanilla JavaScript.

## Project Structure

| Folder | Purpose |
|--------|---------|
| `popup/` | Extension popup UI |
| `options/` | Settings page |
| `content/` | Scripts injected into web pages |
| `background/` | Service worker |
| `utils/` | Shared utilities |

## Code Style

- **Variables**: Use descriptive names (`overlayOpacity` not `op`)
- **Functions**: Use verb prefixes (`applySettings`, `removeDisguise`)
- **Comments**: Explain *why*, not *what*
- **Formatting**: 4-space indentation, semicolons

## Testing Checklist

Before submitting, verify:

- [ ] Popup opens without errors
- [ ] Sliders update effects in real-time
- [ ] Tab disguise changes title and favicon
- [ ] Decoy tabs open on panic
- [ ] Per-site settings persist
- [ ] Options page loads and saves correctly
- [ ] Keyboard shortcuts work

## Commit Messages

Use conventional commits:

```
feat: add custom decoy tabs
fix: widget duplication issue
docs: update README
ui: polish popup styling
```

## Pull Request Process

1. Update `CHANGELOG.md` with your changes
2. Test on at least Chrome stable
3. Keep PRs focused — one feature per PR
4. Respond to review feedback promptly

## Found a Bug?

Open an issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Chrome version

## Feature Requests

Open an issue describing:
- The problem you're solving
- Your proposed solution
- Any alternatives you considered

---

Thanks for helping make Office Ninja Pro better! 🥷
