// client/src/lib/api.ts

const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  
  console.log(`🌐 [API] ${method} ${url}`);
  
  const options: RequestInit = {
    method,
    credentials: 'include', // ✅ CRITICAL for cookies
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  console.log(`📡 [API] ${method} ${url} → ${response.status}`);
  
  return response;
}

export { API_URL };