export async function fetchWithProgress<T>(
  url: string,
  options: RequestInit,
  onProgress: (data: any) => void
): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.body) {
    throw new Error('ReadableStream not supported in this browser.');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Create a reader to process the stream
  const reader = response.body.getReader();
  const contentLength = +(response.headers.get('Content-Length') || '0');

  // Create a decoder for decoding the binary data to string
  const decoder = new TextDecoder('utf-8');
  let partialText = '';
  let completeResponse = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    // Decode the received chunk
    const chunk = decoder.decode(value, { stream: true });
    partialText += chunk;
    completeResponse += chunk;

    // Try to parse the partial data as JSON progress updates
    try {
      // Look for multiple JSON objects in the stream
      const parts = partialText.split('\n').filter(p => p.trim());
      
      // Process any complete parts
      for (const part of parts) {
        if (part.startsWith('{') && part.endsWith('}')) {
          try {
            const data = JSON.parse(part);
            if (data.progress !== undefined) {
              onProgress(data);
            }
          } catch {
            // Not valid JSON, continue collecting data
          }
        }
      }
    } catch (e) {
      // Not a valid JSON yet, continue reading
    }
  }

  // Try to parse the final response as JSON, if it's supposed to be JSON
  if (response.headers.get('Content-Type')?.includes('application/json')) {
    try {
      return JSON.parse(completeResponse) as T;
    } catch (e) {
      throw new Error('Failed to parse JSON response');
    }
  }

  // Otherwise return the raw text
  return completeResponse as unknown as T;
} 