# Gemini Project Context: FlyEnv

## Project Overview

This project, FlyEnv, is a cross-platform desktop application built with Electron. Its primary purpose is to serve as an all-in-one, full-stack environment management tool for developers. It allows users to easily install, manage, and switch between multiple versions of various programming languages (like PHP, NodeJS, Java, Go) and services (like Nginx, Apache, MySQL, Redis, MongoDB).

The application provides a graphical user interface to manage these services and configurations, aiming to be a more lightweight and native alternative to container-based solutions like Docker.

## Technology Stack

*   **Framework:** Electron
*   **Main Process (Backend):** TypeScript, Node.js
*   **Renderer Process (Frontend):** Vue.js 3, Vite, TypeScript
*   **Styling:** Tailwind CSS with the Element Plus component library.
*   **Build Tools:** `electron-builder` for packaging, `esbuild` for the main process, and `Vite` for the renderer process.
*   **Linting & Formatting:** ESLint and Prettier are used to maintain code quality and consistency.
*   **Package Manager:** The project uses `yarn`.

## Building and Running

The core commands for development are defined in `package.json`.

*   **Install Dependencies:**
    ```bash
    yarn install
    ```

*   **Run in Development Mode:** This command starts the application with hot-reloading enabled for the renderer process.
    ```bash
    yarn run dev
    ```

*   **Build for Production:** This command compiles the TypeScript and Vue.js code and packages it into a distributable application for the host operating system.
    ```bash
    yarn run build
    ```

## Development Conventions

*   **Code Style:** The project uses Prettier for automated code formatting and ESLint for identifying and fixing problems in the code. The specific rules can be found in `prettier.config.mjs` and `eslint.config.mjs`.
*   **Architecture:** The application follows the standard Electron model of a main process and a renderer process.
    *   Main process source code is located in `src/main`.
    *   Renderer process (Vue application) source code is in `src/render`.
    *   Shared code used by both processes can be found in `src/shared`.
*   **Dependencies:** Project dependencies are managed in `package.json` and installed using `yarn`.
