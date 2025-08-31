# Movie Interface

A React application with API client for connecting to natetrystuff.com:5000

## Features

- ⚛️ Modern React with functional components and hooks
- 🌐 API client with axios for HTTP requests
- 🎬 Movie search and display functionality
- 📱 Responsive design with modern UI
- 🔄 Loading states and error handling
- 🎨 Beautiful CSS styling with hover effects

## Project Structure

```
movie-interface/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js              # Main React component
│   ├── App.css             # Styling
│   ├── index.js            # Entry point
│   └── apiClient.js        # API client for natetrystuff.com:5000
├── package.json            # Dependencies and scripts
├── webpack.config.js       # Webpack configuration
└── .babelrc               # Babel configuration
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the Application

1. Start the development server:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`

### Available Scripts

- `npm start` - Start development server
- `npm run dev` - Alternative development server command
- `npm run build` - Build for production

## API Client

The app includes a comprehensive API client (`src/apiClient.js`) that connects to `natetrystuff.com:5000` with:

- **Base configuration** with timeout and headers
- **Request/Response interceptors** for logging
- **Error handling** with meaningful error messages
- **Movie-specific methods**:
  - `api.movies.getAll()` - Get all movies
  - `api.movies.getById(id)` - Get movie by ID
  - `api.movies.search(query)` - Search movies
  - `api.movies.create(data)` - Create new movie
  - `api.movies.update(id, data)` - Update movie
  - `api.movies.delete(id)` - Delete movie

## Components

### App Component
- Main functional component using React hooks
- State management for movies, loading, and errors
- Search functionality
- Responsive movie grid display

### MovieCard Component
- Displays individual movie information
- Handles various movie properties (title, year, genre, etc.)
- Responsive card design

## Styling

The app features modern CSS with:
- Gradient headers
- Card-based layouts
- Hover effects and transitions
- Responsive grid system
- Loading and error states
- Mobile-friendly design

## API Integration

The app is configured to work with your API server at `natetrystuff.com:5000`. Make sure your server:

1. Accepts CORS requests from `http://localhost:3000`
2. Returns JSON responses
3. Has endpoints that match the API client methods

Example API endpoints expected:
- `GET /movies` - List all movies
- `GET /movies/:id` - Get specific movie
- `GET /movies/search?q=query` - Search movies
- `POST /movies` - Create movie
- `PUT /movies/:id` - Update movie
- `DELETE /movies/:id` - Delete movie
