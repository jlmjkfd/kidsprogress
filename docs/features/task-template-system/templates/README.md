# Available Templates

This directory contains documentation for all available task templates in the KidsProgress system.

## Current Templates

### 📐 Math Templates

#### [Addition & Subtraction](./addition-subtraction/)
**ID**: `addition-subtraction`
**Status**: ✅ Complete
**Description**: Practice addition and subtraction with configurable difficulty levels

**Key Features**:
- Configurable number range (10-10000)
- 1-100 questions per session
- Optional carry/borrow only mode
- Built-in timer
- Immediate feedback

**Best For**: Elementary school math practice (Grades 1-6)

---

### ✍️ Language Arts Templates

#### [Writing](./writing/)
**ID**: `writing`
**Status**: ✅ Complete
**Description**: Creative writing with optional AI-powered feedback

**Key Features**:
- Writing prompts to guide creativity
- Word count tracking
- Min/max word limits
- AI feedback on quality
- Writing portfolio

**Best For**: Creative writing, journal entries, essay practice

---

## Template Comparison

| Feature | Addition-Subtraction | Writing |
|---------|---------------------|---------|
| Auto-grading | ✅ Yes | ⚠️ AI optional |
| Timer | ✅ Yes | ❌ No |
| Difficulty levels | ✅ Configurable | ⚠️ Via prompts |
| AI integration | ❌ No | ✅ Optional |
| Multi-language | ✅ EN, ZH | ✅ EN, ZH |
| Draft saving | ❌ No | ✅ Optional |

## Planned Templates

### 🔢 Math
- [ ] Multiplication & Division
- [ ] Fractions & Decimals
- [ ] Geometry (shapes, angles)
- [ ] Word Problems

### 📖 Language Arts
- [ ] Reading Comprehension
- [ ] Spelling Practice
- [ ] Vocabulary Builder
- [ ] Grammar Exercises

### 🌍 Other Subjects
- [ ] Geography Quiz
- [ ] Science Experiments
- [ ] History Timeline
- [ ] Music Practice Log

### 🎯 Skill Building
- [ ] Typing Practice
- [ ] Memory Games
- [ ] Logic Puzzles
- [ ] Drawing Canvas

### 📊 Tracking
- [ ] Habit Tracker
- [ ] Chore Checklist
- [ ] Reading Log
- [ ] Practice Time Tracker

## Template Selection Guide

### By Age Group

**Ages 5-7 (Early Elementary)**
- Addition & Subtraction (max_value: 20)
- Writing (min_length: 50 words, with prompts)

**Ages 8-10 (Elementary)**
- Addition & Subtraction (max_value: 100, carry mode)
- Writing (min_length: 100 words)

**Ages 11-13 (Middle School)**
- Addition & Subtraction (max_value: 1000+)
- Writing (min_length: 200+ words, AI feedback)

### By Learning Goal

**Skill Practice**
- Use Addition-Subtraction for repetitive practice
- Set high question count (20-50)
- Enable timer for speed building

**Creative Development**
- Use Writing template
- Provide open-ended prompts
- Enable AI feedback for guidance

**Assessment**
- Use Addition-Subtraction with fixed settings
- Compare scores across multiple attempts
- Track accuracy trends

### By Time Available

**5-10 minutes**
- Addition-Subtraction: 10 questions
- Writing: 50-100 words

**15-20 minutes**
- Addition-Subtraction: 20-30 questions
- Writing: 100-200 words

**30+ minutes**
- Addition-Subtraction: 50+ questions
- Writing: 300+ words, multiple drafts

## Creating Your Own Template

Want to add a new template? See our [Plugin Development Guide](../guidelines/guide-template-development.md).

### Template Checklist

- [ ] Identify clear learning objective
- [ ] Design execution interface (child view)
- [ ] Plan configuration options (parent settings)
- [ ] Define data structure (what to capture)
- [ ] Design analytics view (progress tracking)
- [ ] Implement all 4 components
- [ ] Add EN + ZH translations
- [ ] Create backend handler
- [ ] Write tests
- [ ] Document thoroughly

## Template Marketplace

**Coming Soon**: Browse and install community-created templates!

Features planned:
- Template ratings and reviews
- Template categories and tags
- Premium vs free templates
- Template dependencies
- Version management
- One-click installation

## Contributing Templates

We welcome template contributions! See [Contributing Guidelines](../guidelines/guide-template-development.md#contributing).

### Contribution Process

1. **Proposal**: Open an issue describing your template idea
2. **Design Review**: Discuss UI/UX and data structure
3. **Implementation**: Build following our plugin architecture
4. **Testing**: Add comprehensive tests
5. **Documentation**: Write clear README
6. **PR**: Submit pull request for review
7. **Launch**: Template added to available templates!

### Quality Standards

All templates must meet:
- ✅ Follow plugin interface exactly
- ✅ Mobile-responsive design
- ✅ Support EN and ZH languages
- ✅ Include comprehensive tests
- ✅ Have clear documentation
- ✅ Pass accessibility checks
- ✅ Handle errors gracefully

## Template Analytics

Each template tracks its own metrics:

### Common Metrics (All Templates)
- Completion rate
- Time spent
- Number of attempts
- Child engagement score

### Template-Specific Metrics
- **Addition-Subtraction**: Accuracy, speed per question
- **Writing**: Word count, AI scores, improvement trends

## Support & Feedback

### Template Issues

If you encounter issues with a template:
1. Check the template's README for common issues
2. Verify your configuration settings
3. Test with default settings
4. Report bug with template ID and error details

### Feature Requests

Want a feature in an existing template?
1. Check the template's README for planned features
2. Open a feature request issue
3. Tag with template ID
4. Describe use case and benefit

### General Questions

For general questions about templates:
- See [Troubleshooting Guide](../TROUBLESHOOTING.md)
- Read [Plugin Development Guide](../guidelines/guide-template-development.md)
- Check [Plugin Architecture](../guidelines/PLUGIN_ARCHITECTURE.md)

## Version History

| Date | Change |
|------|--------|
| 2024-11 | Documentation reorganization, added template READMEs |
| 2024-11 | Initial template documentation |
