import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

// Keep track of connected clients by jobId
const clients: Map<string, Set<ReadableStreamDefaultController>> = new Map();

// Helper function to create a readable stream
function createStream() {
  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      // Handle client disconnect
    }
  });
  
  return { stream, controller };
}

// Helper function to send a message to all clients for a jobId
export function sendMessageToJob(jobId: string, data: any) {
  const jobClients = clients.get(jobId);
  if (!jobClients) return;
  
  const message = `data: ${JSON.stringify(data)}\n\n`;
  jobClients.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (e) {
      console.error(`Error sending message to client:`, e);
    }
  });
}

// Process progress logs from Firecrawl and transform into activities
function processFirecrawlLog(message: string, jobId: string) {
  // Match URL patterns in logs
  const urlMatch = message.match(/https?:\/\/[^\s"')]+/);
  if (urlMatch) {
    const url = urlMatch[0];
    const domainMatch = url.match(/\/\/([^\/]+)/);
    const domain = domainMatch ? domainMatch[1] : '';
    
    // Create both an activity and a source
    sendMessageToJob(jobId, {
      type: 'activity',
      data: {
        id: `fetch-${Date.now()}`,
        type: 'fetch',
        message: `Extracting data from ${domain}`,
        timestamp: Date.now(),
        sourceUrl: url,
        sourceTitle: domain
      }
    });
    
    sendMessageToJob(jobId, {
      type: 'source',
      data: {
        url: url,
        title: domain,
        description: `Discovered during research for job ${jobId}`
      }
    });
    
    return true;
  }
  
  // Match Jina patterns
  if (message.includes('JINA')) {
    if (message.includes('PROGRESS')) {
      const urlMatch = message.match(/URL\s+\d+\/\d+:\s+([^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        sendMessageToJob(jobId, {
          type: 'activity',
          data: {
            id: `jina-${Date.now()}`,
            type: 'analyze',
            message: `Processing content from ${url}`,
            timestamp: Date.now(),
            sourceUrl: url
          }
        });
        return true;
      }
    }
  }
  
  // Match Gemini patterns
  if (message.includes('GEMINI')) {
    sendMessageToJob(jobId, {
      type: 'activity',
      data: {
        id: `gemini-${Date.now()}`,
        type: 'synthesize',
        message: `AI synthesizing research data`,
        timestamp: Date.now()
      }
    });
    return true;
  }
  
  // General log
  sendMessageToJob(jobId, {
    type: 'log',
    data: {
      timestamp: Date.now(),
      message: message,
      level: message.includes('ERROR') ? 'error' : 'info'
    }
  });
  
  return false;
}

// SSE handler
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
  }
  
  // Create a new stream for this client
  const { stream, controller } = createStream();
  
  // Register this client
  if (!clients.has(jobId)) {
    clients.set(jobId, new Set());
  }
  clients.get(jobId)!.add(controller);
  
  // Remove client when connection closes
  req.signal.addEventListener('abort', () => {
    const jobClients = clients.get(jobId);
    if (jobClients) {
      jobClients.delete(controller);
      if (jobClients.size === 0) {
        clients.delete(jobId);
      }
    }
  });
  
  // Simulate initial message
  setTimeout(() => {
    sendMessageToJob(jobId, {
      type: 'activity',
      data: {
        id: `start-${Date.now()}`,
        type: 'search',
        message: 'Research process started',
        timestamp: Date.now()
      }
    });
  }, 500);
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// For demonstration, we'll simulate some activity
// In a real implementation, you would capture events from your deep research process
// and call sendMessageToJob at appropriate points
export const dynamic = 'force-dynamic'; 