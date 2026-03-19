// Hamilton: Configuración de conexión con el "Cerebro" de Supabase.
// Para producción, se recomienda inyectar estas variables mediante su pipeline de CI/CD.
export const supabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    functionUrl: import.meta.env.VITE_SUPABASE_FUNCTION_URL
};
