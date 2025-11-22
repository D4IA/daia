import { useEffect, useState, useCallback } from 'react';

interface UsePreventReloadReturn {
    isModalOpen: boolean;
}

export const usePreventReload = (
    enabled: boolean = true,
    message: string = 'Are you sure you want to leave? Any unsaved changes will be lost.'
): UsePreventReloadReturn => {

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
        if (!enabled) return;

        event.preventDefault();
        setIsModalOpen(true);
        event.returnValue = message;

        return message;
    }, [enabled, message]);

    useEffect(() => {
        if (enabled) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        } else {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [enabled, handleBeforeUnload]);

    return {
        isModalOpen,
    };
};