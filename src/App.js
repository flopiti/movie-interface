import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/apiClient';
import MovieComparison from './components/MovieComparison';
import SMSMessages from './components/SMSMessages';
import DownloadMonitor from './components/DownloadMonitor';
import './styles/App.css';

const App = () => {
  const [files, setFiles] = useState([]);
  const [moviePaths, setMoviePaths] = useState([]);
  const [mediaPaths, setMediaPaths] = useState([]);
  const [downloadPaths, setDownloadPaths] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false); // Separate state for file fetching during autoprocess
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPath, setNewPath] = useState('');
  const [newMediaPath, setNewMediaPath] = useState('');
  const [newDownloadPath, setNewDownloadPath] = useState('');
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'paths', 'media-paths', 'download-paths', 'search'
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
  const [showNonStandardOnly, setShowNonStandardOnly] = useState(false); // Filter to show only files with non-standard format
  const [alternateMovieName, setAlternateMovieName] = useState(''); // State for alternate movie name input
  const [duplicates, setDuplicates] = useState({}); // State for duplicate movies
  const [loadingDuplicates, setLoadingDuplicates] = useState(false); // Loading state for duplicates
  const [orphanedFiles, setOrphanedFiles] = useState([]); // State for orphaned files
  const [loadingOrphanedFiles, setLoadingOrphanedFiles] = useState(false); // Loading state for orphaned files
  const [movingFileId, setMovingFileId] = useState(null); // State for file being moved
  const processingRef = useRef(false);
  const [workerCount, setWorkerCount] = useState(1); // State for worker count
  const [selectedFiles, setSelectedFiles] = useState(new Set()); // State for bulk selection
  const [isBulkRenaming, setIsBulkRenaming] = useState(false); // State for bulk rename operation
  const [bulkRenameProgress, setBulkRenameProgress] = useState({ current: 0, total: 0 }); // Progress tracking
  const [selectedDownloadPath, setSelectedDownloadPath] = useState(null);
  const [downloadPathContents, setDownloadPathContents] = useState(null);
  const [loadingDownloadContents, setLoadingDownloadContents] = useState(false);
  const [downloadFiles, setDownloadFiles] = useState([]);
  const [loadingDownloadFiles, setLoadingDownloadFiles] = useState(false);
  const [radarrPlexComparison, setRadarrPlexComparison] = useState(null);
  const [loadingRadarrPlexComparison, setLoadingRadarrPlexComparison] = useState(false);

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
    fetchMediaPaths();
    fetchDownloadPaths();
    fetchDownloadFiles();
    fetchDuplicates();
    fetchOrphanedFiles();
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

  // Helper function to check if a file needs renaming (filename or folder)
  const needsRenaming = (file) => {
    if (!file.movie) return false;
    
    // Check if the file has filenameInfo and folderInfo properties
    // If it doesn't have these, it means it hasn't been processed yet
    if (!file.filenameInfo && !file.folderInfo) {
      // Generate the info to see if it needs renaming
      const filenameInfo = generateFilenameInfo(file);
      const folderInfo = generateFolderInfo(file);
      return (filenameInfo && filenameInfo.needs_rename) || (folderInfo && folderInfo.needs_rename);
    }
    
    // If it has the info properties, check if they indicate needs_rename
    const filenameNeedsRename = file.filenameInfo && file.filenameInfo.needs_rename;
    const folderNeedsRename = file.folderInfo && file.folderInfo.needs_rename;
    
    return filenameNeedsRename || folderNeedsRename;
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

  const fetchMediaPaths = async () => {
    try {
      const data = await api.mediaPaths.getAll();
      setMediaPaths(data.media_paths || []);
    } catch (err) {
      console.error('Error fetching media paths:', err);
    }
  };

  const fetchDownloadPaths = async () => {
    try {
      const data = await api.downloadPaths.getAll();
      setDownloadPaths(data.download_paths || []);
    } catch (err) {
      console.error('Error fetching download paths:', err);
    }
  };

  const fetchDownloadFiles = async () => {
    setLoadingDownloadFiles(true);
    try {
      const data = await api.downloadFiles.getAll();
      setDownloadFiles(data.files || []);
    } catch (err) {
      console.error('Error fetching download files:', err);
      setError('Failed to fetch download files: ' + err.message);
    } finally {
      setLoadingDownloadFiles(false);
    }
  };

  const fetchRadarrPlexComparison = async () => {
    setLoadingRadarrPlexComparison(true);
    setError(null);
    try {
      const data = await api.comparison.compareRadarrPlex();
      setRadarrPlexComparison(data);
    } catch (err) {
      console.error('Error fetching Radarr vs Plex comparison:', err);
      setError('Failed to fetch Radarr vs Plex comparison: ' + err.message);
    } finally {
      setLoadingRadarrPlexComparison(false);
    }
  };

  const fetchDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const data = await api.duplicates.find();
      setDuplicates(data.duplicates || {});
    } catch (err) {
      console.error('Error fetching duplicates:', err);
      setError('Failed to fetch duplicates: ' + err.message);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const fetchOrphanedFiles = async () => {
    setLoadingOrphanedFiles(true);
    try {
      const data = await api.orphanedFiles.find();
      setOrphanedFiles(data.orphaned_files || []);
    } catch (err) {
      console.error('Error fetching orphaned files:', err);
      setError('Failed to fetch orphaned files: ' + err.message);
    } finally {
      setLoadingOrphanedFiles(false);
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

  const handleAddMediaPath = async (e) => {
    e.preventDefault();
    if (!newMediaPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.mediaPaths.add(newMediaPath.trim());
      setNewMediaPath('');
      await fetchMediaPaths();
    } catch (err) {
      setError('Failed to add media path: ' + err.message);
      console.error('Error adding media path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMediaPath = async (path) => {
    setLoading(true);
    setError(null);
    try {
      await api.mediaPaths.remove(path);
      await fetchMediaPaths();
    } catch (err) {
      setError('Failed to remove media path: ' + err.message);
      console.error('Error removing media path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMediaPathsSpace = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.mediaPaths.refreshAll();
      await fetchMediaPaths();
    } catch (err) {
      setError('Failed to refresh space information: ' + err.message);
      console.error('Error refreshing media paths space:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSingleMediaPathSpace = async (path) => {
    setLoading(true);
    setError(null);
    try {
      await api.mediaPaths.refresh(path);
      await fetchMediaPaths();
    } catch (err) {
      setError('Failed to refresh space information: ' + err.message);
      console.error('Error refreshing media path space:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDownloadPath = async (e) => {
    e.preventDefault();
    if (!newDownloadPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.downloadPaths.add(newDownloadPath.trim());
      setNewDownloadPath('');
      await fetchDownloadPaths();
    } catch (err) {
      setError('Failed to add download path: ' + err.message);
      console.error('Error adding download path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDownloadPath = async (path) => {
    setLoading(true);
    setError(null);
    try {
      await api.downloadPaths.remove(path);
      await fetchDownloadPaths();
      // Clear contents if this was the selected path
      if (selectedDownloadPath === path) {
        setSelectedDownloadPath(null);
        setDownloadPathContents(null);
      }
    } catch (err) {
      setError('Failed to remove download path: ' + err.message);
      console.error('Error removing download path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDownloadPathContents = async (path) => {
    setSelectedDownloadPath(path);
    setLoadingDownloadContents(true);
    setError(null);
    try {
      const contents = await api.downloadPaths.getContents(path);
      setDownloadPathContents(contents);
    } catch (err) {
      setError('Failed to load download path contents: ' + err.message);
      console.error('Error loading download path contents:', err);
    } finally {
      setLoadingDownloadContents(false);
    }
  };

  const handleSearchRadarrMovie = async (file) => {
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
        
        // Clean the filename while preserving important numbers in titles
        // Replace separators with spaces
        let baseSearchTerm = fileName.replace(/[._-]/g, ' ');
        
        // Remove the year if found, but preserve other numbers that are part of titles
        if (year) {
          baseSearchTerm = baseSearchTerm.replace(new RegExp(`\\b${year}\\b`, 'g'), '');
        }
        
        // Clean up extra spaces and trim
        baseSearchTerm = baseSearchTerm.replace(/\s+/g, ' ').trim();
        
        // Include year in search term if found
        searchTerm = year ? `${baseSearchTerm} ${year}` : baseSearchTerm;
      }
      
      const data = await api.downloadFiles.searchRadarr(searchTerm);
      // Extract results from Radarr response
      const results = data.movies || [];
      setMovieSearchResults(results);
    } catch (err) {
      setError('Radarr movie search failed: ' + err.message);
      console.error('Error searching Radarr movies:', err);
    } finally {
      setIsSearchingMovie(false);
    }
  };

  const handleAcceptRadarrMovie = async (movie) => {
    if (!selectedFile) return;
    
    setAcceptingMovieId(movie.id);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Send the assignment to the backend
      const response = await api.downloadFiles.assignMovie(selectedFile.path, movie);
      
      // Update the file with the selected movie information, filename info, and folder info
      setDownloadFiles(prevFiles => 
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

  const handleRemoveDownloadFileMovieAssignment = async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      // Send the removal request to the backend
      await api.downloadFiles.removeAssignment(file.path);
      
      // Update the file to remove the movie assignment
      setDownloadFiles(prevFiles => 
        prevFiles.map(f => 
          f === file 
            ? { ...f, movie: undefined, filenameInfo: undefined, folderInfo: undefined }
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

  const handleRefresh = () => {
    setSearchQuery('');
    setSearchResults([]);
    fetchFiles();
    fetchMoviePaths();
    fetchMediaPaths();
    fetchDownloadPaths();
    fetchDownloadFiles();
    fetchDuplicates();
    fetchOrphanedFiles();
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
        
        // Clean the filename while preserving important numbers in titles
        // Replace separators with spaces
        let baseSearchTerm = fileName.replace(/[._-]/g, ' ');
        
        // Remove the year if found, but preserve other numbers that are part of titles
        if (year) {
          baseSearchTerm = baseSearchTerm.replace(new RegExp(`\\b${year}\\b`, 'g'), '');
        }
        
        // Clean up extra spaces and trim
        baseSearchTerm = baseSearchTerm.replace(/\s+/g, ' ').trim();
        
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

  const handleMoveToFolder = async (file) => {
    const fileId = file.path;
    setMovingFileId(fileId);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Send the move request to the backend
      const response = await api.orphanedFiles.moveToFolder(file.path);
      
      // Remove from orphaned files list
      setOrphanedFiles(prevFiles => prevFiles.filter(f => f.path !== file.path));
      
      // Show success message
      setSuccessMessage(`Successfully moved "${file.name}" to folder "${response.folder_name}"`);
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      console.log(`Successfully moved "${file.name}" to folder "${response.folder_name}"`);
    } catch (err) {
      setError('Failed to move file: ' + err.message);
      console.error('Error moving file:', err);
    } finally {
      setMovingFileId(null);
    }
  };

  // Bulk rename functions
  const handleBulkRenameFiles = async () => {
    const filesToRename = files.filter(file => 
      selectedFiles.has(file.path) && 
      file.movie && 
      file.filenameInfo && 
      file.filenameInfo.needs_rename
    );
    
    if (filesToRename.length === 0) {
      setError('No files selected for bulk rename or no files need renaming');
      return;
    }
    
    setIsBulkRenaming(true);
    setBulkRenameProgress({ current: 0, total: filesToRename.length });
    setError(null);
    setSuccessMessage('');
    
    try {
      for (let i = 0; i < filesToRename.length; i++) {
        const file = filesToRename[i];
        setBulkRenameProgress({ current: i + 1, total: filesToRename.length });
        
        try {
          const response = await api.movies.renameFile(file.path, file.filenameInfo.standard_filename);
          
          // Update the file list with the new path and name
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.path === file.path 
                ? { 
                    ...f, 
                    path: response.new_path,
                    name: file.filenameInfo.standard_filename,
                    filenameInfo: undefined // Clear filename info since it's now standard
                  }
                : f
            )
          );
          
          console.log(`Bulk rename: Successfully renamed "${file.name}" to "${file.filenameInfo.standard_filename}"`);
        } catch (err) {
          console.error(`Bulk rename error for "${file.name}":`, err);
          setError(`Failed to rename "${file.name}": ${err.message}`);
          break; // Stop on first error
        }
      }
      
      setSuccessMessage(`Successfully renamed ${filesToRename.length} files`);
      setSelectedFiles(new Set()); // Clear selection
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err) {
      setError('Bulk rename failed: ' + err.message);
      console.error('Bulk rename error:', err);
    } finally {
      setIsBulkRenaming(false);
      setBulkRenameProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkRenameFolders = async () => {
    const filesToRename = files.filter(file => 
      selectedFiles.has(file.path) && 
      file.movie && 
      file.folderInfo && 
      file.folderInfo.needs_rename
    );
    
    if (filesToRename.length === 0) {
      setError('No files selected for bulk folder rename or no folders need renaming');
      return;
    }
    
    setIsBulkRenaming(true);
    setBulkRenameProgress({ current: 0, total: filesToRename.length });
    setError(null);
    setSuccessMessage('');
    
    try {
      for (let i = 0; i < filesToRename.length; i++) {
        const file = filesToRename[i];
        setBulkRenameProgress({ current: i + 1, total: filesToRename.length });
        
        try {
          const response = await api.movies.renameFolder(
            file.folderInfo.current_folder_path, 
            file.folderInfo.standard_foldername
          );
          
          // Update all files that were in the renamed folder
          setFiles(prevFiles => 
            prevFiles.map(f => {
              if (f.directory === file.folderInfo.current_folder_path || 
                  f.path.startsWith(file.folderInfo.current_folder_path + '/')) {
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
          
          console.log(`Bulk folder rename: Successfully renamed folder to "${file.folderInfo.standard_foldername}"`);
        } catch (err) {
          console.error(`Bulk folder rename error for "${file.name}":`, err);
          setError(`Failed to rename folder for "${file.name}": ${err.message}`);
          break; // Stop on first error
        }
      }
      
      setSuccessMessage(`Successfully renamed ${filesToRename.length} folders`);
      setSelectedFiles(new Set()); // Clear selection
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err) {
      setError('Bulk folder rename failed: ' + err.message);
      console.error('Bulk folder rename error:', err);
    } finally {
      setIsBulkRenaming(false);
      setBulkRenameProgress({ current: 0, total: 0 });
    }
  };

  const handleSelectAll = () => {
    const filesNeedingRename = files.filter(file => needsRenaming(file));
    if (selectedFiles.size === filesNeedingRename.length) {
      // If all are selected, deselect all
      setSelectedFiles(new Set());
    } else {
      // Select all files that need renaming
      setSelectedFiles(new Set(filesNeedingRename.map(f => f.path)));
    }
  };

  const handleSelectFile = (filePath) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
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
    // Use user-configurable worker count, clamped between 1 and 15
    const CONCURRENCY_LIMIT = Math.max(1, Math.min(15, workerCount));
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
          
          // Assign the movie and wait for database confirmation
          const assignResponse = await api.movies.assign(file.path, bestMatch);
          
          // Verify the assignment was actually saved to database
          if (!assignResponse || assignResponse.error) {
            throw new Error(`Database assignment failed: ${assignResponse?.error || 'Unknown error'}`);
          }
          
          // Double-check the assignment exists in the database
          const verificationResponse = await api.movies.verifyAssignment(file.path);
          if (!verificationResponse.exists) {
            throw new Error('Assignment verification failed - assignment not found in database');
          }
          
          console.log(`✅ Database confirmed: "${bestMatch.title}" assigned to "${file.name}"`);
          
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
            status: 'success',
            message: '✅ ASSIGNED & CONFIRMED IN DATABASE'
          }]);
        } else {
          console.log(`Auto-processing: No match found for "${file.name}" (search term: "${searchTerm}")`);
          setAutoProcessResults(prev => [...prev, {
            file: file.name,
            movie: null,
            status: 'no_match',
            message: '⚠ No match found in TMDB'
          }]);
        }
        
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        setAutoProcessResults(prev => [...prev, {
          file: file.name,
          movie: null,
          status: 'error',
          error: err.message,
          message: `✗ Error: ${err.message}`
        }]);
        
        // If this is a critical error that might affect the entire process, stop
        if (err.message.includes('network') || err.message.includes('timeout') || err.message.includes('Database assignment failed')) {
          setError(`Auto-processing stopped due to critical error: ${err.message}`);
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
            className={activeTab === 'media-paths' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('media-paths')}
          >
            Media Paths ({mediaPaths.length})
          </button>
          <button 
            className={activeTab === 'download-paths' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('download-paths')}
          >
            Download Paths ({downloadPaths.length})
          </button>
          <button 
            className={activeTab === 'download-files' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('download-files')}
          >
            Download Files ({downloadFiles.length})
          </button>
          <button 
            className={activeTab === 'radarr-plex-comparison' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('radarr-plex-comparison')}
          >
            Radarr vs Plex
          </button>
          <button 
            className={activeTab === 'duplicates' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('duplicates')}
          >
            Duplicates ({Object.keys(duplicates).length})
          </button>
          <button 
            className={activeTab === 'orphaned' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('orphaned')}
          >
            Orphaned Files ({orphanedFiles.length})
          </button>
          <button 
            className={activeTab === 'search' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('search')}
          >
            TMDB Search
          </button>
          <button 
            className={activeTab === 'comparison' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('comparison')}
          >
            Plex Comparison
          </button>
          <button 
            className={activeTab === 'sms' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('sms')}
          >
            SMS Messages
          </button>

          <button 
            className={activeTab === 'download-monitor' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('download-monitor')}
          >
            Download Monitor
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
                        <label className="filter-checkbox">
                          <input
                            type="checkbox"
                            checked={showNonStandardOnly}
                            onChange={(e) => setShowNonStandardOnly(e.target.checked)}
                          />
                          <span>Show only NON-STANDARD format files</span>
                        </label>
                      </div>
                      
                      <div className="auto-process-controls">
                        <div className="worker-count-control">
                          <label htmlFor="worker-count">Parallel Workers:</label>
                          <input
                            id="worker-count"
                            type="number"
                            min="1"
                            max="15"
                            value={workerCount}
                            onChange={(e) => setWorkerCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 8)))}
                            disabled={isAutoProcessing}
                            className="worker-count-input"
                          />
                          <span className="worker-count-hint">(1-15)</span>
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
                      </div>
                      
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
                    
                    {/* Bulk Rename Controls */}
                    <div className="bulk-rename-controls">
                      <div className="bulk-selection-info">
                        <span>Selected: {selectedFiles.size} files</span>
                        <span>Files needing rename: {files.filter(f => needsRenaming(f)).length}</span>
                      </div>
                      
                      <div className="bulk-actions">
                        <button 
                          className="select-all-btn"
                          onClick={handleSelectAll}
                          disabled={isBulkRenaming}
                        >
                          {selectedFiles.size === files.filter(f => needsRenaming(f)).length ? 'Deselect All' : 'Select All'}
                        </button>
                        
                        <button 
                          className="bulk-rename-files-btn"
                          onClick={handleBulkRenameFiles}
                          disabled={isBulkRenaming || selectedFiles.size === 0}
                        >
                          {isBulkRenaming ? 'Renaming Files...' : `Bulk Rename Files (${selectedFiles.size})`}
                        </button>
                        
                        <button 
                          className="bulk-rename-folders-btn"
                          onClick={handleBulkRenameFolders}
                          disabled={isBulkRenaming || selectedFiles.size === 0}
                        >
                          {isBulkRenaming ? 'Renaming Folders...' : `Bulk Rename Folders (${selectedFiles.size})`}
                        </button>
                      </div>
                      
                      {isBulkRenaming && (
                        <div className="bulk-rename-progress">
                          <span>🔄 Bulk Renaming: {bulkRenameProgress.current} / {bulkRenameProgress.total}</span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{
                                width: `${(bulkRenameProgress.current / Math.max(bulkRenameProgress.total, 1)) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Filter Messages */}
                    {showUnassignedOnly && (
                      <div className="filter-active-message">
                        <span>🔍 Filtering: Showing {files.filter(f => !f.movie).length} of {files.length} files (unassigned only)</span>
                      </div>
                    )}
                    {showNonStandardOnly && (
                      <div className="filter-active-message">
                        <span>🔍 Filtering: Showing {files.filter(f => f.movie && needsRenaming(f)).length} of {files.length} files (non-standard format only)</span>
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
                                {result.message || (
                                  result.status === 'success' ? `✓ Assigned: ${result.movie}` :
                                  result.status === 'no_match' ? '⚠ No match found' :
                                  `✗ Error: ${result.error}`
                                )}
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
                    showNonStandardOnly={showNonStandardOnly}
                    needsRenaming={needsRenaming}
                    alternateMovieName={alternateMovieName}
                    setAlternateMovieName={setAlternateMovieName}
                    selectedFiles={selectedFiles}
                    onSelectFile={handleSelectFile}
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

            {/* Media Paths Tab */}
            {activeTab === 'media-paths' && (
              <section className="media-paths-section">
                <h2>Media Paths</h2>
                
                <div className="media-paths-controls">
                  <button 
                    className="refresh-space-btn"
                    onClick={handleRefreshMediaPathsSpace}
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh All Space Info'}
                  </button>
                </div>
                
                {/* Add Media Path Form */}
                <form onSubmit={handleAddMediaPath} className="add-path-form">
                  <input
                    type="text"
                    placeholder="Enter media directory path..."
                    value={newMediaPath}
                    onChange={(e) => setNewMediaPath(e.target.value)}
                    className="path-input"
                  />
                  <button type="submit" className="add-button">
                    Add Media Path
                  </button>
                </form>

                {/* Media Paths List */}
                {mediaPaths.length === 0 ? (
                  <p className="no-paths">No media paths configured</p>
                ) : (
                  <div className="media-paths-list">
                    {mediaPaths.map((pathInfo, index) => (
                      <MediaPathCard 
                        key={index} 
                        pathInfo={pathInfo}
                        onRemove={handleRemoveMediaPath}
                        onRefreshSpace={handleRefreshSingleMediaPathSpace}
                        loading={loading}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Download Paths Tab */}
            {activeTab === 'download-paths' && (
              <section className="download-paths-section">
                <h2>Download Paths</h2>
                
                {/* Add Download Path Form */}
                <form onSubmit={handleAddDownloadPath} className="add-path-form">
                  <input
                    type="text"
                    placeholder="Enter download directory path..."
                    value={newDownloadPath}
                    onChange={(e) => setNewDownloadPath(e.target.value)}
                    className="path-input"
                  />
                  <button type="submit" className="add-button">
                    Add Download Path
                  </button>
                </form>

                {/* Download Paths List */}
                {downloadPaths.length === 0 ? (
                  <p className="no-paths">No download paths configured</p>
                ) : (
                  <div className="download-paths-list">
                    {downloadPaths.map((path, index) => (
                      <DownloadPathCard 
                        key={index} 
                        path={path}
                        onRemove={handleRemoveDownloadPath}
                        onViewContents={handleViewDownloadPathContents}
                        isSelected={selectedDownloadPath === path}
                        loading={loading}
                      />
                    ))}
                  </div>
                )}

                {/* Download Path Contents */}
                {selectedDownloadPath && downloadPathContents && (
                  <DownloadPathContents 
                    path={selectedDownloadPath}
                    contents={downloadPathContents}
                    loading={loadingDownloadContents}
                    onClose={() => {
                      setSelectedDownloadPath(null);
                      setDownloadPathContents(null);
                    }}
                  />
                )}
              </section>
            )}

            {/* Download Files Tab */}
            {activeTab === 'download-files' && (
              <section className="download-files-section">
                <h2>Download Files ({downloadFiles.length})</h2>
                
                {downloadFiles.length === 0 ? (
                  <p className="no-files">No media files found in download paths. Add download paths first.</p>
                ) : (
                  <>
                    <div className="download-files-controls">
                      <button 
                        className="refresh-download-files-btn"
                        onClick={fetchDownloadFiles}
                        disabled={loadingDownloadFiles}
                      >
                        {loadingDownloadFiles ? 'Loading...' : 'Refresh Download Files'}
                      </button>
                    </div>
                    
                    <DownloadFilesTable 
                      files={downloadFiles} 
                      selectedFile={selectedFile}
                      setSelectedFile={setSelectedFile}
                      onSearchRadarrMovie={handleSearchRadarrMovie}
                      onAcceptRadarrMovie={handleAcceptRadarrMovie}
                      onRemoveMovieAssignment={handleRemoveDownloadFileMovieAssignment}
                      movieSearchResults={movieSearchResults}
                      isSearchingMovie={isSearchingMovie}
                      searchedFile={searchedFile}
                      acceptingMovieId={acceptingMovieId}
                      successMessage={successMessage}
                      onClearSearchResults={handleClearSearchResults}
                      alternateMovieName={alternateMovieName}
                      setAlternateMovieName={setAlternateMovieName}
                    />
                  </>
                )}
              </section>
            )}

            {/* Radarr vs Plex Comparison Tab */}
            {activeTab === 'radarr-plex-comparison' && (
              <section className="radarr-plex-comparison-section">
                <h2>Radarr vs Plex Comparison</h2>
                
                <div className="comparison-controls">
                  <button 
                    className="compare-radarr-plex-btn"
                    onClick={fetchRadarrPlexComparison}
                    disabled={loadingRadarrPlexComparison}
                  >
                    {loadingRadarrPlexComparison ? 'Comparing...' : 'Compare Radarr vs Plex'}
                  </button>
                </div>

                {radarrPlexComparison && (
                  <RadarrPlexComparisonResults 
                    comparison={radarrPlexComparison}
                    loading={loadingRadarrPlexComparison}
                  />
                )}
              </section>
            )}

            {/* Duplicates Tab */}
            {activeTab === 'duplicates' && (
              <section className="duplicates-section">
                <h2>Duplicate Movies</h2>
                
                <div className="duplicates-controls">
                  <button 
                    className="refresh-duplicates-btn"
                    onClick={fetchDuplicates}
                    disabled={loadingDuplicates}
                  >
                    {loadingDuplicates ? 'Loading...' : 'Refresh Duplicates'}
                  </button>
                </div>

                {loadingDuplicates ? (
                  <div className="loading">
                    <p>Loading duplicates...</p>
                  </div>
                ) : Object.keys(duplicates).length === 0 ? (
                  <div className="no-duplicates">
                    <p>✅ No duplicate movies found!</p>
                    <p>All movies have only one file assigned.</p>
                  </div>
                ) : (
                  <>
                    <div className="duplicates-summary">
                      <p>
                        Found {Object.keys(duplicates).length} movies with duplicate files.
                      </p>
                    </div>
                    <div className="duplicates-list">
                      {Object.entries(duplicates).map(([movieId, movieData]) => (
                        <DuplicateMovieCard 
                          key={movieId} 
                          movieData={movieData} 
                          onDeleteFile={handleDeleteFile}
                          deletingFileId={deletingFileId}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Orphaned Files Tab */}
            {activeTab === 'orphaned' && (
              <section className="orphaned-section">
                <h2>Orphaned Files</h2>
                
                <div className="orphaned-controls">
                  <button 
                    className="refresh-orphaned-btn"
                    onClick={fetchOrphanedFiles}
                    disabled={loadingOrphanedFiles}
                  >
                    {loadingOrphanedFiles ? 'Loading...' : 'Refresh Orphaned Files'}
                  </button>
                </div>

                {loadingOrphanedFiles ? (
                  <div className="loading">
                    <p>Loading orphaned files...</p>
                  </div>
                ) : orphanedFiles.length === 0 ? (
                  <div className="no-orphaned">
                    <p>✅ No orphaned files found!</p>
                    <p>All files are properly organized in folders.</p>
                  </div>
                ) : (
                  <>
                    <div className="orphaned-summary">
                      <p>
                        Found {orphanedFiles.length} files that need to be moved to their own folders.
                      </p>
                    </div>
                    <div className="orphaned-files-list">
                      {orphanedFiles.map((file, index) => (
                        <OrphanedFileCard 
                          key={index} 
                          file={file} 
                          onMoveToFolder={handleMoveToFolder}
                          movingFileId={movingFileId}
                          successMessage={successMessage}
                        />
                      ))}
                    </div>
                  </>
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

            {/* Comparison Tab */}
            {activeTab === 'comparison' && (
              <MovieComparison />
            )}

            {/* SMS Messages Tab */}
            {activeTab === 'sms' && (
              <SMSMessages />
            )}

            {/* Download Monitor Tab */}
            {activeTab === 'download-monitor' && (
              <DownloadMonitor />
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Files Table Component
const FilesTable = ({ files, selectedFile, setSelectedFile, onFindMovie, onAcceptMovie, onRemoveMovieAssignment, onRenameFile, onRenameFolder, onDeleteFile, movieSearchResults, isSearchingMovie, searchedFile, acceptingMovieId, successMessage, renamingFileId, renamingFolderId, deletingFileId, onClearSearchResults, isAutoProcessing, currentProcessingIndex, fetchingFiles, processingFiles, completedFiles, showUnassignedOnly, showNonStandardOnly, needsRenaming, alternateMovieName, setAlternateMovieName, selectedFiles, onSelectFile }) => {
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

  const filteredFiles = files.filter(file => {
    if (showUnassignedOnly && file.movie) return false;
    if (showNonStandardOnly && (!file.movie || !needsRenaming(file))) return false;
    return true;
  });

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
            <th>
              <input
                type="checkbox"
                checked={selectedFiles.size === files.filter(f => needsRenaming(f)).length && selectedFiles.size > 0}
                onChange={() => {}} // Handled by Select All button
                disabled={isAutoProcessing}
                className="select-all-checkbox"
              />
            </th>
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
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={(e) => {
                      e.stopPropagation(); // Prevent row click
                      onSelectFile(file.path);
                    }}
                    disabled={isAutoProcessing || !needsRenaming(file)}
                    className="file-checkbox"
                  />
                </td>
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
                      {needsRenaming(file) && (
                        <span className="needs-rename-badge" title="File or folder needs renaming to standard format">⚠️</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-movie">No movie assigned</span>
                  )}
                </td>
              </tr>
              {selectedFile === file && (
                <tr className={`action-row ${deletingFileId === file.path ? 'deleting' : ''}`}>
                  <td colSpan="6">
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

// Orphaned File Card Component
const OrphanedFileCard = ({ file, onMoveToFolder, movingFileId, successMessage }) => {
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
    <div className="orphaned-file-card">
      <div className="orphaned-file-info">
        <div className="orphaned-file-name">{file.name}</div>
        <div className="orphaned-file-details">
          <span className="orphaned-file-size">{formatFileSize(file.size)}</span>
          <span className="orphaned-file-date">Modified: {formatDate(file.modified)}</span>
          <span className="orphaned-file-directory">{file.directory}</span>
        </div>
        {file.movie_assigned && (
          <div className="orphaned-file-movie">
            <span className="movie-assigned-badge">✓ Movie Assigned</span>
            <span className="movie-title">{file.movie_title}</span>
          </div>
        )}
        {!file.movie_assigned && (
          <div className="orphaned-file-movie">
            <span className="no-movie-badge">⚠️ No Movie Assignment</span>
          </div>
        )}
      </div>
      <div className="orphaned-file-actions">
        {successMessage && successMessage.includes('moved') && (
          <div className="success-message">
            ✓ {successMessage}
          </div>
        )}
        <button 
          className="move-to-folder-btn"
          onClick={() => onMoveToFolder(file)}
          disabled={movingFileId !== null || !file.movie_assigned}
        >
          {movingFileId === file.path ? 'Moving...' : 'Move to Folder'}
        </button>
      </div>
    </div>
  );
};

// Duplicate Movie Card Component
const DuplicateMovieCard = ({ movieData, onDeleteFile, deletingFileId }) => {
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
    <div className="duplicate-movie-card">
      <div className="duplicate-movie-header">
        <h3 className="duplicate-movie-title">
          {movieData.movie_info.title}
          {movieData.movie_info.release_date && (
            <span className="duplicate-movie-year">
              {' '}({new Date(movieData.movie_info.release_date).getFullYear()})
            </span>
          )}
        </h3>
        <div className="duplicate-count">
          <span className="duplicate-badge">
            {movieData.files.length} duplicate files
          </span>
        </div>
      </div>
      
      <div className="duplicate-files-list">
        <h4>Duplicate Files:</h4>
        {movieData.files.map((file, index) => (
          <div key={index} className="duplicate-file-item">
            <div className="duplicate-file-info">
              <div className="duplicate-file-name">{file.name}</div>
              <div className="duplicate-file-details">
                <span className="duplicate-file-size">{formatFileSize(file.size)}</span>
                <span className="duplicate-file-date">Modified: {formatDate(file.modified)}</span>
                <span className="duplicate-file-directory">{file.directory}</span>
              </div>
            </div>
            <div className="duplicate-file-actions">
              <button 
                className="delete-duplicate-btn"
                onClick={() => onDeleteFile(file)}
                disabled={deletingFileId !== null}
              >
                {deletingFileId === file.path ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
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

// Media Path Card Component
const MediaPathCard = ({ pathInfo, onRemove, onRefreshSpace, loading }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return '#ff4444'; // Red
    if (percentage >= 75) return '#ffaa00'; // Orange
    if (percentage >= 50) return '#ffdd00'; // Yellow
    return '#44ff44'; // Green
  };

  return (
    <div className="media-path-card">
      <div className="media-path-header">
        <div className="media-path-info">
          <h3 className="media-path-title">{pathInfo.path}</h3>
          <div className="media-path-status">
            {pathInfo.exists ? (
              <span className="status-exists">✓ Path exists</span>
            ) : (
              <span className="status-missing">✗ Path not found</span>
            )}
            {pathInfo.error && (
              <span className="status-error">Error: {pathInfo.error}</span>
            )}
          </div>
        </div>
        <div className="media-path-actions">
          <button 
            className="refresh-single-space-btn"
            onClick={() => onRefreshSpace(pathInfo.path)}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Space'}
          </button>
          <button 
            className="remove-media-path-btn"
            onClick={() => onRemove(pathInfo.path)}
            disabled={loading}
          >
            Remove
          </button>
        </div>
      </div>
      
      {pathInfo.exists && !pathInfo.error && (
        <div className="media-path-space-info">
          <div className="space-summary">
            <div className="space-item">
              <span className="space-label">Total Space:</span>
              <span className="space-value">{pathInfo.total_space_gb} GB</span>
            </div>
            <div className="space-item">
              <span className="space-label">Used Space:</span>
              <span className="space-value">{pathInfo.used_space_gb} GB</span>
            </div>
            <div className="space-item">
              <span className="space-label">Free Space:</span>
              <span className="space-value">{pathInfo.free_space_gb} GB</span>
            </div>
            <div className="space-item">
              <span className="space-label">Usage:</span>
              <span 
                className="space-value usage-percentage"
                style={{ color: getUsageColor(pathInfo.usage_percentage) }}
              >
                {pathInfo.usage_percentage}%
              </span>
            </div>
          </div>
          
          <div className="space-visualization">
            <div className="space-bar">
              <div 
                className="space-bar-used"
                style={{ 
                  width: `${pathInfo.usage_percentage}%`,
                  backgroundColor: getUsageColor(pathInfo.usage_percentage)
                }}
              ></div>
            </div>
            <div className="space-bar-labels">
              <span>Used ({pathInfo.used_space_gb} GB)</span>
              <span>Free ({pathInfo.free_space_gb} GB)</span>
            </div>
          </div>
          
          <div className="space-details">
            <div className="space-detail-item">
              <span className="detail-label">Total:</span>
              <span className="detail-value">{formatBytes(pathInfo.total_space)}</span>
            </div>
            <div className="space-detail-item">
              <span className="detail-label">Used:</span>
              <span className="detail-value">{formatBytes(pathInfo.used_space)}</span>
            </div>
            <div className="space-detail-item">
              <span className="detail-label">Free:</span>
              <span className="detail-value">{formatBytes(pathInfo.free_space)}</span>
            </div>
            <div className="space-detail-item">
              <span className="detail-label">Last Updated:</span>
              <span className="detail-value">{formatDate(pathInfo.last_updated)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Download Path Card Component
const DownloadPathCard = ({ path, onRemove, onViewContents, isSelected, loading }) => {
  return (
    <div className={`download-path-card ${isSelected ? 'selected' : ''}`}>
      <div className="download-path-header">
        <div className="download-path-info">
          <h3 className="download-path-title">{path}</h3>
          <div className="download-path-status">
            <span className="status-exists">✓ Path configured</span>
          </div>
        </div>
        <div className="download-path-actions">
          <button 
            className="view-contents-btn"
            onClick={() => onViewContents(path)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'View Contents'}
          </button>
          <button 
            className="remove-download-path-btn"
            onClick={() => onRemove(path)}
            disabled={loading}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

// Download Path Contents Component
const DownloadPathContents = ({ path, contents, loading, onClose }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className="download-path-contents">
        <div className="contents-header">
          <h3>Contents of: {path}</h3>
          <button className="close-contents-btn" onClick={onClose}>×</button>
        </div>
        <div className="loading">
          <p>Loading contents...</p>
        </div>
      </div>
    );
  }

  if (!contents.exists) {
    return (
      <div className="download-path-contents">
        <div className="contents-header">
          <h3>Contents of: {path}</h3>
          <button className="close-contents-btn" onClick={onClose}>×</button>
        </div>
        <div className="error">
          <p>Error: {contents.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="download-path-contents">
      <div className="contents-header">
        <h3>Contents of: {path}</h3>
        <button className="close-contents-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="contents-summary">
        <div className="summary-item">
          <span className="summary-label">Folders:</span>
          <span className="summary-value">{contents.total_folders}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Files:</span>
          <span className="summary-value">{contents.total_files}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Media Files:</span>
          <span className="summary-value">{contents.media_files}</span>
        </div>
      </div>

      {contents.folders.length > 0 && (
        <div className="folders-section">
          <h4>Folders ({contents.folders.length})</h4>
          <div className="folders-list">
            {contents.folders.map((folder, index) => (
              <div key={index} className="folder-item">
                <div className="folder-info">
                  <span className="folder-name">📁 {folder.name}</span>
                  <span className="folder-modified">Modified: {formatDate(folder.modified)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contents.files.length > 0 && (
        <div className="files-section">
          <h4>Files ({contents.files.length})</h4>
          <div className="files-list">
            {contents.files.map((file, index) => (
              <div key={index} className={`file-item ${file.is_media ? 'media-file' : ''}`}>
                <div className="file-info">
                  <span className="file-name">
                    {file.is_media ? '🎬' : '📄'} {file.name}
                  </span>
                  <div className="file-details">
                    <span className="file-size">{formatBytes(file.size)}</span>
                    <span className="file-modified">Modified: {formatDate(file.modified)}</span>
                    {file.is_media && <span className="media-badge">Media File</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contents.folders.length === 0 && contents.files.length === 0 && (
        <div className="empty-contents">
          <p>This directory is empty.</p>
        </div>
      )}
    </div>
  );
};

// Download Files Table Component
const DownloadFilesTable = ({ files, selectedFile, setSelectedFile, onSearchRadarrMovie, onAcceptRadarrMovie, onRemoveMovieAssignment, movieSearchResults, isSearchingMovie, searchedFile, acceptingMovieId, successMessage, onClearSearchResults, alternateMovieName, setAlternateMovieName }) => {
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

  return (
    <div className="download-files-table-container">
      <table className="files-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Source Path</th>
            <th>Movie</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <React.Fragment key={index}>
              <tr 
                className={`file-row ${selectedFile === file ? 'selected' : ''}`}
                onClick={() => handleRowClick(file)}
              >
                <td className="file-name-cell">{file.name}</td>
                <td>{formatFileSize(file.size)}</td>
                <td>{formatDate(file.modified)}</td>
                <td className="directory-cell">{file.source_path}</td>
                <td className="movie-cell">
                  {file.movie ? (
                    <div className="movie-info">
                      <strong>{file.movie.title}</strong>
                      {file.movie.year && (
                        <span className="movie-year"> ({file.movie.year})</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-movie">No movie assigned</span>
                  )}
                </td>
              </tr>
              {selectedFile === file && (
                <tr className="action-row">
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
                            onClick={() => onSearchRadarrMovie(file)}
                            disabled={isSearchingMovie}
                          >
                            {isSearchingMovie ? 'Searching Radarr...' : 'Search Radarr'}
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
                      </div>

                      {/* Filename Information Display */}
                      {file.movie && file.filenameInfo && (
                        <div className="filename-info">
                          <h4>Filename Information:</h4>
                          <div className="filename-comparison">
                            <div className="current-filename">
                              <strong>Current:</strong> <span className="filename">{file.filenameInfo.current_filename}</span>
                            </div>
                            <div className="standard-filename">
                              <strong>Standard:</strong> <span className="filename">{file.filenameInfo.standard_filename}</span>
                            </div>
                            {file.filenameInfo.needs_rename && (
                              <div className="rename-action">
                                <span className="needs-rename-badge">⚠️ Filename needs renaming to standard format</span>
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
                        <div className="folder-info">
                          <h4>Folder Information:</h4>
                          <div className="folder-comparison">
                            <div className="current-foldername">
                              <strong>Current:</strong> <span className="foldername">{file.folderInfo.current_foldername}</span>
                            </div>
                            <div className="standard-foldername">
                              <strong>Standard:</strong> <span className="foldername">{file.folderInfo.standard_foldername}</span>
                            </div>
                            {file.folderInfo.needs_rename && (
                              <div className="rename-action">
                                <span className="needs-rename-badge">⚠️ Folder needs renaming to standard format</span>
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
                          <h4>Radarr Movie Suggestions:</h4>
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
                                    {movie.year && (
                                      <span className="movie-year"> ({movie.year})</span>
                                    )}
                                    {movie.ratings && movie.ratings.imdb && (
                                      <span className="movie-rating"> - IMDB: {movie.ratings.imdb.value}/10</span>
                                    )}
                                  </div>
                                  <button 
                                    className="accept-movie-btn"
                                    onClick={() => onAcceptRadarrMovie(movie)}
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Radarr vs Plex Comparison Results Component
const RadarrPlexComparisonResults = ({ comparison, loading }) => {
  if (loading) {
    return (
      <div className="comparison-loading">
        <p>Comparing Radarr and Plex movies...</p>
      </div>
    );
  }

  if (comparison.error) {
    return (
      <div className="comparison-error">
        <h3>Error</h3>
        <p>{comparison.error}</p>
      </div>
    );
  }

  const summary = comparison.comparison_summary || {};

  return (
    <div className="radarr-plex-comparison-results">
      {/* Summary Statistics */}
      <div className="comparison-summary">
        <h3>Comparison Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Radarr Movies:</span>
            <span className="summary-value">{summary.total_radarr_movies || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Plex Movies:</span>
            <span className="summary-value">{summary.total_plex_movies || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Common Movies:</span>
            <span className="summary-value">{summary.common_movies_count || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Radarr Monitored:</span>
            <span className="summary-value">{summary.radarr_monitored_count || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Radarr With Files:</span>
            <span className="summary-value">{summary.radarr_with_files_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Movies in Radarr but not in Plex */}
      <div className="comparison-section">
        <h3>
          Movies in Radarr but NOT in Plex 
          <span className="count-badge">({summary.movies_in_radarr_not_in_plex_count || 0})</span>
        </h3>
        {comparison.movies_in_radarr_not_in_plex && comparison.movies_in_radarr_not_in_plex.length > 0 ? (
          <div className="movies-list">
            {comparison.movies_in_radarr_not_in_plex.map((movie, index) => (
              <div key={movie.id || index} className="movie-item radarr-only">
                <div className="movie-info">
                  <div className="movie-title">
                    <strong>{movie.title}</strong>
                    {movie.year && <span className="movie-year"> ({movie.year})</span>}
                  </div>
                  <div className="movie-details">
                    <span className={`status-badge ${movie.status?.toLowerCase()}`}>
                      {movie.status || 'Unknown'}
                    </span>
                    {movie.monitored && <span className="monitored-badge">Monitored</span>}
                    {movie.hasFile && <span className="has-file-badge">Has File</span>}
                  </div>
                  {movie.rootFolderPath && (
                    <div className="movie-path">
                      <small>Path: {movie.rootFolderPath}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-movies">No movies found in Radarr that are missing from Plex.</p>
        )}
      </div>

      {/* Movies in Plex but not in Radarr */}
      <div className="comparison-section">
        <h3>
          Movies in Plex but NOT in Radarr 
          <span className="count-badge">({summary.movies_in_plex_not_in_radarr_count || 0})</span>
        </h3>
        {comparison.movies_in_plex_not_in_radarr && comparison.movies_in_plex_not_in_radarr.length > 0 ? (
          <div className="movies-list">
            {comparison.movies_in_plex_not_in_radarr.map((movie, index) => (
              <div key={movie.id || index} className="movie-item plex-only">
                <div className="movie-info">
                  <div className="movie-title">
                    <strong>{movie.title}</strong>
                    {movie.year && <span className="movie-year"> ({movie.year})</span>}
                  </div>
                  <div className="movie-details">
                    {movie.library && <span className="library-badge">{movie.library}</span>}
                    {movie.addedAt && (
                      <span className="added-date">
                        Added: {new Date(movie.addedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-movies">No movies found in Plex that are missing from Radarr.</p>
        )}
      </div>
    </div>
  );
};

export default App;
