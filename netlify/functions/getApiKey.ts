interface HandlerEvent {
  httpMethod: string;
}

interface HandlerResponse {
  statusCode: number;
  headers?: { [name: string]: string };
  body: string;
}

export async function handler(event: HandlerEvent): Promise<HandlerResponse> {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
  
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API_KEY environment variable not set on server.' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey: apiKey }),
  };
}
