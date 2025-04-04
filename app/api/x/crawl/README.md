# Deep Research API Examples

This document provides examples for testing the Deep Research API.

## API Endpoints

The API is available at:
- `/api/x/crawl` - Main endpoint for research queries and status checks

## Query Parameters

- `query` - The research query to perform
- `jobId` - The ID of a job to check status

## Examples

### Start a New Research Query

```bash
curl -X GET "http://localhost:3000/api/x/crawl?query=latest%20developments%20in%20quantum%20computing" \
  -H "Accept: application/json"
```

### Check Research Status

```bash
# Replace YOUR_JOB_ID with the actual jobId from the research response
curl -X GET "http://localhost:3000/api/x/crawl?jobId=YOUR_JOB_ID" \
  -H "Accept: application/json"
```

### Test Error Handling

```bash
# Empty query test
curl -X GET "http://localhost:3000/api/x/crawl" \
  -H "Accept: application/json"

# Invalid job ID test
curl -X GET "http://localhost:3000/api/x/crawl?jobId=invalid_job_id_123" \
  -H "Accept: application/json"
```

## Sample Queries

Here are some example queries to test the API:

```bash
# Technology research
curl -X GET "http://localhost:3000/api/x/crawl?query=emerging%20AI%20trends%202024" \
  -H "Accept: application/json"

# Scientific research
curl -X GET "http://localhost:3000/api/x/crawl?query=latest%20breakthrough%20in%20cancer%20research" \
  -H "Accept: application/json"

# Business research
curl -X GET "http://localhost:3000/api/x/crawl?query=fintech%20startups%20disrupting%20banking" \
  -H "Accept: application/json"
```

## Response Format

A successful response will include:

```json
{
  "jobId": "job_abc123",
  "status": "completed",
  "data": {
    "finalAnalysis": "Comprehensive analysis of the topic...",
    "sources": [
      {
        "url": "https://example.com/article1",
        "title": "Article Title",
        "content": "Article content...",
        "relevance": 0.95,
        "geminiAnalysis": "Analysis of this source..."
      }
    ],
    "activities": [
      {
        "type": "search",
        "message": "Searching for relevant information",
        "timestamp": "2024-04-04T12:34:56Z"
      }
    ]
  },
  "currentDepth": 5,
  "maxDepth": 5
}
```

## Error Response Format

An error response will include:

```json
{
  "error": "Error message",
  "query": "your query",
  "jobId": "your job id"
}
``` 