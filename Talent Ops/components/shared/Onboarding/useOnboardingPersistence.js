import { useEffect } from 'react';

const STORAGE_KEY = 'talentops_onboarding_wizard_data';

export const useOnboardingPersistence = ({
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    selectedModules,
    setSelectedModules,
    enabledFeatures,
    setEnabledFeatures,
    permissions,
    setPermissions
}) => {
    // 1. Initial Load: Hydrate from localStorage
    useEffect(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                if (parsed.formData) setFormData(parsed.formData);
                if (parsed.selectedModules) setSelectedModules(parsed.selectedModules);
                if (parsed.enabledFeatures) setEnabledFeatures(parsed.enabledFeatures);
                if (parsed.permissions) setPermissions(parsed.permissions);
                console.log('Wizard state hydrated from localStorage');
            } catch (error) {
                console.error('Failed to parse saved onboarding data:', error);
            }
        }
    }, [setCurrentStep, setFormData, setSelectedModules, setEnabledFeatures, setPermissions]);

    // 2. Continuous Sync: Save on every state change
    useEffect(() => {
        const dataToSave = {
            currentStep,
            formData,
            selectedModules,
            enabledFeatures,
            permissions,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, [currentStep, formData, selectedModules, enabledFeatures, permissions]);

    // Helper to clear storage (call this on final submission)
    const clearStorage = () => {
        localStorage.removeItem(STORAGE_KEY);
    };

    return { clearStorage };
};
