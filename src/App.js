import React, { useState, useEffect, useRef } from 'react';
import { api } from './apiClient';
import './App.css';

const App = () => {
  const [files, setFiles] = useState([]);
  const [moviePaths, setMoviePaths] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false); // Separate state for file fetching during autoprocess
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPath, setNewPath] = useState('');
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'paths', 'search'
  const [selectedFile, setSelectedFile] = useState(null);
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [isSearchingMovie, setIsSearchingMovie] = useState(false);
  const [searchedFile, setSearchedFile] = useState(null);
  const [acceptingMovieId, setAcceptingMovieId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [autoProcessResults, setAutoProcessResults] = useState([]);
  const [processingFiles, setProcessingFiles] = useState(new Set()); // Track which files are currently being processed
  const [completedFiles, setCompletedFiles] = useState(new Set()); // Track completed files
  const [currentConcurrencyLimit, setCurrentConcurrencyLimit] = useState(8); // Track current concurrency limit
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false); // Filter to show only unassigned movies
  const [alternateMovieName, setAlternateMovieName] = useState(''); // State for alternate movie name input
  const processingRef = useRef(false);

  // Helper function to update selected file reference when files array changes
  useEffect(() => {
    if (selectedFile) {
      // Find the updated file object by path to maintain selection
      const updatedFile = files.find(f => f.path === selectedFile.path);
      if (updatedFile && updatedFile !== selectedFile) {
        setSelectedFile(updatedFile);
      }
    }
    
    if (searchedFile) {
      // Find the updated file object by path to maintain search context
      const updatedFile = files.find(f => f.path === searchedFile.path);
      if (updatedFile && updatedFile !== searchedFile) {
        setSearchedFile(updatedFile);
      }
    }
  }, [files, selectedFile, searchedFile]);

  // Fetch data on component mount
  useEffect(() => {
    fetchFiles();
    fetchMoviePaths();
  }, []);

  const generateFilenameInfo = (file) => {
    if (!file.movie) return null;
    
    // Generate standard filename: Title_YYYY.extension
    const title = file.movie.title || 'Unknown_Movie';
    const releaseDate = file.movie.release_date || '';
    
    let year = '';
    if (releaseDate) {
      try {
        year = releaseDate.split('-')[0]; // Extract year from YYYY-MM-DD format
      } catch (e) {
        // Ignore error
      }
    }
    
    // Clean title: remove special characters and replace spaces with underscores
    const cleanTitle = title.replace(' ', '_').replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Extract file extension
    const extension = file.name ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const standardFilename = year ? `${cleanTitle}_${year}${extension}` : `${cleanTitle}${extension}`;
    
    return {
      current_filename: file.name,
      standard_filename: standardFilename,
      needs_rename: file.name !== standardFilename
    };
  };

  const generateFolderInfo = (file) => {
    if (!file.movie) return null;
    
    // Extract folder name from directory path
    const currentFoldername = file.directory ? file.directory.split('/').pop() : '';
    
    // Generate standard folder name: Title_YYYY
    const title = file.movie.title || 'Unknown_Movie';
    const releaseDate = file.movie.release_date || '';
    
    let year = '';
    if (releaseDate) {
      try {
        year = releaseDate.split('-')[0]; // Extract year from YYYY-MM-DD format
      } catch (e) {
        // Ignore error
      }
    }
    
    // Clean title: remove special characters and replace spaces with underscores
    const cleanTitle = title.replace(' ', '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const standardFoldername = year ? `${cleanTitle}_${year}` : cleanTitle;
    
    return {
      current_foldername: currentFoldername,
      current_folder_path: file.directory,
      standard_foldername: standardFoldername,
      needs_rename: currentFoldername !== standardFoldername
    };
  };

  const fetchFiles = async (duringAutoProcess = false) => {
    // Use separate loading state during autoprocessing to avoid hiding UI
    if (duringAutoProcess) {
      setFetchingFiles(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await api.files.getAll();
      
      // Add missing filename and folder info for existing assignments
      const filesWithInfo = (data.files || []).map(file => {
        if (file.movie) {
          const updates = {};
          
          // Add filename info if missing
          if (!file.filenameInfo) {
            updates.filenameInfo = generateFilenameInfo(file);
          }
          
          // Add folder info if missing
          if (!file.folderInfo) {
            updates.folderInfo = generateFolderInfo(file);
          }
          
          return { ...file, ...updates };
        }
        return file;
      });
      
      setFiles(filesWithInfo);
    } catch (err) {
      setError('Failed to fetch files: ' + err.message);
      console.error('Error fetching files:', err);
    } finally {
      if (duringAutoProcess) {
        setFetchingFiles(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchMoviePaths = async () => {
    try {
      const data = await api.moviePaths.getAll();
      setMoviePaths(data.movie_file_paths || []);
    } catch (err) {
      console.error('Error fetching movie paths:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.movies.search(searchQuery);
      // Extract results from the nested TMDB response
      const results = data.tmdb_results?.results || [];
      setSearchResults(results);
    } catch (err) {
      setError('Search failed: ' + err.message);
      console.error('Error searching movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPath = async (e) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.moviePaths.add(newPath.trim());
      setNewPath('');
      await fetchMoviePaths();
      await fetchFiles(); // Refresh files after adding path
    } catch (err) {
      setError('Failed to add path: ' + err.message);
      console.error('Error adding path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePath = async (path) => {
    setLoading(true);
    setError(null);
    try {
      await api.moviePaths.remove(path);
      await fetchMoviePaths();
      await fetchFiles(); // Refresh files after removing path
    } catch (err) {
      setError('Failed to remove path: ' + err.message);
      console.error('Error removing path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSearchQuery('');
    setSearchResults([]);
    fetchFiles();
    fetchMoviePaths();
  };

  const handleFindMovie = async (file) => {
    setIsSearchingMovie(true);
    setMovieSearchResults([]);
    setSearchedFile(file);
    try {
      // Use alternate movie name if provided, otherwise extract from filename
      let searchTerm;
      if (alternateMovieName.trim()) {
        searchTerm = alternateMovieName.trim();
      } else {
        // Extract movie name from filename for search
        const fileName = file.name.replace(/\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i, '');
        
        // Extract year from filename (look for 4-digit year)
        const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : null;
        
        // Clean the filename and remove the year for the base search term
        const baseSearchTerm = fileName.replace(/[._-]/g, ' ').replace(/\b(19|20)\d{2}\b/g, '').trim();
        
        // Include year in search term if found
        searchTerm = year ? `${baseSearchTerm} ${year}` : baseSearchTerm;
      }
      
      const data = await api.movies.search(searchTerm);
      // Extract results from the nested TMDB response
      const results = data.tmdb_results?.results || [];
      setMovieSearchResults(results);
    } catch (err) {
      setError('Movie search failed: ' + err.message);
      console.error('Error searching movies:', err);
    } finally {
      setIsSearchingMovie(false);
    }
  };

  const handleAcceptMovie = async (movie) => {
    if (!selectedFile) return;
    
    setAcceptingMovieId(movie.id);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Send the assignment to the backend
      const response = await api.movies.assign(selectedFile.path, movie);
      
      // Update the file with the selected movie information, filename info, and folder info
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file === selectedFile 
            ? { 
                ...file, 
                movie: movie,
                filenameInfo: response.filenameInfo,
                folderInfo: response.folderInfo
              }
            : file
        )
      );
      
      // Show success message
      setSuccessMessage(`Successfully assigned "${movie.title}" to "${selectedFile.name}"`);
      
      // Clear search results after a short delay to show success
      setTimeout(() => {
        setMovieSearchResults([]);
        setSearchedFile(null);
        setSuccessMessage('');
        setAlternateMovieName(''); // Clear alternate movie name when movie is accepted
      }, 2000);
      
      console.log(`Successfully assigned "${movie.title}" to "${selectedFile.name}"`);
    } catch (err) {
      setError('Failed to assign movie: ' + err.message);
      console.error('Error assigning movie:', err);
    } finally {
      setAcceptingMovieId(null);
    }
  };

  const handleRemoveMovieAssignment = async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      // Send the removal request to the backend
      await api.movies.removeAssignment(file.path);
      
      // Update the file to remove the movie assignment
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f === file 
            ? { ...f, movie: undefined, filenameInfo: undefined }
            : f
        )
      );
      
      console.log(`Successfully removed movie assignment from "${file.name}"`);
    } catch (err) {
      setError('Failed to remove movie assignment: ' + err.message);
      console.error('Error removing movie assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameFile = async (file, newFilename) => {
    const fileId = file.path; // Use file path as unique identifier
    setRenamingFileId(fileId);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Send the rename request to the backend
      const response = await api.movies.renameFile(file.path, newFilename);
      
      // Update the file list with the new path and name
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f === file 
            ? { 
                ...f, 
                path: response.new_path,
                name: newFilename,
                filenameInfo: undefined // Clear filename info since it's now standard
              }
            : f
        )
      );
      
      // Show success message
      setSuccessMessage(`Successfully renamed file to "${newFilename}"`);
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      console.log(`Successfully renamed file to "${newFilename}"`);
    } catch (err) {
      setError('Failed to rename file: ' + err.message);
      console.error('Error renaming file:', err);
    } finally {
      setRenamingFileId(null);
    }
  };

  const handleRenameFolder = async (file, newFoldername) => {
    const folderId = file.folderInfo.current_folder_path; // Use folder path as unique identifier
    setRenamingFolderId(folderId);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Send the folder rename request to the backend
      const response = await api.movies.renameFolder(file.folderInfo.current_folder_path, newFoldername);
      
      // Update all files that were in the renamed folder
      setFiles(prevFiles => 
        prevFiles.map(f => {
          // Check if this file was in the renamed folder
          if (f.directory === file.folderInfo.current_folder_path || 
              f.path.startsWith(file.folderInfo.current_folder_path + '/')) {
            // Update the file's path and directory to reflect the new folder name
            const newPath = f.path.replace(file.folderInfo.current_folder_path, response.new_path);
            const newDirectory = f.directory.replace(file.folderInfo.current_folder_path, response.new_path);
            
            return {
              ...f,
              path: newPath,
              directory: newDirectory,
              folderInfo: f.folderInfo ? undefined : f.folderInfo // Clear folder info since it's now standard
            };
          }
          return f;
        })
      );
      
      // Show success message
      setSuccessMessage(`Successfully renamed folder to "${newFoldername}"`);
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      console.log(`Successfully renamed folder to "${newFoldername}"`);
    } catch (err) {
      setError('Failed to rename folder: ' + err.message);
      console.error('Error renaming folder:', err);
    } finally {
      setRenamingFolderId(null);
    }
  };

  const handleDeleteFile = async (file) => {
    const fileId = file.path; // Use file path as unique identifier
    setDeletingFileId(fileId);
    setError(null);
    
    try {
      // Send the delete request to the backend
      await api.movies.deleteFile(file.path);
      
      // Start fade animation, then remove from list
      setTimeout(() => {
        setFiles(prevFiles => prevFiles.filter(f => f.path !== file.path));
        
        // Clear selection if this file was selected
        if (selectedFile === file) {
          setSelectedFile(null);
        }
        
        // Clear the deleting state to re-enable other delete buttons
        setDeletingFileId(null);
      }, 400); // Match the CSS animation duration
      
    } catch (err) {
      setError('Failed to delete file: ' + err.message);
      console.error('Error deleting file:', err);
      setDeletingFileId(null); // Reset on error
    }
  };



  const handleClearSearchResults = () => {
    setMovieSearchResults([]);
    setSearchedFile(null);
    setAlternateMovieName(''); // Clear alternate movie name when clearing search results
  };



  const handleAutoProcess = async () => {
    if (processingRef.current) {
      // Stop processing
      processingRef.current = false;
      setIsAutoProcessing(false);
      setCurrentProcessingIndex(-1);
      setProcessingFiles(new Set());
      setCompletedFiles(new Set());
      return;
    }

    // Start processing
    processingRef.current = true;
    setIsAutoProcessing(true);
    setCurrentProcessingIndex(0);
    setAutoProcessResults([]);
    setProcessingFiles(new Set());
    setCompletedFiles(new Set());
    setError(null);

    const unprocessedFiles = files.filter(file => !file.movie);
    // Dynamic concurrency: more files = higher concurrency, but cap at 15 for stability
    const CONCURRENCY_LIMIT = Math.min(15, Math.max(8, Math.ceil(unprocessedFiles.length / 3)));
    setCurrentConcurrencyLimit(CONCURRENCY_LIMIT);
    
    // Function to process a single file
    const processFile = async (file, index) => {
      if (!processingRef.current) return;
      
      // Mark file as being processed
      setProcessingFiles(prev => new Set([...prev, file.path]));
      setCurrentProcessingIndex(index);

      try {
        // Search for movie using the filename
        const fileName = file.name.replace(/\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i, '');
        
        // Extract year from filename (look for 4-digit year)
        const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : null;
        
        // Clean the filename and remove the year for the base search term
        const baseSearchTerm = fileName.replace(/[._-]/g, ' ').replace(/\b(19|20)\d{2}\b/g, '').trim();
        
        // Include year in search term if found
        const searchTerm = year ? `${baseSearchTerm} ${year}` : baseSearchTerm;
        
        // Use the search API which now includes OpenAI cleaning
        const searchData = await api.movies.search(searchTerm);
        const results = searchData.tmdb_results?.results || [];
        
        if (results.length > 0) {
          const bestMatch = results[0]; // Use the first (best) result
          console.log(`Auto-processing: Found match for "${file.name}" -> "${bestMatch.title}"`);
          
          // Assign the movie
          const assignResponse = await api.movies.assign(file.path, bestMatch);
          
          // Keep track of current file path (it might change during renaming)
          let currentFilePath = file.path;
          
          // Update the file with movie assignment first
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.path === currentFilePath 
                ? { 
                    ...f, 
                    movie: bestMatch,
                    filenameInfo: assignResponse.filenameInfo,
                    folderInfo: assignResponse.folderInfo
                  }
                : f
            )
          );
          
          // If filename needs renaming, do it
          if (assignResponse.filenameInfo?.needs_rename) {
            const renameResponse = await api.movies.renameFile(currentFilePath, assignResponse.filenameInfo.standard_filename);
            // Update the file path and name after renaming, but preserve the movie assignment
            setFiles(prevFiles => 
              prevFiles.map(f => 
                f.path === currentFilePath 
                  ? { 
                      ...f, 
                      path: renameResponse.new_path,
                      name: assignResponse.filenameInfo.standard_filename,
                      filenameInfo: undefined, // Clear since it's now standard
                      movie: bestMatch // Preserve the movie assignment
                    }
                  : f
              )
            );
            currentFilePath = renameResponse.new_path; // Update our reference
            

          }
          
          // If folder needs renaming, do it
          if (assignResponse.folderInfo?.needs_rename) {
            const folderRenameResponse = await api.movies.renameFolder(
              assignResponse.folderInfo.current_folder_path, 
              assignResponse.folderInfo.standard_foldername
            );
            // Update all files that were in the renamed folder, but preserve movie assignments
            setFiles(prevFiles => 
              prevFiles.map(f => {
                if (f.directory === assignResponse.folderInfo.current_folder_path || 
                    f.path.startsWith(assignResponse.folderInfo.current_folder_path + '/')) {
                  const newPath = f.path.replace(assignResponse.folderInfo.current_folder_path, folderRenameResponse.new_path);
                  const newDirectory = f.directory.replace(assignResponse.folderInfo.current_folder_path, folderRenameResponse.new_path);
                  
                  return {
                    ...f,
                    path: newPath,
                    directory: newDirectory,
                    folderInfo: f.folderInfo ? undefined : f.folderInfo, // Clear folder info since it's now standard
                    movie: f.movie // Preserve the movie assignment
                  };
                }
                return f;
              })
            );
          }
          
          setAutoProcessResults(prev => [...prev, {
            file: file.name,
            movie: bestMatch.title,
            status: 'success'
          }]);
        } else {
          console.log(`Auto-processing: No match found for "${file.name}" (search term: "${searchTerm}")`);
          setAutoProcessResults(prev => [...prev, {
            file: file.name,
            movie: null,
            status: 'no_match'
          }]);
        }
        
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        setAutoProcessResults(prev => [...prev, {
          file: file.name,
          movie: null,
          status: 'error',
          error: err.message
        }]);
        
        // If this is a critical error that might affect the entire process, stop
        if (err.message.includes('network') || err.message.includes('timeout')) {
          setError(`Auto-processing stopped due to network error: ${err.message}`);
          processingRef.current = false;
        }
      } finally {
        // Mark file as completed
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.path);
          return newSet;
        });
        setCompletedFiles(prev => new Set([...prev, file.path]));
      }
    };

    // Process files in parallel with concurrency limit
    const processInBatches = async (files, batchSize) => {
      for (let i = 0; i < files.length; i += batchSize) {
        if (!processingRef.current) break;
        
        const batch = files.slice(i, i + batchSize);
        const promises = batch.map((file, batchIndex) => 
          processFile(file, i + batchIndex)
        );
        
        await Promise.allSettled(promises);
        
        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < files.length && processingRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay for faster processing
        }
      }
    };

    try {
      await processInBatches(unprocessedFiles, CONCURRENCY_LIMIT);
    } catch (err) {
      setError(`Auto-processing failed: ${err.message}`);
      console.error('Auto-processing error:', err);
    }
    
    // Processing complete
    processingRef.current = false;
    setIsAutoProcessing(false);
    setCurrentProcessingIndex(-1);
    setProcessingFiles(new Set());
    setCompletedFiles(new Set());
    
    // Refresh files from backend to ensure state is synchronized
    try {
      await fetchFiles(true); // Use duringAutoProcess=true to avoid showing loading state
      
    } catch (err) {
      console.error('Failed to refresh files after auto-processing:', err);
      setError('Auto-processing completed but failed to refresh file list. Please refresh manually.');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Movie Management Interface</h1>
          <p>Connected to natetrystuff.com:5000</p>
        </div>
        <button onClick={handleRefresh} className="refresh-button">
          Refresh All
        </button>
      </header>

      <main className="app-main">
        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'files' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('files')}
          >
            Media Files ({files.length})
          </button>
          <button 
            className={activeTab === 'paths' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('paths')}
          >
            Movie Paths ({moviePaths.length})
          </button>
          <button 
            className={activeTab === 'search' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('search')}
          >
            TMDB Search
          </button>
        </nav>

        {/* Loading State */}
        {loading && !isAutoProcessing && (
          <div className="loading">
            <p>Loading...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {/* Tab Content */}
        {(!loading || isAutoProcessing) && (
          <>
            {/* Media Files Tab */}
            {activeTab === 'files' && (
              <section className="files-section">
                <h2>Media Files ({showUnassignedOnly ? files.filter(f => !f.movie).length : files.length})</h2>
                {files.length === 0 ? (
                  <p className="no-files">No media files found. Add movie paths first.</p>
                ) : (
                  <>
                    <div className="files-controls">
                      <div className="filter-controls">
                        <label className="filter-checkbox">
                          <input
                            type="checkbox"
                            checked={showUnassignedOnly}
                            onChange={(e) => setShowUnassignedOnly(e.target.checked)}
                          />
                          <span>Show only UNASSIGNED movies</span>
                        </label>
                      </div>
                      
                      <button 
                        className={`auto-process-btn ${isAutoProcessing ? 'stop' : 'play'}`}
                        onClick={handleAutoProcess}
                        disabled={files.filter(f => !f.movie).length === 0}
                      >
                        {isAutoProcessing ? (
                          <>
                            <span className="stop-icon">⏹</span>
                            Stop Auto-Processing
                          </>
                        ) : (
                          <>
                            <span className="play-icon">▶</span>
                            Auto-Process Files ({files.filter(f => !f.movie).length} remaining)
                          </>
                        )}
                      </button>
                      
                      {isAutoProcessing && (
                        <div className="processing-status">
                          <div className="parallel-status">
                            <span>🚀 Processing {processingFiles.size} files in parallel (max {currentConcurrencyLimit})</span>
                            <span className="progress-counter">
                              {completedFiles.size} / {files.filter(f => !f.movie).length} completed
                            </span>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{
                                  width: `${(completedFiles.size / Math.max(files.filter(f => !f.movie).length, 1)) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Filter Message */}
                    {showUnassignedOnly && (
                      <div className="filter-active-message">
                        <span>🔍 Filtering: Showing {files.filter(f => !f.movie).length} of {files.length} files (unassigned only)</span>
                      </div>
                    )}
                    

                    
                    {/* Auto-process Results */}
                    {autoProcessResults.length > 0 && (
                      <div className="auto-process-results">
                        <h3>Auto-Processing Results</h3>
                        <div className="results-summary">
                          {autoProcessResults.map((result, index) => (
                            <div key={index} className={`result-item ${result.status}`}>
                              <span className="result-file">{result.file}</span>
                              <span className="result-status">
                                {result.status === 'success' && `✓ Assigned: ${result.movie}`}
                                {result.status === 'no_match' && '⚠ No match found'}
                                {result.status === 'error' && `✗ Error: ${result.error}`}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button 
                          className="clear-results-btn"
                          onClick={() => setAutoProcessResults([])}
                        >
                          Clear Results
                        </button>
                      </div>
                    )}
                    
                    <FilesTable 
                    files={files} 
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    onFindMovie={handleFindMovie}
                    onAcceptMovie={handleAcceptMovie}
                    onRemoveMovieAssignment={handleRemoveMovieAssignment}
                    onRenameFile={handleRenameFile}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFile={handleDeleteFile}
                    movieSearchResults={movieSearchResults}
                    isSearchingMovie={isSearchingMovie}
                    searchedFile={searchedFile}
                    acceptingMovieId={acceptingMovieId}
                    successMessage={successMessage}
                    renamingFileId={renamingFileId}
                    renamingFolderId={renamingFolderId}
                    deletingFileId={deletingFileId}
                    onClearSearchResults={handleClearSearchResults}
                    isAutoProcessing={isAutoProcessing}
                    currentProcessingIndex={currentProcessingIndex}
                    fetchingFiles={fetchingFiles}
                    processingFiles={processingFiles}
                    completedFiles={completedFiles}
                    showUnassignedOnly={showUnassignedOnly}
                    alternateMovieName={alternateMovieName}
                    setAlternateMovieName={setAlternateMovieName}
                  />
                  </>
                )}
              </section>
            )}

            {/* Movie Paths Tab */}
            {activeTab === 'paths' && (
              <section className="paths-section">
                <h2>Movie Paths</h2>
                
                {/* Add Path Form */}
                <form onSubmit={handleAddPath} className="add-path-form">
                  <input
                    type="text"
                    placeholder="Enter directory path..."
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="path-input"
                  />
                  <button type="submit" className="add-button">
                    Add Path
                  </button>
                </form>

                {/* Paths List */}
                {moviePaths.length === 0 ? (
                  <p className="no-paths">No movie paths configured</p>
                ) : (
                  <div className="paths-list">
                    {moviePaths.map((path, index) => (
                      <div key={index} className="path-item">
                        <span className="path-text">{path}</span>
                        <button 
                          onClick={() => handleRemovePath(path)}
                          className="remove-button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <section className="search-section">
                <h2>TMDB Movie Search</h2>
                
                <form onSubmit={handleSearch} className="search-form">
                  <input
                    type="text"
                    placeholder="Search movies on TMDB..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="search-button">
                    Search
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="search-results">
                    <h3>Search Results ({searchResults.length})</h3>
                    <div className="movies-grid">
                      {searchResults.map((movie, index) => (
                        <MovieCard key={movie.id || index} movie={movie} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Files Table Component
const FilesTable = ({ files, selectedFile, setSelectedFile, onFindMovie, onAcceptMovie, onRemoveMovieAssignment, onRenameFile, onRenameFolder, onDeleteFile, movieSearchResults, isSearchingMovie, searchedFile, acceptingMovieId, successMessage, renamingFileId, renamingFolderId, deletingFileId, onClearSearchResults, isAutoProcessing, currentProcessingIndex, fetchingFiles, processingFiles, completedFiles, showUnassignedOnly, alternateMovieName, setAlternateMovieName }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const handleRowClick = (file) => {
    setSelectedFile(selectedFile === file ? null : file);
  };

  const filteredFiles = showUnassignedOnly ? files.filter(file => !file.movie) : files;

  return (
    <div className="files-table-container">
      {fetchingFiles && (
        <div className="fetching-files-indicator">
          <span>🔄 Refreshing files list...</span>
        </div>
      )}
      <table className="files-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Directory</th>
            <th>Movie</th>
          </tr>
        </thead>
        <tbody>
          {filteredFiles.map((file, index) => {
            const isCurrentlyProcessing = isAutoProcessing && processingFiles.has(file.path);
            const isCompleted = completedFiles.has(file.path);
            
            return (
            <React.Fragment key={index}>
              <tr 
                className={`file-row ${selectedFile === file ? 'selected' : ''} ${deletingFileId === file.path ? 'deleting' : ''} ${isCurrentlyProcessing ? 'processing' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => handleRowClick(file)}
              >
                <td className="file-name-cell">{file.name}</td>
                <td>{formatFileSize(file.size)}</td>
                <td>{formatDate(file.modified)}</td>
                <td className="directory-cell">{file.directory}</td>
                <td className="movie-cell">
                  {file.movie ? (
                    <div className="movie-info">
                      <strong>{file.movie.title}</strong>
                      {file.movie.release_date && (
                        <span className="movie-year"> ({new Date(file.movie.release_date).getFullYear()})</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-movie">No movie assigned</span>
                  )}
                </td>
              </tr>
              {selectedFile === file && (
                <tr className={`action-row ${deletingFileId === file.path ? 'deleting' : ''}`}>
                  <td colSpan="5">
                    <div className="action-buttons">

                      <div className="button-row">
                        <div className="find-movie-section">
                          <div className="input-group">
                            <input
                              type="text"
                              placeholder="Enter movie name (e.g., 'Signs of Life 1968')..."
                              value={alternateMovieName}
                              onChange={(e) => setAlternateMovieName(e.target.value)}
                              className="alternate-movie-input"
                              disabled={isSearchingMovie}
                            />
                            <small className="input-hint">Include year for better results</small>
                          </div>
                          <button 
                            className="find-movie-btn"
                            onClick={() => onFindMovie(file)}
                            disabled={isSearchingMovie}
                          >
                            {isSearchingMovie ? 'Searching...' : 'Find Movie'}
                          </button>
                        </div>
                        
                        {file.movie && (
                          <button 
                            className="remove-assignment-btn"
                            onClick={() => onRemoveMovieAssignment(file)}
                          >
                            Remove Assignment
                          </button>
                        )}
                        
                        <button 
                          className="delete-file-btn"
                          onClick={() => onDeleteFile(file)}
                          disabled={deletingFileId !== null || renamingFileId !== null || renamingFolderId !== null}
                        >
                          {deletingFileId === file.path ? 'Deleting...' : 'Delete File'}
                        </button>
                      </div>

                      {/* Filename Information Display */}
                      {file.movie && file.filenameInfo && (
                        <div className={`filename-info ${renamingFileId === file.path ? 'renaming' : ''}`}>
                          <h4>Filename Information:</h4>
                          {successMessage && successMessage.includes('renamed file') && (
                            <div className="success-message">
                              ✓ {successMessage}
                            </div>
                          )}
                          <div className="filename-comparison">
                            <div className="current-filename">
                              <strong>Current:</strong> <span className="filename">{file.filenameInfo.current_filename}</span>
                            </div>
                            <div className="standard-filename">
                              <strong>Standard:</strong> <span className="filename">{file.filenameInfo.standard_filename}</span>
                            </div>
                            {file.filenameInfo.needs_rename && (
                              <div className="rename-action">
                                <button 
                                  className="rename-btn"
                                  onClick={() => onRenameFile(file, file.filenameInfo.standard_filename)}
                                  disabled={renamingFileId !== null || renamingFolderId !== null}
                                >
                                  {renamingFileId === file.path ? 'Renaming File...' : 'Rename File to Standard Format'}
                                </button>
                              </div>
                            )}
                            {!file.filenameInfo.needs_rename && (
                              <div className="filename-status">
                                <span className="status-good">✓ Filename is already in standard format</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Folder Information Display */}
                      {file.movie && file.folderInfo && (
                        <div className={`folder-info ${renamingFolderId === file.folderInfo.current_folder_path ? 'renaming' : ''}`}>
                          <h4>Folder Information:</h4>
                          {successMessage && successMessage.includes('renamed folder') && (
                            <div className="success-message">
                              ✓ {successMessage}
                            </div>
                          )}
                          <div className="folder-comparison">
                            <div className="current-foldername">
                              <strong>Current:</strong> <span className="foldername">{file.folderInfo.current_foldername}</span>
                            </div>
                            <div className="standard-foldername">
                              <strong>Standard:</strong> <span className="foldername">{file.folderInfo.standard_foldername}</span>
                            </div>
                            {file.folderInfo.needs_rename && (
                              <div className="rename-action">
                                <button 
                                  className="rename-folder-btn"
                                  onClick={() => onRenameFolder(file, file.folderInfo.standard_foldername)}
                                  disabled={renamingFileId !== null || renamingFolderId !== null}
                                >
                                  {renamingFolderId === file.folderInfo.current_folder_path ? 'Renaming Folder...' : 'Rename Folder to Standard Format'}
                                </button>
                              </div>
                            )}
                            {!file.folderInfo.needs_rename && (
                              <div className="folder-status">
                                <span className="status-good">✓ Folder is already in standard format</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {movieSearchResults.length > 0 && searchedFile === file && (
                        <div className="movie-suggestions">
                          <h4>Movie Suggestions:</h4>
                          {successMessage && (
                            <div className="success-message">
                              ✓ {successMessage}
                            </div>
                          )}
                          <div className="suggestions-list">
                            {movieSearchResults.slice(0, 3).map((movie, idx) => {
                              const isAccepting = acceptingMovieId === movie.id;
                              const isDisabled = acceptingMovieId !== null;
                              
                              return (
                                <div key={movie.id || idx} className={`movie-suggestion ${isAccepting ? 'accepting' : ''}`}>
                                  <div className="movie-suggestion-info">
                                    <strong>{movie.title}</strong>
                                    {movie.release_date && (
                                      <span className="movie-year"> ({new Date(movie.release_date).getFullYear()})</span>
                                    )}
                                    {movie.vote_average && (
                                      <span className="movie-rating"> - Rating: {movie.vote_average}/10</span>
                                    )}
                                  </div>
                                  <button 
                                    className="accept-movie-btn"
                                    onClick={() => onAcceptMovie(movie)}
                                    disabled={isDisabled}
                                  >
                                    {isAccepting ? 'Accepting...' : 'Accept'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// File Card Component
const FileCard = ({ file }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="file-card">
      <h3 className="file-name">{file.name}</h3>
      <p className="file-path">{file.path}</p>
      <div className="file-details">
        <span className="file-size">{formatFileSize(file.size)}</span>
        <span className="file-modified">Modified: {formatDate(file.modified)}</span>
      </div>
      <p className="file-directory">Directory: {file.directory}</p>
      {file.source_path && (
        <p className="file-source">Source: {file.source_path}</p>
      )}
    </div>
  );
};

// Movie Card Component (for TMDB search results)
const MovieCard = ({ movie }) => {
  return (
    <div className="movie-card">
      {movie.poster_path && (
        <img 
          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
          alt={movie.title}
          className="movie-poster"
        />
      )}
      <h3 className="movie-title">
        {movie.title || movie.name || 'Unknown Title'}
      </h3>
      {movie.release_date && (
        <p className="movie-year">Year: {new Date(movie.release_date).getFullYear()}</p>
      )}
      {movie.vote_average && (
        <p className="movie-rating">Rating: {movie.vote_average}/10</p>
      )}
      {movie.overview && (
        <p className="movie-description">{movie.overview}</p>
      )}
    </div>
  );
};

export default App;
