import React from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
    onClear: () => void;
}

// Component is deprecated and effectively removed to comply with guidelines.
// API Key must be managed via environment variables (process.env.API_KEY).
const ApiKeyModal: React.FC<ApiKeyModalProps> = () => {
    return null;
};

export default ApiKeyModal;