Inventory Frontend

A modern and responsive frontend application for the Inventory Management System built using React.js.
This project connects with the Inventory Backend API to manage products, suppliers, billing and users through a clean UI.

🚀 Features

✔ User Login & Authentication
✔ Dashboard Overview
✔ Supplier List & Management
✔ Product List & Management
✔ Billing Interface
✔ Responsive UI
✔ API Integration with Backend
✔ Uses React Hooks & Functional Components

🖥️ Tech Stack

Frontend: React.js

State Management: React Hooks

UI Library: Bootstrap / Tailwind / Material UI (modify based on your project)

HTTP Client: Axios / Fetch API

Routing: React Router

📁 Project Structure
inventory-frontend/
│
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── App.js
│   ├── index.js
├── .gitignore
├── package.json
├── README.md
└── yarn.lock / package-lock.json
⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/mahalakshmi0606/InventoryFrontEnd.git
cd InventoryFrontEnd
2️⃣ Install Dependencies
npm install

or if you use yarn:

yarn install
3️⃣ Configure Environment

Create a .env file in the project root and set your backend API URL:

REACT_APP_API_BASE_URL=http://127.0.0.1:5000/api

You can update the URL based on where your backend is hosted.

4️⃣ Start the Application
npm start

or

yarn start

The app should open in your browser at:

http://localhost:3000
🔗 API Integration

This frontend connects with your Inventory Backend API.
Make sure your backend is running before testing features like login, product lists, billing, etc.

Example API Routes (used in frontend):

Feature	API Endpoint
Login	/api/login
Users	/api/users
Products	/api/products
Suppliers	/api/suppliers
Billing	/api/bills
🧪 Testing

You can test the features of the frontend by:

Filling forms and validating submissions

Checking product/supplier list rendering

Testing API integration using Developer Tools (Network tab)

📌 Notes

✔ Make sure your backend CORS policy allows requests from the frontend
✔ Update .env if deploying to production
✔ Add authentication tokens to API requests

🔮 Future Enhancements

Add Pagination & Search

Implement User Roles & Permissions

Add Charts & Dashboard Analytics

Notifications (toasts & alerts)

Dark/Light Theme Support

👩‍💻 Author

Mahalakshmi M
Inventory Frontend Developer

GitHub: https://github.com/mahalakshmi0606

📄 License

This project is open-source and available for personal and educational use.
