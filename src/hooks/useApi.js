import { useState, useCallback } from 'react';

export const useApi = () => {
    const [loading, setLoading] = useState(false);
    const scriptUrl = localStorage.getItem('xpense_script_url') || import.meta.env.VITE_API_URL || '';

    const call = useCallback(async (params = {}, action = null, body = null) => {
        if (!scriptUrl && action !== 'config') {
            console.warn("Script URL not set");
            return null;
        }

        setLoading(true);
        const url = new URL(scriptUrl);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const options = {
            method: action ? 'POST' : 'GET',
            redirect: 'follow'
        };

        if (body) {
            options.body = JSON.stringify({ action, ...body });
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            setLoading(false);
            return data;
        } catch (error) {
            console.error("API Error:", error);
            setLoading(false);
            return null;
        }
    }, [scriptUrl]);

    return { call, loading, scriptUrl };
};
