import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
interface Repository {
  id: number;
  name: string;
  framework?: string;
  total_files: number;
  size: number;
  created_at: string;
}
interface RepositoryContextType {
  repositories: Repository[];
  activeRepo: Repository | null;
  isLoading: boolean;
  fetchRepositories: () => Promise<void>;
  setActiveRepoById: (id: number) => void;
  deleteActiveRepo: () => Promise<void>;
}
const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);
export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const fetchRepositories = async () => {
    try {
      const response = await axios.get('/api/v1/repositories');
      setRepositories(response.data);
      
      const savedActiveId = localStorage.getItem('active_repo_id');
      if (response.data.length > 0) {
        const match = response.data.find((r: Repository) => r.id.toString() === savedActiveId);
        setActiveRepo(match || response.data[0]);
      } else {
        setActiveRepo(null);
      }
    } catch (error) {
      console.error("Failed fetching repositories list:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const setActiveRepoById = (id: number) => {
    const match = repositories.find(r => r.id === id);
    if (match) {
      setActiveRepo(match);
      localStorage.setItem('active_repo_id', id.toString());
    }
  };
  const deleteActiveRepo = async () => {
    if (!activeRepo) return;
    try {
      await axios.delete(`/api/v1/repositories/${activeRepo.id}`);
      localStorage.removeItem('active_repo_id');
      await fetchRepositories();
    } catch (error) {
      console.error("Failed deleting active repository:", error);
    }
  };
  useEffect(() => {
    fetchRepositories();
  }, []);
  return (
    <RepositoryContext.Provider value={{ 
      repositories, 
      activeRepo, 
      isLoading, 
      fetchRepositories, 
      setActiveRepoById,
      deleteActiveRepo
    }}>
      {children}
    </RepositoryContext.Provider>
  );
};
export const useRepository = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be called inside a RepositoryProvider');
  }
  return context;
};
