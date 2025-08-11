import { useState, useEffect } from 'react';

export function useApi() {
  const [isConnected, setIsConnected] = useState(false);
  const [apiUrl] = useState(process.env.REACT_APP_API_URL || 'http://localhost:3001');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('awy_admin_token')}`,
          },
        });
        setIsConnected(response.ok);
      } catch (error) {
        setIsConnected(false);
      }
    };

    // Check connection immediately
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [apiUrl]);

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('awy_admin_token');
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...defaultOptions,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  return {
    isConnected,
    apiUrl,
    apiCall,
  };
}

