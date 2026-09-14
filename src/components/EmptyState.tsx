import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'Nenhum registro encontrado.',
  subMessage = 'Cadastre o primeiro registro para começar.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg shadow-xs my-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{message}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{subMessage}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
