export async function askMuse({
  question,
  language,
  headers = {},
  extraBody = {}
}) {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      question,
      language,
      ...extraBody
    })
  });

  const data = await response.json();
  return data;
}

