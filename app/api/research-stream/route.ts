import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

// Keep track of connected clients by jobId
const clients: Map<string, Set<ReadableStreamDefaultController>> = new Map();
// Track closed controllers to prevent double-closing
const closedControllers = new Set<ReadableStreamDefaultController>();

// Helper function to create a readable stream
function createStream() {
  // Create controller reference with type
  let controller: ReadableStreamDefaultController | undefined;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      // Handle client disconnect
      if (controller) {
        closedControllers.add(controller);
      }
    }
  });
  
  // Check that controller was initialized
  if (!controller) {
    throw new Error('Failed to initialize stream controller');
  }
  
  return { stream, controller };
}

// Helper function to send a message to all clients for a jobId
export function sendMessageToJob(jobId: string, data: any) {
  const jobClients = clients.get(jobId);
  if (!jobClients) return;
  
  const message = `data: ${JSON.stringify(data)}\n\n`;
  jobClients.forEach(controller => {
    try {
      if (!closedControllers.has(controller)) {
        controller.enqueue(new TextEncoder().encode(message));
      }
    } catch (e) {
      console.error(`Error sending message to client:`, e);
      closedControllers.add(controller);
    }
  });
}

// Send completion message and close connections for a job
export function completeJob(jobId: string) {
  const jobClients = clients.get(jobId);
  if (!jobClients) return;
  
  try {
    // Send completion message
    const completeMessage = `data: ${JSON.stringify({
      type: 'complete',
      data: {
        message: 'Research process completed',
        timestamp: Date.now()
      }
    })}\n\n`;
    
    // Send completion message to all clients
    jobClients.forEach(controller => {
      try {
        if (!closedControllers.has(controller)) {
          controller.enqueue(new TextEncoder().encode(completeMessage));
          // Close the stream after a small delay
          setTimeout(() => {
            if (!closedControllers.has(controller)) {
              try {
                controller.close();
                closedControllers.add(controller);
              } catch (e) {
                // Ignore if already closed
                closedControllers.add(controller);
              }
            }
          }, 1000);
        }
      } catch (e) {
        console.error(`Error sending completion message:`, e);
        closedControllers.add(controller);
      }
    });
    
    // Clear the clients for this job
    setTimeout(() => {
      clients.delete(jobId);
    }, 2000);
  } catch (error) {
    console.error(`Error completing job ${jobId}:`, error);
  }
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
        status: 'active',
        url: url
      }
    });
    
    sendMessageToJob(jobId, {
      type: 'source',
      data: {
        id: `source-${Date.now()}`,
        url: url,
        title: domain,
        description: `Discovered during research for job ${jobId}`,
        found: Date.now()
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
            status: 'active',
            url: url
          }
        });
        return true;
      }
    }
  }
  
  // Match Gemini patterns
  if (message.includes('GEMINI')) {
    // Only complete the job if Gemini has completed processing
    if (message.includes('COMPLETE') || message.includes('FINISHED')) {
      setTimeout(() => {
        // Send synthesis completed with Gemini
        sendMessageToJob(jobId, {
          type: 'activity',
          data: {
            id: `gemini-complete-${Date.now()}`,
            type: 'synthesize',
            message: `Research synthesis completed with Gemini AI`,
            timestamp: Date.now(),
            status: 'completed'
          }
        });
        
        // Complete the job
        setTimeout(() => {
          completeJob(jobId);
        }, 2000);
      }, 1000);
    } else {
      sendMessageToJob(jobId, {
        type: 'activity',
        data: {
          id: `gemini-${Date.now()}`,
          type: 'synthesize',
          message: `Gemini AI synthesizing research data`,
          timestamp: Date.now(),
          status: 'active'
        }
      });
    }
    return true;
  }
  
  // General log
  sendMessageToJob(jobId, {
    type: 'log',
    data: {
      jobId,
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
  
  try {
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
        closedControllers.add(controller);
        if (jobClients.size === 0) {
          clients.delete(jobId);
        }
        console.log(`Client disconnected for job ${jobId}. Remaining clients: ${jobClients.size}`);
      } else {
         console.log(`Client disconnected for job ${jobId}. No clients remaining.`);
      }
    });
    
    // Auto-terminate connection after a longer period (e.g., 15 minutes)
    // Adjust this based on your expected maximum research time
    const terminationTimeout = setTimeout(() => {
      try {
        if (!closedControllers.has(controller)) {
          console.warn(`Auto-terminating connection for job ${jobId} due to timeout.`);
          sendMessageToJob(jobId, {
            type: 'log', // Use log type for timeout message
            data: {
              jobId,
              timestamp: Date.now(),
              message: 'Research process connection timed out after 15 minutes.',
              level: 'warn'
            }
          });
          // We might not want to call completeJob here, just close the stream
          // Let the backend determine actual job completion.
          controller.close();
          closedControllers.add(controller);
        }
      } catch (e) {
        console.error('Error auto-terminating connection:', e);
        // Ensure controller is marked closed even if close fails
        closedControllers.add(controller);
      }
    }, 900000); // 15 minutes
    
    // Clean up timeout on connection close
    req.signal.addEventListener('abort', () => {
      clearTimeout(terminationTimeout);
    });
    
    // --- REMOVED SIMULATION LOGIC ---
    // No more simulated messages or sources here.
    // The stream will only send data pushed by sendMessageToJob from other parts
    // of your backend (e.g., triggered by the /api/deep route or background jobs).
    // You might send an initial "connection established" message if desired:
    try {
        if (!closedControllers.has(controller)) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'log', data: { jobId, timestamp: Date.now(), message: `SSE connection established for job ${jobId}` } })}\n\n`));
        }
    } catch (e) {
        console.error('Error sending initial connection message:', e);
        closedControllers.add(controller); // Mark as closed if initial send fails
    }
    // --- END REMOVED SIMULATION LOGIC ---
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        // Add CORS headers if needed, though usually handled by Next.js config
        // 'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Error in research stream:', error);
    // Avoid sending a JSON response directly if the stream might already be partially sent
    // Log the error server-side. The client's `onerror` handler will trigger.
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// For demonstration, we'll simulate some activity
// In a real implementation, you would capture events from your deep research process
// and call sendMessageToJob at appropriate points
export const dynamic = 'force-dynamic';
// Ensure processFirecrawlLog is exported or used if needed by other modules
// export { processFirecrawlLog }; 