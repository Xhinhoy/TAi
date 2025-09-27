import { useContext } from 'react';
import { NoticeContext } from '../contexts/NoticeContext';

export const useErrorNotice = () => {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error('useErrorNotice must be used within a NoticeProvider');
  }
  return context;
};