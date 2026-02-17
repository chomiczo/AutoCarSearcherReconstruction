# AutoCarSearcherReconstruction 🚗

> **EDUCATIONAL PROOF OF CONCEPT (PoC)**
>
> This repository is a technical demonstration of building a full-stack media management system. It focuses on implementing user authentication, relational database management (SQLite), and asynchronous data streaming using FastAPI. 
>
> **Disclaimer:** This software is intended for personal, private use and educational learning only. The developer does not host or distribute copyrighted material and assumes no liability for misuse of this code. Users are responsible for adhering to all applicable laws and third-party Terms of Service.

## 🛠️ Technical Implementation

The project demonstrates a modern architecture for managing personal media collections and user-specific data structures.

### Core Functionalities
* **Authentication Engine:** Secure login/registration system with bcrypt password hashing and SMTP-based account verification.
* **Dynamic Content Management:** User-specific library with relational mapping for personal collections (playlists).
* **Asynchronous API:** Built with FastAPI for high-concurrency handling of data requests.
* **PWA Interface:** A mobile-first responsive frontend designed as a Progressive Web App for cross-platform compatibility.
* **Smart Queue Management:** Advanced logic for handling sequential and randomized data playback based on user context.

## 🏗️ Project Structure

The project is divided into two main components:
* **`/backend`**: Python-based server handling logic, database operations, and API endpoints.
* **`/frontend`**: Modern, vanilla JS and Tailwind CSS interface for data visualization and interaction.

## ⚙️ Installation & Setup

1. **Prepare Environment:**
   Install the necessary Python dependencies:
   ```bash
   pip install -r requirements.txt
