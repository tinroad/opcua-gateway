# Contributing to the OPC Gateway Project

Thank you for your interest in contributing to the OPC Gateway project! We welcome contributions from everyone. Here are some guidelines to help you get started.

## How to Contribute

1. **Fork the Repository**: Click on the "Fork" button at the top right of the repository page to create your own copy of the project. This allows you to freely experiment with changes without affecting the original project.

2. **Clone Your Fork**: Use the following command to clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/tinroad/opcua-gateway.git
   ```
   This command creates a local copy of your forked repository, allowing you to work on it offline.

3. **Create a Branch**: Before making any changes, create a new branch for your feature or bug fix:
   ```bash
   git checkout -b my-feature-branch
   ```
   Naming your branch descriptively (e.g., `fix-bug-123` or `add-new-feature`) helps others understand the purpose of your changes.

4. **Make Your Changes**: Implement your feature or fix the bug. Be sure to write clear, concise commit messages. This helps maintain a clean project history. For example:
   ```bash
   git commit -m "Fix issue with user authentication"
   ```

5. **Run Tests**: Ensure that all tests pass before submitting your changes. You can run the tests using:
   ```bash
   npm test
   ```
   Running tests helps ensure that your changes do not introduce new bugs.

6. **Commit Your Changes**: Once you are satisfied with your changes, commit them:
   ```bash
   git commit -m "Add my feature"
   ```
   Make sure to include a detailed description of what your changes do and why they are necessary.

7. **Push to Your Fork**: Push your changes to your forked repository:
   ```bash
   git push origin my-feature-branch
   ```
   This uploads your changes to your GitHub fork, making them available for review.

8. **Create a Pull Request**: Go to the original repository and click on the "New Pull Request" button. Select your branch and submit the pull request. Provide a clear description of your changes and any relevant context to help reviewers understand your work.

## Code of Conduct

Please adhere to the [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions related to this project. This ensures a welcoming and respectful environment for all contributors.

## Code Style Guide

- Use `camelCase` for variable and function names.
- Use `PascalCase` for class names.
- Ensure that your code is well-commented and that comments are clear and concise.

## Testing

- To add new tests, follow the format of existing tests in the `__tests__` folder.
- Run tests with the following command:
  ```bash
  npm test
  ```

## Documentation

- Use JSDoc to document functions and classes. Ensure that each function has a clear description of its purpose and parameters.

## Code Review Process

- All pull requests must be reviewed by at least one maintainer before being merged.
- Ensure that your pull request is related to a specific issue or feature.

## Common Issues

- If you encounter an error when running the project, make sure all dependencies are installed correctly.
- Check the "Issues" section in the repository to see if anyone else has encountered a similar problem.

## Additional Resources

- [Issue Tracker](https://github.com/tinroad/opcua-gateway/issues): Please use the GitHub Issues section to report bugs, request features, or ask questions. This helps us keep track of all contributions and ensures that nothing gets overlooked.

## Contact

If you have questions or need help, feel free to open an issue in the repository or contact the maintainers directly.

We appreciate your contributions and look forward to collaborating with you!
