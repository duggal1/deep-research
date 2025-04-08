
// node crawl.mjs

//ONE OF THE BEST OPEN SOURCE CRAWLERS I HAVE EVER TESTED 
//🎉TRULY AMAZING


import fetch from 'node-fetch';
import pLimit from 'p-limit';

async function crawlWithRetry(url, retries = 3, initialDelay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
        headers: {
          'Accept': 'text/markdown',
        },
      });

      if (!response.ok) {
        if (response.status === 451) {
          throw new Error('Unavailable For Legal Reasons');
        } else if (response.status === 429) {
          throw new Error('Too Many Requests');
        } else if (response.status === 402) {
          throw new Error('Payment Required');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const content = await response.text();
      return { success: true, data: [{ content, url }] };
    } catch (error) {
      if (error.message === 'Too Many Requests') {
        if (attempt < retries) {
          const waitTime = initialDelay * Math.pow(2, attempt - 1);
          console.log(`[429 ERROR] Too Many Requests for ${url}. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error(`[429 ERROR] Max retries reached for ${url}`);
          return { error: new Error('Max retries reached due to 429'), url };
        }
      } else if (error.message === 'Payment Required') {
        console.error(`[402 ERROR] Payment Required for ${url}. Check your Jina account credits if applicable.`);
        return { error: new Error('Payment Required'), url };
      } else {
        console.error(`[ERROR] Failed to crawl ${url}: ${error.message}`);
        return { error, url };
      }
    }
  }
}

async function batchCrawlUrls(urls) {
  const limit = pLimit(5);
  const crawlPromises = urls.map(url => limit(() => crawlWithRetry(url)));
  const results = await Promise.all(crawlPromises);
  const successfulResults = results.filter(result => !result.error);
  const failedResults = results.filter(result => result.error);

  console.log(`Crawled ${successfulResults.length} URLs successfully`);
  console.log(`Failed to crawl ${failedResults.length} URLs`);
  failedResults.forEach(result => {
    console.error(`[ERROR] ${result.error.message} for URL: ${result.url}`);
  });

  return successfulResults;
}

const sourceUrls = [
  'https://writingmate.ai/blog/openai-o3-mini-high-vs-o1-pro',

  'https://www.ultralytics.com/blog/2025-ai-trends-the-innovations-to-look-out-for-this-year',
  'https://research.aimultiple.com/self-supervised-learning/',
  'https://medium.com/data-science-in-your-pocket/deepseek-native-sparse-attention-advanced-attention-mechanism-for-llms-6ac68fc014ff',
  'https://ajithp.com/2025/02/21/natively-sparse-attention-nsa-the-future-of-efficient-long-context-modeling-in-large-language-models/'
];

// Run the crawler and display full results
batchCrawlUrls(sourceUrls)
  .then(results => {
    console.log('Crawl results:');
    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(`URL: ${result.data[0].url}`);
      console.log(`Full Content:`);
      console.log(result.data[0].content); // Print full content
      console.log('---');
    });

  })
  .catch(error => console.error('Batch crawl failed unexpectedly:', error));



